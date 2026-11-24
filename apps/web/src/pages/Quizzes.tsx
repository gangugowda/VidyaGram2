import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApp } from '../lib/store'
import { useI18n } from '../lib/i18n'
import {
  attemptsForQuiz,
  openQuizzesFor,
  quizMaxScore,
  quizResultsVisible,
  studentClassIds,
  visibleClasses,
} from '../lib/access'
import { formatDate, subjectLabel, todayISO, uid } from '../lib/utils'
import type { Question, Quiz } from '../lib/types'
import { Icon } from '../components/Icon'
import { QuizRow, SubjectChip } from '../components/shared'
import {
  Badge,
  Button,
  Callout,
  Checkbox,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  SectionCard,
  Select,
  Tabs,
  TextArea,
  TextInput,
  Toggle,
  buttonClass,
} from '../components/ui'

export function QuizzesPage() {
  const { db, currentUser, mutate, toast } = useApp()
  const { t, lang } = useI18n()
  const [params] = useSearchParams()
  const [tab, setTab] = useState<'open' | 'submitted' | 'all'>('open')
  const [classFilter, setClassFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(params.get('create') === '1')

  if (!currentUser) return null
  const classes = visibleClasses(db, currentUser)
  const classIds = new Set(classes.map((c) => c.id))
  const isStudent = currentUser.role === 'student'
  const canManage = currentUser.role === 'teacher' || currentUser.role === 'admin'

  const published = db.quizzes.filter((q) => classIds.has(q.classId) && (canManage || q.published))
  const attemptedIds = new Set(db.attempts.filter((a) => a.studentId === currentUser.id).map((a) => a.quizId))
  const open = isStudent ? openQuizzesFor(db, currentUser.id).filter((q) => classFilter === 'all' || q.classId === classFilter) : published.filter((q) => q.published)

  const list = useMemo(() => {
    const base = published.filter((q) => classFilter === 'all' || q.classId === classFilter)
    if (!isStudent) return base.sort((a, b) => Number(a.published) - Number(b.published) || b.createdAt.localeCompare(a.createdAt))
    if (tab === 'open') return open
    if (tab === 'submitted') return base.filter((q) => attemptedIds.has(q.id))
    return base
  }, [published, classFilter, isStudent, tab, open, attemptedIds])

  const togglePublish = (quiz: Quiz) => {
    mutate((draft) => {
      const q = draft.quizzes.find((x) => x.id === quiz.id)
      if (q) q.published = !q.published
    })
    toast('success', quiz.published ? t('common.draft') : t('quiz.published'))
  }

  const remove = (quiz: Quiz) => {
    if (!window.confirm(t('quiz.deleteConfirm'))) return
    mutate((draft) => {
      draft.quizzes = draft.quizzes.filter((q) => q.id !== quiz.id)
      draft.attempts = draft.attempts.filter((a) => a.quizId !== quiz.id)
    })
    toast('success', t('quiz.deleted'))
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('quiz.title')}
        subtitle={canManage ? t('quiz.teacherSub') : t('quiz.sub')}
        icon="clipboard"
        actions={canManage ? <Button icon="plus" onClick={() => setCreateOpen(true)}>{t('quiz.create')}</Button> : null}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {isStudent ? (
          <Tabs
            items={[
              { id: 'open', label: t('quiz.pending'), count: open.length },
              { id: 'submitted', label: t('quiz.submitted'), count: published.filter((q) => attemptedIds.has(q.id)).length },
              { id: 'all', label: t('quiz.all'), count: published.length },
            ]}
            value={tab}
            onChange={(id) => setTab(id as typeof tab)}
            className="flex-1"
          />
        ) : (
          <Tabs
            items={[
              { id: 'open', label: t('common.published'), count: published.filter((q) => q.published).length },
              { id: 'submitted', label: t('common.draft'), count: published.filter((q) => !q.published).length },
              { id: 'all', label: t('common.all'), count: published.length },
            ]}
            value={tab}
            onChange={(id) => setTab(id as typeof tab)}
            className="flex-1"
          />
        )}
        {classes.length > 1 ? (
          <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="sm:w-60" aria-label={t('common.class')}>
            <option value="all">{t('common.all')} {t('common.class').toLowerCase()}es</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        ) : null}
      </div>

      {canManage ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: t('common.published'), value: published.filter((q) => q.published).length, icon: 'checkCircle' as const },
            { label: t('common.draft'), value: published.filter((q) => !q.published).length, icon: 'edit' as const },
            { label: t('quiz.submitted'), value: db.attempts.filter((a) => published.some((q) => q.id === a.quizId)).length, icon: 'clipboard' as const },
            { label: t('quiz.viewAttempts'), value: published.reduce((s, q) => s + attemptsForQuiz(db, q.id).length, 0), icon: 'chart' as const },
          ].map((s) => (
            <div key={s.label} className="card flex items-center gap-2.5 p-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700"><Icon name={s.icon} size={16} /></span>
              <div><p className="text-[10px] text-ink-500">{s.label}</p><p className="text-lg font-bold tabular-nums text-ink-900">{s.value}</p></div>
            </div>
          ))}
        </div>
      ) : null}

      {isStudent && !open.length && tab === 'open' ? (
        <Callout tone="success" icon="checkCircle" title={t('quiz.noPending')}>{t('dash.allCaughtUp')}</Callout>
      ) : null}

      {list.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((quiz) => {
            const attempts = attemptsForQuiz(db, quiz.id, isStudent ? currentUser.id : undefined)
            const used = attempts.length
            const visible = quizResultsVisible(quiz)
            const latest = attempts[0]
            return (
              <QuizRow
                key={quiz.id}
                quiz={quiz}
                status={!quiz.published ? t('common.draft') : quizResultsVisible(quiz) ? t('common.results') : undefined}
                action={
                  <div className="flex flex-col items-stretch gap-1.5">
                    {isStudent ? (
                      <>
                        {quiz.published && used < quiz.attemptsAllowed ? (
                          <Link to={`/quizzes/${quiz.id}`} className={buttonClass('primary', 'sm')}>{used ? t('quiz.start') : t('quiz.start')}</Link>
                        ) : null}
                        {latest ? (
                          visible ? (
                            <Link to={`/quizzes/${quiz.id}`} className={buttonClass('secondary', 'sm')}>
                              {t('common.results')} · {latest.score}/{latest.maxScore}
                            </Link>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-2 py-1.5 text-[10px] text-ink-500"><Icon name="lock" size={12} /> {t('marks.notPublished')}</span>
                          )
                        ) : null}
                        <span className="text-center text-[10px] text-ink-400">{used}/{quiz.attemptsAllowed} {t('quiz.attemptsUsed').toLowerCase()}</span>
                      </>
                    ) : (
                      <>
                        <Link to={`/quizzes/${quiz.id}`} className={buttonClass('secondary', 'sm')}>{t('quiz.viewAttempts')} ({attemptsForQuiz(db, quiz.id).length})</Link>
                        <Button size="sm" variant="ghost" onClick={() => togglePublish(quiz)}>{quiz.published ? t('common.unpublish') : t('common.publish')}</Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(quiz)} aria-label={t('common.delete')}><Icon name="trash" size={14} /></Button>
                      </>
                    )}
                  </div>
                }
              />
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon="clipboard"
          title={isStudent ? (tab === 'submitted' ? t('quiz.noAttemptsYet') : t('quiz.noPending')) : t('common.noData')}
          description={canManage ? t('quiz.teacherSub') : t('quiz.sub')}
          action={canManage ? <Button icon="plus" onClick={() => setCreateOpen(true)}>{t('quiz.create')}</Button> : null}
        />
      )}

      {canManage ? <CreateQuizModal open={createOpen} onClose={() => setCreateOpen(false)} classes={classes} /> : null}
    </div>
  )
}

