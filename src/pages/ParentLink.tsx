import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../lib/store'
import { useI18n } from '../lib/i18n'
import { classById, guardianChildren, schoolById, studentClassIds } from '../lib/access'
import { formatDateTime, normaliseCode, uid } from '../lib/utils'
import { Icon } from '../components/Icon'
import {
  Badge,
  Button,
  Callout,
  Card,
  Field,
  InfoList,
  PageHeader,
  SectionCard,
  TextArea,
  TextInput,
} from '../components/ui'

export function ParentLinkPage() {
  const { db, currentUser, mutate, toast } = useApp()
  const { t, lang } = useI18n()
  const [mode, setMode] = useState<'code' | 'approval'>('code')
  const [code, setCode] = useState('')
  const [childName, setChildName] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  if (!currentUser) return null
  if (currentUser.role !== 'parent') {
    return (
      <div className="mx-auto max-w-xl py-10">
        <Callout tone="warn" title={t('state.forbiddenTitle')}>{t('parent.accessNote')} {t('state.forbiddenBody')}</Callout>
        <Link to="/dashboard" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
          {t('state.goHome')} <Icon name="arrowRight" size={15} />
        </Link>
      </div>
    )
  }

  const school = schoolById(db, currentUser.schoolId)
  const children = guardianChildren(db, currentUser.id)
  const links = db.parentLinks.filter((l) => l.parentId === currentUser.id).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))

  const linkByCode = () => {
    setError('')
    const student = db.users.find(
      (u) => u.role === 'student' && u.schoolId === currentUser.schoolId && normaliseCode(u.inviteCode || '') === normaliseCode(code),
    )
    if (!student) {
      setError(t('prof.linkInvalid'))
      return
    }
    const existing = db.parentLinks.find((l) => l.parentId === currentUser.id && l.studentId === student.id)
    if (existing?.status === 'approved') {
      setError(t('prof.linkExists'))
      return
    }
    mutate((draft) => {
      if (existing) {
        const target = draft.parentLinks.find((l) => l.id === existing.id)
        if (target) {
          target.status = 'approved'
          target.respondedAt = new Date().toISOString()
          target.method = 'code'
          target.note = 'Invitation code verified.'
        }
      } else {
        draft.parentLinks.push({
          id: uid('pl'),
          parentId: currentUser.id,
          studentId: student.id,
          status: 'approved',
          requestedAt: new Date().toISOString(),
          respondedAt: new Date().toISOString(),
          method: 'code',
          note: 'Invitation code verified.',
        })
      }
      const cls = studentClassIds(db, student.id).map((id) => classById(db, id))[0]
      for (const userId of [student.id, cls?.teacherId].filter(Boolean) as string[]) {
        draft.notifications.unshift({
          id: uid('notif'),
          userId,
          kind: 'link',
          title: `${currentUser.name} linked as a guardian`,
          body: `${currentUser.name} used the invitation code for ${student.name}.`,
          link: userId === student.id ? '/profile' : '/admin/approvals',
          read: false,
          createdAt: new Date().toISOString(),
        })
      }
      draft.audit.unshift({
        id: uid('aud'),
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: 'parent',
        action: 'Linked guardian account',
        detail: `Verified invitation code for ${student.name}.`,
        at: new Date().toISOString(),
      })
    })
    toast('success', t('prof.approved'))
    setCode('')
  }

  const requestLink = () => {
    setError('')
    if (childName.trim().length < 3) {
      setError(t('prof.linkInvalid'))
      return
    }
    const matches = db.users.filter(
      (u) => u.role === 'student' && u.schoolId === currentUser.schoolId && u.name.toLowerCase() === childName.trim().toLowerCase(),
    )
    if (matches.length !== 1) {
      setError(t('prof.linkInvalid'))
      return
    }
    const student = matches[0]
    const existing = db.parentLinks.find((l) => l.parentId === currentUser.id && l.studentId === student.id)
    if (existing) {
      setError(t('prof.linkExists'))
      return
    }
    mutate((draft) => {
      draft.parentLinks.push({
        id: uid('pl'),
        parentId: currentUser.id,
        studentId: student.id,
        status: 'pending',
        requestedAt: new Date().toISOString(),
        method: 'approval',
        note: note.trim() || undefined,
      })
      draft.notifications.unshift({
        id: uid('notif'),
        userId: student.id,
        kind: 'link',
        title: 'Guardian link request',
        body: `${currentUser.name} asked to link to your account. Approve only if this is your guardian.`,
        link: '/profile',
        read: false,
        createdAt: new Date().toISOString(),
      })
      for (const admin of draft.users.filter((u) => u.role === 'admin' && u.schoolId === currentUser.schoolId)) {
        draft.notifications.unshift({
          id: uid('notif'),
          userId: admin.id,
          kind: 'link',
          title: 'Guardian link request awaiting approval',
          body: `${currentUser.name} requested a link to ${student.name}.`,
          link: '/admin/approvals',
          read: false,
          createdAt: new Date().toISOString(),
        })
      }
    })
    toast('success', t('prof.linkRequested'))
    setChildName('')
    setNote('')
  }

  const cancelRequest = (id: string) => {
    mutate((draft) => {
      const link = draft.parentLinks.find((l) => l.id === id)
      if (link) {
        link.status = 'rejected'
        link.respondedAt = new Date().toISOString()
      }
    })
    toast('success', t('prof.rejected'))
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader title={t('parent.linkTitle')} subtitle={t('parent.linkSub')} icon="link" />

      <Callout tone="info" icon="shield" title={t('parent.accessNote')}>
        {t('parent.noChildHint')} {t('parent.inviteHint')}
      </Callout>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <SectionCard title={t('parent.linkTitle')} subtitle={t('parent.linkMethod')} icon="link">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('code')}
              aria-pressed={mode === 'code'}
              className={`min-h-11 rounded-xl border px-3 text-xs font-semibold ${mode === 'code' ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-ink-200 text-ink-600 hover:bg-ink-50'}`}
            >
              {t('parent.linkCode')}
            </button>
            <button
              type="button"
              onClick={() => setMode('approval')}
              aria-pressed={mode === 'approval'}
              className={`min-h-11 rounded-xl border px-3 text-xs font-semibold ${mode === 'approval' ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-ink-200 text-ink-600 hover:bg-ink-50'}`}
            >
              {t('parent.linkApproval')}
            </button>
          </div>

          {error ? <Callout tone="danger" title={error} /> : null}

          {mode === 'code' ? (
            <div className="space-y-3">
              <Field label={t('parent.inviteCode')} htmlFor="parent-code" hint={t('parent.inviteHint')} required>
                <TextInput id="parent-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="AARAV-4821" className="font-mono tracking-wider" />
              </Field>
              <Button icon="link" onClick={linkByCode} disabled={code.trim().length < 4}>{t('prof.requestLink')}</Button>
              <p className="text-[10px] leading-relaxed text-ink-400">{t('parent.accessNote')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Field label={t('common.fullName')} htmlFor="parent-child" hint="Enter the student’s full name exactly as it appears on their account." required>
                <TextInput id="parent-child" value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="Imran Khan" />
              </Field>
              <Field label={t('common.note')} htmlFor="parent-note" hint={t('common.optional')}>
                <TextArea id="parent-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="I am Imran’s mother. Please verify with the class teacher." />
              </Field>
              <Button icon="message" onClick={requestLink} disabled={childName.trim().length < 3}>{t('prof.requestLink')}</Button>
              <p className="text-[10px] leading-relaxed text-ink-400">{t('prof.linkHint')}</p>
            </div>
          )}
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title={t('prof.linkedChildren')} subtitle={`${children.length} ${t('common.approved').toLowerCase()}`} icon="users">
            {children.length ? (
              <ul className="space-y-2">
                {children.map((child) => {
                  const cls = studentClassIds(db, child.id).map((id) => classById(db, id))[0]
                  return (
                    <li key={child.id} className="rounded-xl border border-ink-200 p-3">
                      <p className="text-sm font-bold text-ink-900">{child.name}</p>
                      <p className="mt-0.5 text-[11px] text-ink-500">{cls?.name} · {t('role.student')} · {child.rollNo ? `${t('classes.rollNo')} ${child.rollNo}` : ''}</p>
                      <Link to="/attendance" className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:underline">
                        {t('parent.childDetail')} <Icon name="arrowRight" size={12} />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-xs text-ink-500">{t('parent.noChildHint')}</p>
            )}
          </SectionCard>

          <SectionCard title={t('prof.pendingLinks')} icon="clock">
            {links.length ? (
              <ul className="divide-y divide-ink-100">
                {links.map((link) => {
                  const student = db.users.find((u) => u.id === link.studentId)
                  return (
                    <li key={link.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                      <div>
                        <p className="font-semibold text-ink-800">{student?.name}</p>
                        <p className="text-[10px] text-ink-400">{formatDateTime(link.requestedAt, lang)} · {link.method === 'code' ? t('parent.linkCode') : t('parent.linkApproval')}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge tone={link.status === 'approved' ? 'leaf' : link.status === 'pending' ? 'saffron' : 'clay'}>
                          {t(`common.${link.status}`)}
                        </Badge>
                        {link.status === 'pending' ? (
                          <Button size="sm" variant="ghost" onClick={() => cancelRequest(link.id)}>{t('common.cancel')}</Button>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-xs text-ink-500">{t('parent.noChild')}</p>
            )}
          </SectionCard>

          <Card className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-bold text-ink-900"><Icon name="school" size={16} className="text-brand-600" /> {school?.name}</p>
            <InfoList
              items={[
                { label: t('common.school'), value: school?.code || '—' },
                { label: t('common.relationship'), value: currentUser.relationship || '—' },
                { label: t('common.phone'), value: currentUser.phone || '—' },
              ]}
            />
            <p className="mt-2 text-[10px] leading-relaxed text-ink-400">{t('privacy.demoNote')}</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
