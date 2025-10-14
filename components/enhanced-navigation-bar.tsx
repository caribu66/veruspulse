'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Menu,
  X,
  Search,
  Database,
  Activity,
  User,
  Users,
  BarChart3,
  Clock,
  Wifi,
  WifiOff,
  Network,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

type ExplorerTab =
  | 'dashboard'
  | 'search'
  | 'blocks'
  | 'transactions'
  | 'addresses'
  | 'verusids'
  | 'mempool'
  | 'live';

interface EnhancedNavigationBarProps {
  activeTab: ExplorerTab;
  onTabChange: (tab: ExplorerTab) => void;
}

export function EnhancedNavigationBar({
  activeTab,
  onTabChange,
}: EnhancedNavigationBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      {
        key: 'mempool',
        label: 'Mempool',
        icon: Network,
        description: 'View pending transactions',
      },
    ],
    []
  );

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
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Main Navigation Bar */}
        <nav
          className="flex items-center justify-between"
          role="navigation"
          aria-label="Primary navigation"
        >
          {/* Left: Logo and Brand */}
          <div className="flex items-center space-x-6 flex-shrink-0">
            <div className="w-14 h-14 flex items-center justify-center bg-white/5 rounded-xl p-3">
              <Image
                src="/5049.png"
                alt="Verus Logo"
                width={32}
                height={32}
                className="w-full h-full object-contain"
                style={{ width: 'auto', height: 'auto' }}
                priority
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-2xl font-bold text-white leading-tight mb-1">
                Verus
              </h1>
              <p className="text-sm text-white/70 leading-tight">
                The Internet of Value
              </p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-lg font-bold text-white leading-tight">
                Verus Explorer
              </h1>
            </div>
          </div>

          {/* Center: Main Navigation */}
          <div className="hidden lg:flex items-center space-x-4 flex-1 justify-center mx-8">
            <nav
              className="flex items-center space-x-3"
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
                    className={`flex items-center space-x-3 px-5 py-3 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                      isActive
                        ? 'bg-white/20 text-white shadow-lg border border-white/10'
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
          </div>

          {/* Right: Actions and Controls */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              onKeyDown={e =>
                handleKeyDown(e, () => setMobileMenuOpen(!mobileMenuOpen))
              }
              className="lg:hidden p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
          </div>
        </nav>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div
            id="mobile-navigation"
            className="lg:hidden mt-6 p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
          >
            <nav
              className="grid grid-cols-2 gap-4"
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
                    className={`flex items-center space-x-3 px-5 py-4 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                      isActive
                        ? 'bg-white/20 text-white border border-white/20'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                    aria-label={`Navigate to ${nav.label}. ${nav.description}`}
                    aria-current={isActive ? 'page' : undefined}
                    title={nav.description}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    <span className="text-sm font-medium">{nav.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
