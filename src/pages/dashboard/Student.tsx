import { Link } from 'react-router-dom'
import { useApp } from '../../lib/store'
import { useI18n } from '../../lib/i18n'
import {
  attendanceSummary,
  classById,
  openQuizzesFor,
  quizMaxScore,
  subjectProgress,
  subjectProgress as progress,
} from '../../lib/access'
import { todayISO, formatDate, formatTime, subjectLabel, cn } from '../../lib/utils'
import { subjectById } from '../../lib/subjects'
import { Icon } from '../../components/Icon'
import {
  AnnouncementItem,
  AttendanceSnapshot,
  BadgeShelf,
  Leaderboard,
  NotificationsPreview,
  QuizRow,
  SessionCard,
} from '../../components/shared'
import {
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

export function StudentDashboard() {
  const { db, currentUser, online, pendingSync } = useApp()
  const { t, lang } = useI18n()
  if (!currentUser) return null

  const classIds = db.enrollments.filter((e) => e.studentId === currentUser.id && e.status === 'active').map((e) => e.classId)
  const classes = classIds.map((id) => classById(db, id)).filter(Boolean) as import('../../lib/types').ClassRoom[]
  const summary = attendanceSummary(db, currentUser.id)
  const progressRows = subjectProgress(db, currentUser.id)
  const overall = progressRows.length ? Math.round(progressRows.reduce((s, r) => s + r.pct, 0) / progressRows.length) : 0
  const pending = openQuizzesFor(db, currentUser.id)
  const today = todayISO()

  const sessions = db.sessions
    .filter((s) => classIds.includes(s.classId) && s.status === 'scheduled' && s.date >= today)
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))

  const nextSession = sessions[0]
  const nextSubject = nextSession ? subjectById(nextSession.subjectId) : undefined
  const nextTeacher = nextSession ? db.users.find((u) => u.id === nextSession.teacherId) : undefined
  const nextClass = nextSession ? classById(db, nextSession.classId) : undefined

  const materials = db.resources
    .filter((r) => r.published && classIds.includes(r.classId))
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
    .slice(0, 3)

  const recordings = db.recordings
    .filter((r) => classIds.includes(r.classId))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 2)

  const announcements = db.announcements
    .filter(
      (a) =>
        a.schoolId === currentUser.schoolId &&
        (a.audience === 'students' || a.audience === 'all') &&
        (!a.classId || classIds.includes(a.classId)),
    )
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 2)

  const myDownloads = db.downloads.filter((d) => d.userId === currentUser.id)
  const unread = db.notifications.filter((n) => n.userId === currentUser.id && !n.read)
  const leaderboardClass = classes.find((c) => c.leaderboardEnabled) || classes[0]
  const firstName = currentUser.name.split(' ')[0]

  if (!classes.length) {
    return (
      <div>
        <PageHeader title={t('dash.hello', { name: firstName })} subtitle={t('dash.studentSub')} icon="home" />
        <EmptyState
          icon="users"
          title={t('classes.noClasses')}
          description={t('classes.joinHint')}
          action={<Link to="/classes" className={buttonClass('primary')}>{t('classes.join')}</Link>}
        />
        {announcements.length ? (
          <SectionCard title={t('common.announcements')} className="mt-5">
            <div className="space-y-3">
              {announcements.map((a) => <AnnouncementItem key={a.id} announcement={a} />)}
            </div>
          </SectionCard>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('dash.hello', { name: firstName })}
        subtitle={t('dash.studentSub')}
        eyebrow={classes[0]?.name}
        icon="home"
        actions={
          <>
            <Link to="/doubts?ask=1" className={buttonClass('secondary', 'md')}>
              <Icon name="message" size={17} /> {t('doubt.ask')}
            </Link>
            <Link to="/ai" className={buttonClass('primary', 'md')}>
              <Icon name="sparkles" size={17} /> {t('nav.ai')}
            </Link>
          </>
        }
      />

      {!online ? (
        <Callout tone="warn" title={t('state.offlineTitle')}>
          {t('state.offlineBody')} {pendingSync ? ` ${t('shell.syncPending', { count: pendingSync })}` : ''}
        </Callout>
      ) : null}
      {currentUser.lowDataMode && online ? (
        <Callout tone="success" title={t('shell.lowDataOn')} icon="leaf">{t('dash.lowDataHint')}</Callout>
      ) : null}

      {/* Next class hero */}
      {nextSession ? (
        <section className="overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-700 to-brand-800 p-4 text-white shadow-card sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-200">{t('dash.nextClass')}</p>
              <h2 className="mt-1 text-lg font-bold leading-snug sm:text-xl">{nextSession.title}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-100">
                <span className="flex items-center gap-1"><Icon name="book" size={13} /> {t(nextSubject?.nameKey || 'common.subject')}</span>
                <span className="flex items-center gap-1"><Icon name="user" size={13} /> {nextTeacher?.name}</span>
                <span className="flex items-center gap-1"><Icon name="calendar" size={13} /> {formatDate(nextSession.date, lang, 'weekday')}</span>
                <span className="flex items-center gap-1"><Icon name="clock" size={13} /> {formatTime(nextSession.startTime, lang)} · {nextSession.durationMin} {t('common.minutes')}</span>
              </p>
              <p className="mt-1.5 text-[11px] text-brand-200">{nextClass?.name} · {t('live.joinWindow')}</p>
              {nextSession.demoRoom ? <p className="mt-1 text-[10px] text-saffron-200">{t('live.demoRoom')}</p> : null}
            </div>
            <Link
              to="/live"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-brand-800 hover:bg-brand-50"
            >
              <Icon name="video" size={18} /> {t('dash.joinNow')}
            </Link>
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t('dash.attendance')} value={`${summary.pct}%`} hint={t('att.recordsCount', { count: summary.total })} icon="calendar" tone={summary.pct >= 75 ? 'leaf' : 'clay'} />
        <StatCard label={t('dash.overallProgress')} value={`${overall}%`} hint={t('marks.bySubject')} icon="chart" tone="brand" />
        <StatCard label={t('dash.pendingQuizzes')} value={pending.length} hint={pending[0] ? pending[0].title : t('dash.noPendingQuizzes')} icon="clipboard" tone={pending.length ? 'saffron' : 'leaf'} />
        <StatCard label={t('nav.downloads')} value={myDownloads.length} hint={t('dash.downloadsHint', { count: myDownloads.length })} icon="download" tone="ink" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard
            title={t('dash.upcomingClasses')}
            action={<Link to="/live" className="text-xs font-semibold text-brand-700 hover:underline">{t('common.viewAll')}</Link>}
            icon="video"
            bodyClassName="space-y-2.5"
          >
            {sessions.length ? (
              sessions.slice(0, 3).map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  compact
                  action={<Link to="/live" className={buttonClass('secondary', 'sm')}>{t('live.join')}</Link>}
                />
              ))
            ) : (
              <EmptyState icon="calendar" title={t('dash.noUpcoming')} description={t('live.noSessions')} />
            )}
          </SectionCard>

          <SectionCard
            title={t('dash.pendingQuizzes')}
            action={<Link to="/quizzes" className="text-xs font-semibold text-brand-700 hover:underline">{t('common.viewAll')}</Link>}
            icon="clipboard"
            bodyClassName="space-y-2.5"
          >
            {pending.length ? (
              pending.slice(0, 2).map((q) => (
                <QuizRow
                  key={q.id}
                  quiz={q}
                  action={
                    <Link to={`/quizzes/${q.id}`} className={buttonClass('primary', 'sm')}>
                      {t('quiz.start')}
                    </Link>
                  }
                />
              ))
            ) : (
              <div className="rounded-xl border border-leaf-200 bg-leaf-50 p-3 text-sm text-leaf-900">
                <p className="flex items-center gap-1.5 font-semibold"><Icon name="checkCircle" size={16} /> {t('dash.noPendingQuizzes')}</p>
              </div>
            )}
          </SectionCard>

          <div className="grid gap-4 sm:grid-cols-2">
            <SectionCard
              title={t('dash.newMaterials')}
              action={<Link to="/materials" className="text-xs font-semibold text-brand-700 hover:underline">{t('common.viewAll')}</Link>}
              icon="book"
              bodyClassName="space-y-2"
            >
              {materials.map((r) => (
                <Link key={r.id} to="/materials" className="flex items-start gap-2.5 rounded-lg p-1.5 hover:bg-ink-50">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700"><Icon name="file" size={15} /></span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 block text-xs font-semibold text-ink-800">{r.title}</span>
                    <span className="mt-0.5 block text-[10px] text-ink-500">{r.chapter} · {r.languages.map((l) => l.toUpperCase()).join(', ')}</span>
                  </span>
                </Link>
              ))}
              {!materials.length ? <p className="text-xs text-ink-500">{t('mat.noResults')}</p> : null}
            </SectionCard>

            <SectionCard
              title={t('dash.recentRecordings')}
              action={<Link to="/recordings" className="text-xs font-semibold text-brand-700 hover:underline">{t('common.viewAll')}</Link>}
              icon="play"
              bodyClassName="space-y-2"
            >
              {recordings.map((r) => (
                <Link key={r.id} to="/recordings" className="flex items-start gap-2.5 rounded-lg p-1.5 hover:bg-ink-50">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-700"><Icon name="play" size={14} /></span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 block text-xs font-semibold text-ink-800">{r.title}</span>
                    <span className="mt-0.5 block text-[10px] text-ink-500">{formatDate(r.date, lang)} · {r.durationMin} {t('common.minutes')}</span>
                  </span>
                </Link>
              ))}
              {!recordings.length ? <p className="text-xs text-ink-500">{t('rec.noResults')}</p> : null}
            </SectionCard>
          </div>

          <SectionCard title={t('common.announcements')} icon="bell" action={<Link to="/notifications" className="text-xs font-semibold text-brand-700 hover:underline">{t('common.viewAll')}</Link>}>
            <div className="space-y-3">
              {announcements.map((a) => <AnnouncementItem key={a.id} announcement={a} />)}
              {!announcements.length ? <p className="text-xs text-ink-500">{t('notif.empty')}</p> : null}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title={t('dash.attendance')} action={<Link to="/attendance" className="text-xs font-semibold text-brand-700 hover:underline">{t('common.view')}</Link>} icon="calendar">
            <AttendanceSnapshot summary={summary} label={t('att.thisTerm')} />
            {summary.pct < db.schools.find((s) => s.id === currentUser.schoolId)!.lowAttendanceThreshold ? (
              <p className="mt-2 rounded-lg bg-clay-50 px-2 py-1.5 text-[11px] text-clay-800">
                {t('att.belowThreshold', { threshold: db.schools.find((s) => s.id === currentUser.schoolId)!.lowAttendanceThreshold })}
              </p>
            ) : null}
            <Link to="/attendance" className={buttonClass('secondary', 'sm', 'mt-3 w-full')}>{t('att.history')}</Link>
          </SectionCard>

          <SectionCard title={t('marks.subjectProgress')} action={<Link to="/marks" className="text-xs font-semibold text-brand-700 hover:underline">{t('common.view')}</Link>} icon="chart">
            {progressRows.length ? (
              <div className="space-y-2.5">
                {progressRows.map((row) => (
                  <div key={row.subjectId}>
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="font-medium text-ink-700">{subjectLabel(row.subjectId, t)}</span>
                      <span className="font-bold tabular-nums text-ink-800">{row.pct}%</span>
                    </div>
                    <ProgressBar value={row.pct} tone={row.pct >= 75 ? 'leaf' : row.pct >= 50 ? 'brand' : 'saffron'} showValue={false} size="sm" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink-500">{t('marks.noData')}</p>
            )}
          </SectionCard>

          <SectionCard title={t('dash.badges')} action={<Link to="/profile" className="text-xs font-semibold text-brand-700 hover:underline">{t('common.viewAll')}</Link>} icon="award">
            <BadgeShelf userId={currentUser.id} size="sm" />
          </SectionCard>

          {leaderboardClass ? (
            <SectionCard
              title={t('dash.leaderboard')}
              subtitle={leaderboardClass.name}
              action={<Link to="/profile" className="text-xs font-semibold text-brand-700 hover:underline">{t('lb.rules')}</Link>}
              icon="star"
            >
              <Leaderboard classId={leaderboardClass.id} currentUserId={currentUser.id} limit={5} showRules={false} />
            </SectionCard>
          ) : null}

          <SectionCard title={t('common.notifications')} action={<Link to="/notifications" className="text-xs font-semibold text-brand-700 hover:underline">{t('common.viewAll')}</Link>} icon="bell">
            <NotificationsPreview items={unread.length ? unread : db.notifications.filter((n) => n.userId === currentUser.id)} />
          </SectionCard>

          <div className="rounded-2xl border border-ink-200 bg-white p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold text-ink-800"><Icon name="download" size={15} className="text-brand-600" /> {t('dl.title')}</p>
            <p className="mt-1 text-[11px] text-ink-500">{t('dash.downloadsHint', { count: myDownloads.length })}</p>
            <div className="mt-2 flex gap-2">
              <Link to="/downloads" className={buttonClass('secondary', 'sm', 'flex-1')}>{t('common.open')}</Link>
              <Link to="/materials" className={buttonClass('primary', 'sm', 'flex-1')}>{t('common.download')}</Link>
            </div>
            <p className="mt-2 text-[10px] text-ink-400">{t('dl.requiresOnline')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { to: '/quizzes', icon: 'clipboard' as const, label: t('dash.createQuiz'), sub: t('nav.quizzes') },
          { to: '/doubts?ask=1', icon: 'message' as const, label: t('doubt.ask'), sub: t('nav.doubts') },
          { to: '/labs', icon: 'flask' as const, label: t('nav.labs'), sub: t('labs.working') },
          { to: '/ai', icon: 'sparkles' as const, label: t('nav.ai'), sub: t('ai.studentSub').slice(0, 34) + '…' },
        ].map((item) => (
          <Link key={item.to} to={item.to} className="card flex items-center gap-2.5 p-3 hover:shadow-pop">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700"><Icon name={item.icon} size={17} /></span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-bold text-ink-900">{item.label}</span>
              <span className="block truncate text-[10px] text-ink-500">{item.sub}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
