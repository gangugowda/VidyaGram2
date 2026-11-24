import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../lib/store'
import { useI18n } from '../../lib/i18n'
import {
  attendanceSummary,
  classStudents,
  lowAttendanceStudents,
  marksForStudent,
  visibleClasses,
} from '../../lib/access'
import { formatDate, formatTime, subjectLabel, todayISO } from '../../lib/utils'
import { Icon } from '../../components/Icon'
import { AnnouncementModal } from '../../components/AnnouncementModal'
import { ClassSummaryCard, SessionCard, SubjectChip } from '../../components/shared'
import {
  Badge,
  Button,
  Callout,
  Card,
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  buttonClass,
} from '../../components/ui'

export function TeacherDashboard() {
  const { db, currentUser, online } = useApp()
  const { t, lang } = useI18n()
  const [announceOpen, setAnnounceOpen] = useState(false)
  if (!currentUser) return null

  const classes = visibleClasses(db, currentUser)
  const classIds = new Set(classes.map((c) => c.id))
  const students = db.users.filter(
    (u) => u.role === 'student' && db.enrollments.some((e) => e.classId && classIds.has(e.classId) && e.studentId === u.id && e.status === 'active'),
  )
  const today = todayISO()

  const todaySessions = db.sessions
    .filter((s) => classIds.has(s.classId) && s.date === today && s.status !== 'cancelled')
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  const upcoming = db.sessions
    .filter((s) => classIds.has(s.classId) && s.status === 'scheduled' && s.date > today)
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
    .slice(0, 3)

  const openDoubts = db.doubts
    .filter((d) => d.status === 'open' && classIds.has(d.classId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const pendingGrading = db.assessments.filter((a) => classIds.has(a.classId) && (!a.graded || !a.published))

  const ungradedQuizzes = db.quizzes.filter((q) => classIds.has(q.classId) && !q.published)

  const threshold = db.schools.find((s) => s.id === currentUser.schoolId)?.lowAttendanceThreshold ?? 75
  const lowAttendance = classes.flatMap((c) =>
    lowAttendanceStudents(db, c.id, threshold).map((row) => ({ ...row, className: c.name })),
  )

  const markedToday = new Set(db.attendance.filter((a) => a.date === today && classIds.has(a.classId)).map((a) => a.classId))
  const attendancePct = students.length
    ? Math.round(
        students.reduce((sum, s) => sum + attendanceSummary(db, s.id).pct, 0) / Math.max(1, students.length),
      )
    : 0

  const recentAttempts = db.attempts
    .filter((a) => db.quizzes.some((q) => q.id === a.quizId && classIds.has(q.classId)))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .slice(0, 4)

  const pendingLinks = db.parentLinks.filter((l) => {
    if (l.status !== 'pending') return false
    const student = db.users.find((u) => u.id === l.studentId)
    return !!student && student.schoolId === currentUser.schoolId
  })

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('dash.hello', { name: currentUser.name.split(' ')[0] })}
        subtitle={t('dash.teacherSub')}
        eyebrow={classes.map((c) => c.name).join(' · ') || t('classes.noClasses')}
        icon="home"
        actions={
          <>
            <Button variant="secondary" icon="bell" onClick={() => setAnnounceOpen(true)}>
              {t('dash.postAnnouncement')}
            </Button>
            <Link to="/live?schedule=1" className={buttonClass('secondary', 'md')}>
              <Icon name="video" size={17} /> {t('dash.scheduleClass')}
            </Link>
            <Link to="/attendance" className={buttonClass('primary', 'md')}>
              <Icon name="calendar" size={17} /> {t('dash.markAttendance')}
            </Link>
          </>
        }
      />

      <AnnouncementModal
        open={announceOpen}
        onClose={() => setAnnounceOpen(false)}
        classes={classes}
        defaultClassId={classes[0]?.id}
      />

      {!online ? (
        <Callout tone="warn" title={t('state.offlineTitle')}>
          {t('state.offlineBody')} Attendance and marks you save now stay on this device until you reconnect.
        </Callout>
      ) : null}

      {classes.length === 0 ? (
        <EmptyState
          icon="users"
          title={t('classes.noClasses')}
          description={t('classes.teacherSub')}
          action={<Link to="/classes" className={buttonClass('primary')}>{t('classes.create')}</Link>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label={t('common.students')} value={students.length} hint={t('classes.members', { count: students.length })} icon="users" tone="brand" />
            <StatCard
              label={t('dash.markAttendance')}
              value={`${markedToday.size}/${classes.length}`}
              hint={t('dash.classesToday', { count: todaySessions.length })}
              icon="calendar"
              tone={markedToday.size === classes.length ? 'leaf' : 'saffron'}
            />
            <StatCard label={t('dash.openDoubts')} value={openDoubts.length} hint={t('doubt.teacherSub')} icon="message" tone={openDoubts.length ? 'clay' : 'leaf'} />
            <StatCard label={t('dash.pendingGrading')} value={pendingGrading.length + ungradedQuizzes.length} hint={t('marks.publishHint')} icon="clipboard" tone={pendingGrading.length + ungradedQuizzes.length ? 'saffron' : 'leaf'} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <SectionCard
                title={t('dash.todaySchedule')}
                subtitle={t('dash.classesToday', { count: todaySessions.length })}
                action={<Link to="/live" className="text-xs font-semibold text-brand-700 hover:underline">{t('common.viewAll')}</Link>}
                icon="video"
                bodyClassName="space-y-2.5"
              >
                {todaySessions.length ? (
                  todaySessions.map((s) => (
                    <SessionCard
                      key={s.id}
                      session={s}
                      action={
                        <Link to="/live" className={buttonClass('secondary', 'sm')}>
                          {s.status === 'live' ? t('live.join') : t('common.open')}
                        </Link>
                      }
                    />
                  ))
                ) : (
                  <EmptyState icon="calendar" title={t('dash.noClassesToday')} description={t('dash.scheduleClass')} action={<Link to="/live?schedule=1" className={buttonClass('secondary', 'sm')}>{t('dash.scheduleClass')}</Link>} />
                )}
              </SectionCard>

              <SectionCard
                title={t('dash.openDoubts')}
                subtitle={t('doubt.teacherSub')}
                action={<Link to="/doubts" className="text-xs font-semibold text-brand-700 hover:underline">{t('common.viewAll')}</Link>}
                icon="message"
                bodyClassName="space-y-2"
              >
                {openDoubts.length ? (
                  openDoubts.slice(0, 4).map((d) => {
                    const student = db.users.find((u) => u.id === d.studentId)
                    return (
                      <Link key={d.id} to="/doubts" className="flex items-start gap-2.5 rounded-xl border border-ink-200 p-2.5 hover:bg-ink-50">
                        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-clay-50 text-clay-700"><Icon name="message" size={15} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate text-xs font-bold text-ink-900">{d.topic}</span>
                            <SubjectChip subjectId={d.subjectId} />
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-[11px] text-ink-600">{d.question}</span>
                          <span className="mt-0.5 block text-[10px] text-ink-400">{doubtLabel(student?.name)} · {formatDate(d.createdAt.slice(0, 10), lang)}</span>
                        </span>
                        <Icon name="chevronRight" size={14} className="mt-1 shrink-0 text-ink-400" />
                      </Link>
                    )
                  })
                ) : (
                  <div className="rounded-xl border border-leaf-200 bg-leaf-50 p-3 text-sm text-leaf-900">
                    <p className="flex items-center gap-1.5 font-semibold"><Icon name="checkCircle" size={16} /> {t('doubt.noOpen')}</p>
                  </div>
                )}
              </SectionCard>

              <SectionCard title={t('dash.teacherClasses')} action={<Link to="/classes" className="text-xs font-semibold text-brand-700 hover:underline">{t('common.viewAll')}</Link>} icon="users">
                <div className="grid gap-3 sm:grid-cols-2">
                  {classes.map((c) => (
                    <ClassSummaryCard key={c.id} cls={c}>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone="ink" icon="clipboard">{classStudents(db, c.id).length} {t('common.students')}</Badge>
                        <Badge tone="brand" icon="calendar">{attendanceSummary(db, classStudents(db, c.id)[0]?.id || '').total ? `${Math.round(classStudents(db, c.id).reduce((s, st) => s + attendanceSummary(db, st.id, c.id).pct, 0) / Math.max(1, classStudents(db, c.id).length))}%` : '—'}</Badge>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Link to={`/classes`} className={buttonClass('secondary', 'sm', 'flex-1')}>{t('dash.manage')}</Link>
                        <Link to={`/live?class=${c.id}`} className={buttonClass('quiet', 'sm', 'flex-1')}>{t('nav.live')}</Link>
                      </div>
                    </ClassSummaryCard>
                  ))}
                </div>
              </SectionCard>
            </div>

            <div className="space-y-4">
              <SectionCard title={t('att.studentsBelow', { threshold })} subtitle={t('att.teacherSub')} action={<Link to="/attendance" className="text-xs font-semibold text-brand-700 hover:underline">{t('common.viewAll')}</Link>} icon="alert" bodyClassName="space-y-1.5">
                {lowAttendance.length ? (
                  lowAttendance.slice(0, 5).map((row) => (
                    <div key={`${row.student.id}-${row.className}`} className="flex items-center justify-between gap-2 rounded-lg bg-clay-50 px-2.5 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-ink-800">{row.student.name}</p>
                        <p className="text-[10px] text-ink-500">{row.className} · {row.summary.present + row.summary.late}/{row.summary.total} {t('unit.days')}</p>
                      </div>
                      <Badge tone={row.summary.pct < 60 ? 'clay' : 'saffron'}>{row.summary.pct}%</Badge>
                    </div>
                  ))
                ) : (
                  <p className="rounded-lg bg-leaf-50 px-2.5 py-2 text-[11px] text-leaf-800">{t('att.good')} — {t('att.belowThreshold', { threshold })}.</p>
                )}
              </SectionCard>

              <SectionCard title={t('dash.pendingGrading')} icon="clipboard" bodyClassName="space-y-2">
                {pendingGrading.slice(0, 3).map((a) => (
                  <Link key={a.id} to="/marks" className="block rounded-lg border border-ink-200 p-2.5 hover:bg-ink-50">
                    <p className="text-xs font-semibold text-ink-800">{a.title}</p>
                    <p className="mt-0.5 text-[10px] text-ink-500">{subjectLabel(a.subjectId, t)} · {formatDate(a.date, lang)} · {a.published ? t('marks.noMarks') : t('common.draft')}</p>
                  </Link>
                ))}
                {ungradedQuizzes.map((q) => (
                  <Link key={q.id} to={`/quizzes/${q.id}`} className="block rounded-lg border border-ink-200 p-2.5 hover:bg-ink-50">
                    <p className="text-xs font-semibold text-ink-800">{q.title}</p>
                    <p className="mt-0.5 text-[10px] text-ink-500">{t('quiz.publishHint')}</p>
                  </Link>
                ))}
                {!pendingGrading.length && !ungradedQuizzes.length ? <p className="text-xs text-ink-500">{t('dash.allCaughtUp')}</p> : null}
              </SectionCard>

              <SectionCard title={t('quiz.submitted')} icon="checkCircle" bodyClassName="space-y-2">
                {recentAttempts.length ? recentAttempts.map((a) => {
                  const quiz = db.quizzes.find((q) => q.id === a.quizId)
                  const student = db.users.find((u) => u.id === a.studentId)
                  return (
                    <Link key={a.id} to={`/quizzes/${a.quizId}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-ink-50">
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-ink-800">{student?.name}</span>
                        <span className="block truncate text-[10px] text-ink-500">{quiz?.title}</span>
                      </span>
                      <Badge tone="brand">{a.score}/{a.maxScore}</Badge>
                    </Link>
                  )
                }) : <p className="text-xs text-ink-500">{t('quiz.noAttemptsYet')}</p>}
              </SectionCard>

              {pendingLinks.length ? (
                <SectionCard title={t('classes.guardianLinks')} icon="link" bodyClassName="space-y-2">
                  {pendingLinks.map((l) => {
                    const parent = db.users.find((u) => u.id === l.parentId)
                    const student = db.users.find((u) => u.id === l.studentId)
                    return (
                      <div key={l.id} className="rounded-lg bg-saffron-50 p-2.5">
                        <p className="text-xs font-semibold text-saffron-900">{parent?.name} → {student?.name}</p>
                        <p className="mt-0.5 text-[10px] text-saffron-800">{t('admin.approvals')} · {t('common.pending')}</p>
                      </div>
                    )
                  })}
                  <Link to="/admin/approvals" className={buttonClass('secondary', 'sm', 'w-full')}>{t('common.open')}</Link>
                </SectionCard>
              ) : null}

              <Card className="bg-brand-700 p-4 text-white">
                <p className="flex items-center gap-1.5 text-sm font-bold"><Icon name="sparkles" size={16} /> {t('nav.ai')}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-brand-100">{t('ai.teacherSub')}</p>
                <Link to="/ai" className="mt-2 inline-flex min-h-9 items-center gap-1 rounded-lg bg-white px-3 text-xs font-bold text-brand-800">
                  {t('ai.lessonPlan')} <Icon name="arrowRight" size={14} />
                </Link>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { to: '/quizzes?create=1', icon: 'clipboard' as const, label: t('dash.createQuiz') },
              { to: '/materials?upload=1', icon: 'upload' as const, label: t('dash.addMaterial') },
              { to: '/doubts', icon: 'message' as const, label: t('dash.viewDoubts') },
              { to: '/live?schedule=1', icon: 'video' as const, label: t('dash.scheduleClass') },
            ].map((item) => (
              <Link key={item.to} to={item.to} className="card flex items-center gap-2.5 p-3 hover:shadow-pop">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700"><Icon name={item.icon} size={17} /></span>
                <span className="min-w-0 text-xs font-bold text-ink-900">{item.label}</span>
              </Link>
            ))}
          </div>

          {upcoming.length ? (
            <SectionCard title={t('dash.upcomingClasses')} icon="calendar" bodyClassName="space-y-2.5">
              {upcoming.map((s) => (
                <SessionCard key={s.id} session={s} compact action={<Link to="/live" className={buttonClass('secondary', 'sm')}>{t('common.open')}</Link>} />
              ))}
            </SectionCard>
          ) : null}
        </>
      )}
    </div>
  )
}

function doubtLabel(name?: string) {
  return name ? `Asked by ${name}` : 'Student question'
}
