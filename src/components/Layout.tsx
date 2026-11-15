import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../lib/store'
import { useI18n } from '../lib/i18n'
import { cn } from '../lib/utils'
import { unreadNotificationCount } from '../lib/access'
import { Icon, type IconName } from './Icon'
import { Avatar, Badge, Button, ToastStack } from './ui'
import { RouteBoundary } from './RouteBoundary'

interface NavItem {
  to: string
  key: string
  icon: IconName
  end?: boolean
}

interface NavSection {
  key: string
  items: NavItem[]
}

const studentNav: NavSection[] = [
  {
    key: 'nav.section.learn',
    items: [
      { to: '/dashboard', key: 'nav.dashboard', icon: 'home', end: true },
      { to: '/classes', key: 'nav.classes', icon: 'users' },
      { to: '/live', key: 'nav.live', icon: 'video' },
      { to: '/recordings', key: 'nav.recordings', icon: 'play' },
      { to: '/materials', key: 'nav.materials', icon: 'book' },
      { to: '/quizzes', key: 'nav.quizzes', icon: 'clipboard' },
      { to: '/labs', key: 'nav.labs', icon: 'flask' },
      { to: '/ai', key: 'nav.ai', icon: 'sparkles' },
      { to: '/library', key: 'nav.library', icon: 'library' },
    ],
  },
  {
    key: 'nav.section.account',
    items: [
      { to: '/attendance', key: 'nav.attendance', icon: 'calendar' },
      { to: '/marks', key: 'nav.marks', icon: 'chart' },
      { to: '/doubts', key: 'nav.doubts', icon: 'message' },
      { to: '/scholarships', key: 'nav.scholarships', icon: 'award' },
      { to: '/downloads', key: 'nav.downloads', icon: 'download' },
    ],
  },
  {
    key: 'nav.section.family',
    items: [
      { to: '/notifications', key: 'nav.notifications', icon: 'bell' },
      { to: '/feedback', key: 'nav.feedback', icon: 'heart' },
      { to: '/profile', key: 'nav.profile', icon: 'user' },
      { to: '/privacy', key: 'nav.privacy', icon: 'shield' },
    ],
  },
]

const teacherNav: NavSection[] = [
  {
    key: 'nav.section.teach',
    items: [
      { to: '/dashboard', key: 'nav.dashboard', icon: 'home', end: true },
      { to: '/classes', key: 'nav.classes', icon: 'users' },
      { to: '/live', key: 'nav.live', icon: 'video' },
      { to: '/recordings', key: 'nav.recordings', icon: 'play' },
      { to: '/materials', key: 'nav.materials', icon: 'book' },
      { to: '/quizzes', key: 'nav.quizzes', icon: 'clipboard' },
      { to: '/labs', key: 'nav.labs', icon: 'flask' },
      { to: '/ai', key: 'nav.ai', icon: 'sparkles' },
    ],
  },
  {
    key: 'nav.section.account',
    items: [
      { to: '/attendance', key: 'nav.attendance', icon: 'calendar' },
      { to: '/marks', key: 'nav.marks', icon: 'chart' },
      { to: '/doubts', key: 'nav.doubts', icon: 'message' },
      { to: '/library', key: 'nav.library', icon: 'library' },
      { to: '/scholarships', key: 'nav.scholarships', icon: 'award' },
      { to: '/notifications', key: 'nav.notifications', icon: 'bell' },
      { to: '/feedback', key: 'nav.feedback', icon: 'heart' },
      { to: '/profile', key: 'nav.profile', icon: 'user' },
      { to: '/privacy', key: 'nav.privacy', icon: 'shield' },
    ],
  },
]

const parentNav: NavSection[] = [
  {
    key: 'nav.section.family',
    items: [
      { to: '/dashboard', key: 'nav.dashboard', icon: 'home', end: true },
      { to: '/classes', key: 'nav.myChildren', icon: 'users' },
      { to: '/attendance', key: 'nav.attendance', icon: 'calendar' },
      { to: '/marks', key: 'nav.marks', icon: 'chart' },
      { to: '/scholarships', key: 'nav.scholarships', icon: 'award' },
      { to: '/notifications', key: 'nav.notifications', icon: 'bell' },
      { to: '/feedback', key: 'nav.feedback', icon: 'heart' },
      { to: '/profile', key: 'nav.profile', icon: 'user' },
      { to: '/privacy', key: 'nav.privacy', icon: 'shield' },
    ],
  },
]

