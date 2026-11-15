/** Shared domain types for VidyaGram. */

export type Role = 'student' | 'teacher' | 'parent' | 'admin'

export type Lang = 'en' | 'hi' | 'mr' | 'bn' | 'ta' | 'te'

export interface AppConfig {
  demoMode: boolean
  version: string
  zoom: { configured: boolean; proxyUrl: string; label: string }
  ai: { configured: boolean; proxyUrl: string; provider: string }
  email: { configured: boolean }
  sms: { configured: boolean }
}

declare global {
  interface Window {
    VIDYAGRAM_CONFIG?: Partial<AppConfig>
  }
}

export interface School {
  id: string
  name: string
  code: string
  district: string
  state: string
  lowAttendanceThreshold: number
  contactEmail: string
  contactPhone: string
  createdAt: string
}

export interface User {
  id: string
  role: Role
  name: string
  email: string
  phone?: string
  passwordHash: string
  salt: string
  language: Lang
  avatarColor: string
  schoolId: string
  createdAt: string
  /** student fields */
  gradeLevel?: number
  section?: string
  rollNo?: string
  guardianName?: string
  /** parent fields */
  relationship?: string
  /** teacher fields */
  designation?: string
  subjectIds?: string[]
  /** student guardian invitation code, issued by the class teacher */
  inviteCode?: string
  /** accessibility + preferences */
  lowDataMode?: boolean
  reduceMotion?: boolean
  textSize?: 'normal' | 'large'
  consentGiven?: boolean
  consentAt?: string
  /** disabled accounts cannot sign in */
  disabled?: boolean
  demo?: boolean
}

export interface ClassRoom {
  id: string
  name: string
  gradeLevel: number
  section: string
  schoolId: string
  teacherId: string
  subjectIds: string[]
  code: string
  leaderboardEnabled: boolean
  createdAt: string
}

export interface Enrollment {
  id: string
  classId: string
  studentId: string
  joinedAt: string
  status: 'active' | 'removed'
}

export type SessionStatus = 'scheduled' | 'live' | 'completed' | 'cancelled'

export interface ClassSession {
  id: string
  classId: string
  subjectId: string
  title: string
  description?: string
  /** ISO date (YYYY-MM-DD) local school date */
  date: string
  startTime: string
  durationMin: number
  teacherId: string
  status: SessionStatus
  /** real Zoom join URL when integration/meeting exists */
  zoomLink?: string
  zoomMeetingId?: string
  /** true when the link is a demo room, not a real Zoom meeting */
  demoRoom?: boolean
  resourceIds: string[]
  recordingIds: string[]
  createdAt: string
}

export interface Recording {
  id: string
  classId: string
  subjectId: string
  sessionId?: string
  title: string
  chapter: string
  teacherId: string
  date: string
  durationMin: number
  sizeMB: number
  /** Actual media URL. Empty when no media was uploaded. */
  mediaUrl?: string
  audioOnlyUrl?: string
  lowQualityUrl?: string
  downloadEnabled: boolean
  source: 'zoom' | 'upload'
  description?: string
  language: Lang
  status: 'processing' | 'ready' | 'failed'
}

export type ResourceType =
  | 'note'
  | 'textbook'
  | 'question-paper'
  | 'mcq-set'
  | 'fill-blanks'
  | 'revision'
  | 'storybook'
  | 'supplementary'

export interface Resource {
  id: string
  title: string
  description: string
  type: ResourceType
  classId: string
  subjectId: string
  chapter: string
  topics: string[]
  languages: Lang[]
  sizeKB: number
  downloadable: boolean
  published: boolean
  uploadedBy: string
  uploadedAt: string
  /** Text content used by the in-app reader and offline download. */
  content?: string
  /** External file URL if the school hosts a real file */
  fileUrl?: string
  pages?: number
  gradeLevels: number[]
}

export type QuestionType = 'mcq' | 'fill'

export interface Question {
  id: string
  type: QuestionType
  prompt: string
  options?: string[]
  /** canonical answer text; for mcq, the exact option string */
  answer: string
  /** accepted alternates for fill-in-the-blank */
  accept?: string[]
  explanation: string
  points: number
}

export interface Quiz {
  id: string
  classId: string
  subjectId: string
  title: string
  instructions: string
  published: boolean
  openAt?: string
  dueAt?: string
  showResults: 'immediately' | 'after_due' | 'manual'
  showAnswers: boolean
  resultsReleased?: boolean
  attemptsAllowed: number
  timeLimitMin: number
  questions: Question[]
  createdBy: string
  createdAt: string
  language: Lang
}

