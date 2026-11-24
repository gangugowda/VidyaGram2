/**
 * Table metadata for the VidyaGram SQLite database.
 *
 * The web demo stores a single JSON document. The MVP normalises it into real
 * tables so the API can query and authorise records without loading the whole
 * school into memory. Nested values (question lists, attendance entries,
 * reply threads) stay as JSON columns because they are always read with their
 * parent row and never queried independently.
 *
 * This module is the single source of truth for the physical schema. The
 * migrator generates DDL from it and the repository maps rows to the domain
 * model with the same metadata.
 */
import type { DB } from '@vidyagram/shared'

export type SqlType = 'text' | 'int' | 'real'

export interface Column {
  type: SqlType
  /** Stored as JSON text and parsed back into an object/array. */
  json?: boolean
  /** Stored as 0/1 and parsed back into a boolean. */
  bool?: boolean
  unique?: boolean
}

export interface Table {
  columns: Record<string, Column>
  unique?: string[][]
  indexes?: string[][]
}

const text = (extra: Partial<Column> = {}): Column => ({ type: 'text', ...extra })
const int = (extra: Partial<Column> = {}): Column => ({ type: 'int', ...extra })
const real = (extra: Partial<Column> = {}): Column => ({ type: 'real', ...extra })
const json = (): Column => ({ type: 'text', json: true })
const bool = (): Column => ({ type: 'int', bool: true })

