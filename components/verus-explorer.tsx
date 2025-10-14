'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Database,
  Activity,
  User,
  Search,
  BarChart3,
  Hash,
  Users,
  Clock,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Network,
} from 'lucide-react';
import Link from 'next/link';
import { NetworkDashboard } from './network-dashboard';
import { BlocksExplorer } from './blocks-explorer';
import { TransactionsExplorer } from './transactions-explorer';
import { AddressExplorer } from './address-explorer';
import { VerusIDExplorer } from './verusid-explorer';
import { MempoolExplorer } from './mempool-explorer';
import { UniversalSearch } from './universal-search';
import { LiveData } from './live-data';
import { useNetworkStore, useNetworkActions } from '@/lib/store/network-store';
import { useSmartInterval } from '@/lib/hooks/use-interval';
import { usePerformanceMonitor } from '@/lib/hooks/use-performance-monitor';
import { useScreenReaderAnnouncement } from '@/lib/hooks/use-screen-reader-announcement';
import { useApiFetch } from '@/lib/hooks/use-retryable-fetch';
import { useRouter } from 'next/navigation';
import { EnhancedNavigationBar } from './enhanced-navigation-bar';
import { PerformanceMonitor } from './performance-monitor';

type ExplorerTab =
  | 'dashboard'
  | 'search'
  | 'blocks'
  | 'transactions'
  | 'addresses'
  | 'verusids'
  | 'mempool'
  | 'live';

