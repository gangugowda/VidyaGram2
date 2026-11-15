import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../lib/store'
import { useI18n } from '../../lib/i18n'
import {
  attendanceSummary,
  classById,
  guardianChildren,
  marksForStudent,
  quizResultsVisible,
  studentClassIds,
} from '../../lib/access'
import { formatDate, formatTime, percent, subjectLabel } from '../../lib/utils'
import { Icon } from '../../components/Icon'
import { AnnouncementItem, AttendanceSnapshot, NotificationsPreview, SubjectChip } from '../../components/shared'
import {
  Avatar,
  Badge,
  Button,
  Callout,
  Card,
  EmptyState,
  PageHeader,
  ProgressBar,
  SectionCard,
  StatCard,
  buttonClass,
} from '../../components/ui'

export function ParentDashboard() {
  const { db, currentUser, online } = useApp()
  const { t, lang } = useI18n()
  const children = currentUser ? guardianChildren(db, currentUser.id) : []
  const [childId, setChildId] = useState(children[0]?.id || '')

  useEffect(() => {
    if (!children.some((c) => c.id === childId)) setChildId(children[0]?.id || '')
  }, [children, childId])

  if (!currentUser) return null

  if (!children.length) {
    return (
      <div>
        <PageHeader title={t('dash.hello', { name: currentUser.name.split(' ')[0] })} subtitle={t('dash.parentSub')} icon="home" />
        <EmptyState
          icon="link"
          title={t('parent.noChild')}
          description={t('parent.noChildHint')}
          action={<Link to="/parent/link" className={buttonClass('primary')}>{t('parent.linkTitle')}</Link>}
        />
      </div>
    )
  }

  const child = children.find((c) => c.id === childId) || children[0]
  const classIds = studentClassIds(db, child.id)
  const classes = classIds.map((id) => classById(db, id)).filter(Boolean)
  const summary = attendanceSummary(db, child.id)
  const results = marksForStudent(db, child.id)
  const overall = results.length
    ? percent(
        results.reduce((s, r) => s + r.mark.marks, 0),
        results.reduce((s, r) => s + r.assessment.maxMarks, 0),
      )
    : 0

  const now = new Date()
  const upcoming = db.sessions
    .filter((s) => classIds.includes(s.classId) && s.status === 'scheduled' && s.date >= now.toISOString().slice(0, 10))
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
    .slice(0, 3)

  const attempts = db.attempts
    .filter((a) => a.studentId === child.id)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .slice(0, 4)

  const announcements = db.announcements
    .filter(
      (a) =>
        a.schoolId === currentUser.schoolId &&
        (a.audience === 'parents' || a.audience === 'all') &&
        (!a.classId || classIds.includes(a.classId)),
    )
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 2)

  const unread = db.notifications.filter((n) => n.userId === currentUser.id && !n.read)
  const threshold = db.schools.find((s) => s.id === child.schoolId)?.lowAttendanceThreshold ?? 75

  const subjectRows = Array.from(
    results.reduce<Map<string, { earned: number; max: number }>>((acc, r) => {
      const entry = acc.get(r.assessment.subjectId) || { earned: 0, max: 0 }
      entry.earned += r.mark.marks
      entry.max += r.assessment.maxMarks
      acc.set(r.assessment.subjectId, entry)
      return acc
    }, new Map()),
  ).map(([subjectId, v]) => ({ subjectId, pct: percent(v.earned, v.max) }))

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('dash.hello', { name: currentUser.name.split(' ')[0] })}
        subtitle={t('dash.parentSub')}
        eyebrow={child.name}
        icon="home"
        actions={<Link to="/parent/link" className={buttonClass('secondary', 'md')}><Icon name="link" size={17} /> {t('prof.linkedChildren')}</Link>}
      />

      {!online ? (
        <Callout tone="warn" title={t('state.offlineTitle')}>{t('state.offlineBody')}</Callout>
      ) : null}

      {children.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-200 bg-white p-2.5">
          <span className="px-1 text-xs font-semibold text-ink-500">{t('parent.chooseChild')}</span>
          {children.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setChildId(c.id)}
              aria-pressed={c.id === child.id}
              className={`flex min-h-10 items-center gap-2 rounded-lg border px-2.5 text-xs font-semibold ${
                c.id === child.id ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-ink-200 text-ink-700 hover:bg-ink-50'
              }`}
            >
              <Avatar name={c.name} color={c.avatarColor} size="sm" />
              {c.name.split(' ')[0]}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t('dash.childAttendance')} value={`${summary.pct}%`} hint={t('att.recordsCount', { count: summary.total })} icon="calendar" tone={summary.pct >= threshold ? 'leaf' : 'clay'} />
        <StatCard label={t('dash.overallProgress')} value={`${overall}%`} hint={t('marks.bySubject')} icon="chart" tone="brand" />
        <StatCard label={t('dash.upcomingClasses')} value={upcoming.length} hint={upcoming[0] ? formatDate(upcoming[0].date, lang) : t('dash.noUpcoming')} icon="video" tone="saffron" />
        <StatCard label={t('common.notifications')} value={unread.length} hint={t('notif.unread')} icon="bell" tone="ink" />
      </div>

      {summary.pct < threshold && summary.total > 0 ? (
        <Callout tone="danger" title={t('parent.alert')}>
          {t('att.alertBody', { name: child.name.split(' ')[0], pct: summary.pct, threshold })}
        </Callout>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard title={t('dash.childAttendance')} subtitle={`${child.name} · ${classes.map((c) => c?.name).filter(Boolean).join(', ')}`} icon="calendar" action={<Link to="/attendance" className="text-xs font-semibold text-brand-700 hover:underline">{t('common.viewAll')}</Link>}>
            <AttendanceSnapshot summary={summary} label={t('att.thisTerm')} />
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: t('att.present'), value: summary.present, tone: 'text-leaf-700' },
                { label: t('att.absent'), value: summary.absent, tone: 'text-clay-700' },
                { label: t('att.late'), value: summary.late, tone: 'text-saffron-700' },
                { label: t('att.excused'), value: summary.excused, tone: 'text-ink-600' },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-ink-50 p-2 text-center">
                  <p className={`text-lg font-bold tabular-nums ${s.tone}`}>{s.value}</p>
                  <p className="text-[10px] text-ink-500">{s.label}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title={t('dash.childProgress')} subtitle={t('marks.privacyNote')} icon="chart" action={<Link to="/marks" className="text-xs font-semibold text-brand-700 hover:underline">{t('common.viewAll')}</Link>}>
            {results.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink-200 text-[10px] uppercase tracking-wide text-ink-500">
                      <th className="py-2 pr-2 font-semibold">{t('common.subject')}</th>
                      <th className="py-2 pr-2 font-semibold">{t('marks.assessments')}</th>
                      <th className="py-2 pr-2 text-right font-semibold">{t('common.score')}</th>
                      <th className="py-2 text-right font-semibold">{t('marks.grade')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {results.slice(0, 5).map(({ mark, assessment }) => (
                      <tr key={mark.id}>
                        <td className="py-2 pr-2"><SubjectChip subjectId={assessment.subjectId} /></td>
                        <td className="py-2 pr-2">
                          <p className="text-xs font-semibold text-ink-800">{assessment.title}</p>
                          <p className="text-[10px] text-ink-500">{formatDate(assessment.date, lang)}</p>
                        </td>
                        <td className="py-2 pr-2 text-right text-xs font-bold tabular-nums">{mark.marks}/{assessment.maxMarks}</td>
                        <td className="py-2 text-right"><Badge tone="brand">{mark.grade}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-ink-500">{t('marks.noData')}</p>
            )}
          </SectionCard>

          <SectionCard title={t('dash.upcomingClasses')} icon="video" bodyClassName="space-y-2">
            {upcoming.length ? upcoming.map((s) => {
              const cls = classById(db, s.classId)
              return (
                <div key={s.id} className="rounded-xl border border-ink-200 p-3">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700"><Icon name="video" size={16} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink-900">{s.title}</p>
                      <p className="mt-0.5 text-[11px] text-ink-500">{cls?.name} · {formatDate(s.date, lang, 'weekday')} · {formatTime(s.startTime, lang)}</p>
                      {s.demoRoom ? <p className="mt-0.5 text-[10px] text-saffron-700">{t('live.demoRoom')}</p> : null}
                    </div>
                  </div>
                </div>
              )
            }) : <p className="text-xs text-ink-500">{t('dash.noUpcoming')}</p>}
            <p className="text-[10px] leading-relaxed text-ink-400">{t('live.linkRestricted')} {t('att.parentHint')}</p>
          </SectionCard>

          <SectionCard title={t('common.announcements')} icon="bell" action={<Link to="/notifications" className="text-xs font-semibold text-brand-700 hover:underline">{t('common.viewAll')}</Link>} bodyClassName="space-y-3">
            {announcements.length ? announcements.map((a) => <AnnouncementItem key={a.id} announcement={a} />) : <p className="text-xs text-ink-500">{t('notif.empty')}</p>}
          </SectionCard>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Avatar name={child.name} color={child.avatarColor} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink-900">{child.name}</p>
                <p className="text-[11px] text-ink-500">{classes.map((c) => c?.name).filter(Boolean).join(', ')}</p>
                <Badge tone="brand" className="mt-1">{t('classes.rollNo')} {child.rollNo || '—'}</Badge>
              </div>
            </div>
            <p className="mt-3 rounded-lg bg-brand-50 p-2.5 text-[10px] leading-relaxed text-brand-900">
              <Icon name="shield" size={12} className="mr-1 inline" />
              {t('parent.accessNote')}
            </p>
          </Card>

          <SectionCard title={t('marks.subjectProgress')} icon="chart" bodyClassName="space-y-2.5">
            {subjectRows.length ? subjectRows.map((row) => (
              <div key={row.subjectId}>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="font-medium text-ink-700">{subjectLabel(row.subjectId, t)}</span>
                  <span className="font-bold tabular-nums text-ink-800">{Math.round(row.pct)}%</span>
                </div>
                <ProgressBar value={row.pct} tone={row.pct >= 75 ? 'leaf' : row.pct >= 50 ? 'brand' : 'saffron'} showValue={false} size="sm" />
              </div>
            )) : <p className="text-xs text-ink-500">{t('marks.noData')}</p>}
          </SectionCard>

          <SectionCard title={t('quiz.submitted')} icon="clipboard" bodyClassName="space-y-2">
            {attempts.length ? attempts.map((a) => {
              const quiz = db.quizzes.find((q) => q.id === a.quizId)
              if (!quiz) return null
              const visible = quizResultsVisible(quiz)
              return (
                <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg px-1.5 py-1.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-ink-800">{quiz.title}</p>
                    <p className="text-[10px] text-ink-500">{formatDate(a.submittedAt.slice(0, 10), lang)}</p>
                  </div>
                  {visible ? <Badge tone="brand">{a.score}/{a.maxScore}</Badge> : <Badge tone="neutral" icon="lock">{t('marks.notPublished')}</Badge>}
                </div>
              )
            }) : <p className="text-xs text-ink-500">{t('quiz.noAttemptsYet')}</p>}
          </SectionCard>

          <SectionCard title={t('common.notifications')} icon="bell" action={<Link to="/notifications" className="text-xs font-semibold text-brand-700 hover:underline">{t('common.viewAll')}</Link>}>
            <NotificationsPreview items={unread.length ? unread : db.notifications.filter((n) => n.userId === currentUser.id)} />
          </SectionCard>

          <div className="grid grid-cols-2 gap-2">
            <Link to="/attendance" className={buttonClass('secondary', 'sm')}>{t('nav.attendance')}</Link>
            <Link to="/marks" className={buttonClass('secondary', 'sm')}>{t('nav.marks')}</Link>
            <Link to="/scholarships" className={buttonClass('quiet', 'sm')}>{t('nav.scholarships')}</Link>
            <Link to="/feedback" className={buttonClass('quiet', 'sm')}>{t('nav.feedback')}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
