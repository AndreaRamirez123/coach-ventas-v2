import React, { createContext, useContext, useState } from 'react';
import { Language, translations } from '../i18n/translations';

type Translations = typeof translations.es;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'es',
  setLanguage: () => {},
  t: translations.es,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() =>
    (localStorage.getItem('coach_lang') as Language) || 'es'
  );

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('coach_lang', lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
