import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { AppNotification, ClassSession, Quiz, Recording, Resource, User, UserBadge } from '../lib/types'
import { useApp } from '../lib/store'
import { useI18n, CONTENT_LANG_LABEL } from '../lib/i18n'
import { subjectById, RESOURCE_TYPE_LABEL } from '../lib/subjects'
import { cn, formatDate, formatSize, formatTime } from '../lib/utils'
import { Icon } from './Icon'
import { Avatar, Badge, Card, EmptyState, ProgressBar } from './ui'
import { BADGES } from '@vidyagram/shared/seed'

/**
 * States plainly where the visible data comes from. The UI must never imply a
 * server save when the data actually lives on this device.
 */
export function DataModeNotice({ className }: { className?: string }) {
  const { dataMode, apiEnabled, server } = useApp()

  if (dataMode === 'server') {
    return (
      <p
        className={cn(
          'flex items-start gap-2 rounded-lg border border-leaf-200 bg-leaf-50 px-2.5 py-2 text-[11px] leading-relaxed text-leaf-900',
          className,
        )}
      >
        <Icon name="cloud" size={14} className="mt-0.5 shrink-0" />
        <span>
          <span className="font-semibold">School server</span>
          {` · sign-in and quiz results are saved on the server (v${server?.version ?? '0.2.0'}). Other edits in this preview stay on this device.`}
        </span>
      </p>
    )
  }

  if (apiEnabled) {
    return (
      <p
        className={cn(
          'flex items-start gap-2 rounded-lg border border-saffron-200 bg-saffron-50 px-2.5 py-2 text-[11px] leading-relaxed text-saffron-900',
          className,
        )}
      >
        <Icon name="wifiOff" size={14} className="mt-0.5 shrink-0" />
        <span>
          <span className="font-semibold">Sample data on this device</span>
          {' · the school server could not be reached, so sign-in uses the built-in demo accounts. Nothing is saved to a server.'}
        </span>
      </p>
    )
  }

  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-lg border border-ink-200 bg-ink-50 px-2.5 py-2 text-[11px] leading-relaxed text-ink-600',
        className,
      )}
    >
      <Icon name="info" size={14} className="mt-0.5 shrink-0" />
      <span>
        <span className="font-semibold">Demo mode</span>
        {' · everything stays in this browser. No data is sent to a server.'}
      </span>
    </p>
  )
}

export function SubjectChip({ subjectId, className }: { subjectId: string; className?: string }) {
  const { t } = useI18n()
  const subject = subjectById(subjectId)
  if (!subject) return null
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold', subject.soft, className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {t(subject.nameKey)}
    </span>
  )
}

