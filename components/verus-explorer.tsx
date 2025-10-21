'use client';

import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  Suspense,
  lazy,
} from 'react';
import {
  Database,
  Pulse,
  User,
  MagnifyingGlass,
  ChartBar,
  Hash,
  UsersThree,
  Clock,
  CaretRight,
  WarningCircle,
  CheckCircle,
  Network,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useNetworkStore, useNetworkActions } from '@/lib/store/network-store';
import { useSmartInterval } from '@/lib/hooks/use-interval';
import { usePerformanceMonitor } from '@/lib/hooks/use-performance-monitor';
import { useScreenReaderAnnouncement } from '@/lib/hooks/use-screen-reader-announcement';
import { useApiFetch } from '@/lib/hooks/use-retryable-fetch';
import { useRouter } from 'next/navigation';
import { EnhancedNavigationBar } from './enhanced-navigation-bar';
import { useNavigationHistory } from '@/lib/hooks/use-navigation-history';
import { BlockchainSyncProgress } from './blockchain-sync-progress';

// Lazy-loaded components for better performance (code splitting)
const NetworkDashboard = lazy(() =>
  import('./network-dashboard').then(mod => ({ default: mod.NetworkDashboard }))
);
const BlocksExplorer = lazy(() =>
  import('./blocks-explorer').then(mod => ({ default: mod.BlocksExplorer }))
);
const TransactionsExplorer = lazy(() =>
  import('./transactions-explorer').then(mod => ({
    default: mod.TransactionsExplorer,
  }))
);
const AddressExplorer = lazy(() =>
  import('./address-explorer').then(mod => ({ default: mod.AddressExplorer }))
);
const VerusIDExplorer = lazy(() =>
  import('./verusid-explorer').then(mod => ({ default: mod.VerusIDExplorer }))
);
const UniversalSearch = lazy(() =>
  import('./universal-search').then(mod => ({ default: mod.UniversalSearch }))
);
const PerformanceMonitor = lazy(() =>
  import('./performance-monitor').then(mod => ({
    default: mod.PerformanceMonitor,
  }))
);

// Loading skeleton for lazy-loaded components
function ComponentSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 dark:bg-white/10 rounded w-1/4"></div>
      <div className="h-64 bg-gray-100 dark:bg-white/5 rounded-xl"></div>
    </div>
  );
}

// Simplified navigation - consolidated from 7 tabs to 3 core sections
type ExplorerTab =
  | 'dashboard' // House with network overview
  | 'explorer' // Unified: blocks, transactions, addresses
  | 'verusids'; // VerusID identity system

// Legacy support for old tab names
type LegacyTab =
  | 'search'
  | 'blocks'
  | 'transactions'
  | 'addresses'
  | 'mempool'
  | 'live';

function normalizeLegacyTab(tab: string): ExplorerTab {
  const legacyMapping: Record<LegacyTab, ExplorerTab> = {
    search: 'explorer',
    blocks: 'explorer',
    transactions: 'explorer',
    addresses: 'explorer',
    mempool: 'explorer',
    live: 'explorer',
  };

  if (tab in legacyMapping) {
    return legacyMapping[tab as LegacyTab];
  }

  return tab as ExplorerTab;
}

