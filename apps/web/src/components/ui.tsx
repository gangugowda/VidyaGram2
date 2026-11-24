import {
  createContext,
  useContext,
  useEffect,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { cn, initials, initialsColor } from '../lib/utils'
import { useApp } from '../lib/store'
import { Icon, type IconName } from './Icon'

/* ------------------------------------------------------------------ Button */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'quiet'
type ButtonSize = 'sm' | 'md' | 'lg'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 border border-brand-600 shadow-sm',
  secondary: 'bg-white text-ink-800 border border-ink-300 hover:bg-ink-50 active:bg-ink-100',
  ghost: 'bg-transparent text-ink-700 border border-transparent hover:bg-ink-100',
  danger: 'bg-clay-600 text-white border border-clay-600 hover:bg-clay-700',
  success: 'bg-leaf-600 text-white border border-leaf-600 hover:bg-leaf-700',
  quiet: 'bg-brand-50 text-brand-800 border border-brand-100 hover:bg-brand-100',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 py-1.5 text-[13px] gap-1.5 rounded-lg',
  md: 'min-h-11 px-4 py-2 text-sm gap-2 rounded-xl',
  lg: 'min-h-12 px-5 py-2.5 text-[15px] gap-2 rounded-xl',
}

export const buttonClass = (variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra = '') =>
  cn(
    'inline-flex items-center justify-center font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
    variants[variant],
    sizes[size],
    extra,
  )

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: IconName
  iconRight?: IconName
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  iconRight,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button className={buttonClass(variant, size, className || '')} disabled={disabled || loading} {...rest}>
      {loading ? <Spinner /> : icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 16 : 18} /> : null}
    </button>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
      <span className="sr-only">{label || 'Loading'}</span>
    </span>
  )
}

/* -------------------------------------------------------------------- Card */

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('card', className)} {...rest}>
      {children}
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
  icon,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  eyebrow?: string
  icon?: IconName
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        {icon ? (
          <span className="mt-0.5 hidden h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-brand-700 shadow-card sm:grid">
            <Icon name={icon} size={22} />
          </span>
        ) : null}
        <div>
          {eyebrow ? <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-700">{eyebrow}</p> : null}
          <h1 className="text-2xl font-bold leading-tight text-ink-900 sm:text-[28px]">{title}</h1>
          {subtitle ? <p className="mt-1 max-w-2xl text-sm text-ink-500">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
  icon,
}: {
  title?: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  icon?: IconName
}) {
  return (
    <section className={cn('card overflow-hidden', className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-2 border-b border-ink-100 px-4 py-3.5 sm:px-5">
          <div className="flex items-start gap-2.5">
            {icon ? <Icon name={icon} size={18} className="mt-0.5 text-brand-600" /> : null}
            <div>
              <h2 className="text-[15px] font-bold text-ink-900">{title}</h2>
              {subtitle ? <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p> : null}
            </div>
          </div>
          {action}
        </header>
      )}
      <div className={cn('p-4 sm:p-5', bodyClassName)}>{children}</div>
    </section>
  )
}

/* ------------------------------------------------------------------- Badge */

type Tone = 'brand' | 'leaf' | 'saffron' | 'clay' | 'ink' | 'neutral'

const tones: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-800 border-brand-200',
  leaf: 'bg-leaf-50 text-leaf-800 border-leaf-200',
  saffron: 'bg-saffron-50 text-saffron-800 border-saffron-200',
  clay: 'bg-clay-50 text-clay-800 border-clay-200',
  ink: 'bg-ink-100 text-ink-800 border-ink-200',
  neutral: 'bg-white text-ink-600 border-ink-200',
}

export function Badge({
  children,
  tone = 'neutral',
  className,
  icon,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
  icon?: IconName
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-5',
        tones[tone],
        className,
      )}
    >
      {icon ? <Icon name={icon} size={12} /> : null}
      {children}
    </span>
  )
}

export function Chip({
  children,
  active,
  onClick,
  className,
}: {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
}) {
  const Comp = onClick ? 'button' : 'span'
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50',
        className,
      )}
      type={onClick ? 'button' : undefined}
      aria-pressed={onClick ? !!active : undefined}
    >
      {children}
    </Comp>
  )
}

/* ------------------------------------------------------------------- Forms */

interface FieldProps {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
  className?: string
}

export function Field({ label, htmlFor, hint, error, required, children, className }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-ink-800">
        {label}
        {required ? <span className="ml-0.5 text-clay-600" aria-hidden="true">*</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-ink-500">{hint}</p> : null}
      {error ? (
        <p className="flex items-start gap-1 text-xs font-medium text-clay-700" role="alert">
          <Icon name="alert" size={13} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  )
}

const controlClass =
  'w-full rounded-xl border border-ink-300 bg-white px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 shadow-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-ink-50 disabled:text-ink-500'

export function TextInput({ className, invalid, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cn(controlClass, invalid && 'border-clay-500 focus:border-clay-500 focus:ring-clay-100', className)} {...rest} />
}

export function TextArea({ className, invalid, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn(controlClass, 'min-h-[96px] resize-y', invalid && 'border-clay-500 focus:border-clay-500 focus:ring-clay-100', className)}
      {...rest}
    />
  )
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlClass, 'appearance-none bg-[length:16px] pr-9', className)} {...rest}>
      {children}
    </select>
  )
}

