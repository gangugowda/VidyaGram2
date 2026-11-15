import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../../lib/store'
import { useI18n } from '../../lib/i18n'
import { publicDemoAccounts } from '../../lib/demo'
import { Button, Card, Callout, Field, TextInput } from '../../components/ui'
import { LogoPanel } from '../../components/Layout'
import { Icon } from '../../components/Icon'
import { Avatar } from '../../components/ui'
import { DEMO_PASSWORD } from '../../lib/seed/base'

export function LoginPage() {
  const { db, login, toast } = useApp()
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: string } }
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const demoAccounts = publicDemoAccounts(db)
  const nextPath = location.state?.from || '/dashboard'

  const doLogin = async (id: string, pass: string, key: string) => {
    setBusy(key)
    setError('')
    const res = await login(id, pass)
    setBusy(null)
    if (res.ok) {
      toast('success', t('common.welcome'), t('toast.welcome', { name: id.split('@')[0] }))
      navigate(nextPath, { replace: true })
    } else {
      setError(res.error || 'auth.invalid')
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-wrap gap-6 px-4 pb-10 sm:px-6 lg:grid-cols-[1fr_460px] lg:items-stretch">
      <LogoPanel>
        <div className="mt-8 rounded-2xl border border-white/15 bg-white/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-100">Demo accounts</p>
          <p className="mt-1 text-sm text-white">
            Password for every sample account: <span className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[13px]">{DEMO_PASSWORD}</span>
          </p>
        </div>
      </LogoPanel>

      <div className="w-full">
        <Card className="p-5 sm:p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{t('auth.signInTab')}</p>
            <h1 className="mt-1 text-2xl font-bold text-ink-900">{t('auth.title')}</h1>
            <p className="mt-1 text-sm text-ink-500">{t('auth.subtitle')}</p>
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              void doLogin(identifier, password, 'form')
            }}
          >
            <Field label={t('auth.email')} htmlFor="identifier" required>
              <TextInput
                id="identifier"
                autoComplete="username"
                inputMode="email"
                placeholder="aarav@vidyagram.demo"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </Field>
            <Field label={t('auth.password')} htmlFor="password" required>
              <TextInput
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
            {error ? (
              <Callout tone="danger" title={t(error)} />
            ) : null}
            <Button type="submit" size="lg" className="w-full" loading={busy === 'form'}>
              {t('auth.signInBtn')}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-ink-600">
            {t('auth.noAccount')}{' '}
            <Link to="/signup" className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800">
              {t('common.signUp')}
            </Link>
          </p>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-ink-200" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{t('auth.demoAccounts')}</span>
            <span className="h-px flex-1 bg-ink-200" />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {demoAccounts.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => void doLogin(u.email, DEMO_PASSWORD, u.id)}
                disabled={!!busy}
                className="flex items-center gap-2.5 rounded-xl border border-ink-200 bg-white p-2.5 text-left transition-colors hover:border-brand-300 hover:bg-brand-50 disabled:opacity-60"
              >
                <Avatar name={u.name} color={u.avatarColor} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-ink-900">{u.name}</span>
                  <span className="block text-[10px] text-ink-500">{t(`role.${u.role}`)}</span>
                </span>
                <span className="text-[10px] font-semibold text-brand-700">
                  {busy === u.id ? '…' : <Icon name="arrowRight" size={15} />}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-ink-400">{t('auth.demoNote')}</p>
        </Card>

        <div className="mt-4 grid gap-2 text-center sm:grid-cols-2">
          <Link to="/signup?role=student" className="rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-xs font-semibold text-ink-700 hover:bg-ink-50">
            Student joining a class
          </Link>
          <Link to="/signup?role=parent" className="rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-xs font-semibold text-ink-700 hover:bg-ink-50">
            Parent linking a child
          </Link>
        </div>
      </div>
    </div>
  )
}
