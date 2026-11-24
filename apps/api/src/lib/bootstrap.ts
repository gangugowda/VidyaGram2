import type {
  BootstrapPayload,
  DB,
  ParentLink,
  PlatformConfig,
  Quiz,
  SafeUser,
  School,
  User,
} from '@vidyagram/shared'
import type { SqliteDatabase } from '../db/client'
import { selectAll, selectOne } from '../db/client'
import { config } from '../config'
import { getMeta } from './audit'
import { classRosterIds, guardianChildIds, visibleClassIds, visibleStudentIds } from './access'
import { toSafeUser } from './serialize'
import { demoAccounts } from '../db/seed'

const DEFAULT_CONFIG: PlatformConfig = {
  platformName: 'VidyaGram',
  supportEmail: '',
  lowAttendanceThreshold: 75,
  allowSelfSignup: false,
  leaderboardDefault: true,
  scholarListingNotice: '',
}

const EMPTY_DB = (): DB => ({
  version: 4,
  seededAt: new Date(0).toISOString(),
  schools: [],
  users: [],
  classes: [],
  enrollments: [],
  sessions: [],
  recordings: [],
  resources: [],
  quizzes: [],
  attempts: [],
  attendance: [],
  assessments: [],
  marks: [],
  doubts: [],
  announcements: [],
  notifications: [],
  scholarships: [],
  labs: [],
  labRuns: [],
  feedback: [],
  downloads: [],
  parentLinks: [],
  userBadges: [],
  leaderboardOptOut: [],
  bookmarks: [],
  outbox: [],
  activity: [],
  audit: [],
  config: DEFAULT_CONFIG,
})

const publicSchool = (school: School): School => ({
  ...school,
  contactEmail: '',
  contactPhone: '',
  lowAttendanceThreshold: 0,
  createdAt: '',
})

const publicConfig = (db: SqliteDatabase): PlatformConfig => {
  const stored = selectOne<PlatformConfig & { id: number }>(db, 'platform_config', { id: 1 })
  if (!stored) return DEFAULT_CONFIG
  const { id: _id, ...rest } = stored
  return rest
}

const meta = (db: SqliteDatabase): { version: number; seededAt: string } => ({
  version: Number(getMeta(db, 'db_version') || 4),
  seededAt: getMeta(db, 'seeded_at') || new Date(0).toISOString(),
})

const quizResultsVisible = (quiz: Quiz): boolean => {
  if (quiz.showResults === 'immediately') return true
  if (quiz.showResults === 'after_due') {
    if (!quiz.dueAt) return true
    return Date.now() > new Date(`${quiz.dueAt}T23:59:59`).getTime()
  }
  return !!quiz.resultsReleased
}

/**
 * Builds the read model the browser app boots from.
 *
 * The demo app shipped the entire school to every browser. The API scopes the
 * snapshot by role: private records belong to the student, their approved
 * guardians, their teachers and school administrators only. Answers to
 * unpublished quizzes never leave the server.
 */
