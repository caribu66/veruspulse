'use client';

import { useState, useEffect } from 'react';
import {
  Database,
  Activity,
  Users,
  Zap,
  TrendingUp,
  Globe,
  Shield,
  Clock,
  BarChart3,
  Network,
  Coins,
  Hash,
  Target,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import {
  formatFriendlyNumber,
  formatCryptoValue,
  formatFileSize,
  formatHashRate,
  formatPercentage,
  formatDifficulty,
  formatDuration,
  formatBlockHeight,
  formatTransactionCount,
  formatConnectionCount,
} from '@/lib/utils/number-formatting';
import { formatBytes } from '@/lib/utils/formatting';
import { UnifiedLiveCard } from './unified-live-card';

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
  // Using imported formatting functions from utils

  // Show loading state while data is being fetched
  if (loading) {
    return (
      <div className="space-y-8 text-white">
        <div className="bg-blue-500/10 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20">
          <div className="flex items-center space-x-3">
            <div className="animate-spin h-6 w-6 border-2 border-blue-400 border-t-transparent rounded-full"></div>
            <div>
              <h3 className="text-lg font-bold text-blue-400">
                Loading Network Data
              </h3>
              <p className="text-blue-200 text-sm mt-1">
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
        <div className="bg-blue-500/10 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
            <div>
              <h3 className="text-lg font-bold text-blue-400">
                Loading Network Data...
              </h3>
              <p className="text-blue-200 text-sm mt-1">
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
        <div className="bg-red-500/10 backdrop-blur-sm rounded-2xl p-6 border border-red-500/20">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-red-400" />
            <div>
              <h3 className="text-lg font-bold text-red-400">
                Connection Error
              </h3>
              <p className="text-red-200 text-sm mt-1">
                Unable to connect to the blockchain network. Please check your
                connection and try again.
              </p>
              <button
                onClick={fetchAllData}
                className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
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
    <div className="space-y-8 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Network Dashboard</h2>
          <p className="text-blue-200 text-sm mt-1">
            Comprehensive blockchain analytics and network monitoring
          </p>
          {/* Debug: Show actual data */}
          {networkStats && (
            <div className="mt-4 p-4 bg-green-500/10 rounded-lg">
              <h3 className="text-green-400 font-bold">
                ✅ Data Loaded Successfully!
              </h3>
              <p className="text-green-200 text-sm">
                Block Height: {networkStats.blocks}
              </p>
              <p className="text-green-200 text-sm">
                Chain: {networkStats.chain}
              </p>
              <p className="text-green-200 text-sm">
                Difficulty: {networkStats.difficulty?.toLocaleString()}
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {lastUpdate && (
            <div className="text-sm text-blue-200">
              Last updated:{' '}
              {lastUpdate instanceof Date
                ? lastUpdate.toLocaleTimeString()
                : new Date(lastUpdate as any).toLocaleTimeString()}
            </div>
          )}
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <Globe className="h-5 w-5 mr-2" />
          Network Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-lg ${networkStats?.networkActive ? 'bg-green-500/20' : 'bg-red-500/20'}`}
            >
              {networkStats?.networkActive ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-400" />
              )}
            </div>
            <div>
              <div className="text-white font-semibold">Network</div>
              <div className="text-blue-200 text-sm">
                {networkStats?.networkActive ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Network className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <div className="text-white font-semibold">Connections</div>
              <div className="text-blue-200 text-sm">
                {formatConnectionCount(networkStats?.connections)}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Target className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <div className="text-white font-semibold">Sync Progress</div>
              <div className="text-blue-200 text-sm">
                {((networkStats?.verificationProgress || 0) * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Database className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <div className="text-white font-semibold">Chain Size</div>
              <div className="text-blue-200 text-sm">
                {formatFileSize(networkStats?.sizeOnDisk)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-blue-500/20">
              <Database className="h-6 w-6 text-blue-400" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                {formatBlockHeight(networkStats?.blocks)}
              </div>
              <div className="text-blue-200 text-sm font-medium">
                Block Height
              </div>
              <div className="text-blue-300 text-xs mt-1">
                Chain: {networkStats?.chain || 'Loading...'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-yellow-500/20">
              <Hash className="h-6 w-6 text-yellow-400" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                {formatDifficulty(networkStats?.difficulty)}
              </div>
              <div className="text-blue-200 text-sm font-medium">
                Difficulty
              </div>
              <div className="text-blue-300 text-xs mt-1">
                Mining Difficulty
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-green-500/20">
              <Zap className="h-6 w-6 text-green-400" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                {miningStats?.networkhashps
                  ? formatHashRate(miningStats.networkhashps)
                  : 'N/A'}
              </div>
              <div className="text-blue-200 text-sm font-medium">Hash Rate</div>
              <div className="text-blue-300 text-xs mt-1">
                Network Hash Rate
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-red-500/20">
              <Coins className="h-6 w-6 text-red-400" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                {formatCryptoValue(networkStats?.circulatingSupply)}
              </div>
              <div className="text-blue-200 text-sm font-medium">
                Circulating Supply
              </div>
              <div className="text-blue-300 text-xs mt-1">
                Total VRSC Supply
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-blue-500/20">
              <Network className="h-6 w-6 text-blue-400" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                {pbaasChains.length}
              </div>
              <div className="text-blue-200 text-sm font-medium">
                PBaaS Chains
              </div>
              <div className="text-blue-300 text-xs mt-1">Live on Testnet</div>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Live Card - Latest Blocks & Mempool */}
      <UnifiedLiveCard className="mt-8" />

      {stakingStats && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <Coins className="h-5 w-5 mr-2" />
            Staking Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 h-16">
              <div className="p-2 rounded-lg bg-yellow-500/20 flex-shrink-0">
                <Clock className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-white font-semibold text-sm">
                  Network Stake
                </div>
                <div className="text-blue-200 text-sm">
                  {stakingStats.netstakeweight
                    ? formatFriendlyNumber(stakingStats.netstakeweight) +
                      ' VRSC'
                    : stakingStats.netstakeweight === 0
                      ? '0.00 VRSC'
                      : 'N/A'}
                </div>
                <div className="text-blue-300 text-xs mt-1">
                  Total Currently Staking
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 h-16">
              <div className="p-2 rounded-lg bg-green-500/20 flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-green-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-white font-semibold text-sm">
                  Staking APY
                </div>
                <div className="text-blue-200 text-sm">
                  {stakingStats.netstakeweight &&
                  stakingStats.netstakeweight > 0
                    ? (() => {
                        // Verus 50/50 PoS/PoW calculation
                        // Annual blocks: 525,600 (1 block per minute)
                        // Block reward: 6 VRSC (current testnet block reward)
                        // PoS gets 50% of rewards
                        const annualBlocks = 525600;
                        const blockReward = 6; // Current testnet block reward
                        const posRewardPercentage = 0.5; // 50% for PoS
                        const annualPosRewards =
                          annualBlocks * blockReward * posRewardPercentage;
                        const apy =
                          (annualPosRewards / stakingStats.netstakeweight) *
                          100;
                        return apy.toFixed(2) + '%';
                      })()
                    : 'N/A'}
                </div>
                <div className="text-blue-300 text-xs mt-1">
                  Annual Percentage Yield
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 h-16">
              <div className="p-2 rounded-lg bg-purple-500/20 flex-shrink-0">
                <Coins className="h-5 w-5 text-purple-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-white font-semibold text-sm">
                  Block Reward
                </div>
                <div className="text-blue-200 text-sm">6.00 VRSC</div>
                <div className="text-blue-300 text-xs mt-1">
                  Current Testnet Reward
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {networkStats?.valuePools && networkStats.valuePools.length > 0 && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Value Pools
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {networkStats.valuePools.map((pool, index) => (
              <div key={index} className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-white font-semibold capitalize">
                    {pool.id}
                  </div>
                  <div
                    className={`px-2 py-1 rounded text-xs ${
                      pool.monitored
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {pool.monitored ? 'Monitored' : 'Not Monitored'}
                  </div>
                </div>
                <div className="text-blue-200 text-sm">
                  Value: {pool.chainValue.toFixed(8)} VRSC
                </div>
                <div className="text-blue-300 text-xs">
                  Zat: {pool.chainValueZat.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pbaasChains && pbaasChains.length > 0 && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <Network className="h-5 w-5 mr-2" />
            PBaaS Chains
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pbaasChains.map((chain, index) => (
              <div key={index} className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-white font-semibold capitalize">
                    {chain.currencydefinition.name}
                  </div>
                  <div className="text-blue-200 text-sm">
                    Height: {chain.bestheight}
                  </div>
                </div>
                <div className="text-blue-300 text-xs">
                  Initial Supply: {chain.currencydefinition.initialsupply}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
