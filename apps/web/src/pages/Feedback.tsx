import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../lib/store'
import { useI18n } from '../lib/i18n'
import { formatDateTime, uid } from '../lib/utils'
import type { FeedbackCategory, FeedbackItem } from '../lib/types'
import { Icon } from '../components/Icon'
import {
  Badge,
  Button,
  Callout,
  Card,
  EmptyState,
  Field,
  PageHeader,
  SectionCard,
  Select,
  TextArea,
  TextInput,
  buttonClass,
} from '../components/ui'

const CATEGORIES: FeedbackCategory[] = ['learning-content', 'technical', 'suggestion', 'general']

const CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  'learning-content': 'fb.category.learning',
  technical: 'fb.category.technical',
  suggestion: 'fb.category.suggestion',
  general: 'fb.category.general',
}

export const feedbackStatusTone = (status: FeedbackItem['status']): 'brand' | 'saffron' | 'leaf' => {
  if (status === 'resolved') return 'leaf'
  if (status === 'reviewing') return 'saffron'
  return 'brand'
}

export function FeedbackPage() {
  const { db, currentUser, mutate, online, queueOffline, toast } = useApp()
  const { t, lang } = useI18n()
  const [category, setCategory] = useState<FeedbackCategory>('suggestion')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  if (!currentUser) return null
  const mine = db.feedback
    .filter((f) => f.userId === currentUser.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const submit = () => {
    if (subject.trim().length < 3 || message.trim().length < 10) {
      setError(t('fb.required'))
      return
    }
    const payload = {
      userId: currentUser.id,
      role: currentUser.role,
      category,
      subject: subject.trim(),
      message: message.trim(),
    }
    if (!online) {
      queueOffline('feedback', payload)
      toast('info', t('dl.savedOffline'), t('dl.queued'))
    } else {
      mutate((draft) => {
        draft.feedback.unshift({
          id: uid('fb'),
          userId: currentUser.id,
          role: currentUser.role,
          category,
          subject: subject.trim(),
          message: message.trim(),
          status: 'new',
          createdAt: new Date().toISOString(),
        })
        for (const admin of draft.users.filter((u) => u.role === 'admin' && u.schoolId === currentUser.schoolId)) {
          draft.notifications.unshift({
            id: uid('notif'),
            userId: admin.id,
            kind: 'system',
            title: `New feedback from ${currentUser.name}`,
            body: `${t(CATEGORY_LABEL[category])}: ${subject.trim()}`,
            link: '/admin/feedback',
            read: false,
            createdAt: new Date().toISOString(),
          })
        }
      })
      toast('success', t('fb.submitted'))
    }
    setSubject('')
    setMessage('')
    setError('')
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('fb.title')}
        subtitle={t('fb.sub')}
        icon="heart"
        actions={
          currentUser.role === 'admin' ? (
            <Link to="/admin/feedback" className={buttonClass('secondary', 'md')}>
              {t('fb.adminTitle')} <Icon name="arrowRight" size={16} />
            </Link>
          ) : null
        }
      />

      {!online ? <Callout tone="warn" title={t('state.offlineTitle')}>{t('dl.queued')}</Callout> : null}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <SectionCard title={t('fb.submit')} subtitle={t('fb.sub')} icon="message">
          <div className="space-y-3.5">
            {error ? <Callout tone="danger" title={error} /> : null}
            <Field label={t('fb.category')} htmlFor="fb-category">
              <Select id="fb-category" value={category} onChange={(e) => setCategory(e.target.value as FeedbackCategory)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{t(CATEGORY_LABEL[c])}</option>
                ))}
              </Select>
            </Field>
            <Field label={t('fb.subject')} htmlFor="fb-subject" required>
              <TextInput id="fb-subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={100} />
            </Field>
            <Field label={t('fb.message')} htmlFor="fb-message" hint={t('fb.messageHint')} required>
              <TextArea id="fb-message" value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-[150px]" maxLength={1200} />
            </Field>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] text-ink-400">{t('fb.messageHint')}</p>
              <Button icon="message" onClick={submit}>{t('fb.submit')}</Button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title={t('fb.history')} subtitle={`${mine.length} ${t('common.total').toLowerCase()}`} icon="clipboard">
          {mine.length ? (
            <ul className="space-y-2.5">
              {mine.map((f) => (
                <li key={f.id} className="rounded-xl border border-ink-200 p-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={feedbackStatusTone(f.status)}>{t(`fb.status.${f.status}`)}</Badge>
                    <Badge tone="neutral">{t(CATEGORY_LABEL[f.category])}</Badge>
                    <span className="ml-auto text-[10px] text-ink-400">{formatDateTime(f.createdAt, lang)}</span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-ink-900">{f.subject}</p>
                  <p className="mt-0.5 line-clamp-3 text-xs leading-relaxed text-ink-600">{f.message}</p>
                  {f.adminReply ? (
                    <div className="mt-2 rounded-lg border border-leaf-200 bg-leaf-50 p-2.5">
                      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-leaf-800">
                        <Icon name="message" size={12} /> {t('fb.adminReply')}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-leaf-900">{f.adminReply}</p>
                      {f.updatedAt ? <p className="mt-1 text-[10px] text-leaf-700">{formatDateTime(f.updatedAt, lang)}</p> : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="heart" title={t('fb.none')} description={t('fb.sub')} />
          )}
        </SectionCard>
      </div>

      <Callout tone="info" icon="shield" title={t('fb.messageHint')}>
        {t('app.demoBanner')} · {t('privacy.demoNote')}
      </Callout>
    </div>
  )
}

export function AdminFeedbackPage() {
  const { db, currentUser, mutate, notify, toast } = useApp()
  const { t, lang } = useI18n()
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [reply, setReply] = useState('')

  if (!currentUser || currentUser.role !== 'admin') return null
  const schoolUsers = new Set(db.users.filter((u) => u.schoolId === currentUser.schoolId).map((u) => u.id))
  const list = db.feedback
    .filter((f) => schoolUsers.has(f.userId))
    .filter((f) => category === 'all' || f.category === category)
    .filter((f) => status === 'all' || f.status === status)
    .sort((a, b) => Number(a.status === 'resolved') - Number(b.status === 'resolved') || b.createdAt.localeCompare(a.createdAt))
  const active = activeId ? db.feedback.find((f) => f.id === activeId) : null

  const update = (item: FeedbackItem, nextStatus: FeedbackItem['status'], response?: string) => {
    mutate((draft) => {
      const target = draft.feedback.find((f) => f.id === item.id)
      if (!target) return
      target.status = nextStatus
      if (response !== undefined) target.adminReply = response
      target.updatedAt = new Date().toISOString()
      draft.notifications.unshift({
        id: uid('notif'),
        userId: target.userId,
        kind: 'system',
        title: `Feedback update: ${target.subject}`,
        body: response || `Your feedback is now ${nextStatus}.`,
        link: '/feedback',
        read: false,
        createdAt: new Date().toISOString(),
      })
    })
    toast('success', response ? t('fb.replySent') : t('fb.updated'))
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader title={t('fb.adminTitle')} subtitle={t('fb.adminHint')} icon="message" />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
        <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label={t('fb.filterCategory')}>
          <option value="all">{t('fb.filterCategory')}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{t(CATEGORY_LABEL[c])}</option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t('fb.filterStatus')}>
          <option value="all">{t('fb.filterStatus')}</option>
          <option value="new">{t('fb.status.new')}</option>
          <option value="reviewing">{t('fb.status.reviewing')}</option>
          <option value="resolved">{t('fb.status.resolved')}</option>
        </Select>
        <Badge tone="brand">{list.length} {t('common.results').toLowerCase()}</Badge>
      </div>

      {list.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((f) => {
            const author = db.users.find((u) => u.id === f.userId)
            return (
              <Card key={f.id} className="flex flex-col p-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={feedbackStatusTone(f.status)}>{t(`fb.status.${f.status}`)}</Badge>
                  <Badge tone="neutral">{t(CATEGORY_LABEL[f.category])}</Badge>
                  <span className="ml-auto text-[10px] text-ink-400">{formatDateTime(f.createdAt, lang)}</span>
                </div>
                <h2 className="mt-1.5 text-sm font-bold text-ink-900">{f.subject}</h2>
                <p className="mt-1 text-xs leading-relaxed text-ink-600">{f.message}</p>
                <p className="mt-2 text-[11px] text-ink-500">{t('fb.from', { name: author?.name || '—', role: t(`role.${f.role}`) })}</p>
                {f.adminReply ? (
                  <div className="mt-2 rounded-lg border border-leaf-200 bg-leaf-50 p-2 text-xs text-leaf-900">
                    <p className="font-semibold">{t('fb.adminReply')}</p>
                    <p className="mt-0.5">{f.adminReply}</p>
                  </div>
                ) : null}
                <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                  <Button size="sm" variant="secondary" icon="message" onClick={() => { setActiveId(f.id); setReply(f.adminReply || '') }}>
                    {t('fb.reply')}
                  </Button>
                  <Select
                    value={f.status}
                    onChange={(e) => update(f, e.target.value as FeedbackItem['status'])}
                    className="w-auto min-w-[150px] text-xs"
                    aria-label={t('fb.updateStatus')}
                  >
                    <option value="new">{t('fb.status.new')}</option>
                    <option value="reviewing">{t('fb.status.reviewing')}</option>
                    <option value="resolved">{t('fb.status.resolved')}</option>
                  </Select>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState icon="message" title={t('fb.noItems')} description={t('fb.adminHint')} />
      )}

      {active ? (
        <SectionCard title={active.subject} subtitle={t('fb.reply')} icon="message">
          <div className="space-y-3">
            <div className="rounded-lg border border-ink-200 bg-ink-50/60 p-3 text-xs text-ink-700">{active.message}</div>
            <Field label={t('fb.reply')} htmlFor="admin-fb-reply">
              <TextArea id="admin-fb-reply" value={reply} onChange={(e) => setReply(e.target.value)} />
            </Field>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={() => { setActiveId(null); setReply('') }}>{t('common.cancel')}</Button>
              <Button
                icon="check"
                onClick={() => {
                  if (!reply.trim()) return
                  update(active, 'resolved', reply.trim())
                  setActiveId(null)
                  setReply('')
                }}
                disabled={!reply.trim()}
              >
                {t('fb.replySent')}
              </Button>
            </div>
          </div>
        </SectionCard>
      ) : null}
    </div>
  )
}
