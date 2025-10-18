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
} from '@phosphor-icons/react';
import {
  formatCryptoValue,
  formatFriendlyNumber,
} from '@/lib/utils/number-formatting';
import { UTXOBubbleChart } from './charts/utxo-bubble-chart';
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

  const fetchLiveUTXOs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/verusid/${iaddr}/live-utxos`);
      const data = await response.json();

      if (data.success) {
        setLiveUTXOData(data.data);
      } else {
        setError(data.error || 'Failed to fetch UTXO data');
      }
    } catch (err: any) {
      console.error('Failed to fetch live UTXOs:', err.message);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [iaddr]);

  useEffect(() => {
    if (iaddr) {
      fetchLiveUTXOs();
    }
  }, [iaddr, fetchLiveUTXOs]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
        <div className="flex items-start space-x-3">
          <WarningCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <div className="text-red-400 font-semibold text-lg">
              Error Loading UTXO Data
            </div>
            <div className="text-red-300 text-sm mt-1">{error}</div>
            <button
              onClick={fetchLiveUTXOs}
              className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors flex items-center space-x-2"
            >
              <ArrowsClockwise className="h-4 w-4" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!liveUTXOData) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-12 text-center">
        <Database className="h-16 w-16 text-blue-300 mx-auto mb-4 opacity-50" />
        <h3 className="text-xl font-semibold mb-2">No UTXO Data Available</h3>
        <p className="text-blue-200">
          Unable to load UTXO information for this identity.
        </p>
      </div>
    );
  }

  const hybridUTXOHealth = {
    total: liveUTXOData.total || 0,
    eligible: liveUTXOData.eligible || 0,
    cooldown: liveUTXOData.cooldown || 0,
    cooldownValueVRSC: liveUTXOData.cooldownValueVRSC || 0,
    totalValueVRSC: liveUTXOData.totalValueVRSC || 0,
    eligibleValueVRSC: liveUTXOData.eligibleValueVRSC || 0,
    largestUtxoVRSC: liveUTXOData.largestVRSC || 0,
    smallestEligibleVRSC: liveUTXOData.smallestEligibleVRSC || 0,
    sizeDistribution: liveUTXOData.sizeDistribution || null,
    fragmentationScore:
      liveUTXOData.fragmentationScore ||
      (liveUTXOData.total > 100
        ? 'high'
        : liveUTXOData.total > 50
          ? 'medium'
          : 'low'),
    consolidationRecommended:
      liveUTXOData.consolidationRecommended || liveUTXOData.total > 200,
    efficiency:
      liveUTXOData.total > 0
        ? (liveUTXOData.eligible / liveUTXOData.total) * 100
        : 0,
  };

  const sizeDistribution = hybridUTXOHealth.sizeDistribution || {
    tiny: { count: 0, valueVRSC: 0 },
    small: { count: 0, valueVRSC: 0 },
    medium: { count: 0, valueVRSC: 0 },
    large: { count: 0, valueVRSC: 0 },
  };

  const utxoDistributionOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      textStyle: { color: '#fff' },
      formatter: (params: any) => {
        const data = params.data;
        const percentage = params.percent;
        return `${data.name}<br/>Value: ${data.value.toFixed(2)} VRSC<br/>Percentage: ${percentage}%<br/>Count: ${data.count} UTXOs`;
      },
    },
    series: [
      {
        name: 'UTXO Value Distribution',
        type: 'pie',
        radius: ['40%', '70%'],
        data: [
          {
            value: hybridUTXOHealth.eligibleValueVRSC || 0,
            name: 'Eligible',
            count: hybridUTXOHealth.eligible,
            itemStyle: { color: '#10b981' },
          },
          {
            value: hybridUTXOHealth.cooldownValueVRSC || 0,
            name: 'Cooldown',
            count: hybridUTXOHealth.cooldown,
            itemStyle: { color: '#f59e0b' },
          },
          {
            value:
              (hybridUTXOHealth.totalValueVRSC || 0) -
              (hybridUTXOHealth.eligibleValueVRSC || 0) -
              (hybridUTXOHealth.cooldownValueVRSC || 0),
            name: 'Inactive',
            count:
              hybridUTXOHealth.total -
              hybridUTXOHealth.eligible -
              hybridUTXOHealth.cooldown,
            itemStyle: { color: '#6b7280' },
          },
        ],
        label: {
          formatter: '{b}: {d}%',
          color: '#fff',
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Header with Live Indicator */}
      <div className="bg-gradient-to-r from-verus-blue/20 to-verus-green/20 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2 flex items-center space-x-3">
              <Database className="h-7 w-7 text-blue-400" />
              <span>UTXO Analytics</span>
            </h3>
            <p className="text-sm text-blue-200">
              Real-time unspent transaction output analysis
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-sm bg-green-500/20 px-3 py-1.5 rounded-lg border border-green-500/30">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-green-300 font-medium">Live Data</span>
            </div>
            <button
              onClick={fetchLiveUTXOs}
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white"
            >
              <ArrowsClockwise className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main UTXO Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* UTXO Distribution Chart */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
          <h5 className="text-lg font-semibold text-white mb-4">
            UTXO Value Distribution
          </h5>
          <ReactEChartsCore
            echarts={echarts}
            option={utxoDistributionOption}
            style={{ height: '300px' }}
          />
        </div>

        {/* Basic Stats */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
          <h5 className="text-lg font-semibold text-white mb-4">
            Health Metrics
          </h5>
          <div className="space-y-3">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div className="text-blue-200 text-sm">Total UTXOs</div>
                <div className="text-2xl font-bold text-white">
                  {hybridUTXOHealth.total}
                </div>
              </div>
            </div>
            <div className="bg-green-500/20 rounded-lg p-4 border border-green-500/30">
              <div className="flex justify-between items-center">
                <div className="text-green-200 text-sm">Eligible</div>
                <div className="text-2xl font-bold text-green-400">
                  {hybridUTXOHealth.eligible}
                </div>
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div className="text-blue-200 text-sm">Total Value</div>
                <div className="text-lg font-bold text-white">
                  {formatFriendlyNumber(hybridUTXOHealth.totalValueVRSC, {
                    precision: 2,
                  })}{' '}
                  VRSC
                </div>
              </div>
            </div>
            <div className="bg-verus-teal/20 rounded-lg p-4 border border-yellow-500/30">
              <div className="flex justify-between items-center">
                <div className="text-yellow-200 text-sm">Efficiency</div>
                <div className="text-2xl font-bold text-verus-teal">
                  {hybridUTXOHealth.efficiency.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Metrics */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
          <h5 className="text-lg font-semibold text-white mb-4">
            Advanced Metrics
          </h5>
          <div className="space-y-3">
            <div className="bg-verus-blue/20 rounded-lg p-4 border border-verus-blue/30">
              <div className="flex justify-between items-center">
                <div className="text-purple-200 text-sm">Largest UTXO</div>
                <div className="text-lg font-bold text-verus-blue">
                  {hybridUTXOHealth.largestUtxoVRSC
                    ? formatFriendlyNumber(hybridUTXOHealth.largestUtxoVRSC, {
                        precision: 2,
                      }) + ' VRSC'
                    : 'N/A'}
                </div>
              </div>
            </div>
            <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-500/30">
              <div className="flex justify-between items-center">
                <div className="text-blue-200 text-sm">Smallest Eligible</div>
                <div className="text-lg font-bold text-blue-400">
                  {hybridUTXOHealth.smallestEligibleVRSC
                    ? hybridUTXOHealth.smallestEligibleVRSC < 0.01
                      ? `${hybridUTXOHealth.smallestEligibleVRSC.toFixed(3)} VRSC`
                      : formatFriendlyNumber(
                          hybridUTXOHealth.smallestEligibleVRSC,
                          { precision: 2 }
                        ) + ' VRSC'
                    : 'N/A'}
                </div>
              </div>
            </div>
            <div className="bg-verus-cyan/20 rounded-lg p-4 border border-orange-500/30">
              <div className="flex justify-between items-center">
                <div className="text-orange-200 text-sm">Avg UTXO Size</div>
                <div className="text-lg font-bold text-verus-cyan">
                  {formatFriendlyNumber(
                    hybridUTXOHealth.totalValueVRSC /
                      (hybridUTXOHealth.total || 1),
                    { precision: 2 }
                  )}{' '}
                  VRSC
                </div>
              </div>
            </div>
            <div className="bg-red-500/20 rounded-lg p-4 border border-red-500/30">
              <div className="flex justify-between items-center">
                <div className="text-red-200 text-sm">Cooldown UTXOs</div>
                <div className="text-lg font-bold text-red-400">
                  {hybridUTXOHealth.cooldown || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive UTXO Bubble Chart */}
      {liveUTXOData && liveUTXOData.utxos && liveUTXOData.utxos.length > 0 && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
          <h5 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-verus-blue" />
            Interactive UTXO Visualizer
            <span className="text-xs text-green-300 bg-green-500/20 px-2 py-1 rounded border border-green-500/30">
              Live Data
            </span>
          </h5>
          <div className="bg-gray-900/50 rounded-lg p-6">
            <UTXOBubbleChart
              utxos={liveUTXOData.utxos.map((u: any) => ({
                value: u.valueVRSC || 0,
                confirmations: u.confirmations || 0,
                status: u.status || 'inactive',
                txid: u.txid,
              }))}
              width={900}
              height={400}
            />
          </div>
          <div className="mt-4 text-center text-sm text-gray-400">
            Bubble size represents UTXO value • Hover for details
          </div>
        </div>
      )}

      {/* UTXO Size Distribution */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
        <h5 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-400" />
          UTXO Size Distribution
          {hybridUTXOHealth.sizeDistribution ? (
            <span className="text-xs text-green-300 bg-green-500/20 px-2 py-1 rounded border border-green-500/30">
              Live Data
            </span>
          ) : (
            <span className="text-xs text-gray-400 bg-gray-500/20 px-2 py-1 rounded">
              Loading...
            </span>
          )}
        </h5>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <ReactEChartsCore
              echarts={echarts}
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
                  left: '3%',
                  right: '4%',
                  bottom: '3%',
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
                  axisLabel: { color: '#888' },
                },
                yAxis: [
                  {
                    type: 'value',
                    name: 'Count',
                    axisLine: { lineStyle: { color: '#3165d4' } },
                    splitLine: {
                      lineStyle: { color: 'rgba(49, 101, 212, 0.1)' },
                    },
                  },
                  {
                    type: 'value',
                    name: 'VRSC Value',
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
              style={{ height: '300px' }}
            />
          </div>

          {/* UTXO Optimization Recommendations */}
          <div className="space-y-4">
            <h6 className="text-md font-semibold text-white">
              Optimization Analysis
            </h6>

            {/* Fragmentation Score */}
            <div className="bg-gradient-to-r from-verus-blue/20 to-verus-green/20 rounded-lg p-4 border border-blue-500/30">
              <div className="flex justify-between items-center mb-2">
                <div className="text-blue-200 text-sm">Fragmentation Score</div>
                <div className="text-xl font-bold text-blue-400">
                  {hybridUTXOHealth.fragmentationScore === 'high'
                    ? 'High'
                    : hybridUTXOHealth.fragmentationScore === 'medium'
                      ? 'Medium'
                      : 'Low'}
                </div>
              </div>
              <div className="text-xs text-blue-300">
                {hybridUTXOHealth.fragmentationScore === 'high'
                  ? 'Consider consolidating UTXOs for better staking efficiency'
                  : 'Good UTXO distribution for optimal staking'}
              </div>
            </div>

            {/* Staking Power */}
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-4 border border-green-500/30">
              <div className="flex justify-between items-center mb-2">
                <div className="text-green-200 text-sm">Staking Power</div>
                <div className="text-xl font-bold text-green-400">
                  {hybridUTXOHealth.efficiency > 90
                    ? 'Excellent'
                    : hybridUTXOHealth.efficiency > 70
                      ? 'Good'
                      : 'Fair'}
                </div>
              </div>
              <div className="text-xs text-green-300">
                {hybridUTXOHealth.eligible} of {hybridUTXOHealth.total} UTXOs
                ready to stake
              </div>
            </div>

            {/* Consolidation Recommendation */}
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-4 border border-yellow-500/30">
              <div className="flex justify-between items-center mb-2">
                <div className="text-yellow-200 text-sm">Recommendation</div>
                <div className="text-sm font-bold text-verus-teal">
                  {hybridUTXOHealth.consolidationRecommended
                    ? 'Consolidate'
                    : 'Maintain'}
                </div>
              </div>
              <div className="text-xs text-yellow-300">
                {hybridUTXOHealth.consolidationRecommended
                  ? 'Consider combining small UTXOs to reduce transaction fees'
                  : 'Current UTXO distribution is optimal for staking'}
              </div>
            </div>

            {/* Value Concentration */}
            <div className="bg-gradient-to-r from-verus-blue/20 to-verus-green/20 rounded-lg p-4 border border-verus-blue/30">
              <div className="flex justify-between items-center mb-2">
                <div className="text-purple-200 text-sm">
                  Value Concentration
                </div>
                <div className="text-lg font-bold text-verus-blue">
                  {hybridUTXOHealth.largestUtxoVRSC &&
                  hybridUTXOHealth.totalValueVRSC
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
                {hybridUTXOHealth.largestUtxoVRSC &&
                hybridUTXOHealth.totalValueVRSC
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
  );
}
