import type { ClassRoom, Enrollment, ParentLink, User } from '@vidyagram/shared'
import type { SqliteDatabase } from '../db/client'
import { selectAll, selectOne } from '../db/client'

export const studentClassIds = (db: SqliteDatabase, studentId: string): string[] =>
  selectAll<Enrollment>(db, 'enrollments', { where: { studentId, status: 'active' } }).map((e) => e.classId)

export const teacherClassIds = (db: SqliteDatabase, teacherId: string): string[] => {
  const owned = selectAll<ClassRoom>(db, 'classes', { where: { teacherId } }).map((c) => c.id)
  const taught = db
    .prepare('SELECT DISTINCT class_id AS classId FROM class_sessions WHERE teacher_id = ?')
    .all(teacherId) as Array<{ classId: string }>
  return Array.from(new Set([...owned, ...taught.map((row) => row.classId)]))
}

export const guardianChildIds = (db: SqliteDatabase, parentId: string): string[] =>
  selectAll<ParentLink>(db, 'parent_links', { where: { parentId, status: 'approved' } }).map((l) => l.studentId)

export const classRosterIds = (db: SqliteDatabase, classId: string): string[] =>
  selectAll<Enrollment>(db, 'enrollments', { where: { classId, status: 'active' } }).map((e) => e.studentId)

export const isClassTeacher = (db: SqliteDatabase, teacherId: string, classId: string): boolean => {
  const cls = selectOne<ClassRoom>(db, 'classes', { id: classId })
  return !!cls && cls.teacherId === teacherId
}

export const canViewClass = (db: SqliteDatabase, actor: User | null | undefined, classId: string): boolean => {
  if (!actor) return false
  const cls = selectOne<ClassRoom>(db, 'classes', { id: classId })
  if (!cls) return false
  if (actor.role === 'admin') return cls.schoolId === actor.schoolId
  if (actor.role === 'teacher') return teacherClassIds(db, actor.id).includes(classId)
  if (actor.role === 'student') return studentClassIds(db, actor.id).includes(classId)
  if (actor.role === 'parent') {
    return guardianChildIds(db, actor.id).some((childId) => studentClassIds(db, childId).includes(classId))
  }
  return false
}

export const canManageClass = (db: SqliteDatabase, actor: User | null | undefined, classId: string): boolean => {
  if (!actor) return false
  const cls = selectOne<ClassRoom>(db, 'classes', { id: classId })
  if (!cls) return false
  if (actor.role === 'admin') return cls.schoolId === actor.schoolId
  if (actor.role === 'teacher') return cls.teacherId === actor.id
  return false
}

/** Central privacy gate for individual student records. */
export const canViewStudent = (db: SqliteDatabase, actor: User | null | undefined, studentId: string): boolean => {
  if (!actor) return false
  const student = selectOne<User>(db, 'users', { id: studentId })
  if (!student || student.role !== 'student') return false
  if (actor.role === 'student') return actor.id === studentId
  if (actor.role === 'parent') return guardianChildIds(db, actor.id).includes(studentId)
  if (actor.role === 'teacher') {
    const mine = new Set(teacherClassIds(db, actor.id))
    return studentClassIds(db, studentId).some((classId) => mine.has(classId))
  }
  if (actor.role === 'admin') return student.schoolId === actor.schoolId
  return false
}

export const visibleClassIds = (db: SqliteDatabase, actor: User): string[] => {
  if (actor.role === 'admin') {
    return selectAll<ClassRoom>(db, 'classes', { where: { schoolId: actor.schoolId } }).map((c) => c.id)
  }
  if (actor.role === 'teacher') return teacherClassIds(db, actor.id)
  if (actor.role === 'student') return studentClassIds(db, actor.id)
  const children = guardianChildIds(db, actor.id)
  return Array.from(new Set(children.flatMap((childId) => studentClassIds(db, childId))))
}

export const visibleStudentIds = (db: SqliteDatabase, actor: User): string[] => {
  if (actor.role === 'admin') {
    return selectAll<User>(db, 'users', { where: { role: 'student', schoolId: actor.schoolId } }).map((u) => u.id)
  }
  if (actor.role === 'teacher') {
    const ids = new Set(teacherClassIds(db, actor.id).flatMap((classId) => classRosterIds(db, classId)))
    return Array.from(ids)
  }
  if (actor.role === 'parent') return guardianChildIds(db, actor.id)
  return [actor.id]
}

/** True when the actor may see another student's quiz answers and marks. */
export const canSeeStudentRecords = (db: SqliteDatabase, actor: User, studentId: string): boolean =>
  actor.role === 'admin' ? selectOne<User>(db, 'users', { id: studentId })?.schoolId === actor.schoolId : canViewStudent(db, actor, studentId)