export function buildBootstrap(db: SqliteDatabase, actor: User | null): BootstrapPayload {
  const info = meta(db)
  const settings = publicConfig(db)

  if (!actor) {
    const dbPublic = EMPTY_DB()
    dbPublic.version = info.version
    dbPublic.seededAt = info.seededAt
    dbPublic.schools = selectAll<School>(db, 'schools').map(publicSchool)
    dbPublic.users = demoAccounts(db).map(toSafeUser) as unknown as User[]
    dbPublic.config = settings
    return {
      db: dbPublic,
      user: null,
      demoAccounts: dbPublic.users as unknown as SafeUser[],
      server: { mode: 'mvp', version: '0.2.0', demoMode: config.demoMode },
    }
  }

  const classIds = new Set(visibleClassIds(db, actor))
  const studentIds = new Set(visibleStudentIds(db, actor))
  const childIds = new Set(actor.role === 'parent' ? guardianChildIds(db, actor.id) : [])
  const schoolUsers = selectAll<User>(db, 'users', { where: { schoolId: actor.schoolId } })

  // Which user records may this actor see at all?
  const allowedUserIds = new Set<string>([actor.id, ...studentIds])
  if (actor.role === 'admin') {
    for (const user of schoolUsers) allowedUserIds.add(user.id)
  } else {
    for (const classId of classIds) {
      const cls = selectOne<{ teacherId: string }>(db, 'classes', { id: classId })
      if (cls?.teacherId) allowedUserIds.add(cls.teacherId)
    }
    for (const user of schoolUsers) {
      if (user.role === 'admin') allowedUserIds.add(user.id)
      if (user.role === 'teacher') {
        // Teachers of any visible class are included above; co-teachers are
        // not, to keep the directory minimal.
      }
    }
    if (actor.role === 'student' || actor.role === 'parent') {
      for (const classId of classIds) {
        for (const studentId of classRosterIds(db, classId)) allowedUserIds.add(studentId)
      }
    }
  }

  const users: SafeUser[] = schoolUsers
    .filter((user) => allowedUserIds.has(user.id))
    .map((user) => {
      const safe = toSafeUser(user)
      const isSelf = user.id === actor.id
      const isChild = childIds.has(user.id)
      if (actor.role !== 'admin' && !isSelf && !isChild) {
        // Contact details and guardian information are not part of the
        // class directory. Admin user management still sees them.
        safe.email = ''
        safe.phone = undefined
        safe.guardianName = undefined
        safe.inviteCode = undefined
        safe.consentAt = undefined
      }
      return safe
    })

  const classes = selectAll<DB['classes'][number]>(db, 'classes').filter((cls) => classIds.has(cls.id))
  const enrollments = selectAll<DB['enrollments'][number]>(db, 'enrollments').filter((row) => classIds.has(row.classId))

  const classScoped = <T extends { classId: string }>(rows: T[]): T[] => rows.filter((row) => classIds.has(row.classId))

  const sessions = classScoped(selectAll<DB['sessions'][number]>(db, 'class_sessions'))
  const recordings = classScoped(selectAll<DB['recordings'][number]>(db, 'recordings'))
  const resources = classScoped(selectAll<DB['resources'][number]>(db, 'resources')).filter(
    (resource) => actor.role === 'admin' || actor.role === 'teacher' || resource.published,
  )

  const quizzes = classScoped(selectAll<Quiz>(db, 'quizzes')).filter(
    (quiz) => actor.role === 'admin' || actor.role === 'teacher' || quiz.published,
  )
  const safeQuizzes = quizzes.map((quiz) => {
    if (actor.role === 'admin' || actor.role === 'teacher') return quiz
    if (quizResultsVisible(quiz)) return quiz
    return {
      ...quiz,
      questions: quiz.questions.map(({ answer: _answer, accept: _accept, explanation: _explanation, ...rest }) => ({
        ...rest,
        answer: '',
        explanation: '',
      })),
    }
  })

  const attempts = selectAll<DB['attempts'][number]>(db, 'attempts').filter((attempt) => {
    if (actor.role === 'admin') return true
    if (actor.role === 'teacher') {
      const quiz = quizzes.find((item) => item.id === attempt.quizId)
      return !!quiz
    }
    return studentIds.has(attempt.studentId)
  })

  const attendance = classScoped(selectAll<DB['attendance'][number]>(db, 'attendance_days')).map((day) => ({
    ...day,
    entries: day.entries.filter((entry) => studentIds.has(entry.studentId)),
  }))

  const assessments = classScoped(selectAll<DB['assessments'][number]>(db, 'assessments')).filter(
    (assessment) => actor.role === 'admin' || actor.role === 'teacher' || assessment.published,
  )
  const assessmentIds = new Set(assessments.map((assessment) => assessment.id))
  const marks = selectAll<DB['marks'][number]>(db, 'marks').filter(
    (mark) => assessmentIds.has(mark.assessmentId) && studentIds.has(mark.studentId),
  )

  const doubts = classScoped(selectAll<DB['doubts'][number]>(db, 'doubts')).filter((doubt) => {
    if (actor.role === 'admin' || actor.role === 'teacher') return true
    return studentIds.has(doubt.studentId)
  })

  const announcements = selectAll<DB['announcements'][number]>(db, 'announcements').filter(
    (announcement) =>
      announcement.schoolId === actor.schoolId && (!announcement.classId || classIds.has(announcement.classId)),
  )

  const notifications = selectAll<DB['notifications'][number]>(db, 'notifications', { where: { userId: actor.id } })

  const labRuns = selectAll<DB['labRuns'][number]>(db, 'lab_runs').filter((run) => studentIds.has(run.studentId))

  const feedback =
    actor.role === 'admin'
      ? selectAll<DB['feedback'][number]>(db, 'feedback').filter((item) =>
          schoolUsers.some((user) => user.id === item.userId),
        )
      : selectAll<DB['feedback'][number]>(db, 'feedback', { where: { userId: actor.id } })

  const downloads = selectAll<DB['downloads'][number]>(db, 'downloads', { where: { userId: actor.id } })
  const bookmarks = selectAll<DB['bookmarks'][number]>(db, 'bookmarks', { where: { userId: actor.id } })

  const parentLinks = selectAll<ParentLink>(db, 'parent_links').filter((link) => {
    if (actor.role === 'admin') {
      const student = schoolUsers.find((user) => user.id === link.studentId)
      return !!student
    }
    if (actor.role === 'parent') return link.parentId === actor.id
    if (actor.role === 'student') return link.studentId === actor.id
    return studentIds.has(link.studentId)
  })

  const userBadges = selectAll<DB['userBadges'][number]>(db, 'user_badges').filter((badge) =>
    allowedUserIds.has(badge.userId),
  )
  const activity = classScoped(selectAll<DB['activity'][number]>(db, 'activity'))
  const audit =
    actor.role === 'admin'
      ? selectAll<DB['audit'][number]>(db, 'audit').filter((entry) =>
          schoolUsers.some((user) => user.id === entry.actorId),
        )
      : []

  const dbView: DB = {
    ...EMPTY_DB(),
    version: info.version,
    seededAt: info.seededAt,
    schools: selectAll<School>(db, 'schools', { where: { id: actor.schoolId } }),
    // SafeUser omits credential columns. The wire type keeps the shared DB
    // shape for client compatibility; no secret fields are present.
    users: users as unknown as User[],
    classes,
    enrollments,
    sessions,
    recordings,
    resources,
    quizzes: safeQuizzes,
    attempts,
    attendance,
    assessments,
    marks,
    doubts,
    announcements,
    notifications,
    scholarships: selectAll<DB['scholarships'][number]>(db, 'scholarships'),
    labs: selectAll<DB['labs'][number]>(db, 'labs'),
    labRuns,
    feedback,
    downloads,
    parentLinks,
    userBadges,
    leaderboardOptOut: (
      db.prepare('SELECT user_id AS userId FROM leaderboard_opt_out').all() as Array<{ userId: string }>
    ).map((row) => row.userId),
    bookmarks,
    outbox: [],
    activity,
    audit,
    config: settings,
  }

  return {
    db: dbView,
    user: toSafeUser(actor),
    demoAccounts: demoAccounts(db).map(toSafeUser),
    server: { mode: 'mvp', version: '0.2.0', demoMode: config.demoMode },
  }
}
