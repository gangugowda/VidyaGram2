import path from 'node:path'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'

const here = path.dirname(fileURLToPath(import.meta.url))
const apiRoot = path.resolve(here, '..')

const bool = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

const list = (value: string | undefined, fallback: string[]): string[] =>
  value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : fallback

const env = process.env.NODE_ENV || 'development'

export const config = {
  env,
  isProduction: env === 'production',
  version: '0.2.0',
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT || 4000),
  databasePath: path.resolve(apiRoot, process.env.DATABASE_PATH || './data/vidyagram.db'),
  webOrigins: list(process.env.WEB_ORIGIN, ['http://localhost:5173', 'http://localhost:4173']),
  demoMode: bool(process.env.DEMO_MODE, true),
  seedOnBoot: bool(process.env.SEED_ON_BOOT, true),
  sessionDays: Number(process.env.SESSION_DAYS || 7),
  trustProxy: bool(process.env.TRUST_PROXY, false),
  sessionCookie: 'vg_session',
  apiPrefix: '/api/v1',
} as const

export type Config = typeof config
