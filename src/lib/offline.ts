import type { DB, Download, Recording, Resource } from './types'
import { uid } from './utils'

/** Demo-only quota. Real deployments should use IndexedDB or the device file system. */
export const DEMO_STORAGE_LIMIT_KB = 5 * 1024

export const downloadsFor = (db: DB, userId: string): Download[] =>
  db.downloads.filter((d) => d.userId === userId).sort((a, b) => b.addedAt.localeCompare(a.addedAt))

export const storageUsedKB = (db: DB, userId: string): number =>
  downloadsFor(db, userId).reduce((sum, d) => sum + d.sizeKB, 0)

export const storageLeftKB = (db: DB, userId: string): number =>
  Math.max(0, DEMO_STORAGE_LIMIT_KB - storageUsedKB(db, userId))

export type DownloadResult = { ok: true; download: Download } | { ok: false; error: 'exists' | 'no-space' | 'not-allowed' }

export function buildResourceDownload(db: DB, userId: string, resource: Resource): DownloadResult {
  if (!resource.downloadable) return { ok: false, error: 'not-allowed' }
  if (db.downloads.some((d) => d.userId === userId && d.kind === 'resource' && d.refId === resource.id)) {
    return { ok: false, error: 'exists' }
  }
  if (storageLeftKB(db, userId) < resource.sizeKB) return { ok: false, error: 'no-space' }
  return {
    ok: true,
    download: {
      id: uid('dl'),
      userId,
      kind: 'resource',
      refId: resource.id,
      title: resource.title,
      sizeKB: resource.sizeKB,
      offlineReadable: !!resource.content,
      addedAt: new Date().toISOString(),
    },
  }
}

export function buildRecordingDownload(db: DB, userId: string, recording: Recording): DownloadResult {
  if (!recording.downloadEnabled) return { ok: false, error: 'not-allowed' }
  if (db.downloads.some((d) => d.userId === userId && d.kind === 'recording' && d.refId === recording.id)) {
    return { ok: false, error: 'exists' }
  }
  const sizeKB = recording.sizeMB * 1024
  if (storageLeftKB(db, userId) < sizeKB) return { ok: false, error: 'no-space' }
  return {
    ok: true,
    download: {
      id: uid('dl'),
      userId,
      kind: 'recording',
      refId: recording.id,
      title: recording.title,
      sizeKB,
      offlineReadable: false,
      addedAt: new Date().toISOString(),
    },
  }
}

export const recordingPlayable = (recording: Recording): boolean =>
  recording.status === 'ready' && !!recording.mediaUrl

export const escapeCsv = (value: string | number | undefined | null): string => {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export const toCsv = (rows: Array<Array<string | number | undefined | null>>): string =>
  rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n')
