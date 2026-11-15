import { useMemo, useState } from 'react'
import { useApp } from '../lib/store'
import { useI18n } from '../lib/i18n'
import { guardianChildren } from '../lib/access'
import { daysBetween, formatDate, todayISO, uid } from '../lib/utils'
import type { Scholarship } from '../lib/types'
import { Icon } from '../components/Icon'
import {
  Badge,
  Button,
  Callout,
  Card,
  Checkbox,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  SectionCard,
  Select,
  TextArea,
  TextInput,
  buttonClass,
} from '../components/ui'

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

export function ScholarshipsPage() {
  const { db, currentUser, mutate, toast } = useApp()
  const { t, lang } = useI18n()
  const isAdmin = currentUser?.role === 'admin'
  const myGrades = useMemo(() => {
    if (!currentUser) return [] as number[]
    if (currentUser.role === 'student' && currentUser.gradeLevel) return [currentUser.gradeLevel]
    if (currentUser.role === 'parent') {
      return guardianChildren(db, currentUser.id)
        .map((c) => c.gradeLevel)
        .filter((g): g is number => typeof g === 'number')
    }
    return []
  }, [db, currentUser])
  const [grade, setGrade] = useState<string>(myGrades[0] ? String(myGrades[0]) : 'all')
  const [eligibleOnly, setEligibleOnly] = useState(myGrades.length > 0)
  const [editing, setEditing] = useState<Scholarship | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  if (!currentUser) return null

  const list = db.scholarships
    .filter((s) => grade === 'all' || s.gradeLevels.includes(Number(grade)))
    .filter((s) => !eligibleOnly || myGrades.length === 0 || s.gradeLevels.some((g) => myGrades.includes(g)))
    .sort((a, b) => Number(b.status === 'open') - Number(a.status === 'open') || a.deadline.localeCompare(b.deadline))

  const openForm = (s: Scholarship | null) => {
    setEditing(s)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('sch.title')}
        subtitle={t('sch.sub')}
        icon="award"
        actions={isAdmin ? <Button icon="plus" onClick={() => openForm(null)}>{t('sch.add')}</Button> : null}
      />

      <Callout tone="warn" icon="alert" title={t('sch.sample')}>
        {t('sch.sampleNotice')} {db.config.scholarListingNotice}
      </Callout>

      <SectionCard icon="filter" bodyClassName="space-y-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label={t('sch.filterClass')} htmlFor="sch-grade">
            <Select id="sch-grade" value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="all">{t('common.all')} {t('common.class').toLowerCase()}es</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>Class {g}</option>
              ))}
            </Select>
          </Field>
          <div className="pb-2">
            <Checkbox
              checked={eligibleOnly}
              onChange={setEligibleOnly}
              label={t('sch.eligibleOnly')}
              description={myGrades.length ? `Classes ${myGrades.join(', ')}` : t('sch.noResults')}
            />
          </div>
        </div>
        <p className="text-[10px] text-ink-400">{db.config.scholarListingNotice}</p>
      </SectionCard>

      {list.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((s) => {
            const daysLeft = daysBetween(todayISO(), s.deadline)
            const expired = s.status === 'expired' || daysLeft < 0
            return (
              <Card key={s.id} className={`flex flex-col p-4 ${expired ? 'bg-ink-50/60' : ''}`}>
                <div className="flex flex-wrap items-center gap-1.5">
                  {s.sample ? <Badge tone="clay" icon="alert">{t('sch.sample')}</Badge> : null}
                  {s.verified ? <Badge tone="leaf" icon="checkCircle">{t('sch.verified')}</Badge> : <Badge tone="saffron" icon="info">{t('sch.lastVerified')}: {formatDate(s.lastVerified, lang)}</Badge>}
                  <Badge tone={expired ? 'neutral' : 'brand'} icon="clock">{expired ? t('sch.expired') : t('sch.open')}</Badge>
                  {myGrades.some((g) => s.gradeLevels.includes(g)) ? <Badge tone="leaf" icon="check">{t('sch.eligibleOnly')}</Badge> : null}
                </div>
                <h2 className="mt-2 text-sm font-bold leading-snug text-ink-900">{s.name}</h2>
                <p className="mt-0.5 text-[11px] font-medium text-ink-500">{s.provider}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-600">{s.description}</p>
                <dl className="mt-2 space-y-1.5 text-[11px]">
                  <div>
                    <dt className="font-semibold text-ink-700">{t('sch.eligibility')}</dt>
                    <dd className="text-ink-600">{s.eligibility}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink-700">{t('sch.documents')}</dt>
                    <dd className="text-ink-600">{s.documents.join(' · ')}</dd>
                  </div>
                </dl>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className={expired ? 'text-ink-500' : 'font-semibold text-clay-800'}>
                    {expired ? t('sch.expiredNote') : t('sch.daysLeft', { days: daysLeft })}
                  </span>
                  <span className="text-ink-400">· {t('sch.lastDate', { date: formatDate(s.deadline, lang) })}</span>
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonClass('secondary', 'sm', expired ? 'pointer-events-none opacity-50' : '')}
                    aria-disabled={expired}
                  >
                    {t('sch.visit')} <Icon name="external" size={13} />
                  </a>
                  {isAdmin ? (
                    <Button size="sm" variant="ghost" icon="edit" onClick={() => openForm(s)}>{t('common.edit')}</Button>
                  ) : null}
                  <span className="text-[10px] text-ink-400">{t('sch.verifyNote')}</span>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState icon="award" title={t('sch.noResults')} description={t('sch.sampleNotice')} />
      )}

      <Callout tone="info" icon="info" title={t('sch.apply')}>
        {t('sch.verifyNote')} {isAdmin ? t('sch.adminHint') : ''}
      </Callout>

      {isAdmin ? (
        <ScholarshipForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          scholarship={editing}
          onSaved={() => toast('success', t('sch.saved'))}
          adminId={currentUser.id}
        />
      ) : null}
    </div>
  )
}

