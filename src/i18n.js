import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import ar from './locales/ar.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            ar: { translation: ar },
        },
        fallbackLng: 'en',
        debug: true,
        interpolation: {
            escapeValue: false, // React already escapes by default
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
        },
    })
    .then(() => {
        const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
        document.dir = dir;
        document.documentElement.lang = i18n.language;
    });

i18n.on('languageChanged', (lng) => {
    const dir = lng === 'ar' ? 'rtl' : 'ltr';
    document.dir = dir;
    document.documentElement.lang = lng;
});

export default i18n;
