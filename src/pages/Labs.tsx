import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../lib/store'
import { useI18n } from '../lib/i18n'
import { studentClassIds, visibleClasses } from '../lib/access'
import { subjectLabel } from '../lib/utils'
import { SUBJECTS } from '../lib/subjects'
import type { Lab } from '../lib/types'
import { Icon } from '../components/Icon'
import {
  Badge,
  Callout,
  Chip,
  EmptyState,
  PageHeader,
  SectionCard,
  buttonClass,
} from '../components/ui'

export const labIcon = (lab: Lab) =>
  lab.kind === 'fractions' || lab.kind === 'place-value'
    ? 'chart'
    : lab.kind === 'circuit'
      ? 'zap'
      : lab.kind === 'pendulum'
        ? 'clock'
        : lab.kind === 'ph-scale'
          ? 'beaker'
          : lab.kind === 'solar'
            ? 'sun'
            : 'flask'

export const labTitle = (lab: Lab, t: (key: string) => string): string => {
  const map: Record<string, string> = {
    fractions: 'labs.fractionsTitle',
    circuit: 'labs.circuitTitle',
    pendulum: 'labs.pendulumTitle',
    'ph-scale': 'labs.phTitle',
    solar: 'labs.solarTitle',
    typing: 'labs.typingTitle',
    'place-value': 'labs.placeValueTitle',
  }
  const key = map[lab.kind]
  return key ? t(key) : lab.title
}

export function LabsPage() {
  const { db, currentUser } = useApp()
  const { t } = useI18n()
  const [subject, setSubject] = useState('all')

  if (!currentUser) return null

  const classes = visibleClasses(db, currentUser)
  const gradeLevels = useMemo(() => {
    if (currentUser.role === 'student') {
      return new Set(
        studentClassIds(db, currentUser.id)
          .map((id) => db.classes.find((c) => c.id === id)?.gradeLevel)
          .filter((n): n is number => typeof n === 'number'),
      )
    }
    return new Set(classes.map((c) => c.gradeLevel))
  }, [classes, currentUser, db])

  const labs = db.labs.filter((lab) => {
    const gradeMatch =
      currentUser.role === 'teacher' || currentUser.role === 'admin' || gradeLevels.size === 0
        ? true
        : lab.gradeLevels.some((g) => gradeLevels.has(g))
    return gradeMatch && (subject === 'all' || lab.subjectId === subject)
  })

  const subjectsInUse = Array.from(new Set(db.labs.map((l) => l.subjectId)))

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('labs.title')}
        subtitle={t('labs.sub')}
        icon="flask"
        actions={
          <span className="hidden items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-ink-600 sm:inline-flex">
            <Icon name="shield" size={13} /> {t('labs.simulationOnly')}
          </span>
        }
      />

      <Callout tone="info" icon="info" title={t('labs.simulationOnly')}>
        {t('labs.offlineUnavailable')}
      </Callout>

      <div className="flex flex-wrap items-center gap-1.5">
        <Chip active={subject === 'all'} onClick={() => setSubject('all')}>{t('labs.allSubjects')}</Chip>
        {subjectsInUse.map((s) => (
          <Chip key={s} active={subject === s} onClick={() => setSubject(s)}>{subjectLabel(s, t)}</Chip>
        ))}
      </div>

      {labs.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {labs.map((lab) => {
            const runs = db.labRuns.filter((r) => r.labId === lab.id && r.studentId === currentUser.id)
            const best = runs.sort((a, b) => b.score / Math.max(1, b.maxScore) - a.score / Math.max(1, a.maxScore))[0]
            const planned = lab.kind === 'planned'
            return (
              <article key={lab.id} className={`card flex flex-col p-4 ${planned ? 'opacity-80' : ''}`}>
                <div className="flex items-start gap-2.5">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${planned ? 'bg-ink-100 text-ink-500' : 'bg-brand-50 text-brand-700'}`}>
                    <Icon name={labIcon(lab)} size={19} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-bold leading-snug text-ink-900">{labTitle(lab, t)}</h2>
                    <p className="mt-0.5 text-[11px] text-ink-500">{subjectLabel(lab.subjectId, t)} · {lab.gradeLevels.map((g) => `Class ${g}`).join(', ')}</p>
                  </div>
                </div>
                <p className="mt-2.5 line-clamp-3 text-xs leading-relaxed text-ink-600">{lab.objective}</p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {planned ? (
                    <Badge tone="neutral" icon="clock">{t('labs.planned')}</Badge>
                  ) : (
                    <Badge tone="leaf" icon="checkCircle">{t('labs.working')}</Badge>
                  )}
                  {best && !planned ? (
                    <Badge tone="brand" icon="star">{t('labs.checkScore', { score: best.score, total: best.maxScore })}</Badge>
                  ) : null}
                  <Badge tone="neutral" icon="download">{t('labs.dataUse', { mb: lab.dataMB })}</Badge>
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                  <span className="text-[10px] text-ink-400">{lab.languages.map((l) => l.toUpperCase()).join(' · ')}</span>
                  <Link
                    to={`/labs/${lab.id}`}
                    className={buttonClass(planned ? 'secondary' : 'primary', 'sm')}
                  >
                    {planned ? t('common.view') : best ? t('labs.tryAgain') : t('common.open')}
                    <Icon name="arrowRight" size={14} />
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <EmptyState icon="flask" title={t('labs.noResults')} description={t('labs.sub')} />
      )}

      <SectionCard title={t('labs.lowDataAlt')} icon="leaf">
        <ul className="space-y-2 text-xs text-ink-600">
          {labs.filter((l) => l.kind !== 'planned').slice(0, 3).map((l) => (
            <li key={l.id} className="rounded-lg border border-ink-200 bg-ink-50/60 px-2.5 py-2">
              <span className="font-semibold text-ink-800">{labTitle(l, t)}:</span> {l.lowerDataAlternative}
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  )
}
