import { randomBytes } from 'node:crypto'

const prefixes = new Set([
  'usr',
  'sch',
  'cls',
  'enr',
  'ses',
  'rec',
  'res',
  'quiz',
  'att',
  'attd',
  'asm',
  'mark',
  'doubt',
  'reply',
  'ann',
  'notif',
  'scholar',
  'lab',
  'run',
  'fb',
  'dl',
  'link',
  'badge',
  'bm',
  'act',
  'audit',
])

/** Short, sortable-enough identifiers with a readable prefix (e.g. usr_...). */
export function newId(prefix: string): string {
  const safe = prefixes.has(prefix) ? prefix : 'id'
  const time = Date.now().toString(36)
  const random = randomBytes(5).toString('hex')
  return `${safe}_${time}${random}`
}
