import { useMemo, useState } from 'react'
import { useApp } from '../lib/store'
import { useI18n } from '../lib/i18n'
import { classById, visibleClasses } from '../lib/access'
import { formatDate, formatSize, subjectLabel, todayISO, uid } from '../lib/utils'
import { subjectById } from '../lib/subjects'
import { buildRecordingDownload, recordingPlayable, storageLeftKB } from '../lib/offline'
import type { Lang, Recording } from '../lib/types'
import { Icon } from '../components/Icon'
import { LanguageTags, RecordingAvailability, SubjectChip } from '../components/shared'
import {
  Badge,
  Button,
  Callout,
  Card,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  SectionCard,
  Select,
  TextArea,
  TextInput,
  Toggle,
  buttonClass,
} from '../components/ui'

const LANGS: Array<{ code: Lang; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'mr', label: 'मराठी' },
]

export function RecordingsPage() {
  const { db, currentUser, mutate, toast, online } = useApp()
  const { t, lang } = useI18n()
  const [query, setQuery] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [chapterFilter, setChapterFilter] = useState('all')
  const [teacherFilter, setTeacherFilter] = useState('all')
  const [playing, setPlaying] = useState<Recording | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  if (!currentUser) return null
  const classes = visibleClasses(db, currentUser)
  const classIds = new Set(classes.map((c) => c.id))
  const canManage = currentUser.role === 'teacher' || currentUser.role === 'admin'
  const lowData = !!currentUser.lowDataMode

  const mine = db.recordings.filter((r) => classIds.has(r.classId))
  const chapters = Array.from(new Set(mine.map((r) => r.chapter))).sort()
  const teachers = Array.from(new Set(mine.map((r) => r.teacherId)))
    .map((id) => db.users.find((u) => u.id === id))
    .filter((u): u is NonNullable<typeof u> => !!u)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return mine
      .filter((r) => classFilter === 'all' || r.classId === classFilter)
      .filter((r) => subjectFilter === 'all' || r.subjectId === subjectFilter)
      .filter((r) => chapterFilter === 'all' || r.chapter === chapterFilter)
      .filter((r) => teacherFilter === 'all' || r.teacherId === teacherFilter)
      .filter((r) => !q || `${r.title} ${r.chapter} ${r.description || ''}`.toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [mine, classFilter, subjectFilter, chapterFilter, teacherFilter, query])

  const download = (recording: Recording) => {
    if (!currentUser) return
    const result = buildRecordingDownload(db, currentUser.id, recording)
    if (!result.ok) {
      if (result.error === 'exists') toast('info', t('common.downloaded'), recording.title)
      else if (result.error === 'no-space') toast('error', t('dl.noSpace'), `${storageLeftKB(db, currentUser.id)} KB ${t('common.download').toLowerCase()} left`)
      else toast('error', t('rec.downloadDisabled'), recording.title)
      return
    }
    mutate((draft) => {
      draft.downloads.push(result.download)
      draft.activity.push({
        id: uid('act'),
        studentId: currentUser.id,
        classId: recording.classId,
        points: 2,
        reason: 'download-recording',
        at: new Date().toISOString(),
      })
    })
    toast('success', t('dl.offlineReady'), `${recording.title} · ${formatSize(recording.sizeMB * 1024)}`)
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('rec.title')}
        subtitle={t('rec.sub')}
        icon="play"
        actions={canManage ? <Button icon="upload" onClick={() => setUploadOpen(true)}>{t('rec.upload')}</Button> : null}
      />

      {lowData ? <Callout tone="success" icon="leaf" title={t('shell.lowDataOn')}>{t('rec.lowDataNote')}</Callout> : null}
      {!online ? <Callout tone="warn" title={t('state.offlineTitle')}>{t('rec.playUnavailable')}</Callout> : null}

      <SectionCard icon="filter" bodyClassName="space-y-3">
        <div className="relative">
          <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-3 text-ink-400" />
          <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('rec.search')} className="pl-9" aria-label={t('rec.search')} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} aria-label={t('rec.allClasses')}>
            <option value="all">{t('rec.allClasses')}</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} aria-label={t('rec.allSubjects')}>
            <option value="all">{t('rec.allSubjects')}</option>
            {Array.from(new Set(mine.map((r) => r.subjectId))).map((s) => <option key={s} value={s}>{subjectLabel(s, t)}</option>)}
          </Select>
          <Select value={chapterFilter} onChange={(e) => setChapterFilter(e.target.value)} aria-label={t('rec.allChapters')}>
            <option value="all">{t('rec.allChapters')}</option>
            {chapters.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={teacherFilter} onChange={(e) => setTeacherFilter(e.target.value)} aria-label={t('rec.allTeachers')}>
            <option value="all">{t('rec.allTeachers')}</option>
            {teachers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </div>
        <p className="text-[10px] text-ink-400">{t('rec.teacherHint')} · {filtered.length} {t('common.results').toLowerCase()}</p>
      </SectionCard>

      {filtered.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((r) => {
            const cls = classById(db, r.classId)
            const teacher = db.users.find((u) => u.id === r.teacherId)
            const downloadable = r.downloadEnabled
            const downloaded = db.downloads.some((d) => d.userId === currentUser.id && d.kind === 'recording' && d.refId === r.id)
            return (
              <Card key={r.id} className="p-4">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setPlaying(r)}
                    className="relative grid h-16 w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-800 text-white hover:bg-ink-700"
                    aria-label={`${t('rec.watch')}: ${r.title}`}
                  >
                    <Icon name={recordingPlayable(r) ? 'play' : 'video'} size={22} className={recordingPlayable(r) ? '' : 'opacity-50'} />
                    <span className="absolute bottom-0.5 right-1 rounded bg-black/50 px-1 text-[9px] font-semibold">{r.durationMin}m</span>
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <RecordingAvailability recording={r} />
                      <SubjectChip subjectId={r.subjectId} />
                      {lowData ? <Badge tone="leaf" icon="leaf">{t('shell.lowData')}</Badge> : null}
                    </div>
                    <h3 className="mt-1 text-sm font-bold leading-snug text-ink-900">{r.title}</h3>
                    <p className="mt-0.5 text-xs text-ink-500">{cls?.name} · {teacher?.name} · {formatDate(r.date, lang)}</p>
                    <p className="text-[11px] text-ink-500">{r.chapter} · <LanguageTags languages={[r.language]} /></p>
                    {r.description ? <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ink-600">{r.description}</p> : null}
                    <p className="mt-1 text-[10px] text-ink-400">{formatSize(r.sizeMB * 1024)} · {r.source === 'zoom' ? t('rec.sourceZoom') : t('rec.sourceUpload')}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-ink-100 pt-3">
                  <Button size="sm" variant={recordingPlayable(r) ? 'primary' : 'secondary'} icon="play" onClick={() => setPlaying(r)}>
                    {recordingPlayable(r) ? t('rec.watch') : t('common.open')}
                  </Button>
                  {downloadable ? (
                    <Button size="sm" variant={downloaded ? 'quiet' : 'secondary'} icon="download" onClick={() => download(r)} disabled={downloaded}>
                      {downloaded ? t('common.downloaded') : t('rec.download')}
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-ink-500"><Icon name="lock" size={12} /> {t('rec.downloadsOff')}</span>
                  )}
                  <span className="ml-auto self-center text-[10px] text-ink-400">{t('rec.sizeBefore', { size: formatSize(r.sizeMB * 1024) })}</span>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState icon="play" title={t('rec.noResults')} description={t('rec.sub')} action={<Button variant="secondary" size="sm" onClick={() => { setQuery(''); setClassFilter('all'); setSubjectFilter('all'); setChapterFilter('all'); setTeacherFilter('all') }}>{t('common.filters')}</Button>} />
      )}

      <Callout tone="info" title={t('rec.playUnavailableTitle')}>{t('rec.playUnavailableBody')}</Callout>

      {canManage ? <UploadRecordingModal open={uploadOpen} onClose={() => setUploadOpen(false)} /> : null}
      <PlayerModal recording={playing} onClose={() => setPlaying(null)} />
    </div>
  )
}

function PlayerModal({ recording, onClose }: { recording: Recording | null; onClose: () => void }) {
  const { t, lang } = useI18n()
  if (!recording) return null
  const playable = recordingPlayable(recording)
  return (
    <Modal open onClose={onClose} title={recording.title} description={`${recording.chapter} · ${formatDate(recording.date, lang)}`} size="lg">
      <div className="space-y-3">
        {playable ? (
          <video controls preload="metadata" className="w-full rounded-xl bg-black" aria-label={recording.title}>
            <source src={recording.mediaUrl} type="video/mp4" />
            Your browser does not support video playback.
          </video>
        ) : (
          <div className="rounded-xl border border-saffron-200 bg-saffron-50 p-5 text-center">
            <Icon name="video" size={32} className="mx-auto text-saffron-600" />
            <p className="mt-2 font-bold text-saffron-900">{t('rec.playUnavailableTitle')}</p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-saffron-800">{t('rec.playUnavailableBody')}</p>
          </div>
        )}
        {recording.mediaUrl ? (
          <div className="rounded-lg bg-brand-50 p-2.5 text-[10px] leading-relaxed text-brand-900">
            <Icon name="info" size={12} className="mr-1 inline" />
            Demonstration clip. {recording.description}
          </div>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-ink-200 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">{t('common.language')}</p>
            <p className="mt-0.5 text-xs text-ink-800"><LanguageTags languages={[recording.language]} /></p>
          </div>
          <div className="rounded-xl border border-ink-200 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">{t('common.size')}</p>
            <p className="mt-0.5 text-xs text-ink-800">{formatSize(recording.sizeMB * 1024)} · {recording.durationMin} {t('common.minutes')}</p>
          </div>
        </div>
        <p className="text-[10px] text-ink-400">{t('dl.requiresOnline')}</p>
      </div>
    </Modal>
  )
}

function UploadRecordingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db, currentUser, mutate, toast } = useApp()
  const { t } = useI18n()
  const classes = currentUser ? visibleClasses(db, currentUser) : []
  const [title, setTitle] = useState('')
  const [classId, setClassId] = useState(classes[0]?.id || '')
  const [subjectId, setSubjectId] = useState(classes[0]?.subjectIds[0] || 'math')
  const [chapter, setChapter] = useState('')
  const [date, setDate] = useState(todayISO())
  const [durationMin, setDurationMin] = useState(35)
  const [sizeMB, setSizeMB] = useState(40)
  const [mediaUrl, setMediaUrl] = useState('')
  const [description, setDescription] = useState('')
  const [language, setLanguage] = useState<Lang>('en')
  const [downloadEnabled, setDownloadEnabled] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = () => {
    if (!currentUser) return
    const next: Record<string, string> = {}
    if (title.trim().length < 3) next.title = t('live.required')
    if (!classId || !chapter.trim()) next.chapter = t('common.required')
    if (mediaUrl && !/^https?:\/\//i.test(mediaUrl)) next.mediaUrl = t('sch.linkInvalid')
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }
    mutate((draft) => {
      draft.recordings.unshift({
        id: uid('rec'),
        classId,
        subjectId,
        title: title.trim(),
        chapter: chapter.trim(),
        teacherId: currentUser.id,
        date,
        durationMin,
        sizeMB,
        mediaUrl: mediaUrl.trim() || undefined,
        downloadEnabled,
        source: mediaUrl.trim() ? 'upload' : 'zoom',
        description: description.trim() || undefined,
        language,
        status: mediaUrl.trim() ? 'ready' : 'processing',
      })
      for (const student of draft.users.filter((u) => u.role === 'student' && draft.enrollments.some((e) => e.classId === classId && e.studentId === u.id && e.status === 'active'))) {
        draft.notifications.unshift({
          id: uid('notif'),
          userId: student.id,
          kind: 'class',
          title: `${t('rec.recent')}: ${title.trim()}`,
          body: `${t('common.class')}: ${db.classes.find((c) => c.id === classId)?.name || ''}`,
          link: '/recordings',
          read: false,
          createdAt: new Date().toISOString(),
        })
      }
    })
    toast('success', t('rec.added'), mediaUrl.trim() ? undefined : t('rec.playUnavailableTitle'))
    setTitle('')
    setChapter('')
    setDescription('')
    setMediaUrl('')
    setErrors({})
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('rec.upload')}
      description={t('rec.mediaNote')}
      footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={submit} icon="upload">{t('common.add')}</Button></>}
    >
      <div className="space-y-3.5">
        <Field label={t('live.name')} htmlFor="rec-title" required error={errors.title}>
          <TextInput id="rec-title" value={title} onChange={(e) => setTitle(e.target.value)} invalid={!!errors.title} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('common.class')} htmlFor="rec-class" required>
            <Select id="rec-class" value={classId} onChange={(e) => { setClassId(e.target.value); setSubjectId(classById(db, e.target.value)?.subjectIds[0] || 'math') }}>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label={t('common.subject')} htmlFor="rec-subject" required>
            <Select id="rec-subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {(classById(db, classId)?.subjectIds || []).map((s) => <option key={s} value={s}>{subjectLabel(s, t)}</option>)}
            </Select>
          </Field>
        </div>
        <Field label={t('common.chapter')} htmlFor="rec-chapter" required error={errors.chapter}>
          <TextInput id="rec-chapter" value={chapter} onChange={(e) => setChapter(e.target.value)} invalid={!!errors.chapter} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t('common.date')} htmlFor="rec-date">
            <TextInput id="rec-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label={t('live.duration')} htmlFor="rec-duration">
            <TextInput id="rec-duration" type="number" min={1} value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} />
          </Field>
          <Field label={t('common.size')} htmlFor="rec-size">
            <TextInput id="rec-size" type="number" min={1} value={sizeMB} onChange={(e) => setSizeMB(Number(e.target.value))} />
          </Field>
        </div>
        <Field label={t('live.recordingLink')} htmlFor="rec-url" hint={t('rec.mediaNote')} error={errors.mediaUrl}>
          <TextInput id="rec-url" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://…" invalid={!!errors.mediaUrl} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('common.language')} htmlFor="rec-lang">
            <Select id="rec-lang" value={language} onChange={(e) => setLanguage(e.target.value as Lang)}>
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </Select>
          </Field>
          <div className="pt-6"><Toggle checked={downloadEnabled} onChange={setDownloadEnabled} label={t('rec.downloadsOn')} description={t('rec.mediaNote')} /></div>
        </div>
        <Field label={t('common.note')} htmlFor="rec-desc">
          <TextArea id="rec-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <p className="text-[10px] leading-relaxed text-ink-400">{t('rec.mediaNote')}</p>
      </div>
    </Modal>
  )
}
