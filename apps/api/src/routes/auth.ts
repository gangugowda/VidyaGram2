import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import type { SqliteDatabase } from '../db/client'
import { selectAll, selectOne, updateRow, upsert } from '../db/client'
import type { ClassRoom, DB, School, User } from '@vidyagram/shared'
import { config } from '../config'
import { buildBootstrap } from '../lib/bootstrap'
import { createSession, clearSessionCookie, destroySessionByToken, readSessionToken, requireAuth, setSessionCookie } from '../lib/auth'
import { hashPassword, newSalt, PASSWORD_ALGO, verifyPassword } from '../lib/password'
import { newId } from '../lib/ids'
import { ApiError, conflict, forbidden, notFound, ok, parse, unauthorized } from '../lib/http'
import { recordAudit } from '../lib/audit'
import { notifyUser } from '../lib/notify'
import { toSafeUser } from '../lib/serialize'
import { normaliseCode } from '@vidyagram/shared'

const language = z.enum(['en', 'hi', 'mr', 'bn', 'ta', 'te'])
const role = z.enum(['student', 'parent', 'teacher'])

const signupSchema = z.object({
  role,
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().max(20).optional(),
  password: z.string().min(8).max(200),
  language,
  schoolId: z.string().min(1).max(100),
  gradeLevel: z.number().int().min(1).max(12).optional(),
  section: z.string().trim().max(4).optional(),
  subjectIds: z.array(z.string().max(40)).max(20).optional(),
  classCode: z.string().trim().max(40).optional(),
  consentGiven: z.literal(true),
  relationship: z.string().trim().max(40).optional(),
})

const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(200),
  password: z.string().min(1).max(200),
})

const profileSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().max(20).nullable().optional(),
    language: language.optional(),
    lowDataMode: z.boolean().optional(),
    reduceMotion: z.boolean().optional(),
    textSize: z.enum(['normal', 'large']).optional(),
    avatarColor: z.string().max(80).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'No changes supplied.' })

const platformConfig = (db: SqliteDatabase): DB['config'] | null =>
  selectOne<DB['config'] & { id: number }>(db, 'platform_config', { id: 1 })

const findClassByCode = (db: SqliteDatabase, code: string): ClassRoom | null => {
  const target = normaliseCode(code)
  return selectAll<ClassRoom>(db, 'classes').find((cls) => normaliseCode(cls.code) === target) ?? null
}

