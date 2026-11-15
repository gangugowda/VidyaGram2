import { Link } from 'react-router-dom'
import { useApp } from '../lib/store'
import { useI18n } from '../lib/i18n'
import { Icon } from '../components/Icon'
import { buttonClass } from '../components/ui'

export function ForbiddenPage() {
  const { t } = useI18n()
  const { currentUser } = useApp()
  return (
    <div className="mx-auto max-w-xl py-10 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-saffron-50 text-saffron-700">
        <Icon name="lock" size={30} />
      </span>
      <h1 className="mt-4 text-2xl font-bold text-ink-900">{t('state.forbiddenTitle')}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">{t('state.forbiddenBody')}</p>
      <p className="mt-2 text-xs text-ink-400">
        {currentUser ? `${currentUser.name} · ${t(`role.${currentUser.role}`)}` : ''}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link to="/dashboard" className={buttonClass('primary', 'md')}>{t('state.goHome')} <Icon name="arrowRight" size={16} /></Link>
        <Link to="/privacy" className={buttonClass('secondary', 'md')}>{t('nav.privacy')}</Link>
      </div>
    </div>
  )
}

export function NotFoundPage() {
  const { t } = useI18n()
  return (
    <div className="mx-auto max-w-xl py-10 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-700">
        <Icon name="search" size={30} />
      </span>
      <h1 className="mt-4 text-2xl font-bold text-ink-900">{t('state.notFoundTitle')}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">{t('state.notFoundBody')}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link to="/dashboard" className={buttonClass('primary', 'md')}>{t('state.goHome')} <Icon name="arrowRight" size={16} /></Link>
        <Link to="/feedback" className={buttonClass('secondary', 'md')}>{t('nav.feedback')}</Link>
      </div>
    </div>
  )
}
