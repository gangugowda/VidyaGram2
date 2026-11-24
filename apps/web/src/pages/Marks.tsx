import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../lib/store'
import { useI18n } from '../lib/i18n'
import {
  classAverage,
  classStudents,
  guardianChildren,
  marksForStudent,
  subjectProgress,
  visibleClasses,
} from '../lib/access'
import { subjectLabel, formatDate, gradeFromPercent, gradeTone, todayISO, uid } from '../lib/utils'
import type { Assessment, AssessmentType } from '../lib/types'
import { Icon } from '../components/Icon'
import {
  Avatar,
  Badge,
  BarChart,
  Button,
  Callout,
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
} from '../components/ui'

const ASSESSMENT_LABEL: Record<AssessmentType, string> = {
  'unit-test': 'marks.unitTest',
  exam: 'marks.exam',
  assignment: 'marks.assignment',
  project: 'marks.project',
}

export function MarksPage() {
  const { db, currentUser, mutate, toast, notify } = useApp()
  const { t, lang } = useI18n()
  const [classFilter, setClassFilter] = useState('all')
  const [childId, setChildId] = useState('')
  const [classId, setClassId] = useState('')
  const [assessmentId, setAssessmentId] = useState('')
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  if (!currentUser) return null
  const isTeacher = currentUser.role === 'teacher' || currentUser.role === 'admin'
  const isParent = currentUser.role === 'parent'
  const children = isParent ? guardianChildren(db, currentUser.id) : []
  const child = children.find((c) => c.id === childId) || children[0]
  const viewedStudentId = isParent ? child?.id : currentUser.id
  const classes = visibleClasses(db, currentUser)
  const activeClassId = classId || classes[0]?.id || ''
  const activeClass = classes.find((c) => c.id === activeClassId)
  const assessments = useMemo(
    () => db.assessments.filter((a) => a.classId === activeClassId).sort((a, b) => b.date.localeCompare(a.date)),
    [db, activeClassId],
  )
  const visibleAssessments = assessments.filter((a) => a.published || isTeacher)
  const selected = assessments.find((a) => a.id === assessmentId) || visibleAssessments[0]
  const students = useMemo(() => (activeClass ? classStudents(db, activeClass.id) : []), [db, activeClass])

  useEffect(() => {
    if (!selected) {
      setDraft({})
      return
    }
    const next: Record<string, string> = {}
    for (const student of students) {
      const mark = db.marks.find((m) => m.assessmentId === selected.id && m.studentId === student.id)
      next[student.id] = mark ? String(mark.marks) : ''
    }
    setDraft(next)
    setError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, students.length])

  /* --------------------------------------------------------------- teacher */
  if (isTeacher) {
    const entered = students.filter((s) => draft[s.id] !== undefined && draft[s.id] !== '').length
    const missing = students.length - entered

    const saveMarks = () => {
      if (!selected) return
      for (const student of students) {
        const raw = draft[student.id]
        if (raw === undefined || raw === '') continue
        const value = Number(raw)
        if (!Number.isFinite(value) || value < 0 || value > selected.maxMarks) {
          setError(t('marks.invalid'))
          return
        }
      }
      setError('')
      mutate((d) => {
        const assessment = d.assessments.find((a) => a.id === selected.id)
        if (assessment) assessment.graded = true
        for (const student of students) {
          const raw = draft[student.id]
          if (raw === undefined || raw === '') continue
          const value = Number(raw)
          const existing = d.marks.find((m) => m.assessmentId === selected.id && m.studentId === student.id)
          const grade = gradeFromPercent((value / selected.maxMarks) * 100)
          if (existing) {
            existing.marks = value
            existing.grade = grade
            existing.updatedBy = currentUser.id
            existing.updatedAt = new Date().toISOString()
          } else {
            d.marks.push({
              id: uid('mk'),
              assessmentId: selected.id,
              studentId: student.id,
              marks: value,
              grade,
              updatedBy: currentUser.id,
              updatedAt: new Date().toISOString(),
            })
          }
        }
      })
      toast('success', t('marks.saved'), selected.title)
    }

    const publish = (assessment: Assessment) => {
      mutate((d) => {
        const a = d.assessments.find((x) => x.id === assessment.id)
        if (a) a.published = true
      })
      for (const student of students) {
        notify(student.id, 'marks', t('marks.publishedOn', { date: assessment.title }), t('marks.yourScore'), '/marks')
        for (const link of db.parentLinks.filter((l) => l.studentId === student.id && l.status === 'approved')) {
          notify(link.parentId, 'marks', `${student.name.split(' ')[0]} · ${assessment.title}`, t('marks.publishedOn', { date: formatDate(todayISO(), lang) }), '/marks')
        }
      }
      toast('success', t('marks.published'), assessment.title)
    }

    return (
      <div className="space-y-4 sm:space-y-5">
        <PageHeader
          title={t('marks.title')}
          subtitle={t('marks.teacherSub')}
          icon="chart"
          actions={<Button icon="plus" onClick={() => setCreateOpen(true)} disabled={!activeClass}>{t('marks.createAssessment')}</Button>}
        />

        {!classes.length ? (
          <EmptyState icon="users" title={t('classes.noClasses')} description={t('classes.teacherSub')} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label={t('marks.assessments')} value={assessments.length} icon="clipboard" tone="brand" />
              <StatCard label={t('common.published')} value={assessments.filter((a) => a.published).length} icon="checkCircle" tone="leaf" />
              <StatCard label={t('marks.classAverage')} value={`${classAverage(db, activeClassId)}%`} icon="chart" tone="saffron" />
              <StatCard label={t('marks.missingMarks', { count: missing })} value={students.length ? `${entered}/${students.length}` : '—'} icon="edit" tone={missing ? 'clay' : 'leaf'} />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <SectionCard title={t('marks.enter')} subtitle={t('marks.publishHint')} icon="edit" className="lg:col-span-2">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t('common.class')} htmlFor="marks-class">
                    <Select id="marks-class" value={activeClassId} onChange={(e) => { setClassId(e.target.value); setAssessmentId('') }}>
                      {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                  </Field>
                  <Field label={t('marks.selectAssessment')} htmlFor="marks-assessment">
                    <Select id="marks-assessment" value={selected?.id || ''} onChange={(e) => setAssessmentId(e.target.value)}>
                      {visibleAssessments.length ? null : <option value="">{t('marks.noAssessments')}</option>}
                      {visibleAssessments.map((a) => (
                        <option key={a.id} value={a.id}>{a.title} · {a.maxMarks}</option>
                      ))}
                    </Select>
                  </Field>
                </div>

                {selected ? (
                  <>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge tone={selected.published ? 'leaf' : 'neutral'} icon={selected.published ? 'checkCircle' : 'lock'}>
                        {selected.published ? t('common.published') : t('marks.notPublished')}
                      </Badge>
                      <Badge tone="brand">{t(ASSESSMENT_LABEL[selected.type])}</Badge>
                      <span className="text-[11px] text-ink-500">{formatDate(selected.date, lang)} · {t('marks.maxMarks')} {selected.maxMarks}</span>
                      {entered === students.length && students.length > 0 ? <Badge tone="leaf" icon="check">{t('labs.completed')}</Badge> : null}
                    </div>

                    {error ? <div className="mt-3"><Callout tone="danger" title={error} /></div> : null}

                    <ul className="mt-3 divide-y divide-ink-100">
                      {students.map((student) => {
                        const value = draft[student.id] ?? ''
                        const numeric = Number(value)
                        const pct = value !== '' && Number.isFinite(numeric) ? (numeric / selected.maxMarks) * 100 : null
                        return (
                          <li key={student.id} className="flex flex-wrap items-center gap-2 py-2">
                            <Avatar name={student.name} color={student.avatarColor} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-ink-900">{student.name}</p>
                              <p className="text-[10px] text-ink-500">{t('classes.rollNo')} {student.rollNo || '—'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="sr-only" htmlFor={`mark-${student.id}`}>{t('marks.marks')} {student.name}</label>
                              <TextInput
                                id={`mark-${student.id}`}
                                type="number"
                                min={0}
                                max={selected.maxMarks}
                                value={value}
                                onChange={(e) => setDraft((prev) => ({ ...prev, [student.id]: e.target.value }))}
                                className="w-20 text-center"
                                placeholder="—"
                              />
                              <span className="text-xs text-ink-400">/ {selected.maxMarks}</span>
                              {pct !== null ? (
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${gradeTone(gradeFromPercent(pct))}`}>{gradeFromPercent(pct)}</span>
                              ) : null}
                            </div>
                          </li>
                        )
                      })}
                    </ul>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button onClick={saveMarks} icon="check">{t('common.save')}</Button>
                      {!selected.published ? (
                        <Button variant="secondary" icon="eye" onClick={() => publish(selected)}>{t('marks.publish')}</Button>
                      ) : null}
                      <span className="text-[10px] text-ink-400">{t('marks.privacyNote')}</span>
                    </div>
                  </>
                ) : (
                  <EmptyState icon="clipboard" title={t('marks.noAssessments')} description={t('marks.selectAssessment')} action={<Button icon="plus" onClick={() => setCreateOpen(true)}>{t('marks.createAssessment')}</Button>} />
                )}
              </SectionCard>

              <div className="space-y-4">
                <SectionCard title={t('marks.assessments')} icon="clipboard">
                  {assessments.length ? (
                    <ul className="divide-y divide-ink-100">
                      {assessments.slice(0, 8).map((assessment) => (
                        <li key={assessment.id} className="py-2 first:pt-0 last:pb-0">
                          <button
                            type="button"
                            onClick={() => setAssessmentId(assessment.id)}
                            className="flex w-full items-start justify-between gap-2 text-left"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-semibold text-ink-800">{assessment.title}</span>
                              <span className="text-[10px] text-ink-500">{subjectLabel(assessment.subjectId, t)} · {formatDate(assessment.date, lang)}</span>
                            </span>
                            <Badge tone={assessment.published ? 'leaf' : 'neutral'}>{assessment.published ? t('common.published') : t('common.draft')}</Badge>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-ink-500">{t('marks.noAssessments')}</p>
                  )}
                </SectionCard>

                <SectionCard title={t('marks.subjectProgress')} icon="chart">
                  <BarChart
                    data={activeClass?.subjectIds.map((subjectId) => {
                      const ids = assessments.filter((a) => a.subjectId === subjectId && a.published).map((a) => a.id)
                      const rows = db.marks.filter((m) => ids.includes(m.assessmentId))
                      const earned = rows.reduce((s, m) => s + m.marks, 0)
                      const max = rows.reduce((s, m) => s + (db.assessments.find((a) => a.id === m.assessmentId)?.maxMarks || 0), 0)
                      return { label: subjectLabel(subjectId, t), value: max ? Math.round((earned / max) * 100) : 0 }
                    }) || []}
                  />
                  <p className="mt-2 text-[10px] text-ink-400">{t('marks.publishHint')}</p>
                </SectionCard>

                <Callout tone="brand" icon="shield" title={t('marks.confidential')}>{t('marks.privacyNote')}</Callout>
              </div>
            </div>

            {createOpen ? (
              <CreateAssessmentModal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                classId={activeClassId}
                subjectIds={activeClass?.subjectIds || []}
                onCreated={(id) => setAssessmentId(id)}
              />
            ) : null}
          </>
        )}
      </div>
    )
  }

  /* ------------------------------------------------------- student / parent */
  if (isParent && !child) {
    return (
      <div>
        <PageHeader title={t('marks.title')} subtitle={t('marks.parentSub')} icon="chart" />
        <EmptyState icon="users" title={t('parent.noChild')} description={t('parent.noChildHint')} action={<a href="/parent/link" className="inline-flex min-h-11 items-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white">{t('auth.linkChild')}</a>} />
      </div>
    )
  }
  if (!viewedStudentId) return null

  const rows = marksForStudent(db, viewedStudentId).filter(({ assessment }) => classFilter === 'all' || assessment.classId === classFilter)
  const progress = subjectProgress(db, viewedStudentId)
  const average = rows.length ? Math.round(rows.reduce((s, r) => s + (r.mark.marks / r.assessment.maxMarks) * 100, 0) / rows.length) : 0
  const best = [...progress].sort((a, b) => b.pct - a.pct)[0]
  const focus = [...progress].sort((a, b) => a.pct - b.pct)[0]
  const studentClasses = classes

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('marks.title')}
        subtitle={isParent ? t('marks.parentSub') : t('marks.sub')}
        eyebrow={isParent ? child?.name : currentUser.name}
        icon="chart"
        actions={
          <div className="flex flex-wrap gap-2">
            {isParent ? (
              <Select value={child?.id || ''} onChange={(e) => setChildId(e.target.value)} aria-label={t('marks.viewChild')}>
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
        <StatCard label={t('marks.average')} value={`${average}%`} hint={t('marks.assessments')} icon="chart" tone={average >= 75 ? 'leaf' : average >= 50 ? 'brand' : 'saffron'} />
        <StatCard label={t('marks.bestSubject')} value={best ? subjectLabel(best.subjectId, t) : '—'} hint={best ? `${best.pct}%` : ''} icon="star" tone="leaf" />
        <StatCard label={t('marks.focusSubject')} value={focus ? subjectLabel(focus.subjectId, t) : '—'} hint={focus ? `${focus.pct}%` : ''} icon="alert" tone="saffron" />
        <StatCard label={t('marks.assessments')} value={rows.length} hint={t('marks.bySubject')} icon="clipboard" tone="brand" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title={t('marks.subjectProgress')} subtitle={t('marks.overview')} icon="chart" className="lg:col-span-1">
          {progress.length ? (
            <div className="space-y-3">
              {progress.map((row) => (
                <div key={row.subjectId}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-ink-700">{subjectLabel(row.subjectId, t)}</span>
                    <span className="font-bold tabular-nums text-ink-800">{row.pct}%</span>
                  </div>
                  <ProgressBar value={row.pct} tone={row.pct >= 75 ? 'leaf' : row.pct >= 50 ? 'brand' : 'saffron'} showValue={false} size="sm" />
                  <p className="mt-0.5 text-[10px] text-ink-400">{row.count} {t('marks.assessments').toLowerCase()}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink-500">{t('marks.noData')}</p>
          )}
        </SectionCard>

        <SectionCard title={t('marks.assessments')} subtitle={t('marks.publishedOn', { date: '' }).trim()} icon="clipboard" className="lg:col-span-2">
          {rows.length ? (
            <ul className="divide-y divide-ink-100">
              {rows.map(({ mark, assessment }) => {
                const pct = (mark.marks / assessment.maxMarks) * 100
                return (
                  <li key={mark.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone="brand">{subjectLabel(assessment.subjectId, t)}</Badge>
                          <Badge tone="neutral">{t(ASSESSMENT_LABEL[assessment.type])}</Badge>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-ink-900">{assessment.title}</p>
                        <p className="text-[10px] text-ink-500">{formatDate(assessment.date, lang)} · {t('marks.maxMarks')} {assessment.maxMarks}</p>
                        {mark.remarks ? <p className="mt-1 rounded-lg bg-ink-50 px-2 py-1.5 text-[11px] text-ink-600"><span className="font-semibold">{t('marks.remarks')}:</span> {mark.remarks}</p> : null}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold tabular-nums text-ink-900">{mark.marks}<span className="text-xs font-medium text-ink-400">/{assessment.maxMarks}</span></p>
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${gradeTone(mark.grade)}`}>{mark.grade}</span>
                        <p className="mt-0.5 text-[10px] text-ink-400">{Math.round(pct)}%</p>
                      </div>
                    </div>
                    <ProgressBar value={pct} tone={pct >= 75 ? 'leaf' : pct >= 50 ? 'brand' : 'saffron'} showValue={false} size="sm" />
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState icon="chart" title={t('marks.noData')} description={t('marks.publishHint')} />
          )}
        </SectionCard>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Callout tone="brand" icon="shield" title={t('marks.confidential')}>{t('marks.privacyNote')}</Callout>
        <Callout tone="info" icon="info" title={t('marks.publishHint')}>{t('marks.notPublished')}</Callout>
      </div>
    </div>
  )
}

function CreateAssessmentModal({
  open,
  onClose,
  classId,
  subjectIds,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  classId: string
  subjectIds: string[]
  onCreated: (id: string) => void
}) {
  const { currentUser, mutate, toast } = useApp()
  const { t } = useI18n()
  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState(subjectIds[0] || 'math')
  const [type, setType] = useState<AssessmentType>('unit-test')
  const [date, setDate] = useState(todayISO())
  const [maxMarks, setMaxMarks] = useState(40)
  const [publishNow, setPublishNow] = useState(false)
  const [error, setError] = useState('')

  const submit = () => {
    if (!currentUser) return
    if (title.trim().length < 3 || !subjectId || maxMarks <= 0) {
      setError(t('common.required'))
      return
    }
    const id = uid('as')
    mutate((draft) => {
      draft.assessments.unshift({
        id,
        classId,
        subjectId,
        title: title.trim(),
        type,
        date,
        maxMarks,
        published: publishNow,
        graded: false,
        createdBy: currentUser.id,
        createdAt: new Date().toISOString(),
      })
    })
    toast('success', t('common.saved'), title.trim())
    setTitle('')
    setError('')
    onCreated(id)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('marks.createAssessment')}
      description={t('marks.publishHint')}
      footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={submit} icon="check">{t('common.save')}</Button></>}
    >
      <div className="space-y-3">
        {error ? <Callout tone="danger" title={error} /> : null}
        <Field label={t('marks.assessmentTitle')} htmlFor="as-title" required>
          <TextInput id="as-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('common.subject')} htmlFor="as-subject" required>
            <Select id="as-subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {subjectIds.map((s) => <option key={s} value={s}>{subjectLabel(s, t)}</option>)}
            </Select>
          </Field>
          <Field label={t('marks.type')} htmlFor="as-type">
            <Select id="as-type" value={type} onChange={(e) => setType(e.target.value as AssessmentType)}>
              {Object.entries(ASSESSMENT_LABEL).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
            </Select>
          </Field>
          <Field label={t('common.date')} htmlFor="as-date">
            <TextInput id="as-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label={t('marks.maxMarks')} htmlFor="as-max" required>
            <TextInput id="as-max" type="number" min={1} max={200} value={maxMarks} onChange={(e) => setMaxMarks(Number(e.target.value))} />
          </Field>
        </div>
        <Toggle checked={publishNow} onChange={setPublishNow} label={t('marks.publish')} description={t('marks.publishHint')} />
      </div>
    </Modal>
  )
}