export function VerusExplorer() {
  const [activeTab, setActiveTab] = useState<ExplorerTab>('dashboard');
  const router = useRouter();
  const { addToHistory, initializeHistory } = useNavigationHistory();

  // Performance monitoring
  const { startRender, endRender, measureAsync } =
    usePerformanceMonitor('VerusExplorer');

  // Screen reader announcements
  const { announceSuccess, announceError } = useScreenReaderAnnouncement();

  // Network state from store
  const {
    networkStats,
    miningStats,
    mempoolStats,
    stakingStats,
    pbaasChains,
    loading,
    error,
    lastUpdate,
  } = useNetworkStore();

  // Store is working correctly - debug logs removed for production

  const {
    setNetworkStats,
    setMiningStats,
    setMempoolStats,
    setStakingStats,
    setPbaasChains,
    setLoading,
    setError,
    setLastUpdate,
    clearError,
    clearOldData,
    reset,
  } = useNetworkActions();

  // API fetch hook
  const { apiFetch } = useApiFetch();

  // Handle tab navigation with browser history
  const handleTabChange = useCallback(
    (tab: ExplorerTab) => {
      setActiveTab(tab);
      // Update URL without triggering a page reload
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      const newUrl = url.toString();

      // Add to navigation history for proper back navigation
      addToHistory(newUrl);

      window.history.pushState({ tab }, '', newUrl);
    },
    [addToHistory]
  );

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const tab = event.state?.tab || 'dashboard';
      setActiveTab(normalizeLegacyTab(tab));
    };

    // Initialize from URL params - with legacy tab support
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab');
    if (tabFromUrl) {
      const validTabs = ['dashboard', 'explorer', 'verusids'];
      if (validTabs.includes(tabFromUrl)) {
        setActiveTab(tabFromUrl as ExplorerTab);
      } else {
        // Handle legacy tab names
        setActiveTab(normalizeLegacyTab(tabFromUrl));
      }
    }

    // Initialize navigation history with current URL
    const currentUrl = window.location.pathname + window.location.search;
    initializeHistory(currentUrl);

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [initializeHistory]);

  // const navigation = [
  //   { key: 'dashboard', label: 'Dashboard', icon: ChartBar },
  //   { key: 'search', label: 'MagnifyingGlass', icon: MagnifyingGlass },
  //   { key: 'blocks', label: 'Blocks', icon: Database },
  //   { key: 'transactions', label: 'Transactions', icon: Pulse },
  //   { key: 'addresses', label: 'Addresses', icon: User },
  //   { key: 'verusids', label: 'VerusIDs', icon: UsersThree },
  //   { key: 'live', label: 'Live Data', icon: Clock },
  // ];

  // Local state for direct data management
  const [localNetworkStats, setLocalNetworkStats] = useState(null);
  const [localMiningStats, setLocalMiningStats] = useState(null);
  const [localMempoolStats, setLocalMempoolStats] = useState(null);
  const [localStakingStats, setLocalStakingStats] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);

  // Request deduplication - prevent multiple simultaneous requests
  const [isFetching, setIsFetching] = useState(false);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);

  const fetchRealStats = useCallback(
    async (isInitialLoad = false) => {
      // Prevent multiple simultaneous requests
      if (isFetching) {
        return;
      }

      try {
        setIsFetching(true);

        // Only show loading screen on initial load or when explicitly requested
        if (isInitialLoad) {
          setLocalLoading(true);
          setLoading(true);
        } else {
          // For background refreshes, show subtle indicator
          setIsBackgroundRefreshing(true);
        }

        clearError();

        // Use the consolidated API for better performance and reliability (use apiFetch which has retries)
        let consolidatedResult: any = null;
        try {
          consolidatedResult = await apiFetch(
            `/api/consolidated-data?t=${Date.now()}`
          );
        } catch (err: any) {
          // Fall back to individual endpoints below
          consolidatedResult = null;
        }

        if (consolidatedResult && consolidatedResult.success) {
          const { blockchain, mining, mempool, network, staking } =
            consolidatedResult.data;

          // Set all the data from the consolidated response
          if (blockchain) {
            // Combine blockchain and network data for networkStats
            const combinedNetworkData = {
              ...blockchain,
              connections: network?.connections || 0,
              networkActive: network?.connections > 0,
              verificationProgress: blockchain.verificationprogress,
              chainwork: blockchain.chainwork,
              sizeOnDisk: blockchain.size_on_disk,
              circulatingSupply: blockchain.circulatingSupply || 0,
              valuePools: blockchain.valuePools || [],
            };
            setLocalNetworkStats(combinedNetworkData);
            setNetworkStats(combinedNetworkData);
          }

          if (mining) {
            setLocalMiningStats(mining);
            setMiningStats(mining);
          }

          if (mempool) {
            setLocalMempoolStats(mempool);
            setMempoolStats(mempool);
          }

          // Use dedicated staking data if available, otherwise fall back to mining data
          if (staking) {
            setLocalStakingStats(staking);
            setStakingStats(staking);
          } else if (mining) {
            setLocalStakingStats(mining);
            setStakingStats(mining);
          }

          setLastUpdate(new Date());
          announceSuccess('Network data loaded successfully');

          // Clear loading state immediately after data is set
          setLocalLoading(false);
          setLoading(false);
          return;
        }

        // Fallback to individual APIs if consolidated fails (or returned no/invalid data)
        const endpoints: Record<string, string> = {
          blockchain: `/api/blockchain-info?t=${Date.now()}`,
          mempool: `/api/mempool/size?t=${Date.now()}`,
          mining: `/api/mining-info?t=${Date.now()}`,
          staking: `/api/real-staking-data?t=${Date.now()}`,
          pbaas: `/api/verus-pbaas?t=${Date.now()}`,
        };

        const promises = Object.entries(endpoints).map(([key, ep]) =>
          apiFetch(ep)
            .then(data => ({ status: 'fulfilled' as const, key, value: data }))
            .catch((reason: any) => ({
              status: 'rejected' as const,
              key,
              reason,
            }))
        );

        const results = await Promise.all(promises);

        // Helper to find result by key
        const find = (k: string) => results.find(r => r.key === k) as any;

        // Blockchain
        const bcRes = find('blockchain');
        if (bcRes?.status === 'fulfilled') {
          const bcData = bcRes.value;
          if (bcData && bcData.success) {
            setLocalNetworkStats(bcData.data);
            setNetworkStats(bcData.data);
          }
        }

        // Mempool
        const mpRes = find('mempool');
        if (mpRes?.status === 'fulfilled') {
          const mpData = mpRes.value;
          if (mpData && mpData.success) {
            setLocalMempoolStats(mpData.data);
            setMempoolStats(mpData.data);
          }
        }

        // Mining
        const miningRes = find('mining');
        if (miningRes?.status === 'fulfilled') {
          const miningData = miningRes.value;
          if (miningData && miningData.success) {
            setLocalMiningStats(miningData.data);
            setMiningStats(miningData.data);
          }
        }

        // Staking
        const stakingRes = find('staking');
        if (stakingRes?.status === 'fulfilled') {
          const stakingData = stakingRes.value;
          if (stakingData && stakingData.success) {
            setLocalStakingStats(stakingData.data.staking);
            setStakingStats(stakingData.data.staking);
          }
        }

        // PBaaS Chains
        const pbaasRes = find('pbaas');
        if (pbaasRes?.status === 'fulfilled') {
          const pbaasData = pbaasRes.value;
          if (pbaasData && pbaasData.success) {
            setPbaasChains(pbaasData.data.pbaasChains || []);
          }
        }

        setLastUpdate(new Date());
        announceSuccess('Network data updated successfully');
      } catch (error) {
        const errorMessage = 'Failed to load network data. Please try again.';
        setError(errorMessage);
        announceError(errorMessage);
      } finally {
        setIsFetching(false);
        // Only clear loading states if this was an initial load
        if (isInitialLoad) {
          setLocalLoading(false);
          setLoading(false);
        } else {
          // Clear background refresh indicator
          setIsBackgroundRefreshing(false);
        }
      }
    },
    [
      isFetching,
      setLoading,
      clearError,
      setNetworkStats,
      setMempoolStats,
      setMiningStats,
      setStakingStats,
      setPbaasChains,
      setLastUpdate,
      setError,
      apiFetch,
      announceSuccess,
      announceError,
    ]
  );
  // Smart interval for auto-refresh - disabled immediate to prevent request spam
  useSmartInterval(() => fetchRealStats(false), 60000, {
    immediate: false, // Changed from true to false to prevent immediate execution
    pauseOnError: true,
    maxRetries: 3,
    onError: () => {
      announceError('Auto-refresh failed. Click refresh to try again.');
    },
  });

  // Manual initial fetch to avoid immediate interval execution
  useEffect(() => {
    // Force immediate data fetch with initial load flag
    fetchRealStats(true).catch(() => {
      // Set some default data to prevent infinite loading
      setLocalLoading(false);
      setLoading(false);
    });

    // Fallback timeout to ensure loading state is cleared
    const timeout = setTimeout(() => {
      setLocalLoading(false);
      setLoading(false);
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clear any pending timeouts/intervals
      setLocalNetworkStats(null);
      setLocalMiningStats(null);
      setLocalMempoolStats(null);
      setLocalStakingStats(null);
    };
  }, []);

  // Periodic memory cleanup
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      clearOldData();
    }, 300000); // Clean up every 5 minutes

    return () => clearInterval(cleanupInterval);
  }, [clearOldData]);

  // Memoized navigation items
  const navigationItems = useMemo(
    () => [
      { key: 'dashboard', label: 'Dashboard', icon: ChartBar },
      { key: 'search', label: 'MagnifyingGlass', icon: MagnifyingGlass },
      { key: 'blocks', label: 'Blocks', icon: Database },
      { key: 'transactions', label: 'Transactions', icon: Pulse },
      { key: 'addresses', label: 'Addresses', icon: User },
      { key: 'verusids', label: 'VerusIDs', icon: UsersThree },
      { key: 'mempool', label: 'Mempool', icon: Network },
      { key: 'live', label: 'Live Data', icon: Clock },
    ],
    []
  );

  const renderTabContent = useCallback(() => {
    startRender();

    const content = (() => {
      switch (activeTab) {
        case 'dashboard':
          return (
            <div className="space-y-8">
              <Suspense fallback={<ComponentSkeleton />}>
                <NetworkDashboard
                  networkStats={localNetworkStats || networkStats}
                  miningStats={localMiningStats || miningStats}
                  mempoolStats={localMempoolStats || mempoolStats}
                  stakingStats={localStakingStats || stakingStats}
                  pbaasChains={pbaasChains}
                  loading={localLoading || loading}
                  lastUpdate={lastUpdate}
                  fetchAllData={() => fetchRealStats(true)}
                  isRefreshing={isBackgroundRefreshing}
                  onMainTabChange={handleTabChange}
                />
              </Suspense>
            </div>
          );

        case 'explorer':
          // Unified Explorer: MagnifyingGlass, Blocks, Transactions, Addresses in one view
          return (
            <div className="space-y-6">
              {/* Universal MagnifyingGlass - Prominently featured */}
              <div className="bg-gray-50 dark:bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-slate-300 dark:border-white/10">
                <Suspense fallback={<ComponentSkeleton />}>
                  <UniversalSearch />
                </Suspense>
              </div>

              {/* Quick Links to Different Views */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => {
                    /* Show blocks */
                  }}
                  className="p-6 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 backdrop-blur-sm rounded-xl border border-slate-300 dark:border-white/10 transition-all text-left group"
                >
                  <Database className="h-8 w-8 mb-3 text-blue-400 group-hover:scale-110 transition-transform" />
                  <h3 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">
                    Blocks
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Browse blockchain blocks
                  </p>
                </button>

                <button
                  onClick={() => {
                    /* Show transactions */
                  }}
                  className="p-6 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 backdrop-blur-sm rounded-xl border border-slate-300 dark:border-white/10 transition-all text-left group"
                >
                  <Pulse className="h-8 w-8 mb-3 text-verus-blue group-hover:scale-110 transition-transform" />
                  <h3 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">
                    Transactions
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    View transaction history
                  </p>
                </button>

                <button
                  onClick={() => {
                    /* Show addresses */
                  }}
                  className="p-6 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 backdrop-blur-sm rounded-xl border border-slate-300 dark:border-white/10 transition-all text-left group"
                >
                  <User className="h-8 w-8 mb-3 text-green-400 group-hover:scale-110 transition-transform" />
                  <h3 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">
                    Addresses
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Explore wallet addresses
                  </p>
                </button>
              </div>

              {/* Default View: Recent Blocks */}
              <Suspense fallback={<ComponentSkeleton />}>
                <BlocksExplorer />
              </Suspense>
            </div>
          );

        case 'verusids':
          return (
            <Suspense fallback={<ComponentSkeleton />}>
              <VerusIDExplorer />
            </Suspense>
          );

        default:
          return (
            <Suspense fallback={<ComponentSkeleton />}>
              <NetworkDashboard
                networkStats={localNetworkStats || networkStats}
                miningStats={localMiningStats || miningStats}
                mempoolStats={localMempoolStats || mempoolStats}
                stakingStats={localStakingStats || stakingStats}
                pbaasChains={pbaasChains}
                loading={localLoading || loading}
                lastUpdate={lastUpdate}
                fetchAllData={() => fetchRealStats(true)}
                isRefreshing={isBackgroundRefreshing}
                onMainTabChange={handleTabChange}
              />
            </Suspense>
          );
      }
    })();

    endRender();
    return content;
  }, [
    activeTab,
    localNetworkStats,
    localMiningStats,
    localMempoolStats,
    localStakingStats,
    localLoading,
    networkStats,
    miningStats,
    mempoolStats,
    stakingStats,
    pbaasChains,
    loading,
    lastUpdate,
    fetchRealStats,
    startRender,
    endRender,
  ]);

  return (
    <div className="min-h-screen bg-transparent dark:bg-slate-950">
      {/* Semantic Header with Navigation */}
      <header role="banner" aria-label="Site header">
        <EnhancedNavigationBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </header>

      {/* Status Bar - Complementary Region */}
      <aside
        role="complementary"
        aria-label="Network status"
        className="max-w-7xl mx-auto px-6 pt-6"
      >
        {/* Blockchain Sync Progress */}
        <BlockchainSyncProgress className="mb-4" />

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 backdrop-blur-sm rounded-lg p-4 border border-red-500/20 mb-4">
            <div className="flex items-center space-x-3">
              <WarningCircle className="h-5 w-5 text-red-400" />
              <div className="text-gray-900 dark:text-white font-semibold">
                {error}
              </div>
              <button
                onClick={() => fetchRealStats(true)}
                className="ml-auto px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-md transition-colors text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area with Landmark */}
      <main
        id="main-content"
        role="main"
        aria-label="Main content"
        className="max-w-7xl mx-auto px-6 py-12"
      >
        <div className="space-y-8">
          {/* Tab Content */}
          <div className="min-h-[600px]">{renderTabContent()}</div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50/50 dark:bg-black/20 backdrop-blur-sm border-t border-slate-300 dark:border-white/10 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="theme-text-secondary text-sm">
                VerusPulse - Powered by Verus Protocol
              </div>
              <div className="hidden md:block w-px h-4 bg-gray-300 dark:bg-white/20"></div>
              <div className="theme-text-secondary text-xs">
                The Internet of Value
              </div>
            </div>

            <div className="flex items-center space-x-4 text-xs theme-text-secondary">
              {lastUpdate && (
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    Updated{' '}
                    {lastUpdate instanceof Date
                      ? lastUpdate.toLocaleTimeString()
                      : new Date(lastUpdate).toLocaleTimeString()}
                  </span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Network className="h-3 w-3" />
                <span>Live Network</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Performance Monitor */}
      <PerformanceMonitor />
    </div>
  );
}