function ScholarshipForm({
  open,
  onClose,
  scholarship,
  onSaved,
  adminId,
}: {
  open: boolean
  onClose: () => void
  scholarship: Scholarship | null
  onSaved: () => void
  adminId: string
}) {
  const { currentUser, mutate, toast } = useApp()
  const { t } = useI18n()
  const [name, setName] = useState(scholarship?.name || '')
  const [provider, setProvider] = useState(scholarship?.provider || '')
  const [description, setDescription] = useState(scholarship?.description || '')
  const [eligibility, setEligibility] = useState(scholarship?.eligibility || '')
  const [deadline, setDeadline] = useState(scholarship?.deadline || '')
  const [documents, setDocuments] = useState((scholarship?.documents || []).join('\n'))
  const [link, setLink] = useState(scholarship?.link || 'https://')
  const [gradeLevels, setGradeLevels] = useState<number[]>(scholarship?.gradeLevels || [8])
  const [verified, setVerified] = useState(scholarship?.verified || false)
  const [error, setError] = useState('')

  const submit = () => {
    if (!currentUser) return
    if (!name.trim() || !provider.trim() || !deadline || !link.trim()) {
      setError(t('sch.required'))
      return
    }
    if (!/^https:\/\/.+\..+/.test(link.trim())) {
      setError(t('sch.linkInvalid'))
      return
    }
    if (!gradeLevels.length) {
      setError(t('sch.required'))
      return
    }
    const saved: Scholarship = {
      id: scholarship?.id || uid('sch'),
      name: name.trim(),
      provider: provider.trim(),
      description: description.trim() || t('sch.sampleNotice'),
      eligibility: eligibility.trim(),
      gradeLevels: [...gradeLevels].sort((a, b) => a - b),
      deadline,
      documents: documents.split('\n').map((d) => d.trim()).filter(Boolean),
      link: link.trim(),
      lastVerified: verified ? todayISO() : scholarship?.lastVerified || todayISO(),
      verified,
      sample: !verified,
      status: deadline < todayISO() ? 'expired' : 'open',
      createdBy: scholarship?.createdBy || adminId,
    }
    mutate((draft) => {
      const index = draft.scholarships.findIndex((s) => s.id === saved.id)
      if (index >= 0) draft.scholarships[index] = saved
      else draft.scholarships.unshift(saved)
      draft.audit.unshift({
        id: uid('aud'),
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: scholarship ? 'Updated scholarship listing' : 'Added scholarship listing',
        detail: `${saved.name} · ${saved.verified ? 'verified' : 'unverified sample'}`,
        at: new Date().toISOString(),
      })
    })
    toast('success', t('sch.saved'))
    onSaved()
    setError('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={scholarship ? t('sch.edit') : t('sch.add')}
      description={t('sch.adminHint')}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button icon="check" onClick={submit}>{scholarship ? t('common.saveChanges') : t('common.create')}</Button>
        </>
      }
    >
      <div className="space-y-3.5">
        {error ? <Callout tone="danger" title={error} /> : null}
        <Callout tone="warn" title={t('sch.sample')}>{t('sch.sampleNotice')}</Callout>
        <Field label={t('sch.name')} htmlFor="sch-name" required>
          <TextInput id="sch-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('sch.provider')} htmlFor="sch-provider" required>
            <TextInput id="sch-provider" value={provider} onChange={(e) => setProvider(e.target.value)} />
          </Field>
          <Field label={t('sch.deadline')} htmlFor="sch-deadline" required>
            <TextInput id="sch-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
        </div>
        <Field label={t('sch.description')} htmlFor="sch-desc">
          <TextArea id="sch-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label={t('sch.eligibility')} htmlFor="sch-elig">
          <TextArea id="sch-elig" value={eligibility} onChange={(e) => setEligibility(e.target.value)} />
        </Field>
        <Field label={t('sch.documents')} htmlFor="sch-docs" hint={t('sch.documentsHint')}>
          <TextArea id="sch-docs" value={documents} onChange={(e) => setDocuments(e.target.value)} />
        </Field>
        <Field label={t('sch.link')} htmlFor="sch-link" required>
          <TextInput id="sch-link" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-semibold text-ink-800">{t('sch.gradeLevels')}</legend>
          <div className="flex flex-wrap gap-1.5">
            {GRADES.map((g) => {
              const active = gradeLevels.includes(g)
              return (
                <button
                  key={g}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setGradeLevels((prev) => (active ? prev.filter((x) => x !== g) : [...prev, g]))}
                  className={`min-h-9 rounded-full border px-3 text-xs font-medium ${active ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 text-ink-700 hover:bg-ink-50'}`}
                >
                  {g}
                </button>
              )
            })}
          </div>
        </fieldset>
        <Checkbox
          checked={verified}
          onChange={setVerified}
          label={t('sch.markVerified')}
          description={t('sch.adminHint')}
        />
        <p className="text-[10px] leading-relaxed text-ink-400">{t('sch.sampleNotice')}</p>
      </div>
    </Modal>
  )
}
