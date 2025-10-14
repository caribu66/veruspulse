'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Menu,
  X,
  Search,
  RefreshCw,
  Database,
  Activity,
  User,
  Users,
  BarChart3,
  Clock,
  Wifi,
  WifiOff,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from './theme-toggle';

type ExplorerTab =
  | 'dashboard'
  | 'search'
  | 'blocks'
  | 'transactions'
  | 'addresses'
  | 'verusids'
  | 'live';

interface EnhancedNavigationBarProps {
  activeTab: ExplorerTab;
  onTabChange: (tab: ExplorerTab) => void;
  onRefresh?: () => void;
}

export function EnhancedNavigationBar({
  activeTab,
  onTabChange,
  onRefresh,
}: EnhancedNavigationBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  // Memoize navigation items to prevent unnecessary re-renders
  const navigationItems = useMemo(
    () => [
      {
        key: 'dashboard',
        label: 'Dashboard',
        icon: BarChart3,
        description: 'View network overview and statistics',
      },
      {
        key: 'search',
        label: 'Search',
        icon: Search,
        description: 'Search for blocks, transactions, and addresses',
      },
      {
        key: 'blocks',
        label: 'Blocks',
        icon: Database,
        description: 'Browse blockchain blocks',
      },
      {
        key: 'transactions',
        label: 'Transactions',
        icon: Activity,
        description: 'View transaction history',
      },
      {
        key: 'addresses',
        label: 'Addresses',
        icon: User,
        description: 'Explore wallet addresses',
      },
      {
        key: 'verusids',
        label: 'VerusIDs',
        icon: Users,
        description: 'Manage Verus identities',
      },
    ],
    []
  );

  // Memoize handlers to prevent unnecessary re-renders
  const handleQuickSearch = useCallback(() => {
    onTabChange('search');
  }, [onTabChange]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing || !onRefresh) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      // Add a small delay to show the loading state
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  }, [onRefresh, isRefreshing]);

  const handleTabChange = useCallback(
    (tab: ExplorerTab) => {
      onTabChange(tab);
      // Close mobile menu when navigating
      setMobileMenuOpen(false);
    },
    [onTabChange]
  );

  // Keyboard navigation support
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, action: () => void) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        action();
      }
    },
    []
  );

  // Close mobile menu on escape key
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
    <header
      className="bg-black/20 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50"
      role="banner"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Main Navigation Bar */}
        <nav
          className="flex items-center"
          role="navigation"
          aria-label="Primary navigation"
        >
          {/* Left: Logo and Brand */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            <div className="w-10 h-10 flex items-center justify-center">
              <Image
                src="/5049.png"
                alt="Verus Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain"
                style={{ width: 'auto', height: 'auto' }}
                priority
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-white">Verus</h1>
              <p className="text-sm text-white/70">The Internet of Value</p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-lg font-bold text-white">Verus Explorer</h1>
            </div>
          </div>

          {/* Navigation and Actions - Moved Left */}
          <div className="flex items-center space-x-1 ml-6">
            {/* Quick Actions */}
            <div className="hidden md:flex items-center space-x-1">
              <button
                onClick={handleQuickSearch}
                onKeyDown={e => handleKeyDown(e, handleQuickSearch)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                title="Quick Search"
                aria-label="Quick search for blockchain data"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                onKeyDown={e => handleKeyDown(e, handleRefresh)}
                className={`p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isRefreshing ? 'animate-pulse' : ''
                }`}
                title="Refresh Data"
                aria-label="Refresh blockchain data"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                {isRefreshing && (
                  <span className="sr-only">Refreshing data...</span>
                )}
              </button>
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              onKeyDown={e =>
                handleKeyDown(e, () => setMobileMenuOpen(!mobileMenuOpen))
              }
              className="lg:hidden p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>

            {/* Desktop Navigation - Only show on very large screens */}
            <nav
              className="hidden 2xl:flex items-center space-x-1"
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
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                      isActive
                        ? 'bg-white/20 text-white shadow-lg'
                        : 'text-white/80 hover:text-white hover:bg-white/10 hover:shadow-md'
                    }`}
                    aria-label={`Navigate to ${nav.label}. ${nav.description}`}
                    aria-current={isActive ? 'page' : undefined}
                    aria-describedby={
                      isActive ? `${nav.key}-description` : undefined
                    }
                    title={nav.description}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span className="text-sm font-medium">{nav.label}</span>
                    {isActive && (
                      <span id={`${nav.key}-description`} className="sr-only">
                        Current page
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Large Desktop Navigation (shorter labels) */}
            <nav className="hidden xl:flex 2xl:hidden items-center space-x-1">
              {navigationItems.map(nav => {
                const Icon = nav.icon;
                const shortLabel =
                  nav.label === 'Addresses'
                    ? 'Addr'
                    : nav.label === 'Transactions'
                      ? 'Txs'
                      : nav.label === 'VerusIDs'
                        ? 'IDs'
                        : nav.label;
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
                    className={`flex items-center space-x-1 px-2 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                      isActive
                        ? 'bg-white/20 text-white shadow-lg'
                        : 'text-white/80 hover:text-white hover:bg-white/10 hover:shadow-md'
                    }`}
                    aria-label={`Navigate to ${nav.label}. ${nav.description}`}
                    aria-current={isActive ? 'page' : undefined}
                    title={nav.description}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span className="text-xs font-medium">{shortLabel}</span>
                  </button>
                );
              })}
            </nav>

            {/* Medium Desktop Navigation (icons only) */}
            <nav className="hidden lg:flex xl:hidden items-center space-x-1">
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
                    className={`p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                      isActive
                        ? 'bg-white/20 text-white shadow-lg'
                        : 'text-white/80 hover:text-white hover:bg-white/10 hover:shadow-md'
                    }`}
                    aria-label={`Navigate to ${nav.label}. ${nav.description}`}
                    aria-current={isActive ? 'page' : undefined}
                    title={nav.description}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </button>
                );
              })}
            </nav>
          </div>
        </nav>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div
            id="mobile-navigation"
            className="lg:hidden mt-3 p-3 bg-white/5 rounded-lg border border-white/10"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
          >
            <nav
              className="grid grid-cols-2 gap-2"
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
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                      isActive
                        ? 'bg-white/20 text-white'
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

            {/* Mobile Quick Actions */}
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    handleQuickSearch();
                    setMobileMenuOpen(false);
                  }}
                  onKeyDown={e =>
                    handleKeyDown(e, () => {
                      handleQuickSearch();
                      setMobileMenuOpen(false);
                    })
                  }
                  className="flex items-center space-x-2 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  aria-label="Quick search for blockchain data"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  <span className="text-sm">Search</span>
                </button>
                <button
                  onClick={() => {
                    handleRefresh();
                    setMobileMenuOpen(false);
                  }}
                  onKeyDown={e =>
                    handleKeyDown(e, () => {
                      handleRefresh();
                      setMobileMenuOpen(false);
                    })
                  }
                  disabled={isRefreshing}
                  className={`flex items-center space-x-2 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isRefreshing ? 'animate-pulse' : ''
                  }`}
                  aria-label="Refresh blockchain data"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  <span className="text-sm">Refresh</span>
                  {isRefreshing && (
                    <span className="sr-only">Refreshing data...</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
