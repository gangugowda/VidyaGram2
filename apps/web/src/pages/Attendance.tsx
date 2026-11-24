import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../lib/store'
import { useI18n } from '../lib/i18n'
import {
  attendanceSummary,
  classStudents,
  guardianChildren,
  lowAttendanceStudents,
  studentAttendanceStatus,
  visibleClasses,
} from '../lib/access'
import type { AttendanceStatus } from '../lib/types'
import { cn, downloadTextFile, formatDate, todayISO, uid } from '../lib/utils'
import { toCsv } from '../lib/offline'
import { Icon } from '../components/Icon'
import {
  Avatar,
  Badge,
  Button,
  Callout,
  EmptyState,
  PageHeader,
  ProgressBar,
  SectionCard,
  Select,
  StatCard,
  buttonClass,
} from '../components/ui'

const STATUS_META: Record<AttendanceStatus, { label: string; short: string; tone: 'leaf' | 'clay' | 'saffron' | 'brand'; bar: string }> = {
  present: { label: 'att.present', short: 'P', tone: 'leaf', bar: 'bg-leaf-500' },
  absent: { label: 'att.absent', short: 'A', tone: 'clay', bar: 'bg-clay-500' },
  late: { label: 'att.late', short: 'L', tone: 'saffron', bar: 'bg-saffron-500' },
  excused: { label: 'att.excused', short: 'E', tone: 'brand', bar: 'bg-brand-500' },
}

const STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'excused']

