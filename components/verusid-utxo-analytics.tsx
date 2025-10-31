'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Database,
  Target,
  ArrowsClockwise,
  WarningCircle,
  TrendUp,
} from '@phosphor-icons/react';
import {
  formatCryptoValue,
  formatFriendlyNumber,
} from '@/lib/utils/number-formatting';
import { AdvancedUTXOVisualizer } from './charts/advanced-utxo-visualizer';
import { DashboardSkeleton } from './animations/skeleton-loader';

interface UTXOAnalyticsProps {
  iaddr: string;
}

export function VerusIDUTXOAnalytics({
  iaddr,
}: UTXOAnalyticsProps) {
  const tCommon = useTranslations('common');
  const t = useTranslations('dashboard');
  const tBlocks = useTranslations('blocks');
  const tVerusId = useTranslations('verusid');
  const tStaking = useTranslations('staking');
  const [liveUTXOData, setLiveUTXOData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hybridUTXOHealth, setHybridUTXOHealth] = useState<any>(null);

  const fetchLiveUTXOs = useCallback(async () => {
    if (!iaddr) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/verusid/utxo-analytics/${iaddr}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setLiveUTXOData(data);
      setHybridUTXOHealth(data.health || {});
    } catch (err) {
      console.error('Error fetching UTXO data:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch UTXO data'
      );
    } finally {
      setLoading(false);
    }
  }, [iaddr]);

  useEffect(() => {
    fetchLiveUTXOs();
  }, [fetchLiveUTXOs]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-500/10 backdrop-blur-sm rounded-2xl p-8 border border-red-500/20">
        <div className="flex items-center space-x-3">
          <WarningCircle className="h-6 w-6 text-red-400" />
          <div>
            <h3 className="text-lg font-bold text-red-400">Connection Error</h3>
            <p className="text-slate-300 text-sm mt-1">
              Unable to connect to the blockchain network. Please check your
              connection and try again.
            </p>
            <button
              onClick={fetchLiveUTXOs}
              className="mt-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-verus-blue/20 to-verus-green/20 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-blue-500/30">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 flex items-center space-x-3">
              <Database className="h-6 w-6 sm:h-7 sm:w-7 text-blue-400 flex-shrink-0" />
              <span>UTXO Analytics</span>
            </h3>
            <p className="text-sm sm:text-base text-blue-200/90 ml-9 sm:ml-10">
              Real-time unspent transaction output analysis and optimization
              insights
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center space-x-2 text-xs sm:text-sm bg-green-500/20 px-3 sm:px-4 py-2 rounded-xl border border-green-500/30">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-300 font-medium">Live Data</span>
            </div>
            <button
              onClick={fetchLiveUTXOs}
              className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200 text-white hover:scale-105"
            >
              <ArrowsClockwise className="h-4 w-4" />
              <span className="font-medium text-sm sm:text-base">{tCommon("refresh")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-2xl font-bold text-white mb-1">
            {hybridUTXOHealth?.total || 0}
          </div>
          <div className="text-xs sm:text-sm text-slate-300 font-medium">
            Total UTXOs
          </div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-2xl font-bold text-orange-400 mb-1">
            {hybridUTXOHealth?.highValue || 0}
          </div>
          <div className="text-xs sm:text-sm text-slate-300 font-medium">
            High-Value
          </div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-2xl font-bold text-green-400 mb-1">
            {hybridUTXOHealth?.eligible || 0}
          </div>
          <div className="text-xs sm:text-sm text-slate-300 font-medium">
            Eligible
          </div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-2xl font-bold text-yellow-400 mb-1">
            {hybridUTXOHealth?.cooldown || 0}
          </div>
          <div className="text-xs sm:text-sm text-slate-300 font-medium">
            Cooldown
          </div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-2xl font-bold text-blue-400 mb-1">
            {formatFriendlyNumber(hybridUTXOHealth?.totalValueVRSC || 0, {
              precision: 1,
            })}
          </div>
          <div className="text-xs sm:text-sm text-slate-300 font-medium">
            Value (VRSC)
          </div>
        </div>
      </div>

      {/* Interactive UTXO Visualizer - Full Width Horizontal Card */}
      {liveUTXOData?.utxos && liveUTXOData.utxos.length > 0 ? (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4 sm:p-6 w-full overflow-hidden">
          <div className="mb-4 sm:mb-6">
            <h4 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-verus-blue/20 rounded-lg border border-verus-blue/30">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 text-verus-blue" />
              </div>
              <span>Interactive UTXO Visualizer</span>
            </h4>
          </div>

          <div className="bg-gray-900/50 rounded-xl p-2 sm:p-4 mb-4 w-full overflow-x-auto overflow-y-hidden">
            <div style={{ minWidth: '800px', width: '100%' }}>
              <AdvancedUTXOVisualizer
                utxos={liveUTXOData.utxos.map((u: any) => ({
                  value: u.value || 0,
                  valueVRSC: u.valueVRSC,
                  confirmations: u.confirmations || 0,
                  status: u.status || 'inactive',
                  txid: u.txid || '',
                  blockTime: u.blockTime || '',
                  isStakeInput: Boolean(u.isStakeInput),
                  isStakeOutput: Boolean(u.isStakeOutput),
                  isHighValue: Boolean(u.isHighValue),
                  isMediumValue: Boolean(u.isMediumValue),
                  isEligibleForStaking: Boolean(u.isEligibleForStaking),
                  earnedAmount: u.earnedAmount,
                  stakeReward: u.stakeReward || 3,
                }))}
                width={900}
                height={500}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-center text-xs sm:text-sm text-gray-400/80 font-medium">
              Bubble size represents UTXO value • Hover for details
            </div>

            {/* Quick Value Tier Reference */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded">
                <div className="w-2 h-2 rounded-full bg-white opacity-95" />
                <span className="text-gray-300">100K+</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="text-gray-300">10K-100K</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded">
                <div className="w-2 h-2 rounded-full bg-yellow-600" />
                <span className="text-gray-300">1K-10K</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-gray-300">100-1K</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded">
                <div className="w-2 h-2 rounded-full bg-orange-600" />
                <span className="text-gray-300">10-100</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-gray-300">1-10</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-red-900/30 border border-gray-600 rounded">
                <div className="w-2 h-2 rounded-full bg-gray-500" />
                <span className="text-gray-400">&lt;1 (Low Chance Zone)</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 sm:p-8 w-full overflow-hidden">
          <div className="text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 bg-slate-700/50 rounded-full flex items-center justify-center">
              <Database className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400" />
            </div>
            <h5 className="text-base sm:text-lg font-semibold text-white mb-2">
              No UTXOs Found
            </h5>
            <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto">
              This identity address currently has no unspent transaction
              outputs. UTXOs will appear here once transactions are received or
              created.
            </p>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4 sm:p-6 overflow-hidden">
        <h4 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 text-center">
          How to Read This
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="space-y-2 sm:space-y-3 min-w-0">
            <h5 className="text-xs sm:text-sm font-semibold text-slate-300 mb-1.5 sm:mb-2">
              Visualization Layout
            </h5>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1 flex-shrink-0">•</span>
                <span>Left side: UTXOs by value (small to large)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-1 flex-shrink-0">•</span>
                <span>Middle: Cooldown zone - waiting to stake</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400 mt-1 flex-shrink-0">•</span>
                <span>Right: Low chance zone (&lt;1 VRSC)</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2 sm:space-y-3 min-w-0">
            <h5 className="text-xs sm:text-sm font-semibold text-slate-300 mb-1.5 sm:mb-2">
              Interaction
            </h5>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1 flex-shrink-0">•</span>
                <span>Hover: See detailed UTXO info</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1 flex-shrink-0">•</span>
                <span>Numbers: UTXO count in that spot</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2 sm:space-y-3 min-w-0">
            <h5 className="text-xs sm:text-sm font-semibold text-slate-300 mb-1.5 sm:mb-2">
              Navigation
            </h5>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-1 flex-shrink-0">•</span>
                <span>Click and drag: Pan around</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-400 mt-1 flex-shrink-0">•</span>
                <span>Double-click: Reset zoom</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1 flex-shrink-0">•</span>
                <span>View options: Switch visualizations</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
