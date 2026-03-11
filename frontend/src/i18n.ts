import en from './locales/en.json';
import cz from './locales/cz.json';

export type Language = 'en' | 'cz';

export const translations = {
  en,
  cz,
};

export type TranslationKey = keyof typeof en;

export const getLanguage = (savedLang?: string): Language => {
  // Check localStorage first
  if (savedLang && (savedLang === 'en' || savedLang === 'cz')) {
    return savedLang as Language;
  }

  // Check browser language
  const browserLang = navigator.language.split('-')[0].toLowerCase();
  if (browserLang === 'cs') return 'cz';
  if (browserLang === 'en') return 'en';

  // Default to English
  return 'en';
};

export const saveLanguage = (lang: Language) => {
  localStorage.setItem('language', lang);
};

export default translations;
