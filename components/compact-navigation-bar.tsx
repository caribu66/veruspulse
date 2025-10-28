'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  List,
  X,
  MagnifyingGlass,
  ChartBar,
  WifiHigh,
  WifiSlash,
} from '@phosphor-icons/react';
import { MinimalPriceIndicator } from './minimal-price-indicator';
import { ThemeToggleCompact } from './theme-toggle';
import { ICON_SIZES, SPACING_UTILS } from '@/lib/constants/design-tokens';
import { useTheme } from '@/contexts/theme-context';

// Ultra-compact navigation - 3 core sections
type ExplorerTab =
  | 'dashboard' // House with network overview
  | 'explorer' // Unified: blocks, transactions, addresses
  | 'verusids'; // VerusID identity system

interface CompactNavigationBarProps {
  activeTab: ExplorerTab;
  onTabChange: (tab: ExplorerTab) => void;
}

export function CompactNavigationBar({
  activeTab,
  onTabChange,
}: CompactNavigationBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme } = useTheme();

  // Ultra-compact navigation items
  const navigationItems = useMemo(
    () => [
      {
        key: 'dashboard',
        label: 'House',
        icon: ChartBar,
        description: 'Network overview and live statistics',
      },
      {
        key: 'explorer',
        label: 'Explorer',
        icon: MagnifyingGlass,
        description:
          'MagnifyingGlass blocks, transactions, addresses, and VerusIDs',
      },
    ],
    []
  );

  const handleTabChange = useCallback(
    (tab: ExplorerTab) => {
      onTabChange(tab);
      setMobileMenuOpen(false);
    },
    [onTabChange]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, action: () => void) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        action();
      }
    },
    []
  );

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileMenuOpen]);

  return (
    <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
      <div className={`max-w-7xl mx-auto ${SPACING_UTILS.navBar}`}>
        {/* Main Navigation Bar */}
        <nav
          id="navigation"
          className="flex items-center justify-between"
          role="navigation"
          aria-label="Primary navigation"
        >
          {/* Left: Logo - Removed */}

          {/* Center: Compact Navigation */}
          <div className="hidden lg:flex items-center space-x-2 flex-1 justify-center mx-6">
            <nav
              className="flex items-center space-x-1"
              role="navigation"
              aria-label="Main navigation"
            >
              {navigationItems.map(nav => {
                const Icon = nav.icon;
                const isActive = activeTab === nav.key;
                return (
                  <button
                    key={nav.key}
                    onClick={() => handleTabChange(nav.key as ExplorerTab)}
                    onKeyDown={e =>
                      handleKeyDown(e, () =>
                        handleTabChange(nav.key as ExplorerTab)
                      )
                    }
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                      isActive
                        ? 'bg-white/20 text-white shadow-lg border border-white/10'
                        : 'text-white/80 hover:text-white hover:bg-white/10 hover:shadow-md'
                    }`}
                    aria-label={`Navigate to ${nav.label}. ${nav.description}`}
                    aria-current={isActive ? 'page' : undefined}
                    title={nav.description}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span className="text-sm font-medium">{nav.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Price Ticker, Theme Toggle and Mobile List */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Minimal Price Indicator (Desktop) */}
            <div className="hidden lg:flex">
              <MinimalPriceIndicator refreshInterval={10000} maxAssets={6} />
            </div>

            {/* Minimal Price Indicator (Tablet) */}
            <div className="hidden md:flex lg:hidden">
              <MinimalPriceIndicator refreshInterval={10000} maxAssets={5} />
            </div>

            {/* Theme Toggle */}
            <ThemeToggleCompact />

            {/* Mobile List Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              onKeyDown={e =>
                handleKeyDown(e, () => setMobileMenuOpen(!mobileMenuOpen))
              }
              className="lg:hidden p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <List className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </nav>

        {/* Mobile Navigation List */}
        {mobileMenuOpen && (
          <div
            id="mobile-navigation"
            className="lg:hidden mt-2 p-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
          >
            {/* Minimal Price Indicator (Mobile) */}
            <div className="mb-4">
              <MinimalPriceIndicator refreshInterval={10000} maxAssets={4} />
            </div>

            <nav
              className="flex flex-col space-y-2"
              role="navigation"
              aria-label="Mobile navigation"
            >
              {navigationItems.map(nav => {
                const Icon = nav.icon;
                const isActive = activeTab === nav.key;
                return (
                  <button
                    key={nav.key}
                    onClick={() => handleTabChange(nav.key as ExplorerTab)}
                    onKeyDown={e =>
                      handleKeyDown(e, () =>
                        handleTabChange(nav.key as ExplorerTab)
                      )
                    }
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                      isActive
                        ? 'bg-white/20 text-white border border-white/20'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                    aria-label={`Navigate to ${nav.label}. ${nav.description}`}
                    aria-current={isActive ? 'page' : undefined}
                    title={nav.description}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span className="text-sm font-medium">{nav.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