export function LanguageTags({ languages }: { languages: string[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {languages.map((l) => (
        <span key={l} className="rounded border border-ink-200 bg-ink-50 px-1.5 py-0.5 text-[10px] font-medium text-ink-600">
          {CONTENT_LANG_LABEL[l as keyof typeof CONTENT_LANG_LABEL] || l}
        </span>
      ))}
    </span>
  )
}

export function ResourceTypeBadge({ type }: { type: Resource['type'] }) {
  const { t } = useI18n()
  return <Badge tone="neutral" icon="file">{t(RESOURCE_TYPE_LABEL[type])}</Badge>
}

export function SessionStatusBadge({ status }: { status: ClassSession['status'] }) {
  const { t } = useI18n()
  if (status === 'completed') return <Badge tone="leaf" icon="checkCircle">{t('common.completed')}</Badge>
  if (status === 'cancelled') return <Badge tone="clay" icon="xCircle">{t('live.cancelled')}</Badge>
  if (status === 'live') return <Badge tone="clay" icon="zap">{t('live.inProgress')}</Badge>
  return <Badge tone="brand" icon="clock">{t('common.upcoming')}</Badge>
}

export function SessionCard({
  session,
  classLabel,
  compact,
  action,
}: {
  session: ClassSession
  classLabel?: string
  compact?: boolean
  action?: ReactNode
}) {
  const { db } = useApp()
  const { t, lang } = useI18n()
  const teacher = db.users.find((u) => u.id === session.teacherId)
  const subject = subjectById(session.subjectId)

  return (
    <article className={cn('rounded-xl border border-ink-200 bg-white p-3.5', compact ? 'shadow-none' : 'shadow-sm')}>
      <div className="flex items-start gap-3">
        <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white', subject?.color || 'bg-brand-600')}>
          <Icon name="video" size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <SessionStatusBadge status={session.status} />
            {session.demoRoom ? <Badge tone="saffron" icon="info">{t('live.demoRoom')}</Badge> : null}
            {classLabel ? <span className="text-[11px] font-medium text-ink-400">· {classLabel}</span> : null}
          </div>
          <h3 className="mt-1.5 text-sm font-bold leading-snug text-ink-900">{session.title}</h3>
          <p className="mt-0.5 text-xs text-ink-500">
            {t(subject?.nameKey || 'common.subject')} · {teacher?.name}
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-ink-700">
            <span className="flex items-center gap-1">
              <Icon name="calendar" size={13} className="text-ink-400" />
              {formatDate(session.date, lang, 'weekday')}
            </span>
            <span className="flex items-center gap-1">
              <Icon name="clock" size={13} className="text-ink-400" />
              {formatTime(session.startTime, lang)} · {session.durationMin} {t('common.minutes')}
            </span>
            {session.resourceIds.length ? (
              <span className="flex items-center gap-1">
                <Icon name="book" size={13} className="text-ink-400" />
                {t('live.materialsAttached', { count: session.resourceIds.length })}
              </span>
            ) : null}
          </p>
        </div>
        {action ? <div className="shrink-0 self-center">{action}</div> : null}
      </div>
    </article>
  )
}

export function RecordingAvailability({ recording, compact }: { recording: Recording; compact?: boolean }) {
  const { t } = useI18n()
  const playable = !!recording.mediaUrl && recording.status === 'ready'
  if (playable) return <Badge tone="leaf" icon="play">{t('rec.ready')}</Badge>
  if (recording.status === 'processing') return <Badge tone="saffron" icon="clock">{t('rec.processing')}</Badge>
  return <Badge tone="neutral" icon="info">{t('rec.playUnavailable')}</Badge>
}

export function RecordingCard({ recording, action }: { recording: Recording; action?: ReactNode }) {
  const { db } = useApp()
  const { t, lang } = useI18n()
  const cls = db.classes.find((c) => c.id === recording.classId)
  const teacher = db.users.find((u) => u.id === recording.teacherId)
  const subject = subjectById(recording.subjectId)
  const playable = !!recording.mediaUrl && recording.status === 'ready'

  return (
    <article className="rounded-xl border border-ink-200 bg-white p-3.5">
      <div className="flex items-start gap-3">
        <span className="relative grid h-14 w-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-800 text-white">
          <Icon name={playable ? 'play' : 'video'} size={20} className={playable ? '' : 'opacity-50'} />
          <span className="absolute bottom-0.5 right-1 rounded bg-black/50 px-1 text-[9px] font-semibold">{recording.durationMin}m</span>
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-ink-900">{recording.title}</h3>
          <p className="mt-0.5 text-xs text-ink-500">
            {t(subject?.nameKey || 'common.subject')} · {teacher?.name} · {formatDate(recording.date, lang)}
          </p>
          <p className="text-[11px] text-ink-400">{cls?.name} · {recording.chapter}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <RecordingAvailability recording={recording} />
            {recording.downloadEnabled ? <Badge tone="brand" icon="download">{t('rec.downloadsOn')}</Badge> : null}
            {!recording.downloadEnabled ? <span className="text-[10px] text-ink-400">{t('rec.downloadsOff')}</span> : null}
            <span className="text-[10px] text-ink-400">{formatSize(recording.sizeMB * 1024)}</span>
          </div>
        </div>
        {action ? <div className="shrink-0 self-center">{action}</div> : null}
      </div>
    </article>
  )
}

export function QuizRow({ quiz, action, status }: { quiz: Quiz; action?: ReactNode; status?: string }) {
  const { db } = useApp()
  const { t, lang } = useI18n()
  const teacher = db.users.find((u) => u.id === quiz.createdBy)
  const subject = subjectById(quiz.subjectId)
  const total = quiz.questions.reduce((s, q) => s + q.points, 0)

  return (
    <article className="rounded-xl border border-ink-200 bg-white p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {status ? <Badge tone="brand" icon="clipboard">{status}</Badge> : null}
            <SubjectChip subjectId={quiz.subjectId} />
            {!quiz.published ? <Badge tone="neutral" icon="edit">{t('common.draft')}</Badge> : null}
          </div>
          <h3 className="mt-1.5 text-sm font-bold text-ink-900">{quiz.title}</h3>
          <p className="mt-0.5 text-xs text-ink-500">
            {teacher?.name} · {t('quiz.questions', { count: quiz.questions.length })} · {t('quiz.totalPoints', { points: total })}
          </p>
          <p className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-ink-500">
            {quiz.dueAt ? <span>{t('common.due')}: {formatDate(quiz.dueAt, lang)}</span> : null}
            <span>{t('quiz.timeLimit', { min: quiz.timeLimitMin })}</span>
            <span>{t('quiz.attemptsAllowed')}: {quiz.attemptsAllowed}</span>
          </p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </article>
  )
}

export function QuizResultBadge({ score, max, visible }: { score: number; max: number; visible: boolean }) {
  const { t } = useI18n()
  if (!visible) return <Badge tone="neutral" icon="lock">{t('marks.notPublished')}</Badge>
  const pct = max > 0 ? (score / max) * 100 : 0
  return (
    <Badge tone={pct >= 80 ? 'leaf' : pct >= 50 ? 'brand' : 'saffron'} icon="star">
      {t('quiz.yourScore', { score, max })}
    </Badge>
  )
}

export function AnnouncementItem({ announcement, compact }: { announcement: import('../lib/types').Announcement; compact?: boolean }) {
  const { db } = useApp()
  const { t, lang } = useI18n()
  const author = db.users.find((u) => u.id === announcement.authorId)
  return (
    <article className={cn('rounded-xl border border-ink-200 bg-white p-3.5', compact && 'border-0 p-0 shadow-none')}>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-saffron-50 text-saffron-700">
          <Icon name="bell" size={15} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-sm font-bold text-ink-900">{announcement.title}</h3>
            {announcement.pinned ? <Badge tone="saffron" icon="star">Pinned</Badge> : null}
          </div>
          <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-ink-600">{announcement.body}</p>
          <p className="mt-1.5 text-[10px] text-ink-400">
            {author?.name} · {formatDate(announcement.createdAt.slice(0, 10), lang)}
          </p>
        </div>
      </div>
    </article>
  )
}

export function BadgeShelf({ userId, size = 'md' }: { userId: string; size?: 'sm' | 'md' }) {
  const { db } = useApp()
  const { t } = useI18n()
  const earned = db.userBadges.filter((b) => b.userId === userId)
  const defs = BADGES.filter((b) => earned.some((e) => e.badgeKey === b.key))
  if (!defs.length) {
    return <p className="text-xs text-ink-500">{t('common.noData')}</p>
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {defs.map((badge) => (
        <li
          key={badge.key}
          className={cn(
            'flex items-center gap-2 rounded-xl border px-2.5 py-1.5',
            size === 'sm' ? 'text-[10px]' : 'text-xs',
            badge.tone === 'leaf' && 'border-leaf-200 bg-leaf-50',
            badge.tone === 'brand' && 'border-brand-200 bg-brand-50',
            badge.tone === 'saffron' && 'border-saffron-200 bg-saffron-50',
            badge.tone === 'clay' && 'border-clay-200 bg-clay-50',
          )}
          title={t(`badge.${badge.key}Desc`)}
        >
          <span aria-hidden="true" className="text-base leading-none">{badge.icon}</span>
          <span className="font-semibold text-ink-800">{t(`badge.${badge.key}`)}</span>
        </li>
      ))}
    </ul>
  )
}

export function AllBadges({ userId }: { userId: string }) {
  const { db } = useApp()
  const { t } = useI18n()
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {BADGES.map((badge) => {
        const earned: UserBadge | undefined = db.userBadges.find((b) => b.userId === userId && b.badgeKey === badge.key)
        return (
          <li
            key={badge.key}
            className={cn(
              'rounded-xl border p-2.5',
              earned ? 'border-leaf-200 bg-leaf-50' : 'border-ink-200 bg-ink-50 opacity-70',
            )}
          >
            <div className="flex items-center gap-1.5">
              <span className={cn('text-lg leading-none', !earned && 'grayscale')} aria-hidden="true">{badge.icon}</span>
              <span className="text-[11px] font-bold text-ink-900">{t(`badge.${badge.key}`)}</span>
              {earned ? <Icon name="checkCircle" size={12} className="ml-auto text-leaf-600" /> : <Icon name="lock" size={11} className="ml-auto text-ink-400" />}
            </div>
            <p className="mt-1 text-[10px] leading-snug text-ink-500">{t(`badge.${badge.key}Desc`)}</p>
            {earned ? <p className="mt-1 text-[9px] font-medium text-leaf-700">{formatDate(earned.awardedAt.slice(0, 10))}</p> : null}
          </li>
        )
      })}
    </ul>
  )
}

