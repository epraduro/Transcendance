import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './locales/fr.json';
import en from './locales/en.json';
import it from './locales/it.json';

const resources = {
	en: { translation: en },
	fr: { translation: fr },
	it: { translation: it },
  };

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('lang') ?? 'en',
    interpolation: {
      escapeValue: false,
    },
    missingKeyHandler: (lngs, ns, key, fallbackValue) => {
      console.warn(`Missing key: ${key} in the language ${lngs}`);
      return 'Oops, we forgot to translate this!';
    },
  });