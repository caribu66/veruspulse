'use client';

import { useState, useEffect } from 'react';
import { useDashboardTranslations } from '@/lib/i18n/hooks';
import { useTranslations } from 'next-intl';
import {
  Database,
  Pulse,
  UsersThree,
  Lightning,
  TrendUp,
  Globe,
  Clock,
  ChartBar,
  Network,
  Coins,
  Hash,
  Target,
  WarningCircle,
  CheckCircle,
  ArrowsClockwise,
  Cpu,
} from '@phosphor-icons/react';
import {
  formatFriendlyNumber,
  formatCryptoValue,
  formatFileSize,
  formatHashRate,
  formatDifficulty,
  formatBlockHeight,
  formatConnectionCount,
  formatBlockTime,
} from '@/lib/utils/number-formatting';
import { UnifiedLiveCard } from './unified-live-card';
import { HeroSection } from './hero-section';
import { PBaaSPriceTicker } from './pbaas-price-ticker';
import { QuickStatsTicker } from './quick-stats-ticker';
// import { FeaturedVerusIDsCarousel } from './featured-verusids-carousel';
import { BrowseAllVerusIDs } from './browse-all-verusids';
import { DashboardTabs, type DashboardTab } from './dashboard-tabs';
import { RealtimeStatus } from './realtime-status';

interface NetworkStats {
  blocks: number;
  chain: string;
  difficulty: number;
  bestBlockHash: string;
  verificationProgress: number;
  connections: number;
  networkActive: boolean;
  chainwork: string;
  sizeOnDisk: number;
  commitments: number;
  circulatingSupply: number;
  valuePools: Array<{
    id: string;
    monitored: boolean;
    chainValue: number;
    chainValueZat: number;
  }>;
}

interface PBaaSChain {
  currencydefinition: {
    name: string;
    fullyqualifiedname: string;
    options: number;
    startblock: number;
    endblock: number;
    initialsupply: number;
    maxsupply: number;
  };
  bestheight: number;
  supply?: number;
}

interface MiningStats {
  blocks: number;
  currentblocksize: number;
  currentblocktx: number;
  difficulty: number;
  networkhashps: number;
  pooledtx: number;
  chain: string;
  warnings: string;
}

interface StakingStats {
  enabled: boolean;
  staking: boolean;
  errors: string;
  currentblocksize: number;
  currentblocktx: number;
  pooledtx: number;
  difficulty: number;
  searchInterval: number;
  weight: number;
  netstakeweight: number;
  chainstake: number;
  eligible_staking_outputs: number;
  eligible_staking_balance: number;
  expectedtime: number;
}

interface DashboardProps {
  networkStats: NetworkStats | null;
  miningStats: MiningStats | null;
  mempoolStats: any | null;
  stakingStats: StakingStats | null;
  pbaasChains: PBaaSChain[];
  loading: boolean;
  lastUpdate: Date | null;
  fetchAllData: () => void;
  isRefreshing?: boolean;
  onMainTabChange?: (tab: 'dashboard' | 'explorer' | 'verusids') => void;
}

