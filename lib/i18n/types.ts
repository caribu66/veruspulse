/**
 * Internationalization Types
 * Type-safe translations and locale management
 */

import { locales } from '@/i18n';

// Locale type from available locales
export type Locale = (typeof locales)[number];

// Translation namespace types
export type TranslationNamespace =
  | 'nav'
  | 'dashboard'
  | 'blocks'
  | 'transactions'
  | 'verusid'
  | 'staking'
  | 'network'
  | 'common'
  | 'search'
  | 'time';

// Language metadata
export interface LanguageMetadata {
  code: Locale;
  native: string;
  english: string;
  flag?: string;
  rtl?: boolean;
}

// Supported languages with metadata
export const SUPPORTED_LANGUAGES: Record<Locale, LanguageMetadata> = {
  en: { code: 'en', native: 'English', english: 'English' },
  es: { code: 'es', native: 'Español', english: 'Spanish' },
  fr: { code: 'fr', native: 'Français', english: 'French' },
  de: { code: 'de', native: 'Deutsch', english: 'German' },
  zh: { code: 'zh', native: '中文', english: 'Chinese' },
  ja: { code: 'ja', native: '日本語', english: 'Japanese' },
  pt: { code: 'pt', native: 'Português', english: 'Portuguese' },
  ru: { code: 'ru', native: 'Русский', english: 'Russian' },
};

// Check if locale is supported
export function isSupportedLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

// Get language metadata
export function getLanguageMetadata(locale: Locale): LanguageMetadata {
  return SUPPORTED_LANGUAGES[locale];
}

// Get all available languages
export function getAllLanguages(): LanguageMetadata[] {
  return Object.values(SUPPORTED_LANGUAGES);
}

