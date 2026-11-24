import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Lang } from '../types'
import { en } from './en'
import { hi } from './hi'
import { bn, mr, ta, te } from './regional'

export interface LangDef {
  code: Lang
  native: string
  english: string
  coverage: number
  note: string
}

/**
 * UI coverage is published honestly. Navigation, roles and core actions are
 * translated everywhere; long-form guidance falls back to English until the
 * state textbook cell has reviewed it.
 */
export const LANGS: LangDef[] = [
  { code: 'en', native: 'English', english: 'English', coverage: 100, note: 'Complete interface' },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi', coverage: 100, note: 'Complete interface' },
  { code: 'mr', native: 'मराठी', english: 'Marathi', coverage: 78, note: 'Navigation and core screens' },
  { code: 'bn', native: 'বাংলা', english: 'Bengali', coverage: 74, note: 'Navigation and core screens' },
  { code: 'ta', native: 'தமிழ்', english: 'Tamil', coverage: 70, note: 'Navigation and core screens' },
  { code: 'te', native: 'తెలుగు', english: 'Telugu', coverage: 68, note: 'Navigation and core screens' },
]

const DICTS: Record<Lang, Record<string, string>> = { en, hi, mr, bn, ta, te }

export const CONTENT_LANG_LABEL: Record<Lang, string> = {
  en: 'English',
  hi: 'हिन्दी',
  mr: 'मराठी',
  bn: 'বাংলা',
  ta: 'தமிழ்',
  te: 'తెలుగు',
}

export const LANG_OPTIONS: Lang[] = ['en', 'hi', 'mr', 'bn', 'ta', 'te']

type TFn = (key: string, vars?: Record<string, string | number>) => string

interface I18nValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: TFn
  langs: LangDef[]
  coverage: number
}

const I18nContext = createContext<I18nValue | null>(null)

const STORAGE_KEY = 'vidyagram.lang'

const readStored = (): Lang => {
  try {
    const v = localStorage.getItem(STORAGE_KEY) as Lang | null
    if (v && LANG_OPTIONS.includes(v)) return v
  } catch {
    /* storage unavailable */
  }
  return 'en'
}

export const interpolate = (template: string, vars?: Record<string, string | number>): string => {
  if (!vars) return template
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    vars[key] === undefined || vars[key] === null ? `{{${key}}}` : String(vars[key]),
  )
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStored)

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const t = useCallback<TFn>(
    (key, vars) => {
      const dict = DICTS[lang] || en
      const raw = dict[key] ?? en[key] ?? key
      return interpolate(raw, vars)
    },
    [lang],
  )

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      t,
      langs: LANGS,
      coverage: LANGS.find((l) => l.code === lang)?.coverage ?? 100,
    }),
    [lang, setLang, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
