import type { AppConfig, Lang } from './types'
import { SUBJECTS } from './subjects'

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

const localeFor = (lang: Lang): string =>
  ({ en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', bn: 'bn-IN', ta: 'ta-IN', te: 'te-IN' } as Record<Lang, string>)[lang] ||
  'en-IN'

export const formatDate = (iso: string, lang: Lang = 'en', style: 'short' | 'long' | 'weekday' = 'short') => {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  try {
    return new Intl.DateTimeFormat(localeFor(lang), {
      day: 'numeric',
      month: style === 'short' ? 'short' : 'long',
      ...(style === 'weekday' ? { weekday: 'short' as const } : {}),
      year: style === 'short' ? undefined : 'numeric',
    }).format(d)
  } catch {
    return iso
  }
}

export const formatDateTime = (isoStamp: string, lang: Lang = 'en') => {
  if (!isoStamp) return '—'
  const d = new Date(isoStamp)
  if (Number.isNaN(d.getTime())) return isoStamp
  try {
    return new Intl.DateTimeFormat(localeFor(lang), {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    }).format(d)
  } catch {
    return isoStamp
  }
}

export const formatTime = (hhmm: string, lang: Lang = 'en') => {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(h || 0, m || 0, 0, 0)
  try {
    return new Intl.DateTimeFormat(localeFor(lang), { hour: 'numeric', minute: '2-digit' }).format(d)
  } catch {
    return hhmm
  }
}

export const relativeTime = (isoStamp: string, lang: Lang = 'en') => {
  const then = new Date(isoStamp).getTime()
  if (Number.isNaN(then)) return ''
  const diffMin = Math.round((then - Date.now()) / 60000)
  const rtf = new Intl.RelativeTimeFormat(localeFor(lang), { numeric: 'auto' })
  const abs = Math.abs(diffMin)
  if (abs < 1) return rtf.format(0, 'minute')
  if (abs < 60) return rtf.format(diffMin, 'minute')
  if (abs < 60 * 24) return rtf.format(Math.round(diffMin / 60), 'hour')
  if (abs < 60 * 24 * 30) return rtf.format(Math.round(diffMin / (60 * 24)), 'day')
  return formatDate(isoStamp.slice(0, 10), lang)
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

export const gradeTone = (grade: string): string => {
  if (grade.startsWith('A')) return 'bg-leaf-100 text-leaf-800'
  if (grade.startsWith('B')) return 'bg-brand-100 text-brand-800'
  if (grade.startsWith('C')) return 'bg-saffron-100 text-saffron-800'
  if (grade === 'D') return 'bg-clay-100 text-clay-800'
  return 'bg-clay-200 text-clay-900'
}

export const formatSize = (kb: number): string => {
  if (!kb) return '—'
  if (kb < 1024) return `${Math.round(kb)} KB`
  const mb = kb / 1024
  return `${mb >= 100 ? Math.round(mb) : mb.toFixed(1)} MB`
}

export const formatSizeMB = (mb: number): string => `${mb >= 1024 ? (mb / 1024).toFixed(1) + ' GB' : mb.toFixed(0) + ' MB'}`

/** SHA-256 with a deterministic fallback for non-secure contexts (demo only). */
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

export const makeSalt = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

export const normaliseCode = (code: string): string => code.trim().toUpperCase().replace(/\s+/g, '')

export const subjectLabel = (id: string, t: (k: string) => string): string => {
  const s = SUBJECTS.find((x) => x.id === id)
  return s ? t(s.nameKey) : id
}

export const isOnline = (): boolean =>
  typeof navigator === 'undefined' ? true : navigator.onLine !== false

export const sortNewestFirst = <T extends { createdAt?: string; date?: string; submittedAt?: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => {
    const ka = a.date || a.createdAt || a.submittedAt || ''
    const kb = b.date || b.createdAt || b.submittedAt || ''
    return kb.localeCompare(ka)
  })

export const initialsColor = (seed: string): string => {
  const palette = [
    'bg-brand-100 text-brand-800',
    'bg-leaf-100 text-leaf-800',
    'bg-saffron-100 text-saffron-800',
    'bg-clay-100 text-clay-800',
    'bg-ink-100 text-ink-800',
  ]
  let sum = 0
  for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i)
  return palette[sum % palette.length]
}

export const readConfig = () => {
  const c = window.VIDYAGRAM_CONFIG || {}
  const api: Partial<AppConfig['api']> = c.api || {}
  return {
    demoMode: c.demoMode !== false,
    version: c.version || '1.0.0',
    api: {
      enabled: api.enabled === true,
      baseUrl: typeof api.baseUrl === 'string' && api.baseUrl.trim() ? api.baseUrl.trim() : '/api/v1',
      timeoutMs: Number(api.timeoutMs) > 0 ? Number(api.timeoutMs) : 8000,
    },
    zoom: { configured: false, proxyUrl: '', label: 'Zoom', ...(c.zoom || {}) },
    ai: { configured: false, proxyUrl: '', provider: '', ...(c.ai || {}) },
    email: { configured: false, ...(c.email || {}) },
    sms: { configured: false, ...(c.sms || {}) },
  }
}

export const downloadTextFile = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
