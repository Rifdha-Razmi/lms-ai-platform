// i18n scaffolding (PRD §3.1). English is complete; Tamil, Sinhala and Hindi cover
// navigation and common actions — untranslated keys fall back to English.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ta from './locales/ta.json';
import si from './locales/si.json';
import hi from './locales/hi.json';
import { useUiStore } from '@/store/uiStore';

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'si', label: 'සිංහල' },
  { code: 'hi', label: 'हिन्दी' },
] as const;

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ta: { translation: ta },
    si: { translation: si },
    hi: { translation: hi },
  },
  lng: useUiStore.getState().language,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

useUiStore.subscribe((s) => {
  if (s.language !== i18n.language) void i18n.changeLanguage(s.language);
  document.documentElement.lang = s.language;
});

export default i18n;