const adminNav: NavSection[] = [
  {
    key: 'nav.section.admin',
    items: [
      { to: '/dashboard', key: 'nav.dashboard', icon: 'home', end: true },
      { to: '/admin/schools', key: 'nav.schools', icon: 'school' },
      { to: '/admin/users', key: 'nav.users', icon: 'users' },
      { to: '/admin/classes', key: 'nav.classes', icon: 'library' },
      { to: '/admin/content', key: 'nav.content', icon: 'book' },
      { to: '/admin/approvals', key: 'nav.approvals', icon: 'lock' },
      { to: '/admin/scholarships', key: 'nav.scholarships', icon: 'award' },
      { to: '/admin/feedback', key: 'nav.feedback', icon: 'message' },
      { to: '/admin/settings', key: 'nav.settings', icon: 'settings' },
      { to: '/notifications', key: 'nav.notifications', icon: 'bell' },
      { to: '/profile', key: 'nav.profile', icon: 'user' },
      { to: '/privacy', key: 'nav.privacy', icon: 'shield' },
    ],
  },
]

const navFor = (role: string): NavSection[] =>
  role === 'teacher' ? teacherNav : role === 'parent' ? parentNav : role === 'admin' ? adminNav : studentNav

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/dashboard" className="flex items-center gap-2.5 rounded-lg" aria-label="VidyaGram dashboard">
      <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
        <svg viewBox="0 0 24 24" width="23" height="23" fill="none" aria-hidden="true">
          <path d="M3 8.5 12 4l9 4.5L12 13 3 8.5Z" fill="#fdc35a" />
          <path d="M6 11v4c0 2 2.7 3.5 6 3.5s6-1.5 6-3.5v-4" stroke="white" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M20 9v5.5" stroke="#fdc35a" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[17px] font-extrabold tracking-tight text-ink-900">VidyaGram</span>
          <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-ink-400">Team AROHA</span>
        </span>
      )}
    </Link>
  )
}

