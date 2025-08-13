// src/components/LanguageSwitcher.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import i18n from '@/lib/i18n'

const SUPPORTED = ['pt', 'en'] as const
type Locale = (typeof SUPPORTED)[number]

export default function LanguageSwitcher() {
  const [locale, setLocale] = useState<Locale>('pt')

  // Inicializa o idioma: primeiro do cookie, senão do i18n, senão padrão
  useEffect(() => {
    if (typeof document === 'undefined') return

    const cookieMatch = document.cookie.match(/(?:^|; *)NEXT_LOCALE=([^;]+)/)
    if (cookieMatch) {
      const val = decodeURIComponent(cookieMatch[1]) as Locale
      if (SUPPORTED.includes(val)) {
        setLocale(val)
        i18n.changeLanguage(val)
        return
      }
    }

    const current = (i18n.language || 'pt') as Locale
    if (SUPPORTED.includes(current)) {
      setLocale(current)
    } else {
      setLocale('pt')
      i18n.changeLanguage('pt')
    }
  }, [])

  const change = useCallback((l: Locale) => {
    setLocale(l)
    if (typeof document !== 'undefined') {
      document.cookie = `NEXT_LOCALE=${encodeURIComponent(l)}; path=/; max-age=${60 * 60 * 24 * 30}`
    }
    i18n.changeLanguage(l)
  }, [])

  return (
    <div aria-label="Selecionar idioma" className="inline-block ml-2">
      <label className="flex items-center gap-1">
        <span className="sr-only">Idioma</span>
        <select
          aria-label="Selecionar idioma"
          value={locale}
          onChange={(e) => change(e.target.value as Locale)}
          className="bg-zinc-800 text-white px-2 py-1 rounded focus:outline-none"
        >
          {SUPPORTED.map((l) => (
            <option key={l} value={l}>
              {l === 'pt' ? 'PT-BR' : 'EN'}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}