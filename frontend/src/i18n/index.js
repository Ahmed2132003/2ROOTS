import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import ar from './locales/ar.json'

const savedLang = localStorage.getItem('lang') || 'ar'


i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar }
    },
    lng: savedLang,
    fallbackLng: 'ar',
    interpolation: { escapeValue: false },
  })



const applyDocumentDirection = (language) => {
  const isArabic = language === 'ar'
  document.documentElement.dir = isArabic ? 'rtl' : 'ltr'
  document.documentElement.lang = language
  document.body.dir = isArabic ? 'rtl' : 'ltr'
}

applyDocumentDirection(savedLang)
i18n.on('languageChanged', applyDocumentDirection)

export default i18n