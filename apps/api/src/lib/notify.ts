import type { NotificationKind, ParentLink } from '@vidyagram/shared'
import type { SqliteDatabase } from '../db/client'
import { selectAll, upsert } from '../db/client'
import { newId } from './ids'

export function notifyUser(
  db: SqliteDatabase,
  userId: string,
  kind: NotificationKind,
  title: string,
  body: string,
  link?: string,
): void {
  upsert(db, 'notifications', {
    id: newId('notif'),
    userId,
    kind,
    title,
    body,
    link: link ?? null,
    read: false,
    createdAt: new Date().toISOString(),
  })
}

export function notifyGuardians(
  db: SqliteDatabase,
  studentId: string,
  kind: NotificationKind,
  title: string,
  body: string,
  link?: string,
): void {
  const links = selectAll<ParentLink>(db, 'parent_links', { where: { studentId, status: 'approved' } })
  for (const guardian of links) notifyUser(db, guardian.parentId, kind, title, body, link)
}

export function notifyClassStudents(
  db: SqliteDatabase,
  classId: string,
  kind: NotificationKind,
  title: string,
  body: string,
  link?: string,
): void {
  const rows = db
    .prepare('SELECT student_id AS studentId FROM enrollments WHERE class_id = ? AND status = ?')
    .all(classId, 'active') as Array<{ studentId: string }>
  for (const row of rows) notifyUser(db, row.studentId, kind, title, body, link)
}
