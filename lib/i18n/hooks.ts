/**
 * i18n Custom Hooks
 * Reusable hooks for translations with best practices
 */

'use client';

import { useTranslations as useNextIntlTranslations } from 'next-intl';
import { type TranslationNamespace } from './types';

/**
 * Type-safe translation hook
 * @param namespace - Translation namespace
 * @returns Translation function
 */
export function useTypedTranslations(namespace: TranslationNamespace) {
  return useNextIntlTranslations(namespace);
}

/**
 * Hook for navigation translations
 */
export function useNavTranslations() {
  return useTypedTranslations('nav');
}

/**
 * Hook for dashboard translations
 */
export function useDashboardTranslations() {
  return useTypedTranslations('dashboard');
}

/**
 * Hook for common translations
 */
export function useCommonTranslations() {
  return useTypedTranslations('common');
}

/**
 * Hook for multiple namespaces
 * @param namespaces - Array of namespaces
 * @returns Object with translation functions
 */
export function useMultipleTranslations(
  namespaces: TranslationNamespace[]
): Record<TranslationNamespace, ReturnType<typeof useNextIntlTranslations>> {
  const translations: any = {};

  namespaces.forEach(namespace => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    translations[namespace] = useNextIntlTranslations(namespace);
  });

  return translations;
}

