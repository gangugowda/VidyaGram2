import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { TABLES, type Table } from './schema'

export type SqliteDatabase = Database.Database

export function openDatabase(file: string): SqliteDatabase {
  if (file !== ':memory:') {
    fs.mkdirSync(path.dirname(file), { recursive: true })
  }
  const db = new Database(file)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')
  return db
}

export const toSnake = (key: string): string => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
export const toCamel = (key: string): string => key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())

const quote = (identifier: string): string => `"${identifier.replace(/"/g, '""')}"`

const tableFor = (name: string): Table => {
  const table = TABLES[name]
  if (!table) throw new Error(`Unknown table: ${name}`)
  return table
}

/** Convert a domain object into a SQLite row using the table metadata. */
export function entityToRow(tableName: string, entity: object): Record<string, unknown> {
  const table = tableFor(tableName)
  const record = entity as Record<string, unknown>
  const row: Record<string, unknown> = {}
  for (const [key, column] of Object.entries(table.columns)) {
    const value = record[key]
    if (value === undefined) {
      row[toSnake(key)] = null
    } else if (column.json) {
      row[toSnake(key)] = value === null ? null : JSON.stringify(value)
    } else if (column.bool) {
      row[toSnake(key)] = value ? 1 : 0
    } else {
      row[toSnake(key)] = value
    }
  }
  return row
}

/** Convert a SQLite row back into the shared domain shape. */
export function rowToEntity<T>(tableName: string, row: Record<string, unknown>): T {
  const table = tableFor(tableName)
  const entity: Record<string, unknown> = {}
  for (const [key, column] of Object.entries(table.columns)) {
    const raw = row[toSnake(key)]
    if (raw === undefined) continue
    if (raw === null) {
      entity[key] = null
    } else if (column.json) {
      entity[key] = typeof raw === 'string' ? JSON.parse(raw) : raw
    } else if (column.bool) {
      entity[key] = raw === 1 || raw === true
    } else {
      entity[key] = raw
    }
  }
  return entity as T
}

type Where = Record<string, unknown>

const buildWhere = (tableName: string, where: Where): { sql: string; params: unknown[] } => {
  const table = tableFor(tableName)
  const clauses: string[] = []
  const params: unknown[] = []
  for (const [key, value] of Object.entries(where)) {
    const column = table.columns[key]
    if (!column) throw new Error(`Unknown column ${tableName}.${key}`)
    const columnSql = quote(toSnake(key))
    if (value === null) {
      clauses.push(`${columnSql} IS NULL`)
    } else {
      clauses.push(`${columnSql} = ?`)
      params.push(column.bool ? (value ? 1 : 0) : column.json ? JSON.stringify(value) : value)
    }
  }
  return { sql: clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '', params }
}

export interface SelectOptions {
  where?: Where
  orderBy?: string
  direction?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export function selectAll<T>(db: SqliteDatabase, tableName: string, options: SelectOptions = {}): T[] {
  const table = tableFor(tableName)
  const where = buildWhere(tableName, options.where || {})
  let sql = `SELECT * FROM ${quote(tableName)}${where.sql}`
  if (options.orderBy) {
    if (!table.columns[options.orderBy]) throw new Error(`Unknown order column ${tableName}.${options.orderBy}`)
    sql += ` ORDER BY ${quote(toSnake(options.orderBy))} ${options.direction === 'asc' ? 'ASC' : 'DESC'}`
  }
  if (options.limit !== undefined) {
    sql += ` LIMIT ${Math.max(0, Math.floor(options.limit))}`
    if (options.offset !== undefined) sql += ` OFFSET ${Math.max(0, Math.floor(options.offset))}`
  }
  const rows = db.prepare(sql).all(...where.params) as Record<string, unknown>[]
  return rows.map((row) => rowToEntity<T>(tableName, row))
}

export function selectOne<T>(db: SqliteDatabase, tableName: string, where: Where): T | null {
  const rows = selectAll<T>(db, tableName, { where, limit: 1 })
  return rows[0] ?? null
}

export function countRows(db: SqliteDatabase, tableName: string, where: Where = {}): number {
  tableFor(tableName)
  const clause = buildWhere(tableName, where)
  const row = db.prepare(`SELECT COUNT(*) AS count FROM ${quote(tableName)}${clause.sql}`).get(...clause.params) as {
    count: number
  }
  return row.count
}

/** Insert or update by primary key. Returns the stored entity. */
export function upsert<T>(db: SqliteDatabase, tableName: string, entity: object): T {
  const table = tableFor(tableName)
  const record = entity as Record<string, unknown>
  const row = entityToRow(tableName, record)
  const columns = Object.keys(row)
  const pk = 'id'
  if (!columns.includes(pk)) throw new Error(`${tableName} is missing an id`)
  const placeholders = columns.map(() => '?').join(', ')
  const updates = columns
    .filter((column) => column !== pk)
    .map((column) => `${quote(column)} = excluded.${quote(column)}`)
    .join(', ')
  const sql = `INSERT INTO ${quote(tableName)} (${columns.map(quote).join(', ')}) VALUES (${placeholders})
    ON CONFLICT(${quote(pk)}) DO UPDATE SET ${updates}`
  db.prepare(sql).run(...columns.map((column) => row[column]))
  return selectOne<T>(db, tableName, { id: record.id }) as T
}

/** Update only the supplied fields; other columns keep their stored value. */
export function updateRow(
  db: SqliteDatabase,
  tableName: string,
  id: string,
  patch: object,
): void {
  const table = tableFor(tableName)
  if (!table.columns.id) throw new Error(`${tableName} has no id column`)
  const patchRecord = patch as Record<string, unknown>
  const columns: string[] = []
  const params: unknown[] = []
  for (const [key, value] of Object.entries(patchRecord)) {
    const column = table.columns[key]
    if (!column || key === 'id') continue
    columns.push(toSnake(key))
    if (value === undefined) continue
    params.push(column.bool ? (value ? 1 : 0) : column.json ? JSON.stringify(value) : value)
  }
  if (!columns.length) return
  const sql = `UPDATE ${quote(tableName)} SET ${columns.map((c) => `${quote(c)} = ?`).join(', ')} WHERE "id" = ?`
  db.prepare(sql).run(...params, id)
}

export function deleteRows(db: SqliteDatabase, tableName: string, where: Where): number {
  tableFor(tableName)
  const clause = buildWhere(tableName, where)
  const result = db.prepare(`DELETE FROM ${quote(tableName)}${clause.sql}`).run(...clause.params)
  return result.changes
}

export function transaction<T>(db: SqliteDatabase, fn: () => T): T {
  return db.transaction(fn)()
}

