import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp, type SignupInput } from '../../lib/store'
import { useI18n, LANG_OPTIONS, CONTENT_LANG_LABEL } from '../../lib/i18n'
import { SUBJECTS } from '../../lib/subjects'
import type { Lang, Role } from '../../lib/types'
import { Button, Card, Callout, Checkbox, Field, Select, TextInput } from '../../components/ui'
import { Icon, type IconName } from '../../components/Icon'
import { LogoPanel } from '../../components/Layout'
import { cn, normaliseCode } from '../../lib/utils'
import { DEMO_PASSWORD } from '../../lib/seed/base'

const ROLES: Array<{ role: Role; icon: IconName }> = [
  { role: 'student', icon: 'graduation' },
  { role: 'teacher', icon: 'users' },
  { role: 'parent', icon: 'heart' },
  { role: 'admin', icon: 'shield' },
]

export function SignupPage() {
  const { db, signup, toast } = useApp()
  const { t, lang, setLang } = useI18n()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const initialRole = (params.get('role') as Role) || 'student'

  const [step, setStep] = useState(0)
  const [role, setRole] = useState<Role>(ROLES.some((r) => r.role === initialRole) ? initialRole : 'student')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [schoolId, setSchoolId] = useState(db.schools[0]?.id || '')
  const [language, setLanguage] = useState<Lang>(lang)
  const [gradeLevel, setGradeLevel] = useState(8)
  const [section, setSection] = useState('A')
  const [subjects, setSubjects] = useState<string[]>(['math', 'science'])
  const [classCode, setClassCode] = useState('')
  const [relationship, setRelationship] = useState('Mother')
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const [busy, setBusy] = useState(false)

  const school = db.schools.find((s) => s.id === schoolId)

  const validateStep = (which: number): boolean => {
    const next: Record<string, string> = {}
    if (which === 0) {
      if (name.trim().length < 2) next.name = t('auth.nameRequired')
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) next.email = t('auth.emailInvalid')
      if (password.length < 8) next.password = t('auth.passwordWeak')
      if (phone.trim() && !/^[6-9]\d{9}$/.test(phone.replace(/\D/g, ''))) next.phone = t('prof.phoneInvalid')
    }
    if (which === 1) {
      if (!schoolId) next.school = t('common.required')
    }
    if (which === 2) {
      if (role === 'teacher' && subjects.length === 0) next.subjects = t('common.required')
      if (!consent) next.consent = t('auth.consentRequired')
      if (classCode.trim()) {
        const exists = db.classes.some((c) => normaliseCode(c.code) === normaliseCode(classCode))
        if (!exists) next.classCode = t('auth.classCodeInvalid')
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async () => {
    if (!validateStep(2)) return
    setBusy(true)
    setSubmitError('')
    const input: SignupInput = {
      role,
      name,
      email,
      phone,
      password,
      language,
      schoolId,
      gradeLevel: role === 'student' ? gradeLevel : undefined,
      section: role === 'student' ? section : undefined,
      subjectIds: role === 'teacher' ? subjects : undefined,
      classCode: role === 'student' ? classCode : undefined,
      consentGiven: consent,
      relationship: role === 'parent' ? relationship : undefined,
    }
    const res = await signup(input)
    setBusy(false)
    if (!res.ok) {
      if (res.error === 'auth.classCodeInvalid') {
        setStep(2)
        setErrors({ classCode: t('auth.classCodeInvalid') })
      } else {
        setSubmitError(res.error || 'toast.error')
      }
      return
    }
    setLang(language)
    toast('success', t('auth.created'))
    navigate(role === 'parent' ? '/parent/link' : '/dashboard')
  }

  const stepLabels = [t('auth.stepAccount'), t('auth.stepLanguage'), t('auth.stepClass')]

  return (
    <div className="mx-auto grid w-full max-w-wrap gap-6 px-4 pb-10 sm:px-6 lg:grid-cols-[1fr_540px]">
      <LogoPanel>
        <div className="mt-8 space-y-3 rounded-2xl border border-white/15 bg-white/10 p-4 text-sm">
          <p className="font-semibold">Safe by design</p>
          <p className="text-brand-100">
            A class code joins you to a class — it never unlocks another student’s records. Guardians can only see a child after a verified link.
          </p>
          <p className="text-[11px] text-brand-200">Sample environment · use demo details only.</p>
        </div>
      </LogoPanel>

      <Card className="p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{t('auth.signUpTab')}</p>
            <h1 className="mt-1 text-2xl font-bold text-ink-900">{t('auth.createTitle')}</h1>
            <p className="mt-1 text-sm text-ink-500">{t('auth.createSubtitle')}</p>
          </div>
          <Link to="/login" className="shrink-0 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50">
            {t('common.signIn')}
          </Link>
        </div>

        <ol className="mb-5 grid grid-cols-3 gap-2" aria-label="Sign-up progress">
          {stepLabels.map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              <span
                className={cn(
                  'grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold',
                  i < step ? 'bg-leaf-100 text-leaf-800' : i === step ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500',
                )}
              >
                {i < step ? <Icon name="check" size={13} /> : i + 1}
              </span>
              <span className={cn('hidden text-[11px] font-medium sm:block', i === step ? 'text-ink-900' : 'text-ink-500')}>{label}</span>
            </li>
          ))}
        </ol>

        {step === 0 ? (
          <div className="space-y-4">
            <fieldset>
              <legend className="mb-2 text-[13px] font-semibold text-ink-800">{t('auth.chooseRole')}</legend>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => setRole(r.role)}
                    aria-pressed={role === r.role}
                    className={cn(
                      'flex min-h-[76px] flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors',
                      role === r.role ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-ink-200 hover:bg-ink-50',
                    )}
                  >
                    <Icon name={r.icon} size={18} className={role === r.role ? 'text-brand-700' : 'text-ink-500'} />
                    <span className="text-xs font-bold text-ink-900">{t(`role.${r.role}`)}</span>
                    <span className="text-[10px] leading-tight text-ink-500">{t(`auth.role${r.role[0].toUpperCase()}${r.role.slice(1)}Hint`)}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <Field label={t('common.fullName')} htmlFor="name" required error={errors.name}>
              <TextInput id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Asha Kumari" invalid={!!errors.name} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('common.email')} htmlFor="su-email" required error={errors.email}>
                <TextInput id="su-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" invalid={!!errors.email} />
              </Field>
              <Field label={t('common.phone')} htmlFor="su-phone" hint={t('common.optional')} error={errors.phone}>
                <TextInput id="su-phone" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" invalid={!!errors.phone} />
              </Field>
            </div>
            <Field label={t('common.password')} htmlFor="su-password" required hint={t('auth.passwordHint')} error={errors.password}>
              <TextInput id="su-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" invalid={!!errors.password} />
            </Field>
            <Callout tone="warn" title="Demo environment">
              Use sample details only. These accounts live in your browser. Password for demo accounts is <strong>{DEMO_PASSWORD}</strong>.
            </Callout>
            <div className="flex justify-end">
              <Button size="lg" iconRight="arrowRight" onClick={() => validateStep(0) && setStep(1)}>
                {t('common.continue')}
              </Button>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <Field label={t('auth.selectSchool')} htmlFor="school" required error={errors.school}>
              <Select id="school" value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
                {db.schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.district}
                  </option>
                ))}
              </Select>
            </Field>
            {school ? (
              <div className="rounded-xl border border-ink-200 bg-ink-50 p-3 text-xs text-ink-600">
                <p><span className="font-semibold text-ink-800">School code:</span> {school.code}</p>
                <p className="mt-0.5"><span className="font-semibold text-ink-800">District:</span> {school.district}, {school.state}</p>
                <p className="mt-0.5"><span className="font-semibold text-ink-800">Low-attendance threshold:</span> {school.lowAttendanceThreshold}%</p>
              </div>
            ) : null}
            <fieldset>
              <legend className="mb-2 text-[13px] font-semibold text-ink-800">{t('prof.language')}</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {LANG_OPTIONS.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLanguage(code)}
                    aria-pressed={language === code}
                    className={cn(
                      'min-h-11 rounded-lg border px-3 py-2 text-sm font-medium',
                      language === code ? 'border-brand-600 bg-brand-50 text-brand-800 ring-1 ring-brand-600' : 'border-ink-200 text-ink-700 hover:bg-ink-50',
                    )}
                  >
                    {CONTENT_LANG_LABEL[code]}
                  </button>
                ))}
              </div>
            </fieldset>
            <p className="text-xs text-ink-500">
              You can switch language at any time. Resource languages are shown on each item.
            </p>
            <div className="flex justify-between gap-2">
              <Button variant="secondary" icon="arrowLeft" onClick={() => setStep(0)}>
                {t('common.back')}
              </Button>
              <Button size="lg" iconRight="arrowRight" onClick={() => validateStep(1) && setStep(2)}>
                {t('common.continue')}
              </Button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            {role === 'student' ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t('auth.selectClass')} htmlFor="grade" required>
                    <Select id="grade" value={gradeLevel} onChange={(e) => setGradeLevel(Number(e.target.value))}>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                        <option key={g} value={g}>Class {g}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={t('auth.selectSection')} htmlFor="section">
                    <Select id="section" value={section} onChange={(e) => setSection(e.target.value)}>
                      {['A', 'B', 'C', 'D'].map((s) => (
                        <option key={s} value={s}>Section {s}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Field label={`${t('common.classCode')} (${t('common.optional')})`} htmlFor="code" hint={t('auth.classCodeHint')} error={errors.classCode}>
                  <div className="flex gap-2">
                    <TextInput
                      id="code"
                      value={classCode}
                      onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                      placeholder="VIDYA-8A-2026"
                      className="font-mono tracking-wide"
                      invalid={!!errors.classCode}
                    />
                  </div>
                </Field>
                <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-xs text-brand-900">
                  <p className="font-semibold">Your sample class code</p>
                  <p className="mt-0.5">If your teacher has not shared one, use <span className="rounded bg-white px-1.5 py-0.5 font-mono">VIDYA-8A-2026</span> for the Class 8-A demo class.</p>
                </div>
              </>
            ) : null}

            {role === 'teacher' ? (
              <fieldset>
                <legend className="mb-2 text-[13px] font-semibold text-ink-800">{t('auth.subjects')}</legend>
                <div className="flex flex-wrap gap-2">
                  {SUBJECTS.map((s) => {
                    const active = subjects.includes(s.id)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSubjects((prev) => (active ? prev.filter((x) => x !== s.id) : [...prev, s.id]))}
                        aria-pressed={active}
                        className={cn(
                          'min-h-9 rounded-full border px-3 text-xs font-medium',
                          active ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50',
                        )}
                      >
                        {t(s.nameKey)}
                      </button>
                    )
                  })}
                </div>
                {errors.subjects ? <p className="mt-1 text-xs text-clay-700">{errors.subjects}</p> : null}
              </fieldset>
            ) : null}

            {role === 'parent' ? (
              <>
                <Field label={t('common.relationship')} htmlFor="relationship">
                  <Select id="relationship" value={relationship} onChange={(e) => setRelationship(e.target.value)}>
                    {['Mother', 'Father', 'Guardian', 'Other family member'].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </Select>
                </Field>
                <Callout tone="info" title={t('parent.linkTitle')}>
                  {t('prof.linkHint')} {t('parent.inviteHint')}
                </Callout>
              </>
            ) : null}

            {role === 'admin' ? (
              <Callout tone="info" title={t('role.admin')}>
                Administrator accounts are normally created by the block education office. This demo allows self-registration so you can review the administration screens.
              </Callout>
            ) : null}

            <div className="rounded-xl border border-ink-200 bg-ink-50 p-3.5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
                <Icon name="shield" size={16} className="text-brand-700" /> {t('auth.consentTitle')}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-600">{t('auth.consentBody')}</p>
              <Link to="/privacy" target="_blank" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 underline underline-offset-2">
                {t('nav.privacy')} <Icon name="external" size={12} />
              </Link>
            </div>

            <Checkbox checked={consent} onChange={setConsent} label={t('auth.consentCheck')} />
            {role === 'parent' ? <Checkbox checked={consent} onChange={setConsent} label={t('auth.guardianConsentCheck')} /> : null}
            {errors.consent ? <p className="text-xs font-medium text-clay-700" role="alert">{errors.consent}</p> : null}
            {submitError ? <Callout tone="danger" title={t(submitError)} /> : null}

            <div className="flex justify-between gap-2">
              <Button variant="secondary" icon="arrowLeft" onClick={() => setStep(1)}>
                {t('common.back')}
              </Button>
              <Button size="lg" iconRight="check" loading={busy} onClick={() => void submit()}>
                {t('auth.createBtn')}
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  )
}
