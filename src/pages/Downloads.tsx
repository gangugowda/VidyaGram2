import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../lib/store'
import { useI18n } from '../lib/i18n'
import { downloadsFor, DEMO_STORAGE_LIMIT_KB, storageUsedKB, toCsv, recordingPlayable } from '../lib/offline'
import { formatDateTime, formatSize, uid } from '../lib/utils'
import type { Download, Recording, Resource } from '../lib/types'
import { Icon } from '../components/Icon'
import {
  Badge,
  Button,
  Callout,
  Card,
  EmptyState,
  Modal,
  PageHeader,
  ProgressBar,
  SectionCard,
  Tabs,
  buttonClass,
} from '../components/ui'

export function DownloadsPage() {
  const { db, currentUser, online, pendingSync, mutate, syncOutbox, toast } = useApp()
  const { t, lang } = useI18n()
  const [tab, setTab] = useState<'all' | 'resource' | 'recording'>('all')
  const [reader, setReader] = useState<Download | null>(null)

  if (!currentUser) return null
  const all = downloadsFor(db, currentUser.id)
  const list = all.filter((d) => tab === 'all' || d.kind === tab)
  const used = storageUsedKB(db, currentUser.id)
  const pct = Math.min(100, (used / DEMO_STORAGE_LIMIT_KB) * 100)

  const remove = (download: Download) => {
    if (!window.confirm(t('dl.removeConfirm', { title: download.title }))) return
    mutate((draft) => {
      draft.downloads = draft.downloads.filter((d) => d.id !== download.id)
    })
    toast('success', t('dl.removed'))
  }

  const clearQueue = () => {
    if (!window.confirm('Clear all saved offline changes without syncing? This cannot be undone.')) return
    mutate((draft) => {
      draft.outbox = []
    })
    toast('info', t('dl.removed'))
  }

  const exportList = () => {
    const rows = [
      ['Title', 'Type', 'Size (KB)', 'Offline readable', 'Added'],
      ...all.map((d) => [d.title, d.kind, d.sizeKB, d.offlineReadable ? 'yes' : 'no', d.addedAt]),
    ]
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'vidyagram-downloads.csv'
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 2000)
    toast('success', t('common.export'))
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('dl.title')}
        subtitle={t('dl.sub')}
        icon="download"
        actions={
          <>
            {all.length ? (
              <Button variant="secondary" icon="file" onClick={exportList}>{t('common.export')}</Button>
            ) : null}
            <Link to="/materials" className={buttonClass('primary', 'md')}>{t('nav.materials')} <Icon name="arrowRight" size={16} /></Link>
          </>
        }
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
              <Icon name="database" size={16} className="text-brand-600" />
              {t('dl.totalSize', { size: formatSize(used) })}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-500">{t('dl.storageNote')}</p>
          </div>
          <Badge tone={pct > 85 ? 'clay' : 'brand'}>{formatSize(used)} / {formatSize(DEMO_STORAGE_LIMIT_KB)}</Badge>
        </div>
        <div className="mt-2">
          <ProgressBar value={pct} tone={pct > 85 ? 'clay' : 'brand'} showValue={false} size="md" />
        </div>
        <p className="mt-2 flex items-center gap-1 text-[10px] text-ink-400">
          <Icon name={online ? 'wifi' : 'wifiOff'} size={12} /> {t('dl.requiresOnline')}
        </p>
      </Card>

      {pendingSync > 0 ? (
        <SectionCard
          title={t('dl.queue')}
          subtitle={online ? t('dl.sync') : t('dl.syncOffline')}
          icon="cloud"
          action={
            <div className="flex gap-1.5">
              <Button size="sm" variant="ghost" onClick={clearQueue}>{t('common.remove')}</Button>
              <Button size="sm" icon="refresh" onClick={() => void syncOutbox()}>{t('dl.sync')}</Button>
            </div>
          }
        >
          <ul className="divide-y divide-ink-100">
            {db.outbox.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                <span className="font-medium text-ink-800">{item.kind}</span>
                <span className="text-[10px] text-ink-500">{formatDateTime(item.createdAt, lang)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] text-ink-400">{t('dl.queue')}: {pendingSync}</p>
        </SectionCard>
      ) : null}

      <Tabs
        items={[
          { id: 'all', label: t('common.all'), count: all.length },
          { id: 'resource', label: t('nav.materials'), count: all.filter((d) => d.kind === 'resource').length },
          { id: 'recording', label: t('rec.title'), count: all.filter((d) => d.kind === 'recording').length },
        ]}
        value={tab}
        onChange={(id) => setTab(id as typeof tab)}
      />

      {list.length ? (
        <div className="space-y-2">
          {list.map((d) => (
            <Card key={d.id} className="flex flex-wrap items-center gap-3 p-3.5">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${d.kind === 'recording' ? 'bg-ink-800 text-white' : 'bg-brand-50 text-brand-700'}`}>
                <Icon name={d.kind === 'recording' ? 'play' : 'book'} size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink-900">{d.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink-500">
                  <span>{formatSize(d.sizeKB)}</span>
                  <span>· {formatDateTime(d.addedAt, lang)}</span>
                  {d.offlineReadable ? (
                    <span className="inline-flex items-center gap-1 text-leaf-700"><Icon name="checkCircle" size={12} /> {t('dl.offlineReady')}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-saffron-800"><Icon name="wifi" size={12} /> {t('dl.videoRequires')}</span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="secondary" icon={d.kind === 'recording' ? 'play' : 'book'} onClick={() => setReader(d)}>
                  {d.kind === 'recording' ? t('rec.watch') : t('dl.reader')}
                </Button>
                <Button size="sm" variant="ghost" icon="trash" onClick={() => remove(d)}>{t('dl.remove')}</Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="download"
          title={t('dl.empty')}
          description={t('dl.emptyHint')}
          action={<Link to="/library" className={buttonClass('primary', 'md')}>{t('lib.title')} <Icon name="arrowRight" size={16} /></Link>}
        />
      )}

      <Callout tone="warn" icon="wifiOff" title={t('dl.requiresOnline')}>
        {t('dl.lowDataNote')} {t('state.offlineBody')}
      </Callout>

      <DownloadReader item={reader} onClose={() => setReader(null)} />
    </div>
  )
}

function DownloadReader({ item, onClose }: { item: Download | null; onClose: () => void }) {
  const { db } = useApp()
  const { t } = useI18n()
  if (!item) return null
  const resource = item.kind === 'resource' ? db.resources.find((r) => r.id === item.refId) : undefined
  const recording = item.kind === 'recording' ? db.recordings.find((r) => r.id === item.refId) : undefined
  return (
    <Modal
      open
      onClose={onClose}
      title={item.title}
      description={item.offlineReadable ? t('dl.offlineReady') : t('dl.opensOnline')}
      size="lg"
      footer={<Button onClick={onClose}>{t('common.close')}</Button>}
    >
      {resource ? (
        resource.content ? (
          <article className="notes-body">{resource.content}</article>
        ) : (
          <div className="rounded-xl border border-ink-200 bg-ink-50 p-6 text-center">
            <Icon name="file" size={28} className="mx-auto text-ink-400" />
            <p className="mt-2 text-sm font-semibold text-ink-800">{t('mat.noContent')}</p>
            {resource.fileUrl ? (
              <a href={resource.fileUrl} target="_blank" rel="noreferrer" className={buttonClass('secondary', 'sm', 'mt-3')}>
                {t('common.open')} <Icon name="external" size={14} />
              </a>
            ) : null}
          </div>
        )
      ) : recording ? (
        <RecordingOffline recording={recording} />
      ) : (
        <EmptyState icon="info" title={t('common.noData')} />
      )}
    </Modal>
  )
}

function RecordingOffline({ recording }: { recording: Recording }) {
  const { t } = useI18n()
  if (recordingPlayable(recording) && recording.mediaUrl) {
    return (
      <div>
        <video controls preload="metadata" className="aspect-video w-full rounded-xl bg-black" src={recording.mediaUrl}>
          {t('rec.playUnavailable')}
        </video>
        <p className="mt-2 text-[11px] text-ink-500">{t('dl.opensOnline')}</p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-ink-200 bg-ink-50 p-6 text-center">
      <Icon name="video" size={30} className="mx-auto text-ink-400" />
      <p className="mt-2 text-sm font-semibold text-ink-800">{t('rec.playUnavailableTitle')}</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-ink-500">{t('rec.playUnavailableBody')}</p>
    </div>
  )
}
