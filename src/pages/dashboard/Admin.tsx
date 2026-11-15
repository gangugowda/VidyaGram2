import { Link } from 'react-router-dom'
import { useApp } from '../../lib/store'
import { useI18n } from '../../lib/i18n'
import {
  attendanceSummary,
  classAverage,
  lowAttendanceStudents,
  pendingParentLinksForAdmin,
} from '../../lib/access'
import { formatDate, formatDateTime, percent } from '../../lib/utils'
import { Icon } from '../../components/Icon'
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

export function AdminDashboard() {
  const { db, currentUser, online } = useApp()
  const { t, lang } = useI18n()
  if (!currentUser) return null

  const school = db.schools.find((s) => s.id === currentUser.schoolId)
  const schoolUsers = db.users.filter((u) => u.schoolId === currentUser.schoolId)
  const students = schoolUsers.filter((u) => u.role === 'student')
  const teachers = schoolUsers.filter((u) => u.role === 'teacher')
  const parents = schoolUsers.filter((u) => u.role === 'parent')
  const classes = db.classes.filter((c) => c.schoolId === currentUser.schoolId)
  const threshold = school?.lowAttendanceThreshold ?? 75

  const lowAttendance = classes.flatMap((c) =>
    lowAttendanceStudents(db, c.id, threshold).map((row) => ({ ...row, className: c.name })),
  )
  const pendingLinks = pendingParentLinksForAdmin(db, currentUser.schoolId)
  const newFeedback = db.feedback.filter((f) => f.status === 'new')
  const recentAudit = [...db.audit].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5)
  const schoolAttendance = students.length
    ? Math.round(students.reduce((sum, s) => sum + attendanceSummary(db, s.id).pct, 0) / students.length)
    : 0

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('dash.hello', { name: currentUser.name.split(' ')[0] })}
        subtitle={t('dash.adminSub')}
        eyebrow={school?.name}
        icon="home"
        actions={
          <>
            <Link to="/admin/users" className={buttonClass('secondary', 'md')}><Icon name="users" size={17} /> {t('nav.users')}</Link>
            <Link to="/admin/approvals" className={buttonClass('primary', 'md')}><Icon name="shield" size={17} /> {t('nav.approvals')}</Link>
          </>
        }
      />

      {!online ? <Callout tone="warn" title={t('state.offlineTitle')}>{t('state.offlineBody')}</Callout> : null}

      <Callout tone="info" title={t('admin.overview')}>
        {school ? `${school.name} · ${school.district}, ${school.state} · ${school.code}` : t('common.school')} — {t('app.demoBanner')}
      </Callout>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t('dash.totalStudents')} value={students.length} hint={t('classes.members', { count: students.length })} icon="graduation" tone="brand" />
        <StatCard label={t('dash.totalTeachers')} value={teachers.length} hint={`${classes.length} ${t('dash.totalClasses').toLowerCase()}`} icon="users" tone="leaf" />
        <StatCard label={t('dash.parentLinks')} value={pendingLinks.length} hint={t('admin.approvals')} icon="link" tone={pendingLinks.length ? 'saffron' : 'ink'} />
        <StatCard label={t('dash.pendingFeedback')} value={newFeedback.length} hint={t('fb.adminHint')} icon="message" tone={newFeedback.length ? 'clay' : 'leaf'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard title={t('dash.schoolSnapshot')} subtitle={school?.name} icon="school">
            <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
              <div className="rounded-xl bg-brand-50 p-3 text-center">
                <p className="text-3xl font-bold tabular-nums text-brand-800">{schoolAttendance}%</p>
                <p className="mt-0.5 text-[11px] font-medium text-brand-700">{t('att.overall')}</p>
                <Badge tone={schoolAttendance >= threshold ? 'leaf' : 'clay'} className="mt-1.5">
                  {schoolAttendance >= threshold ? t('att.good') : t('att.atRisk')}
                </Badge>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: t('admin.students'), value: students.length, icon: 'graduation' as const },
                  { label: t('admin.teachers'), value: teachers.length, icon: 'users' as const },
                  { label: t('admin.parents'), value: parents.length, icon: 'heart' as const },
                  { label: t('admin.classes'), value: classes.length, icon: 'library' as const },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink-50 text-ink-600"><Icon name={row.icon} size={14} /></span>
                    <span className="flex-1 text-xs text-ink-600">{row.label}</span>
                    <span className="text-xs font-bold tabular-nums text-ink-900">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 space-y-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">{t('marks.classAverage')} — {t('common.class')}</p>
              {classes.map((c) => {
                const avg = classAverage(db, c.id)
                return (
                  <div key={c.id}>
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="font-medium text-ink-700">{c.name}</span>
                      <span className="font-bold tabular-nums text-ink-900">{avg}%</span>
                    </div>
                    <ProgressBar value={avg} tone={avg >= 75 ? 'leaf' : avg >= 50 ? 'brand' : 'saffron'} showValue={false} size="sm" />
                  </div>
                )
              })}
            </div>
          </SectionCard>

          <SectionCard title={t('att.studentsBelow', { threshold })} subtitle={t('dash.lowAttendance')} icon="alert" action={<Link to="/admin/users" className="text-xs font-semibold text-brand-700 hover:underline">{t('common.viewAll')}</Link>} bodyClassName="space-y-1.5">
            {lowAttendance.length ? lowAttendance.slice(0, 6).map((row) => (
              <div key={`${row.student.id}-${row.className}`} className="flex items-center gap-2.5 rounded-lg border border-ink-100 px-2.5 py-2">
                <Avatar name={row.student.name} color={row.student.avatarColor} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ink-800">{row.student.name}</p>
                  <p className="text-[10px] text-ink-500">{row.className} · {row.summary.present + row.summary.late}/{row.summary.total} {t('unit.days')}</p>
                </div>
                <Badge tone={row.summary.pct < 60 ? 'clay' : 'saffron'}>{row.summary.pct}%</Badge>
              </div>
            )) : <p className="text-xs text-ink-500">{t('att.good')} — {t('att.noRecords')}</p>}
          </SectionCard>

          <SectionCard title={t('admin.audit')} subtitle={t('admin.auditHint')} icon="database" bodyClassName="space-y-2">
            {recentAudit.map((a) => (
              <div key={a.id} className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-ink-50">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-600"><Icon name="shield" size={13} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-ink-800">{a.action}</p>
                  {a.detail ? <p className="mt-0.5 text-[10px] leading-relaxed text-ink-500">{a.detail}</p> : null}
                  <p className="mt-0.5 text-[10px] text-ink-400">{a.actorName} · {a.actorRole} · {formatDateTime(a.at, lang)}</p>
                </div>
              </div>
            ))}
            {!recentAudit.length ? <p className="text-xs text-ink-500">{t('common.noData')}</p> : null}
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title={t('dash.parentLinks')} icon="link" action={<Link to="/admin/approvals" className="text-xs font-semibold text-brand-700 hover:underline">{t('common.open')}</Link>} bodyClassName="space-y-2">
            {pendingLinks.length ? pendingLinks.slice(0, 4).map((l) => {
              const parent = db.users.find((u) => u.id === l.parentId)
              const student = db.users.find((u) => u.id === l.studentId)
              return (
                <div key={l.id} className="rounded-lg border border-saffron-200 bg-saffron-50 p-2.5">
                  <p className="text-xs font-semibold text-saffron-900">{parent?.name}</p>
                  <p className="mt-0.5 text-[10px] text-saffron-800">→ {student?.name} · {formatDate(l.requestedAt.slice(0, 10), lang)}</p>
                </div>
              )
            }) : <p className="rounded-lg bg-leaf-50 px-2.5 py-2 text-[11px] text-leaf-800">{t('admin.noApprovals')}</p>}
          </SectionCard>

          <SectionCard title={t('admin.recentFeedback')} icon="message" action={<Link to="/admin/feedback" className="text-xs font-semibold text-brand-700 hover:underline">{t('common.open')}</Link>} bodyClassName="space-y-2">
            {db.feedback.slice(0, 3).map((f) => {
              const user = db.users.find((u) => u.id === f.userId)
              return (
                <Link key={f.id} to="/admin/feedback" className="block rounded-lg border border-ink-200 p-2.5 hover:bg-ink-50">
                  <p className="truncate text-xs font-semibold text-ink-800">{f.subject}</p>
                  <p className="mt-0.5 text-[10px] text-ink-500">{user?.name} · {t(`fb.status.${f.status}`)}</p>
                </Link>
              )
            })}
            {!db.feedback.length ? <p className="text-xs text-ink-500">{t('fb.noItems')}</p> : null}
          </SectionCard>

          <SectionCard title={t('admin.schools')} icon="school" action={<Link to="/admin/schools" className="text-xs font-semibold text-brand-700 hover:underline">{t('common.viewAll')}</Link>}>
            <div className="space-y-2">
              {db.schools.map((s) => (
                <div key={s.id} className={`rounded-lg border p-2.5 ${s.id === currentUser.schoolId ? 'border-brand-200 bg-brand-50' : 'border-ink-200'}`}>
                  <p className="text-xs font-semibold text-ink-800">{s.name}</p>
                  <p className="mt-0.5 text-[10px] text-ink-500">{s.code} · {s.district}</p>
                  <p className="mt-0.5 text-[10px] text-ink-400">{db.users.filter((u) => u.schoolId === s.id).length} {t('nav.users').toLowerCase()} · {db.classes.filter((c) => c.schoolId === s.id).length} {t('dash.totalClasses').toLowerCase()}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <Card className="p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold text-ink-800"><Icon name="settings" size={15} className="text-brand-600" /> {t('admin.integrationStatus')}</p>
            <ul className="mt-2 space-y-1.5 text-[11px]">
              {[
                { label: t('admin.zoomStatus'), on: false },
                { label: t('admin.aiStatus'), on: false },
                { label: t('admin.emailStatus'), on: false },
                { label: t('admin.smsStatus'), on: false },
              ].map((r) => (
                <li key={r.label} className="flex items-center justify-between gap-2">
                  <span className="text-ink-600">{r.label}</span>
                  <Badge tone={r.on ? 'leaf' : 'neutral'}>{r.on ? t('admin.configured') : t('admin.notConfigured')}</Badge>
                </li>
              ))}
            </ul>
            <Link to="/admin/settings" className={buttonClass('secondary', 'sm', 'mt-3 w-full')}>{t('admin.integrationsBody').slice(0, 22)}…</Link>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { to: '/admin/users', icon: 'users' as const, label: t('nav.users') },
          { to: '/admin/content', icon: 'book' as const, label: t('nav.content') },
          { to: '/admin/scholarships', icon: 'award' as const, label: t('nav.scholarships') },
          { to: '/admin/settings', icon: 'settings' as const, label: t('nav.settings') },
        ].map((item) => (
          <Link key={item.to} to={item.to} className="card flex items-center gap-2.5 p-3 hover:shadow-pop">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700"><Icon name={item.icon} size={17} /></span>
            <span className="min-w-0 text-xs font-bold text-ink-900">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
