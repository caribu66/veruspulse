/**
 * i18n Utility Functions
 * Helper functions for internationalization
 */

import { headers } from 'next/headers';
import { type Locale, isSupportedLocale } from './types';
import { defaultLocale } from '@/i18n';

/**
 * Detect locale from Accept-Language header
 * @param acceptLanguage - Accept-Language header value
 * @returns Detected locale or default
 */
export function detectLocaleFromHeader(acceptLanguage: string): Locale {
  if (!acceptLanguage) return defaultLocale;

  // Parse accept-language header
  const languages = acceptLanguage
    .split(',')
    .map(lang => {
      const [code, qValue] = lang.trim().split(';q=');
      return {
        code: (code?.split('-')[0] || code || 'en').toLowerCase(), // Extract language code
        quality: qValue ? parseFloat(qValue) : 1.0,
      };
    })
    .sort((a, b) => b.quality - a.quality);

  // Find first supported language
  for (const { code } of languages) {
    if (!code) continue;
    if (isSupportedLocale(code)) {
      return code;
    }
  }

  return defaultLocale;
}

/**
 * Get locale from request headers (server-side)
 * @returns Detected locale
 */
export async function getLocaleFromHeaders(): Promise<Locale> {
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language') || '';
  return detectLocaleFromHeader(acceptLanguage);
}

/**
 * Format locale for URL
 * @param locale - Locale code
 * @returns Formatted URL segment
 */
export function formatLocaleForUrl(locale: Locale): string {
  return locale === defaultLocale ? '' : `/${locale}`;
}

/**
 * Get alternate language URLs for SEO
 * @param currentPath - Current path without locale
 * @param locales - Array of locales
 * @returns Array of alternate URLs
 */
export function getAlternateUrls(
  currentPath: string,
  locales: readonly Locale[],
  baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
): Array<{ locale: Locale; url: string }> {
  return locales.map(locale => ({
    locale,
    url: `${baseUrl}${formatLocaleForUrl(locale)}${currentPath}`,
  }));
}

/**
 * Get language direction
 * @param locale - Locale code
 * @returns 'rtl' or 'ltr'
 */
export function getLanguageDirection(locale: Locale): 'rtl' | 'ltr' {
  const rtlLanguages: Locale[] = []; // Add RTL languages if needed (e.g., 'ar', 'he')
  return rtlLanguages.includes(locale) ? 'rtl' : 'ltr';
}

/**
 * Validate and sanitize locale
 * @param locale - Locale to validate
 * @returns Valid locale or default
 */
export function validateLocale(locale: string | undefined): Locale {
  if (!locale || !isSupportedLocale(locale)) {
    return defaultLocale;
  }
  return locale;
}
