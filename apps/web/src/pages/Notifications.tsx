import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../lib/store'
import { useI18n } from '../lib/i18n'
import { readConfig, formatDateTime, relativeTime } from '../lib/utils'
import type { AppNotification, NotificationKind } from '../lib/types'
import { Icon, type IconName } from '../components/Icon'
import {
  Badge,
  Button,
  Callout,
  Card,
  Checkbox,
  EmptyState,
  PageHeader,
  SectionCard,
  Tabs,
  Toggle,
} from '../components/ui'

const KIND_ICON: Record<NotificationKind, IconName> = {
  class: 'video',
  quiz: 'clipboard',
  attendance: 'calendar',
  marks: 'chart',
  doubt: 'message',
  announcement: 'bell',
  link: 'link',
  system: 'info',
}

const KIND_TONE: Record<NotificationKind, 'brand' | 'leaf' | 'saffron' | 'clay' | 'ink' | 'neutral'> = {
  class: 'brand',
  quiz: 'saffron',
  attendance: 'clay',
  marks: 'leaf',
  doubt: 'brand',
  announcement: 'saffron',
  link: 'clay',
  system: 'neutral',
}

export function NotificationsPage() {
  const { db, currentUser, mutate, toast } = useApp()
  const { t, lang } = useI18n()
  const [tab, setTab] = useState<'all' | 'unread'>('all')
  const [prefsOpen, setPrefsOpen] = useState(false)
  const config = readConfig()

  if (!currentUser) return null
  const mine = db.notifications
    .filter((n) => n.userId === currentUser.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const unread = mine.filter((n) => !n.read)
  const list = tab === 'unread' ? unread : mine

  const markAll = () => {
    mutate((draft) => {
      for (const n of draft.notifications) if (n.userId === currentUser.id) n.read = true
    })
    toast('success', t('notif.allRead'))
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('notif.title')}
        subtitle={t('notif.sub')}
        icon="bell"
        actions={
          <>
            <Button variant="ghost" icon="settings" onClick={() => setPrefsOpen((v) => !v)}>{t('notif.settings')}</Button>
            <Button variant="secondary" icon="check" onClick={markAll} disabled={!unread.length}>{t('common.markAllRead')}</Button>
          </>
        }
      />

      {!unread.length ? (
        <Callout tone="success" icon="checkCircle" title={t('notif.noneUnread')}>{t('dash.allCaughtUp')}</Callout>
      ) : null}

      {prefsOpen ? <NotificationPrefs config={config} /> : null}

      <Tabs
        items={[
          { id: 'all', label: t('notif.filterAll'), count: mine.length },
          { id: 'unread', label: t('notif.filterUnread'), count: unread.length },
        ]}
        value={tab}
        onChange={(id) => setTab(id as typeof tab)}
      />

      {list.length ? (
        <div className="space-y-2">
          {list.map((n) => (
            <NotificationRow key={n.id} notification={n} />
          ))}
        </div>
      ) : (
        <EmptyState icon="bell" title={t('notif.empty')} description={t('notif.sub')} />
      )}

      <Callout tone="info" icon="mail" title={t('notif.emailOff')}>
        {config.email.configured ? t('admin.configured') : t('notif.emailOff')} · {config.sms.configured ? t('admin.configured') : t('notif.smsOff')}
        {' '}{t('notif.quietHint')}
      </Callout>
    </div>
  )
}

function NotificationRow({ notification }: { notification: AppNotification }) {
  const { mutate } = useApp()
  const { t, lang } = useI18n()
  const markRead = () => {
    mutate((draft) => {
      const n = draft.notifications.find((x) => x.id === notification.id)
      if (n) n.read = true
    })
  }
  const kindLabel = t(`notif.${notification.kind}`)
  return (
    <Card className={`flex items-start gap-3 p-3.5 ${notification.read ? '' : 'border-brand-200 bg-brand-50/30'}`}>
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-ink-700 shadow-sm">
        <Icon name={KIND_ICON[notification.kind]} size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={KIND_TONE[notification.kind]}>{kindLabel}</Badge>
          {!notification.read ? <Badge tone="clay" icon="info">{t('notif.unread')}</Badge> : null}
          <span className="text-[10px] text-ink-400">{relativeTime(notification.createdAt, lang)} · {formatDateTime(notification.createdAt, lang)}</span>
        </div>
        <p className="mt-1 text-sm font-bold text-ink-900">{notification.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-600">{notification.body}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {notification.link ? (
            <Link to={notification.link} onClick={markRead} className="inline-flex items-center gap-1 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink-700 hover:bg-ink-50">
              {t('notif.viewItem')} <Icon name="arrowRight" size={13} />
            </Link>
          ) : null}
          {!notification.read ? (
            <button type="button" onClick={markRead} className="text-[11px] font-semibold text-brand-700 hover:underline">
              {t('notif.markRead')}
            </button>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

function NotificationPrefs({ config }: { config: ReturnType<typeof readConfig> }) {
  const { currentUser } = useApp()
  const { t } = useI18n()
  const [quiet, setQuiet] = useState(() => {
    try {
      return localStorage.getItem('vidyagram.quiet') === '1'
    } catch {
      return false
    }
  })
  const [email, setEmail] = useState(false)
  const [sms, setSms] = useState(false)

  return (
    <SectionCard title={t('notif.settings')} subtitle={t('notif.quietHint')} icon="settings">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-ink-200 bg-ink-50/60 p-2.5">
          <span className="text-sm font-medium text-ink-800">{t('notif.inApp')}</span>
          <Badge tone="leaf" icon="checkCircle">{t('admin.configured')}</Badge>
        </div>
        <Checkbox
          checked={email}
          onChange={setEmail}
          disabled={!config.email.configured}
          label={t('notif.email')}
          description={config.email.configured ? t('admin.configured') : t('notif.emailOff')}
        />
        <Checkbox
          checked={sms}
          onChange={setSms}
          disabled={!config.sms.configured}
          label={t('notif.sms')}
          description={config.sms.configured ? t('admin.configured') : t('notif.smsOff')}
        />
        <Toggle
          checked={quiet}
          onChange={(v) => {
            setQuiet(v)
            try {
              localStorage.setItem('vidyagram.quiet', v ? '1' : '0')
            } catch {
              /* ignore */
            }
          }}
          label={t('notif.quiet')}
          description={t('notif.quietHint')}
        />
        <p className="text-[10px] leading-relaxed text-ink-400">
          {currentUser?.email} · {t('notif.emailOff')} {t('notif.smsOff')}
        </p>
      </div>
    </SectionCard>
  )
}