export function Leaderboard({
  classId,
  currentUserId,
  limit = 8,
  showRules = true,
}: {
  classId?: string
  currentUserId?: string
  limit?: number
  showRules?: boolean
}) {
  const { db, currentUser } = useApp()
  const { t } = useI18n()
  const cls = classId ? db.classes.find((c) => c.id === classId) : currentUser ? db.classes.find((c) => c.teacherId === currentUser.id) : undefined
  if (!cls) return <EmptyState icon="award" title={t('lb.title')} description={t('classes.noClasses')} />
  if (!cls.leaderboardEnabled) {
    return (
      <div className="rounded-xl border border-ink-200 bg-ink-50 p-3 text-xs text-ink-600">
        <p className="flex items-center gap-1.5 font-semibold"><Icon name="lock" size={14} /> {t('lb.disabled')}</p>
      </div>
    )
  }

  const rows = [...db.activity]
    .filter((a) => a.classId === cls.id)
    .reduce<Record<string, number>>((acc, a) => {
      acc[a.studentId] = (acc[a.studentId] || 0) + a.points
      return acc
    }, {})
  const students = db.enrollments
    .filter((e) => e.classId === cls.id && e.status === 'active')
    .map((e) => db.users.find((u) => u.id === e.studentId))
    .filter((u): u is User => !!u && !db.leaderboardOptOut.includes(u.id))
    .map((u) => ({ id: u.id, name: u.name.split(' ')[0], color: u.avatarColor, points: rows[u.id] || 0 }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))

  if (!students.length) return <EmptyState icon="award" title={t('lb.noActivity')} />
  const top = students.slice(0, limit)
  const meIndex = students.findIndex((s) => s.id === currentUserId)

  return (
    <div>
      <ol className="space-y-1">
        {top.map((s, i) => (
          <li
            key={s.id}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-2 py-1.5',
              s.id === currentUserId ? 'bg-brand-50 ring-1 ring-brand-200' : i === 0 ? 'bg-saffron-50/60' : '',
            )}
          >
            <span className={cn('w-5 text-center text-xs font-bold tabular-nums', i === 0 ? 'text-saffron-700' : 'text-ink-400')}>
              {i === 0 ? '🏅' : i + 1}
            </span>
            <Avatar name={s.name} color={s.color} size="sm" />
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink-800">
              {s.name} {s.id === currentUserId ? <span className="text-[10px] font-normal text-brand-700">({t('lb.you')})</span> : null}
            </span>
            <span className="text-[11px] font-bold tabular-nums text-ink-700">{s.points} {t('unit.points')}</span>
          </li>
        ))}
      </ol>
      {meIndex >= limit ? (
        <p className="mt-2 rounded-lg bg-ink-50 px-2 py-1.5 text-[11px] text-ink-600">
          {t('lb.rank')} #{meIndex + 1} · {students[meIndex].points} {t('unit.points')}
        </p>
      ) : null}
      {showRules ? (
        <details className="mt-2 rounded-lg border border-ink-200 bg-ink-50/60 px-2.5 py-2">
          <summary className="cursor-pointer text-[11px] font-semibold text-ink-700">{t('lb.rules')}</summary>
          <ul className="mt-1.5 space-y-1 text-[10px] leading-relaxed text-ink-600">
            <li>• {t('lb.ruleQuiz')}</li>
            <li>• {t('lb.ruleAttend')}</li>
            <li>• {t('lb.ruleLab')}</li>
            <li>• {t('lb.ruleDoubt')}</li>
            <li className="pt-1 font-medium text-ink-500">{t('lb.ruleNote')}</li>
          </ul>
        </details>
      ) : null}
      <p className="mt-1.5 text-[10px] leading-relaxed text-ink-400">{t('lb.privateNote')}</p>
    </div>
  )
}

