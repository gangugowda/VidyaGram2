import { useMemo, useState } from 'react'
import { useApp } from '../lib/store'
import { useI18n } from '../lib/i18n'
import { canManageClass, classStudents, visibleClasses } from '../lib/access'
import { generateStudyAnswer } from '../lib/ai'
import { formatDateTime, subjectLabel, uid } from '../lib/utils'
import type { Doubt, DoubtReply } from '../lib/types'
import { Icon } from '../components/Icon'
import { SubjectChip } from '../components/shared'
import {
  Badge,
  Button,
  Callout,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  SectionCard,
  Select,
  Tabs,
  TextArea,
  TextInput,
  buttonClass,
} from '../components/ui'

export function DoubtsPage() {
  const { db, currentUser, mutate, notify, online, queueOffline, toast } = useApp()
  const { t } = useI18n()
  const [tab, setTab] = useState<'open' | 'resolved' | 'all'>('open')
  const [subject, setSubject] = useState('all')
  const [askOpen, setAskOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  if (!currentUser) return null
  const isStudent = currentUser.role === 'student'
  const isTeacher = currentUser.role === 'teacher'
  const isAdmin = currentUser.role === 'admin'
  const canReply = isTeacher || isAdmin

  const classes = visibleClasses(db, currentUser)
  const classIds = new Set(classes.map((c) => c.id))
  const scoped = db.doubts.filter((d) => {
    if (isStudent) return d.studentId === currentUser.id
    return classIds.has(d.classId)
  })
  const subjectOptions = Array.from(new Set(scoped.map((d) => d.subjectId)))

  const list = useMemo(
    () =>
      scoped
        .filter((d) => tab === 'all' || d.status === tab)
        .filter((d) => subject === 'all' || d.subjectId === subject)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [scoped, tab, subject],
  )

  const active = activeId ? db.doubts.find((d) => d.id === activeId) ?? null : null
  const openCount = scoped.filter((d) => d.status === 'open').length

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('doubt.title')}
        subtitle={isStudent ? t('doubt.sub') : t('doubt.teacherSub')}
        icon="message"
        actions={
          isStudent ? (
            <Button icon="plus" onClick={() => setAskOpen(true)}>{t('doubt.ask')}</Button>
          ) : (
            <Badge tone={openCount ? 'saffron' : 'leaf'} icon="message">
              {openCount} {t('doubt.pending').toLowerCase()}
            </Badge>
          )
        }
      />

      <Callout tone="info" icon="shield" title={t('doubt.privateNote')}>
        {isStudent ? t('doubt.notify') : t('doubt.teacherOnly')}
      </Callout>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          items={[
            { id: 'open', label: t('doubt.pending'), count: scoped.filter((d) => d.status === 'open').length },
            { id: 'resolved', label: t('doubt.resolved'), count: scoped.filter((d) => d.status === 'resolved').length },
            { id: 'all', label: t('doubt.all'), count: scoped.length },
          ]}
          value={tab}
          onChange={(id) => setTab(id as typeof tab)}
          className="flex-1"
        />
        {subjectOptions.length > 1 ? (
          <Select value={subject} onChange={(e) => setSubject(e.target.value)} className="sm:w-56" aria-label={t('doubt.filterSubject')}>
            <option value="all">{t('doubt.filterSubject')}</option>
            {subjectOptions.map((s) => (
              <option key={s} value={s}>{subjectLabel(s, t)}</option>
            ))}
          </Select>
        ) : null}
      </div>

      {list.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((d) => {
            const student = db.users.find((u) => u.id === d.studentId)
            const replies = d.replies.filter((r) => r.authorRole !== 'assistant')
            return (
              <article key={d.id} className="card flex flex-col p-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <SubjectChip subjectId={d.subjectId} />
                  <Badge tone={d.status === 'resolved' ? 'leaf' : 'saffron'} icon={d.status === 'resolved' ? 'checkCircle' : 'clock'}>
                    {d.status === 'resolved' ? t('doubt.resolved') : t('doubt.pending')}
                  </Badge>
                  {d.replies.some((r) => r.aiGenerated) ? <Badge tone="brand" icon="sparkles">{t('common.aiGenerated')}</Badge> : null}
                </div>
                <h2 className="mt-2 text-sm font-bold text-ink-900">{d.topic}</h2>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-600">{d.question}</p>
                <p className="mt-2 text-[11px] text-ink-500">
                  {t('doubt.askedBy', { name: student?.name || '—' })} · {formatDateTime(d.createdAt)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className={replies.length ? 'text-leaf-700' : 'text-saffron-800'}>
                    {replies.length ? `${replies.length} ${t('doubt.reply').toLowerCase()}` : t('doubt.noReply')}
                  </span>
                  <Button size="sm" variant="secondary" icon="message" onClick={() => setActiveId(d.id)} className="ml-auto">
                    {t('doubt.studentThread')}
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon="message"
          title={tab === 'open' ? t('doubt.noOpen') : t('doubt.noDoubts')}
          description={isStudent ? t('doubt.sub') : t('doubt.teacherSub')}
          action={isStudent ? <Button icon="plus" onClick={() => setAskOpen(true)}>{t('doubt.ask')}</Button> : null}
        />
      )}

      {isStudent ? <AskDoubtModal open={askOpen} onClose={() => setAskOpen(false)} /> : null}
      {active ? (
        <DoubtThread
          doubt={active}
          onClose={() => setActiveId(null)}
          canReply={canReply}
          canManage={canReply && (isAdmin || canManageClass(db, currentUser, active.classId))}
          isStudent={isStudent}
        />
      ) : null}

      {isTeacher ? (
        <SectionCard title={t('doubt.teacherOnly')} icon="shield">
          <p className="text-xs leading-relaxed text-ink-600">
            {t('doubt.privateNote')} {t('doubt.teacherOnly')}
          </p>
        </SectionCard>
      ) : null}
    </div>
  )
}

function AskDoubtModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db, currentUser, mutate, notify, online, queueOffline, toast } = useApp()
  const { t } = useI18n()
  const classes = currentUser ? visibleClasses(db, currentUser) : []
  const [classId, setClassId] = useState(classes[0]?.id || '')
  const [subjectId, setSubjectId] = useState(classes[0]?.subjectIds[0] || 'math')
  const [topic, setTopic] = useState('')
  const [question, setQuestion] = useState('')
  const [attachment, setAttachment] = useState('')
  const [errors, setErrors] = useState<string>('')

  if (!currentUser) return null
  const cls = classes.find((c) => c.id === classId)

  const submit = () => {
    if (topic.trim().length < 3 || question.trim().length < 10) {
      setErrors(t('doubt.required'))
      return
    }
    const payload = {
      studentId: currentUser.id,
      classId,
      subjectId,
      topic: topic.trim(),
      question: question.trim(),
      attachmentName: attachment || undefined,
    }
    if (!online) {
      queueOffline('doubt', payload)
      toast('info', t('dl.savedOffline'), t('dl.queued'))
    } else {
      mutate((draft) => {
        draft.doubts.unshift({
          id: uid('doubt'),
          ...payload,
          status: 'open',
          createdAt: new Date().toISOString(),
          replies: [],
        })
        const c = draft.classes.find((x) => x.id === classId)
        if (c) {
          const teacher = draft.users.find((u) => u.id === c.teacherId)
          if (teacher) {
            draft.notifications.unshift({
              id: uid('notif'),
              userId: teacher.id,
              kind: 'doubt',
              title: `New doubt from ${currentUser.name}`,
              body: topic.trim(),
              link: '/doubts',
              read: false,
              createdAt: new Date().toISOString(),
            })
          }
        }
      })
      toast('success', t('doubt.submitted'))
    }
    setTopic('')
    setQuestion('')
    setAttachment('')
    setErrors('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('doubt.ask')}
      description={t('doubt.privateNote')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button icon="message" onClick={submit}>{t('doubt.submit')}</Button>
        </>
      }
    >
      <div className="space-y-3.5">
        {errors ? <Callout tone="danger" title={errors} /> : null}
        {!online ? <Callout tone="warn" title={t('state.offlineTitle')}>{t('dl.queued')}</Callout> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('common.class')} htmlFor="doubt-class" required>
            <Select
              id="doubt-class"
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value)
                setSubjectId(classes.find((c) => c.id === e.target.value)?.subjectIds[0] || 'math')
              }}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label={t('common.subject')} htmlFor="doubt-subject" required>
            <Select id="doubt-subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {(cls?.subjectIds || []).map((s) => (
                <option key={s} value={s}>{subjectLabel(s, t)}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={t('doubt.topic')} htmlFor="doubt-topic" required>
          <TextInput id="doubt-topic" value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={90} />
        </Field>
        <Field label={t('doubt.question')} htmlFor="doubt-question" hint={t('doubt.questionHint')} required>
          <TextArea id="doubt-question" value={question} onChange={(e) => setQuestion(e.target.value)} className="min-h-[130px]" />
        </Field>
        <Field label={t('doubt.attachment')} htmlFor="doubt-file" hint={t('doubt.attachmentHint')}>
          <input
            id="doubt-file"
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => setAttachment(e.target.files?.[0]?.name || '')}
            className="block w-full text-xs text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand-800"
          />
        </Field>
        {attachment ? <p className="text-[11px] text-ink-500">{t('doubt.attachmentStored', { name: attachment })}</p> : null}
        <p className="text-[10px] text-ink-400">{t('doubt.aiHint')}</p>
      </div>
    </Modal>
  )
}

