import type { SqliteDatabase } from './client'
import { TABLES } from './schema'

const columnSql = (name: string, column: { type: string; unique?: boolean }, isPk = false): string => {
  const parts = [`"${name.replace(/"/g, '""')}"`, column.type.toUpperCase()]
  if (isPk) parts.push('PRIMARY KEY')
  else if (column.unique) parts.push('UNIQUE')
  return parts.join(' ')
}

/** Creates every table if it does not exist. Safe to run on every boot. */
export function migrate(db: SqliteDatabase): void {
  db.exec('BEGIN')
  try {
    for (const [tableName, table] of Object.entries(TABLES)) {
      const columns = Object.entries(table.columns).map(([name, column]) =>
        columnSql(name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`), column, name === 'id'),
      )
      const constraints = (table.unique || []).map(
        (cols) => `UNIQUE (${cols.map((c) => `"${c.replace(/[A-Z]/g, (x) => `_${x.toLowerCase()}`)}"`).join(', ')})`,
      )
      db.exec(`CREATE TABLE IF NOT EXISTS "${tableName}" (\n  ${[...columns, ...constraints].join(',\n  ')}\n)`)
      for (const index of table.indexes || []) {
        const name = `idx_${tableName}_${index.map((c) => c.replace(/[A-Z]/g, (x) => `_${x.toLowerCase()}`)).join('_')}`
        db.exec(
          `CREATE INDEX IF NOT EXISTS "${name}" ON "${tableName}" (${index
            .map((c) => `"${c.replace(/[A-Z]/g, (x) => `_${x.toLowerCase()}`)}"`)
            .join(', ')})`,
        )
      }
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS "auth_sessions" (
        "id" TEXT PRIMARY KEY,
        "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "created_at" TEXT NOT NULL,
        "expires_at" TEXT NOT NULL,
        "last_seen_at" TEXT NOT NULL,
        "user_agent" TEXT,
        "ip" TEXT
      );
      CREATE INDEX IF NOT EXISTS "idx_auth_sessions_user" ON "auth_sessions" ("user_id");
      CREATE INDEX IF NOT EXISTS "idx_auth_sessions_expiry" ON "auth_sessions" ("expires_at");

      CREATE TABLE IF NOT EXISTS "leaderboard_opt_out" (
        "user_id" TEXT PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "meta" (
        "key" TEXT PRIMARY KEY,
        "value" TEXT
      );
    `)

    db.pragma('user_version = 1')
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
