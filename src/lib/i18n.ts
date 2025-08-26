// src/lib/i18n.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      lng: 'pt',
      fallbackLng: 'pt',
      resources: { pt: { translation: {} } }, // placeholder
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    })
}

export default i18n