export function AttendancePage() {
  const { db, currentUser, mutate, toast, notify } = useApp()
  const { t, lang } = useI18n()
  const [classFilter, setClassFilter] = useState('all')
  const [childId, setChildId] = useState('')
  const [classId, setClassId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({})

  if (!currentUser) return null
  const isTeacher = currentUser.role === 'teacher' || currentUser.role === 'admin'
  const isParent = currentUser.role === 'parent'
  const isAdmin = currentUser.role === 'admin'
  const privacyHint = isParent ? t('att.parentHint') : t('att.selfHint')
  const children = isParent ? guardianChildren(db, currentUser.id) : []
  const child = children.find((c) => c.id === childId) || children[0]
  const viewedStudentId = isParent ? child?.id : currentUser.id
  const classes = visibleClasses(db, currentUser)
  const activeClassId = classId || classes[0]?.id || ''
  const activeClass = classes.find((c) => c.id === activeClassId)
  const school = db.schools.find((s) => s.id === currentUser.schoolId)
  const threshold = activeClass
    ? db.schools.find((s) => s.id === activeClass.schoolId)?.lowAttendanceThreshold ?? school?.lowAttendanceThreshold ?? 75
    : school?.lowAttendanceThreshold ?? 75

  const students = useMemo(
    () => (activeClass ? classStudents(db, activeClass.id) : []),
    [db, activeClass],
  )
  const today = todayISO()
  const recorded = activeClass
    ? db.attendance.find((d) => d.classId === activeClass.id && d.date === date && d.period === 'Full day')
    : undefined
  const canEdit = date === today || isAdmin

  useEffect(() => {
    const next: Record<string, AttendanceStatus> = {}
    for (const student of students) {
      next[student.id] = recorded?.entries.find((e) => e.studentId === student.id)?.status ?? 'present'
    }
    setStatuses(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClassId, date, recorded?.id, students.length])

  const save = () => {
    if (!activeClass || !canEdit) return
    mutate((draft) => {
      const existing = draft.attendance.find((d) => d.classId === activeClass.id && d.date === date && d.period === 'Full day')
      const entries = students.map((s) => ({ studentId: s.id, status: statuses[s.id] || 'present' }))
      if (existing) {
        existing.entries = entries
        existing.markedBy = currentUser.id
        existing.updatedAt = new Date().toISOString()
      } else {
        draft.attendance.push({
          id: uid('att'),
          classId: activeClass.id,
          subjectId: activeClass.subjectIds[0],
          date,
          period: 'Full day',
          entries,
          markedBy: currentUser.id,
          updatedAt: new Date().toISOString(),
        })
      }
    })
    toast('success', t('att.saved', { date: formatDate(date, lang) }), activeClass.name)
  }

  const alertGuardians = () => {
    if (!activeClass) return
    const low = lowAttendanceStudents(db, activeClass.id, threshold)
    const planned: Array<{ parentId: string; title: string; body: string }> = []
    for (const row of low) {
      for (const link of db.parentLinks.filter((l) => l.studentId === row.student.id && l.status === 'approved')) {
        const recentlyNotified = db.notifications.some(
          (n) =>
            n.userId === link.parentId &&
            n.kind === 'attendance' &&
            n.title.includes(row.student.name) &&
            Date.now() - new Date(n.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000,
        )
        if (recentlyNotified) continue
        planned.push({
          parentId: link.parentId,
          title: t('att.alertTitle', { name: row.student.name }),
          body: t('att.alertBody', { name: row.student.name.split(' ')[0], pct: row.summary.pct, threshold }),
        })
      }
      notify(
        row.student.id,
        'attendance',
        t('att.alertTitle', { name: row.student.name }),
        t('att.belowThreshold', { threshold }),
        '/attendance',
      )
    }
    if (planned.length) {
      mutate((draft) => {
        for (const alert of planned) {
          draft.notifications.unshift({
            id: uid('notif'),
            userId: alert.parentId,
            kind: 'attendance',
            title: alert.title,
            body: alert.body,
            link: '/attendance',
            read: false,
            createdAt: new Date().toISOString(),
          })
        }
      })
    }
    if (planned.length) toast('success', t('att.notificationsSent', { count: planned.length }), t('att.dedupeNote'))
    else toast('info', t('att.noNewNotifications'), t('att.dedupeNote'))
  }

  const exportCsv = () => {
    if (!activeClass) return
    const rows: Array<Array<string | number>> = [
      ['Date', 'Period', 'Student', 'Roll no', 'Status'],
    ]
    const days = db.attendance
      .filter((d) => d.classId === activeClass.id)
      .sort((a, b) => b.date.localeCompare(a.date))
    for (const day of days) {
      for (const entry of day.entries) {
        const student = students.find((s) => s.id === entry.studentId)
        rows.push([day.date, day.period, student?.name || entry.studentId, student?.rollNo || '', entry.status])
      }
    }
    downloadTextFile(`vidyagram-attendance-${activeClass.name.replace(/\W+/g, '-')}.csv`, toCsv(rows))
    toast('success', t('att.export'), activeClass.name)
  }

  /* ------------------------------------------------------------ teacher view */
  if (isTeacher) {
    const low = activeClass ? lowAttendanceStudents(db, activeClass.id, threshold) : []
    const counts = STATUSES.reduce<Record<string, number>>((acc, status) => {
      acc[status] = students.filter((s) => (statuses[s.id] || 'present') === status).length
      return acc
    }, {})
    return (
      <div className="space-y-4 sm:space-y-5">
        <PageHeader
          title={t('att.title')}
          subtitle={t('att.teacherSub')}
          icon="calendar"
          actions={<Button variant="secondary" icon="download" onClick={exportCsv}>{t('att.export')}</Button>}
        />

        {!classes.length ? (
          <EmptyState icon="users" title={t('classes.noClasses')} description={t('classes.teacherSub')} />
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-3">
              <SectionCard title={t('att.mark')} subtitle={t('att.daily')} icon="calendar" className="lg:col-span-2">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label htmlFor="att-class" className="mb-1 block text-[13px] font-semibold text-ink-800">{t('common.class')}</label>
                    <Select id="att-class" value={activeClassId} onChange={(e) => setClassId(e.target.value)}>
                      {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                  </div>
                  <div>
                    <label htmlFor="att-date" className="mb-1 block text-[13px] font-semibold text-ink-800">{t('att.date')}</label>
                    <input
                      id="att-date"
                      type="date"
                      value={date}
                      max={isAdmin ? undefined : today}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full rounded-xl border border-ink-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-[13px] font-semibold text-ink-800">{t('att.period')}</p>
                    <div className="rounded-xl border border-ink-200 bg-ink-50 px-3 py-2.5 text-sm text-ink-700">{t('att.fullDay')}</div>
                  </div>
                </div>

                {!canEdit ? (
                  <div className="mt-3">
                    <Callout tone="warn" icon="lock" title={t('att.locked')}>{t('att.editNote')}</Callout>
                  </div>
                ) : null}

                <div className="mt-3 grid grid-cols-4 gap-2">
                  {STATUSES.map((status) => (
                    <div key={status} className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-center">
                      <p className="text-[10px] text-ink-500">{t(STATUS_META[status].label)}</p>
                      <p className="text-base font-bold tabular-nums text-ink-900">{counts[status] || 0}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon="check"
                    disabled={!canEdit}
                    onClick={() => setStatuses(Object.fromEntries(students.map((s) => [s.id, 'present' as AttendanceStatus])))}
                  >
                    {t('att.selectAllPresent')}
                  </Button>
                  <span className="text-[10px] text-ink-400">{t('att.legend')}</span>
                  <Button className="ml-auto" onClick={save} disabled={!canEdit} icon="check">{t('att.save')}</Button>
                </div>

                {students.length ? (
                  <ul className="mt-3 divide-y divide-ink-100">
                    {students.map((student) => (
                      <li key={student.id} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={student.name} color={student.avatarColor} size="sm" />
                          <div>
                            <p className="text-sm font-semibold text-ink-900">{student.name}</p>
                            <p className="text-[10px] text-ink-500">{t('classes.rollNo')} {student.rollNo || '—'} · {t('att.percentage', { pct: attendanceSummary(db, student.id, activeClassId).pct })}</p>
                          </div>
                        </div>
                        <div className="flex gap-1" role="group" aria-label={`${t('att.mark')} ${student.name}`}>
                          {STATUSES.map((status) => {
                            const active = (statuses[student.id] || 'present') === status
                            return (
                              <button
                                key={status}
                                type="button"
                                aria-pressed={active}
                                disabled={!canEdit}
                                onClick={() => setStatuses((prev) => ({ ...prev, [student.id]: status }))}
                                className={cn(
                                  'grid h-9 w-9 place-items-center rounded-lg border text-xs font-bold transition-colors disabled:opacity-50',
                                  active
                                    ? status === 'present'
                                      ? 'border-leaf-600 bg-leaf-600 text-white'
                                      : status === 'absent'
                                        ? 'border-clay-600 bg-clay-600 text-white'
                                        : status === 'late'
                                          ? 'border-saffron-500 bg-saffron-500 text-white'
                                          : 'border-brand-600 bg-brand-600 text-white'
                                    : 'border-ink-200 bg-white text-ink-500 hover:bg-ink-50',
                                )}
                                title={t(STATUS_META[status].label)}
                              >
                                {STATUS_META[status].short}
                              </button>
                            )
                          })}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState icon="users" title={t('classes.noClasses')} description={t('classes.joinHint')} />
                )}
                {recorded ? (
                  <p className="mt-2 text-[10px] text-ink-400">
                    {t('att.lastUpdated', { date: formatDate(recorded.updatedAt.slice(0, 10), lang), name: db.users.find((u) => u.id === recorded.markedBy)?.name || '—' })}
                  </p>
                ) : null}
              </SectionCard>

              <div className="space-y-4">
                <SectionCard title={t('att.atRisk')} subtitle={t('att.studentsBelow', { threshold })} icon="alert">
                  {low.length ? (
                    <ul className="space-y-2">
                      {low.slice(0, 6).map((row) => (
                        <li key={row.student.id} className="flex items-center justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-ink-800">{row.student.name}</span>
                            <span className="text-[10px] text-ink-500">{t('att.recordsCount', { count: row.summary.total })}</span>
                          </span>
                          <Badge tone={row.summary.pct < 50 ? 'clay' : 'saffron'}>{row.summary.pct}%</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-ink-500">{t('att.good')}</p>
                  )}
                  <Button size="sm" variant="secondary" className="mt-3 w-full" icon="bell" onClick={alertGuardians}>
                    {t('att.notifyParents')}
                  </Button>
                  <p className="mt-1.5 text-[10px] leading-relaxed text-ink-400">{t('att.dedupeNote')}</p>
                </SectionCard>

                <SectionCard title={t('att.overall')} icon="chart">
                  <ProgressBar value={students.length ? (students.reduce((sum, s) => sum + attendanceSummary(db, s.id, activeClassId).pct, 0) / students.length) : 0} label={activeClass?.name} tone="leaf" />
                  <p className="mt-2 text-[11px] text-ink-500">{t('att.legend')}</p>
                </SectionCard>
              </div>
            </div>

            <SectionCard title={t('att.history')} subtitle={activeClass?.name} icon="calendar">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead>
                    <tr className="border-b border-ink-200 text-left text-[11px] uppercase tracking-wide text-ink-500">
                      <th className="px-2 py-2">{t('common.date')}</th>
                      <th className="px-2 py-2">{t('common.student')}</th>
                      <th className="px-2 py-2">{t('common.status')}</th>
                      <th className="px-2 py-2 text-right">{t('att.percentage', { pct: '' }).trim()}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {db.attendance
                      .filter((d) => d.classId === activeClassId)
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .slice(0, 10)
                      .flatMap((day) =>
                        day.entries.map((entry) => {
                          const student = db.users.find((u) => u.id === entry.studentId)
                          return (
                            <tr key={`${day.id}-${entry.studentId}`} className="border-b border-ink-100 last:border-0">
                              <td className="px-2 py-2 text-xs text-ink-600">{formatDate(day.date, lang)}</td>
                              <td className="px-2 py-2 text-xs font-medium text-ink-800">{student?.name}</td>
                              <td className="px-2 py-2"><Badge tone={STATUS_META[entry.status].tone}>{t(STATUS_META[entry.status].label)}</Badge></td>
                              <td className="px-2 py-2 text-right text-xs tabular-nums text-ink-600">{attendanceSummary(db, entry.studentId, day.classId).pct}%</td>
                            </tr>
                          )
                        }),
                      )}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </>
        )}
      </div>
    )
  }

  /* ------------------------------------------------------ student / parent view */
  if (isParent && !child) {
    return (
      <div>
        <PageHeader title={t('att.title')} subtitle={t('att.parentSub')} icon="calendar" />
        <EmptyState icon="users" title={t('att.noLinked')} description={t('att.noChildren')} action={<a href="/parent/link" className={buttonClass('primary')}>{t('auth.linkChild')}</a>} />
      </div>
    )
  }

  if (!viewedStudentId) return null
  const studentClasses = classes.filter((c) =>
    isParent ? db.enrollments.some((e) => e.classId === c.id && e.studentId === viewedStudentId && e.status === 'active') : true,
  )
  const summary = attendanceSummary(db, viewedStudentId, classFilter === 'all' ? undefined : classFilter)
  const below = summary.pct < threshold

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('att.title')}
        subtitle={isParent ? t('att.parentSub') : t('att.sub')}
        eyebrow={isParent ? child?.name : currentUser.name}
        icon="calendar"
        actions={
          <div className="flex flex-wrap gap-2">
            {isParent ? (
              <Select value={child?.id || ''} onChange={(e) => setChildId(e.target.value)} aria-label={t('parent.chooseChild')}>
                {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            ) : null}
            {studentClasses.length > 1 ? (
              <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} aria-label={t('common.class')}>
                <option value="all">{t('common.all')} {t('common.class').toLowerCase()}es</option>
                {studentClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={t('att.overall')} value={`${summary.pct}%`} hint={t('att.recordsCount', { count: summary.total })} icon="chart" tone={below ? 'clay' : 'leaf'} />
        <StatCard label={t('att.present')} value={summary.present} icon="checkCircle" tone="leaf" />
        <StatCard label={t('att.absent')} value={summary.absent} icon="xCircle" tone="clay" />
        <StatCard label={t('att.late')} value={summary.late} icon="clock" tone="saffron" />
      </div>

      {below ? (
        <Callout tone="warn" icon="alert" title={t('att.belowThreshold', { threshold })}>{privacyHint}</Callout>
      ) : (
        <Callout tone="success" icon="checkCircle" title={t('att.good')}>{t('att.recordsCount', { count: summary.total })}</Callout>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title={t('att.overall')} icon="chart" className="lg:col-span-1">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-4xl font-black tabular-nums text-ink-900">{summary.pct}%</p>
              <p className="text-[11px] text-ink-500">{t('att.thisTerm')}</p>
            </div>
            <div className="flex-1">
              <ProgressBar value={summary.pct} tone={summary.pct >= 75 ? 'leaf' : summary.pct >= 60 ? 'saffron' : 'clay'} showValue={false} />
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-500">
                <span><strong className="text-leaf-700">{summary.present}</strong> {t('att.present')}</span>
                <span><strong className="text-clay-700">{summary.absent}</strong> {t('att.absent')}</span>
                <span><strong className="text-saffron-700">{summary.late}</strong> {t('att.late')}</span>
                <span><strong className="text-brand-700">{summary.excused}</strong> {t('att.excused')}</span>
              </div>
            </div>
          </div>
          <p className="mt-3 rounded-lg bg-ink-50 px-2.5 py-2 text-[10px] leading-relaxed text-ink-500">{privacyHint}</p>
        </SectionCard>

        <SectionCard title={t('att.history')} subtitle={t('att.daily')} icon="calendar" className="lg:col-span-2">
          {summary.days.length ? (
            <ul className="divide-y divide-ink-100">
              {summary.days.slice(0, 20).map((day) => {
                const status = studentAttendanceStatus(day, viewedStudentId) as AttendanceStatus
                const meta = STATUS_META[status] || STATUS_META.present
                const cls = db.classes.find((c) => c.id === day.classId)
                return (
                  <li key={day.id} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                    <span>
                      <span className="block text-xs font-semibold text-ink-800">{formatDate(day.date, lang, 'weekday')}</span>
                      <span className="text-[10px] text-ink-500">{cls?.name} · {day.period}</span>
                    </span>
                    <Badge tone={meta.tone} icon={status === 'present' ? 'check' : status === 'absent' ? 'x' : 'clock'}>
                      {t(meta.label)}
                    </Badge>
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState icon="calendar" title={t('att.noRecords')} description={t('att.sub')} />
          )}
        </SectionCard>
      </div>

      <Callout tone="brand" icon="shield" title={t('privacy.title')}>{privacyHint}</Callout>
    </div>
  )
}
