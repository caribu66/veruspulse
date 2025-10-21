'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { ChartBar, MagnifyingGlass, UsersThree } from '@phosphor-icons/react';
import { MinimalPriceIndicator } from './minimal-price-indicator';
import { ThemeToggleCompact } from './theme-toggle';
import { ICON_SIZES } from '@/lib/constants/design-tokens';
import { useTheme } from '@/contexts/theme-context';

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
  const { theme } = useTheme();

  // Navigation items with icons
  const navigationItems = useMemo(
    () => [
      { key: 'dashboard' as ExplorerTab, label: 'Dashboard', icon: ChartBar },
      {
        key: 'explorer' as ExplorerTab,
        label: 'Search',
        icon: MagnifyingGlass,
      },
      { key: 'verusids' as ExplorerTab, label: 'VerusIDs', icon: UsersThree },
    ],
    []
  );

  return (
    <div className="bg-transparent dark:bg-slate-950 border-b border-slate-300 dark:border-slate-700 sticky top-0 z-50">
      {/* Top Row: Logo + Price Ticker */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Main Navigation Bar */}
        <nav
          id="navigation"
          className="flex items-center justify-between"
          role="navigation"
          aria-label="Primary navigation"
        >
          {/* Left: Logo */}
          <div className="flex items-center flex-shrink-0">
            <div className="flex items-center justify-center relative">
              {/* Verus Logo */}
              <div className="flex items-center">
                <div className="relative h-16 w-auto">
                  <Image
                    src={
                      theme === 'dark'
                        ? '/verus-icon-slogan-white.svg'
                        : '/verus-icon-slogan-blue.svg'
                    }
                    alt="Verus - Truth and Privacy for All"
                    width={300}
                    height={72}
                    className="object-contain h-16"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Minimal Price Indicator and Theme Toggle */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            {/* Minimal Price Indicator (Desktop) */}
            <div className="hidden lg:flex">
              <MinimalPriceIndicator refreshInterval={10000} maxAssets={3} />
            </div>

            {/* Minimal Price Indicator (Tablet) */}
            <div className="hidden md:flex lg:hidden">
              <MinimalPriceIndicator refreshInterval={10000} maxAssets={2} />
            </div>

            {/* Theme Toggle */}
            <ThemeToggleCompact />
          </div>
        </nav>
      </div>

      {/* Navigation Tabs Row - Integrated with main nav */}
      <div className="max-w-7xl mx-auto px-6 py-3">
        <nav
          className="flex gap-3 overflow-x-auto scrollbar-hide"
          role="navigation"
          aria-label="Main sections"
        >
          {navigationItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;

            return (
              <button
                key={item.key}
                onClick={() => onTabChange(item.key)}
                className={`
                  flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-full
                  transition-all duration-200 whitespace-nowrap
                  ${
                    isActive
                      ? 'bg-verus-blue text-white font-semibold shadow-lg border border-verus-blue'
                      : 'bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-slate-600 hover:border-verus-blue/60'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={ICON_SIZES.sm} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
