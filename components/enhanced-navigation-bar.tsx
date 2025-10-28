'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  ChartBar,
  MagnifyingGlass,
  UsersThree,
  List,
  X,
} from '@phosphor-icons/react';
import { MinimalPriceIndicator } from './minimal-price-indicator';
import { ThemeToggleCompact } from './theme-toggle';
import { ICON_SIZES, SPACING_UTILS } from '@/lib/constants/design-tokens';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const handleTabChange = (tab: ExplorerTab) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="bg-transparent dark:bg-slate-950 border-b border-slate-300 dark:border-slate-700 sticky top-0 z-50 backdrop-blur-sm">
      {/* Top Row: Logo + Price Ticker */}
      <div className="max-w-7xl mx-auto px-6 py-2 lg:px-8 lg:py-2.5">
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
              {/* Verus Logo - Simple icon only */}
              <div className="flex items-center gap-2">
                <div className="relative h-7 sm:h-8 md:h-9 w-auto">
                  <Image
                    src="/verus-icon-blue.svg"
                    alt="Verus"
                    width={32}
                    height={32}
                    className="object-contain h-7 sm:h-8 md:h-9"
                    priority
                  />
                </div>
                <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  VerusPulse
                </span>
              </div>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center space-x-3 md:space-x-4 lg:space-x-6 flex-shrink-0">
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

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex items-center justify-center min-h-[44px] min-w-[44px] p-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 hover:border-verus-blue/60 text-gray-700 dark:text-slate-300 transition-colors"
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

      {/* Desktop Navigation Tabs Row */}
      <div className="hidden md:block max-w-7xl mx-auto px-6 py-1.5 lg:px-8 lg:py-2">
        <nav
          className="flex gap-4 lg:gap-6 overflow-x-auto scrollbar-hide"
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
                  flex items-center gap-2 px-3 py-1.5 min-h-[36px] rounded-md
                  transition-all duration-300 whitespace-nowrap font-medium text-sm
                  ${
                    isActive
                      ? 'bg-verus-blue text-white font-semibold shadow-md border border-verus-blue'
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

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 animate-in slide-in-from-top-2 duration-200">
          <nav
            className="max-w-7xl mx-auto px-4 py-3 space-y-2"
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
                    w-full flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-lg
                    transition-all duration-200 text-left
                    ${
                      isActive
                        ? 'bg-verus-blue text-white font-semibold shadow-md'
                        : 'bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-600'
                    }
                  `}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={ICON_SIZES.md} />
                  <span className="text-base">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