const emptyQuestion = (type: Question['type']): Question => ({
  id: uid('q'),
  type,
  prompt: '',
  options: type === 'mcq' ? ['', '', '', ''] : undefined,
  answer: '',
  accept: [],
  explanation: '',
  points: 1,
})

function CreateQuizModal({ open, onClose, classes }: { open: boolean; onClose: () => void; classes: ReturnType<typeof visibleClasses> }) {
  const { db, currentUser, mutate, toast } = useApp()
  const { t } = useI18n()
  const [title, setTitle] = useState('')
  const [classId, setClassId] = useState(classes[0]?.id || '')
  const [subjectId, setSubjectId] = useState(classes[0]?.subjectIds[0] || 'math')
  const [instructions, setInstructions] = useState('')
  const [openAt, setOpenAt] = useState(todayISO())
  const [dueAt, setDueAt] = useState('')
  const [attemptsAllowed, setAttemptsAllowed] = useState(1)
  const [timeLimitMin, setTimeLimitMin] = useState(15)
  const [showResults, setShowResults] = useState<Quiz['showResults']>('immediately')
  const [showAnswers, setShowAnswers] = useState(true)
  const [published, setPublished] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([emptyQuestion('mcq')])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateQuestion = (index: number, patch: Partial<Question>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)))
  }

  const submit = () => {
    if (!currentUser) return
    const next: Record<string, string> = {}
    if (title.trim().length < 3 || !classId || !subjectId) next.required = t('quiz.required')
    if (openAt && dueAt && dueAt < openAt) next.dates = t('quiz.dueBeforeOpen')
    for (const q of questions) {
      if (!q.prompt.trim() || !q.answer.trim()) next.questions = t('common.required')
      if (q.type === 'mcq' && (q.options || []).filter((o) => o.trim()).length < 2) next.questions = t('common.required')
    }
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }
    mutate((draft) => {
      draft.quizzes.unshift({
        id: uid('quiz'),
        classId,
        subjectId,
        title: title.trim(),
        instructions: instructions.trim() || t('quiz.instructions'),
        published,
        openAt: openAt || undefined,
        dueAt: dueAt || undefined,
        showResults,
        showAnswers,
        resultsReleased: showResults === 'immediately' ? true : false,
        attemptsAllowed,
        timeLimitMin,
        questions: questions.map((q) => ({
          ...q,
          prompt: q.prompt.trim(),
          answer: q.answer.trim(),
          options: q.type === 'mcq' ? (q.options || []).map((o) => o.trim()).filter(Boolean) : undefined,
        })),
        createdBy: currentUser.id,
        createdAt: new Date().toISOString(),
        language: currentUser.language,
      })
      for (const student of draft.users.filter((u) => u.role === 'student' && draft.enrollments.some((e) => e.classId === classId && e.studentId === u.id && e.status === 'active'))) {
        if (!published) break
        draft.notifications.unshift({
          id: uid('notif'),
          userId: student.id,
          kind: 'quiz',
          title: `${t('quiz.title')}: ${title.trim()}`,
          body: `${db.classes.find((c) => c.id === classId)?.name || ''} · ${attemptsAllowed} ${t('quiz.attemptsAllowed').toLowerCase()}`,
          link: '/quizzes',
          read: false,
          createdAt: new Date().toISOString(),
        })
      }
    })
    toast('success', published ? t('quiz.published') : t('common.draft'), title.trim())
    setTitle('')
    setInstructions('')
    setQuestions([emptyQuestion('mcq')])
    setErrors({})
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('quiz.create')}
      description={t('quiz.teacherSub')}
      size="xl"
      footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={submit} icon="check">{published ? t('common.publish') : t('common.save')}</Button></>}
    >
      <div className="space-y-4">
        {errors.required ? <Callout tone="danger" title={errors.required} /> : null}
        {errors.questions ? <Callout tone="danger" title={errors.questions} /> : null}
        {errors.dates ? <Callout tone="danger" title={errors.dates} /> : null}
        <Field label={t('live.name')} htmlFor="quiz-title" required>
          <TextInput id="quiz-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('common.class')} htmlFor="quiz-class" required>
            <Select id="quiz-class" value={classId} onChange={(e) => { setClassId(e.target.value); setSubjectId(classes.find((c) => c.id === e.target.value)?.subjectIds[0] || 'math') }}>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label={t('common.subject')} htmlFor="quiz-subject" required>
            <Select id="quiz-subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {(classes.find((c) => c.id === classId)?.subjectIds || []).map((s) => <option key={s} value={s}>{subjectLabel(s, t)}</option>)}
            </Select>
          </Field>
        </div>
        <Field label={t('common.instructions')} htmlFor="quiz-instructions">
          <TextArea id="quiz-instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label={t('quiz.openAt') || 'Opens'} htmlFor="quiz-open">
            <TextInput id="quiz-open" type="date" value={openAt} onChange={(e) => setOpenAt(e.target.value)} />
          </Field>
          <Field label={t('common.due')} htmlFor="quiz-due">
            <TextInput id="quiz-due" type="date" value={dueAt} min={openAt} onChange={(e) => setDueAt(e.target.value)} />
          </Field>
          <Field label={t('quiz.attemptsAllowed')} htmlFor="quiz-attempts">
            <TextInput id="quiz-attempts" type="number" min={1} max={5} value={attemptsAllowed} onChange={(e) => setAttemptsAllowed(Number(e.target.value))} />
          </Field>
          <Field label={t('quiz.timeLimit', { min: '' }).replace('  ', ' ')} htmlFor="quiz-time">
            <TextInput id="quiz-time" type="number" min={1} value={timeLimitMin} onChange={(e) => setTimeLimitMin(Number(e.target.value))} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('quiz.showResults')} htmlFor="quiz-visibility">
            <Select id="quiz-visibility" value={showResults} onChange={(e) => setShowResults(e.target.value as Quiz['showResults'])}>
              <option value="immediately">{t('quiz.immediate')}</option>
              <option value="after_due">{t('quiz.afterDueShort')}</option>
              <option value="manual">{t('quiz.manualShort')}</option>
            </Select>
          </Field>
          <div className="space-y-2 pt-5">
            <Toggle checked={showAnswers} onChange={setShowAnswers} label={t('quiz.showAnswers')} />
            <Toggle checked={published} onChange={setPublished} label={t('common.publish')} description={t('quiz.publishHint')} />
          </div>
        </div>

        <div className="rounded-xl border border-ink-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-ink-900">{t('quiz.builder')} <span className="text-xs font-normal text-ink-500">({questions.length})</span></p>
            <div className="flex gap-1.5">
              <Button size="sm" variant="secondary" icon="plus" onClick={() => setQuestions((q) => [...q, emptyQuestion('mcq')])}>{t('quiz.addMcq')}</Button>
              <Button size="sm" variant="secondary" icon="plus" onClick={() => setQuestions((q) => [...q, emptyQuestion('fill')])}>{t('quiz.addFill')}</Button>
            </div>
          </div>
          <div className="mt-3 space-y-3">
            {questions.map((q, index) => (
              <div key={q.id} className="rounded-xl border border-ink-200 bg-ink-50/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={q.type === 'mcq' ? 'brand' : 'leaf'}>{q.type === 'mcq' ? t('quiz.addMcq') : t('quiz.addFill')} · {index + 1}</Badge>
                  <button type="button" onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== index))} disabled={questions.length === 1} className="rounded p-1 text-ink-400 hover:bg-clay-50 hover:text-clay-700 disabled:opacity-40" aria-label={t('common.delete')}>
                    <Icon name="trash" size={14} />
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  <TextInput value={q.prompt} onChange={(e) => updateQuestion(index, { prompt: e.target.value })} placeholder={t('quiz.question')} aria-label={t('quiz.question')} />
                  {q.type === 'mcq' ? (
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {(q.options || []).map((opt, oi) => (
                        <TextInput
                          key={oi}
                          value={opt}
                          onChange={(e) => updateQuestion(index, { options: (q.options || []).map((x, xi) => (xi === oi ? e.target.value : x)) })}
                          placeholder={t('quiz.option', { n: oi + 1 })}
                          aria-label={t('quiz.option', { n: oi + 1 })}
                        />
                      ))}
                    </div>
                  ) : null}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <TextInput value={q.answer} onChange={(e) => updateQuestion(index, { answer: e.target.value })} placeholder={t('quiz.answer')} aria-label={t('quiz.answer')} />
                    <TextInput value={q.explanation} onChange={(e) => updateQuestion(index, { explanation: e.target.value })} placeholder={t('quiz.explanation')} aria-label={t('quiz.explanation')} />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-ink-500">{t('common.points')}</label>
                    <TextInput type="number" min={1} max={10} value={q.points} onChange={(e) => updateQuestion(index, { points: Number(e.target.value) })} className="w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <Callout tone="info" title={t('quiz.requiresInternet')}>{t('quiz.sampleContent')}</Callout>
      </div>
    </Modal>
  )
}
