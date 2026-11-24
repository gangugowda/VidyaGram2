import type { User } from '@vidyagram/shared'
import type { SqliteDatabase } from '../db/client'
import { upsert } from '../db/client'
import { newId } from './ids'

/** Append a tamper-evident-enough activity record for sensitive actions. */
export function recordAudit(db: SqliteDatabase, actor: User, action: string, detail?: string): void {
  upsert(db, 'audit', {
    id: newId('audit'),
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action,
    detail: detail ?? '',
    at: new Date().toISOString(),
  })
}

export function getMeta(db: SqliteDatabase, key: string): string | null {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setMeta(db: SqliteDatabase, key: string, value: string): void {
  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(
    key,
    value,
  )
}
