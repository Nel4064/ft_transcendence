import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import fr from './locales/fr.json';
import ch from './locales/ch.json'

i18n
  .use(LanguageDetector) // 自动读取 localStorage 或浏览器默认语言
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      ch: { translation: ch}
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React 自带防 XSS，无需重复转义
    },
  });

export default i18n;