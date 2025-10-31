'use client';

import { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import {
  ChartBar,
  MagnifyingGlass,
  UsersThree,
  List,
  X,
} from '@phosphor-icons/react';
import { MinimalPriceIndicator } from './minimal-price-indicator';
import { ICON_SIZES, SPACING_UTILS } from '@/lib/constants/design-tokens';
import { useTheme } from '@/contexts/theme-context';
import { LanguageSwitcher } from './language-switcher';
import { useNavTranslations } from '@/lib/i18n/hooks';

// Ultra-simplified navigation - consolidated to 3 core sections
type ExplorerTab =
  | 'dashboard' // Home with network overview
  | 'explorer' // Unified: blocks, transactions, addresses
  | 'verusids'; // VerusID identity system

interface EnhancedNavigationBarProps {
  activeTab: ExplorerTab;
  onTabChange: (tab: ExplorerTab) => void;
}

export function EnhancedNavigationBar({
  activeTab,
  onTabChange,
}: EnhancedNavigationBarProps) {
  const tCommon = useTranslations('common');
  const tDashboard = useTranslations('dashboard');
  const tBlocks = useTranslations('blocks');
  const tVerusId = useTranslations('verusid');
  const { theme } = useTheme();
  const locale = useLocale();
  const t = useNavTranslations(); // Using typed hook
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Navigation items with icons and keyboard shortcuts
  const navigationItems = useMemo(
    () => [
      {
        key: 'dashboard' as ExplorerTab,
        label: t('dashboard'),
        icon: ChartBar,
        shortcut: '⌥1',
      },
      {
        key: 'explorer' as ExplorerTab,
        label: t('explorer'),
        icon: MagnifyingGlass,
        shortcut: '⌥2',
      },
      {
        key: 'verusids' as ExplorerTab,
        label: t('verusids'),
        icon: UsersThree,
        shortcut: '⌥3',
      },
    ],
    [t]
  );

  const handleTabChange = (tab: ExplorerTab) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  // Keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only trigger if not typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Alt/Option + Number for quick navigation
      if (e.altKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            onTabChange('dashboard');
            break;
          case '2':
            e.preventDefault();
            onTabChange('explorer');
            break;
          case '3':
            e.preventDefault();
            onTabChange('verusids');
            break;
        }
      }

      // Escape to close mobile menu
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onTabChange, mobileMenuOpen]);

  return (
    <div className="bg-white/95 dark:bg-slate-950/95 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 backdrop-blur-md shadow-sm">
      {/* Single Row Professional Navigation */}
      <div className={`max-w-7xl mx-auto ${SPACING_UTILS.navBar}`}>
        <nav
          id="navigation"
          className="flex items-center justify-between gap-4"
          role="navigation"
          aria-label="Primary navigation"
        >
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <Image
                src="/verus-icon-blue.svg"
                alt="Verus"
                width={36}
                height={36}
                className="w-9 h-9"
                priority
              />
              <div className="flex flex-col">
                <span className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                  VerusPulse
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-none">
                  {t('blockchainExplorer')}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Navigation Tabs (Desktop/Tablet) */}
          <div className="hidden md:flex items-center justify-center flex-1 gap-1">
            {navigationItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;

              return (
                <button
                  key={item.key}
                  onClick={() => onTabChange(item.key)}
                  className={`
                    group relative flex items-center gap-2 px-4 py-2 rounded-lg
                    transition-all duration-200 whitespace-nowrap font-medium text-sm
                    ${
                      isActive
                        ? 'text-verus-blue dark:text-verus-blue bg-slate-50 dark:bg-slate-800/50'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                    }
                  `}
                  aria-current={isActive ? 'page' : undefined}
                  title={item.label}
                >
                  <Icon
                    className={`${ICON_SIZES.sm} ${isActive ? 'text-verus-blue' : 'group-hover:text-verus-blue dark:group-hover:text-verus-blue'}`}
                  />
                  <span
                    className={
                      isActive
                        ? 'text-verus-blue'
                        : 'group-hover:text-verus-blue dark:group-hover:text-verus-blue'
                    }
                  >
                    {item.label}
                  </span>
                  {/* Active indicator line */}
                  {isActive && (
                    <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-verus-blue rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Utilities */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Price Indicator (Large Desktop) */}
            <div className="hidden xl:flex">
              <MinimalPriceIndicator refreshInterval={10000} maxAssets={3} />
            </div>

            {/* Price Indicator (Desktop) */}
            <div className="hidden lg:flex xl:hidden">
              <MinimalPriceIndicator refreshInterval={10000} maxAssets={2} />
            </div>

            {/* Language Switcher (Desktop) */}
            <div className="hidden md:flex">
              <LanguageSwitcher currentLocale={locale} />
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex items-center justify-center min-h-[40px] min-w-[40px] p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 transition-colors"
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className={ICON_SIZES.md} />
              ) : (
                <List className={ICON_SIZES.md} />
              )}
            </button>
          </div>
        </nav>
      </div>

      {/* Enhanced Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-3">
            {/* Mobile Price Indicator */}
            <div className="mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
              <MinimalPriceIndicator refreshInterval={10000} maxAssets={2} />
            </div>

            {/* Mobile Language Switcher */}
            <div className="mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
              <LanguageSwitcher currentLocale={locale} />
            </div>

            {/* Mobile Navigation */}
            <nav
              className="space-y-1"
              role="navigation"
              aria-label="Mobile navigation"
            >
              {navigationItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;

                return (
                  <button
                    key={item.key}
                    onClick={() => handleTabChange(item.key)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg
                      transition-all duration-200 text-left font-medium
                      ${
                        isActive
                          ? 'bg-slate-100 dark:bg-slate-800 text-verus-blue dark:text-verus-blue border-l-2 border-verus-blue'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                      }
                    `}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon
                      className={`${ICON_SIZES.md} ${isActive ? 'text-verus-blue' : ''}`}
                    />
                    <span className="text-base">{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-verus-blue" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
