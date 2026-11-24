import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../lib/store'
import { useI18n, LANG_OPTIONS, CONTENT_LANG_LABEL } from '../lib/i18n'
import {
  attendanceSummary,
  classById,
  guardianChildren,
  marksForStudent,
  schoolById,
  studentClassIds,
  visibleClasses,
} from '../lib/access'
import { downloadTextFile, formatDate, hashPassword, makeSalt, uid } from '../lib/utils'
import type { Lang } from '../lib/types'
import { Icon } from '../components/Icon'
import { AllBadges } from '../components/shared'
import {
  Badge,
  Button,
  Callout,
  Card,
  Checkbox,
  Field,
  InfoList,
  PageHeader,
  SectionCard,
  Select,
  TextInput,
  Toggle,
} from '../components/ui'

export function ProfilePage() {
  const { db, currentUser, mutate, notify, updateUser, toast } = useApp()
  const { t, lang, setLang, langs } = useI18n()
  const [name, setName] = useState(currentUser?.name || '')
  const [email, setEmail] = useState(currentUser?.email || '')
  const [phone, setPhone] = useState(currentUser?.phone || '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwBusy, setPwBusy] = useState(false)

  if (!currentUser) return null

  const school = schoolById(db, currentUser.schoolId)
  const myClasses = visibleClasses(db, currentUser)
  const linkedChildren = currentUser.role === 'parent' ? guardianChildren(db, currentUser.id) : []
  const pendingLinks = db.parentLinks.filter(
    (l) =>
      l.status === 'pending' &&
      (l.studentId === currentUser.id || (currentUser.role === 'parent' && l.parentId === currentUser.id)),
  )
  const myLinks = db.parentLinks.filter(
    (l) => (currentUser.role === 'parent' ? l.parentId === currentUser.id : l.studentId === currentUser.id),
  )

  const saveProfile = () => {
    const next: Record<string, string> = {}
    if (name.trim().length < 2) next.name = t('prof.nameInvalid')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = t('prof.emailInvalid')
    if (phone.trim() && !/^[6-9]\d{9}$/.test(phone.replace(/\D/g, ''))) next.phone = t('prof.phoneInvalid')
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }
    updateUser(currentUser.id, { name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim() || undefined })
    setErrors({})
    toast('success', t('prof.saved'))
  }

  const changePassword = async () => {
    setPwError('')
    if (newPassword.length < 8) {
      setPwError(t('auth.passwordWeak'))
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError(t('prof.passwordMismatch'))
      return
    }
    setPwBusy(true)
    const currentHash = await hashPassword(currentPassword, currentUser.salt)
    if (currentHash !== currentUser.passwordHash) {
      setPwBusy(false)
      setPwError(t('prof.passwordWrong'))
      return
    }
    const salt = makeSalt()
    const hash = await hashPassword(newPassword, salt)
    updateUser(currentUser.id, { salt, passwordHash: hash })
    setPwBusy(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    toast('success', t('prof.passwordChanged'))
  }

  const exportData = () => {
    const own = {
      exportedAt: new Date().toISOString(),
      notice: 'Demo export. Sample data only.',
      user: currentUser,
      school,
      classes: myClasses.map((c) => ({ name: c.name, code: c.code, teacherId: c.teacherId })),
      enrollments: db.enrollments.filter((e) => e.studentId === currentUser.id || currentUser.role === 'parent'),
      attendance: db.attendance
        .filter((d) => (currentUser.role === 'student' ? d.entries.some((e) => e.studentId === currentUser.id) : false))
        .map((d) => ({ date: d.date, classId: d.classId, entry: d.entries.find((e) => e.studentId === currentUser.id) })),
      marks: currentUser.role === 'student' ? marksForStudent(db, currentUser.id) : [],
      attempts: db.attempts.filter((a) => a.studentId === currentUser.id),
      downloads: db.downloads.filter((d) => d.userId === currentUser.id),
      bookmarks: db.bookmarks.filter((b) => b.userId === currentUser.id),
      doubts: db.doubts.filter((d) => d.studentId === currentUser.id),
      feedback: db.feedback.filter((f) => f.userId === currentUser.id),
      parentLinks: myLinks,
      notifications: db.notifications.filter((n) => n.userId === currentUser.id),
    }
    downloadTextFile(`vidyagram-${currentUser.role}-${currentUser.id}.json`, JSON.stringify(own, null, 2))
    toast('success', t('prof.exported'))
  }

  const requestDeletion = () => {
    if (!window.confirm(t('prof.deleteHint'))) return
    mutate((draft) => {
      draft.feedback.unshift({
        id: uid('fb'),
        userId: currentUser.id,
        role: currentUser.role,
        category: 'general',
        subject: 'Account deletion request',
        message: `${currentUser.name} (${currentUser.email}) requested account deletion. Review retention requirements before acting.`,
        status: 'new',
        createdAt: new Date().toISOString(),
      })
      for (const admin of draft.users.filter((u) => u.role === 'admin' && u.schoolId === currentUser.schoolId)) {
        draft.notifications.unshift({
          id: uid('notif'),
          userId: admin.id,
          kind: 'system',
          title: 'Account deletion request',
          body: `${currentUser.name} requested deletion. See the feedback inbox.`,
          link: '/admin/feedback',
          read: false,
          createdAt: new Date().toISOString(),
        })
      }
      draft.audit.unshift({
        id: uid('aud'),
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: 'Requested account deletion',
        detail: 'Recorded for administrator review. No data was deleted automatically.',
        at: new Date().toISOString(),
      })
    })
    toast('success', t('prof.deleteRequested'))
  }

  const approveLink = (id: string, status: 'approved' | 'rejected') => {
    mutate((draft) => {
      const link = draft.parentLinks.find((l) => l.id === id)
      if (!link) return
      link.status = status
      link.respondedAt = new Date().toISOString()
      draft.notifications.unshift({
        id: uid('notif'),
        userId: link.parentId,
        kind: 'link',
        title: status === 'approved' ? 'Guardian link approved' : 'Guardian link declined',
        body: status === 'approved' ? 'You can now view your child’s attendance and progress.' : 'The link request was declined. Contact the class teacher if this is a mistake.',
        link: status === 'approved' ? '/dashboard' : '/parent/link',
        read: false,
        createdAt: new Date().toISOString(),
      })
      draft.audit.unshift({
        id: uid('aud'),
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: status === 'approved' ? 'Approved guardian link' : 'Declined guardian link',
        detail: `Link ${id}`,
        at: new Date().toISOString(),
      })
    })
    toast('success', status === 'approved' ? t('prof.approved') : t('prof.rejected'))
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader title={t('prof.title')} subtitle={t('prof.sub')} icon="user" />

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <SectionCard title={t('prof.personal')} icon="user">
            <div className="space-y-3.5">
              <Field label={t('prof.name')} htmlFor="prof-name" required error={errors.name}>
                <TextInput id="prof-name" value={name} onChange={(e) => setName(e.target.value)} invalid={!!errors.name} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t('prof.email')} htmlFor="prof-email" required error={errors.email}>
                  <TextInput id="prof-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!errors.email} />
                </Field>
                <Field label={t('prof.phone')} htmlFor="prof-phone" hint={t('common.optional')} error={errors.phone}>
                  <TextInput id="prof-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} invalid={!!errors.phone} />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button icon="check" onClick={saveProfile}>{t('common.saveChanges')}</Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title={t('prof.academic')} icon="graduation">
            <InfoList
              items={[
                { label: t('prof.school'), value: school?.name || '—' },
                { label: t('prof.role'), value: t(`role.${currentUser.role}`) },
                ...(currentUser.role === 'student'
                  ? [
                      { label: t('prof.class'), value: myClasses.map((c) => c.name).join(', ') || '—' },
                      { label: t('prof.roll'), value: currentUser.rollNo || '—' },
                      { label: t('prof.section'), value: currentUser.section || '—' },
                      { label: t('prof.guardian'), value: currentUser.guardianName || '—' },
                      { label: t('prof.studentId'), value: currentUser.id },
                    ]
                  : []),
                ...(currentUser.role === 'teacher'
                  ? [
                      { label: t('prof.subjects'), value: (currentUser.subjectIds || []).join(', ') || '—' },
                      { label: t('common.roles'), value: currentUser.designation || t('role.teacher') },
                    ]
                  : []),
                ...(currentUser.role === 'parent'
                  ? [
                      { label: t('common.relationship'), value: currentUser.relationship || '—' },
                      { label: t('prof.linkedChildren'), value: linkedChildren.map((c) => c.name).join(', ') || t('parent.noChild') },
                    ]
                  : []),
                { label: t('prof.memberSince'), value: formatDate(currentUser.createdAt.slice(0, 10), lang) },
              ]}
            />
            {currentUser.role === 'student' ? (
              <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50 p-3">
                <p className="text-[11px] font-semibold text-brand-900">{t('parent.inviteCode')}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <code className="rounded bg-white px-2 py-1 text-sm font-bold tracking-wider text-brand-900">{currentUser.inviteCode || '—'}</code>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon="copy"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(currentUser.inviteCode || '')
                        toast('success', t('common.copied'))
                      } catch {
                        toast('error', t('common.errorTitle'))
                      }
                    }}
                  >
                    {t('common.copy')}
                  </Button>
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-ink-500">{t('parent.inviteHint')}</p>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title={t('prof.preferences')} icon="globe">
            <div className="space-y-4">
              <Field label={t('prof.language')} htmlFor="prof-lang">
                <Select
                  id="prof-lang"
                  value={lang}
                  onChange={(e) => {
                    const next = e.target.value as Lang
                    setLang(next)
                    updateUser(currentUser.id, { language: next })
                    toast('success', t('prof.saved'))
                  }}
                >
                  {LANG_OPTIONS.map((code) => {
                    const def = langs.find((l) => l.code === code)
                    return (
                      <option key={code} value={code}>
                        {CONTENT_LANG_LABEL[code]} · {def?.coverage ?? 0}%
                      </option>
                    )
                  })}
                </Select>
              </Field>
              <Toggle
                checked={!!currentUser.lowDataMode}
                onChange={(v) => updateUser(currentUser.id, { lowDataMode: v })}
                label={t('prof.lowData')}
                description={t('prof.lowDataHint')}
              />
              <div>
                <p className="text-sm font-semibold text-ink-800">{t('prof.textSize')}</p>
                <div className="mt-1.5 flex gap-2">
                  {(['normal', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      aria-pressed={(currentUser.textSize || 'normal') === size}
                      onClick={() => updateUser(currentUser.id, { textSize: size })}
                      className={`min-h-9 rounded-full border px-3 text-xs font-medium ${(currentUser.textSize || 'normal') === size ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 text-ink-700 hover:bg-ink-50'}`}
                    >
                      {size === 'normal' ? t('prof.textNormal') : t('prof.textLarge')}
                    </button>
                  ))}
                </div>
              </div>
              <Toggle
                checked={!!currentUser.reduceMotion}
                onChange={(v) => updateUser(currentUser.id, { reduceMotion: v })}
                label={t('prof.reduceMotion')}
                description={t('prof.lowDataHint')}
              />
              <Callout tone="info" icon="globe" title={t('prof.language')}>
                Interface coverage for {CONTENT_LANG_LABEL[lang]} is {langs.find((l) => l.code === lang)?.coverage ?? 0}%. Missing text falls back to English. Resource languages are shown on each item.
              </Callout>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title={t('prof.consent')} icon="shield">
            <div className="space-y-2">
              <Badge tone={currentUser.consentGiven ? 'leaf' : 'saffron'} icon={currentUser.consentGiven ? 'checkCircle' : 'alert'}>
                {currentUser.consentGiven && currentUser.consentAt
                  ? t('prof.consentGiven', { date: formatDate(currentUser.consentAt.slice(0, 10), lang) })
                  : t('prof.consentMissing')}
              </Badge>
              <p className="text-xs leading-relaxed text-ink-600">{t('privacy.consentBody')}</p>
              <Link to="/privacy" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
                {t('privacy.title')} <Icon name="arrowRight" size={13} />
              </Link>
            </div>
          </SectionCard>

          {currentUser.role === 'student' ? (
            <SectionCard title={t('prof.notifications')} icon="graduation">
              <AllBadges userId={currentUser.id} />
            </SectionCard>
          ) : null}

          <SectionCard title={t('prof.privacy')} icon="link">
            {currentUser.role === 'parent' ? (
              <div className="space-y-2.5">
                {linkedChildren.length ? (
                  <ul className="space-y-2">
                    {linkedChildren.map((child) => {
                      const cls = studentClassIds(db, child.id).map((id) => classById(db, id)).filter(Boolean)[0]
                      const att = attendanceSummary(db, child.id)
                      return (
                        <li key={child.id} className="rounded-xl border border-ink-200 p-2.5">
                          <p className="text-sm font-bold text-ink-900">{child.name}</p>
                          <p className="text-[11px] text-ink-500">{cls?.name} · {t('att.percentage', { pct: att.pct })}</p>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-ink-500">{t('parent.noChildHint')}</p>
                )}
                <Link to="/parent/link" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
                  {t('prof.linkChild')} <Icon name="arrowRight" size={13} />
                </Link>
              </div>
            ) : null}

            {currentUser.role === 'student' && pendingLinks.length ? (
              <ul className="space-y-2">
                {pendingLinks.map((link) => {
                  const parent = db.users.find((u) => u.id === link.parentId)
                  return (
                    <li key={link.id} className="rounded-xl border border-saffron-200 bg-saffron-50 p-2.5">
                      <p className="text-xs font-semibold text-saffron-900">{parent?.name} · {link.note || t('parent.linkApproval')}</p>
                      <div className="mt-1.5 flex gap-1.5">
                        <Button size="sm" variant="success" icon="check" onClick={() => approveLink(link.id, 'approved')}>{t('prof.approve')}</Button>
                        <Button size="sm" variant="ghost" onClick={() => approveLink(link.id, 'rejected')}>{t('prof.reject')}</Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : null}

            {currentUser.role === 'student' ? (
              <div className="mt-2 text-xs leading-relaxed text-ink-600">
                {t('parent.accessNote')} {t('prof.linkHint')}
              </div>
            ) : null}

            {currentUser.role !== 'parent' && currentUser.role !== 'student' ? (
              <p className="text-xs leading-relaxed text-ink-600">{t('parent.accessNote')} {t('admin.approvals')}.</p>
            ) : null}
          </SectionCard>

          <SectionCard title={t('prof.changePassword')} icon="lock">
            <div className="space-y-3">
              {pwError ? <Callout tone="danger" title={pwError} /> : null}
              <Field label={t('prof.currentPassword')} htmlFor="prof-current-pw" required>
                <TextInput id="prof-current-pw" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
              </Field>
              <Field label={t('prof.newPassword')} htmlFor="prof-new-pw" hint={t('auth.passwordHint')} required>
                <TextInput id="prof-new-pw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
              </Field>
              <Field label={t('prof.confirmPassword')} htmlFor="prof-confirm-pw" required>
                <TextInput id="prof-confirm-pw" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
              </Field>
              <Button icon="lock" loading={pwBusy} onClick={() => void changePassword()} disabled={!currentPassword || !newPassword}>
                {t('prof.changePassword')}
              </Button>
            </div>
          </SectionCard>

          <SectionCard title={t('prof.dangerZone')} icon="alert">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-ink-800">{t('prof.exportData')}</p>
                <p className="mt-0.5 text-[10px] text-ink-500">{t('privacy.demoNote')}</p>
                <Button size="sm" variant="secondary" icon="download" className="mt-1.5" onClick={exportData}>{t('prof.exportData')}</Button>
              </div>
              <div className="border-t border-ink-100 pt-3">
                <p className="text-xs font-semibold text-clay-800">{t('prof.deleteAccount')}</p>
                <p className="mt-0.5 text-[10px] text-ink-500">{t('prof.deleteHint')}</p>
                <Button size="sm" variant="danger" icon="trash" className="mt-1.5" onClick={requestDeletion}>{t('prof.deleteAccount')}</Button>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
