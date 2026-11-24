/**
 * Pure helpers shared by the browser app and the API.
 *
 * Keep this module free of DOM and Node-specific APIs: both runtimes must be
 * able to import it. Browser-only helpers live in `apps/web/src/lib/utils.ts`.
 */

export const uid = (prefix = 'id'): string =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

export const cn = (...parts: Array<string | false | null | undefined>): string =>
  parts.filter(Boolean).join(' ')

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

export const percent = (part: number, total: number): number =>
  total <= 0 ? 0 : Math.round((part / total) * 1000) / 10

const pad = (n: number) => String(n).padStart(2, '0')

export const toISODate = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const todayISO = (): string => toISODate(new Date())

export const addDays = (iso: string, days: number): string => {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, (m || 1) - 1, d || 1)
  dt.setDate(dt.getDate() + days)
  return toISODate(dt)
}

export const daysBetween = (a: string, b: string): number => {
  const da = new Date(`${a}T00:00:00`).getTime()
  const db = new Date(`${b}T00:00:00`).getTime()
  return Math.round((db - da) / 86400000)
}

export const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('')

export const gradeFromPercent = (pct: number): string => {
  if (pct >= 91) return 'A1'
  if (pct >= 81) return 'A2'
  if (pct >= 71) return 'B1'
  if (pct >= 61) return 'B2'
  if (pct >= 51) return 'C1'
  if (pct >= 41) return 'C2'
  if (pct >= 33) return 'D'
  return 'E'
}

export const formatSize = (kb: number): string => {
  if (!kb) return '—'
  if (kb < 1024) return `${Math.round(kb)} KB`
  const mb = kb / 1024
  return `${mb >= 100 ? Math.round(mb) : mb.toFixed(1)} MB`
}

export const formatSizeMB = (mb: number): string =>
  `${mb >= 1024 ? (mb / 1024).toFixed(1) + ' GB' : mb.toFixed(0) + ' MB'}`

export const normaliseCode = (code: string): string => code.trim().toUpperCase().replace(/\s+/g, '')

/**
 * Attendance is keyed by class + date + period, so the period label has to be
 * stable. `full-day`, `Full Day` and `fullday` all mean the same slot; other
 * labels are only whitespace-normalised.
 */
export const normalisePeriod = (period: string): string => {
  const trimmed = period.trim().replace(/\s+/g, ' ')
  const key = trimmed.toLowerCase().replace(/[\s_-]+/g, '')
  if (!key || key === 'fullday' || key === 'wholeday') return 'Full day'
  return trimmed
}

export const sortNewestFirst = <T extends { createdAt?: string; date?: string; submittedAt?: string }>(
  items: T[],
): T[] =>
  [...items].sort((a, b) => {
    const ka = a.date || a.createdAt || a.submittedAt || ''
    const kb = b.date || b.createdAt || b.submittedAt || ''
    return kb.localeCompare(ka)
  })

/** Cryptographically random hex string. Works in browsers and Node 18+. */
export const makeSalt = (bytes = 12): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

/**
 * Legacy demo password hash (SHA-256 over `salt::password`).
 *
 * The API uses scrypt for real accounts. This helper stays for the browser
 * demo store and for verifying imported demo records; it is not suitable for
 * production credentials.
 */
export const hashPassword = async (password: string, salt: string): Promise<string> => {
  const data = `${salt}::${password}`
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < data.length; i++) {
    h1 = Math.imul(h1 ^ data.charCodeAt(i), 0x01000193) >>> 0
    h2 = Math.imul(h2 + data.charCodeAt(i), 0x85ebca6b) >>> 0
  }
  return `fb${h1.toString(16)}${h2.toString(16)}`
}
