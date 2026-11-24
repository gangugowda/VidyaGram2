import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../lib/store'
import { useI18n, LANG_OPTIONS, CONTENT_LANG_LABEL } from '../lib/i18n'
import { classById, visibleClasses } from '../lib/access'
import { RESOURCE_TYPE_LABEL } from '../lib/subjects'
import { formatDate, formatSize, subjectLabel, uid } from '../lib/utils'
import { buildResourceDownload, DEMO_STORAGE_LIMIT_KB, storageUsedKB } from '../lib/offline'
import type { Lang, Resource, ResourceType } from '../lib/types'
import { Icon } from '../components/Icon'
import { LanguageTags, ResourceTypeBadge, SubjectChip } from '../components/shared'
import {
  Badge,
  Button,
  Callout,
  Card,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  ProgressBar,
  SectionCard,
  Select,
  TextArea,
  TextInput,
  Toggle,
  buttonClass,
} from '../components/ui'

const TYPES: ResourceType[] = ['note', 'textbook', 'question-paper', 'mcq-set', 'fill-blanks', 'revision', 'storybook', 'supplementary']

export function MaterialsPage() {
  const { db, currentUser, mutate, toast } = useApp()
  const { t, lang } = useI18n()
  const [params] = useSearchParams()
  const [query, setQuery] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [langFilter, setLangFilter] = useState('all')
  const [reading, setReading] = useState<Resource | null>(null)
  const [editing, setEditing] = useState<Resource | null>(null)
  const [uploadOpen, setUploadOpen] = useState(params.get('upload') === '1')

  if (!currentUser) return null
  const classes = visibleClasses(db, currentUser)
  const classIds = new Set(classes.map((c) => c.id))
  const canManage = currentUser.role === 'teacher' || currentUser.role === 'admin'
  const isStudent = currentUser.role === 'student'

  const base = db.resources.filter((r) => classIds.has(r.classId) && (canManage || r.published))
  const chapters = Array.from(new Set(base.map((r) => r.chapter))).sort()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return base
      .filter((r) => classFilter === 'all' || r.classId === classFilter)
      .filter((r) => subjectFilter === 'all' || r.subjectId === subjectFilter)
      .filter((r) => typeFilter === 'all' || r.type === typeFilter)
      .filter((r) => langFilter === 'all' || r.languages.includes(langFilter as Lang))
      .filter((r) => !q || `${r.title} ${r.chapter} ${r.topics.join(' ')} ${r.description}`.toLowerCase().includes(q))
      .sort((a, b) => Number(b.published) - Number(a.published) || b.uploadedAt.localeCompare(a.uploadedAt))
  }, [base, classFilter, subjectFilter, typeFilter, langFilter, query])

  const download = (resource: Resource) => {
    if (!currentUser) return
    const result = buildResourceDownload(db, currentUser.id, resource)
    if (!result.ok) {
      if (result.error === 'exists') toast('info', t('common.downloaded'), resource.title)
      else if (result.error === 'no-space') toast('error', t('dl.noSpace'), t('dl.storageNote'))
      else toast('error', t('mat.previewOnly'))
      return
    }
    mutate((draft) => {
      draft.downloads.push(result.download)
      draft.activity.push({ id: uid('act'), studentId: currentUser.id, classId: resource.classId, points: 2, reason: 'download-resource', at: new Date().toISOString() })
      if (draft.downloads.filter((d) => d.userId === currentUser.id).length >= 2 && !draft.userBadges.some((b) => b.userId === currentUser.id && b.badgeKey === 'offlineLearner')) {
        draft.userBadges.push({ id: uid('ub'), userId: currentUser.id, badgeKey: 'offlineLearner', awardedAt: new Date().toISOString() })
      }
    })
    toast('success', t('mat.downloadStarted'), `${resource.title} · ${formatSize(resource.sizeKB)}`)
  }

  const bookmark = (resource: Resource) => {
    if (!currentUser || !isStudent) return
    const existing = db.bookmarks.find((b) => b.userId === currentUser.id && b.resourceId === resource.id)
    mutate((draft) => {
      if (existing) draft.bookmarks = draft.bookmarks.filter((b) => b.id !== existing.id)
      else draft.bookmarks.push({ id: uid('bm'), userId: currentUser.id, resourceId: resource.id, addedAt: new Date().toISOString() })
      if (draft.bookmarks.filter((b) => b.userId === currentUser.id).length >= 3 && !draft.userBadges.some((b) => b.userId === currentUser.id && b.badgeKey === 'bookworm')) {
        draft.userBadges.push({ id: uid('ub'), userId: currentUser.id, badgeKey: 'bookworm', awardedAt: new Date().toISOString() })
      }
    })
    toast('success', existing ? t('lib.removedFromLibrary') : t('mat.bookmarked'))
  }

  const togglePublish = (resource: Resource) => {
    mutate((draft) => {
      const r = draft.resources.find((x) => x.id === resource.id)
      if (r) r.published = !r.published
    })
    toast('success', resource.published ? t('mat.unpublished') : t('mat.publishedToast'))
  }

  const remove = (resource: Resource) => {
    if (!window.confirm(t('mat.removeConfirm'))) return
    mutate((draft) => {
      draft.resources = draft.resources.filter((r) => r.id !== resource.id)
      draft.bookmarks = draft.bookmarks.filter((b) => b.resourceId !== resource.id)
      draft.downloads = draft.downloads.filter((d) => !(d.kind === 'resource' && d.refId === resource.id))
    })
    toast('success', t('mat.deleted'))
  }

  const used = currentUser ? storageUsedKB(db, currentUser.id) : 0

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('mat.title')}
        subtitle={canManage ? t('mat.teacherSub') : t('mat.sub')}
        icon="book"
        actions={canManage ? <Button icon="upload" onClick={() => setUploadOpen(true)}>{t('mat.upload')}</Button> : <a href="#downloads" className={buttonClass('secondary', 'md')}><Icon name="download" size={17} /> {t('nav.downloads')}</a>}
      />

      {canManage ? <Callout tone="info" title={t('mat.studentsSee')}>{t('mat.teacherNote')}</Callout> : null}

      <SectionCard icon="filter" bodyClassName="space-y-3">
        <div className="relative">
          <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-3 text-ink-400" />
          <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('mat.search')} className="pl-9" aria-label={t('mat.search')} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} aria-label={t('mat.classFilter')}>
            <option value="all">{t('common.all')} {t('common.class').toLowerCase()}es</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} aria-label={t('mat.subjectFilter')}>
            <option value="all">{t('common.all')} {t('common.subject').toLowerCase()}s</option>
            {Array.from(new Set(base.map((r) => r.subjectId))).map((s) => <option key={s} value={s}>{subjectLabel(s, t)}</option>)}
          </Select>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label={t('mat.type')}>
            <option value="all">{t('common.all')} {t('common.type').toLowerCase()}s</option>
            {TYPES.map((ty) => <option key={ty} value={ty}>{t(RESOURCE_TYPE_LABEL[ty])}</option>)}
          </Select>
          <Select value={langFilter} onChange={(e) => setLangFilter(e.target.value)} aria-label={t('mat.languageFilter')}>
            <option value="all">{t('common.all')} {t('common.language').toLowerCase()}s</option>
            {LANG_OPTIONS.map((code) => <option key={code} value={code}>{CONTENT_LANG_LABEL[code]}</option>)}
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-ink-400">
          <span>{filtered.length} {t('common.results').toLowerCase()}</span>
          <span>·</span>
          <span>{chapters.length} {t('common.chapter').toLowerCase()}s</span>
          {langFilter !== 'all' ? <Badge tone="brand">{CONTENT_LANG_LABEL[langFilter as Lang]}</Badge> : null}
        </div>
      </SectionCard>

      {filtered.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => {
            const cls = classById(db, r.classId)
            const bookmarked = db.bookmarks.some((b) => b.userId === currentUser.id && b.resourceId === r.id)
            const downloaded = db.downloads.some((d) => d.userId === currentUser.id && d.kind === 'resource' && d.refId === r.id)
            return (
              <Card key={r.id} className="flex flex-col p-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <ResourceTypeBadge type={r.type} />
                  <SubjectChip subjectId={r.subjectId} />
                  {!r.published ? <Badge tone="neutral" icon="edit">{t('common.draft')}</Badge> : null}
                </div>
                <h3 className="mt-2 text-sm font-bold leading-snug text-ink-900">{r.title}</h3>
                <p className="mt-0.5 text-[11px] text-ink-500">{cls?.name} · {r.chapter}</p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ink-600">{r.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <LanguageTags languages={r.languages} />
                  {r.downloadable ? <Badge tone="leaf" icon="download">{formatSize(r.sizeKB)}</Badge> : <Badge tone="neutral" icon="lock">{t('mat.previewOnly')}</Badge>}
                  {r.pages ? <span className="text-[10px] text-ink-400">{t('mat.pages', { count: r.pages })}</span> : null}
                </div>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                  <Button size="sm" icon="book" onClick={() => setReading(r)}>{r.content ? t('mat.reader') : t('common.open')}</Button>
                  {!canManage && r.downloadable ? (
                    <Button size="sm" variant={downloaded ? 'quiet' : 'secondary'} icon="download" onClick={() => download(r)} disabled={downloaded}>
                      {downloaded ? t('common.downloaded') : t('common.download')}
                    </Button>
                  ) : null}
                  {isStudent ? (
                    <Button size="sm" variant="ghost" icon="bookmark" onClick={() => bookmark(r)} aria-pressed={bookmarked} className={bookmarked ? 'text-brand-700' : ''}>
                      {bookmarked ? t('lib.bookmarked') : t('lib.bookmark')}
                    </Button>
                  ) : null}
                  {canManage ? (
                    <>
                      <Button size="sm" variant="ghost" icon="edit" onClick={() => setEditing(r)}>{t('common.edit')}</Button>
                      <Button size="sm" variant="ghost" onClick={() => togglePublish(r)}>{r.published ? t('common.unpublish') : t('common.publish')}</Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(r)} aria-label={t('common.delete')}><Icon name="trash" size={14} /></Button>
                    </>
                  ) : null}
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState icon="book" title={t('mat.noResults')} description={t('mat.filterHint')} />
      )}

      <section id="downloads" className="scroll-mt-24 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-bold text-ink-900"><Icon name="download" size={16} className="text-brand-600" /> {t('dl.title')}</p>
              <p className="mt-0.5 text-[11px] text-ink-500">{t('dl.storageNote')}</p>
            </div>
            <Badge tone="brand">{formatSize(used)} / {formatSize(DEMO_STORAGE_LIMIT_KB)}</Badge>
          </div>
          <div className="mt-2"><ProgressBar value={(used / DEMO_STORAGE_LIMIT_KB) * 100} tone={used / DEMO_STORAGE_LIMIT_KB > 0.8 ? 'clay' : 'brand'} showValue={false} size="sm" /></div>
          <p className="mt-2 text-[10px] text-ink-400">{t('dl.requiresOnline')}</p>
        </Card>
        <a href="/downloads" className={buttonClass('secondary', 'md')}>{t('dl.title')} <Icon name="chevronRight" size={16} /></a>
      </section>

      <ReaderModal resource={reading} onClose={() => setReading(null)} onDownload={download} onBookmark={bookmark} isStudent={isStudent} />
      {canManage ? <ResourceFormModal open={uploadOpen} onClose={() => setUploadOpen(false)} classes={classes} /> : null}
      {canManage ? <ResourceFormModal open={!!editing} onClose={() => setEditing(null)} classes={classes} resource={editing} /> : null}
    </div>
  )
}

