import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApp } from '../lib/store'
import { useI18n } from '../lib/i18n'
import { canManageClass, classById, classStudents, isClassTeacher, visibleClasses } from '../lib/access'
import { formatDate, formatTime, subjectLabel, todayISO, uid } from '../lib/utils'
import { subjectById } from '../lib/subjects'
import type { ClassSession, ClassRoom } from '../lib/types'
import { Icon } from '../components/Icon'
import { SessionCard, SessionStatusBadge, SubjectChip } from '../components/shared'
import {
  Badge,
  Button,
  Callout,
  Card,
  EmptyState,
  Field,
  InfoList,
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

export function LiveClassesPage() {
  const { db, currentUser, mutate, notify, toast, online, pendingSync } = useApp()
  const { t, lang } = useI18n()
  const [params] = useSearchParams()
  const [tab, setTab] = useState<'upcoming' | 'completed'>('upcoming')
  const [classFilter, setClassFilter] = useState(params.get('class') || 'all')
  const [scheduleOpen, setScheduleOpen] = useState(params.get('schedule') === '1')
  const [demoSession, setDemoSession] = useState<ClassSession | null>(null)

  if (!currentUser) return null
  const classes = visibleClasses(db, currentUser)
  const classIds = new Set(classes.map((c) => c.id))
  const canSchedule = currentUser.role === 'teacher' || currentUser.role === 'admin'
  const today = todayISO()

  const sessions = db.sessions
    .filter((s) => classIds.has(s.classId) && (classFilter === 'all' || s.classId === classFilter))
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))

  const upcoming = sessions.filter((s) => s.status === 'scheduled' || s.status === 'live')
  const completed = sessions.filter((s) => s.status === 'completed' || s.status === 'cancelled').reverse()
  const list = tab === 'upcoming' ? upcoming : completed

  const joinSession = (session: ClassSession) => {
    if (!online) {
      toast('error', t('state.offlineTitle'), t('dl.requiresOnline'))
      return
    }
    if (session.demoRoom || session.zoomLink?.startsWith('demo://')) {
      setDemoSession(session)
      return
    }
    if (!session.zoomLink) {
      toast('info', t('live.noLink'), t('live.noLinkHint'))
      return
    }
    window.open(session.zoomLink, '_blank', 'noopener,noreferrer')
    toast('success', t('live.join'), t('live.joinOpens'))
  }

  const markStatus = (session: ClassSession, status: ClassSession['status']) => {
    mutate((draft) => {
      const s = draft.sessions.find((x) => x.id === session.id)
      if (s) s.status = status
    })
    toast('success', t('live.statusUpdated'))
    if (status === 'cancelled') {
      for (const student of classStudents(db, session.classId)) {
        notify(student.id, 'class', t('live.cancelled'), session.title, '/live')
      }
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('live.title')}
        subtitle={canSchedule ? t('live.teacherSub') : t('live.sub')}
        icon="video"
        actions={canSchedule ? <Button icon="plus" onClick={() => setScheduleOpen(true)}>{t('live.schedule')}</Button> : null}
      />

      {!online ? (
        <Callout tone="warn" title={t('state.offlineTitle')}>
          {t('dl.requiresOnline')} {pendingSync ? t('shell.syncPending', { count: pendingSync }) : ''}
        </Callout>
      ) : null}

      <Callout tone="info" title={t('live.zoomNotConfigured')}>
        {t('live.zoomNotConfiguredBody')}
      </Callout>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          items={[
            { id: 'upcoming', label: t('live.upcoming'), count: upcoming.length },
            { id: 'completed', label: t('live.completed'), count: completed.length },
          ]}
          value={tab}
          onChange={(id) => setTab(id as 'upcoming' | 'completed')}
          className="flex-1"
        />
        {classes.length > 1 ? (
          <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="sm:w-64" aria-label={t('common.class')}>
            <option value="all">{t('common.all')} {t('common.class').toLowerCase()}es</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        ) : null}
      </div>

      {list.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((session) => {
            const cls = classById(db, session.classId)
            const subject = subjectById(session.subjectId)
            const canJoin = session.status === 'scheduled' || session.status === 'live'
            const manager = canManageClass(db, currentUser, session.classId)
            const start = new Date(`${session.date}T${session.startTime}:00`)
            const minutesUntil = Math.round((start.getTime() - Date.now()) / 60000)
            const inWindow = minutesUntil <= 15 && minutesUntil >= -session.durationMin
            const linkReady = !!session.zoomLink
            const demo = session.demoRoom || session.zoomLink?.startsWith('demo://')
            return (
              <Card key={session.id} className="p-4">
                <div className="flex items-start gap-3">
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white ${subject?.color || 'bg-brand-600'}`}>
                    <Icon name="video" size={21} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <SessionStatusBadge status={session.status} />
                      {demo ? <Badge tone="saffron" icon="info">{t('live.demoRoom')}</Badge> : null}
                      <SubjectChip subjectId={session.subjectId} />
                    </div>
                    <h3 className="mt-1.5 text-sm font-bold text-ink-900">{session.title}</h3>
                    <p className="mt-0.5 text-xs text-ink-500">{cls?.name} · {formatDate(session.date, lang, 'weekday')} · {formatTime(session.startTime, lang)}</p>
                    <p className="text-xs text-ink-500">{session.durationMin} {t('common.minutes')} · {t(subject?.nameKey || 'common.subject')}</p>
                    {session.description ? <p className="mt-1 text-[11px] leading-relaxed text-ink-600">{session.description}</p> : null}
                    {session.resourceIds.length ? (
                      <Link to="/materials" className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:underline">
                        <Icon name="book" size={12} /> {t('live.materialsAttached', { count: session.resourceIds.length })}
                      </Link>
                    ) : null}
                    {session.recordingIds.length ? (
                      <Link to="/recordings" className="ml-3 mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:underline">
                        <Icon name="play" size={12} /> {t('live.recordingAvailable')}
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
                  {canJoin ? (
                    <Button
                      size="sm"
                      icon="video"
                      variant={demo ? 'secondary' : 'primary'}
                      onClick={() => joinSession(session)}
                      disabled={!online || (!demo && (!linkReady || !inWindow))}
                    >
                      {demo ? `Open ${t('live.demoRoom').split('—')[0].trim()}` : t('live.join')}
                    </Button>
                  ) : null}
                  {!demo && canJoin && !inWindow ? (
                    <span className="text-[10px] text-ink-500">{t('live.joinWindow')}</span>
                  ) : null}
                  {!linkReady && !demo ? <span className="text-[10px] text-clay-700">{t('live.noLink')}</span> : null}
                  {manager && session.status === 'scheduled' ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => markStatus(session, 'completed')}>{t('live.markCompleted')}</Button>
                      <Button size="sm" variant="ghost" onClick={() => markStatus(session, 'cancelled')}>{t('live.cancel')}</Button>
                    </>
                  ) : null}
                  {session.zoomLink && !demo ? (
                    <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-ink-400"><Icon name="lock" size={11} /> {t('live.linkRestricted')}</span>
                  ) : null}
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon="video"
          title={tab === 'upcoming' ? t('dash.noUpcoming') : t('live.noSessions')}
          description={canSchedule ? t('live.teacherSub') : t('live.sub')}
          action={canSchedule ? <Button icon="plus" onClick={() => setScheduleOpen(true)}>{t('live.schedule')}</Button> : null}
        />
      )}

      <SectionCard title={t('live.sessionDetails')} subtitle={t('live.teacherNote')} icon="info" bodyClassName="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-ink-50 p-3">
            <p className="text-xs font-bold text-ink-800">{t('live.joinWindow')}</p>
            <p className="mt-0.5 text-[11px] text-ink-500">{t('live.joinOpens')}</p>
          </div>
          <div className="rounded-xl bg-saffron-50 p-3">
            <p className="text-xs font-bold text-saffron-900">{t('live.zoomNotConfigured')}</p>
            <p className="mt-0.5 text-[11px] text-saffron-800">{t('live.zoomNotConfiguredBody')}</p>
          </div>
        </div>
        <p className="text-[10px] text-ink-400">{t('app.demoBanner')}</p>
      </SectionCard>

      <DemoRoom
        session={demoSession}
        onClose={() => setDemoSession(null)}
        onLeave={() => {
          setDemoSession(null)
          toast('info', t('live.demoRoom'), 'You left the demonstration room. No meeting was recorded.')
        }}
      />

      {canSchedule ? <ScheduleModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} classes={classes} /> : null}
    </div>
  )
}

function DemoRoom({ session, onClose, onLeave }: { session: ClassSession | null; onClose: () => void; onLeave: () => void }) {
  const { db, currentUser, online } = useApp()
  const { t, lang } = useI18n()
  if (!session) return null
  const cls = classById(db, session.classId)
  const teacher = db.users.find((u) => u.id === session.teacherId)
  const subject = subjectById(session.subjectId)
  const allowed = currentUser?.role === 'admin' || currentUser?.role === 'teacher' || (currentUser && classStudents(db, session.classId).some((s) => s.id === currentUser.id)) || (currentUser?.role === 'parent' && db.parentLinks.some((l) => l.parentId === currentUser.id && l.status === 'approved' && classStudents(db, session.classId).some((s) => s.id === l.studentId)))

  return (
    <Modal
      open
      onClose={onClose}
      title={session.title}
      description={`${cls?.name} · ${t(subject?.nameKey || 'common.subject')} · ${teacher?.name}`}
      size="lg"
      footer={
        <>
          <span className="mr-auto hidden items-center gap-1 text-[11px] text-ink-400 sm:flex"><Icon name="info" size={13} /> {t('live.demoRoomHint')}</span>
          <Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>
          <Button variant="danger" onClick={onLeave}>{t('common.remove') === 'Remove' ? 'Leave room' : t('common.remove')}</Button>
        </>
      }
    >
      {!allowed ? (
        <Callout tone="danger" title={t('state.forbiddenTitle')}>{t('live.linkRestricted')}</Callout>
      ) : !online ? (
        <Callout tone="warn" title={t('state.offlineTitle')}>{t('dl.requiresOnline')}</Callout>
      ) : (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-xl bg-ink-900 p-4 text-white">
            <div className="absolute inset-0 opacity-20 subtle-grid" aria-hidden="true" />
            <div className="relative">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge tone="saffron" icon="video">{t('live.demoRoom')}</Badge>
                <span className="flex items-center gap-1 text-[11px] text-brand-100"><Icon name="zap" size={12} /> Simulated live view</span>
              </div>
              <div className="mt-6 grid place-items-center text-center">
                <span className="grid h-20 w-20 place-items-center rounded-full bg-white/10">
                  <Icon name="video" size={34} />
                </span>
                <p className="mt-3 text-lg font-bold">{teacher?.name}</p>
                <p className="text-xs text-brand-100">{session.description || t('live.demoRoomHint')}</p>
                <p className="mt-4 max-w-md rounded-lg bg-black/30 px-3 py-2 text-[11px] leading-relaxed text-brand-100">
                  This is a demonstration room inside VidyaGram. It does not connect to Zoom, does not use your camera or microphone, and does not create a real meeting.
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-ink-200 p-3">
              <p className="text-xs font-semibold text-ink-800">{t('common.date')} & {t('common.time')}</p>
              <p className="mt-0.5 text-[11px] text-ink-500">{formatDate(session.date, lang, 'weekday')} · {formatTime(session.startTime, lang)} · {session.durationMin} {t('common.minutes')}</p>
            </div>
            <div className="rounded-xl border border-ink-200 p-3">
              <p className="text-xs font-semibold text-ink-800">{t('live.attachMaterials')}</p>
              <p className="mt-0.5 text-[11px] text-ink-500">{session.resourceIds.length ? t('live.materialsAttached', { count: session.resourceIds.length }) : t('common.none')}</p>
              {session.resourceIds.length ? <Link to="/materials" className="mt-1 inline-block text-[11px] font-semibold text-brand-700 hover:underline">{t('nav.materials')}</Link> : null}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

function ScheduleModal({ open, onClose, classes }: { open: boolean; onClose: () => void; classes: ClassRoom[] }) {
  const { db, currentUser, mutate, notify, toast } = useApp()
  const { t } = useI18n()
  const [title, setTitle] = useState('')
  const [classId, setClassId] = useState(classes[0]?.id || '')
  const [subjectId, setSubjectId] = useState(classes[0]?.subjectIds[0] || 'math')
  const [date, setDate] = useState(todayISO())
  const [startTime, setStartTime] = useState('10:00')
  const [durationMin, setDurationMin] = useState(40)
  const [description, setDescription] = useState('')
  const [materialIds, setMaterialIds] = useState<string[]>([])
  const [demoRoom, setDemoRoom] = useState(true)
  const [zoomLink, setZoomLink] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const cls = classById(db, classId)
  const materials = db.resources.filter((r) => r.classId === classId && r.published)

  const submit = () => {
    if (!currentUser) return
    const next: Record<string, string> = {}
    if (title.trim().length < 3) next.title = t('live.required')
    if (!classId) next.classId = t('common.required')
    if (!date || !startTime) next.time = t('live.required')
    if (date < todayISO()) next.time = t('live.datePast')
    if (!demoRoom && zoomLink && !/^https?:\/\//i.test(zoomLink)) next.zoomLink = t('sch.linkInvalid')
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }
    const id = uid('ses')
    mutate((draft) => {
      draft.sessions.push({
        id,
        classId,
        subjectId,
        title: title.trim(),
        description: description.trim() || undefined,
        date,
        startTime,
        durationMin,
        teacherId: currentUser.id,
        status: 'scheduled',
        demoRoom: demoRoom || undefined,
        zoomLink: demoRoom ? `demo://classroom/${id}` : zoomLink.trim() || undefined,
        resourceIds: materialIds,
        recordingIds: [],
        createdAt: new Date().toISOString(),
      })
      for (const student of classStudents(draft, classId)) {
        draft.notifications.unshift({
          id: uid('notif'),
          userId: student.id,
          kind: 'class',
          title: `${t('live.schedule')}: ${title.trim()}`,
          body: `${formatDate(date, 'en')} · ${startTime} · ${currentUser.name}`,
          link: '/live',
          read: false,
          createdAt: new Date().toISOString(),
        })
      }
      draft.audit.unshift({
        id: uid('aud'),
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: 'Scheduled live class',
        detail: `${title.trim()} · ${cls?.name || classId}`,
        at: new Date().toISOString(),
      })
    })
    toast('success', t('live.createSuccess'))
    setTitle('')
    setDescription('')
    setMaterialIds([])
    setErrors({})
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('live.schedule')}
      description={t('live.teacherSub')}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={submit} icon="video">{t('live.schedule')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={t('live.name')} htmlFor="session-title" required error={errors.title}>
          <TextInput id="session-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('live.name')} invalid={!!errors.title} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('common.class')} htmlFor="session-class" required>
            <Select id="session-class" value={classId} onChange={(e) => { setClassId(e.target.value); setSubjectId(classById(db, e.target.value)?.subjectIds[0] || 'math') }}>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label={t('common.subject')} htmlFor="session-subject" required>
            <Select id="session-subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {(cls?.subjectIds || []).map((s) => <option key={s} value={s}>{subjectLabel(s, t)}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t('common.date')} htmlFor="session-date" required error={errors.time}>
            <TextInput id="session-date" type="date" value={date} min={todayISO()} onChange={(e) => setDate(e.target.value)} invalid={!!errors.time} />
          </Field>
          <Field label={t('live.startTime')} htmlFor="session-time" required>
            <TextInput id="session-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </Field>
          <Field label={t('live.duration')} htmlFor="session-duration">
            <Select id="session-duration" value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))}>
              {[30, 40, 45, 60, 90].map((m) => <option key={m} value={m}>{m} {t('common.minutes')}</option>)}
            </Select>
          </Field>
        </div>
        <Field label={t('live.description')} htmlFor="session-description">
          <TextArea id="session-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('live.description')} />
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-semibold text-ink-800">{t('live.attachMaterials')}</legend>
          {materials.length ? (
            <div className="max-h-36 space-y-1 overflow-y-auto rounded-xl border border-ink-200 p-2">
              {materials.map((m) => (
                <label key={m.id} className="flex items-start gap-2 rounded-lg p-1.5 hover:bg-ink-50">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-ink-300"
                    checked={materialIds.includes(m.id)}
                    onChange={(e) => setMaterialIds((prev) => (e.target.checked ? [...prev, m.id] : prev.filter((x) => x !== m.id)))}
                  />
                  <span className="text-[11px] text-ink-700">{m.title}</span>
                </label>
              ))}
            </div>
          ) : <p className="text-xs text-ink-500">{t('mat.noResults')}</p>}
        </fieldset>

        <div className="rounded-xl border border-saffron-200 bg-saffron-50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-bold text-saffron-900"><Icon name="alert" size={14} /> {t('live.zoomNotConfigured')}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-saffron-800">{t('live.zoomNotConfiguredBody')}</p>
        </div>
        <Toggle checked={demoRoom} onChange={setDemoRoom} label={t('live.useDemoRoom')} description={t('live.demoRoomHint')} />
        {!demoRoom ? (
          <Field label={t('live.pasteLink')} htmlFor="session-link" hint={t('live.joinOpens')} error={errors.zoomLink}>
            <TextInput id="session-link" value={zoomLink} onChange={(e) => setZoomLink(e.target.value)} placeholder="https://…" invalid={!!errors.zoomLink} />
          </Field>
        ) : null}
      </div>
    </Modal>
  )
}