export function VerusExplorer() {
  const [activeTab, setActiveTab] = useState<ExplorerTab>('dashboard');
  const router = useRouter();

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
  const handleTabChange = useCallback((tab: ExplorerTab) => {
    setActiveTab(tab);
    // Update URL without triggering a page reload
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({ tab }, '', url.toString());
  }, []);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const tab = event.state?.tab || 'dashboard';
      setActiveTab(tab);
    };

    // Initialize from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab') as ExplorerTab;
    if (
      tabFromUrl &&
      [
        'dashboard',
        'search',
        'blocks',
        'transactions',
        'addresses',
        'verusids',
        'live',
      ].includes(tabFromUrl)
    ) {
      setActiveTab(tabFromUrl);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // const navigation = [
  //   { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  //   { key: 'search', label: 'Search', icon: Search },
  //   { key: 'blocks', label: 'Blocks', icon: Database },
  //   { key: 'transactions', label: 'Transactions', icon: Activity },
  //   { key: 'addresses', label: 'Addresses', icon: User },
  //   { key: 'verusids', label: 'VerusIDs', icon: Users },
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

  const fetchRealStats = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isFetching) {
      return;
    }

    try {
      setIsFetching(true);
      setLocalLoading(true);
      setLoading(true);
      clearError();

      // Use the consolidated API for better performance and reliability (use apiFetch which has retries)
      let consolidatedResult: any = null;
      try {
        consolidatedResult = await apiFetch(`/api/consolidated-data?t=${Date.now()}`);
      } catch (err: any) {
        // Log and fall back to individual endpoints below
        console.warn('[VerusExplorer] Consolidated fetch failed, falling back to individual endpoints:', err?.message || err);
        consolidatedResult = null;
      }

      if (consolidatedResult && consolidatedResult.success) {
        const { blockchain, mining, mempool, network } =
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

        // For staking data, we'll use mining data as it contains staking info
        if (mining) {
          setLocalStakingStats(mining);
          setStakingStats(mining);
        }

        setLastUpdate(new Date());
        announceSuccess('Network data loaded successfully');

        // Clear loading state immediately after data is set
        setLocalLoading(false);
        setLoading(false);
        return;
        return;
      }

      // Fallback to individual APIs if consolidated fails (or returned no/invalid data)
      const endpoints: Record<string, string> = {
        blockchain: `/api/blockchain-info?t=${Date.now()}`,
        mempool: `/api/mempool/size?t=${Date.now()}`,
        mining: `/api/mining-info?t=${Date.now()}`,
        staking: `/api/real-staking-data?t=${Date.now()}`,
      };

      const promises = Object.entries(endpoints).map(([key, ep]) =>
        apiFetch(ep)
          .then(data => ({ status: 'fulfilled' as const, key, value: data }))
          .catch((reason: any) => ({ status: 'rejected' as const, key, reason }))
      );

      const results = await Promise.all(promises);

      // Helper to find result by key
      const find = (k: string) => results.find(r => r.key === k) as any;

      // Blockchain
      const bcRes = find('blockchain');
      if (bcRes?.status === 'fulfilled') {
        const bcData = bcRes.value;
        if (bcData && bcData.success) {
          if (process.env.NODE_ENV === 'development') {
            console.log('Setting network stats:', bcData.data);
          }
          setLocalNetworkStats(bcData.data);
          setNetworkStats(bcData.data);
        } else {
          console.warn('Blockchain data fetch failed:', bcData);
        }
      } else if (bcRes) {
        console.warn('Blockchain data fetch error:', bcRes.reason?.message || bcRes.reason);
      }

      // Mempool
      const mpRes = find('mempool');
      if (mpRes?.status === 'fulfilled') {
        const mpData = mpRes.value;
        if (mpData && mpData.success) {
          setLocalMempoolStats(mpData.data);
          setMempoolStats(mpData.data);
        } else {
          console.warn('Mempool data fetch failed:', mpData);
        }
      } else if (mpRes) {
        console.warn('Mempool data fetch error:', mpRes.reason?.message || mpRes.reason);
      }

      // Mining
      const miningRes = find('mining');
      if (miningRes?.status === 'fulfilled') {
        const miningData = miningRes.value;
        if (miningData && miningData.success) {
          setLocalMiningStats(miningData.data);
          setMiningStats(miningData.data);
        } else {
          console.warn('Mining data fetch failed:', miningData);
        }
      } else if (miningRes) {
        console.warn('Mining data fetch error:', miningRes.reason?.message || miningRes.reason);
      }

      // Staking
      const stakingRes = find('staking');
      if (stakingRes?.status === 'fulfilled') {
        const stakingData = stakingRes.value;
        if (stakingData && stakingData.success) {
          setLocalStakingStats(stakingData.data.staking);
          setStakingStats(stakingData.data.staking);
        } else {
          console.warn('Staking data fetch failed:', stakingData);
        }
      } else if (stakingRes) {
        console.warn('Staking data fetch error:', stakingRes.reason?.message || stakingRes.reason);
      }

      setLastUpdate(new Date());
      announceSuccess('Network data updated successfully');
    } catch (error) {
      console.error('Error fetching real stats:', error);
      const errorMessage = 'Failed to load network data. Please try again.';
      setError(errorMessage);
      announceError(errorMessage);
    } finally {
      setIsFetching(false);
      setLocalLoading(false);
      setLoading(false);
    }
  }, [
    isFetching,
    setLoading,
    clearError,
    setNetworkStats,
    setMempoolStats,
    setMiningStats,
    setStakingStats,
    setLastUpdate,
    setError,
    announceSuccess,
    announceError,
  ]);
  // Smart interval for auto-refresh - disabled immediate to prevent request spam
  useSmartInterval(fetchRealStats, 60000, {
    immediate: false, // Changed from true to false to prevent immediate execution
    pauseOnError: true,
    maxRetries: 3,
    onError: error => {
      console.error('Smart interval error:', error);
      announceError('Auto-refresh failed. Click refresh to try again.');
    },
  });

  // Manual initial fetch to avoid immediate interval execution
  useEffect(() => {
    // Force immediate data fetch
    fetchRealStats().catch(error => {
      console.error('Initial fetch failed:', error);
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
      { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
      { key: 'search', label: 'Search', icon: Search },
      { key: 'blocks', label: 'Blocks', icon: Database },
      { key: 'transactions', label: 'Transactions', icon: Activity },
      { key: 'addresses', label: 'Addresses', icon: User },
      { key: 'verusids', label: 'VerusIDs', icon: Users },
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
              <NetworkDashboard
                networkStats={localNetworkStats || networkStats}
                miningStats={localMiningStats || miningStats}
                mempoolStats={localMempoolStats || mempoolStats}
                stakingStats={localStakingStats || stakingStats}
                pbaasChains={pbaasChains}
                loading={localLoading || loading}
                lastUpdate={lastUpdate}
                fetchAllData={fetchRealStats}
              />
              {/* Debug: Show what data we actually have */}
              {process.env.NODE_ENV === 'development' && (
                <div className="bg-green-500/10 p-4 rounded-lg text-xs text-green-200">
                  <div>Local Network: {localNetworkStats ? '✅' : '❌'}</div>
                  <div>Store Network: {networkStats ? '✅' : '❌'}</div>
                  <div>Local Mining: {localMiningStats ? '✅' : '❌'}</div>
                  <div>Store Mining: {miningStats ? '✅' : '❌'}</div>
                  <div>Loading: {String(localLoading || loading)}</div>
                </div>
              )}
            </div>
          );
        case 'search':
          return <UniversalSearch />;
        case 'blocks':
          return <BlocksExplorer />;
        case 'transactions':
          return <TransactionsExplorer />;
        case 'addresses':
          return <AddressExplorer />;
        case 'verusids':
          return <VerusIDExplorer />;
        case 'mempool':
          return <MempoolExplorer />;
        case 'live':
          return <LiveData />;
        default:
          return (
            <NetworkDashboard
              networkStats={localNetworkStats || networkStats}
              miningStats={localMiningStats || miningStats}
              mempoolStats={localMempoolStats || mempoolStats}
              stakingStats={localStakingStats || stakingStats}
              pbaasChains={pbaasChains}
              loading={localLoading || loading}
              lastUpdate={lastUpdate}
              fetchAllData={fetchRealStats}
            />
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
    <div className="min-h-screen theme-bg-primary">
      {/* Enhanced Navigation Header */}
      <EnhancedNavigationBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Status Bar */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        {/* Sync Progress */}
        {networkStats && networkStats.verificationProgress < 0.999 && (
          <div className="bg-blue-500/10 backdrop-blur-sm rounded-lg p-4 border border-blue-500/20 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                <div className="text-white font-semibold">
                  Wallet is synchronizing...
                </div>
              </div>
              <div className="text-white text-sm font-semibold">
                {(networkStats.verificationProgress * 100).toFixed(2)}%
              </div>
            </div>
            <div className="mt-2 h-2 bg-white/10 rounded-full">
              <div
                className="h-2 bg-blue-400 rounded-full transition-all duration-300"
                style={{
                  width: `${networkStats.verificationProgress * 100}%`,
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 backdrop-blur-sm rounded-lg p-4 border border-red-500/20 mb-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="text-white font-semibold">{error}</div>
              <button
                onClick={fetchRealStats}
                className="ml-auto px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-md transition-colors text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Success State */}
        {!loading && !error && networkStats && (
          <div className="bg-green-500/10 backdrop-blur-sm rounded-lg p-3 border border-green-500/20 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <div className="text-white text-sm">
                  Network connected • {networkStats.connections} peers
                </div>
              </div>
              {lastUpdate && (
                <div className="text-green-200 text-xs">
                  Updated{' '}
                  {lastUpdate instanceof Date
                    ? lastUpdate.toLocaleTimeString()
                    : new Date(lastUpdate).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main id="main-content" className="max-w-7xl mx-auto px-6 py-12">
        <div className="space-y-8">
          {/* Breadcrumb Navigation */}
          <nav
            className="flex items-center space-x-2 text-sm theme-text-secondary"
            aria-label="Breadcrumb"
          >
            <span>Verus Explorer</span>
            <ChevronRight className="h-4 w-4" />
            <span className="theme-text-primary font-medium">
              {navigationItems.find(nav => nav.key === activeTab)?.label}
            </span>
          </nav>

          {/* Tab Content */}
          <div className="min-h-[600px]">{renderTabContent()}</div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black/20 backdrop-blur-sm border-t border-white/10 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="theme-text-secondary text-sm">
                Verus Explorer - Powered by Verus Protocol
              </div>
              <div className="hidden md:block w-px h-4 bg-white/20"></div>
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
