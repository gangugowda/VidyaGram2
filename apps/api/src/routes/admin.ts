import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import type { AuditEntry, ClassRoom, User } from '@vidyagram/shared'
import type { SqliteDatabase } from '../db/client'
import { countRows, selectAll, selectOne, updateRow } from '../db/client'
import { recordAudit } from '../lib/audit'
import { conflict, forbidden, notFound, ok, parse } from '../lib/http'
import { requireAuth, requireRole } from '../lib/auth'
import { toSafeUser } from '../lib/serialize'

const idSchema = z.object({ id: z.string().min(1).max(100) })

const userPatchSchema = z
  .object({
    role: z.enum(['student', 'teacher', 'parent', 'admin']).optional(),
    name: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().max(20).nullable().optional(),
    disabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'No changes supplied.' })

export function registerAdminRoutes(app: FastifyInstance, db: SqliteDatabase): void {
  app.get(
    '/admin/users',
    { preHandler: [requireAuth(db), requireRole('admin')] },
    async (request, reply) => {
      const auth = request.auth!
      const query = parse(
        z.object({
          role: z.enum(['student', 'teacher', 'parent', 'admin']).optional(),
          q: z.string().trim().max(100).optional(),
          limit: z.coerce.number().int().min(1).max(500).default(200),
        }),
        request.query,
      )
      const needle = query.q?.toLowerCase()
      const users = selectAll<User>(db, 'users', {
        where: query.role ? { schoolId: auth.user.schoolId, role: query.role } : { schoolId: auth.user.schoolId },
        orderBy: 'createdAt',
        direction: 'asc',
      })
        .filter((user) => !needle || user.name.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle))
        .slice(0, query.limit)
        .map(toSafeUser)
      return ok(reply, { users })
    },
  )

  app.patch(
    '/admin/users/:id',
    { preHandler: [requireAuth(db), requireRole('admin')] },
    async (request, reply) => {
      const auth = request.auth!
      const { id } = parse(idSchema, request.params)
      const target = selectOne<User>(db, 'users', { id })
      if (!target || target.schoolId !== auth.user.schoolId) throw notFound('User not found in your school.')
      const patch = parse(userPatchSchema, request.body)

      if (id === auth.user.id && patch.disabled) throw conflict('You cannot disable your own account.')
      if (id === auth.user.id && patch.role && patch.role !== 'admin') {
        throw conflict('Ask another administrator to change your role.')
      }
      const admins = countRows(db, 'users', { schoolId: auth.user.schoolId, role: 'admin', disabled: false })
      if (target.role === 'admin' && admins <= 1 && (patch.disabled || (patch.role && patch.role !== 'admin'))) {
        throw conflict('A school must keep at least one active administrator.')
      }

      updateRow(db, 'users', id, patch)
      recordAudit(db, auth.user, 'admin.user.update', `${target.name}: ${Object.keys(patch).join(', ')}`)
      return ok(reply, { user: toSafeUser(selectOne<User>(db, 'users', { id })!) })
    },
  )

  app.get(
    '/admin/audit',
    { preHandler: [requireAuth(db), requireRole('admin')] },
    async (request, reply) => {
      const auth = request.auth!
      const query = parse(
        z.object({ limit: z.coerce.number().int().min(1).max(500).default(100) }),
        request.query,
      )
      const schoolUserIds = new Set(
        selectAll<User>(db, 'users', { where: { schoolId: auth.user.schoolId } }).map((user) => user.id),
      )
      const entries = selectAll<AuditEntry>(db, 'audit', { orderBy: 'at', limit: query.limit * 4 }).filter((entry) =>
        schoolUserIds.has(entry.actorId),
      )
      return ok(reply, { audit: entries.slice(0, query.limit) })
    },
  )

  app.get(
    '/admin/overview',
    { preHandler: [requireAuth(db), requireRole('admin')] },
    async (request, reply) => {
      const auth = request.auth!
      const schoolId = auth.user.schoolId
      return ok(reply, {
        schoolId,
        users: countRows(db, 'users', { schoolId }),
        students: countRows(db, 'users', { schoolId, role: 'student' }),
        teachers: countRows(db, 'users', { schoolId, role: 'teacher' }),
        classes: countRows(db, 'classes', { schoolId }),
        quizzes: countRows(db, 'quizzes'),
        pendingGuardianLinks: selectAll(db, 'parent_links', { where: { status: 'pending' } }).filter((link) => {
          const student = selectOne<User>(db, 'users', { id: (link as { studentId: string }).studentId })
          return student?.schoolId === schoolId
        }).length,
      })
    },
  )

  app.get(
    '/admin/classes',
    { preHandler: [requireAuth(db), requireRole('admin')] },
    async (request, reply) => {
      const auth = request.auth!
      const classes = selectAll<ClassRoom>(db, 'classes', { where: { schoolId: auth.user.schoolId } })
      return ok(reply, { classes })
    },
  )

  // Admin-only guard for routes that must never be reachable by another role.
  app.get(
    '/admin/whoami',
    { preHandler: [requireAuth(db), requireRole('admin')] },
    async (request, reply) => ok(reply, { user: toSafeUser(request.auth!.user) }),
  )

  // A small helper used by the admin UI to check a user's school before acting.
  app.get(
    '/admin/users/:id',
    { preHandler: [requireAuth(db), requireRole('admin')] },
    async (request, reply) => {
      const auth = request.auth!
      const { id } = parse(idSchema, request.params)
      const user = selectOne<User>(db, 'users', { id })
      if (!user || user.schoolId !== auth.user.schoolId) throw notFound('User not found in your school.')
      return ok(reply, { user: toSafeUser(user) })
    },
  )

  // Explicitly reject non-admin access to the admin namespace.
  app.all('/admin/*', { preHandler: requireAuth(db) }, async (request) => {
    throw forbidden('Administrator access is required.')
  })
}
