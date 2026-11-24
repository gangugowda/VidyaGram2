import Fastify, { type FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { randomUUID } from 'node:crypto'
import { config } from './config'
import { openDatabase, type SqliteDatabase } from './db/client'
import { migrate } from './db/migrate'
import { isDatabaseEmpty, seedDatabase } from './db/seed'
import { ApiError } from './lib/http'
import { registerRoutes } from './routes'
import { registerHealthRoutes } from './routes/health'

export interface BuildAppOptions {
  db?: SqliteDatabase
  /** Set false in tests that seed their own data. */
  seed?: boolean
  logger?: boolean
  /** Disable in tests that make many requests from one IP. */
  rateLimit?: boolean
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const ownsDb = !options.db
  const db = options.db ?? openDatabase(config.databasePath)
  migrate(db)
  if (options.seed !== false && config.seedOnBoot && isDatabaseEmpty(db)) {
    await seedDatabase(db)
  }

  const app = Fastify({
    logger:
      options.logger === false
        ? false
        : config.isProduction
          ? true
          : {
              transport: {
                target: 'pino-pretty',
                options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
              },
              redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
            },
    trustProxy: config.trustProxy,
    bodyLimit: 2 * 1024 * 1024,
    genReqId: () => randomUUID(),
  })

  await app.register(cookie)
  await app.register(helmet, {
    // The API returns JSON only; a document CSP belongs to the web host.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' },
  })
  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin || config.webOrigins.includes(origin)) return callback(null, true)
      return callback(null, false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  })
  if (options.rateLimit !== false) {
    await app.register(rateLimit, {
      max: 300,
      timeWindow: '1 minute',
      allowList: (request) => request.url === `${config.apiPrefix}/health` || request.url === '/health',
    })
  }

  /**
   * Cookie sessions plus SameSite=Lax already block most cross-site writes.
   * This origin check adds a second line of defence for unsafe methods while
   * still allowing non-browser API clients that send no Origin header.
   */
  app.addHook('onRequest', async (request) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return
    const origin = request.headers.origin
    if (!origin) return
    if (!config.webOrigins.includes(origin)) {
      throw new ApiError(403, 'csrf_origin', 'Request origin is not allowed.')
    }
  })

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) {
      return reply.status(error.statusCode).send({
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          requestId: request.id,
        },
      })
    }
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 429) {
      return reply.status(429).send({
        ok: false,
        error: { code: 'rate_limited', message: 'Too many requests. Try again shortly.', requestId: request.id },
      })
    }
    request.log.error({ err: error }, 'Unhandled API error')
    return reply.status(500).send({
      ok: false,
      error: { code: 'internal_error', message: 'Something went wrong on the server.', requestId: request.id },
    })
  })

  app.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({
      ok: false,
      error: { code: 'not_found', message: 'Endpoint not found.', requestId: request.id },
    })
  })

  // Infrastructure health check outside the versioned API prefix.
  registerHealthRoutes(app, db)

  await app.register(
    async (api) => {
      registerRoutes(api, db)
    },
    { prefix: config.apiPrefix },
  )

  if (ownsDb) {
    app.addHook('onClose', async () => {
      db.close()
    })
  }

  return app
}
