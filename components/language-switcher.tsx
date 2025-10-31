'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Globe, Check } from '@phosphor-icons/react';
import { type Locale, SUPPORTED_LANGUAGES, getAllLanguages } from '@/lib/i18n/types';
import { useTranslations } from 'next-intl';

interface LanguageSwitcherProps {
  currentLocale: string;
}

export function LanguageSwitcher({
  currentLocale,
}: LanguageSwitcherProps) {
  const tCommon = useTranslations('common');
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const languages = getAllLanguages();

  const handleLanguageChange = useCallback((newLocale: Locale) => {
    if (newLocale === currentLocale) {
      setIsOpen(false);
      return;
    }

    startTransition(() => {
      // Remove the current locale from the pathname if present
      // Match both /es/ and /es patterns
      const pathnameWithoutLocale = pathname.replace(/^\/([a-z]{2})(\/|$)/, '/');

      // Add the new locale to the pathname (unless it's the default locale 'en')
      const newPathname = newLocale === 'en'
        ? pathnameWithoutLocale === '/' ? '/' : pathnameWithoutLocale
        : `/${newLocale}${pathnameWithoutLocale === '/' ? '' : pathnameWithoutLocale}`;

      // Force a hard navigation to ensure the locale changes
      window.location.href = newPathname;
    });
  }, [currentLocale, pathname, router]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-gray-900 dark:text-white"
        aria-label="Change language"
        disabled={isPending}
      >
        <Globe className="h-5 w-5" />
        <span className="text-sm font-medium">
          {SUPPORTED_LANGUAGES[currentLocale as Locale]?.native || 'English'}
        </span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-xl z-50 overflow-hidden">
            <div className="p-2">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2">
                SELECT LANGUAGE
              </div>
              {languages.map(({ code, native, english }) => {
                const isActive = code === currentLocale;
                return (
                  <button
                    key={code}
                    onClick={() => handleLanguageChange(code)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-verus-blue text-white'
                        : 'text-gray-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                    disabled={isPending}
                    aria-label={`Switch to ${english}`}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <span className="flex flex-col items-start">
                      <span className="font-medium">{native}</span>
                      <span className="text-xs opacity-75">{english}</span>
                    </span>
                    {isActive && (
                      <Check className="h-5 w-5" weight="bold" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

