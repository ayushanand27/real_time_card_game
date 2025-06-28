import { useState, useEffect, useCallback, createContext, useContext } from 'react';

// Create i18n context
const I18nContext = createContext();

// Default language
const DEFAULT_LANGUAGE = 'en';

// Supported languages
const SUPPORTED_LANGUAGES = {
  en: { name: 'English', flag: '🇺🇸' },
  hi: { name: 'हिंदी', flag: '🇮🇳' },
  es: { name: 'Español', flag: '🇪🇸' }
};

/**
 * I18n Provider Component
 */
export function I18nProvider({ children, defaultLanguage = DEFAULT_LANGUAGE }) {
  const [language, setLanguage] = useState(defaultLanguage);
  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Load translations for the current language
  const loadTranslations = useCallback(async (lang) => {
    try {
      setIsLoading(true);
      const module = await import(`../locales/${lang}.json`);
      setTranslations(module.default);
    } catch (error) {
      console.warn(`Failed to load translations for ${lang}:`, error);
      // Fallback to English
      if (lang !== DEFAULT_LANGUAGE) {
        const fallbackModule = await import(`../locales/${DEFAULT_LANGUAGE}.json`);
        setTranslations(fallbackModule.default);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Change language
  const changeLanguage = useCallback(async (newLanguage) => {
    if (SUPPORTED_LANGUAGES[newLanguage]) {
      setLanguage(newLanguage);
      await loadTranslations(newLanguage);
      
      // Save to localStorage
      localStorage.setItem('call-bray-language', newLanguage);
      
      // Update document language
      document.documentElement.lang = newLanguage;
    }
  }, [loadTranslations]);

  // Initialize language on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('call-bray-language') || defaultLanguage;
    changeLanguage(savedLanguage);
  }, [changeLanguage, defaultLanguage]);

  const value = {
    language,
    translations,
    isLoading,
    changeLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * useTranslation Hook
 */
export function useTranslation() {
  const context = useContext(I18nContext);
  
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }

  const { language, translations, isLoading, changeLanguage, supportedLanguages } = context;

  /**
   * Translate a key with optional parameters
   */
  const t = useCallback((key, params = {}) => {
    if (isLoading) {
      return key; // Return key while loading
    }

    // Get nested translation value
    const getNestedValue = (obj, path) => {
      return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : null;
      }, obj);
    };

    let translation = getNestedValue(translations, key);

    // If translation not found, return the key
    if (!translation) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }

    // Replace parameters in translation
    if (typeof translation === 'string' && Object.keys(params).length > 0) {
      translation = translation.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? params[paramKey] : match;
      });
    }

    return translation;
  }, [translations, isLoading]);

  /**
   * Translate with pluralization
   */
  const tPlural = useCallback((key, count, params = {}) => {
    const baseKey = `${key}.${count === 1 ? 'singular' : 'plural'}`;
    return t(baseKey, { ...params, count });
  }, [t]);

  /**
   * Format numbers according to locale
   */
  const formatNumber = useCallback((number, options = {}) => {
    return new Intl.NumberFormat(language, options).format(number);
  }, [language]);

  /**
   * Format dates according to locale
   */
  const formatDate = useCallback((date, options = {}) => {
    return new Intl.DateTimeFormat(language, options).format(date);
  }, [language]);

  /**
   * Format currency according to locale
   */
  const formatCurrency = useCallback((amount, currency = 'USD', options = {}) => {
    return new Intl.NumberFormat(language, {
      style: 'currency',
      currency,
      ...options
    }).format(amount);
  }, [language]);

  /**
   * Get current language info
   */
  const getLanguageInfo = useCallback(() => {
    return supportedLanguages[language] || supportedLanguages[DEFAULT_LANGUAGE];
  }, [language, supportedLanguages]);

  /**
   * Check if a key exists
   */
  const hasKey = useCallback((key) => {
    const getNestedValue = (obj, path) => {
      return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : null;
      }, obj);
    };

    return getNestedValue(translations, key) !== null;
  }, [translations]);

  return {
    t,
    tPlural,
    formatNumber,
    formatDate,
    formatCurrency,
    language,
    changeLanguage,
    supportedLanguages,
    getLanguageInfo,
    hasKey,
    isLoading
  };
}

/**
 * Language Selector Component
 */
export function LanguageSelector() {
  const { language, changeLanguage, supportedLanguages, isLoading } = useTranslation();

  if (isLoading) {
    return <div className="language-selector-loading">Loading...</div>;
  }

  return (
    <div className="language-selector">
      <select
        value={language}
        onChange={(e) => changeLanguage(e.target.value)}
        className="language-select"
      >
        {Object.entries(supportedLanguages).map(([code, info]) => (
          <option key={code} value={code}>
            {info.flag} {info.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Translated Text Component
 */
export function TranslatedText({ 
  translationKey, 
  params = {}, 
  fallback = null,
  className = '',
  tag = 'span'
}) {
  const { t, hasKey } = useTranslation();
  
  if (!hasKey(translationKey)) {
    return fallback || translationKey;
  }

  const Tag = tag;
  return <Tag className={className}>{t(translationKey, params)}</Tag>;
}

/**
 * Plural Text Component
 */
export function PluralText({ 
  translationKey, 
  count, 
  params = {}, 
  fallback = null,
  className = '',
  tag = 'span'
}) {
  const { tPlural } = useTranslation();
  
  const Tag = tag;
  return <Tag className={className}>{tPlural(translationKey, count, params)}</Tag>;
}

/**
 * Format Number Component
 */
export function FormattedNumber({ 
  value, 
  options = {}, 
  className = '',
  tag = 'span'
}) {
  const { formatNumber } = useTranslation();
  
  const Tag = tag;
  return <Tag className={className}>{formatNumber(value, options)}</Tag>;
}

/**
 * Format Date Component
 */
export function FormattedDate({ 
  date, 
  options = {}, 
  className = '',
  tag = 'span'
}) {
  const { formatDate } = useTranslation();
  
  const Tag = tag;
  return <Tag className={className}>{formatDate(date, options)}</Tag>;
}

/**
 * Format Currency Component
 */
export function FormattedCurrency({ 
  amount, 
  currency = 'USD', 
  options = {}, 
  className = '',
  tag = 'span'
}) {
  const { formatCurrency } = useTranslation();
  
  const Tag = tag;
  return <Tag className={className}>{formatCurrency(amount, currency, options)}</Tag>;
}

// Export context for advanced usage
export { I18nContext };

// Export default hook
export default useTranslation; 