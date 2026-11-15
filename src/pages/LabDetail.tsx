import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../lib/store'
import { useI18n } from '../lib/i18n'
import { classById, studentClassIds } from '../lib/access'
import { isAnswerCorrect } from '../lib/quiz'
import { subjectLabel } from '../lib/utils'
import type { Lab, Question } from '../lib/types'
import { Icon } from '../components/Icon'
import { labIcon, labTitle } from './Labs'
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

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

function FractionsSim({ t }: { t: (key: string) => string }) {
  const [parts, setParts] = useState(3)
  const [selected, setSelected] = useState<boolean[]>([true, true, false])
  const [second, setSecond] = useState(5)
  const [secondSelected, setSecondSelected] = useState<boolean[]>([true, true, true, false, false])

  const resize = (n: number) => {
    setParts(n)
    setSelected(Array.from({ length: n }, (_, i) => i < Math.ceil(n / 2)))
  }
  const resizeSecond = (n: number) => {
    setSecond(n)
    setSecondSelected(Array.from({ length: n }, (_, i) => i < Math.ceil((n * 3) / 5)))
  }

  const count = selected.filter(Boolean).length
  const count2 = secondSelected.filter(Boolean).length
  const d = gcd(count, parts) || 1
  const d2 = gcd(count2, second) || 1

  const renderRoti = (
    label: string,
    n: number,
    cells: boolean[],
    onToggle: (i: number) => void,
  ) => (
    <div className="flex-1 rounded-xl border border-ink-200 p-3">
      <p className="text-[11px] font-semibold text-ink-600">{label}</p>
      <div
        className="mt-2 grid gap-1"
        style={{ gridTemplateColumns: `repeat(${Math.min(4, n)}, minmax(0, 1fr))` }}
        role="group"
        aria-label={label}
      >
        {cells.map((on, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onToggle(i)}
            aria-pressed={on}
            className={`aspect-square rounded-lg border-2 text-[11px] font-bold transition-colors ${
              on ? 'border-saffron-500 bg-saffron-300 text-saffron-900' : 'border-ink-200 bg-ink-50 text-ink-400 hover:bg-ink-100'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-sm font-bold tabular-nums text-ink-900">
        {cells.filter(Boolean).length}/{n}
      </p>
    </div>
  )

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-semibold text-ink-700" htmlFor="roti-parts">Roti 1 parts</label>
        <input
          id="roti-parts"
          type="range"
          min={2}
          max={8}
          value={parts}
          onChange={(e) => resize(Number(e.target.value))}
          className="flex-1 accent-brand-600"
        />
        <span className="w-8 text-xs font-bold tabular-nums text-ink-800">{parts}</span>
        <label className="text-xs font-semibold text-ink-700" htmlFor="roti-parts-2">Roti 2 parts</label>
        <input
          id="roti-parts-2"
          type="range"
          min={2}
          max={8}
          value={second}
          onChange={(e) => resizeSecond(Number(e.target.value))}
          className="flex-1 accent-brand-600"
        />
        <span className="w-8 text-xs font-bold tabular-nums text-ink-800">{second}</span>
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        {renderRoti('Roti 1 · tap parts to shade', parts, selected, (i) =>
          setSelected((prev) => prev.map((v, xi) => (xi === i ? !v : v))),
        )}
        {renderRoti('Roti 2 · tap parts to shade', second, secondSelected, (i) =>
          setSecondSelected((prev) => prev.map((v, xi) => (xi === i ? !v : v))),
        )}
      </div>
      <div className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-900">
        <p className="font-semibold">{count}/{parts} = {count / d}/{parts / d} = {(count / parts).toFixed(3)}</p>
        <p className="mt-0.5 text-xs">
          Compare: {count}/{parts} {count / parts === count2 / second ? '=' : count / parts > count2 / second ? '>' : '<'} {count2}/{second} = {(count2 / second).toFixed(3)}
        </p>
        <p className="mt-1 text-[11px] text-brand-700">A bigger denominator means the whole is cut into more, smaller pieces.</p>
      </div>
      <p className="mt-2 text-[11px] text-ink-500">{t('labs.simulationOnly')}</p>
    </div>
  )
}

function CircuitSim({ t }: { t: (key: string) => string }) {
  const [closed, setClosed] = useState(false)
  const [batteries, setBatteries] = useState(1)
  const glow = closed
  const brightness = closed ? Math.min(1, 0.45 + batteries * 0.35) : 0

  return (
    <div>
      <div className="flex flex-col items-center gap-3 rounded-xl border border-ink-200 bg-ink-900 p-5">
        <div
          className="grid h-20 w-20 place-items-center rounded-full border-4 transition-all"
          style={{
            borderColor: glow ? '#fdc35a' : '#3d5578',
            background: glow ? `rgba(253,195,90,${brightness})` : '#1e2f4d',
            boxShadow: glow ? `0 0 ${18 + batteries * 10}px rgba(253,195,90,${brightness})` : 'none',
          }}
          aria-label={glow ? 'Bulb is glowing' : 'Bulb is off'}
        >
          <Icon name="zap" size={28} className={glow ? 'text-saffron-900' : 'text-ink-500'} />
        </div>
        <svg viewBox="0 0 300 120" className="w-full max-w-sm" role="img" aria-label="Circuit diagram">
          <path d="M20 90h60M140 90h30M210 90h70V20H20v70" stroke="#b3c1d4" strokeWidth="4" fill="none" strokeLinecap="round" />
          <rect x="80" y="78" width="60" height="24" rx="4" fill="#2b50d4" />
          <text x="110" y="95" textAnchor="middle" fontSize="12" fill="white">{batteries} cell</text>
          <circle cx="120" cy="20" r="8" fill={glow ? '#fdc35a' : '#5b7396'} />
          <circle cx="260" cy="20" r="8" fill={glow ? '#fdc35a' : '#5b7396'} />
          <line x1="185" y1="90" x2="210" y2="70" stroke={closed ? '#12b76a' : '#d8543f'} strokeWidth="5" strokeLinecap="round" />
        </svg>
        <p className="text-xs font-semibold text-white">
          {closed ? 'Circuit closed — current flows and the bulb glows.' : 'Circuit open — no current, the bulb stays off.'}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant={closed ? 'secondary' : 'success'} onClick={() => setClosed((v) => !v)} icon="zap">
          {closed ? 'Open the switch' : 'Close the switch'}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setBatteries((b) => (b === 1 ? 2 : 1))}>
          {batteries === 1 ? 'Add a second cell' : 'Remove the second cell'}
        </Button>
        <Badge tone={glow ? 'leaf' : 'clay'}>{glow ? 'Bright' : 'Dark'}</Badge>
      </div>
      <p className="mt-2 text-[11px] text-ink-500">{t('labs.simulationOnly')}</p>
    </div>
  )
}

function PendulumSim({ t }: { t: (key: string) => string }) {
  const [length, setLength] = useState(60)
  const period = useMemo(() => 2 * Math.PI * Math.sqrt(length / 100 / 9.8), [length])

  return (
    <div>
      <div className="relative h-56 overflow-hidden rounded-xl border border-ink-200 bg-gradient-to-b from-brand-50 to-white">
        <div className="absolute left-1/2 top-4 h-2 w-40 -translate-x-1/2 rounded bg-ink-400" />
        <div
          className="absolute left-1/2 top-5 origin-top"
          style={{ animation: `swing ${Math.max(0.4, period)}s ease-in-out infinite alternate` }}
        >
          <div className="mx-auto w-0.5 bg-ink-400" style={{ height: length * 1.35 }} />
          <div className="mx-auto h-7 w-7 -translate-x-1/2 rounded-full bg-brand-600 shadow" />
        </div>
        <p className="absolute bottom-2 right-3 text-[10px] text-ink-400">One to-and-fro = one oscillation</p>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <label htmlFor="pendulum-length" className="text-xs font-semibold text-ink-700">String length</label>
        <input
          id="pendulum-length"
          type="range"
          min={20}
          max={120}
          step={5}
          value={length}
          onChange={(e) => setLength(Number(e.target.value))}
          className="flex-1 accent-brand-600"
        />
        <span className="w-14 text-right text-xs font-bold tabular-nums text-ink-800">{length} cm</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-brand-50 px-2 py-2">
          <p className="text-[10px] text-brand-700">Time period (T = 2π√(L/g))</p>
          <p className="text-lg font-bold tabular-nums text-brand-900">{period.toFixed(2)} s</p>
        </div>
        <div className="rounded-lg bg-ink-50 px-2 py-2">
          <p className="text-[10px] text-ink-500">Ten oscillations</p>
          <p className="text-lg font-bold tabular-nums text-ink-900">{(period * 10).toFixed(1)} s</p>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-ink-500">{t('labs.simulationOnly')}</p>
    </div>
  )
}

const LIQUIDS = [
  { name: 'Lemon juice', ph: 2, color: '#d8543f' },
  { name: 'Vinegar', ph: 3, color: '#e77b6f' },
  { name: 'Milk', ph: 6, color: '#f6a832' },
  { name: 'Pure water', ph: 7, color: '#34d383' },
  { name: 'Baking soda', ph: 9, color: '#3b6af0' },
  { name: 'Soap water', ph: 11, color: '#7c3aed' },
]

function PhSim({ t }: { t: (key: string) => string }) {
  const [index, setIndex] = useState(0)
  const liquid = LIQUIDS[index]
  const label = liquid.ph < 7 ? 'Acidic' : liquid.ph === 7 ? 'Neutral' : 'Basic'

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {LIQUIDS.map((l, i) => (
          <button
            key={l.name}
            type="button"
            onClick={() => setIndex(i)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              i === index ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
            }`}
          >
            {l.name}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <div className="flex items-end justify-between text-[10px] font-semibold text-ink-500">
            <span>0 · acid</span><span>7 · neutral</span><span>14 · base</span>
          </div>
          <div className="relative mt-1 h-4 overflow-hidden rounded-full bg-gradient-to-r from-clay-500 via-leaf-400 to-brand-600">
            <span
              className="absolute top-1/2 h-6 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink-900 shadow"
              style={{ left: `${(liquid.ph / 14) * 100}%` }}
            />
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-ink-200 p-3">
            <span className="h-12 w-12 shrink-0 rounded-full border-4 border-white shadow" style={{ background: liquid.color }} />
            <div>
              <p className="text-sm font-bold text-ink-900">{liquid.name}</p>
              <p className="text-xs text-ink-600">pH {liquid.ph} · {label}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-ink-50 p-3 text-xs text-ink-600">
          <p className="font-semibold text-ink-800">Indicator colour</p>
          <p className="mt-1">Universal indicator turns red-orange in acids, green at neutral and blue-violet in bases.</p>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-ink-500">{t('labs.simulationOnly')}</p>
    </div>
  )
}

function PlaceValueSim({ t }: { t: (key: string) => string }) {
  const [h, setH] = useState(2)
  const [te, setTe] = useState(4)
  const [o, setO] = useState(6)
  const total = h * 100 + te * 10 + o

  const column = (label: string, value: number, set: (n: number) => void, tone: string) => (
    <div className="rounded-xl border border-ink-200 p-2.5 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <div className="mx-auto mt-1 flex h-24 w-full flex-col-reverse items-center justify-end gap-0.5 overflow-hidden rounded-lg bg-ink-50 p-1">
        {Array.from({ length: value }).map((_, i) => (
          <span key={i} className={`h-2 w-5 rounded-full ${tone}`} />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-center gap-1.5">
        <button type="button" onClick={() => set(Math.max(0, value - 1))} className="grid h-7 w-7 place-items-center rounded-lg border border-ink-200 text-ink-700 hover:bg-ink-100" aria-label={`Remove one ${label}`}>−</button>
        <span className="w-6 text-sm font-bold tabular-nums text-ink-900">{value}</span>
        <button type="button" onClick={() => set(Math.min(9, value + 1))} className="grid h-7 w-7 place-items-center rounded-lg border border-ink-200 text-ink-700 hover:bg-ink-100" aria-label={`Add one ${label}`}>+</button>
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-3 py-3 text-white">
        <span className="text-3xl font-black tabular-nums">{total}</span>
        <span className="text-xs text-brand-100">= {h} hundreds + {te} tens + {o} ones</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {column('Hundreds', h, setH, 'bg-brand-500')}
        {column('Tens', te, setTe, 'bg-leaf-500')}
        {column('Ones', o, setO, 'bg-saffron-400')}
      </div>
      <p className="mt-2 text-[11px] text-ink-500">{t('labs.simulationOnly')}</p>
    </div>
  )
}

function LabActivity({ lab, t }: { lab: Lab; t: (key: string) => string }) {
  if (lab.kind === 'planned') {
    return (
      <Callout tone="warn" icon="clock" title={t('labs.planned')}>
        {t('labs.plannedBody')} {lab.plannedFor ? `· ${lab.plannedFor}` : ''}
      </Callout>
    )
  }
  if (lab.kind === 'fractions') return <FractionsSim t={t} />
  if (lab.kind === 'circuit') return <CircuitSim t={t} />
  if (lab.kind === 'pendulum') return <PendulumSim t={t} />
  if (lab.kind === 'ph-scale') return <PhSim t={t} />
  if (lab.kind === 'place-value') return <PlaceValueSim t={t} />
  return (
    <Callout tone="warn" icon="clock" title={t('labs.planned')}>{t('labs.plannedBody')}</Callout>
  )
}

export function LabDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { db, currentUser, online, mutate, toast, awardPoints, awardBadge } = useApp()
  const { t } = useI18n()
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [result, setResult] = useState<{ score: number; max: number } | null>(null)

  const lab = db.labs.find((l) => l.id === id)
  if (!currentUser) return null

  if (!lab) {
    return (
      <div>
        <PageHeader title={t('labs.title')} icon="flask" />
        <EmptyState
          icon="flask"
          title={t('state.notFoundTitle')}
          description={t('state.notFoundBody')}
          action={<Link to="/labs" className={buttonClass('primary')}>{t('common.back')}</Link>}
        />
      </div>
    )
  }

  const isStudent = currentUser.role === 'student'
  const previousRuns = db.labRuns.filter((r) => r.labId === lab.id && r.studentId === currentUser.id)
  const best = [...previousRuns].sort((a, b) => b.score / Math.max(1, b.maxScore) - a.score / Math.max(1, a.maxScore))[0]
  const planned = lab.kind === 'planned'

  const submitCheck = () => {
    if (!currentUser) return
    let score = 0
    for (const q of lab.check) {
      if (isAnswerCorrect(q, responses[q.id] || '')) score += q.points
    }
    const max = lab.check.reduce((s, q) => s + q.points, 0)
    setResult({ score, max })
    if (!isStudent) {
      toast('info', t('labs.checkScore', { score, total: max }))
      return
    }
    const firstRun = previousRuns.length === 0
    mutate((draft) => {
      draft.labRuns.push({
        id: `lr_${Date.now().toString(36)}`,
        labId: lab.id,
        studentId: currentUser.id,
        score,
        maxScore: max,
        completedAt: new Date().toISOString(),
      })
    })
    if (firstRun) {
      const classId =
        studentClassIds(db, currentUser.id).find((cid) => classById(db, cid)?.subjectIds.includes(lab.subjectId)) ||
        studentClassIds(db, currentUser.id)[0]
      if (classId) awardPoints(currentUser.id, classId, 8, 'lab-check')
      awardBadge(currentUser.id, 'labExplorer')
      toast('success', t('labs.completed'), t('labs.checkScore', { score, total: max }))
    } else {
      toast('success', t('labs.checkScore', { score, total: max }))
    }
  }

  const resetActivity = () => {
    setResponses({})
    setResult(null)
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={labTitle(lab, t)}
        subtitle={lab.objective}
        eyebrow={`${subjectLabel(lab.subjectId, t)} · ${lab.gradeLevels.map((g) => `Class ${g}`).join(', ')}`}
        icon={labIcon(lab)}
        actions={<Link to="/labs" className={buttonClass('secondary', 'md')}>{t('common.back')}</Link>}
      />

      <div className="flex flex-wrap gap-1.5">
        {planned ? <Badge tone="neutral" icon="clock">{t('labs.planned')}</Badge> : <Badge tone="leaf" icon="checkCircle">{t('labs.working')}</Badge>}
        <Badge tone="neutral" icon="download">{t('labs.dataUse', { mb: lab.dataMB })}</Badge>
        <Badge tone="neutral" icon="globe">{lab.languages.map((l) => l.toUpperCase()).join(' · ')}</Badge>
        {best ? <Badge tone="brand" icon="star">{t('labs.checkScore', { score: best.score, total: best.maxScore })}</Badge> : null}
      </div>

      {!online ? (
        <Callout tone="warn" icon="wifiOff" title={t('common.offline')}>{t('labs.offlineUnavailable')}</Callout>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard title={t('labs.activity')} subtitle={lab.objective} icon="flask">
            <LabActivity lab={lab} t={t} />
          </SectionCard>

          {lab.check.length ? (
            <SectionCard
              title={t('labs.check')}
              subtitle={t('labs.checkHint')}
              icon="clipboard"
              action={result ? <Button size="sm" variant="secondary" icon="refresh" onClick={resetActivity}>{t('labs.tryAgain')}</Button> : null}
            >
              <div className="space-y-4">
                {lab.check.map((q: Question, index) => {
                  const answered = (responses[q.id] || '').trim().length > 0
                  const correct = result ? isAnswerCorrect(q, responses[q.id] || '') : null
                  return (
                    <fieldset key={q.id} className="rounded-xl border border-ink-200 p-3">
                      <legend className="px-1 text-[10px] font-bold uppercase tracking-wide text-ink-400">
                        {index + 1} · {q.points} {t('common.points')}
                      </legend>
                      <p className="text-sm font-semibold text-ink-900">{q.prompt}</p>
                      {q.type === 'mcq' ? (
                        <div className="mt-2 space-y-1.5">
                          {(q.options || []).map((option) => (
                            <label
                              key={option}
                              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-sm ${
                                responses[q.id] === option ? 'border-brand-400 bg-brand-50' : 'border-ink-200 hover:bg-ink-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                checked={responses[q.id] === option}
                                onChange={() => setResponses((prev) => ({ ...prev, [q.id]: option }))}
                                disabled={!!result}
                                className="h-4 w-4"
                              />
                              {option}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <TextInput
                          className="mt-2"
                          value={responses[q.id] || ''}
                          onChange={(e) => setResponses((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder={t('quiz.enterAnswer')}
                          disabled={!!result}
                        />
                      )}
                      {result ? (
                        <div className={`mt-2 rounded-lg px-2.5 py-2 text-xs ${correct ? 'bg-leaf-50 text-leaf-900' : 'bg-clay-50 text-clay-900'}`}>
                          <p className="font-semibold">{correct ? t('quiz.correct') : `${t('quiz.correctAnswer')}: ${q.answer}`}</p>
                          <p className="mt-0.5 opacity-90">{q.explanation}</p>
                        </div>
                      ) : null}
                    </fieldset>
                  )
                })}
                {result ? (
                  <div className="rounded-xl border border-brand-200 bg-brand-50 p-3">
                    <p className="text-sm font-bold text-brand-900">{t('labs.checkScore', { score: result.score, total: result.max })}</p>
                    <ProgressBar value={result.max ? (result.score / result.max) * 100 : 0} tone={result.score / Math.max(1, result.max) >= 0.6 ? 'leaf' : 'saffron'} showValue={false} />
                  </div>
                ) : (
                  <Button onClick={submitCheck} icon="check" disabled={!lab.check.some((q) => (responses[q.id] || '').trim())}>
                    {t('labs.submitCheck')}
                  </Button>
                )}
              </div>
            </SectionCard>
          ) : null}
        </div>

        <div className="space-y-4">
          <SectionCard title={t('labs.instructions')} icon="info">
            <ol className="space-y-2 text-sm text-ink-700">
              {lab.instructions.map((step, i) => (
                <li key={step} className="flex gap-2">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-800">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </SectionCard>

          <SectionCard title={t('labs.lowDataAlt')} icon="leaf">
            <p className="text-xs leading-relaxed text-ink-600">{lab.lowerDataAlternative}</p>
          </SectionCard>

          <Callout tone="info" icon="shield" title={t('labs.simulationOnly')}>
            {t('labs.simulationOnly')}
          </Callout>
        </div>
      </div>
    </div>
  )
}