export interface Attempt {
  id: string
  quizId: string
  studentId: string
  answers: Record<string, string>
  score: number
  maxScore: number
  autoGraded: boolean
  submittedAt: string
  syncedFromOffline?: boolean
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export interface AttendanceEntry {
  studentId: string
  status: AttendanceStatus
  note?: string
}

export interface AttendanceDay {
  id: string
  classId: string
  subjectId?: string
  date: string
  period: string
  entries: AttendanceEntry[]
  markedBy: string
  updatedAt: string
}

export type AssessmentType = 'unit-test' | 'exam' | 'assignment' | 'project'

export interface Assessment {
  id: string
  classId: string
  subjectId: string
  title: string
  type: AssessmentType
  date: string
  maxMarks: number
  published: boolean
  graded: boolean
  createdBy: string
  createdAt: string
}

export interface Mark {
  id: string
  assessmentId: string
  studentId: string
  marks: number
  grade: string
  remarks?: string
  updatedBy: string
  updatedAt: string
}

export interface DoubtReply {
  id: string
  authorId: string
  authorRole: Role | 'assistant'
  body: string
  aiGenerated?: boolean
  createdAt: string
}

export interface Doubt {
  id: string
  studentId: string
  classId: string
  subjectId: string
  topic: string
  question: string
  attachmentName?: string
  status: 'open' | 'resolved'
  createdAt: string
  resolvedAt?: string
  replies: DoubtReply[]
}

export interface Announcement {
  id: string
  classId?: string
  schoolId: string
  title: string
  body: string
  authorId: string
  audience: 'students' | 'parents' | 'all'
  createdAt: string
  pinned?: boolean
}

export type NotificationKind =
  | 'class'
  | 'quiz'
  | 'attendance'
  | 'marks'
  | 'doubt'
  | 'announcement'
  | 'link'
  | 'system'

export interface AppNotification {
  id: string
  userId: string
  kind: NotificationKind
  title: string
  body: string
  link?: string
  read: boolean
  createdAt: string
}

export interface Scholarship {
  id: string
  name: string
  provider: string
  description: string
  eligibility: string
  gradeLevels: number[]
  deadline: string
  documents: string[]
  link: string
  lastVerified: string
  verified: boolean
  sample: boolean
  status: 'open' | 'expired'
  createdBy: string
}

export type LabKind =
  | 'fractions'
  | 'circuit'
  | 'pendulum'
  | 'ph-scale'
  | 'solar'
  | 'typing'
  | 'place-value'

export interface Lab {
  id: string
  title: string
  subjectId: string
  gradeLevels: number[]
  objective: string
  instructions: string[]
  kind: LabKind | 'planned'
  plannedFor?: string
  dataMB: number
  lowerDataAlternative: string
  check: Question[]
  languages: Lang[]
}

export interface LabRun {
  id: string
  labId: string
  studentId: string
  score: number
  maxScore: number
  completedAt: string
}

export type FeedbackCategory = 'learning-content' | 'technical' | 'suggestion' | 'general'

export interface FeedbackItem {
  id: string
  userId: string
  role: Role
  category: FeedbackCategory
  subject: string
  message: string
  status: 'new' | 'reviewing' | 'resolved'
  createdAt: string
  adminReply?: string
  updatedAt?: string
}

export interface Download {
  id: string
  userId: string
  kind: 'resource' | 'recording'
  refId: string
  title: string
  sizeKB: number
  offlineReadable: boolean
  addedAt: string
}

export interface ParentLink {
  id: string
  parentId: string
  studentId: string
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: string
  respondedAt?: string
  method: 'invitation' | 'code' | 'approval'
  note?: string
}

export interface BadgeDef {
  key: string
  icon: string
  tone: 'brand' | 'leaf' | 'saffron' | 'clay'
  points: number
}

export interface UserBadge {
  id: string
  userId: string
  badgeKey: string
  awardedAt: string
}

export interface ActivityEvent {
  id: string
  studentId: string
  classId: string
  points: number
  reason: string
  at: string
}

export interface Bookmark {
  id: string
  userId: string
  resourceId: string
  addedAt: string
}

export type OutboxKind = 'quiz-attempt' | 'doubt' | 'feedback'

export interface OutboxItem {
  id: string
  kind: OutboxKind
  payload: Record<string, unknown>
  createdAt: string
}

export interface AuditEntry {
  id: string
  actorId: string
  actorName: string
  actorRole: Role
  action: string
  detail?: string
  at: string
}

export interface PlatformConfig {
  platformName: string
  supportEmail: string
  lowAttendanceThreshold: number
  allowSelfSignup: boolean
  leaderboardDefault: boolean
  scholarListingNotice: string
}

export interface DB {
  version: number
  seededAt: string
  schools: School[]
  users: User[]
  classes: ClassRoom[]
  enrollments: Enrollment[]
  sessions: ClassSession[]
  recordings: Recording[]
  resources: Resource[]
  quizzes: Quiz[]
  attempts: Attempt[]
  attendance: AttendanceDay[]
  assessments: Assessment[]
  marks: Mark[]
  doubts: Doubt[]
  announcements: Announcement[]
  notifications: AppNotification[]
  scholarships: Scholarship[]
  labs: Lab[]
  labRuns: LabRun[]
  feedback: FeedbackItem[]
  downloads: Download[]
  parentLinks: ParentLink[]
  userBadges: UserBadge[]
  leaderboardOptOut: string[]
  bookmarks: Bookmark[]
  outbox: OutboxItem[]
  activity: ActivityEvent[]
  audit: AuditEntry[]
  config: PlatformConfig
}

export interface Toast {
  id: string
  tone: 'success' | 'error' | 'info' | 'warn'
  title: string
  description?: string
}