export function AttendanceSnapshot({ summary, label }: { summary: { pct: number; present: number; absent: number; late: number; total: number }; label?: string }) {
  const { t } = useI18n()
  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-2xl font-bold tabular-nums text-ink-900">{summary.pct}%</p>
          <p className="text-[11px] text-ink-500">{label || t('att.overall')} · {summary.total} {t('unit.days')}</p>
        </div>
        <Badge tone={summary.pct >= 75 ? 'leaf' : summary.pct >= 60 ? 'saffron' : 'clay'}>
          {summary.pct >= 75 ? t('att.good') : t('att.atRisk')}
        </Badge>
      </div>
      <ProgressBar value={summary.pct} tone={summary.pct >= 75 ? 'leaf' : summary.pct >= 60 ? 'saffron' : 'clay'} showValue={false} size="sm" />
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-500">
        <span><strong className="text-leaf-700">{summary.present}</strong> {t('att.present')}</span>
        <span><strong className="text-clay-700">{summary.absent}</strong> {t('att.absent')}</span>
        <span><strong className="text-saffron-700">{summary.late}</strong> {t('att.late')}</span>
      </div>
    </div>
  )
}

export function NotificationsPreview({ items }: { items: AppNotification[] }) {
  const { t, lang } = useI18n()
  if (!items.length) return <p className="text-xs text-ink-500">{t('notif.empty')}</p>
  return (
    <ul className="divide-y divide-ink-100">
      {items.slice(0, 4).map((n) => (
        <li key={n.id} className="py-2 first:pt-0 last:pb-0">
          <Link to={n.link || '/notifications'} className="group flex items-start gap-2">
            <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-ink-200' : 'bg-brand-500')} aria-hidden="true" />
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-ink-800 group-hover:text-brand-700">{n.title}</span>
              <span className="mt-0.5 block text-[10px] text-ink-400">{lang === 'en' ? '' : ''}{new Date(n.createdAt).toLocaleDateString()}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function ClassSummaryCard({ cls, children }: { cls: import('../lib/types').ClassRoom; children?: ReactNode }) {
  const { db } = useApp()
  const { t } = useI18n()
  const teacher = db.users.find((u) => u.id === cls.teacherId)
  const students = db.enrollments.filter((e) => e.classId === cls.id && e.status === 'active').length
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-ink-900">{cls.name}</h3>
          <p className="mt-0.5 text-xs text-ink-500">{teacher?.name} · {t('classes.members', { count: students })}</p>
        </div>
        {cls.leaderboardEnabled ? <Badge tone="leaf" icon="award">{t('dash.leaderboard')}</Badge> : <Badge tone="neutral" icon="lock">{t('lb.rank')}</Badge>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {cls.subjectIds.slice(0, 4).map((s) => <SubjectChip key={s} subjectId={s} />)}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </Card>
  )
}

export function PendingList({ title, items, empty }: { title: string; items: Array<{ label: string; hint?: string; to: string }>; empty?: string }) {
  const { t } = useI18n()
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">{title}</h3>
      {items.length ? (
        <ul className="mt-2 space-y-1.5">
          {items.map((item) => (
            <li key={item.label + item.to}>
              <Link to={item.to} className="flex items-center justify-between gap-2 rounded-lg border border-ink-200 px-2.5 py-2 text-xs hover:bg-ink-50">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink-800">{item.label}</span>
                  {item.hint ? <span className="block text-[10px] text-ink-500">{item.hint}</span> : null}
                </span>
                <Icon name="chevronRight" size={14} className="shrink-0 text-ink-400" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 rounded-lg bg-ink-50 px-2.5 py-2 text-[11px] text-ink-500">{empty || t('dash.allCaughtUp')}</p>
      )}
    </div>
  )
}
