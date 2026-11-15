import type { Attempt, AttendanceDay, ClassRoom, DB, Lang, Mark, Quiz, Role, User } from './types'
import { percent } from './utils'

export const userById = (db: DB, id?: string | null): User | undefined => (id ? db.users.find((u) => u.id === id) : undefined)

export const classById = (db: DB, id?: string | null): ClassRoom | undefined =>
  id ? db.classes.find((c) => c.id === id) : undefined

export const schoolById = (db: DB, id?: string | null) => (id ? db.schools.find((s) => s.id === id) : undefined)

export const studentClassIds = (db: DB, studentId: string): string[] =>
  db.enrollments.filter((e) => e.studentId === studentId && e.status === 'active').map((e) => e.classId)

export const classStudents = (db: DB, classId: string): User[] => {
  const ids = db.enrollments.filter((e) => e.classId === classId && e.status === 'active').map((e) => e.studentId)
  return ids.map((id) => userById(db, id)).filter((u): u is User => !!u)
}

export const teacherClassIds = (db: DB, teacherId: string): string[] => {
  const owned = db.classes.filter((c) => c.teacherId === teacherId).map((c) => c.id)
  const taught = db.sessions.filter((s) => s.teacherId === teacherId).map((s) => s.classId)
  return Array.from(new Set([...owned, ...taught]))
}

export const isClassTeacher = (db: DB, teacherId: string, classId: string): boolean =>
  db.classes.some((c) => c.id === classId && c.teacherId === teacherId)

export const guardianChildIds = (db: DB, parentId: string): string[] =>
  db.parentLinks.filter((l) => l.parentId === parentId && l.status === 'approved').map((l) => l.studentId)

export const guardianChildren = (db: DB, parentId: string): User[] =>
  guardianChildIds(db, parentId)
    .map((id) => userById(db, id))
    .filter((u): u is User => !!u)

export const canViewClass = (db: DB, actor: User | null | undefined, classId: string): boolean => {
  if (!actor) return false
  if (actor.role === 'admin') return classById(db, classId)?.schoolId === actor.schoolId
  if (actor.role === 'teacher') return teacherClassIds(db, actor.id).includes(classId)
  if (actor.role === 'student') return studentClassIds(db, actor.id).includes(classId)
  if (actor.role === 'parent') {
    const children = guardianChildIds(db, actor.id)
    return children.some((childId) => studentClassIds(db, childId).includes(classId))
  }
  return false
}

/** Central privacy gate for individual student records. */
export const canViewStudent = (db: DB, actor: User | null | undefined, studentId: string): boolean => {
  if (!actor) return false
  const student = userById(db, studentId)
  if (!student || student.role !== 'student') return false
  if (actor.role === 'student') return actor.id === studentId
  if (actor.role === 'parent') return guardianChildIds(db, actor.id).includes(studentId)
  if (actor.role === 'teacher') {
    const mine = new Set(teacherClassIds(db, actor.id))
    return studentClassIds(db, studentId).some((cid) => mine.has(cid))
  }
  if (actor.role === 'admin') return student.schoolId === actor.schoolId
  return false
}

/** Teachers can edit records only for classes they own (or administer). */
export const canManageClass = (db: DB, actor: User | null | undefined, classId: string): boolean => {
  if (!actor) return false
  if (actor.role === 'admin') return classById(db, classId)?.schoolId === actor.schoolId
  if (actor.role === 'teacher') return isClassTeacher(db, actor.id, classId)
  return false
}

export const visibleClasses = (db: DB, actor: User | null | undefined): ClassRoom[] => {
  if (!actor) return []
  if (actor.role === 'admin') return db.classes.filter((c) => c.schoolId === actor.schoolId)
  if (actor.role === 'teacher') {
    const ids = new Set(teacherClassIds(db, actor.id))
    return db.classes.filter((c) => ids.has(c.id))
  }
  if (actor.role === 'student') {
    const ids = new Set(studentClassIds(db, actor.id))
    return db.classes.filter((c) => ids.has(c.id))
  }
  const ids = new Set(guardianChildIds(db, actor.id).flatMap((sid) => studentClassIds(db, sid)))
  return db.classes.filter((c) => ids.has(c.id))
}

export const visibleStudents = (db: DB, actor: User | null | undefined): User[] => {
  if (!actor) return []
  if (actor.role === 'admin') return db.users.filter((u) => u.role === 'student' && u.schoolId === actor.schoolId)
  if (actor.role === 'teacher') {
    const ids = new Set(teacherClassIds(db, actor.id).flatMap((cid) => classStudents(db, cid).map((s) => s.id)))
    return db.users.filter((u) => ids.has(u.id))
  }
  if (actor.role === 'parent') return guardianChildren(db, actor.id)
  return [actor]
}

export interface AttendanceSummary {
  present: number
  absent: number
  late: number
  excused: number
  total: number
  pct: number
  days: AttendanceDay[]
}

export const attendanceSummary = (db: DB, studentId: string, classId?: string): AttendanceSummary => {
  const relevant = db.attendance
    .filter((d) => !classId || d.classId === classId)
    .filter((d) => studentClassIds(db, studentId).includes(d.classId))
    .map((d) => ({ ...d, entries: d.entries.filter((e) => e.studentId === studentId) }))
    .filter((d) => d.entries.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date))

  let present = 0
  let absent = 0
  let late = 0
  let excused = 0
  for (const day of relevant) {
    const status = day.entries[0].status
    if (status === 'present') present++
    else if (status === 'absent') absent++
    else if (status === 'late') late++
    else excused++
  }
  const total = relevant.length
  const attended = present + late
  return { present, absent, late, excused, total, pct: percent(attended, total), days: relevant }
}

