'use client';

import { useState, useEffect, useCallback } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import {
  Database,
  Target,
  ArrowsClockwise,
  WarningCircle,
  TrendUp,
  ChartBar,
} from '@phosphor-icons/react';
import {
  formatCryptoValue,
  formatFriendlyNumber,
} from '@/lib/utils/number-formatting';
import { AdvancedUTXOVisualizer } from './charts/advanced-utxo-visualizer';
import { DashboardSkeleton } from './animations/skeleton-loader';

// Register ECharts components
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

interface UTXOAnalyticsProps {
  iaddr: string;
}

export function VerusIDUTXOAnalytics({ iaddr }: UTXOAnalyticsProps) {
  const [liveUTXOData, setLiveUTXOData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hybridUTXOHealth, setHybridUTXOHealth] = useState<any>(null);
  const [chartError, setChartError] = useState(false);

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

  const sizeDistribution = hybridUTXOHealth?.sizeDistribution || {
    tiny: { count: 0, valueVRSC: 0 },
    small: { count: 0, valueVRSC: 0 },
    medium: { count: 0, valueVRSC: 0 },
    large: { count: 0, valueVRSC: 0 },
  };

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
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-green-300 font-medium">Live Data</span>
            </div>
            <button
              onClick={fetchLiveUTXOs}
              className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200 text-white hover:scale-105"
            >
              <ArrowsClockwise className="h-4 w-4" />
              <span className="font-medium text-sm sm:text-base">Refresh</span>
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
                <div className="w-2 h-2 rounded-full bg-white opacity-95"></div>
                <span className="text-gray-300">100K+</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded">
                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                <span className="text-gray-300">10K-100K</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded">
                <div className="w-2 h-2 rounded-full bg-yellow-600"></div>
                <span className="text-gray-300">1K-10K</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="text-gray-300">100-1K</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded">
                <div className="w-2 h-2 rounded-full bg-orange-600"></div>
                <span className="text-gray-300">10-100</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-gray-300">1-10</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-red-900/30 border border-gray-600 rounded">
                <div className="w-2 h-2 rounded-full bg-gray-500"></div>
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

      {/* Secondary Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column - Size Distribution Chart (2/3 width) */}
        <div className="xl:col-span-2 space-y-4 sm:space-y-6 min-w-0">
          {/* UTXO Size Distribution Chart */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4 sm:p-6">
            <div className="mb-4 sm:mb-6">
              <h4 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 sm:gap-3">
                <ChartBar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                <span>UTXO Size Distribution</span>
              </h4>
            </div>

            <div className="w-full relative">
              {chartError ? (
                <div className="h-[300px] flex items-center justify-center bg-red-500/10 rounded-lg border border-red-500/30">
                  <div className="text-center p-4">
                    <WarningCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                    <p className="text-red-300 text-sm">Chart failed to load</p>
                    <button
                      onClick={() => setChartError(false)}
                      className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              ) : (
                <ReactEChartsCore
                  echarts={echarts}
                  onEvents={{
                    error: () => setChartError(true),
                  }}
                  option={{
                    tooltip: {
                      trigger: 'axis',
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      textStyle: { color: '#fff' },
                    },
                    legend: {
                      data: ['UTXO Count', 'Total Value'],
                      textStyle: { color: '#fff' },
                      top: 10,
                    },
                    grid: {
                      left: '10%',
                      right: '10%',
                      bottom: '15%',
                      top: '20%',
                      containLabel: true,
                    },
                    xAxis: {
                      type: 'category',
                      data: [
                        '0-10 VRSC',
                        '10-100 VRSC',
                        '100-1000 VRSC',
                        '1000+ VRSC',
                      ],
                      axisLine: { lineStyle: { color: '#3165d4' } },
                      axisLabel: { color: '#888', fontSize: 10 },
                    },
                    yAxis: [
                      {
                        type: 'value',
                        name: 'Count',
                        position: 'left',
                        axisLine: { lineStyle: { color: '#3165d4' } },
                        splitLine: {
                          lineStyle: { color: 'rgba(49, 101, 212, 0.1)' },
                        },
                      },
                      {
                        type: 'value',
                        name: 'VRSC Value',
                        position: 'right',
                        axisLine: { lineStyle: { color: '#ef4444' } },
                        splitLine: { show: false },
                      },
                    ],
                    series: [
                      {
                        name: 'UTXO Count',
                        type: 'bar',
                        data: [
                          sizeDistribution.tiny.count,
                          sizeDistribution.small.count,
                          sizeDistribution.medium.count,
                          sizeDistribution.large.count,
                        ],
                        itemStyle: { color: '#3165d4' },
                      },
                      {
                        name: 'Total Value',
                        type: 'line',
                        yAxisIndex: 1,
                        data: [
                          sizeDistribution.tiny.valueVRSC,
                          sizeDistribution.small.valueVRSC,
                          sizeDistribution.medium.valueVRSC,
                          sizeDistribution.large.valueVRSC,
                        ],
                        itemStyle: { color: '#ef4444' },
                        smooth: true,
                      },
                    ],
                  }}
                  style={{ height: '300px', width: '100%' }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Analysis & Legend (1/3 width) */}
        <div className="space-y-4 sm:space-y-6 min-w-0">
          {/* Optimization Analysis */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4 sm:p-6 overflow-hidden">
            <h4 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
              Optimization Analysis
            </h4>

            <div className="space-y-3 sm:space-y-4">
              {/* Fragmentation Score */}
              <div className="bg-gradient-to-r from-verus-blue/20 to-verus-green/20 rounded-lg p-3 sm:p-4 border border-blue-500/30">
                <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                  <div className="text-blue-200 text-xs sm:text-sm truncate">
                    Fragmentation Score
                  </div>
                  <div className="text-base sm:text-lg font-bold text-blue-400 flex-shrink-0 ml-2">
                    {hybridUTXOHealth?.fragmentationScore === 'high'
                      ? 'High'
                      : hybridUTXOHealth?.fragmentationScore === 'medium'
                        ? 'Medium'
                        : 'Low'}
                  </div>
                </div>
                <div className="text-xs text-blue-300">
                  {hybridUTXOHealth?.fragmentationScore === 'high'
                    ? 'Consider consolidating UTXOs'
                    : 'Good UTXO distribution'}
                </div>
              </div>

              {/* Staking Power */}
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-3 sm:p-4 border border-green-500/30">
                <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                  <div className="text-green-200 text-xs sm:text-sm truncate">
                    Staking Power
                  </div>
                  <div className="text-base sm:text-lg font-bold text-green-400 flex-shrink-0 ml-2">
                    {(hybridUTXOHealth?.efficiency || 0) > 90
                      ? 'Excellent'
                      : (hybridUTXOHealth?.efficiency || 0) > 70
                        ? 'Good'
                        : 'Fair'}
                  </div>
                </div>
                <div className="text-xs text-green-300">
                  {hybridUTXOHealth?.eligible || 0} of{' '}
                  {hybridUTXOHealth?.total || 0} UTXOs ready to stake
                </div>
              </div>

              {/* Recommendation */}
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-3 sm:p-4 border border-yellow-500/30">
                <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                  <div className="text-yellow-200 text-xs sm:text-sm truncate">
                    Recommendation
                  </div>
                  <div className="text-sm font-bold text-verus-teal flex-shrink-0 ml-2">
                    {hybridUTXOHealth?.consolidationRecommended
                      ? 'Consolidate'
                      : 'Maintain'}
                  </div>
                </div>
                <div className="text-xs text-yellow-300">
                  {hybridUTXOHealth?.consolidationRecommended
                    ? 'Consider combining small UTXOs'
                    : 'Current distribution is optimal'}
                </div>
              </div>

              {/* Value Concentration */}
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-3 sm:p-4 border border-purple-500/30">
                <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                  <div className="text-purple-200 text-xs sm:text-sm truncate">
                    Value Concentration
                  </div>
                  <div className="text-base sm:text-lg font-bold text-purple-400 flex-shrink-0 ml-2">
                    {hybridUTXOHealth?.largestUtxoVRSC &&
                    hybridUTXOHealth?.totalValueVRSC
                      ? (
                          (hybridUTXOHealth.largestUtxoVRSC /
                            hybridUTXOHealth.totalValueVRSC) *
                          100
                        ).toFixed(1)
                      : '0.0'}
                    %
                  </div>
                </div>
                <div className="text-xs text-purple-300">
                  Largest UTXO contains{' '}
                  {hybridUTXOHealth?.largestUtxoVRSC &&
                  hybridUTXOHealth?.totalValueVRSC
                    ? (
                        (hybridUTXOHealth.largestUtxoVRSC /
                          hybridUTXOHealth.totalValueVRSC) *
                        100
                      ).toFixed(1)
                    : '0.0'}
                  % of total value
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
