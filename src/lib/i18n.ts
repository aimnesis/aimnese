// src/lib/i18n.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../../public/locales/en/common.json'
import pt from '../../public/locales/pt/common.json'

// função simples para ler cookie
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  if (match) return decodeURIComponent(match[2])
  return null
}

const detectedLang =
  getCookie('NEXT_LOCALE') ||
  (typeof navigator !== 'undefined'
    ? navigator.language.startsWith('pt')
      ? 'pt'
      : 'en'
    : 'pt')

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    pt: { translation: pt },
  },
  lng: detectedLang,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  detection: {
    order: ['cookie', 'navigator'],
    caches: ['cookie'],
  },
})

export default i18n