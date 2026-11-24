import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import type { ClassRoom, User } from '@vidyagram/shared'
import { normaliseCode } from '@vidyagram/shared'
import type { SqliteDatabase } from '../db/client'
import { selectAll, selectOne, upsert, updateRow } from '../db/client'
import { canManageClass, canViewClass, classRosterIds, visibleClassIds } from '../lib/access'
import { recordAudit } from '../lib/audit'
import { conflict, forbidden, notFound, ok, parse } from '../lib/http'
import { newId } from '../lib/ids'
import { notifyUser } from '../lib/notify'
import { requireAuth, requireRole } from '../lib/auth'
import { toSafeUser } from '../lib/serialize'

const classCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  gradeLevel: z.number().int().min(1).max(12),
  section: z.string().trim().min(1).max(4),
  teacherId: z.string().min(1),
  subjectIds: z.array(z.string().max(40)).max(20).default([]),
  code: z.string().trim().min(4).max(40).optional(),
})

const classPatchSchema = z
  .object({
    leaderboardEnabled: z.boolean().optional(),
    subjectIds: z.array(z.string().max(40)).max(20).optional(),
    code: z.string().trim().min(4).max(40).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'No changes supplied.' })

const joinSchema = z.object({ code: z.string().trim().min(4).max(40) })

export function registerClassRoutes(app: FastifyInstance, db: SqliteDatabase): void {
  app.get('/classes', { preHandler: requireAuth(db) }, async (request, reply) => {
    const auth = request.auth!
    const ids = new Set(visibleClassIds(db, auth.user))
    const classes = selectAll<ClassRoom>(db, 'classes').filter((cls) => ids.has(cls.id))
    return ok(reply, { classes })
  })

  app.post(
    '/classes',
    { preHandler: [requireAuth(db), requireRole('admin')] },
    async (request, reply) => {
      const auth = request.auth!
      const input = parse(classCreateSchema, request.body)
      const teacher = selectOne<User>(db, 'users', { id: input.teacherId })
      if (!teacher || teacher.role !== 'teacher' || teacher.schoolId !== auth.user.schoolId) {
        throw notFound('That teacher does not work at this school.')
      }
      const code = input.code || `VIDYA-${input.gradeLevel}${input.section.toUpperCase()}-${Math.floor(1000 + Math.random() * 8999)}`
      if (selectAll<ClassRoom>(db, 'classes').some((cls) => normaliseCode(cls.code) === normaliseCode(code))) {
        throw conflict('That class code is already in use.')
      }
      const cls: ClassRoom = {
        id: newId('cls'),
        name: input.name,
        gradeLevel: input.gradeLevel,
        section: input.section,
        schoolId: auth.user.schoolId,
        teacherId: teacher.id,
        subjectIds: input.subjectIds,
        code,
        leaderboardEnabled: true,
        createdAt: new Date().toISOString(),
      }
      upsert(db, 'classes', cls)
      recordAudit(db, auth.user, 'class.create', `${cls.name} (${cls.code})`)
      return ok(reply, { class: cls }, 201)
    },
  )

  app.patch('/classes/:id', { preHandler: requireAuth(db) }, async (request, reply) => {
    const auth = request.auth!
    const { id } = parse(z.object({ id: z.string().min(1) }), request.params)
    const cls = selectOne<ClassRoom>(db, 'classes', { id })
    if (!cls) throw notFound('Class not found.')
    if (!canManageClass(db, auth.user, id)) throw forbidden('Only the class teacher or an administrator can edit this class.')
    const patch = parse(classPatchSchema, request.body)
    if (patch.code) {
      const taken = selectAll<ClassRoom>(db, 'classes').some(
        (other) => other.id !== id && normaliseCode(other.code) === normaliseCode(patch.code!),
      )
      if (taken) throw conflict('That class code is already in use.')
    }
    updateRow(db, 'classes', id, patch)
    recordAudit(db, auth.user, 'class.update', Object.keys(patch).join(', '))
    return ok(reply, { class: selectOne<ClassRoom>(db, 'classes', { id }) })
  })

  app.get('/classes/:id/roster', { preHandler: requireAuth(db) }, async (request, reply) => {
    const auth = request.auth!
    const { id } = parse(z.object({ id: z.string().min(1) }), request.params)
    if (!canViewClass(db, auth.user, id)) throw forbidden()
    const students = classRosterIds(db, id)
      .map((studentId) => selectOne<User>(db, 'users', { id: studentId }))
      .filter((user): user is User => !!user)
      .map(toSafeUser)
    return ok(reply, { students })
  })

  app.post('/classes/join', { preHandler: [requireAuth(db), requireRole('student')] }, async (request, reply) => {
    const auth = request.auth!
    const { code } = parse(joinSchema, request.body)
    const cls = selectAll<ClassRoom>(db, 'classes').find((item) => normaliseCode(item.code) === normaliseCode(code))
    if (!cls) throw notFound('That class code was not found.')
    if (cls.schoolId !== auth.user.schoolId) throw forbidden('That class belongs to another school.')
    const existing = db
      .prepare('SELECT id, status FROM enrollments WHERE class_id = ? AND student_id = ?')
      .get(cls.id, auth.user.id) as { id: string; status: string } | undefined
    if (existing?.status === 'active') throw conflict('You are already in this class.')
    const now = new Date().toISOString()
    if (existing) {
      updateRow(db, 'enrollments', existing.id, { status: 'active', joinedAt: now })
    } else {
      upsert(db, 'enrollments', {
        id: newId('enr'),
        classId: cls.id,
        studentId: auth.user.id,
        joinedAt: now,
        status: 'active',
      })
    }
    notifyUser(db, cls.teacherId, 'class', `${auth.user.name} joined ${cls.name}`, 'A student joined using the class code.', '/classes')
    recordAudit(db, auth.user, 'class.join', cls.name)
    return ok(reply, { class: cls }, 201)
  })
}
