'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { en } from '@/i18n/en'
import { es } from '@/i18n/es'
import type { Translations } from '@/i18n/en'

export type Locale = 'en' | 'es'

const translations: Record<Locale, Translations> = { en, es }

interface LanguageContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: Translations
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: en,
})

function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  const saved = localStorage.getItem('locale') as Locale | null
  if (saved === 'en' || saved === 'es') return saved
  const sys = (navigator.language || 'en').slice(0, 2)
  return sys === 'es' ? 'es' : 'en'
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    setLocaleState(detectLocale())
  }, [])

  function setLocale(l: Locale) {
    setLocaleState(l)
    localStorage.setItem('locale', l)
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useT() {
  return useContext(LanguageContext).t
}

export function useLocale() {
  const { locale, setLocale } = useContext(LanguageContext)
  return { locale, setLocale }
}
