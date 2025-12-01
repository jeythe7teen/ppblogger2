import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { translations } from './translations';

type Language = 'en' | 'ta';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Helper function to get nested values from an object using a dot-notation string
const getNestedTranslation = (obj: any, key: string): string | undefined => {
  return key.split('.').reduce((acc, cur) => acc?.[cur], obj);
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('padikkalaam_language') as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('padikkalaam_language', language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };
  
  const t = (key: string, replacements?: { [key: string]: string | number }): string => {
    const translationSet = translations[language] || translations.en;
    let text = getNestedTranslation(translationSet, key);

    if (text === undefined) {
      console.warn(`Translation key "${key}" not found.`);
      return key;
    }

    if (replacements) {
      Object.keys(replacements).forEach(rKey => {
        text = text.replace(`{${rKey}}`, String(replacements[rKey]));
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslations = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslations must be used within a LanguageProvider');
  }
  return context;
};