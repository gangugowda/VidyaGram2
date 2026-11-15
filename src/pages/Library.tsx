import { useMemo, useState } from 'react'
import { useApp } from '../lib/store'
import { useI18n, CONTENT_LANG_LABEL, LANG_OPTIONS } from '../lib/i18n'
import { classById, visibleClasses } from '../lib/access'
import { RESOURCE_TYPE_LABEL } from '../lib/subjects'
import { formatDate, formatSize, subjectLabel, uid } from '../lib/utils'
import { buildResourceDownload, storageLeftKB } from '../lib/offline'
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
  SectionCard,
  Select,
  Tabs,
  TextInput,
  buttonClass,
} from '../components/ui'

const LIBRARY_TYPES: ResourceType[] = ['storybook', 'revision', 'supplementary', 'note', 'textbook', 'question-paper']

export function LibraryPage() {
  const { db, currentUser, mutate, toast } = useApp()
  const { t, lang } = useI18n()
  const [tab, setTab] = useState<'all' | 'bookmarks'>('all')
  const [query, setQuery] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [langFilter, setLangFilter] = useState('all')
  const [reading, setReading] = useState<Resource | null>(null)

  if (!currentUser) return null
  const classes = visibleClasses(db, currentUser)
  const classIds = new Set(classes.map((c) => c.id))
  const canManage = currentUser.role === 'teacher' || currentUser.role === 'admin'

  const base = db.resources.filter((r) => classIds.has(r.classId) && (canManage || r.published))
  const bookmarks = db.bookmarks.filter((b) => b.userId === currentUser.id)
  const bookmarkedIds = new Set(bookmarks.map((b) => b.resourceId))
  const bookmarked = base.filter((r) => bookmarkedIds.has(r.id))

  const list = useMemo(() => {
    const source = tab === 'bookmarks' ? bookmarked : base
    const q = query.trim().toLowerCase()
    return source
      .filter((r) => classFilter === 'all' || r.classId === classFilter)
      .filter((r) => typeFilter === 'all' || r.type === typeFilter)
      .filter((r) => langFilter === 'all' || r.languages.includes(langFilter as Lang))
      .filter((r) => !q || `${r.title} ${r.chapter} ${r.description} ${r.topics.join(' ')}`.toLowerCase().includes(q))
      .sort((a, b) => Number(b.type === 'storybook') - Number(a.type === 'storybook') || b.uploadedAt.localeCompare(a.uploadedAt))
  }, [base, bookmarked, tab, query, classFilter, typeFilter, langFilter])

  const toggleBookmark = (resource: Resource) => {
    const existing = db.bookmarks.find((b) => b.userId === currentUser.id && b.resourceId === resource.id)
    mutate((draft) => {
      if (existing) {
        draft.bookmarks = draft.bookmarks.filter((b) => b.id !== existing.id)
      } else {
        draft.bookmarks.push({ id: uid('bm'), userId: currentUser.id, resourceId: resource.id, addedAt: new Date().toISOString() })
        if (draft.users.find((u) => u.id === currentUser.id)?.role === 'student') {
          draft.activity.push({
            id: uid('act'),
            studentId: currentUser.id,
            classId: resource.classId,
            points: 2,
            reason: 'library-bookmark',
            at: new Date().toISOString(),
          })
        }
      }
      if (
        draft.bookmarks.filter((b) => b.userId === currentUser.id).length >= 3 &&
        !draft.userBadges.some((b) => b.userId === currentUser.id && b.badgeKey === 'bookworm')
      ) {
        draft.userBadges.push({ id: uid('ub'), userId: currentUser.id, badgeKey: 'bookworm', awardedAt: new Date().toISOString() })
      }
    })
    toast('success', existing ? t('lib.removedFromLibrary') : t('lib.addedToLibrary'))
  }

  const download = (resource: Resource) => {
    const result = buildResourceDownload(db, currentUser.id, resource)
    if (!result.ok) {
      if (result.error === 'exists') toast('info', t('common.downloaded'), resource.title)
      else if (result.error === 'no-space') toast('error', t('dl.noSpace'), t('dl.storageNote'))
      else toast('error', t('mat.previewOnly'))
      return
    }
    mutate((draft) => {
      draft.downloads.push(result.download)
      if (
        draft.downloads.filter((d) => d.userId === currentUser.id).length >= 2 &&
        !draft.userBadges.some((b) => b.userId === currentUser.id && b.badgeKey === 'offlineLearner')
      ) {
        draft.userBadges.push({ id: uid('ub'), userId: currentUser.id, badgeKey: 'offlineLearner', awardedAt: new Date().toISOString() })
      }
    })
    toast('success', t('mat.downloadStarted'), `${resource.title} · ${formatSize(resource.sizeKB)}`)
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('lib.title')}
        subtitle={t('lib.sub')}
        icon="library"
        actions={
          <Badge tone="brand" icon="bookmark">
            {bookmarked.length} {t('lib.bookmarks').toLowerCase()}
          </Badge>
        }
      />

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <SectionCard icon="filter" bodyClassName="space-y-3">
          <div className="relative">
            <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-3 text-ink-400" />
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('lib.search')}
              aria-label={t('lib.search')}
              className="pl-9"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} aria-label={t('lib.ageGroup')}>
              <option value="all">{t('lib.ageGroup')}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label={t('lib.contentType')}>
              <option value="all">{t('lib.contentType')}</option>
              {LIBRARY_TYPES.map((ty) => (
                <option key={ty} value={ty}>{t(RESOURCE_TYPE_LABEL[ty])}</option>
              ))}
            </Select>
            <Select value={langFilter} onChange={(e) => setLangFilter(e.target.value)} aria-label={t('common.language')}>
              <option value="all">{t('common.all')} {t('common.language').toLowerCase()}s</option>
              {LANG_OPTIONS.map((code) => (
                <option key={code} value={code}>{CONTENT_LANG_LABEL[code]}</option>
              ))}
            </Select>
          </div>
        </SectionCard>
        <Card className="flex flex-col justify-center gap-1 p-4 sm:w-56">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{t('lib.bookmarkHint')}</p>
          <p className="text-xs text-ink-600">
            {storageLeftKB(db, currentUser.id) > 0
              ? formatSize(storageLeftKB(db, currentUser.id)) + ' ' + t('common.availableOffline').toLowerCase()
              : t('dl.noSpace')}
          </p>
          <p className="text-[10px] leading-relaxed text-ink-400">{t('lib.downloadNote')}</p>
        </Card>
      </div>

      <Tabs
        items={[
          { id: 'all', label: t('lib.title'), count: base.length },
          { id: 'bookmarks', label: t('lib.bookmarks'), count: bookmarked.length },
        ]}
        value={tab}
        onChange={(id) => setTab(id as typeof tab)}
      />

      {list.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((r) => {
            const cls = classById(db, r.classId)
            const isBookmarked = bookmarkedIds.has(r.id)
            const downloaded = db.downloads.some((d) => d.userId === currentUser.id && d.kind === 'resource' && d.refId === r.id)
            const minutes = r.content ? Math.max(1, Math.ceil(r.content.length / 900)) : 0
            return (
              <Card key={r.id} className="flex flex-col p-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <ResourceTypeBadge type={r.type} />
                  <SubjectChip subjectId={r.subjectId} />
                  {!r.published ? <Badge tone="neutral" icon="edit">{t('common.draft')}</Badge> : null}
                </div>
                <h2 className="mt-2 text-sm font-bold leading-snug text-ink-900">{r.title}</h2>
                <p className="mt-0.5 text-[11px] text-ink-500">{cls?.name} · {r.chapter}</p>
                <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-ink-600">{r.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <LanguageTags languages={r.languages} />
                  {minutes ? <span className="text-[10px] text-ink-400">{t('lib.minutesRead', { min: minutes })}</span> : null}
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
                  <Button size="sm" icon="book" onClick={() => setReading(r)}>
                    {r.content ? t('lib.readNow') : t('common.open')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="bookmark"
                    className={isBookmarked ? 'text-brand-700' : ''}
                    aria-pressed={isBookmarked}
                    onClick={() => toggleBookmark(r)}
                  >
                    {isBookmarked ? t('lib.bookmarked') : t('lib.bookmark')}
                  </Button>
                  {r.downloadable ? (
                    <Button size="sm" variant="ghost" icon="download" onClick={() => download(r)} disabled={downloaded}>
                      {downloaded ? t('common.downloaded') : t('common.download')}
                    </Button>
                  ) : null}
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon="library"
          title={tab === 'bookmarks' ? t('lib.bookmarks') : t('lib.noResults')}
          description={tab === 'bookmarks' ? t('lib.bookmarkHint') : t('lib.teacherNote')}
          action={tab === 'bookmarks' ? <Button variant="secondary" onClick={() => setTab('all')}>{t('lib.title')}</Button> : null}
        />
      )}

      <Callout tone="info" title={t('lib.teacherNote')}>
        {t('lib.downloadNote')} {t('lib.bookmarkHint')}
      </Callout>

      <LibraryReader
        resource={reading}
        onClose={() => setReading(null)}
        onBookmark={toggleBookmark}
        onDownload={download}
        bookmarked={!!reading && bookmarkedIds.has(reading.id)}
        downloaded={!!reading && db.downloads.some((d) => d.userId === currentUser.id && d.kind === 'resource' && d.refId === reading.id)}
      />
    </div>
  )
}

function LibraryReader({
  resource,
  onClose,
  onBookmark,
  onDownload,
  bookmarked,
  downloaded,
}: {
  resource: Resource | null
  onClose: () => void
  onBookmark: (resource: Resource) => void
  onDownload: (resource: Resource) => void
  bookmarked: boolean
  downloaded: boolean
}) {
  const { db } = useApp()
  const { t, lang } = useI18n()
  if (!resource) return null
  const author = db.users.find((u) => u.id === resource.uploadedBy)
  return (
    <Modal
      open
      onClose={onClose}
      title={resource.title}
      description={`${resource.chapter} · ${resource.languages.map((l) => CONTENT_LANG_LABEL[l]).join(', ')}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" icon="bookmark" onClick={() => onBookmark(resource)} className="mr-auto">
            {bookmarked ? t('lib.removeBookmark') : t('lib.bookmark')}
          </Button>
          {resource.downloadable ? (
            <Button variant="secondary" icon="download" onClick={() => onDownload(resource)} disabled={downloaded}>
              {downloaded ? t('common.downloaded') : t('common.download')}
            </Button>
          ) : null}
          <Button onClick={onClose}>{t('common.close')}</Button>
        </>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <ResourceTypeBadge type={resource.type} />
        <SubjectChip subjectId={resource.subjectId} />
        {author ? <span className="text-[11px] text-ink-500">{t('lib.by', { author: author.name })}</span> : null}
      </div>
      {resource.content ? (
        <article className="notes-body">{resource.content}</article>
      ) : (
        <div className="rounded-xl border border-ink-200 bg-ink-50 p-6 text-center">
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
        <span className="text-[10px] text-ink-400">
          {formatSize(resource.sizeKB)} · {formatDate(resource.uploadedAt.slice(0, 10), lang)}
        </span>
        {resource.content ? (
          <Badge tone="leaf" icon="checkCircle">{t('dl.offlineReady')}</Badge>
        ) : (
          <Badge tone="neutral" icon="cloud">{t('common.requiresInternet')}</Badge>
        )}
        {resource.languages.map((l) => (
          <Badge key={l} tone="neutral">{CONTENT_LANG_LABEL[l]}</Badge>
        ))}
      </div>
    </Modal>
  )
}