export function registerAuthRoutes(app: FastifyInstance, db: SqliteDatabase): void {
  app.post(
    '/auth/signup',
    {
      config: { rateLimit: { max: 8, timeWindow: '10 minutes' } },
    },
    async (request, reply) => {
      const input = parse(signupSchema, request.body)
      const settings = platformConfig(db)
      if (settings && !settings.allowSelfSignup) {
        throw forbidden('Self sign-up is disabled for this school. Ask an administrator for an account.')
      }

      const school = selectOne<School>(db, 'schools', { id: input.schoolId })
      if (!school) throw notFound('That school does not exist.')

      const existing = db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)').get(input.email) as
        | { id: string }
        | undefined
      if (existing) throw conflict('An account with this email already exists.')

      if (input.role === 'student' && input.classCode?.trim()) {
        const found = findClassByCode(db, input.classCode)
        if (!found || found.schoolId !== input.schoolId) {
          throw new ApiError(409, 'class_code_invalid', 'That class code is not valid for the selected school.')
        }
      }

      const cls = input.role === 'student' && input.classCode ? findClassByCode(db, input.classCode) : null

      const salt = newSalt()
      const { hash } = await hashPassword(input.password, salt)
      const now = new Date().toISOString()
      const userId = newId('usr')
      const firstName = input.name.split(/\s+/)[0]?.toUpperCase() || 'VG'

      const user: User = {
        id: userId,
        role: input.role,
        name: input.name,
        email: input.email,
        phone: input.phone || undefined,
        passwordHash: hash,
        salt,
        language: input.language,
        avatarColor: 'bg-brand-100 text-brand-800',
        schoolId: input.schoolId,
        createdAt: now,
        lowDataMode: false,
        consentGiven: true,
        consentAt: now,
        demo: false,
      }

      if (input.role === 'student') {
        user.gradeLevel = input.gradeLevel
        user.section = input.section
        const rollCount = (
          db.prepare('SELECT COUNT(*) AS count FROM users WHERE role = ? AND grade_level = ?').get(
            'student',
            input.gradeLevel,
          ) as { count: number }
        ).count
        user.rollNo = String(rollCount + 1).padStart(2, '0')
        user.inviteCode = `${firstName}-${Math.floor(1000 + Math.random() * 8999)}`
      }
      if (input.role === 'teacher') user.subjectIds = input.subjectIds || []
      if (input.role === 'parent') user.relationship = input.relationship || 'Guardian'

      upsert(db, 'users', { ...user, passwordAlgo: PASSWORD_ALGO })

      if (cls) {
        upsert(db, 'enrollments', {
          id: newId('enr'),
          classId: cls.id,
          studentId: userId,
          joinedAt: now,
          status: 'active',
        })
        notifyUser(
          db,
          userId,
          'class',
          `Welcome to ${cls.name}`,
          'Your class materials and live sessions will appear on your dashboard.',
          '/classes',
        )
      }

      recordAudit(db, user, 'auth.signup', `New ${input.role} account`)
      const session = createSession(db, userId, {
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      })
      setSessionCookie(reply, session.token, session.expiresAt)
      const bootstrap = buildBootstrap(db, user)
      return reply.status(201).send({ ok: true, data: bootstrap })
    },
  )

  app.post(
    '/auth/login',
    { config: { rateLimit: { max: 10, timeWindow: '5 minutes' } } },
    async (request, reply) => {
      const input = parse(loginSchema, request.body)
      const phoneKey = input.identifier.replace(/\D/g, '')
      const user =
        (db
          .prepare('SELECT * FROM users WHERE lower(email) = lower(?) LIMIT 1')
          .get(input.identifier) as Record<string, unknown> | undefined) ||
        (phoneKey
          ? (db
              .prepare(
                `SELECT * FROM users WHERE phone IS NOT NULL AND replace(replace(phone, ' ', ''), '-', '') = ? LIMIT 1`,
              )
              .get(phoneKey) as Record<string, unknown> | undefined)
          : undefined)

      if (!user) throw unauthorized('Email or password is incorrect.')
      const entity = selectOne<User>(db, 'users', { id: user.id as string })
      if (!entity) throw unauthorized('Email or password is incorrect.')
      if (entity.disabled) throw forbidden('This account is disabled. Contact your school administrator.')

      const algo = (user.password_algo as string | null) ?? null
      const valid = await verifyPassword(input.password, entity.passwordHash, entity.salt, algo)
      if (!valid) throw unauthorized('Email or password is incorrect.')

      const previous = readSessionToken(request)
      if (previous) {
        const existing = db.prepare('SELECT id FROM auth_sessions WHERE id = ?').get(previous)
        if (existing) destroySessionByToken(db, previous)
      }

      const session = createSession(db, entity.id, {
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      })
      setSessionCookie(reply, session.token, session.expiresAt)
      recordAudit(db, entity, 'auth.login')
      return reply.send({ ok: true, data: buildBootstrap(db, entity) })
    },
  )

  app.post('/auth/logout', async (request, reply) => {
    const token = readSessionToken(request)
    if (token) {
      const auth = request.auth
      if (auth) recordAudit(db, auth.user, 'auth.logout')
      destroySessionByToken(db, token)
    }
    clearSessionCookie(reply)
    return reply.send({ ok: true, data: { signedOut: true } })
  })

  app.get('/auth/me', { preHandler: requireAuth(db) }, async (request, reply) => {
    const auth = request.auth!
    const body = {
      ok: true,
      data: {
        user: toSafeUser(auth.user),
        server: { mode: 'mvp', version: config.version, demoMode: config.demoMode },
      },
    }
    return reply.send(body)
  })

  app.patch('/me', { preHandler: requireAuth(db) }, async (request, reply) => {
    const auth = request.auth!
    const patch = parse(profileSchema, request.body)
    updateRow(db, 'users', auth.user.id, patch)
    const updated = selectOne<User>(db, 'users', { id: auth.user.id })
    if (!updated) throw notFound('Account not found.')
    recordAudit(db, updated, 'profile.update', Object.keys(patch).join(', '))
    return reply.send({ ok: true, data: { user: toSafeUser(updated), db: buildBootstrap(db, updated).db } })
  })
}