export function Checkbox({
  label,
  description,
  checked,
  onChange,
  id,
  disabled,
}: {
  label: ReactNode
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  id?: string
  disabled?: boolean
}) {
  const auto = useId()
  const inputId = id || auto
  return (
    <div className={cn('flex items-start gap-3', disabled && 'opacity-60')}>
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-300"
      />
      <label htmlFor={inputId} className="cursor-pointer text-sm text-ink-700">
        <span className="font-medium text-ink-800">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-ink-500">{description}</span> : null}
      </label>
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-semibold text-ink-800">
          {label}
        </label>
        {description ? <p className="mt-0.5 text-xs text-ink-500">{description}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors',
          checked ? 'bg-brand-600' : 'bg-ink-300',
          disabled && 'opacity-50',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------- Modal */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  const width = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' }[size]
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" role="presentation">
      <div className="absolute inset-0 bg-ink-900/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          'relative z-10 flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-pop sm:rounded-2xl',
          width,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-ink-100 px-4 py-4 sm:px-5">
          <div>
            <h2 id="modal-title" className="text-lg font-bold text-ink-900">
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm text-ink-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
            aria-label="Close dialog"
          >
            <Icon name="x" size={20} />
          </button>
        </header>
        <div className="scroll-thin flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer ? <footer className="flex flex-wrap justify-end gap-2 border-t border-ink-100 px-4 py-3 sm:px-5">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  )
}

/* -------------------------------------------------------------------- Tabs */

export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: Array<{ id: string; label: string; count?: number }>
  value: string
  onChange: (id: string) => void
  className?: string
}) {
  return (
    <div className={cn('scroll-thin flex gap-1 overflow-x-auto border-b border-ink-200', className)} role="tablist">
      {items.map((item) => (
        <button
          key={item.id}
          role="tab"
          aria-selected={value === item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cn(
            'relative flex min-h-11 shrink-0 items-center gap-2 rounded-t-lg px-3.5 text-sm font-semibold transition-colors',
            value === item.id ? 'text-brand-700' : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800',
          )}
        >
          {item.label}
          {typeof item.count === 'number' ? (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                value === item.id ? 'bg-brand-100 text-brand-800' : 'bg-ink-100 text-ink-600',
              )}
            >
              {item.count}
            </span>
          ) : null}
          {value === item.id ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" /> : null}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ States */

export function EmptyState({
  icon = 'info',
  title,
  description,
  action,
  className,
}: {
  icon?: IconName
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 px-6 py-10 text-center', className)}>
      <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-ink-400 shadow-sm">
        <Icon name={icon} size={22} />
      </span>
      <p className="mt-3 text-sm font-semibold text-ink-800">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-xs text-ink-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border border-ink-100 bg-white p-10 text-sm text-ink-500" role="status">
      <Spinner />
      {label}
    </div>
  )
}

export function ErrorState({ title, description, retry }: { title: string; description?: string; retry?: () => void }) {
  return (
    <div className="rounded-2xl border border-clay-200 bg-clay-50 p-6 text-center">
      <Icon name="alert" size={26} className="mx-auto text-clay-600" />
      <p className="mt-2 font-semibold text-clay-900">{title}</p>
      {description ? <p className="mt-1 text-sm text-clay-800">{description}</p> : null}
      {retry ? (
        <Button variant="secondary" size="sm" className="mt-3" onClick={retry} icon="refresh">
          Retry
        </Button>
      ) : null}
    </div>
  )
}

export function Callout({
  tone = 'info',
  title,
  children,
  icon,
  action,
}: {
  tone?: 'info' | 'warn' | 'success' | 'danger' | 'brand'
  title?: string
  children?: ReactNode
  icon?: IconName
  action?: ReactNode
}) {
  const styles = {
    info: 'border-brand-200 bg-brand-50 text-brand-900',
    warn: 'border-saffron-200 bg-saffron-50 text-saffron-900',
    success: 'border-leaf-200 bg-leaf-50 text-leaf-900',
    danger: 'border-clay-200 bg-clay-50 text-clay-900',
    brand: 'border-ink-200 bg-ink-50 text-ink-800',
  }[tone]
  const defaultIcon: IconName = tone === 'warn' ? 'alert' : tone === 'danger' ? 'xCircle' : tone === 'success' ? 'checkCircle' : 'info'
  return (
    <div className={cn('flex items-start gap-3 rounded-xl border p-3.5 text-sm', styles)}>
      <Icon name={icon || defaultIcon} size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn('text-[13px] leading-relaxed', title && 'mt-0.5 opacity-90')}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

/* ------------------------------------------------------------------ Charts */

export function ProgressBar({
  value,
  tone = 'brand',
  label,
  showValue = true,
  size = 'md',
}: {
  value: number
  tone?: 'brand' | 'leaf' | 'saffron' | 'clay'
  label?: string
  showValue?: boolean
  size?: 'sm' | 'md'
}) {
  const color = { brand: 'bg-brand-600', leaf: 'bg-leaf-500', saffron: 'bg-saffron-500', clay: 'bg-clay-500' }[tone]
  return (
    <div>
      {(label || showValue) && (
        <div className="mb-1 flex items-center justify-between gap-2 text-xs">
          <span className="font-medium text-ink-600">{label}</span>
          {showValue ? <span className="font-semibold text-ink-800">{Math.round(value)}%</span> : null}
        </div>
      )}
      <div
        className={cn('w-full overflow-hidden rounded-full bg-ink-100', size === 'sm' ? 'h-1.5' : 'h-2.5')}
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
      >
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  )
}

export function Donut({
  value,
  size = 132,
  label,
  sublabel,
  tone = '#2b50d4',
}: {
  value: number
  size?: number
  label?: string
  sublabel?: string
  tone?: string
}) {
  const stroke = 12
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={label ? `${label}: ${Math.round(pct)}%` : `${Math.round(pct)}%`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#eaf0f7" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-2xl font-bold tabular-nums text-ink-900">{Math.round(pct)}%</div>
          {sublabel ? <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-500">{sublabel}</div> : null}
        </div>
      </div>
    </div>
  )
}

export function BarChart({
  data,
  max = 100,
  unit = '%',
}: {
  data: Array<{ label: string; value: number; tone?: string }>
  max?: number
  unit?: string
}) {
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label} className="grid grid-cols-[minmax(82px,34%)_1fr_auto] items-center gap-2 sm:gap-3">
          <span className="truncate text-xs font-medium text-ink-600" title={d.label}>
            {d.label}
          </span>
          <div className="h-3 overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(2, Math.min(100, (d.value / max) * 100))}%`, background: d.tone || '#2b50d4' }}
            />
          </div>
          <span className="w-11 text-right text-xs font-semibold tabular-nums text-ink-800">
            {Math.round(d.value)}
            {unit}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------- Misc */

export function Avatar({
  name,
  color,
  size = 'md',
}: {
  name: string
  color?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const dims = { sm: 'h-8 w-8 text-[11px]', md: 'h-10 w-10 text-xs', lg: 'h-12 w-12 text-sm', xl: 'h-16 w-16 text-lg' }[size]
  return (
    <span
      className={cn('grid shrink-0 place-items-center rounded-full font-bold', dims, color || initialsColor(name))}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'brand',
  onClick,
}: {
  label: string
  value: ReactNode
  hint?: string
  icon?: IconName
  tone?: Tone
  onClick?: () => void
}) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'card flex items-start gap-3 p-4 text-left',
        onClick && 'transition-shadow hover:shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
      )}
    >
      {icon ? (
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl border', tones[tone])}>
          <Icon name={icon} size={19} />
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink-500">{label}</p>
        <p className="mt-0.5 truncate text-xl font-bold leading-tight text-ink-900">{value}</p>
        {hint ? <p className="mt-0.5 text-[11px] text-ink-500">{hint}</p> : null}
      </div>
    </Comp>
  )
}

export function ToastStack() {
  const { toasts, dismissToast } = useApp()
  if (!toasts.length) return null
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-20 z-[60] flex flex-col items-center gap-2 sm:bottom-6 sm:left-auto sm:right-6 sm:items-end">
      {toasts.map((t) => {
        const styles = {
          success: 'border-leaf-200 bg-white text-leaf-900',
          error: 'border-clay-200 bg-white text-clay-900',
          info: 'border-brand-200 bg-white text-brand-900',
          warn: 'border-saffron-200 bg-white text-saffron-900',
        }[t.tone]
        const icons: Record<string, IconName> = {
          success: 'checkCircle',
          error: 'xCircle',
          info: 'info',
          warn: 'alert',
        }
        return (
          <div
            key={t.id}
            className={cn('pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border p-3 shadow-pop animate-fadeIn', styles)}
            role="status"
          >
            <Icon name={icons[t.tone]} size={18} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.description ? <p className="mt-0.5 text-xs opacity-80">{t.description}</p> : null}
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              className="rounded p-1 opacity-60 hover:bg-black/5 hover:opacity-100"
              aria-label="Dismiss notification"
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const { toast } = useApp()
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="secondary"
      size="sm"
      icon={copied ? 'check' : 'copy'}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          toast('success', 'Copied', value)
          window.setTimeout(() => setCopied(false), 2000)
        } catch {
          toast('error', 'Could not copy', 'Select the code and copy it manually.')
        }
      }}
    >
      {label || 'Copy'}
    </Button>
  )
}

export function InfoList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="divide-y divide-ink-100 text-sm">
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-[40%_1fr] gap-3 py-2.5">
          <dt className="text-xs font-medium text-ink-500">{item.label}</dt>
          <dd className="text-sm text-ink-800">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

const RouteGuardContext = createContext(false)
export const useInsideRouteGuard = () => useContext(RouteGuardContext)
RouteGuardContext.displayName = 'RouteGuard'
