import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import type {
  Assessment,
  AttendanceDay,
  AttendanceEntry,
  Attempt,
  ClassRoom,
  Mark,
  Quiz,
  User,
} from '@vidyagram/shared'
import { gradeFromPercent, normalisePeriod } from '@vidyagram/shared'
import type { SqliteDatabase } from '../db/client'
import { selectAll, selectOne, upsert, updateRow } from '../db/client'
import { canManageClass, canViewClass, classRosterIds } from '../lib/access'
import { recordAudit } from '../lib/audit'
import { gradeQuiz } from '../lib/grading'
import { badRequest, conflict, forbidden, notFound, ok, parse } from '../lib/http'
import { newId } from '../lib/ids'
import { notifyClassStudents, notifyGuardians, notifyUser } from '../lib/notify'
import { requireAuth, requireRole } from '../lib/auth'

const dateRe = /^\d{4}-\d{2}-\d{2}$/
const date = z.string().regex(dateRe, 'Use YYYY-MM-DD.')
const idSchema = z.object({ id: z.string().min(1).max(100) })

const attendanceStatus = z.enum(['present', 'absent', 'late', 'excused'])

const attendanceSchema = z.object({
  date,
  subjectId: z.string().max(40).optional(),
  period: z.string().trim().min(1).max(20).default('Full day').transform(normalisePeriod),
  entries: z
    .array(
      z.object({
        studentId: z.string().min(1),
        status: attendanceStatus,
        note: z.string().max(200).optional(),
      }),
    )
    .min(1)
    .max(300),
})

const assessmentSchema = z.object({
  subjectId: z.string().min(1).max(40),
  title: z.string().trim().min(2).max(160),
  type: z.enum(['unit-test', 'exam', 'assignment', 'project']),
  date,
  maxMarks: z.number().int().min(1).max(500),
})

const marksSchema = z.object({
  marks: z
    .array(
      z.object({
        studentId: z.string().min(1),
        marks: z.number().min(0),
        remarks: z.string().max(300).optional(),
      }),
    )
    .min(1)
    .max(300),
})

const questionSchema = z
  .object({
    id: z.string().min(1).max(100),
    type: z.enum(['mcq', 'fill']),
    prompt: z.string().min(1).max(2000),
    options: z.array(z.string().max(500)).max(10).optional(),
    answer: z.string().min(1).max(500),
    accept: z.array(z.string().max(500)).max(20).optional(),
    explanation: z.string().max(2000).default(''),
    points: z.number().int().min(1).max(100),
  })
  .refine((question) => question.type !== 'mcq' || (question.options?.length ?? 0) >= 2, {
    message: 'Multiple-choice questions need at least two options.',
  })

const quizSchema = z.object({
  subjectId: z.string().min(1).max(40),
  title: z.string().trim().min(2).max(160),
  instructions: z.string().max(2000).default(''),
  openAt: date.optional(),
  dueAt: date.optional(),
  showResults: z.enum(['immediately', 'after_due', 'manual']).default('after_due'),
  showAnswers: z.boolean().default(true),
  attemptsAllowed: z.number().int().min(1).max(10).default(1),
  timeLimitMin: z.number().int().min(1).max(240).default(20),
  language: z.enum(['en', 'hi', 'mr', 'bn', 'ta', 'te']).default('en'),
  questions: z.array(questionSchema).min(1).max(100),
})

const attemptSchema = z.object({
  answers: z.record(z.string().max(100), z.string().max(1000)),
  offlineQueuedAt: z.string().datetime().optional(),
})

const isEnrolled = (db: SqliteDatabase, classId: string, studentId: string): boolean =>
  !!db
    .prepare('SELECT 1 FROM enrollments WHERE class_id = ? AND student_id = ? AND status = ?')
    .get(classId, studentId, 'active')

const attendanceFor = (db: SqliteDatabase, classId: string, day: string, period: string): AttendanceDay | null =>
  selectOne<AttendanceDay>(db, 'attendance_days', { classId, date: day, period })

