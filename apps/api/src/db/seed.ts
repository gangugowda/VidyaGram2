import { buildSeed } from '@vidyagram/shared/seed'
import type { DB, User } from '@vidyagram/shared'
import type { SqliteDatabase } from './client'
import { countRows, selectAll, transaction, upsert } from './client'
import { COLLECTION_TABLES } from './schema'
import { hashPassword, newSalt, PASSWORD_ALGO } from '../lib/password'
import { setMeta } from '../lib/audit'

/** Hash used for demo accounts seeded on the server. */
export const seedPasswordHasher = async (password: string, salt: string): Promise<string> => {
  const result = await hashPassword(password, salt)
  return result.hash
}

export function isDatabaseEmpty(db: SqliteDatabase): boolean {
  return countRows(db, 'users') === 0
}

/**
 * Loads the shared demo dataset into SQLite.
 *
 * The dataset is the same one the browser demo uses, so a reviewer sees an
 * identical school after switching the frontend to API mode. Demo passwords
 * are hashed with scrypt here, never with the browser demo's SHA-256.
 */
export async function seedDatabase(db: SqliteDatabase): Promise<DB> {
  const data = await buildSeed({
    hashPassword: seedPasswordHasher,
    makeSalt: () => newSalt(),
  })

  transaction(db, () => {
    for (const [collection, table] of Object.entries(COLLECTION_TABLES)) {
      const rows = (data as unknown as Record<string, unknown[]>)[collection] || []
      for (const row of rows) {
        const entity = row as Record<string, unknown>
        if (collection === 'users') {
          entity.passwordAlgo = PASSWORD_ALGO
        }
        upsert(db, table, entity)
      }
    }

    upsert(db, 'platform_config', { id: 1, ...data.config })

    const optOut = db.prepare('INSERT OR IGNORE INTO leaderboard_opt_out (user_id) VALUES (?)')
    for (const userId of data.leaderboardOptOut) optOut.run(userId)

    setMeta(db, 'db_version', String(data.version))
    setMeta(db, 'seeded_at', data.seededAt)
  })

  return data
}

/** Removes every domain row and auth session. Used by `db:reset` and tests. */
export function clearDatabase(db: SqliteDatabase): void {
  transaction(db, () => {
    db.prepare('DELETE FROM auth_sessions').run()
    for (const table of Object.values(COLLECTION_TABLES)) {
      db.prepare(`DELETE FROM "${table}"`).run()
    }
    db.prepare('DELETE FROM platform_config').run()
    db.prepare('DELETE FROM leaderboard_opt_out').run()
    db.prepare('DELETE FROM meta').run()
  })
}

export async function resetDatabase(db: SqliteDatabase): Promise<DB> {
  clearDatabase(db)
  return seedDatabase(db)
}

/** The demo accounts shown on the sign-in screen (public, non-secret fields only). */
export function demoAccounts(db: SqliteDatabase): User[] {
  const ids = ['usr_aarav', 'usr_meera', 'usr_sunita', 'usr_rakesh']
  const order = { student: 0, teacher: 1, parent: 2, admin: 3 } as const
  const users = selectAll<User>(db, 'users').filter((user) => user.demo && ids.includes(user.id))
  return users.sort((a, b) => order[a.role] - order[b.role])
}
