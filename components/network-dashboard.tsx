'use client';

import { useState, useEffect } from 'react';
import {
  Database,
  Activity,
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
  Fire,
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
} from '@/lib/utils/number-formatting';
import { UnifiedLiveCard } from './unified-live-card';
import { HeroSection } from './hero-section';
import { QuickStatsTicker } from './quick-stats-ticker';
import { LiveActivityFeed } from './live-activity-feed';
// import { FeaturedVerusIDsCarousel } from './featured-verusids-carousel';
import { TrendingSection } from './trending-section';
import { DashboardTabs, DashboardTab } from './dashboard-tabs';
import { QuickActionsBar } from './quick-actions-bar';
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
}: DashboardProps) {
  // Tab state management
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  // Using imported formatting functions from utils

  // Show loading state while data is being fetched
  if (loading) {
    return (
      <div className="space-y-8 text-white">
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="animate-spin h-6 w-6 border-2 border-verus-blue border-t-transparent rounded-full"></div>
            <div>
              <h3 className="text-lg font-bold text-verus-blue">
                Loading Network Data
              </h3>
              <p className="text-slate-300 text-sm mt-1">
                Fetching latest blockchain information...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state only if we're explicitly loading AND have no data
  if (loading && !networkStats && !miningStats && !stakingStats) {
    return (
      <div className="space-y-8 text-white">
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-verus-blue"></div>
            <div>
              <h3 className="text-lg font-bold text-verus-blue">
                Loading Network Data...
              </h3>
              <p className="text-slate-300 text-sm mt-1">
                Fetching blockchain information from the Verus network...
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
      <div className="space-y-8 text-white">
        <div className="bg-slate-900 rounded-2xl p-6 border border-verus-red/40">
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
                className="mt-3 px-4 py-2 bg-verus-red hover:bg-verus-red-dark text-white rounded-lg text-sm transition-colors border border-verus-red-light"
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
    <div className="space-y-6 text-white px-4 md:px-6">
      {/* Hero Section - Always Visible */}
      <HeroSection
        networkStats={networkStats}
        miningStats={miningStats}
        stakingStats={stakingStats}
      />

      {/* Quick Stats Ticker - Always Visible */}
      <QuickStatsTicker
        networkStats={networkStats}
        miningStats={miningStats}
        mempoolStats={mempoolStats}
        stakingStats={stakingStats}
      />

      {/* Quick Actions Bar - Always Visible */}
      <QuickActionsBar
        onTabChange={tab => setActiveTab(tab as DashboardTab)}
        onSearchFocus={() => setActiveTab('overview')}
      />

      {/* Tabbed Navigation */}
      <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Two Column Layout: Main Tabbed Content + Live Feed (desktop only) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Tabbed Content - Left Side (2/3 width on xl) */}
        <div className="xl:col-span-2">
          {/* Refresh Button and Real-time Status */}
          <div className="flex items-center justify-between mb-4 md:mb-6">
            {/* Real-time Status */}
            <RealtimeStatus showDetails={true} />

            {/* Refresh Controls */}
            <div className="flex items-center space-x-2 md:space-x-4">
              {lastUpdate && (
                <div className="text-sm text-blue-200 hidden md:block">
                  Last updated:{' '}
                  {lastUpdate instanceof Date
                    ? lastUpdate.toLocaleTimeString()
                    : new Date(lastUpdate as any).toLocaleTimeString()}
                </div>
              )}
              <button
                onClick={fetchAllData}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 border border-slate-700"
              >
                <ArrowsClockwise
                  className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Welcome Message - No duplicate stats since QuickStatsTicker shows them */}
              <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Globe className="h-5 w-5 mr-2 text-verus-blue" />
                  Welcome to VerusPulse
                </h3>
                <p className="text-slate-300 mb-4">
                  Your comprehensive gateway to the Verus blockchain. All key
                  network metrics are displayed above in the stats ticker.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
                    <div className="p-2 rounded-lg bg-verus-blue/10 border border-verus-blue/40">
                      <Database className="h-5 w-5 text-verus-blue" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">
                        Blockchain Explorer
                      </div>
                      <div className="text-xs text-slate-400">
                        Browse blocks and transactions
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
                    <div className="p-2 rounded-lg bg-verus-green/10 border border-verus-green/40">
                      <UsersThree className="h-5 w-5 text-verus-green" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">
                        VerusID Registry
                      </div>
                      <div className="text-xs text-slate-400">
                        Discover identities and addresses
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
                    <div className="p-2 rounded-lg bg-verus-green/10 border border-verus-green/40">
                      <Activity className="h-5 w-5 text-verus-green" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">
                        Live Activity
                      </div>
                      <div className="text-xs text-slate-400">
                        Real-time network activity
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('network')}
                  className="p-6 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-700 hover:border-verus-blue/60 transition-all text-left group"
                >
                  <Activity className="h-8 w-8 mb-3 text-verus-blue transition-transform" />
                  <h3 className="text-lg font-semibold mb-1 text-white">
                    View Full Stats
                  </h3>
                  <p className="text-sm text-slate-400">
                    Detailed network metrics
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab('featured')}
                  className="p-6 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-700 hover:border-verus-blue/60 transition-all text-left group"
                >
                  <UsersThree className="h-8 w-8 mb-3 text-verus-blue transition-transform" />
                  <h3 className="text-lg font-semibold mb-1 text-white">
                    Featured VerusIDs
                  </h3>
                  <p className="text-sm text-slate-400">
                    Top community members
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab('trending')}
                  className="p-6 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-700 hover:border-verus-blue/60 transition-all text-left group"
                >
                  <Fire className="h-8 w-8 mb-3 text-verus-green transition-transform" />
                  <h3 className="text-lg font-semibold mb-1 text-white">
                    What&apos;s Trending
                  </h3>
                  <p className="text-sm text-slate-400">
                    Hot content right now
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* NETWORK STATS TAB */}
          {activeTab === 'network' && (
            <div className="space-y-6">
              {/* Advanced Network Metrics - Unique information not in QuickStatsTicker */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg bg-purple-500/20">
                      <Cpu className="h-6 w-6 text-purple-400" />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">
                        {miningStats?.networkhashps
                          ? formatHashRate(miningStats.networkhashps)
                          : 'N/A'}
                      </div>
                      <div className="text-blue-200 text-sm font-medium">
                        Hash Rate
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg bg-orange-500/20">
                      <ChartBar className="h-6 w-6 text-orange-400" />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">
                        {networkStats?.sizeOnDisk
                          ? formatFileSize(networkStats.sizeOnDisk)
                          : 'N/A'}
                      </div>
                      <div className="text-blue-200 text-sm font-medium">
                        Chain Size
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg bg-verus-blue/10 border border-verus-blue/40">
                      <Network className="h-6 w-6 text-blue-400" />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">
                        {networkStats?.commitments || 0}
                      </div>
                      <div className="text-blue-200 text-sm font-medium">
                        Commitments
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg bg-indigo-500/20">
                      <Hash className="h-6 w-6 text-indigo-400" />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">
                        {miningStats?.difficulty
                          ? formatDifficulty(miningStats.difficulty)
                          : 'N/A'}
                      </div>
                      <div className="text-blue-200 text-sm font-medium">
                        Difficulty
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg bg-pink-500/20">
                      <Fire className="h-6 w-6 text-pink-400" />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">
                        {pbaasChains.length}
                      </div>
                      <div className="text-blue-200 text-sm font-medium">
                        PBaaS Chains
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg bg-emerald-500/20">
                      <Clock className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">~60s</div>
                      <div className="text-blue-200 text-sm font-medium">
                        Block Time
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Staking Information - Detailed info (Network Stake is in QuickStatsTicker) */}
              {stakingStats && (
                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <Coins className="h-5 w-5 mr-2" />
                    Staking Calculations
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                      <div className="text-white font-semibold mb-2">
                        Estimated Staking APY
                      </div>
                      <div className="text-2xl font-bold text-green-400">
                        {stakingStats.netstakeweight &&
                        stakingStats.netstakeweight > 0
                          ? (
                              ((525600 * 6 * 0.5) /
                                stakingStats.netstakeweight) *
                              100
                            ).toFixed(2) + '%'
                          : 'N/A'}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Based on current network stake
                      </div>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                      <div className="text-white font-semibold mb-2">
                        Block Reward
                      </div>
                      <div className="text-2xl font-bold text-blue-400">
                        6.00 VRSC
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Per staked block
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Value Pools */}
              {networkStats?.valuePools &&
                networkStats.valuePools.length > 0 && (
                  <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                      <ChartBar className="h-5 w-5 mr-2" />
                      Value Pools
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {networkStats.valuePools.map((pool, index) => (
                        <div
                          key={index}
                          className="bg-slate-800 rounded-lg p-4 border border-slate-700"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-white font-semibold capitalize">
                              {pool.id}
                            </div>
                            <div
                              className={`px-2 py-1 rounded text-xs ${
                                pool.monitored
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-gray-500/20 text-slate-400'
                              }`}
                            >
                              {pool.monitored ? 'Monitored' : 'Not Monitored'}
                            </div>
                          </div>
                          <div className="text-blue-200 text-sm">
                            Value: {pool.chainValue.toFixed(8)} VRSC
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* PBaaS Chains */}
              {pbaasChains && pbaasChains.length > 0 && (
                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <Network className="h-5 w-5 mr-2" />
                    PBaaS Chains
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pbaasChains.map((chain, index) => (
                      <div
                        key={index}
                        className="bg-slate-800 rounded-lg p-4 border border-slate-700"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-white font-semibold capitalize">
                            {chain.currencydefinition.name}
                          </div>
                          <div className="text-blue-200 text-sm">
                            Height: {chain.bestheight}
                          </div>
                        </div>
                        <div className="text-blue-300 text-xs">
                          Supply: {chain.currencydefinition.initialsupply}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
              <div className="bg-slate-900 rounded-lg p-8 border border-slate-700 text-center">
                <p className="text-slate-400">
                  Featured VerusIDs coming soon...
                </p>
              </div>
            </div>
          )}

          {/* TRENDING TAB */}
          {activeTab === 'trending' && (
            <div className="space-y-6">
              <TrendingSection autoRefresh={true} refreshInterval={60000} />
            </div>
          )}
        </div>

        {/* Live Activity Feed - Desktop Only (XL+ screens) */}
        <div className="hidden xl:block xl:col-span-1">
          <div className="sticky top-6">
            <LiveActivityFeed maxEvents={20} autoRefresh={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