function LanguageMenu({ align = 'right' }: { align?: 'left' | 'right' }) {
  const { lang, setLang, langs, coverage } = useI18n()
  const { currentUser, updateUser } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const current = langs.find((l) => l.code === lang)!

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-10 items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-2.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Language: ${current.english}`}
      >
        <Icon name="globe" size={16} />
        <span className="hidden sm:inline">{current.native}</span>
        <span className="sm:hidden">{current.code.toUpperCase()}</span>
        <Icon name="chevronDown" size={14} />
      </button>
      {open ? (
        <div
          className={cn(
            'absolute z-40 mt-2 w-72 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-pop',
            align === 'right' ? 'right-0' : 'left-0',
          )}
          role="menu"
          aria-label="Choose language"
        >
          <div className="border-b border-ink-100 bg-ink-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Interface language</p>
            <p className="mt-0.5 text-[11px] text-ink-400">Interface translated: {coverage}%. Missing text falls back to English.</p>
          </div>
          <ul className="max-h-80 overflow-y-auto py-1">
            {langs.map((l) => (
              <li key={l.code}>
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={l.code === lang}
                  onClick={() => {
                    setLang(l.code)
                    if (currentUser) updateUser(currentUser.id, { language: l.code })
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-ink-50',
                    l.code === lang && 'bg-brand-50/60',
                  )}
                >
                  <span>
                    <span className="block text-sm font-semibold text-ink-900">{l.native}</span>
                    <span className="block text-[11px] text-ink-500">
                      {l.english} · {l.note}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-ink-400">{l.coverage}%</span>
                    {l.code === lang ? <Icon name="check" size={16} className="text-brand-600" /> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="border-t border-ink-100 px-3 py-2 text-[10px] leading-relaxed text-ink-400">
            Learning resources show their own available languages. Select a language now; content is not auto-translated.
          </p>
        </div>
      ) : null}
    </div>
  )
}

function LowDataPill() {
  const { currentUser, updateUser } = useApp()
  const { t } = useI18n()
  if (!currentUser) return null
  const on = !!currentUser.lowDataMode
  return (
    <button
      type="button"
      onClick={() => updateUser(currentUser.id, { lowDataMode: !on })}
      className={cn(
        'hidden min-h-10 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold md:flex',
        on ? 'border-leaf-300 bg-leaf-50 text-leaf-800' : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50',
      )}
      aria-pressed={on}
      title={on ? t('shell.lowDataHint') : t('shell.lowData')}
    >
      <Icon name={on ? 'leaf' : 'zap'} size={15} />
      {on ? t('shell.lowDataOn') : t('shell.lowData')}
    </button>
  )
}

function ProfileMenu() {
  const { currentUser, logout, resetDemo } = useApp()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  if (!currentUser) return null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-10 items-center gap-2 rounded-xl border border-transparent p-1 pr-2 hover:bg-ink-100"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Account menu"
      >
        <Avatar name={currentUser.name} color={currentUser.avatarColor} size="sm" />
        <span className="hidden text-left sm:block">
          <span className="block max-w-[128px] truncate text-xs font-semibold leading-tight text-ink-900">{currentUser.name}</span>
          <span className="block text-[10px] capitalize text-ink-500">{t(`role.${currentUser.role}`)}</span>
        </span>
        <Icon name="chevronDown" size={14} className="text-ink-500" />
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-pop" role="menu">
          <div className="border-b border-ink-100 px-3 py-3">
            <p className="text-sm font-bold text-ink-900">{currentUser.name}</p>
            <p className="truncate text-xs text-ink-500">{currentUser.email}</p>
            <Badge tone="brand" className="mt-1.5">{t(`role.${currentUser.role}`)}</Badge>
          </div>
          <div className="py-1">
            <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-ink-700 hover:bg-ink-50">
              <Icon name="user" size={16} /> {t('shell.profile')}
            </Link>
            <Link to="/privacy" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-ink-700 hover:bg-ink-50">
              <Icon name="shield" size={16} /> {t('nav.privacy')}
            </Link>
            <Link to="/feedback" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-ink-700 hover:bg-ink-50">
              <Icon name="heart" size={16} /> {t('nav.feedback')}
            </Link>
            {currentUser.role === 'admin' ? (
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm(t('admin.resetHint'))) {
                    setOpen(false)
                    await resetDemo()
                    navigate('/login')
                  }
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-ink-700 hover:bg-ink-50"
              >
                <Icon name="refresh" size={16} /> {t('shell.resetDemo')}
              </button>
            ) : null}
          </div>
          <div className="border-t border-ink-100 py-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                logout()
                navigate('/login')
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-clay-700 hover:bg-clay-50"
            >
              <Icon name="logout" size={16} /> {t('shell.logout')}
            </button>
          </div>
          <p className="border-t border-ink-100 bg-ink-50 px-3 py-2 text-[10px] text-ink-400">
            {t('app.demoBanner')} · v1.0 · Team AROHA
          </p>
        </div>
      ) : null}
    </div>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { currentUser, db, logout, pendingSync, online, syncOutbox } = useApp()
  const { t } = useI18n()
  const navigate = useNavigate()
  if (!currentUser) return null
  const sections = navFor(currentUser.role)
  const school = db.schools.find((s) => s.id === currentUser.schoolId)
  const unread = unreadNotificationCount(db, currentUser.id)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <BrandMark />
        <button
          type="button"
          onClick={onNavigate}
          className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 lg:hidden"
          aria-label={t('shell.closeMenu')}
        >
          <Icon name="x" size={20} />
        </button>
      </div>
      <div className="mx-3 mb-2 rounded-xl border border-ink-200 bg-white px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">{t('shell.role')}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs font-bold text-ink-800">
          <Avatar name={currentUser.name} color={currentUser.avatarColor} size="sm" />
          <span className="min-w-0">
            <span className="block truncate">{currentUser.name}</span>
            <span className="block truncate text-[10px] font-medium text-ink-500">
              {t(`role.${currentUser.role}`)} · {school?.code || school?.name}
            </span>
          </span>
        </p>
      </div>

      <nav className="scroll-thin flex-1 overflow-y-auto px-3 pb-4" aria-label="Main navigation">
        {sections.map((section) => (
          <div key={section.key} className="mb-4">
            <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">{t(section.key)}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'group flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors',
                        isActive
                          ? 'bg-brand-50 text-brand-800 shadow-[inset_2px_0_0_0_#2b50d4]'
                          : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon name={item.icon} size={17} className={isActive ? 'text-brand-700' : 'text-ink-400 group-hover:text-ink-600'} />
                        <span className="min-w-0 flex-1 truncate">{t(item.key)}</span>
                        {item.key === 'nav.notifications' && unread > 0 ? (
                          <span className="rounded-full bg-clay-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{unread}</span>
                        ) : null}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-ink-200 p-3">
        {!online ? (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-saffron-50 px-2.5 py-2 text-[11px] font-medium text-saffron-900">
            <span className="flex items-center gap-1"><Icon name="wifiOff" size={13} /> Offline</span>
            {pendingSync > 0 ? (
              <button className="underline decoration-saffron-500 underline-offset-2" onClick={() => void syncOutbox()}>
                {pendingSync} pending
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="mb-2">
          <LanguageMenu align="left" />
        </div>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(t('auth.logoutConfirm'))) {
              logout()
              navigate('/login')
              onNavigate?.()
            }
          }}
          className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 text-[13px] font-medium text-ink-600 hover:bg-clay-50 hover:text-clay-800"
        >
          <Icon name="logout" size={16} /> {t('shell.logout')}
        </button>
        <p className="px-2.5 pt-1 text-[10px] leading-relaxed text-ink-400">v1.0 · {t('app.by')}</p>
      </div>
    </div>
  )
}

export function AppShell({ children }: { children?: ReactNode }) {
  const { currentUser, db, online, pendingSync, syncOutbox } = useApp()
  const { t } = useI18n()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.title = `VidyaGram · ${t('app.tagline')}`
  }, [t])

  if (!currentUser) return null
  const unread = unreadNotificationCount(db, currentUser.id)

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <a
        href="#main"
        className="sr-only z-[100] rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        {t('shell.skipToContent')}
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[266px] border-r border-ink-200 bg-[#fbfcfe] lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/50" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-[310px] bg-[#fbfcfe] shadow-pop" role="dialog" aria-modal="true" aria-label="Navigation menu">
            <SidebarContent onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-[266px]">
        <header className="sticky top-0 z-20 border-b border-ink-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex min-h-16 max-w-wrap items-center gap-2 px-3 sm:px-6">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 lg:hidden"
              aria-label={t('shell.menu')}
            >
              <Icon name="menu" size={22} />
            </button>
            <div className="lg:hidden">
              <BrandMark compact />
            </div>
            <div className="hidden min-w-0 flex-1 lg:block">
              <p className="truncate text-[13px] text-ink-500">
                {t('dash.welcomeBack')} <span className="font-semibold text-ink-800">{currentUser.name.split(' ')[0]}</span>
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <span
                className={cn(
                  'hidden items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold sm:flex',
                  online ? 'border-leaf-200 bg-leaf-50 text-leaf-800' : 'border-saffron-200 bg-saffron-50 text-saffron-900',
                )}
                title={online ? t('shell.online') : t('shell.offline')}
              >
                <Icon name={online ? 'wifi' : 'wifiOff'} size={12} />
                {online ? t('common.online') : t('common.offline')}
              </span>
              <LowDataPill />
              <LanguageMenu />
              <Link
                to="/notifications"
                className="relative rounded-xl p-2.5 text-ink-600 hover:bg-ink-100"
                aria-label={`${t('shell.notifications')}${unread ? `, ${unread} unread` : ''}`}
              >
                <Icon name="bell" size={20} />
                {unread > 0 ? (
                  <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-clay-600 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                ) : null}
              </Link>
              <ProfileMenu />
            </div>
          </div>
          {!online ? (
            <div className="border-t border-saffron-200 bg-saffron-50 px-3 py-2 text-xs text-saffron-900 sm:px-6">
              <div className="mx-auto flex max-w-wrap items-center gap-2">
                <Icon name="wifiOff" size={15} className="shrink-0" />
                <span className="font-semibold">{t('state.offlineTitle')}</span>
                <span className="hidden text-saffron-800 sm:inline">{t('state.offlineBody')}</span>
                {pendingSync > 0 ? (
                  <button
                    type="button"
                    onClick={() => void syncOutbox()}
                    className="ml-auto shrink-0 rounded-lg border border-saffron-300 bg-white px-2 py-1 font-semibold hover:bg-saffron-100"
                  >
                    {t('dl.sync')} ({pendingSync})
                  </button>
                ) : null}
              </div>
            </div>
          ) : pendingSync > 0 ? (
            <div className="border-t border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-900 sm:px-6">
              <div className="mx-auto flex max-w-wrap items-center gap-2">
                <Icon name="cloud" size={15} />
                <span>{t('shell.syncPending', { count: pendingSync })}</span>
                <button type="button" onClick={() => void syncOutbox()} className="ml-auto rounded-lg border border-brand-300 bg-white px-2 py-1 font-semibold hover:bg-brand-100">
                  {t('dl.sync')}
                </button>
              </div>
            </div>
          ) : null}
        </header>

        <main id="main" className="mx-auto w-full max-w-wrap px-3 py-5 sm:px-6 sm:py-7">
          <RouteBoundary>{children ?? <Outlet />}</RouteBoundary>
          <footer className="mt-10 flex flex-col gap-2 border-t border-ink-200 py-6 text-[11px] text-ink-400 sm:flex-row sm:items-center sm:justify-between">
            <p>
              <span className="font-semibold text-ink-500">VidyaGram</span> · {t('app.tagline')} · {t('app.by')}
            </p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Link to="/privacy" className="hover:text-ink-700">{t('nav.privacy')}</Link>
              <Link to="/feedback" className="hover:text-ink-700">{t('nav.feedback')}</Link>
              <span>{t('app.demoBanner')}</span>
            </p>
          </footer>
        </main>
      </div>
      <ToastStack />
    </div>
  )
}

export function PublicShell({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <header className="mx-auto flex max-w-wrap items-center justify-between px-4 py-4 sm:px-6">
        <BrandMark />
        <div className="flex items-center gap-2">
          <LanguageMenu />
          <Link to="/login" className="hidden text-xs font-semibold text-ink-600 hover:text-ink-900 sm:inline">
            {t('common.signIn')}
          </Link>
        </div>
      </header>
      {children}
      <footer className="mx-auto max-w-wrap px-4 py-8 text-center text-[11px] text-ink-400 sm:px-6">
        <p>{t('app.by')} · {t('app.demoBanner')}</p>
        <p className="mt-1 flex items-center justify-center gap-3">
          <Link to="/privacy" className="hover:text-ink-700">{t('nav.privacy')}</Link>
          <Link to="/feedback" className="hover:text-ink-700">{t('nav.feedback')}</Link>
        </p>
      </footer>
      <ToastStack />
    </div>
  )
}

export function LogoPanel({ children }: { children?: ReactNode }) {
  const { t } = useI18n()
  return (
    <div className="relative hidden overflow-hidden rounded-2xl bg-brand-700 p-8 text-white lg:block">
      <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-500/40" aria-hidden="true" />
      <div className="absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-brand-800/60" aria-hidden="true" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-center gap-2.5">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
              <path d="M3 8.5 12 4l9 4.5L12 13 3 8.5Z" fill="#fdc35a" />
              <path d="M6 11v4c0 2 2.7 3.5 6 3.5s6-1.5 6-3.5v-4" stroke="white" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <p className="text-lg font-extrabold">VidyaGram</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-brand-200">{t('app.by')}</p>
          </div>
        </div>
        <h2 className="mt-10 max-w-sm text-3xl font-bold leading-tight">{t('app.tagline')}</h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-brand-100">{t('auth.subtitle')}</p>
        <ul className="mt-8 space-y-3 text-sm text-brand-50">
          {[
            'Live classes, notes and quizzes in one place',
            'Works on a low-cost phone and a slow connection',
            'Available in six languages, with offline downloads',
            'Built for students, teachers, parents and schools',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/15">
                <Icon name="check" size={12} />
              </span>
              {item}
            </li>
          ))}
        </ul>
        {children}
        <p className="mt-auto pt-8 text-[11px] text-brand-200">
          Sample data only · No real student records · Integrations clearly labelled
        </p>
      </div>
    </div>
  )
}
