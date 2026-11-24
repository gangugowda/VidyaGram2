/**
 * API contracts shared by the browser client and the server.
 *
 * These are wire types, not validation schemas. The API validates every
 * payload with Zod at the route boundary; the web app consumes these types.
 */
import type { DB, Lang, Role, User } from './types'

/** A user record safe to send to a client (no credential material). */
export type SafeUser = Omit<User, 'passwordHash' | 'salt'>

export interface ServerInfo {
  /** `demo` keeps all data on the device; `mvp` stores data on the server. */
  mode: 'demo' | 'mvp'
  version: string
  demoMode: boolean
  seededAt?: string
}

export interface BootstrapPayload {
  db: DB
  user: SafeUser | null
  demoAccounts: SafeUser[]
  server: ServerInfo
}

export interface ApiSuccess<T> {
  ok: true
  data: T
}

export interface ApiErrorBody {
  code: string
  message: string
  details?: unknown
  requestId?: string
}

export interface ApiFailure {
  ok: false
  error: ApiErrorBody
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

export interface LoginInput {
  identifier: string
  password: string
}

export interface SignupInput {
  role: Role
  name: string
  email: string
  phone?: string
  password: string
  language: Lang
  schoolId: string
  gradeLevel?: number
  section?: string
  subjectIds?: string[]
  classCode?: string
  consentGiven: boolean
  relationship?: string
}

export interface SessionPayload {
  user: SafeUser
  db: DB
}

export interface AttendanceSaveInput {
  date: string
  subjectId?: string
  period?: string
  entries: Array<{ studentId: string; status: 'present' | 'absent' | 'late' | 'excused'; note?: string }>
}

export interface QuizAttemptInput {
  answers: Record<string, string>
  /** Set when the attempt was captured offline and replayed later. */
  offlineQueuedAt?: string
}

export interface MarkInput {
  studentId: string
  marks: number
  remarks?: string
}

export interface MarksSaveInput {
  marks: MarkInput[]
}

export interface DoubtInput {
  classId: string
  subjectId: string
  topic: string
  question: string
  attachmentName?: string
}

export interface AnnouncementInput {
  classId?: string
  title: string
  body: string
  audience: 'students' | 'parents' | 'all'
}

export interface ParentLinkRequestInput {
  method: 'code' | 'approval'
  studentEmail?: string
  inviteCode?: string
  note?: string
}

export interface FeedbackInput {
  category: 'learning-content' | 'technical' | 'suggestion' | 'general'
  subject: string
  message: string
}
