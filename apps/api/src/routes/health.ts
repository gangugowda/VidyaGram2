import type { FastifyInstance } from 'fastify'
import type { SqliteDatabase } from '../db/client'
import { config } from '../config'

export function registerHealthRoutes(app: FastifyInstance, db: SqliteDatabase): void {
  app.get('/health', async (_request, reply) => {
    let database: 'ok' | 'error' = 'ok'
    try {
      db.prepare('SELECT 1').get()
    } catch {
      database = 'error'
    }
    return reply.status(database === 'ok' ? 200 : 503).send({
      ok: database === 'ok',
      data: {
        status: database === 'ok' ? 'ok' : 'degraded',
        version: config.version,
        database,
        uptimeSeconds: Math.round(process.uptime()),
      },
    })
  })
}
