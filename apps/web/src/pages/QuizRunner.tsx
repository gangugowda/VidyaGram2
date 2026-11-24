import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../lib/store'
import { useI18n } from '../lib/i18n'
import {
  attemptsForQuiz,
  classById,
  quizResultsVisible,
  studentClassIds,
  userById,
} from '../lib/access'
import { gradeQuiz, isAnswerCorrect } from '../lib/quiz'
import { ApiRequestError } from '../lib/api'
import { formatDateTime, subjectLabel, uid } from '../lib/utils'
import type { Attempt, Quiz } from '../lib/types'
import { Icon } from '../components/Icon'
import { SubjectChip } from '../components/shared'
import {
  Badge,
  Button,
  Callout,
  EmptyState,
  PageHeader,
  ProgressBar,
  SectionCard,
  TextInput,
  buttonClass,
} from '../components/ui'

const formatClock = (seconds: number) => {
  const safe = Math.max(0, seconds)
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

export function QuizRunnerPage() {
  const { id } = useParams<{ id: string }>()
  const { db, currentUser, online, queueOffline, mutate, toast, notify, awardBadge, dataMode, submitQuizAttempt, releaseQuiz } = useApp()
  const { t, lang } = useI18n()
  const navigate = useNavigate()

  const [running, setRunning] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submittedRef = useRef(false)

  const quiz = db.quizzes.find((q) => q.id === id)
  const cls = quiz ? classById(db, quiz.classId) : undefined
  const enroled = !!currentUser && !!quiz && studentClassIds(db, currentUser.id).includes(quiz.classId)
  const myAttempts = useMemo(
    () => (quiz && currentUser ? attemptsForQuiz(db, quiz.id, currentUser.id) : []),
    [db, quiz, currentUser],
  )
  const used = myAttempts.length
  const visible = quiz ? quizResultsVisible(quiz) : false
  const latest = myAttempts[0]

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [running])

  useEffect(() => {
    if (running && secondsLeft === 0 && !submittedRef.current) {
      void submitAttempt(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, running])

  if (!currentUser) return null

  if (!quiz) {
    return (
      <div>
        <PageHeader title={t('quiz.title')} icon="clipboard" />
        <EmptyState
          icon="clipboard"
          title={t('state.notFoundTitle')}
          description={t('state.notFoundBody')}
          action={<Link to="/quizzes" className={buttonClass('primary')}>{t('common.back')}</Link>}
        />
      </div>
    )
  }

  const isStudent = currentUser.role === 'student'
  const canManage = currentUser.role === 'teacher' || currentUser.role === 'admin'

  if (currentUser.role === 'parent' || (isStudent && !enroled) || (canManage && !cls)) {
    return (
      <div>
        <PageHeader title={t('quiz.title')} icon="clipboard" />
        <EmptyState
          icon="lock"
          title={t('state.forbiddenTitle')}
          description={t('state.forbiddenBody')}
          action={<Link to="/quizzes" className={buttonClass('primary')}>{t('common.back')}</Link>}
        />
      </div>
    )
  }

  const maxScore = quiz.questions.reduce((s, q) => s + q.points, 0)
  const answered = quiz.questions.filter((q) => (answers[q.id] || '').trim().length > 0).length
  const canStart = quiz.published && used < quiz.attemptsAllowed

  const releaseResults = async () => {
    if (dataMode === 'server') {
      const released = await releaseQuiz(quiz.id)
      if (!released) return
      toast('success', t('marks.published'), quiz.title)
      return
    }
    mutate((draft) => {
      const target = draft.quizzes.find((q) => q.id === quiz.id)
      if (target) target.resultsReleased = true
    })
    toast('success', t('marks.published'), quiz.title)
    for (const student of db.users.filter(
      (u) => u.role === 'student' && db.enrollments.some((e) => e.classId === quiz.classId && e.studentId === u.id && e.status === 'active'),
    )) {
      notify(student.id, 'quiz', `${t('quiz.resultTitle')}: ${quiz.title}`, t('quiz.yourScore', { score: '—', max: maxScore }), '/quizzes')
    }
  }

  async function submitAttempt(auto = false) {
    if (!currentUser || !quiz || submittedRef.current) return
    if (!auto && !window.confirm(t('quiz.confirmSubmit'))) return
    submittedRef.current = true
    setBusy(true)
    setError('')

    if (!online) {
      queueOffline('quiz-attempt', {
        quizId: quiz.id,
        studentId: currentUser.id,
        answers,
      })
      toast('info', t('quiz.savedOffline'), t('quiz.offlineNote'))
      setBusy(false)
      navigate('/quizzes')
      return
    }

    // Server mode: the answer key stays on the server and grading is final.
    if (dataMode === 'server') {
      try {
        const graded = await submitQuizAttempt(quiz.id, answers)
        if (!graded) throw new Error('no attempt returned')
        setBusy(false)
        setRunning(false)
        toast('success', t('quiz.submitted'), t('quiz.resultTitle'))
      } catch (err) {
        submittedRef.current = false
        setBusy(false)
        const conflict = err instanceof ApiRequestError && err.status === 409
        setError(conflict ? t('quiz.noAttempts') : t('quiz.submitFailed'))
      }
      return
    }

    const graded = gradeQuiz(quiz, answers)
    const attempt: Attempt = {
      id: uid('att'),
      quizId: quiz.id,
      studentId: currentUser.id,
      answers,
      score: graded.score,
      maxScore: graded.maxScore,
      autoGraded: true,
      submittedAt: new Date().toISOString(),
    }
    mutate((draft) => {
      draft.attempts.push(attempt)
      draft.activity.push({
        id: uid('act'),
        studentId: currentUser.id,
        classId: quiz.classId,
        points: 10 + Math.round((graded.score / Math.max(1, graded.maxScore)) * 20),
        reason: 'quiz-attempt',
        at: attempt.submittedAt,
      })
      const teacher = draft.users.find((u) => u.id === draft.classes.find((c) => c.id === quiz.classId)?.teacherId)
      if (teacher) {
        draft.notifications.unshift({
          id: uid('notif'),
          userId: teacher.id,
          kind: 'quiz',
          title: `${currentUser.name} submitted ${quiz.title}`,
          body: `${graded.score}/${graded.maxScore} · ${t('quiz.gradeNote')}`,
          link: `/quizzes/${quiz.id}`,
          read: false,
          createdAt: new Date().toISOString(),
        })
      }
      for (const link of draft.parentLinks.filter((l) => l.studentId === currentUser.id && l.status === 'approved')) {
        draft.notifications.unshift({
          id: uid('notif'),
          userId: link.parentId,
          kind: 'quiz',
          title: `${currentUser.name.split(' ')[0]} submitted a quiz`,
          body: quiz.title,
          link: '/quizzes',
          read: false,
          createdAt: new Date().toISOString(),
        })
      }
    })

    if (dataMode === 'demo') {
      awardBadge(currentUser.id, 'firstSteps')
      if (graded.maxScore > 0 && graded.score / graded.maxScore >= 0.8) {
        awardBadge(currentUser.id, 'quizStarter')
      }
    }

    setBusy(false)
    setRunning(false)
    toast('success', t('quiz.submitted'), t('quiz.resultTitle'))
  }

  const start = () => {
    submittedRef.current = false
    setAnswers({})
    setError('')
    setSecondsLeft(Math.max(1, quiz.timeLimitMin) * 60)
    setRunning(true)
  }

  /* ----------------------------------------------------------- teacher view */
  if (canManage) {
    const attempts = attemptsForQuiz(db, quiz.id)
    const average = attempts.length
      ? Math.round(
          (attempts.reduce((sum, a) => sum + (a.maxScore ? a.score / a.maxScore : 0), 0) / attempts.length) * 100,
        )
      : 0
    return (
      <div className="space-y-4 sm:space-y-5">
        <PageHeader
          title={quiz.title}
          subtitle={`${cls?.name || ''} · ${subjectLabel(quiz.subjectId, t)}`}
          eyebrow={t('quiz.viewAttempts')}
          icon="clipboard"
          actions={<Link to="/quizzes" className={buttonClass('secondary', 'md')}>{t('common.back')}</Link>}
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: t('common.students'), value: attempts.length },
            { label: t('marks.average'), value: `${average}%` },
            { label: t('quiz.questions', { count: quiz.questions.length }), value: maxScore },
            { label: t('quiz.showResults'), value: visible ? t('common.yes') : t('common.no') },
          ].map((s) => (
            <div key={s.label} className="card p-3.5">
              <p className="text-[11px] text-ink-500">{s.label}</p>
              <p className="mt-0.5 text-xl font-bold tabular-nums text-ink-900">{s.value}</p>
            </div>
          ))}
        </div>

        <Callout tone="info" title={t('quiz.resultVisibility')}>
          {quiz.showResults === 'immediately'
            ? t('quiz.immediate')
            : quiz.showResults === 'after_due'
              ? t('quiz.afterDueShort')
              : t('quiz.manualShort')}
          {quiz.showAnswers ? ` · ${t('quiz.showAnswers')}` : ''}
        </Callout>

        {quiz.showResults === 'manual' && !quiz.resultsReleased ? (
          <Button onClick={() => void releaseResults()} icon="eye">{t('marks.publish')}</Button>
        ) : null}
        {quiz.showResults === 'manual' && quiz.resultsReleased ? (
          <Callout tone="success" title={t('common.results')}>{t('marks.published')}</Callout>
        ) : null}

        <SectionCard title={t('quiz.viewAttempts')} subtitle={t('quiz.gradeNote')} icon="clipboard">
          {attempts.length ? (
            <ul className="divide-y divide-ink-100">
              {attempts.map((attempt) => {
                const student = userById(db, attempt.studentId)
                return (
                  <li key={attempt.id} className="py-3 first:pt-0 last:pb-0">
                    <details>
                      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="font-semibold text-ink-800">{student?.name || attempt.studentId}</span>
                        <span className="flex items-center gap-2">
                          {attempt.syncedFromOffline ? <Badge tone="saffron" icon="cloud">{t('dl.synced')}</Badge> : null}
                          <span className="text-xs text-ink-500">{formatDateTime(attempt.submittedAt, lang)}</span>
                          <Badge tone={attempt.score / Math.max(1, attempt.maxScore) >= 0.6 ? 'leaf' : 'saffron'}>
                            {attempt.score}/{attempt.maxScore}
                          </Badge>
                        </span>
                      </summary>
                      <div className="mt-2 space-y-2">
                        {quiz.questions.map((q, i) => {
                          const given = attempt.answers[q.id] || ''
                          const ok = isAnswerCorrect(q, given)
                          return (
                            <div key={q.id} className="rounded-lg border border-ink-200 p-2.5 text-xs">
                              <p className="font-semibold text-ink-800">{i + 1}. {q.prompt}</p>
                              <p className="mt-1 text-ink-600">
                                {t('quiz.yourAnswer')}: <span className={ok ? 'font-semibold text-leaf-700' : 'font-semibold text-clay-700'}>{given || '—'}</span>
                              </p>
                              {quiz.showAnswers ? (
                                <>
                                  <p className="mt-0.5 text-ink-500">{t('quiz.correctAnswer')}: {q.answer}</p>
                                  <p className="mt-0.5 text-ink-500">{q.explanation}</p>
                                </>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    </details>
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState icon="clipboard" title={t('quiz.noAttemptsYet')} description={t('quiz.teacherSub')} />
          )}
        </SectionCard>
      </div>
    )
  }

  /* ----------------------------------------------------------- student view */
  const gradedLatest = latest ? gradeQuiz(quiz, latest.answers) : null

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={quiz.title}
        subtitle={`${cls?.name || ''} · ${subjectLabel(quiz.subjectId, t)}`}
        eyebrow={subjectLabel(quiz.subjectId, t)}
        icon="clipboard"
        actions={<Link to="/quizzes" className={buttonClass('secondary', 'md')}>{t('common.back')}</Link>}
      />

      {!quiz.published ? (
        <Callout tone="warn" title={t('common.draft')}>{t('quiz.publishHint')}</Callout>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {running ? (
            <SectionCard
              title={t('quiz.instructions')}
              subtitle={quiz.instructions}
              icon="clipboard"
              action={
                <span
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold tabular-nums ${
                    secondsLeft < 60 ? 'border-clay-300 bg-clay-50 text-clay-800' : 'border-ink-200 bg-white text-ink-800'
                  }`}
                  role="timer"
                  aria-live="off"
                >
                  <Icon name="clock" size={13} /> {formatClock(secondsLeft)}
                </span>
              }
            >
              <div className="space-y-5">
                {quiz.questions.map((q, index) => (
                  <fieldset key={q.id} className="rounded-xl border border-ink-200 p-3.5">
                    <legend className="px-1 text-[11px] font-bold uppercase tracking-wide text-ink-400">
                      {t('quiz.question')} {index + 1} · {q.points} {t('common.points')}
                    </legend>
                    <p className="text-sm font-semibold leading-relaxed text-ink-900">{q.prompt}</p>
                    {q.type === 'mcq' ? (
                      <div className="mt-2.5 space-y-1.5">
                        {(q.options || []).map((option) => (
                          <label
                            key={option}
                            className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                              answers[q.id] === option ? 'border-brand-400 bg-brand-50 text-brand-900' : 'border-ink-200 hover:bg-ink-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={q.id}
                              value={option}
                              checked={answers[q.id] === option}
                              onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: option }))}
                              className="mt-0.5 h-4 w-4 shrink-0"
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <TextInput
                        className="mt-2.5"
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        placeholder={t('quiz.enterAnswer')}
                        aria-label={`${t('quiz.question')} ${index + 1}`}
                      />
                    )}
                  </fieldset>
                ))}
                {error ? <Callout tone="danger" title={error} /> : null}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-medium text-ink-500">{t('quiz.answered', { done: answered, total: quiz.questions.length })}</p>
                  <Button onClick={() => void submitAttempt(false)} loading={busy} icon="check">{t('quiz.submit')}</Button>
                </div>
              </div>
            </SectionCard>
          ) : (
            <>
              <SectionCard title={t('quiz.instructions')} icon="clipboard">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-700">{quiz.instructions}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { label: t('quiz.questions', { count: quiz.questions.length }), value: quiz.questions.length },
                    { label: t('quiz.totalPoints', { points: '' }).trim(), value: maxScore },
                    { label: t('quiz.timeLimit', { min: quiz.timeLimitMin }), value: `${quiz.timeLimitMin}m` },
                    { label: t('quiz.attemptsLeft', { count: Math.max(0, quiz.attemptsAllowed - used) }), value: `${used}/${quiz.attemptsAllowed}` },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg border border-ink-200 bg-ink-50/60 px-2.5 py-2">
                      <p className="text-[10px] text-ink-500">{s.label}</p>
                      <p className="text-sm font-bold text-ink-900">{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {canStart ? (
                    <Button onClick={start} icon="play">{used ? t('quiz.start') : t('quiz.start')}</Button>
                  ) : (
                    <Callout tone={quiz.published ? 'success' : 'warn'} title={quiz.published ? t('quiz.noAttempts') : t('common.draft')}>
                      {quiz.published ? t('quiz.alreadySubmitted') : t('quiz.publishHint')}
                    </Callout>
                  )}
                  {!online ? <Badge tone="saffron" icon="wifiOff">{t('common.offline')}</Badge> : null}
                </div>
              </SectionCard>

              {latest ? (
                <SectionCard title={t('quiz.resultTitle')} icon="award">
                  {visible ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-lg font-bold text-ink-900">{t('quiz.yourScore', { score: latest.score, max: latest.maxScore })}</p>
                        <ProgressBar
                          value={latest.maxScore ? (latest.score / latest.maxScore) * 100 : 0}
                          tone={latest.score / Math.max(1, latest.maxScore) >= 0.6 ? 'leaf' : 'saffron'}
                          label={formatDateTime(latest.submittedAt, lang)}
                        />
                      </div>
                      {quiz.showAnswers ? (
                        <ol className="space-y-2.5">
                          {quiz.questions.map((q, i) => {
                            const given = latest.answers[q.id] || ''
                            const ok = isAnswerCorrect(q, given)
                            return (
                              <li key={q.id} className={`rounded-xl border p-3 ${ok ? 'border-leaf-200 bg-leaf-50/60' : 'border-clay-200 bg-clay-50/60'}`}>
                                <p className="text-sm font-semibold text-ink-900">{i + 1}. {q.prompt}</p>
                                <p className="mt-1 text-xs text-ink-700">
                                  <span className="font-semibold">{t('quiz.yourAnswer')}:</span> {given || '—'}{' '}
                                  <Badge tone={ok ? 'leaf' : 'clay'} icon={ok ? 'check' : 'x'}>{ok ? t('quiz.correct') : t('quiz.incorrect')}</Badge>
                                </p>
                                {!ok ? <p className="mt-0.5 text-xs text-ink-700"><span className="font-semibold">{t('quiz.correctAnswer')}:</span> {q.answer}</p> : null}
                                <p className="mt-1 text-xs leading-relaxed text-ink-600"><span className="font-semibold">{t('quiz.explanation')}:</span> {q.explanation}</p>
                              </li>
                            )
                          })}
                        </ol>
                      ) : (
                        <Callout tone="info" title={t('quiz.answersHidden')}>{t('quiz.reviewNote')}</Callout>
                      )}
                    </div>
                  ) : (
                    <Callout tone="warn" icon="lock" title={t('quiz.resultsHidden', { when: quiz.showResults === 'after_due' ? t('quiz.afterDue') : t('quiz.manual') })}>
                      {t('quiz.reviewNote')}
                    </Callout>
                  )}
                  {gradedLatest ? (
                    <p className="mt-3 text-[11px] text-ink-500">{t('quiz.gradeNote')} · {t('quiz.requiresInternet')}</p>
                  ) : null}
                </SectionCard>
              ) : null}

              {!canStart && !latest ? (
                <Callout tone="warn" title={t('quiz.noPending')}>{t('quiz.teacherSub')}</Callout>
              ) : null}
            </>
          )}
        </div>

        <div className="space-y-4">
          <SectionCard title={t('common.details')} icon="info">
            <div className="space-y-2 text-sm">
              <p className="flex items-center justify-between gap-2"><span className="text-ink-500">{t('common.subject')}</span><SubjectChip subjectId={quiz.subjectId} /></p>
              <p className="flex items-center justify-between gap-2"><span className="text-ink-500">{t('common.class')}</span><span className="font-semibold text-ink-800">{cls?.name}</span></p>
              <p className="flex items-center justify-between gap-2"><span className="text-ink-500">{t('common.due')}</span><span className="font-semibold text-ink-800">{quiz.dueAt || '—'}</span></p>
              <p className="flex items-center justify-between gap-2"><span className="text-ink-500">{t('quiz.attemptsUsed')}</span><span className="font-semibold text-ink-800">{used}/{quiz.attemptsAllowed}</span></p>
            </div>
          </SectionCard>

          <Callout tone="info" icon="cloud" title={t('quiz.requiresInternet')}>
            {t('quiz.offlineNote')}
          </Callout>

          <Callout tone="brand" icon="shield" title={t('privacy.title')}>
            {t('marks.privacyNote')}
          </Callout>

          {!visible && latest ? (
            <Callout tone="warn" icon="lock" title={t('marks.notPublished')}>
              {quiz.showResults === 'after_due' ? t('quiz.afterDue') : t('quiz.manual')}
            </Callout>
          ) : null}
        </div>
      </div>
    </div>
  )
}
