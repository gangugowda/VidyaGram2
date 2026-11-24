import { createHash, randomBytes } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { SqliteDatabase } from '../db/client'
import { selectOne, updateRow } from '../db/client'
import { config } from '../config'
import type { User } from '@vidyagram/shared'
import { ApiError } from './http'

export interface AuthContext {
  user: User
  sessionId: string
}

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex')

const nowIso = () => new Date().toISOString()

export function createSession(
  db: SqliteDatabase,
  userId: string,
  meta: { userAgent?: string; ip?: string } = {},
): { token: string; expiresAt: string } {
  const token = randomBytes(32).toString('base64url')
  const createdAt = nowIso()
  const expiresAt = new Date(Date.now() + config.sessionDays * 24 * 60 * 60 * 1000).toISOString()
  db.prepare(
    `INSERT INTO auth_sessions (id, user_id, created_at, expires_at, last_seen_at, user_agent, ip)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    hashToken(token),
    userId,
    createdAt,
    expiresAt,
    createdAt,
    meta.userAgent?.slice(0, 400) || null,
    meta.ip?.slice(0, 80) || null,
  )
  return { token, expiresAt }
}

export function destroySession(db: SqliteDatabase, sessionId: string): void {
  db.prepare('DELETE FROM auth_sessions WHERE id = ?').run(sessionId)
}

/** Revoke a session by the raw cookie token. */
export function destroySessionByToken(db: SqliteDatabase, token: string): void {
  destroySession(db, hashToken(token))
}

export function destroyAllSessions(db: SqliteDatabase, userId: string): void {
  db.prepare('DELETE FROM auth_sessions WHERE user_id = ?').run(userId)
}

export function resolveSession(db: SqliteDatabase, token: string): AuthContext | null {
  const id = hashToken(token)
  const session = db
    .prepare('SELECT id, user_id, expires_at, last_seen_at FROM auth_sessions WHERE id = ?')
    .get(id) as { id: string; user_id: string; expires_at: string; last_seen_at: string } | undefined
  if (!session) return null
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    db.prepare('DELETE FROM auth_sessions WHERE id = ?').run(id)
    return null
  }
  const user = selectOne<User>(db, 'users', { id: session.user_id })
  if (!user || user.disabled) return null

  // Avoid a write on every request: refresh the idle marker at most hourly.
  if (Date.now() - new Date(session.last_seen_at).getTime() > 60 * 60 * 1000) {
    db.prepare('UPDATE auth_sessions SET last_seen_at = ? WHERE id = ?').run(nowIso(), id)
  }
  return { user, sessionId: id }
}

export function readSessionToken(request: FastifyRequest): string | null {
  const cookie = request.cookies?.[config.sessionCookie]
  if (cookie) return cookie
  const header = request.headers.authorization
  if (header?.startsWith('Bearer ')) return header.slice(7).trim() || null
  return null
}

/**
 * Fastify 5 only advances a hook chain when the hook is `async` or accepts a
 * `done` callback. These factories therefore return async functions: a sync
 * hook that returns `undefined` silently stalls the request forever.
 */
export function optionalAuth(db: SqliteDatabase) {
  return async (request: FastifyRequest): Promise<void> => {
    const token = readSessionToken(request)
    if (!token) return
    const auth = resolveSession(db, token)
    if (auth) request.auth = auth
  }
}

export function requireAuth(db: SqliteDatabase) {
  return async (request: FastifyRequest): Promise<void> => {
    const token = readSessionToken(request)
    if (!token) throw new ApiError(401, 'unauthorized', 'Sign in to continue.')
    const auth = resolveSession(db, token)
    if (!auth) throw new ApiError(401, 'session_expired', 'Your session expired. Sign in again.')
    request.auth = auth
  }
}

export function requireRole(...roles: User['role'][]) {
  return async (request: FastifyRequest): Promise<void> => {
    if (!request.auth) throw new ApiError(401, 'unauthorized', 'Sign in to continue.')
    if (!roles.includes(request.auth.user.role)) {
      throw new ApiError(403, 'forbidden', 'This action is not available for your role.')
    }
  }
}

export function setSessionCookie(reply: FastifyReply, token: string, expiresAt: string): void {
  reply.setCookie(config.sessionCookie, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    expires: new Date(expiresAt),
  })
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(config.sessionCookie, { path: '/' })
}

/** Used by tests and admin tooling to revoke a user's sessions. */
export function revokeUser(db: SqliteDatabase, userId: string): void {
  updateRow(db, 'users', userId, { disabled: true })
  destroyAllSessions(db, userId)
}