function ReaderModal({
  resource,
  onClose,
  onDownload,
  onBookmark,
  isStudent,
}: {
  resource: Resource | null
  onClose: () => void
  onDownload: (r: Resource) => void
  onBookmark: (r: Resource) => void
  isStudent: boolean
}) {
  const { db, currentUser } = useApp()
  const { t, lang } = useI18n()
  if (!resource) return null
  const downloaded = !!currentUser && db.downloads.some((d) => d.userId === currentUser.id && d.kind === 'resource' && d.refId === resource.id)
  const bookmarked = !!currentUser && db.bookmarks.some((b) => b.userId === currentUser.id && b.resourceId === resource.id)
  return (
    <Modal
      open
      onClose={onClose}
      title={resource.title}
      description={`${resource.chapter} · ${resource.languages.map((l) => CONTENT_LANG_LABEL[l]).join(', ')}`}
      size="lg"
      footer={
        <>
          {isStudent ? (
            <Button variant="ghost" icon="bookmark" onClick={() => onBookmark(resource)} className="mr-auto">
              {bookmarked ? t('lib.removeBookmark') : t('mat.bookmark')}
            </Button>
          ) : null}
          {resource.downloadable ? (
            <Button variant="secondary" icon="download" onClick={() => onDownload(resource)} disabled={downloaded}>
              {downloaded ? t('common.downloaded') : t('common.download')}
            </Button>
          ) : null}
          <Button onClick={onClose}>{t('common.close')}</Button>
        </>
      }
    >
      {resource.content ? (
        <article className="notes-body">{resource.content}</article>
      ) : (
        <div className="rounded-xl border border-ink-200 bg-ink-50 p-5 text-center">
          <Icon name="file" size={30} className="mx-auto text-ink-400" />
          <p className="mt-2 text-sm font-semibold text-ink-800">{t('mat.noContent')}</p>
          {resource.fileUrl ? (
            <a href={resource.fileUrl} target="_blank" rel="noreferrer" className={buttonClass('secondary', 'sm', 'mt-3')}>
              {t('common.open')} <Icon name="external" size={14} />
            </a>
          ) : null}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
        <Badge tone="brand" icon="file">{t(RESOURCE_TYPE_LABEL[resource.type])}</Badge>
        <span className="text-[10px] text-ink-400">{formatSize(resource.sizeKB)} · {formatDate(resource.uploadedAt.slice(0, 10), lang)}</span>
        {resource.content ? <Badge tone="leaf" icon="checkCircle">{t('common.availableOffline')}</Badge> : <Badge tone="neutral" icon="cloud">{t('common.requiresInternet')}</Badge>}
      </div>
    </Modal>
  )
}

function ResourceFormModal({
  open,
  onClose,
  classes,
  resource,
}: {
  open: boolean
  onClose: () => void
  classes: ReturnType<typeof visibleClasses>
  resource?: Resource | null
}) {
  const { db, currentUser, mutate, toast } = useApp()
  const { t } = useI18n()
  const [title, setTitle] = useState(resource?.title || '')
  const [classId, setClassId] = useState(resource?.classId || classes[0]?.id || '')
  const [subjectId, setSubjectId] = useState(resource?.subjectId || classes[0]?.subjectIds[0] || 'math')
  const [type, setType] = useState<ResourceType>(resource?.type || 'note')
  const [chapter, setChapter] = useState(resource?.chapter || '')
  const [description, setDescription] = useState(resource?.description || '')
  const [content, setContent] = useState(resource?.content || '')
  const [sizeKB, setSizeKB] = useState(resource?.sizeKB || 300)
  const [pages, setPages] = useState(resource?.pages || 4)
  const [languages, setLanguages] = useState<Lang[]>(resource?.languages || ['en'])
  const [downloadable, setDownloadable] = useState(resource?.downloadable ?? true)
  const [published, setPublished] = useState(resource?.published ?? true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = () => {
    if (!currentUser) return
    const next: Record<string, string> = {}
    if (title.trim().length < 3 || !classId || !subjectId) next.required = t('mat.required')
    if (languages.length === 0) next.languages = t('common.required')
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }
    const payload: Resource = {
      id: resource?.id || uid('res'),
      title: title.trim(),
      description: description.trim(),
      type,
      classId,
      subjectId,
      chapter: chapter.trim() || t('common.chapter'),
      topics: resource?.topics || [chapter.trim() || 'general'],
      languages,
      sizeKB,
      downloadable,
      published,
      uploadedBy: resource?.uploadedBy || currentUser.id,
      uploadedAt: resource?.uploadedAt || new Date().toISOString(),
      content: content.trim() || undefined,
      pages,
      gradeLevels: resource?.gradeLevels || [classById(db, classId)?.gradeLevel || 8],
    }
    mutate((draft) => {
      if (resource) {
        const idx = draft.resources.findIndex((r) => r.id === resource.id)
        if (idx >= 0) draft.resources[idx] = payload
      } else {
        draft.resources.unshift(payload)
      }
      draft.audit.unshift({
        id: uid('aud'),
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: resource ? 'Updated resource' : 'Added resource',
        detail: payload.title,
        at: new Date().toISOString(),
      })
    })
    toast('success', resource ? t('mat.saved') : t('mat.publishedToast'), payload.title)
    setErrors({})
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={resource ? t('mat.editTitle') : t('mat.uploadTitle')}
      description={t('mat.contentHint')}
      size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={submit} icon="check">{resource ? t('common.saveChanges') : t('common.create')}</Button></>}
    >
      <div className="space-y-3.5">
        {errors.required ? <Callout tone="danger" title={errors.required} /> : null}
        <Field label={t('mat.name')} htmlFor="res-title" required>
          <TextInput id="res-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t('common.class')} htmlFor="res-class" required>
            <Select id="res-class" value={classId} onChange={(e) => { setClassId(e.target.value); setSubjectId(classById(db, e.target.value)?.subjectIds[0] || 'math') }}>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label={t('common.subject')} htmlFor="res-subject" required>
            <Select id="res-subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {(classById(db, classId)?.subjectIds || []).map((s) => <option key={s} value={s}>{subjectLabel(s, t)}</option>)}
            </Select>
          </Field>
          <Field label={t('mat.type')} htmlFor="res-type">
            <Select id="res-type" value={type} onChange={(e) => setType(e.target.value as ResourceType)}>
              {TYPES.map((ty) => <option key={ty} value={ty}>{t(RESOURCE_TYPE_LABEL[ty])}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('mat.chapterName')} htmlFor="res-chapter">
            <TextInput id="res-chapter" value={chapter} onChange={(e) => setChapter(e.target.value)} />
          </Field>
          <Field label={t('mat.size')} htmlFor="res-size">
            <TextInput id="res-size" type="number" min={1} value={sizeKB} onChange={(e) => setSizeKB(Number(e.target.value))} />
          </Field>
        </div>
        <Field label={t('mat.description')} htmlFor="res-desc">
          <TextInput id="res-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label={t('mat.content')} htmlFor="res-content" hint={t('mat.contentHint')}>
          <TextArea id="res-content" value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[160px] font-mono text-xs" />
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-semibold text-ink-800">{t('mat.languages')}</legend>
          <div className="flex flex-wrap gap-2">
            {LANG_OPTIONS.map((code) => {
              const active = languages.includes(code)
              return (
                <button
                  key={code}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setLanguages((prev) => (active ? prev.filter((x) => x !== code) : [...prev, code]))}
                  className={`min-h-9 rounded-full border px-3 text-xs font-medium ${active ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 text-ink-700 hover:bg-ink-50'}`}
                >
                  {CONTENT_LANG_LABEL[code]}
                </button>
              )
            })}
          </div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle checked={downloadable} onChange={setDownloadable} label={t('mat.downloadable')} description={t('mat.teacherNote')} />
          <Toggle checked={published} onChange={setPublished} label={t('mat.publishNow')} description={t('mat.studentsSee')} />
        </div>
        <p className="text-[10px] text-ink-400">{t('mat.teacherNote')}</p>
      </div>
    </Modal>
  )
}
