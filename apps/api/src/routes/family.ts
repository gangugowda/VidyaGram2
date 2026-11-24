import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import type { ParentLink, User } from '@vidyagram/shared'
import type { SqliteDatabase } from '../db/client'
import { selectAll, selectOne, updateRow, upsert } from '../db/client'
import { recordAudit } from '../lib/audit'
import { conflict, forbidden, notFound, ok, parse } from '../lib/http'
import { newId } from '../lib/ids'
import { notifyUser } from '../lib/notify'
import { requireAuth, requireRole } from '../lib/auth'

const idSchema = z.object({ id: z.string().min(1).max(100) })

const requestSchema = z
  .object({
    method: z.enum(['code', 'approval']),
    studentEmail: z.string().trim().toLowerCase().email().max(200).optional(),
    inviteCode: z.string().trim().min(3).max(60).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine((value) => (value.method === 'code' ? !!value.inviteCode : !!value.studentEmail), {
    message: 'Provide an invitation code, or the student email for an approval request.',
  })

export function registerFamilyRoutes(app: FastifyInstance, db: SqliteDatabase): void {
  app.get('/parent-links', { preHandler: requireAuth(db) }, async (request, reply) => {
    const auth = request.auth!
    const links =
      auth.user.role === 'admin'
        ? selectAll<ParentLink>(db, 'parent_links').filter((link) => {
            const student = selectOne<User>(db, 'users', { id: link.studentId })
            return student?.schoolId === auth.user.schoolId
          })
        : selectAll<ParentLink>(db, 'parent_links', {
            where: auth.user.role === 'parent' ? { parentId: auth.user.id } : { studentId: auth.user.id },
          })
    return ok(reply, { links })
  })

  app.post('/parent-links/request', { preHandler: [requireAuth(db), requireRole('parent')] }, async (request, reply) => {
    const auth = request.auth!
    const input = parse(requestSchema, request.body)

    let student: User | null = null
    if (input.method === 'code' && input.inviteCode) {
      student =
        selectAll<User>(db, 'users').find(
          (user) =>
            user.role === 'student' &&
            user.schoolId === auth.user.schoolId &&
            (user.inviteCode || '').toUpperCase() === input.inviteCode!.toUpperCase(),
        ) ?? null
      if (!student) throw notFound('That invitation code is not valid for this school.')
    } else if (input.studentEmail) {
      student =
        selectAll<User>(db, 'users').find(
          (user) => user.role === 'student' && user.email.toLowerCase() === input.studentEmail!.toLowerCase(),
        ) ?? null
      if (!student) throw notFound('No student with that email was found.')
      if (student.schoolId !== auth.user.schoolId) throw forbidden('That student belongs to another school.')
    }
    if (!student) throw notFound('Student not found.')
    if (student.id === auth.user.id) throw conflict('You cannot link your own account as a child.')

    const existing = selectOne<ParentLink>(db, 'parent_links', { parentId: auth.user.id, studentId: student.id })
    if (existing?.status === 'approved') throw conflict('This child is already linked to your account.')
    if (existing?.status === 'pending') throw conflict('A request for this child is already awaiting approval.')

    const now = new Date().toISOString()
    const approvedNow = input.method === 'code'
    const link: ParentLink = {
      id: existing?.id ?? newId('link'),
      parentId: auth.user.id,
      studentId: student.id,
      status: approvedNow ? 'approved' : 'pending',
      requestedAt: now,
      respondedAt: approvedNow ? now : undefined,
      method: input.method === 'code' ? 'code' : 'approval',
      note: input.note,
    }
    upsert(db, 'parent_links', link)

    if (!approvedNow) {
      for (const admin of selectAll<User>(db, 'users', { where: { role: 'admin', schoolId: auth.user.schoolId } })) {
        notifyUser(db, admin.id, 'link', 'Guardian link needs approval', `${auth.user.name} → ${student.name}`, '/admin/approvals')
      }
    } else {
      notifyUser(db, student.id, 'link', 'Guardian linked', `${auth.user.name} can now view your progress.`, '/dashboard')
    }
    recordAudit(db, auth.user, approvedNow ? 'parentLink.approveByCode' : 'parentLink.request', student.name)
    return ok(reply, { link }, 201)
  })

  app.post(
    '/parent-links/:id/approve',
    { preHandler: [requireAuth(db), requireRole('admin')] },
    async (request, reply) => {
      const auth = request.auth!
      const { id } = parse(idSchema, request.params)
      const link = selectOne<ParentLink>(db, 'parent_links', { id })
      if (!link) throw notFound('Link request not found.')
      const student = selectOne<User>(db, 'users', { id: link.studentId })
      if (!student || student.schoolId !== auth.user.schoolId) throw forbidden('This request is outside your school.')
      if (link.status !== 'pending') throw conflict('This request has already been handled.')
      updateRow(db, 'parent_links', id, { status: 'approved', respondedAt: new Date().toISOString() })
      notifyUser(db, link.parentId, 'link', 'Guardian link approved', `You can now view ${student.name}'s progress.`, '/dashboard')
      recordAudit(db, auth.user, 'parentLink.approve', student.name)
      return ok(reply, { link: selectOne<ParentLink>(db, 'parent_links', { id }) })
    },
  )

  app.post(
    '/parent-links/:id/reject',
    { preHandler: [requireAuth(db), requireRole('admin')] },
    async (request, reply) => {
      const auth = request.auth!
      const { id } = parse(idSchema, request.params)
      const link = selectOne<ParentLink>(db, 'parent_links', { id })
      if (!link) throw notFound('Link request not found.')
      const student = selectOne<User>(db, 'users', { id: link.studentId })
      if (!student || student.schoolId !== auth.user.schoolId) throw forbidden('This request is outside your school.')
      if (link.status !== 'pending') throw conflict('This request has already been handled.')
      updateRow(db, 'parent_links', id, { status: 'rejected', respondedAt: new Date().toISOString() })
      notifyUser(db, link.parentId, 'link', 'Guardian link declined', 'Ask the school office if you think this is a mistake.', '/parent/link')
      recordAudit(db, auth.user, 'parentLink.reject', student.name)
      return ok(reply, { link: selectOne<ParentLink>(db, 'parent_links', { id }) })
    },
  )
}
