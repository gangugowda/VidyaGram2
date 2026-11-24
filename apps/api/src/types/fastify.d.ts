import type { AuthContext } from '../lib/auth'

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext
  }
}
