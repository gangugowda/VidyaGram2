import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../lib/store'
import { useI18n } from '../lib/i18n'
import {
  attendanceSummary,
  classById,
  classStudents,
  isClassTeacher,
  studentClassIds,
  visibleClasses,
  guardianChildren,
} from '../lib/access'
import { SUBJECTS, subjectById } from '../lib/subjects'
import { cn, downloadTextFile, normaliseCode, subjectLabel, todayISO, uid } from '../lib/utils'
import { toCsv } from '../lib/offline'
import type { ClassRoom } from '../lib/types'
import { Icon } from '../components/Icon'
import { SubjectChip } from '../components/shared'
import {
  Avatar,
  Badge,
  Button,
  Callout,
  Card,
  CopyButton,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  ProgressBar,
  SectionCard,
  Select,
  StatCard,
  TextInput,
  Toggle,
  buttonClass,
} from '../components/ui'

export function ClassesPage() {
  const { db, currentUser, mutate, toast, notify } = useApp()
  const { t } = useI18n()
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joinBusy, setJoinBusy] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  if (!currentUser) return null
  const classes = visibleClasses(db, currentUser)
  const isTeacher = currentUser.role === 'teacher'
  const isAdmin = currentUser.role === 'admin'
  const isParent = currentUser.role === 'parent'
  const children = isParent ? guardianChildren(db, currentUser.id) : []

  const joinClass = () => {
    setJoinError('')
    const code = normaliseCode(joinCode)
    if (!code) {
      setJoinError(t('classes.invalidCode'))
      return
    }
    const cls = db.classes.find((c) => normaliseCode(c.code) === code)
    if (!cls) {
      setJoinError(t('classes.invalidCode'))
      return
    }
    if (studentClassIds(db, currentUser.id).includes(cls.id)) {
      setJoinError(t('classes.alreadyMember'))
      return
    }
    if (cls.schoolId !== currentUser.schoolId) {
      setJoinError(t('classes.invalidCode'))
      return
    }
    setJoinBusy(true)
    mutate((draft) => {
      draft.enrollments.push({
        id: uid('enr'),
        classId: cls.id,
        studentId: currentUser.id,
        joinedAt: new Date().toISOString(),
        status: 'active',
      })
      draft.users.find((u) => u.id === currentUser.id)!.gradeLevel = cls.gradeLevel
      draft.users.find((u) => u.id === currentUser.id)!.section = cls.section
      draft.notifications.unshift({
        id: uid('notif'),
        userId: cls.teacherId,
        kind: 'class',
        title: `${currentUser.name} joined ${cls.name}`,
        body: 'They used the class code. Review the roster in My Classes.',
        link: '/classes',
        read: false,
        createdAt: new Date().toISOString(),
      })
    })
    setJoinCode('')
    setJoinBusy(false)
    toast('success', t('classes.joined'), cls.name)
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={isTeacher || isAdmin ? t('classes.title') : t('nav.classes')}
        subtitle={isTeacher ? t('classes.teacherSub') : isParent ? t('parent.accessNote') : t('classes.sub')}
        icon="users"
        actions={
          isTeacher || isAdmin ? (
            <Button icon="plus" onClick={() => setCreateOpen(true)}>{t('classes.create')}</Button>
          ) : !isParent ? (
            <a href="#join-class" className={buttonClass('secondary', 'md')}><Icon name="plus" size={17} /> {t('classes.join')}</a>
          ) : null
        }
      />

      {isParent ? (
        <Callout tone="info" title={t('parent.childDetail')}>
          {t('parent.accessNote')} {children.length ? children.map((c) => c.name).join(', ') : t('parent.noChild')}
        </Callout>
      ) : null}

      {!isTeacher && !isAdmin && !isParent ? (
        <SectionCard title={t('classes.findClass')} subtitle={t('classes.joinHint')} icon="link" className="scroll-mt-24">
          <div id="join-class" className="flex flex-col gap-2 sm:flex-row">
            <TextInput
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase())
                setJoinError('')
              }}
              placeholder={t('classes.joinCode')}
              className="font-mono tracking-wide"
              aria-label={t('classes.joinCode')}
              invalid={!!joinError}
            />
            <Button onClick={joinClass} loading={joinBusy} className="shrink-0">{t('classes.join')}</Button>
          </div>
          {joinError ? <p className="mt-1.5 flex items-center gap-1 text-xs text-clay-700" role="alert"><Icon name="alert" size={13} /> {joinError}</p> : null}
          <p className="mt-2 text-[11px] text-ink-500">{t('auth.classCodeHint')}</p>
        </SectionCard>
      ) : null}

      {classes.length === 0 ? (
        <EmptyState
          icon="users"
          title={isParent ? t('parent.noChild') : t('classes.noClasses')}
          description={isTeacher ? t('classes.teacherSub') : isParent ? t('parent.noChildHint') : t('classes.joinHint')}
          action={
            isTeacher || isAdmin ? <Button icon="plus" onClick={() => setCreateOpen(true)}>{t('classes.create')}</Button> : isParent ? <Link to="/parent/link" className={buttonClass('primary')}>{t('parent.linkTitle')}</Link> : null
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {classes.map((cls) => (
            <ClassCard
              key={cls.id}
              cls={cls}
              expanded={expanded === cls.id}
              onToggle={() => setExpanded((prev) => (prev === cls.id ? null : cls.id))}
            />
          ))}
        </div>
      )}

      {isParent && children.length ? (
        <SectionCard title={t('dash.children')} icon="graduation">
          <div className="grid gap-3 sm:grid-cols-2">
            {children.map((child) => {
              const cids = studentClassIds(db, child.id)
              return (
                <div key={child.id} className="rounded-xl border border-ink-200 p-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={child.name} color={child.avatarColor} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink-900">{child.name}</p>
                      <p className="text-[11px] text-ink-500">{cids.map((id) => classById(db, id)?.name).filter(Boolean).join(', ')}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Link to="/attendance" className={buttonClass('secondary', 'sm', 'flex-1')}>{t('nav.attendance')}</Link>
                    <Link to="/marks" className={buttonClass('quiet', 'sm', 'flex-1')}>{t('nav.marks')}</Link>
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>
      ) : null}

      <CreateClassModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}

function ClassCard({ cls, expanded, onToggle }: { cls: ClassRoom; expanded: boolean; onToggle: () => void }) {
  const { db, currentUser, mutate, toast, notify } = useApp()
  const { t, lang } = useI18n()
  const mine = !!currentUser && isClassTeacher(db, currentUser.id, cls.id)
  const students = classStudents(db, cls.id)
  const teacher = db.users.find((u) => u.id === cls.teacherId)
  const threshold = db.schools.find((s) => s.id === cls.schoolId)?.lowAttendanceThreshold ?? 75
  const avgPct = students.length
    ? Math.round(students.reduce((sum, s) => sum + attendanceSummary(db, s.id, cls.id).pct, 0) / students.length)
    : 0

  const removeStudent = (studentId: string, name: string) => {
    if (!window.confirm(t('classes.removeConfirm', { name }))) return
    mutate((draft) => {
      const enr = draft.enrollments.find((e) => e.classId === cls.id && e.studentId === studentId && e.status === 'active')
      if (enr) enr.status = 'removed'
    })
    toast('success', t('classes.removeStudent'), name)
  }

  const exportRoster = () => {
    const rows: Array<Array<string | number>> = [
      ['Roll no', 'Student', 'Email', 'Guardian', 'Attendance %', 'Joined'],
      ...students.map((s) => [s.rollNo || '', s.name, s.email, s.guardianName || '', attendanceSummary(db, s.id, cls.id).pct, s.createdAt.slice(0, 10)]),
    ]
    downloadTextFile(`${cls.name.replace(/[^\w]+/g, '-')}-roster.csv`, toCsv(rows))
    toast('success', t('common.export'), `${students.length} ${t('common.students').toLowerCase()}`)
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-ink-100 bg-gradient-to-br from-ink-50 to-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="text-base font-bold text-ink-900">{cls.name}</h2>
              {mine ? <Badge tone="brand" icon="user">{t('common.teacher')}</Badge> : <Badge tone="neutral" icon="eye">{t('classes.viewOnly')}</Badge>}
              {cls.leaderboardEnabled ? <Badge tone="leaf" icon="award">{t('dash.leaderboard')}</Badge> : null}
            </div>
            <p className="mt-1 text-xs text-ink-500">
              {teacher?.name} · {t('classes.members', { count: students.length })}
            </p>
          </div>
          <Button variant="ghost" size="sm" icon={expanded ? 'chevronDown' : 'chevronRight'} onClick={onToggle} aria-expanded={expanded}>
            {expanded ? t('common.showLess') : t('common.showMore')}
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {cls.subjectIds.map((s) => <SubjectChip key={s} subjectId={s} />)}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-ink-400">{t('classes.code')}</p>
            <p className="font-mono text-xs font-bold tracking-wide text-ink-900">{cls.code}</p>
          </div>
          <div className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-ink-400">{t('att.overall')}</p>
            <p className="text-xs font-bold text-ink-900">{avgPct}%</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex flex-wrap gap-2">
          {currentUser?.role === 'student' ? (
            <>
              <Link to="/live" className={buttonClass('primary', 'sm')}><Icon name="video" size={15} /> {t('nav.live')}</Link>
              <Link to="/materials" className={buttonClass('secondary', 'sm')}>{t('nav.materials')}</Link>
              <Link to="/quizzes" className={buttonClass('secondary', 'sm')}>{t('nav.quizzes')}</Link>
            </>
          ) : null}
          {currentUser?.role === 'parent' ? (
            <>
              <Link to="/attendance" className={buttonClass('primary', 'sm')}>{t('nav.attendance')}</Link>
              <Link to="/marks" className={buttonClass('secondary', 'sm')}>{t('nav.marks')}</Link>
            </>
          ) : null}
          {mine ? (
            <>
              <Link to="/attendance" className={buttonClass('primary', 'sm')}><Icon name="calendar" size={15} /> {t('att.mark')}</Link>
              <Link to="/marks" className={buttonClass('secondary', 'sm')}>{t('marks.enter')}</Link>
              <Link to="/live?schedule=1" className={buttonClass('secondary', 'sm')}>{t('live.schedule')}</Link>
              <CopyButton value={cls.code} label={t('classes.copyCode')} />
              <Button variant="secondary" size="sm" icon="download" onClick={exportRoster}>{t('classes.exportRoster')}</Button>
            </>
          ) : null}
        </div>

        {expanded ? (
          <div className="mt-4 space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-ink-500">{t('classes.roster')}</p>
                <span className="text-[10px] text-ink-400">{students.length} {t('common.students').toLowerCase()}</span>
              </div>
              {mine ? (
                <div className="overflow-x-auto rounded-xl border border-ink-200">
                  <table className="w-full min-w-[460px] text-left text-xs">
                    <thead className="bg-ink-50 text-[10px] uppercase tracking-wide text-ink-500">
                      <tr>
                        <th className="px-2.5 py-2 font-semibold">{t('classes.rollNo')}</th>
                        <th className="px-2.5 py-2 font-semibold">{t('common.student')}</th>
                        <th className="px-2.5 py-2 font-semibold">{t('att.overall')}</th>
                        <th className="px-2.5 py-2 text-right font-semibold">{t('common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                      {students.map((s) => {
                        const summary = attendanceSummary(db, s.id, cls.id)
                        return (
                          <tr key={s.id}>
                            <td className="px-2.5 py-2 tabular-nums text-ink-500">{s.rollNo || '—'}</td>
                            <td className="px-2.5 py-2">
                              <span className="flex items-center gap-2">
                                <Avatar name={s.name} color={s.avatarColor} size="sm" />
                                <span className="min-w-0">
                                  <span className="block truncate font-semibold text-ink-800">{s.name}</span>
                                  <span className="block truncate text-[10px] text-ink-500">{s.guardianName}</span>
                                </span>
                              </span>
                            </td>
                            <td className="px-2.5 py-2">
                              <Badge tone={summary.pct >= threshold ? 'leaf' : 'clay'}>{summary.pct}%</Badge>
                            </td>
                            <td className="px-2.5 py-2 text-right">
                              <button type="button" onClick={() => removeStudent(s.id, s.name)} className="rounded-lg p-1.5 text-ink-400 hover:bg-clay-50 hover:text-clay-700" aria-label={`${t('classes.removeStudent')} ${s.name}`}>
                                <Icon name="trash" size={14} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-ink-200 bg-ink-50 p-3 text-xs text-ink-600">
                  <Icon name="lock" size={14} className="mr-1 inline" />
                  {t('privacy.students')}
                </div>
              )}
            </div>

            {mine ? (
              <div className="rounded-xl border border-ink-200 p-3">
                <Toggle
                  checked={cls.leaderboardEnabled}
                  onChange={(v) => {
                    mutate((draft) => {
                      const c = draft.classes.find((x) => x.id === cls.id)
                      if (c) c.leaderboardEnabled = v
                    })
                    toast('success', t('classes.settings'), v ? t('dash.leaderboard') : t('lb.disabled'))
                  }}
                  label={t('classes.leaderboard')}
                  description={t('classes.leaderboardHint')}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  )
}

function CreateClassModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db, currentUser, mutate, toast } = useApp()
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [gradeLevel, setGradeLevel] = useState(8)
  const [section, setSection] = useState('A')
  const [subjectIds, setSubjectIds] = useState<string[]>(['math', 'science'])
  const [leaderboard, setLeaderboard] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const code = useMemo(() => {
    if (!currentUser) return ''
    const base = name.trim() ? name.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase() : 'VIDYA'
    return `${base}-${gradeLevel}${section}-DEMO`
  }, [name, gradeLevel, section, currentUser])

  const submit = () => {
    if (!currentUser) return
    const next: Record<string, string> = {}
    if (name.trim().length < 3) next.name = t('classes.nameRequired')
    if (!gradeLevel) next.grade = t('classes.gradeRequired')
    if (subjectIds.length === 0) next.subjects = t('common.required')
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }
    const id = uid('cls')
    mutate((draft) => {
      draft.classes.push({
        id,
        name: name.trim() || `Class ${gradeLevel} · Section ${section}`,
        gradeLevel,
        section,
        schoolId: currentUser.schoolId,
        teacherId: currentUser.id,
        subjectIds,
        code,
        leaderboardEnabled: leaderboard,
        createdAt: new Date().toISOString(),
      })
      draft.audit.unshift({
        id: uid('aud'),
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: 'Created class',
        detail: `${name.trim()} (${code})`,
        at: new Date().toISOString(),
      })
    })
    toast('success', t('classes.created'), `${name.trim()} · ${code}`)
    setName('')
    setErrors({})
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('classes.create')}
      description={t('classes.teacherSub')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={submit} icon="plus">{t('common.create')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={t('classes.className')} htmlFor="class-name" required error={errors.name}>
          <TextInput id="class-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={`Class ${gradeLevel} · Section ${section}`} invalid={!!errors.name} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('classes.grade')} htmlFor="class-grade" required>
            <Select id="class-grade" value={gradeLevel} onChange={(e) => setGradeLevel(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => <option key={g} value={g}>Class {g}</option>)}
            </Select>
          </Field>
          <Field label={t('classes.section')} htmlFor="class-section">
            <Select id="class-section" value={section} onChange={(e) => setSection(e.target.value)}>
              {['A', 'B', 'C', 'D'].map((s) => <option key={s} value={s}>Section {s}</option>)}
            </Select>
          </Field>
        </div>
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-semibold text-ink-800">{t('classes.subjects')}</legend>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((s) => {
              const active = subjectIds.includes(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSubjectIds((prev) => (active ? prev.filter((x) => x !== s.id) : [...prev, s.id]))}
                  className={cn('min-h-9 rounded-full border px-3 text-xs font-medium', active ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 text-ink-700 hover:bg-ink-50')}
                >
                  {t(s.nameKey)}
                </button>
              )
            })}
          </div>
          {errors.subjects ? <p className="mt-1 text-xs text-clay-700">{errors.subjects}</p> : null}
        </fieldset>
        <div className="rounded-xl border border-ink-200 bg-ink-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{t('classes.code')}</p>
          <p className="mt-0.5 font-mono text-sm font-bold tracking-wide text-ink-900">{code}</p>
          <p className="mt-1 text-[10px] text-ink-500">{t('auth.teacherCodeHint')}</p>
        </div>
        <Toggle checked={leaderboard} onChange={setLeaderboard} label={t('classes.leaderboard')} description={t('classes.leaderboardHint')} />
      </div>
    </Modal>
  )
}