export const studentAttendanceStatus = (day: AttendanceDay, studentId: string): string =>
  day.entries.find((e) => e.studentId === studentId)?.status ?? 'not-marked'

export const attemptsForStudent = (db: DB, studentId: string): Attempt[] =>
  db.attempts.filter((a) => a.studentId === studentId).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))

export const attemptsForQuiz = (db: DB, quizId: string, studentId?: string): Attempt[] =>
  db.attempts.filter((a) => a.quizId === quizId && (!studentId || a.studentId === studentId))

export const quizMaxScore = (quiz: Quiz): number => quiz.questions.reduce((sum, q) => sum + q.points, 0)

/** Results are visible only when the teacher's visibility rule allows it. */
export const quizResultsVisible = (quiz: Quiz, now: Date = new Date()): boolean => {
  if (quiz.showResults === 'immediately') return true
  if (quiz.showResults === 'after_due') {
    if (!quiz.dueAt) return true
    const due = new Date(`${quiz.dueAt}T23:59:59`)
    return now.getTime() > due.getTime()
  }
  return !!quiz.resultsReleased
}

export const openQuizzesFor = (db: DB, studentId: string): Quiz[] => {
  const classIds = new Set(studentClassIds(db, studentId))
  const now = new Date()
  return db.quizzes.filter((q) => {
    if (!q.published || !classIds.has(q.classId)) return false
    if (q.openAt && new Date(`${q.openAt}T00:00:00`) > now) return false
    if (q.dueAt && new Date(`${q.dueAt}T23:59:59`) < now) return false
    const used = attemptsForQuiz(db, q.id, studentId).length
    return used < q.attemptsAllowed
  })
}

export const marksForStudent = (db: DB, studentId: string): Array<{ mark: Mark; assessment: (typeof db.assessments)[number] }> =>
  db.marks
    .filter((m) => m.studentId === studentId)
    .map((mark) => ({ mark, assessment: db.assessments.find((a) => a.id === mark.assessmentId)! }))
    .filter((row) => row.assessment && row.assessment.published)
    .sort((a, b) => b.assessment.date.localeCompare(a.assessment.date))

export const subjectProgress = (
  db: DB,
  studentId: string,
): Array<{ subjectId: string; pct: number; count: number }> => {
  const bySubject = new Map<string, { earned: number; max: number; count: number }>()
  for (const { mark, assessment } of marksForStudent(db, studentId)) {
    const entry = bySubject.get(assessment.subjectId) || { earned: 0, max: 0, count: 0 }
    entry.earned += mark.marks
    entry.max += assessment.maxMarks
    entry.count += 1
    bySubject.set(assessment.subjectId, entry)
  }
  return Array.from(bySubject.entries()).map(([subjectId, v]) => ({
    subjectId,
    pct: percent(v.earned, v.max),
    count: v.count,
  }))
}

export interface LeaderboardRow {
  studentId: string
  name: string
  avatarColor: string
  points: number
  isCurrentUser?: boolean
}

export const leaderboardFor = (db: DB, classId: string, currentUserId?: string): LeaderboardRow[] => {
  const students = classStudents(db, classId)
  const points = new Map<string, number>()
  for (const e of db.activity.filter((a) => a.classId === classId)) {
    points.set(e.studentId, (points.get(e.studentId) || 0) + e.points)
  }
  return students
    .filter((s) => !db.leaderboardOptOut.includes(s.id))
    .map((s) => ({
      studentId: s.id,
      name: s.name.split(' ')[0],
      avatarColor: s.avatarColor,
      points: points.get(s.id) || 0,
      isCurrentUser: s.id === currentUserId,
    }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
}

export const classAverage = (db: DB, classId: string, assessmentId?: string): number => {
  const assessmentIds = db.assessments
    .filter((a) => a.classId === classId && a.published && (!assessmentId || a.id === assessmentId))
    .map((a) => a.id)
  const relevant = db.marks.filter((m) => assessmentIds.includes(m.assessmentId))
  if (!relevant.length) return 0
  let earned = 0
  let max = 0
  for (const m of relevant) {
    const a = db.assessments.find((x) => x.id === m.assessmentId)
    if (a) {
      earned += m.marks
      max += a.maxMarks
    }
  }
  return percent(earned, max)
}

export const unreadNotificationCount = (db: DB, userId: string): number =>
  db.notifications.filter((n) => n.userId === userId && !n.read).length

export const pendingParentLinksForAdmin = (db: DB, schoolId: string) =>
  db.parentLinks.filter((l) => {
    if (l.status !== 'pending') return false
    const student = userById(db, l.studentId)
    return student?.schoolId === schoolId
  })

export const lowAttendanceStudents = (db: DB, classId: string, threshold: number) =>
  classStudents(db, classId)
    .map((s) => ({ student: s, summary: attendanceSummary(db, s.id, classId) }))
    .filter((row) => row.summary.total > 0 && row.summary.pct < threshold)
    .sort((a, b) => a.summary.pct - b.summary.pct)

export const roleLabelKey = (role: Role) => `role.${role}`

export const contentLanguageLabel = (lang: Lang): string =>
  ({ en: 'English', hi: 'हिन्दी', mr: 'मराठी', bn: 'বাংলা', ta: 'தமிழ்', te: 'తెలుగు' } as Record<Lang, string>)[lang] ?? lang