export function registerAcademicRoutes(app: FastifyInstance, db: SqliteDatabase): void {
  /* ------------------------------------------------------------- attendance */

  app.get('/classes/:id/attendance', { preHandler: requireAuth(db) }, async (request, reply) => {
    const auth = request.auth!
    const { id } = parse(idSchema, request.params)
    if (!canViewClass(db, auth.user, id)) throw forbidden()
    const query = parse(
      z.object({ date: date.optional(), limit: z.coerce.number().int().min(1).max(120).default(30) }),
      request.query,
    )
    const rows = selectAll<AttendanceDay>(db, 'attendance_days', {
      where: query.date ? { classId: id, date: query.date } : { classId: id },
      orderBy: 'date',
      direction: 'desc',
      limit: query.limit,
    })
    const visibleStudents =
      auth.user.role === 'student'
        ? new Set([auth.user.id])
        : auth.user.role === 'parent'
          ? new Set(
              selectAll<{ studentId: string }>(db, 'parent_links', {
                where: { parentId: auth.user.id, status: 'approved' },
              }).map((link) => link.studentId),
            )
          : null
    const days = visibleStudents
      ? rows.map((row) => ({ ...row, entries: row.entries.filter((entry) => visibleStudents.has(entry.studentId)) }))
      : rows
    return ok(reply, { days })
  })

  app.put(
    '/classes/:id/attendance',
    { preHandler: [requireAuth(db), requireRole('teacher', 'admin')] },
    async (request, reply) => {
      const auth = request.auth!
      const { id } = parse(idSchema, request.params)
      if (!canManageClass(db, auth.user, id)) throw forbidden('Only the class teacher can mark attendance.')
      const input = parse(attendanceSchema, request.body)
      const roster = new Set(classRosterIds(db, id))
      const seen = new Set<string>()
      for (const entry of input.entries) {
        if (!roster.has(entry.studentId)) throw badRequest('A student in this list is not in the class.')
        if (seen.has(entry.studentId)) throw badRequest('A student appears twice in the attendance list.')
        seen.add(entry.studentId)
      }

      const existing = attendanceFor(db, id, input.date, input.period)
      const now = new Date().toISOString()
      const record: AttendanceDay = {
        id: existing?.id ?? newId('attd'),
        classId: id,
        subjectId: input.subjectId,
        date: input.date,
        period: input.period,
        entries: input.entries as AttendanceEntry[],
        markedBy: auth.user.id,
        updatedAt: now,
      }
      upsert(db, 'attendance_days', record)

      for (const entry of record.entries) {
        if (entry.status === 'absent') {
          const student = selectOne<User>(db, 'users', { id: entry.studentId })
          if (student) {
            notifyGuardians(
              db,
              student.id,
              'attendance',
              `Absence marked for ${student.name.split(' ')[0]}`,
              `Attendance on ${input.date} was marked absent.`,
              '/attendance',
            )
          }
        }
      }
      recordAudit(db, auth.user, 'attendance.save', `${input.date} · ${input.entries.length} students`)
      return ok(reply, { day: record })
    },
  )

  /* ------------------------------------------------------------ assessments */

  app.get('/classes/:id/assessments', { preHandler: requireAuth(db) }, async (request, reply) => {
    const auth = request.auth!
    const { id } = parse(idSchema, request.params)
    if (!canViewClass(db, auth.user, id)) throw forbidden()
    const assessments = selectAll<Assessment>(db, 'assessments', {
      where: { classId: id },
      orderBy: 'date',
      direction: 'desc',
    }).filter((assessment) => auth.user.role === 'teacher' || auth.user.role === 'admin' || assessment.published)
    return ok(reply, { assessments })
  })

  app.post(
    '/classes/:id/assessments',
    { preHandler: [requireAuth(db), requireRole('teacher', 'admin')] },
    async (request, reply) => {
      const auth = request.auth!
      const { id } = parse(idSchema, request.params)
      if (!canManageClass(db, auth.user, id)) throw forbidden('Only the class teacher can create assessments.')
      const input = parse(assessmentSchema, request.body)
      const assessment: Assessment = {
        id: newId('asm'),
        classId: id,
        subjectId: input.subjectId,
        title: input.title,
        type: input.type,
        date: input.date,
        maxMarks: input.maxMarks,
        published: false,
        graded: false,
        createdBy: auth.user.id,
        createdAt: new Date().toISOString(),
      }
      upsert(db, 'assessments', assessment)
      recordAudit(db, auth.user, 'assessment.create', assessment.title)
      return ok(reply, { assessment }, 201)
    },
  )

  app.put(
    '/assessments/:id/marks',
    { preHandler: [requireAuth(db), requireRole('teacher', 'admin')] },
    async (request, reply) => {
      const auth = request.auth!
      const { id } = parse(idSchema, request.params)
      const assessment = selectOne<Assessment>(db, 'assessments', { id })
      if (!assessment) throw notFound('Assessment not found.')
      if (!canManageClass(db, auth.user, assessment.classId)) throw forbidden('Only the class teacher can enter marks.')
      const input = parse(marksSchema, request.body)
      const roster = new Set(classRosterIds(db, assessment.classId))
      const now = new Date().toISOString()
      const saved: Mark[] = []
      for (const row of input.marks) {
        if (!roster.has(row.studentId)) throw badRequest('A student in this list is not in the class.')
        if (row.marks > assessment.maxMarks) throw badRequest('Marks cannot exceed the maximum for this assessment.')
        const existing = selectOne<Mark>(db, 'marks', { assessmentId: id, studentId: row.studentId })
        const mark: Mark = {
          id: existing?.id ?? newId('mark'),
          assessmentId: id,
          studentId: row.studentId,
          marks: row.marks,
          grade: gradeFromPercent((row.marks / assessment.maxMarks) * 100),
          remarks: row.remarks,
          updatedBy: auth.user.id,
          updatedAt: now,
        }
        upsert(db, 'marks', mark)
        saved.push(mark)
      }
      updateRow(db, 'assessments', id, { graded: true })
      recordAudit(db, auth.user, 'marks.save', `${assessment.title} · ${saved.length} students`)
      return ok(reply, { marks: saved })
    },
  )

  app.post(
    '/assessments/:id/publish',
    { preHandler: [requireAuth(db), requireRole('teacher', 'admin')] },
    async (request, reply) => {
      const auth = request.auth!
      const { id } = parse(idSchema, request.params)
      const assessment = selectOne<Assessment>(db, 'assessments', { id })
      if (!assessment) throw notFound('Assessment not found.')
      if (!canManageClass(db, auth.user, assessment.classId)) throw forbidden()
      updateRow(db, 'assessments', id, { published: true })
      notifyClassStudents(
        db,
        assessment.classId,
        'marks',
        `Results published: ${assessment.title}`,
        'Open Marks to see your result.',
        '/marks',
      )
      for (const studentId of classRosterIds(db, assessment.classId)) {
        notifyGuardians(db, studentId, 'marks', `Results published: ${assessment.title}`, 'Open Marks to see the result.', '/marks')
      }
      recordAudit(db, auth.user, 'assessment.publish', assessment.title)
      return ok(reply, { assessment: selectOne<Assessment>(db, 'assessments', { id }) })
    },
  )

  /* ----------------------------------------------------------------- quizzes */

  app.post(
    '/classes/:id/quizzes',
    { preHandler: [requireAuth(db), requireRole('teacher', 'admin')] },
    async (request, reply) => {
      const auth = request.auth!
      const { id } = parse(idSchema, request.params)
      if (!canManageClass(db, auth.user, id)) throw forbidden('Only the class teacher can create quizzes.')
      const input = parse(quizSchema, request.body)
      const quiz: Quiz = {
        id: newId('quiz'),
        classId: id,
        subjectId: input.subjectId,
        title: input.title,
        instructions: input.instructions,
        published: false,
        openAt: input.openAt,
        dueAt: input.dueAt,
        showResults: input.showResults,
        showAnswers: input.showAnswers,
        resultsReleased: false,
        attemptsAllowed: input.attemptsAllowed,
        timeLimitMin: input.timeLimitMin,
        questions: input.questions,
        createdBy: auth.user.id,
        createdAt: new Date().toISOString(),
        language: input.language,
      }
      upsert(db, 'quizzes', quiz)
      recordAudit(db, auth.user, 'quiz.create', quiz.title)
      return ok(reply, { quiz }, 201)
    },
  )

  app.post(
    '/quizzes/:id/publish',
    { preHandler: [requireAuth(db), requireRole('teacher', 'admin')] },
    async (request, reply) => {
      const auth = request.auth!
      const { id } = parse(idSchema, request.params)
      const quiz = selectOne<Quiz>(db, 'quizzes', { id })
      if (!quiz) throw notFound('Quiz not found.')
      if (!canManageClass(db, auth.user, quiz.classId)) throw forbidden()
      updateRow(db, 'quizzes', id, { published: true })
      notifyClassStudents(db, quiz.classId, 'quiz', `New quiz: ${quiz.title}`, 'Open Quizzes to attempt it.', '/quizzes')
      recordAudit(db, auth.user, 'quiz.publish', quiz.title)
      return ok(reply, { quiz: selectOne<Quiz>(db, 'quizzes', { id }) })
    },
  )

  app.get('/quizzes/:id/attempts', { preHandler: requireAuth(db) }, async (request, reply) => {
    const auth = request.auth!
    const { id } = parse(idSchema, request.params)
    const quiz = selectOne<Quiz>(db, 'quizzes', { id })
    if (!quiz) throw notFound('Quiz not found.')
    if (!canViewClass(db, auth.user, quiz.classId)) throw forbidden()
    const attempts = selectAll<Attempt>(db, 'attempts', { where: { quizId: id }, orderBy: 'submittedAt' }).filter(
      (attempt) => auth.user.role !== 'student' || attempt.studentId === auth.user.id,
    )
    return ok(reply, { attempts })
  })

  app.post('/quizzes/:id/attempts', { preHandler: [requireAuth(db), requireRole('student')] }, async (request, reply) => {
    const auth = request.auth!
    const { id } = parse(idSchema, request.params)
    const quiz = selectOne<Quiz>(db, 'quizzes', { id })
    if (!quiz) throw notFound('Quiz not found.')
    if (!quiz.published) throw conflict('This quiz is not published yet.')
    if (!isEnrolled(db, quiz.classId, auth.user.id)) throw forbidden('You are not enrolled in this class.')

    const today = new Date().toISOString().slice(0, 10)
    if (quiz.openAt && today < quiz.openAt) throw conflict('This quiz is not open yet.')
    if (quiz.dueAt && today > quiz.dueAt) throw conflict('The deadline for this quiz has passed.')

    const used = (
      db.prepare('SELECT COUNT(*) AS count FROM attempts WHERE quiz_id = ? AND student_id = ?').get(id, auth.user.id) as {
        count: number
      }
    ).count
    if (used >= quiz.attemptsAllowed) throw conflict('You have used all attempts for this quiz.')

    const input = parse(attemptSchema, request.body)
    const graded = gradeQuiz(quiz, input.answers)
    const attempt: Attempt = {
      id: newId('att'),
      quizId: quiz.id,
      studentId: auth.user.id,
      answers: input.answers,
      score: graded.score,
      maxScore: graded.maxScore,
      autoGraded: true,
      submittedAt: new Date().toISOString(),
      syncedFromOffline: !!input.offlineQueuedAt,
    }
    upsert(db, 'attempts', attempt)
    upsert(db, 'activity', {
      id: newId('act'),
      studentId: auth.user.id,
      classId: quiz.classId,
      points: 10 + Math.round((graded.score / Math.max(1, graded.maxScore)) * 20),
      reason: 'quiz-attempt',
      at: attempt.submittedAt,
    })

    const cls = selectOne<ClassRoom>(db, 'classes', { id: quiz.classId })
    if (cls) {
      notifyUser(
        db,
        cls.teacherId,
        'quiz',
        `${auth.user.name} submitted ${quiz.title}`,
        `${graded.score}/${graded.maxScore}`,
        `/quizzes/${quiz.id}`,
      )
    }
    notifyGuardians(db, auth.user.id, 'quiz', `${auth.user.name.split(' ')[0]} submitted a quiz`, quiz.title, '/quizzes')

    return ok(reply, { attempt }, 201)
  })

  app.post(
    '/quizzes/:id/release',
    { preHandler: [requireAuth(db), requireRole('teacher', 'admin')] },
    async (request, reply) => {
      const auth = request.auth!
      const { id } = parse(idSchema, request.params)
      const quiz = selectOne<Quiz>(db, 'quizzes', { id })
      if (!quiz) throw notFound('Quiz not found.')
      if (!canManageClass(db, auth.user, quiz.classId)) throw forbidden()
      updateRow(db, 'quizzes', id, { resultsReleased: true })
      notifyClassStudents(db, quiz.classId, 'quiz', `Results released: ${quiz.title}`, 'Open Quizzes to review your result.', '/quizzes')
      recordAudit(db, auth.user, 'quiz.release', quiz.title)
      return ok(reply, { quiz: selectOne<Quiz>(db, 'quizzes', { id }) })
    },
  )
}
