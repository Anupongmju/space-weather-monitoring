import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// English modular namespaces
import enCommon from './locales/en/common.json'
import enCosmic from './locales/en/cosmic.json'
import enDashboard from './locales/en/dashboard.json'
import enSwepam from './locales/en/guides/swepam.json'
import enMag from './locales/en/guides/mag.json'

// Thai modular namespaces
import thCommon from './locales/th/common.json'
import thCosmic from './locales/th/cosmic.json'
import thDashboard from './locales/th/dashboard.json'
import thSwepam from './locales/th/guides/swepam.json'
import thMag from './locales/th/guides/mag.json'

const resources = {
  en: {
    translation: {
      ...enCommon,
      cosmic: enCosmic,
      dashboard: enDashboard,
      guides: {
        swepam: enSwepam,
        mag: enMag,
      },
    },
  },
  th: {
    translation: {
      ...thCommon,
      cosmic: thCosmic,
      dashboard: thDashboard,
      guides: {
        swepam: thSwepam,
        mag: thMag,
      },
    },
  },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'app_language',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