function DoubtThread({
  doubt,
  onClose,
  canReply,
  canManage,
  isStudent,
}: {
  doubt: Doubt
  onClose: () => void
  canReply: boolean
  canManage: boolean
  isStudent: boolean
}) {
  const { db, currentUser, mutate, notify, awardPoints, toast } = useApp()
  const { t } = useI18n()
  const [reply, setReply] = useState('')
  const [aiBusy, setAiBusy] = useState(false)

  if (!currentUser) return null
  const student = db.users.find((u) => u.id === doubt.studentId)
  const cls = db.classes.find((c) => c.id === doubt.classId)
  const subject = subjectLabel(doubt.subjectId, t)

  const addReply = (body: string, aiGenerated = false) => {
    if (!body.trim()) return
    mutate((draft) => {
      const target = draft.doubts.find((d) => d.id === doubt.id)
      if (!target) return
      const newReply: DoubtReply = {
        id: uid('dr'),
        authorId: aiGenerated ? 'assistant' : currentUser.id,
        authorRole: aiGenerated ? 'assistant' : currentUser.role,
        body: body.trim(),
        aiGenerated,
        createdAt: new Date().toISOString(),
      }
      target.replies.push(newReply)
      if (!aiGenerated && currentUser.role !== 'student' && target.status === 'open') {
        draft.notifications.unshift({
          id: uid('notif'),
          userId: target.studentId,
          kind: 'doubt',
          title: `Teacher replied to “${target.topic}”`,
          body: body.trim().slice(0, 140),
          link: '/doubts',
          read: false,
          createdAt: new Date().toISOString(),
        })
      }
      if (!aiGenerated && currentUser.role === 'student' && target.replies.some((r) => r.authorRole === 'teacher')) {
        draft.notifications.unshift({
          id: uid('notif'),
          userId: cls?.teacherId || '',
          kind: 'doubt',
          title: `Student added to “${target.topic}”`,
          body: body.trim().slice(0, 140),
          link: '/doubts',
          read: false,
          createdAt: new Date().toISOString(),
        })
      }
    })
    toast('success', aiGenerated ? t('common.aiGenerated') : t('doubt.replied'))
    setReply('')
  }

  const askAssistant = () => {
    setAiBusy(true)
    const answer = generateStudyAnswer(`${doubt.topic}. ${doubt.question}`)
    const body = `${answer.body}\n\n${answer.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n${answer.followUp}`
    addReply(body, true)
    setAiBusy(false)
  }

  const setStatus = (status: Doubt['status']) => {
    mutate((draft) => {
      const target = draft.doubts.find((d) => d.id === doubt.id)
      if (!target) return
      target.status = status
      target.resolvedAt = status === 'resolved' ? new Date().toISOString() : undefined
      if (status === 'resolved') {
        draft.activity.push({
          id: uid('act'),
          studentId: target.studentId,
          classId: target.classId,
          points: 4,
          reason: 'doubt-resolved',
          at: new Date().toISOString(),
        })
      }
      draft.notifications.unshift({
        id: uid('notif'),
        userId: target.studentId,
        kind: 'doubt',
        title: status === 'resolved' ? `Doubt resolved: ${target.topic}` : `Doubt reopened: ${target.topic}`,
        body: status === 'resolved' ? 'Your doubt was marked resolved. Open the thread to read the answer.' : 'Your teacher reopened this question.',
        link: '/doubts',
        read: false,
        createdAt: new Date().toISOString(),
      })
    })
    toast('success', status === 'resolved' ? t('doubt.resolvedToast') : t('doubt.reopened'))
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={doubt.topic}
      description={`${subject} · ${cls?.name || ''} · ${formatDateTime(doubt.createdAt)}`}
      size="lg"
      footer={
        <>
          {canManage ? (
            doubt.status === 'open' ? (
              <Button variant="success" icon="check" onClick={() => setStatus('resolved')} className="mr-auto">
                {t('doubt.markResolved')}
              </Button>
            ) : (
              <Button variant="secondary" icon="refresh" onClick={() => setStatus('open')} className="mr-auto">
                {t('doubt.reopen')}
              </Button>
            )
          ) : null}
          <Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="rounded-xl border border-ink-200 bg-ink-50/60 p-3.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <SubjectChip subjectId={doubt.subjectId} />
            <Badge tone={doubt.status === 'resolved' ? 'leaf' : 'saffron'}>
              {doubt.status === 'resolved' ? t('doubt.resolved') : t('doubt.pending')}
            </Badge>
            <span className="text-[11px] text-ink-500">{t('doubt.askedBy', { name: student?.name || '—' })}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-800">{doubt.question}</p>
          {doubt.attachmentName ? (
            <p className="mt-2 flex items-center gap-1 text-[11px] text-ink-500">
              <Icon name="image" size={13} /> {t('doubt.attachmentStored', { name: doubt.attachmentName })}
            </p>
          ) : null}
        </div>

        <div className="space-y-2.5">
          {doubt.replies.length === 0 ? (
            <p className="rounded-lg border border-dashed border-ink-200 px-3 py-4 text-center text-xs text-ink-500">{t('doubt.noReply')}</p>
          ) : null}
          {doubt.replies.map((r) => {
            const author = db.users.find((u) => u.id === r.authorId)
            const assistant = r.authorRole === 'assistant'
            return (
              <div
                key={r.id}
                className={`rounded-xl border p-3 ${assistant ? 'border-brand-200 bg-brand-50/60' : r.authorRole === 'teacher' || r.authorRole === 'admin' ? 'border-leaf-200 bg-leaf-50/50' : 'border-ink-200 bg-white'}`}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-ink-800">{assistant ? t('doubt.aiReply') : author?.name || t('common.teacher')}</span>
                  {assistant ? <Badge tone="brand" icon="sparkles">{t('common.aiGenerated')}</Badge> : null}
                  {r.authorRole === 'teacher' ? <Badge tone="leaf" icon="graduation">{t('role.teacher')}</Badge> : null}
                  <span className="ml-auto text-[10px] text-ink-400">{formatDateTime(r.createdAt)}</span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-ink-700">{r.body}</p>
                {assistant ? <p className="mt-1.5 text-[10px] text-ink-500">{t('ai.disclaimer')}</p> : null}
              </div>
            )
          })}
        </div>

        {canReply ? (
          <div className="rounded-xl border border-ink-200 p-3">
            <Field label={t('doubt.reply')} htmlFor="doubt-reply">
              <TextArea
                id="doubt-reply"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={t('doubt.replyPlaceholder')}
                className="min-h-[90px]"
              />
            </Field>
            <div className="mt-2 flex flex-wrap justify-end gap-2">
              <Button variant="secondary" size="sm" icon="sparkles" onClick={askAssistant} loading={aiBusy}>
                {t('doubt.aiHelp')}
              </Button>
              <Button size="sm" icon="message" onClick={() => addReply(reply)} disabled={!reply.trim()}>
                {t('doubt.sendReply')}
              </Button>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-ink-400">{t('doubt.aiHint')}</p>
          </div>
        ) : isStudent && doubt.status === 'open' ? (
          <div className="rounded-xl border border-ink-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-ink-800">{t('doubt.aiHelp')}</p>
                <p className="mt-0.5 text-[10px] text-ink-500">{t('doubt.aiHint')}</p>
              </div>
              <Button variant="secondary" size="sm" icon="sparkles" onClick={askAssistant} loading={aiBusy}>
                {t('common.open')}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
