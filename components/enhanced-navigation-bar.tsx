'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { ChartBar, MagnifyingGlass, UsersThree } from '@phosphor-icons/react';
import { VerusPriceTicker } from './verus-price-ticker';
import { ICON_SIZES } from '@/lib/constants/design-tokens';

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
  // Navigation items with icons
  const navigationItems = useMemo(
    () => [
      { key: 'dashboard' as ExplorerTab, label: 'Dashboard', icon: ChartBar },
      {
        key: 'explorer' as ExplorerTab,
        label: 'Explorer',
        icon: MagnifyingGlass,
      },
      { key: 'verusids' as ExplorerTab, label: 'VerusIDs', icon: UsersThree },
    ],
    []
  );

  return (
    <div className="bg-slate-950 border-b border-slate-700 sticky top-0 z-50">
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
              <div className="flex items-center space-x-3">
                {/* Logo Image */}
                <div className="relative h-12 w-12">
                  <Image
                    src="/verus-icon-blue.png"
                    alt="Verus"
                    width={48}
                    height={48}
                    className="object-contain"
                    priority
                  />
                </div>

                {/* Logo Text */}
                <span className="text-white font-bold text-3xl">Verus</span>
              </div>
            </div>
          </div>

          {/* Center: Price Ticker */}
          <div className="hidden lg:flex flex-1 justify-center px-12">
            <VerusPriceTicker
              refreshInterval={6000}
              speed={20}
              showControls={false}
              showVolume={true}
              showMarketCap={true}
              className="w-full max-w-3xl"
            />
          </div>

          {/* Right: Tablet Ticker */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            {/* Verus Price Ticker (Tablet) */}
            <div className="hidden md:flex lg:hidden">
              <VerusPriceTicker
                refreshInterval={6000}
                speed={15}
                showControls={false}
                showVolume={false}
                showMarketCap={false}
                className="w-full max-w-sm"
              />
            </div>
          </div>
        </nav>
      </div>

      {/* Navigation Tabs Row */}
      <div className="border-t border-slate-700 bg-slate-900">
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
                        ? 'bg-verus-blue text-white font-semibold shadow-lg border border-verus-blue-light'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-verus-blue/60'
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
    </div>
  );
}
