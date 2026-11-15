import { Component, Suspense, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { Icon } from './Icon'
import { Button, Spinner } from './ui'

/**
 * Catches failed route-chunk downloads. On a slow or dropped connection the browser
 * cannot fetch a lazily loaded page, so we show a clear offline-style message instead
 * of an empty screen. Reloading is the only reliable retry because React caches a
 * rejected dynamic import for the lifetime of the page.
 */
class ChunkErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('A page section failed to load', error)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function PageFallback() {
  const { t } = useI18n()
  return (
    <div className="grid min-h-[45vh] place-items-center px-4 py-10" role="status" aria-live="polite">
      <div className="flex items-center gap-3 text-sm text-ink-500">
        <Spinner />
        <span>{t('common.loading')}</span>
      </div>
    </div>
  )
}

function LoadFailure() {
  const { t } = useI18n()
  return (
    <div className="mx-auto mt-6 max-w-md rounded-2xl border border-clay-200 bg-clay-50 p-6 text-center" role="alert">
      <Icon name="alert" size={26} className="mx-auto text-clay-600" />
      <p className="mt-2 font-semibold text-clay-900">{t('state.errorTitle')}</p>
      <p className="mt-1 text-sm text-clay-800">{t('state.errorBody')}</p>
      <Button variant="secondary" size="sm" className="mt-4" icon="refresh" onClick={() => window.location.reload()}>
        {t('state.retry')}
      </Button>
    </div>
  )
}

/**
 * Wraps the routed page area so side navigation and the header stay visible while a
 * page downloads. Resets on navigation, so one failed page does not block the rest.
 */
export function RouteBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return (
    <ChunkErrorBoundary key={pathname} fallback={<LoadFailure />}>
      <Suspense fallback={<PageFallback />}>{children}</Suspense>
    </ChunkErrorBoundary>
  )
}