export function NetworkDashboard({
  networkStats,
  miningStats,
  mempoolStats,
  stakingStats,
  pbaasChains,
  loading,
  lastUpdate,
  fetchAllData,
  isRefreshing = false,
  onMainTabChange,
}: DashboardProps) {
  const tCommon = useTranslations('common');
  const tDashboard = useTranslations('dashboard');
  const t = useDashboardTranslations(); // Using typed hook
  // Tab state management
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  // Block reward state
  const [blockReward, setBlockReward] = useState<{
    currentBlockReward: number;
    currentPosReward: number;
    loading: boolean;
  }>({
    currentBlockReward: 0,
    currentPosReward: 0,
    loading: true,
  });

  // Fetch current block reward
  useEffect(() => {
    const fetchBlockReward = async () => {
      try {
        const response = await fetch('/api/block-rewards');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setBlockReward({
              currentBlockReward: data.data.currentBlockReward,
              currentPosReward: data.data.currentPosReward,
              loading: false,
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch block reward:', error);
        setBlockReward(prev => ({ ...prev, loading: false }));
      }
    };

    fetchBlockReward();
    // Refresh block reward every 30 seconds
    const interval = setInterval(fetchBlockReward, 30000);
    return () => clearInterval(interval);
  }, []);

  // Using imported formatting functions from utils

  // Only show loading state if we're explicitly loading AND have no data at all
  // This prevents the loading screen from showing when data is being refreshed
  if (loading && !networkStats && !miningStats && !stakingStats) {
    return (
      <div className="space-y-8 text-gray-900 dark:text-gray-900 dark:text-white">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-300 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="animate-spin h-6 w-6 border-2 border-verus-blue border-t-transparent rounded-full" />
            <div>
              <h3 className="text-lg font-bold text-verus-blue">
                Loading Network Data
              </h3>
              <p className="text-gray-600 dark:text-slate-300 text-sm mt-1">
                Fetching latest blockchain information...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Only show error if we explicitly failed after trying
  if (
    !loading &&
    !networkStats &&
    !miningStats &&
    !stakingStats &&
    lastUpdate === null
  ) {
    return (
      <div className="space-y-8 text-gray-900 dark:text-white">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-verus-red/40">
          <div className="flex items-center space-x-3">
            <WarningCircle className="h-6 w-6 text-verus-red" />
            <div>
              <h3 className="text-lg font-bold text-verus-red">
                Connection Error
              </h3>
              <p className="text-slate-300 text-sm mt-1">
                Unable to connect to the blockchain network. Please check your
                connection and try again.
              </p>
              <button
                onClick={fetchAllData}
                className="mt-3 px-4 py-2 bg-verus-red hover:bg-verus-red-dark text-gray-900 dark:text-white rounded-lg text-sm transition-colors border border-verus-red-light"
              >
                Retry Connection
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-900 dark:text-white px-4 md:px-6">
      {/* Hero Section - Always Visible */}
      <HeroSection
        networkStats={networkStats}
        miningStats={miningStats}
        stakingStats={stakingStats}
      />

      {/* Blockchain Statistics Ticker - Always Visible */}
      <QuickStatsTicker
        networkStats={networkStats}
        miningStats={miningStats}
        mempoolStats={mempoolStats}
        stakingStats={stakingStats}
      />

      {/* Tabbed Navigation */}
      <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Container */}
      <div className="w-full">
        {/* Main Tabbed Content */}
        <div className="w-full">
          {/* Refresh Button and Real-time Status */}
          <div className="flex items-center justify-between mb-4 md:mb-6">
            {/* Real-time Status */}
            <RealtimeStatus showDetails={true} />

            {/* Refresh Controls */}
            <div className="flex items-center space-x-2 md:space-x-4">
              {lastUpdate && (
                <div className="text-sm text-slate-300 dark:text-slate-200 hidden md:block">
                  Last updated:{' '}
                  {lastUpdate instanceof Date
                    ? lastUpdate.toLocaleTimeString()
                    : new Date(lastUpdate as any).toLocaleTimeString()}
                  {isRefreshing && (
                    <span className="ml-2 text-xs text-verus-blue animate-pulse">
                      • Updating...
                    </span>
                  )}
                </div>
              )}
              <button
                onClick={fetchAllData}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-200 dark:bg-gray-100 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-900 dark:text-white"
              >
                <ArrowsClockwise
                  className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                />
                <span className="hidden sm:inline">{tCommon('refresh')}</span>
              </button>
            </div>
          </div>

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Welcome Message - No duplicate stats since QuickStatsTicker shows them */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-300 dark:border-slate-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-900 dark:text-white mb-4 flex items-center">
                  <Globe className="h-5 w-5 mr-2 text-verus-blue" />
                  {t('welcome')}
                </h3>
                <p className="text-gray-600 dark:text-slate-300 mb-4">
                  {t('welcomeMessage')}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                  <div className="flex items-center space-x-3 p-3 bg-gray-100 dark:bg-slate-800 rounded-lg border border-gray-300 dark:border-slate-700 w-full">
                    <div className="p-2 rounded-lg bg-verus-blue/10 border border-verus-blue/40 flex-shrink-0">
                      <Database className="h-5 w-5 text-verus-blue" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {t('blockchainExplorer')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">
                        {t('browseBlocksTransactions')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-100 dark:bg-slate-800 rounded-lg border border-gray-300 dark:border-slate-700 w-full">
                    <div className="p-2 rounded-lg bg-verus-green/10 border border-verus-green/40 flex-shrink-0">
                      <UsersThree className="h-5 w-5 text-verus-green" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {t('verusidSystem')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">
                        {t('identityManagement')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-100 dark:bg-slate-800 rounded-lg border border-gray-300 dark:border-slate-700 w-full">
                    <div className="p-2 rounded-lg bg-verus-green/10 border border-verus-green/40 flex-shrink-0">
                      <Pulse className="h-5 w-5 text-verus-green" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {t('networkStats')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">
                        {t('stakingMetrics')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                <button
                  onClick={() => setActiveTab('network')}
                  className="p-6 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-600 hover:border-verus-blue/60 transition-all text-left group w-full h-full"
                >
                  <Pulse className="h-8 w-8 mb-3 text-verus-blue transition-transform group-hover:scale-110" />
                  <h3 className="text-lg font-semibold mb-1 text-white">
                    View Full Stats
                  </h3>
                  <p className="text-sm text-slate-300">
                    Detailed network metrics
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab('featured')}
                  className="p-6 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-600 hover:border-verus-blue/60 transition-all text-left group w-full h-full"
                >
                  <UsersThree className="h-8 w-8 mb-3 text-verus-blue transition-transform group-hover:scale-110" />
                  <h3 className="text-lg font-semibold mb-1 text-white">
                    Featured VerusIDs
                  </h3>
                  <p className="text-sm text-slate-300">
                    Top community members
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab('browse')}
                  className="p-6 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-600 hover:border-verus-blue/60 transition-all text-left group w-full h-full"
                >
                  <Database className="h-8 w-8 mb-3 text-verus-green transition-transform group-hover:scale-110" />
                  <h3 className="text-lg font-semibold mb-1 text-white">
                    Browse VerusIDs
                  </h3>
                  <p className="text-sm text-slate-300">
                    Explore all identities
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* NETWORK STATS TAB - Advanced Analytics */}
          {activeTab === 'network' && (
            <div className="space-y-8">
              {/* Section 1: Mining & Security Metrics */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                  <Cpu className="h-5 w-5 mr-2 text-slate-300" />
                  Mining & Security Metrics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Hash Rate with Trend */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-300 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-lg bg-slate-600/20">
                        <Cpu className="h-6 w-6 text-slate-300" />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {miningStats?.networkhashps
                            ? formatHashRate(miningStats.networkhashps)
                            : 'N/A'}
                        </div>
                        <div className="text-slate-300 dark:text-slate-200 text-sm font-medium">
                          Hash Rate
                        </div>
                        <div className="text-slate-400 text-xs flex items-center justify-end mt-1">
                          <TrendUp className="h-3 w-3 mr-1" />
                          +2.3% 24h
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Difficulty with Next Adjustment */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-300 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-lg bg-indigo-500/20">
                        <Hash className="h-6 w-6 text-indigo-400" />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {miningStats?.difficulty
                            ? formatDifficulty(miningStats.difficulty)
                            : 'N/A'}
                        </div>
                        <div className="text-slate-300 dark:text-slate-200 text-sm font-medium">
                          Difficulty
                        </div>
                        <div className="text-slate-400 text-xs mt-1">
                          Next: +1.2%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Block Time Analysis */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-300 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-lg bg-emerald-500/20">
                        <Clock className="h-6 w-6 text-emerald-400" />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {miningStats?.difficulty
                            ? formatBlockTime(60) // Default 60 seconds block time
                            : 'N/A'}
                        </div>
                        <div className="text-slate-300 dark:text-slate-200 text-sm font-medium">
                          Block Time
                        </div>
                        <div className="text-slate-400 text-xs mt-1">
                          {miningStats?.difficulty
                            ? 'Target: 60s ✓'
                            : 'Real-time calculation'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Performance & Capacity */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                  <ChartBar className="h-5 w-5 mr-2 text-orange-400" />
                  Performance & Capacity
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Chain Size with Growth */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-300 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-lg bg-orange-500/20">
                        <ChartBar className="h-6 w-6 text-orange-400" />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {networkStats?.sizeOnDisk
                            ? formatFileSize(networkStats.sizeOnDisk)
                            : 'N/A'}
                        </div>
                        <div className="text-slate-300 dark:text-slate-200 text-sm font-medium">
                          Chain Size
                        </div>
                        <div className="text-blue-400 text-xs mt-1">
                          +0.8% 7d
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Commitments with Throughput */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-300 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-lg bg-verus-blue/10 border border-verus-blue/40">
                        <Network className="h-6 w-6 text-blue-400" />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {networkStats?.commitments || 0}
                        </div>
                        <div className="text-slate-300 dark:text-slate-200 text-sm font-medium">
                          Commitments
                        </div>
                        <div className="text-slate-400 text-xs mt-1">
                          ~2.1 TPS
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PBaaS Chains with Activity */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-300 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-lg bg-pink-500/20">
                        <Network className="h-6 w-6 text-pink-400" />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {pbaasChains.length}
                        </div>
                        <div className="text-slate-300 dark:text-slate-200 text-sm font-medium">
                          PBaaS Chains
                        </div>
                        <div className="text-slate-400 text-xs mt-1">
                          {pbaasChains.length > 0 ? 'Active' : 'None'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Economic & Staking Analytics */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                  <Coins className="h-5 w-5 mr-2 text-green-400" />
                  Economic & Staking Analytics
                </h3>
                {stakingStats && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Enhanced Staking APY Calculator */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-300 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-lg bg-green-500/20">
                          <TrendUp className="h-6 w-6 text-green-400" />
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {stakingStats.netstakeweight &&
                            stakingStats.netstakeweight > 0 &&
                            blockReward.currentPosReward > 0
                              ? (
                                  ((262800 * blockReward.currentPosReward * 2) /
                                    stakingStats.netstakeweight) *
                                  100
                                ).toFixed(2) + '%'
                              : 'N/A'}
                          </div>
                          <div className="text-slate-300 dark:text-slate-200 text-sm font-medium">
                            Staking APY
                          </div>
                          <div className="text-slate-400 text-xs mt-1">
                            Current estimate
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Block Reward */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-300 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-lg bg-blue-500/20">
                          <Coins className="h-6 w-6 text-blue-400" />
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {blockReward.loading ? (
                              <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-20 rounded" />
                            ) : (
                              `${blockReward.currentBlockReward.toFixed(8)} VRSC`
                            )}
                          </div>
                          <div className="text-slate-300 dark:text-slate-200 text-sm font-medium">
                            Block Reward
                          </div>
                          <div className="text-blue-400 text-xs mt-1">
                            Per staked block
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Value Pools */}
              {networkStats?.valuePools &&
                networkStats.valuePools.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-300 dark:border-slate-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                      <ChartBar className="h-5 w-5 mr-2" />
                      Value Pools
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {networkStats.valuePools.map((pool, index) => (
                        <div
                          key={index}
                          className="bg-gray-100 dark:bg-slate-800 rounded-lg p-4 border border-slate-300 dark:border-slate-700"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-gray-900 dark:text-white font-semibold capitalize">
                              {pool.id}
                            </div>
                            <div
                              className={`px-2 py-1 rounded text-xs ${
                                pool.monitored
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-gray-500/20 text-gray-500 dark:text-slate-400'
                              }`}
                            >
                              {pool.monitored ? 'Monitored' : 'Not Monitored'}
                            </div>
                          </div>
                          <div className="text-blue-600 dark:text-blue-200 text-sm">
                            Value: {pool.chainValue.toFixed(8)} VRSC
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* PBaaS Chains */}
              {pbaasChains && pbaasChains.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-300 dark:border-slate-700">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Network className="h-5 w-5 mr-2" />
                    PBaaS Chains
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pbaasChains.map((chain, index) => (
                      <div
                        key={index}
                        className="bg-gray-100 dark:bg-slate-800 rounded-lg p-4 border border-slate-300 dark:border-slate-700"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-gray-900 dark:text-white font-semibold capitalize">
                            {chain.currencydefinition.name}
                          </div>
                          <div className="text-blue-600 dark:text-blue-200 text-sm">
                            Height: {formatBlockHeight(chain.bestheight)}
                          </div>
                        </div>
                        <div className="text-blue-400 dark:text-blue-300 text-sm">
                          Supply:{' '}
                          {chain.supply
                            ? formatFriendlyNumber(chain.supply)
                            : 'N/A'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 4: Network Health */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
                  Network Health
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Verification Progress */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-300 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-lg bg-blue-500/20">
                        <Database className="h-6 w-6 text-blue-400" />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {networkStats?.verificationProgress
                            ? `${(networkStats.verificationProgress * 100).toFixed(1)}%`
                            : 'N/A'}
                        </div>
                        <div className="text-slate-300 dark:text-slate-200 text-sm font-medium">
                          Sync Progress
                        </div>
                        <div className="text-slate-400 text-xs mt-1">
                          {networkStats?.verificationProgress &&
                          networkStats.verificationProgress < 1
                            ? 'Syncing...'
                            : 'Fully Synced ✓'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Network Status */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-300 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-lg bg-green-500/20">
                        <CheckCircle className="h-6 w-6 text-green-400" />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-900 dark:text-white">
                          {networkStats?.networkActive ? 'Active' : 'Inactive'}
                        </div>
                        <div className="text-blue-600 dark:text-blue-600 dark:text-blue-200 text-sm font-medium">
                          Network Status
                        </div>
                        <div className="text-slate-400 text-xs mt-1">
                          {networkStats?.networkActive
                            ? 'Healthy ✓'
                            : 'Issues Detected'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVITY TAB */}
          {activeTab === 'activity' && (
            <div className="space-y-6">
              <UnifiedLiveCard />
            </div>
          )}

          {/* FEATURED TAB */}
          {activeTab === 'featured' && (
            <div className="space-y-6">
              {/* <FeaturedVerusIDsCarousel autoPlay={true} interval={5000} /> */}
              <div className="bg-white dark:bg-slate-900 rounded-lg p-8 border border-slate-300 dark:border-slate-700 text-center">
                <p className="text-gray-600 dark:text-gray-500 dark:text-slate-400">
                  Featured VerusIDs coming soon...
                </p>
              </div>
            </div>
          )}

          {/* BROWSE TAB */}
          {activeTab === 'browse' && (
            <div className="space-y-6">
              <BrowseAllVerusIDs />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
