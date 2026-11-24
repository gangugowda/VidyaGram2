import type { FastifyInstance } from 'fastify'
import type { SqliteDatabase } from '../db/client'
import { registerAuthRoutes } from './auth'
import { registerBootstrapRoutes } from './bootstrap'
import { registerClassRoutes } from './classes'
import { registerAcademicRoutes } from './academics'
import { registerCommunityRoutes } from './community'
import { registerFamilyRoutes } from './family'
import { registerAdminRoutes } from './admin'
import { registerHealthRoutes } from './health'

export function registerRoutes(app: FastifyInstance, db: SqliteDatabase): void {
  registerHealthRoutes(app, db)
  registerAuthRoutes(app, db)
  registerBootstrapRoutes(app, db)
  registerClassRoutes(app, db)
  registerAcademicRoutes(app, db)
  registerCommunityRoutes(app, db)
  registerFamilyRoutes(app, db)
  registerAdminRoutes(app, db)
}
