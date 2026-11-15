import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Attempt, DB, NotificationKind, OutboxItem, Role, Toast, User } from './types'
import { buildSeed, DB_VERSION, SEED_STORAGE_KEY } from './seed'
import { hashPassword, makeSalt, uid, normaliseCode, isOnline as readOnline } from './utils'
import { userById } from './access'
import { gradeQuiz } from './quiz'

const SESSION_KEY = 'vidyagram.session'

export interface SignupInput {
  role: Role
  name: string
  email: string
  phone?: string
  password: string
  language: User['language']
  schoolId: string
  gradeLevel?: number
  section?: string
  subjectIds?: string[]
  classCode?: string
  consentGiven: boolean
  relationship?: string
}

interface AppContextValue {
  db: DB
  ready: boolean
  currentUser: User | null
  online: boolean
  toasts: Toast[]
  pendingSync: number
  login: (identifier: string, password: string) => Promise<{ ok: boolean; error?: string }>
  signup: (input: SignupInput) => Promise<{ ok: boolean; error?: string; user?: User }>
  logout: () => void
  updateUser: (userId: string, patch: Partial<User>) => void
  mutate: (fn: (db: DB) => void) => void
  notify: (userId: string, kind: NotificationKind, title: string, body: string, link?: string) => void
  awardPoints: (studentId: string, classId: string, points: number, reason: string) => void
  awardBadge: (userId: string, badgeKey: string) => void
  queueOffline: (kind: OutboxItem['kind'], payload: Record<string, unknown>) => void
  syncOutbox: () => Promise<void>
  resetDemo: () => Promise<void>
  toast: (tone: Toast['tone'], title: string, description?: string) => void
  dismissToast: (id: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(SESSION_KEY)
    } catch {
      return null
    }
  })
  const [online, setOnline] = useState<boolean>(readOnline)
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((tone: Toast['tone'], title: string, description?: string) => {
    const id = uid('toast')
    setToasts((prev) => [...prev.slice(-3), { id, tone, title, description }])
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5200)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Boot: restore persisted data or build the sample dataset.
  useEffect(() => {
    let cancelled = false
    const boot = async () => {
      let loaded: DB | null = null
      try {
        const raw = localStorage.getItem(SEED_STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as DB
          if (parsed.version === DB_VERSION) loaded = parsed
        }
      } catch {
        loaded = null
      }
      if (!loaded) loaded = await buildSeed()
      if (cancelled) return
      setDb(loaded)
      try {
        localStorage.setItem(SEED_STORAGE_KEY, JSON.stringify(loaded))
      } catch {
        /* storage full or blocked */
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [])

  // Persist on every change.
  useEffect(() => {
    if (!db) return
    try {
      localStorage.setItem(SEED_STORAGE_KEY, JSON.stringify(db))
    } catch {
      toast('error', 'Storage is full', 'Remove a download to free space on this device.')
    }
  }, [db, toast])

  useEffect(() => {
    try {
      if (sessionId) localStorage.setItem(SESSION_KEY, sessionId)
      else localStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
  }, [sessionId])

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const currentUser = useMemo(() => (db && sessionId ? userById(db, sessionId) ?? null : null), [db, sessionId])

  const mutate = useCallback((fn: (draft: DB) => void) => {
    setDb((prev) => {
      if (!prev) return prev
      const draft: DB = typeof structuredClone === 'function' ? structuredClone(prev) : JSON.parse(JSON.stringify(prev))
      fn(draft)
      return draft
    })
  }, [])

  const notify = useCallback(
    (userId: string, kind: NotificationKind, title: string, body: string, link?: string) => {
      mutate((draft) => {
        draft.notifications.unshift({
          id: uid('notif'),
          userId,
          kind,
          title,
          body,
          link,
          read: false,
          createdAt: new Date().toISOString(),
        })
      })
    },
    [mutate],
  )

  const awardPoints = useCallback(
    (studentId: string, classId: string, points: number, reason: string) => {
      mutate((draft) => {
        draft.activity.push({
          id: uid('act'),
          studentId,
          classId,
          points,
          reason,
          at: new Date().toISOString(),
        })
      })
    },
    [mutate],
  )

  const awardBadge = useCallback(
    (userId: string, badgeKey: string) => {
      mutate((draft) => {
        if (draft.userBadges.some((b) => b.userId === userId && b.badgeKey === badgeKey)) return
        draft.userBadges.push({ id: uid('ub'), userId, badgeKey, awardedAt: new Date().toISOString() })
        draft.notifications.unshift({
          id: uid('notif'),
          userId,
          kind: 'system',
          title: 'New badge earned',
          body: 'Open your profile to see your latest achievement.',
          link: '/profile',
          read: false,
          createdAt: new Date().toISOString(),
        })
      })
    },
    [mutate],
  )

  const login = useCallback(
    async (identifier: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      if (!db) return { ok: false, error: 'auth.invalid' }
      const key = identifier.trim().toLowerCase()
      const phoneKey = identifier.replace(/\D/g, '')
      const user = db.users.find(
        (u) => u.email.toLowerCase() === key || (!!phoneKey && (u.phone || '').replace(/\D/g, '') === phoneKey),
      )
      if (!user) return { ok: false, error: 'auth.invalid' }
      if (user.disabled) return { ok: false, error: 'auth.disabled' }
      const hash = await hashPassword(password, user.salt)
      if (hash !== user.passwordHash) return { ok: false, error: 'auth.invalid' }
      setSessionId(user.id)
      return { ok: true }
    },
    [db],
  )

  const signup = useCallback(
    async (input: SignupInput): Promise<{ ok: boolean; error?: string; user?: User }> => {
      if (!db) return { ok: false, error: 'auth.invalid' }
      const emailKey = input.email.trim().toLowerCase()
      if (db.users.some((u) => u.email.toLowerCase() === emailKey)) return { ok: false, error: 'auth.exists' }
      if (input.role === 'student' && input.classCode?.trim()) {
        const cls = db.classes.find((c) => normaliseCode(c.code) === normaliseCode(input.classCode || ''))
        if (!cls) return { ok: false, error: 'auth.classCodeInvalid' }
      }
      const salt = makeSalt()
      const passwordHash = await hashPassword(input.password, salt)
      const newUser: User = {
        id: uid('usr'),
        role: input.role,
        name: input.name.trim(),
        email: emailKey,
        phone: input.phone?.trim() || undefined,
        passwordHash,
        salt,
        language: input.language,
        avatarColor: 'bg-brand-100 text-brand-800',
        schoolId: input.schoolId,
        createdAt: new Date().toISOString(),
        lowDataMode: false,
        consentGiven: input.consentGiven,
        consentAt: input.consentGiven ? new Date().toISOString() : undefined,
      }
      mutate((draft) => {
        if (input.role === 'student') {
          newUser.gradeLevel = input.gradeLevel
          newUser.section = input.section
          newUser.rollNo = String(draft.users.filter((u) => u.role === 'student' && u.gradeLevel === input.gradeLevel).length + 1).padStart(2, '0')
          newUser.inviteCode = `${input.name.split(' ')[0].toUpperCase()}-${Math.floor(1000 + Math.random() * 8999)}`
        }
        if (input.role === 'teacher') newUser.subjectIds = input.subjectIds || []
        if (input.role === 'parent') newUser.relationship = input.relationship || 'Guardian'
        draft.users.push(newUser)

        if (input.role === 'student' && input.classCode) {
          const cls = draft.classes.find((c) => normaliseCode(c.code) === normaliseCode(input.classCode || ''))
          if (!cls) return
          draft.enrollments.push({
            id: uid('enr'),
            classId: cls.id,
            studentId: newUser.id,
            joinedAt: new Date().toISOString(),
            status: 'active',
          })
          draft.notifications.unshift({
            id: uid('notif'),
            userId: newUser.id,
            kind: 'class',
            title: `Welcome to ${cls.name}`,
            body: 'Your class materials and live sessions will appear on your dashboard.',
            link: '/classes',
            read: false,
            createdAt: new Date().toISOString(),
          })
        }
      })
      setSessionId(newUser.id)
      return { ok: true, user: newUser }
    },
    [db, mutate],
  )

  const logout = useCallback(() => setSessionId(null), [])

  const updateUser = useCallback(
    (userId: string, patch: Partial<User>) => {
      mutate((draft) => {
        const u = draft.users.find((x) => x.id === userId)
        if (u) Object.assign(u, patch)
      })
    },
    [mutate],
  )

  const queueOffline = useCallback(
    (kind: OutboxItem['kind'], payload: Record<string, unknown>) => {
      mutate((draft) => {
        draft.outbox.push({ id: uid('out'), kind, payload, createdAt: new Date().toISOString() })
      })
    },
    [mutate],
  )

  const grantOfflineAchievements = useCallback(
    (draft: DB, studentId: string, classId?: string) => {
      const downloads = draft.downloads.filter((d) => d.userId === studentId)
      if (downloads.length >= 2 && !draft.userBadges.some((b) => b.userId === studentId && b.badgeKey === 'offlineLearner')) {
        draft.userBadges.push({ id: uid('ub'), userId: studentId, badgeKey: 'offlineLearner', awardedAt: new Date().toISOString() })
      }
      const bookmarks = draft.bookmarks.filter((b) => b.userId === studentId)
      if (bookmarks.length >= 3 && !draft.userBadges.some((b) => b.userId === studentId && b.badgeKey === 'bookworm')) {
        draft.userBadges.push({ id: uid('ub'), userId: studentId, badgeKey: 'bookworm', awardedAt: new Date().toISOString() })
      }
      if (classId) {
        const attempts = draft.attempts.filter((a) => a.studentId === studentId && a.quizId && draft.quizzes.find((q) => q.id === a.quizId)?.classId === classId)
        if (attempts.length >= 1 && !draft.userBadges.some((b) => b.userId === studentId && b.badgeKey === 'firstSteps')) {
          draft.userBadges.push({ id: uid('ub'), userId: studentId, badgeKey: 'firstSteps', awardedAt: new Date().toISOString() })
        }
        const strong = attempts.some((a) => a.maxScore > 0 && a.score / a.maxScore >= 0.8)
        if (strong && !draft.userBadges.some((b) => b.userId === studentId && b.badgeKey === 'quizStarter')) {
          draft.userBadges.push({ id: uid('ub'), userId: studentId, badgeKey: 'quizStarter', awardedAt: new Date().toISOString() })
        }
      }
    },
    [],
  )

  const syncOutbox = useCallback(async () => {
    if (!db || db.outbox.length === 0) return
    if (!readOnline()) {
      toast('info', 'Still offline', 'Your saved changes will sync when the connection returns.')
      return
    }
    const items = [...db.outbox]
    mutate((draft) => {
      for (const item of items) {
        if (item.kind === 'quiz-attempt') {
          const payload = item.payload as { quizId: string; studentId: string; answers: Record<string, string> }
          const quiz = draft.quizzes.find((q) => q.id === payload.quizId)
          if (!quiz) continue
          const graded = gradeQuiz(quiz, payload.answers)
          const attempt: Attempt = {
            id: uid('att'),
            quizId: quiz.id,
            studentId: payload.studentId,
            answers: payload.answers,
            score: graded.score,
            maxScore: graded.maxScore,
            autoGraded: true,
            submittedAt: new Date().toISOString(),
            syncedFromOffline: true,
          }
          draft.attempts.push(attempt)
          draft.activity.push({
            id: uid('act'),
            studentId: payload.studentId,
            classId: quiz.classId,
            points: 10 + Math.round((graded.score / Math.max(1, graded.maxScore)) * 20),
            reason: 'quiz-attempt-offline',
            at: attempt.submittedAt,
          })
          grantOfflineAchievements(draft, payload.studentId, quiz.classId)
        }
        if (item.kind === 'doubt') {
          const p = item.payload as { studentId: string; classId: string; subjectId: string; topic: string; question: string; attachmentName?: string }
          draft.doubts.unshift({
            id: uid('doubt'),
            studentId: p.studentId,
            classId: p.classId,
            subjectId: p.subjectId,
            topic: p.topic,
            question: p.question,
            attachmentName: p.attachmentName,
            status: 'open',
            createdAt: new Date().toISOString(),
            replies: [],
          })
          const cls = draft.classes.find((c) => c.id === p.classId)
          if (cls) {
            draft.notifications.unshift({
              id: uid('notif'),
              userId: cls.teacherId,
              kind: 'doubt',
              title: 'New doubt (synced from offline)',
              body: p.topic,
              link: '/doubts',
              read: false,
              createdAt: new Date().toISOString(),
            })
          }
        }
        if (item.kind === 'feedback') {
          const p = item.payload as { userId: string; role: Role; category: string; subject: string; message: string }
          draft.feedback.unshift({
            id: uid('fb'),
            userId: p.userId,
            role: p.role,
            category: p.category as never,
            subject: p.subject,
            message: p.message,
            status: 'new',
            createdAt: new Date().toISOString(),
          })
          const admins = draft.users.filter((u) => u.role === 'admin')
          for (const admin of admins) {
            draft.notifications.unshift({
              id: uid('notif'),
              userId: admin.id,
              kind: 'system',
              title: 'New feedback (synced from offline)',
              body: p.subject,
              link: '/admin/feedback',
              read: false,
              createdAt: new Date().toISOString(),
            })
          }
        }
      }
      draft.outbox = draft.outbox.filter((o) => !items.some((i) => i.id === o.id))
    })
    toast('success', 'Offline changes synced', `${items.length} saved item(s) are now on the school record.`)
  }, [db, mutate, toast, grantOfflineAchievements])

  // Auto-sync when connectivity returns.
  const previousOnline = useRef(online)
  useEffect(() => {
    if (!previousOnline.current && online && db && db.outbox.length > 0) {
      void syncOutbox()
    }
    previousOnline.current = online
  }, [online, db, syncOutbox])

  const resetDemo = useCallback(async () => {
    const fresh = await buildSeed()
    setSessionId(null)
    setDb(fresh)
    try {
      localStorage.setItem(SEED_STORAGE_KEY, JSON.stringify(fresh))
    } catch {
      /* ignore */
    }
    toast('success', 'Demo data restored', 'Sample classes, marks and resources are back to their original state.')
  }, [toast])

  const value = useMemo<AppContextValue | null>(() => {
    if (!db) return null
    return {
      db,
      ready: true,
      currentUser,
      online,
      toasts,
      pendingSync: db.outbox.length,
      login,
      signup,
      logout,
      updateUser,
      mutate,
      notify,
      awardPoints,
      awardBadge,
      queueOffline,
      syncOutbox,
      resetDemo,
      toast,
      dismissToast,
    }
  }, [
    db,
    currentUser,
    online,
    toasts,
    login,
    signup,
    logout,
    updateUser,
    mutate,
    notify,
    awardPoints,
    awardBadge,
    queueOffline,
    syncOutbox,
    resetDemo,
    toast,
    dismissToast,
  ])

  if (!value) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-50 p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-black text-white">V</div>
          <div>
            <p className="text-lg font-bold text-ink-900">VidyaGram</p>
            <p className="text-sm text-ink-500">Preparing your learning space…</p>
          </div>
          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-ink-200" role="progressbar" aria-label="Loading">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-brand-500" />
          </div>
        </div>
      </div>
    )
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
