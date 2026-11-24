import type { FastifyInstance } from 'fastify'
import type { SqliteDatabase } from '../db/client'
import { optionalAuth } from '../lib/auth'
import { buildBootstrap } from '../lib/bootstrap'
import { ok } from '../lib/http'

export function registerBootstrapRoutes(app: FastifyInstance, db: SqliteDatabase): void {
  /**
   * The browser boots from this endpoint. Without a session it returns only
   * public sign-in data; with a session it returns the role-scoped read model.
   */
  app.get('/bootstrap', { preHandler: optionalAuth(db) }, async (request, reply) => {
    return ok(reply, buildBootstrap(db, request.auth?.user ?? null))
  })
}