export const TABLES: Record<string, Table> = {
  schools: {
    columns: {
      id: text({ unique: true }),
      name: text(),
      code: text({ unique: true }),
      district: text(),
      state: text(),
      lowAttendanceThreshold: int(),
      contactEmail: text(),
      contactPhone: text(),
      createdAt: text(),
    },
  },
  users: {
    columns: {
      id: text({ unique: true }),
      role: text(),
      name: text(),
      email: text({ unique: true }),
      phone: text(),
      passwordHash: text(),
      salt: text(),
      passwordAlgo: text(),
      language: text(),
      avatarColor: text(),
      schoolId: text(),
      createdAt: text(),
      gradeLevel: int(),
      section: text(),
      rollNo: text(),
      guardianName: text(),
      relationship: text(),
      designation: text(),
      subjectIds: json(),
      inviteCode: text(),
      lowDataMode: bool(),
      reduceMotion: bool(),
      textSize: text(),
      consentGiven: bool(),
      consentAt: text(),
      disabled: bool(),
      demo: bool(),
    },
    indexes: [['schoolId'], ['role'], ['inviteCode']],
  },
  classes: {
    columns: {
      id: text({ unique: true }),
      name: text(),
      gradeLevel: int(),
      section: text(),
      schoolId: text(),
      teacherId: text(),
      subjectIds: json(),
      code: text({ unique: true }),
      leaderboardEnabled: bool(),
      createdAt: text(),
    },
    indexes: [['schoolId'], ['teacherId']],
  },
  enrollments: {
    columns: {
      id: text({ unique: true }),
      classId: text(),
      studentId: text(),
      joinedAt: text(),
      status: text(),
    },
    unique: [['classId', 'studentId']],
    indexes: [['classId'], ['studentId']],
  },
  class_sessions: {
    columns: {
      id: text({ unique: true }),
      classId: text(),
      subjectId: text(),
      title: text(),
      description: text(),
      date: text(),
      startTime: text(),
      durationMin: int(),
      teacherId: text(),
      status: text(),
      zoomLink: text(),
      zoomMeetingId: text(),
      demoRoom: bool(),
      resourceIds: json(),
      recordingIds: json(),
      createdAt: text(),
    },
    indexes: [['classId'], ['date']],
  },
  recordings: {
    columns: {
      id: text({ unique: true }),
      classId: text(),
      subjectId: text(),
      sessionId: text(),
      title: text(),
      chapter: text(),
      teacherId: text(),
      date: text(),
      durationMin: int(),
      sizeMB: real(),
      mediaUrl: text(),
      audioOnlyUrl: text(),
      lowQualityUrl: text(),
      downloadEnabled: bool(),
      source: text(),
      description: text(),
      language: text(),
      status: text(),
    },
    indexes: [['classId']],
  },
  resources: {
    columns: {
      id: text({ unique: true }),
      title: text(),
      description: text(),
      type: text(),
      classId: text(),
      subjectId: text(),
      chapter: text(),
      topics: json(),
      languages: json(),
      sizeKB: int(),
      downloadable: bool(),
      published: bool(),
      uploadedBy: text(),
      uploadedAt: text(),
      content: text(),
      fileUrl: text(),
      pages: int(),
      gradeLevels: json(),
    },
    indexes: [['classId'], ['subjectId'], ['published']],
  },
  quizzes: {
    columns: {
      id: text({ unique: true }),
      classId: text(),
      subjectId: text(),
      title: text(),
      instructions: text(),
      published: bool(),
      openAt: text(),
      dueAt: text(),
      showResults: text(),
      showAnswers: bool(),
      resultsReleased: bool(),
      attemptsAllowed: int(),
      timeLimitMin: int(),
      questions: json(),
      createdBy: text(),
      createdAt: text(),
      language: text(),
    },
    indexes: [['classId'], ['published']],
  },
  attempts: {
    columns: {
      id: text({ unique: true }),
      quizId: text(),
      studentId: text(),
      answers: json(),
      score: real(),
      maxScore: real(),
      autoGraded: bool(),
      submittedAt: text(),
      syncedFromOffline: bool(),
    },
    indexes: [['quizId'], ['studentId']],
  },
  attendance_days: {
    columns: {
      id: text({ unique: true }),
      classId: text(),
      subjectId: text(),
      date: text(),
      period: text(),
      entries: json(),
      markedBy: text(),
      updatedAt: text(),
    },
    unique: [['classId', 'date', 'period']],
    indexes: [['classId', 'date'], ['date']],
  },
  assessments: {
    columns: {
      id: text({ unique: true }),
      classId: text(),
      subjectId: text(),
      title: text(),
      type: text(),
      date: text(),
      maxMarks: int(),
      published: bool(),
      graded: bool(),
      createdBy: text(),
      createdAt: text(),
    },
    indexes: [['classId'], ['date']],
  },
  marks: {
    columns: {
      id: text({ unique: true }),
      assessmentId: text(),
      studentId: text(),
      marks: real(),
      grade: text(),
      remarks: text(),
      updatedBy: text(),
      updatedAt: text(),
    },
    unique: [['assessmentId', 'studentId']],
    indexes: [['assessmentId'], ['studentId']],
  },
  doubts: {
    columns: {
      id: text({ unique: true }),
      studentId: text(),
      classId: text(),
      subjectId: text(),
      topic: text(),
      question: text(),
      attachmentName: text(),
      status: text(),
      createdAt: text(),
      resolvedAt: text(),
      replies: json(),
    },
    indexes: [['classId'], ['studentId'], ['status']],
  },
  announcements: {
    columns: {
      id: text({ unique: true }),
      classId: text(),
      schoolId: text(),
      title: text(),
      body: text(),
      authorId: text(),
      audience: text(),
      createdAt: text(),
      pinned: bool(),
    },
    indexes: [['schoolId'], ['classId']],
  },
  notifications: {
    columns: {
      id: text({ unique: true }),
      userId: text(),
      kind: text(),
      title: text(),
      body: text(),
      link: text(),
      read: bool(),
      createdAt: text(),
    },
    indexes: [['userId', 'read'], ['userId', 'createdAt']],
  },
  scholarships: {
    columns: {
      id: text({ unique: true }),
      name: text(),
      provider: text(),
      description: text(),
      eligibility: text(),
      gradeLevels: json(),
      deadline: text(),
      documents: json(),
      link: text(),
      lastVerified: text(),
      verified: bool(),
      sample: bool(),
      status: text(),
      createdBy: text(),
    },
  },
  labs: {
    columns: {
      id: text({ unique: true }),
      title: text(),
      subjectId: text(),
      gradeLevels: json(),
      objective: text(),
      instructions: json(),
      kind: text(),
      plannedFor: text(),
      dataMB: real(),
      lowerDataAlternative: text(),
      check: json(),
      languages: json(),
    },
  },
  lab_runs: {
    columns: {
      id: text({ unique: true }),
      labId: text(),
      studentId: text(),
      score: real(),
      maxScore: real(),
      completedAt: text(),
    },
    indexes: [['labId'], ['studentId']],
  },
  feedback: {
    columns: {
      id: text({ unique: true }),
      userId: text(),
      role: text(),
      category: text(),
      subject: text(),
      message: text(),
      status: text(),
      createdAt: text(),
      adminReply: text(),
      updatedAt: text(),
    },
    indexes: [['userId'], ['status']],
  },
  downloads: {
    columns: {
      id: text({ unique: true }),
      userId: text(),
      kind: text(),
      refId: text(),
      title: text(),
      sizeKB: int(),
      offlineReadable: bool(),
      addedAt: text(),
    },
    indexes: [['userId']],
  },
  parent_links: {
    columns: {
      id: text({ unique: true }),
      parentId: text(),
      studentId: text(),
      status: text(),
      requestedAt: text(),
      respondedAt: text(),
      method: text(),
      note: text(),
    },
    unique: [['parentId', 'studentId']],
    indexes: [['parentId'], ['studentId'], ['status']],
  },
  user_badges: {
    columns: {
      id: text({ unique: true }),
      userId: text(),
      badgeKey: text(),
      awardedAt: text(),
    },
    unique: [['userId', 'badgeKey']],
    indexes: [['userId']],
  },
  bookmarks: {
    columns: {
      id: text({ unique: true }),
      userId: text(),
      resourceId: text(),
      addedAt: text(),
    },
    unique: [['userId', 'resourceId']],
    indexes: [['userId']],
  },
  activity: {
    columns: {
      id: text({ unique: true }),
      studentId: text(),
      classId: text(),
      points: int(),
      reason: text(),
      at: text(),
    },
    indexes: [['classId'], ['studentId']],
  },
  audit: {
    columns: {
      id: text({ unique: true }),
      actorId: text(),
      actorName: text(),
      actorRole: text(),
      action: text(),
      detail: text(),
      at: text(),
    },
    indexes: [['at'], ['actorId']],
  },
  platform_config: {
    columns: {
      id: int({ unique: true }),
      platformName: text(),
      supportEmail: text(),
      lowAttendanceThreshold: int(),
      allowSelfSignup: bool(),
      leaderboardDefault: bool(),
      scholarListingNotice: text(),
    },
  },
}

/** Tables that hold auth material and never belong in a bootstrap response. */
export const AUTH_TABLES = ['auth_sessions', 'login_attempts'] as const

/** Domain collection → physical table. */
export const COLLECTION_TABLES = {
  schools: 'schools',
  users: 'users',
  classes: 'classes',
  enrollments: 'enrollments',
  sessions: 'class_sessions',
  recordings: 'recordings',
  resources: 'resources',
  quizzes: 'quizzes',
  attempts: 'attempts',
  attendance: 'attendance_days',
  assessments: 'assessments',
  marks: 'marks',
  doubts: 'doubts',
  announcements: 'announcements',
  notifications: 'notifications',
  scholarships: 'scholarships',
  labs: 'labs',
  labRuns: 'lab_runs',
  feedback: 'feedback',
  downloads: 'downloads',
  parentLinks: 'parent_links',
  userBadges: 'user_badges',
  bookmarks: 'bookmarks',
  activity: 'activity',
  audit: 'audit',
} as const satisfies Partial<Record<keyof DB, string>>

export type CollectionName = keyof typeof COLLECTION_TABLES
export type TableName = (typeof COLLECTION_TABLES)[CollectionName] | 'platform_config'
