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
  Medal,
  TrendUp,
  Pulse,
  Lightning,
  Database,
  Calendar,
  Trophy,
  Target,
  CaretDown,
  CaretRight,
  ArrowsClockwise,
  WarningCircle,
  DownloadSimple,
  ShareNetwork,
  ChartBar,
  GlobeHemisphereWest,
} from '@phosphor-icons/react';
import {
  formatCryptoValue,
  formatFriendlyNumber,
} from '@/lib/utils/number-formatting';
import { NetworkParticipationData, StakingMomentumData } from './types';
import { ProfessionalAchievementProgress } from './professional-achievement-progress';
import { Badge } from '@/components/ui/badge';
import { useRealtimeEvents } from '@/lib/hooks/use-realtime-events';
import { AnimatedCounter } from './animations/counter-animation';
import { SparklineChart } from './animations/sparkline-chart';
import { HealthScoreGauge } from './animations/health-score-gauge';
import { HeatmapCalendar } from './charts/heatmap-calendar';
import { UTXOBubbleChart } from './charts/utxo-bubble-chart';
// import { NetworkComparisonCard } from './network-comparison-card'; // REMOVED: Component not needed
import { StakingReportExporter } from './staking-report-exporter';
import { DashboardSkeleton } from './animations/skeleton-loader';
import { VerusIDLoadingWithSync } from './verusid-loading-with-sync';

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

interface DashboardProps {
  iaddr: string;
  layout?: 'full' | 'compact';
  verusID?: string; // Add VerusID prop for better error handling
}

export function VerusIDStakingDashboard({
  iaddr,
  layout = 'full',
  verusID,
}: DashboardProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['hero', 'performance', 'overview'])
  );
  const [liveUTXOData, setLiveUTXOData] = useState<any>(null);
  const [achievements, setAchievements] = useState<any>(null);
  const [networkParticipation, setNetworkParticipation] = useState<NetworkParticipationData | null>(null);
  const [stakingMomentum, setStakingMomentum] = useState<StakingMomentumData | null>(null);

  // Real-time events for live updates
  const {
    connected: realtimeConnected,
    lastBlock,
    lastTransaction,
  } = useRealtimeEvents({
    onNewBlock: () => {
      // Refresh data when new blocks arrive
      fetchStats();
      fetchLiveUTXOs();
      fetchNetworkParticipation();
      fetchStakingMomentum();
    },
    onNewTransaction: () => {
      // Could check if transaction involves this VerusID
    },
  });

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/verusid/${iaddr}/staking-stats`);
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.error || 'Failed to fetch statistics');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [iaddr]);

  const fetchLiveUTXOs = useCallback(async () => {
    try {
      const response = await fetch(`/api/verusid/${iaddr}/live-utxos`);
      const data = await response.json();

      if (data.success) {
        // Store live UTXO data for hybrid approach
        setLiveUTXOData(data.data);
      }
    } catch (err: any) {
      // Silent error handling
    }
  }, [iaddr]);

  const fetchAchievements = useCallback(async () => {
    try {
      const response = await fetch(`/api/verusid/${iaddr}/achievements`);
      const data = await response.json();

      if (data.success) {
        setAchievements(data.data);
      }
    } catch (err: any) {
      // Silent error handling
    }
  }, [iaddr]);

  const fetchNetworkParticipation = useCallback(async () => {
    try {
      const response = await fetch(`/api/verusid/${iaddr}/network-participation-simple`);
      const data = await response.json();

      if (data.success) {
        setNetworkParticipation(data.data);
      }
    } catch (err: any) {
      // Silent error handling
    }
  }, [iaddr]);

  const fetchStakingMomentum = useCallback(async () => {
    try {
      const response = await fetch(`/api/verusid/${iaddr}/staking-momentum-simple`);
      const data = await response.json();

      if (data.success) {
        setStakingMomentum(data.data);
      }
    } catch (err: any) {
      // Silent error handling
    }
  }, [iaddr]);

  // Fetch all data when iaddr changes
  useEffect(() => {
    if (!iaddr) return;
    
    fetchStats();
    fetchLiveUTXOs();
    fetchAchievements();
    fetchNetworkParticipation();
    fetchStakingMomentum();
  }, [iaddr, fetchStats, fetchLiveUTXOs, fetchAchievements, fetchNetworkParticipation, fetchStakingMomentum]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    // Check if this is a "not synced" error and we have VerusID info
    if (
      error.includes('not been synced') ||
      error.includes('Statistics not found')
    ) {
      // Show the enhanced loading component with auto-sync
      return (
        <VerusIDLoadingWithSync
          verusID={verusID || iaddr}
          iaddr={iaddr}
          onSyncComplete={() => {
            // Refresh the dashboard after sync completes
            fetchStats();
          }}
          onSyncError={syncError => {
            setError(`Sync failed: ${syncError}`);
          }}
        />
      );
    }

    // For other errors, show the traditional error UI
    return (
      <div className="bg-red-500/10 backdrop-blur-sm rounded-2xl p-8 border border-red-500/20">
        <div className="flex items-start space-x-4">
          <WarningCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-red-400 font-semibold text-lg mb-2">
              Error Loading Statistics
            </h3>
            <p className="text-red-300 text-sm mb-4">{error}</p>
            <button
              onClick={fetchStats}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white text-sm font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  // Use real data from API
  const utxoHealth = stats.utxoHealth || {};
  const monthlyData = stats.timeSeries?.monthly;

  // Create hybrid UTXO health data (database + live)
  const hybridUTXOHealth = {
    // Use LIVE data for current state (most accurate)
    total: liveUTXOData?.total || utxoHealth.total,
    eligible: liveUTXOData?.eligible || utxoHealth.eligible,
    cooldown: liveUTXOData?.cooldown || utxoHealth.cooldown,
    cooldownValueVRSC: liveUTXOData?.cooldownValueVRSC || 0,
    totalValueVRSC: liveUTXOData?.totalValueVRSC || utxoHealth.totalValueVRSC,
    eligibleValueVRSC:
      liveUTXOData?.eligibleValueVRSC || utxoHealth.eligibleValueVRSC,

    // Use LIVE data for current UTXO details
    largestUtxoVRSC: liveUTXOData?.largestVRSC || utxoHealth.largestUtxoVRSC,
    smallestEligibleVRSC:
      liveUTXOData?.smallestEligibleVRSC || utxoHealth.smallestEligibleVRSC,
    sizeDistribution: liveUTXOData?.sizeDistribution || null,

    // Use DATABASE data for historical efficiency (more stable)
    efficiency: utxoHealth.efficiency,

    // Use LIVE data for real-time optimization metrics
    fragmentationScore:
      liveUTXOData?.fragmentationScore ||
      (utxoHealth.total > 100
        ? 'high'
        : utxoHealth.total > 50
          ? 'medium'
          : 'low'),
    consolidationRecommended:
      liveUTXOData?.consolidationRecommended || utxoHealth.total > 200,
  };

  // Use hybrid size distribution (live data preferred)
  const sizeDistribution =
    hybridUTXOHealth.sizeDistribution ||
    (() => {
      // For static mode without real data, show a message instead of wrong estimates
      return {
        tiny: { count: 0, valueVRSC: 0 },
        small: { count: 0, valueVRSC: 0 },
        medium: { count: 0, valueVRSC: 0 },
        large: { count: 0, valueVRSC: 0 },
      };
    })();

  const monthlyChartOption = {
    title: {
      text: `${monthlyData?.length || 0} Months of Staking History`,
      left: 'center',
      top: 5,
      textStyle: { color: '#888', fontSize: 12 },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      borderColor: '#3165d4',
      textStyle: { color: '#fff' },
      formatter: (params: any) => {
        const month = params[0].axisValue;
        const stakes = params[0].value;
        const rewards = params[1]?.value || 0;
        return `${month}<br/>Stakes: ${stakes}<br/>Rewards: ${rewards.toFixed(2)} VRSC`;
      },
    },
    legend: {
      data: ['Stakes', 'Rewards'],
      textStyle: { color: '#fff' },
      top: 25,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '20%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: monthlyData?.map((d: any) =>
        new Date(d.month).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        })
      ) || [],
      axisLine: { lineStyle: { color: '#3165d4' } },
      axisLabel: { rotate: 45, color: '#888' },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Stakes',
        axisLine: { lineStyle: { color: '#3165d4' } },
        splitLine: { lineStyle: { color: 'rgba(49, 101, 212, 0.1)' } },
      },
      {
        type: 'value',
        name: 'VRSC',
        axisLine: { lineStyle: { color: '#ef4444' } },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: 'Stakes',
        type: 'bar',
        data: monthlyData?.map((d: any) => d.stakeCount) || [],
        itemStyle: { color: '#3165d4' },
      },
      {
        name: 'Rewards',
        type: 'line',
        yAxisIndex: 1,
        data: monthlyData?.map((d: any) => d.totalRewardsVRSC) || [],
        itemStyle: { color: '#ef4444' },
        smooth: true,
        areaStyle: { opacity: 0.3 },
      },
    ],
    dataZoom: [
      { type: 'slider', start: 0, end: 100, bottom: 20 },
      { type: 'inside' },
    ],
  };

  // Use real daily data from API
  const dailyData = stats.timeSeries?.daily;

  const apyTrendOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      textStyle: { color: '#fff' },
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: dailyData?.slice(-30).map((d: any) =>
        new Date(d.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      ) || [],
      axisLine: { lineStyle: { color: '#60a5fa' } },
    },
    yAxis: {
      type: 'value',
      name: 'APY %',
      axisLine: { lineStyle: { color: '#60a5fa' } },
      splitLine: { lineStyle: { color: 'rgba(96, 165, 250, 0.1)' } },
    },
    series: [
      {
        name: 'APY',
        type: 'line',
        data: dailyData?.slice(-30).map((d: any) => d.apy || 0) || [],
        smooth: true,
        itemStyle: { color: '#10b981' },
        areaStyle: { color: 'rgba(16, 185, 129, 0.1)' },
      },
    ],
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
          color: '#fff',
          formatter: (params: any) => {
            return `${params.name}\n${params.data.value.toFixed(1)} VRSC`;
          },
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
      {/* Friendly Name Header */}
      {stats.friendlyName && (
        <div className="bg-gradient-to-r from-verus-blue/20 to-verus-green/20 backdrop-blur-sm rounded-2xl p-4 border border-verus-blue/30 text-center">
          <div className="flex items-center justify-center space-x-3">
            <Medal className="h-6 w-6 text-verus-blue" />
            <h3 className="text-2xl font-bold text-white">
              {stats.friendlyName}
            </h3>
          </div>
          <p className="text-verus-blue/80 text-sm mt-1">
            Comprehensive Staking Statistics
          </p>

          {/* Real-time Status Indicator */}
          <div className="flex items-center justify-center space-x-2 mt-3">
            <div
              className={`w-2 h-2 rounded-full ${realtimeConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}
            ></div>
            <span className="text-xs text-gray-300">
              {realtimeConnected
                ? 'Live Updates Active'
                : 'Real-time Disconnected'}
            </span>
            {lastBlock && (
              <span className="text-xs text-gray-400">• Block {lastBlock}</span>
            )}
          </div>
        </div>
      )}

      {/* Hero Stats - Enhanced with animations and sparklines */}
      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 backdrop-blur-sm rounded-2xl p-6 border border-verus-teal/20 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Rewards */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100"></div>
            <div className="relative bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-5 hover:border-yellow-500/50 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-verus-teal/20 rounded-lg">
                  <Medal className="h-6 w-6 text-verus-teal" />
                </div>
                {monthlyData && monthlyData.length > 0 && (
                  <SparklineChart
                    data={monthlyData
                      .slice(-30)
                      .map((d: any) => d.totalRewardsVRSC)}
                    width={60}
                    height={20}
                    trend="up"
                    color="#fbbf24"
                  />
                )}
              </div>
              <div className="text-4xl font-bold text-verus-teal mb-1">
                <AnimatedCounter
                  value={stats.summary.totalRewardsVRSC}
                  decimals={2}
                  duration={2000}
                />
              </div>
              <div className="text-sm text-blue-200">Total Rewards (VRSC)</div>
              {monthlyData && monthlyData.length >= 2 && (
                <div className="text-xs text-yellow-300 mt-2 flex items-center space-x-1">
                  <span>
                    +
                    {(
                      monthlyData?.[monthlyData.length - 1]?.totalRewardsVRSC || 0
                    ).toFixed(1)}{' '}
                    this month
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* APY */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100"></div>
            <div className="relative bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-5 hover:border-green-500/50 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <TrendUp className="h-6 w-6 text-green-400" />
                </div>
                {dailyData && dailyData.length > 0 && (
                  <SparklineChart
                    data={dailyData.slice(-30).map((d: any) => d.apy || 0)}
                    width={60}
                    height={20}
                    trend={
                      stats.trends.apy['30d'] === 'increasing'
                        ? 'up'
                        : stats.trends.apy['30d'] === 'decreasing'
                          ? 'down'
                          : 'neutral'
                    }
                    color="#10b981"
                  />
                )}
              </div>
              <div className="text-4xl font-bold text-green-400 mb-1">
                <AnimatedCounter
                  value={stats.summary.apyAllTime || 0}
                  decimals={2}
                  duration={2000}
                  suffix="%"
                />
              </div>
              <div className="text-sm text-blue-200">APY (All Time)</div>
              {stats.trends?.apy?.['30d'] && (
                <div
                  className={`text-xs mt-2 flex items-center space-x-1 ${
                    stats.trends.apy['30d'] === 'increasing'
                      ? 'text-green-300'
                      : stats.trends.apy['30d'] === 'decreasing'
                        ? 'text-red-300'
                        : 'text-gray-300'
                  }`}
                >
                  <span>
                    {stats.trends.apy['30d'] === 'increasing'
                      ? '↗'
                      : stats.trends.apy['30d'] === 'decreasing'
                        ? '↘'
                        : '→'}{' '}
                    {stats.trends.apy['30d']} (30d)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Total Stakes */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100"></div>
            <div className="relative bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-5 hover:border-blue-500/50 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Pulse className="h-6 w-6 text-blue-400" />
                </div>
                {monthlyData && monthlyData.length > 0 && (
                  <SparklineChart
                    data={monthlyData?.slice(-12).map((d: any) => d.stakeCount) || []}
                    width={60}
                    height={20}
                    trend="neutral"
                    color="#3165d4"
                  />
                )}
              </div>
              <div className="text-4xl font-bold text-blue-400 mb-1">
                <AnimatedCounter
                  value={stats.summary.totalStakes}
                  decimals={0}
                  duration={2000}
                  format="number"
                />
              </div>
              <div className="text-sm text-blue-200">Total Stakes</div>
              {monthlyData && monthlyData.length >= 2 && (
                <div className="text-xs text-blue-300 mt-2">
                  {monthlyData?.[monthlyData.length - 1]?.stakeCount || 0} this
                  month
                </div>
              )}
            </div>
          </div>

          {/* Network Rank */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-verus-blue/20 to-verus-green/20 rounded-xl blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100"></div>
            <div className="relative bg-gradient-to-br from-verus-blue/10 to-verus-green/10 border border-verus-blue/30 rounded-xl p-5 hover:border-verus-blue/50 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-verus-blue/20 rounded-lg">
                  <Trophy className="h-6 w-6 text-verus-blue" />
                </div>
                <div className="text-xs text-verus-blue bg-verus-blue/20 px-2 py-1 rounded">
                  Top {stats.rankings?.percentile?.toFixed(1) || '0.0'}%
                </div>
              </div>
              <div className="text-4xl font-bold text-verus-blue mb-1">
                #{stats.rankings?.network || 'N/A'}
              </div>
              <div className="text-sm text-blue-200">Network Rank</div>
              <div className="text-xs text-verus-blue/80 mt-2">
                {stats.rankings?.network
                  ? `Out of ${stats.rankings?.totalStakers || 'many'} stakers`
                  : 'Calculating...'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Performance Dashboard */}
      <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 backdrop-blur-sm rounded-2xl border border-blue-500/20 shadow-xl">
        <div className="p-6 border-b border-blue-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Lightning className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h4 className="text-xl font-semibold text-white">
                  Live Performance
                </h4>
                <p className="text-sm text-blue-200">
                  Real-time staking metrics
                </p>
              </div>
            </div>
            {liveUTXOData && (
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-green-300">Live</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Staking Efficiency */}
            <div className="flex flex-col items-center justify-center bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
              <HealthScoreGauge
                score={
                  hybridUTXOHealth.total > 0
                    ? (hybridUTXOHealth.eligible / hybridUTXOHealth.total) * 100
                    : 0
                }
                size={100}
                strokeWidth={8}
                showLabel={true}
              />
              <div className="text-sm text-blue-200 mt-3 text-center">
                Staking Efficiency
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {hybridUTXOHealth.eligible} / {hybridUTXOHealth.total} UTXOs
              </div>
            </div>

            {/* Network Participation Rate */}
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-6">
              <div className="flex items-center space-x-2 mb-4">
                <GlobeHemisphereWest className="h-5 w-5 text-green-400" />
                <h5 className="text-sm font-semibold text-white">
                  Network Participation
                </h5>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-400">Your Share</div>
                  <div className="text-lg font-bold text-green-400">
                    {networkParticipation ? (
                      networkParticipation.participationFormatted
                    ) : (
                      <div className="animate-pulse bg-green-400/20 rounded h-6 w-16"></div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">of Network Weight</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Expected Next Stake</div>
                  <div className="text-lg font-bold text-cyan-400">
                    {networkParticipation ? (
                      networkParticipation.expectedStakeTimeFormatted
                    ) : (
                      <div className="animate-pulse bg-cyan-400/20 rounded h-6 w-20"></div>
                    )}
                  </div>
                </div>

                {/* Additional Info */}
                <div className="mt-3 pt-3 border-t border-green-500/20">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-gray-400">Your Weight</div>
                      <div className="text-green-300 font-medium">
                        {networkParticipation ? (
                          `${networkParticipation.yourWeightFormatted || networkParticipation.yourWeight?.toFixed(2) || '0'} VRSC`
                        ) : (
                          <div className="animate-pulse bg-green-300/20 rounded h-4 w-12"></div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Network</div>
                      <div className="text-gray-300 font-medium">
                        {networkParticipation ? (
                          `${networkParticipation.networkWeightFormatted || networkParticipation.networkWeight?.toLocaleString() || '0'} VRSC`
                        ) : (
                          <div className="animate-pulse bg-gray-300/20 rounded h-4 w-12"></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Indicator */}
                {networkParticipation && (
                  <div className="mt-2 flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      networkParticipation.status === 'active' ? 'bg-green-400' :
                      networkParticipation.status === 'not_staking' ? 'bg-red-400' :
                      networkParticipation.status === 'data_unavailable' ? 'bg-orange-400' :
                      'bg-yellow-400'
                    }`}></div>
                    <span className="text-xs text-gray-400">
                      {networkParticipation.status === 'active' ? 'Active Staking' :
                       networkParticipation.status === 'not_staking' ? 'Not Staking' :
                       networkParticipation.status === 'data_unavailable' ? 'Network Data Unavailable' :
                       'Low Participation'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Staking Momentum */}
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-6">
              <div className="flex items-center space-x-2 mb-4">
                <TrendUp className="h-5 w-5 text-purple-400" />
                <h5 className="text-sm font-semibold text-white">
                  Staking Momentum
                </h5>
              </div>
              <div className="space-y-3">
                {stakingMomentum ? (
                  stakingMomentum.momentum ? (
                    <>
                      <div>
                        <div className="text-xs text-gray-400">Performance Trend</div>
                        <div className={`text-lg font-bold ${
                          stakingMomentum.momentum.color === 'green' ? 'text-green-400' :
                          stakingMomentum.momentum.color === 'yellow' ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {stakingMomentum.momentum.frequencyTrendFormatted}
                        </div>
                        <div className="text-xs text-gray-400">
                          {stakingMomentum.momentum.frequencyChangeFormatted} vs previous week
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-gray-400">Performance Rating</div>
                        <div className="text-lg font-bold text-purple-400">
                          {stakingMomentum.performanceRating}
                        </div>
                        <div className="text-xs text-gray-400">
                          {stakingMomentum.performanceRatio.toFixed(1)}% of expected
                        </div>
                      </div>

                      {/* Activity Status */}
                      <div className="mt-3 pt-3 border-t border-purple-500/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-gray-400">Last 7 Days</div>
                            <div className="text-sm font-bold text-purple-300">
                              {stakingMomentum.momentum.last7d} stakes
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-400">Status</div>
                            <div className="flex items-center space-x-1">
                              <div className={`w-2 h-2 rounded-full ${
                                stakingMomentum.momentum.isActive ? 'bg-green-400' : 'bg-yellow-400'
                              }`}></div>
                              <span className="text-xs text-gray-400">
                                {stakingMomentum.momentum.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    // No historical data available - show current performance only
                    <>
                      <div>
                        <div className="text-xs text-gray-400">Performance Rating</div>
                        <div className="text-lg font-bold text-purple-400">
                          {stakingMomentum.performanceRating}
                        </div>
                        <div className="text-xs text-gray-400">
                          {stakingMomentum.performanceRatio.toFixed(1)}% of expected
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-gray-400">Current Weight</div>
                        <div className="text-lg font-bold text-purple-300">
                          {stakingMomentum.yourWeight.toLocaleString()} VRSC
                        </div>
                        <div className="text-xs text-gray-400">
                          Expected frequency: {stakingMomentum.expectedFrequency.toFixed(3)}/day
                        </div>
                      </div>

                      {/* Status */}
                      <div className="mt-3 pt-3 border-t border-purple-500/20">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                          <span className="text-xs text-gray-400">
                            Historical data not available
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Run stake scanner to enable trend analysis
                        </div>
                      </div>
                    </>
                  )
                ) : (
                  // Loading state
                  <div className="space-y-2">
                    <div className="animate-pulse bg-purple-400/20 rounded h-6 w-20"></div>
                    <div className="animate-pulse bg-purple-400/20 rounded h-4 w-16"></div>
                    <div className="animate-pulse bg-purple-400/20 rounded h-4 w-24"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Value at Stake */}
            <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Medal className="h-5 w-5 text-verus-teal" />
                <h5 className="text-sm font-semibold text-white">
                  Value at Stake
                </h5>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-400">Eligible Value</div>
                  <div className="text-lg font-bold text-verus-teal">
                    {formatFriendlyNumber(hybridUTXOHealth.eligibleValueVRSC, {
                      precision: 2,
                    })}{' '}
                    VRSC
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Total Value</div>
                  <div className="text-sm font-semibold text-yellow-300">
                    {formatFriendlyNumber(hybridUTXOHealth.totalValueVRSC, {
                      precision: 2,
                    })}{' '}
                    VRSC
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Charts */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
        <button
          onClick={() => toggleSection('performance')}
          className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <TrendUp className="h-6 w-6 text-verus-teal" />
            <h4 className="text-xl font-semibold text-white">
              Performance Charts
            </h4>
          </div>
          {expandedSections.has('performance') ? (
            <CaretDown className="h-5 w-5 text-yellow-300" />
          ) : (
            <CaretRight className="h-5 w-5 text-yellow-300" />
          )}
        </button>
        {expandedSections.has('performance') && (
          <div className="px-6 pb-6 border-t border-white/10">
            {/* Big Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 mb-6">
              <div className="bg-gradient-to-br from-verus-blue/20 to-verus-green/20 rounded-lg p-4 border border-verus-blue/30">
                <div className="text-purple-300 text-sm font-medium mb-1">
                  Total Stakes
                </div>
                <div className="text-3xl font-bold text-white">
                  {stats.summary.totalStakes || 0}
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-lg p-4 border border-green-500/30">
                <div className="text-green-300 text-sm font-medium mb-1">
                  Total Earned
                </div>
                <div className="text-3xl font-bold text-white">
                  {formatCryptoValue(stats.summary.totalRewardsVRSC || 0)}
                </div>
                <div className="text-green-300 text-xs mt-1">VRSC</div>
              </div>
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg p-4 border border-blue-500/30">
                <div className="text-blue-300 text-sm font-medium mb-1">
                  Avg per Stake
                </div>
                <div className="text-3xl font-bold text-white">
                  {(
                    (stats.summary.totalRewardsVRSC || 0) /
                    (stats.summary.totalStakes || 1)
                  ).toFixed(2)}
                </div>
                <div className="text-blue-300 text-xs mt-1">VRSC</div>
              </div>
              {achievements ? (
                <div
                  className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-lg p-4 border border-yellow-500/30 cursor-help"
                  title={`Earned ${achievements.total?.earned || 0} out of ${achievements.total?.available || 0} achievement badges`}
                >
                  <div className="text-yellow-300 text-sm font-medium mb-1">
                    Badges
                  </div>
                  <div className="text-3xl font-bold text-white">
                    {achievements.total?.earned || 0}
                  </div>
                  <div className="text-yellow-300 text-xs mt-1">
                    of {achievements.total?.available || 0}
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-lg p-4 border border-yellow-500/30">
                  <div className="text-yellow-300 text-sm font-medium mb-1">
                    Staking Since
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {stats.summary.firstStake
                      ? new Date(stats.summary.firstStake).toLocaleDateString(
                          'en-US',
                          { month: 'short', year: 'numeric' }
                        )
                      : 'N/A'}
                  </div>
                  <div className="text-yellow-300 text-xs mt-1">
                    {monthlyData?.length || 0} months
                  </div>
                </div>
              )}
            </div>

            {/* Cumulative Rewards Growth Chart */}
            <div className="pt-6">
              <h5 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendUp className="h-5 w-5 text-green-400" />
                Cumulative Rewards Growth
                <span className="text-sm text-gray-400 font-normal ml-2">
                  ({new Date(monthlyData?.[0]?.month).getFullYear()} -{' '}
                  {new Date(
                    monthlyData?.[monthlyData.length - 1]?.month
                  ).getFullYear()}
                  )
                </span>
              </h5>
              <ReactEChartsCore
                echarts={echarts}
                option={{
                  tooltip: {
                    trigger: 'axis',
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    borderColor: '#4ade80',
                    textStyle: { color: '#fff', fontSize: 14 },
                    formatter: (params: any) => {
                      const month = params[0].axisValue;
                      const cumulative = params[0].value;
                      const monthlyReward = params[1]?.value || 0;
                      return `<b>${month}</b><br/>Total Earned: <b>${cumulative.toFixed(2)} VRSC</b><br/>This Month: ${monthlyReward.toFixed(2)} VRSC`;
                    },
                  },
                  legend: {
                    data: ['Cumulative Total', 'Monthly Rewards'],
                    textStyle: { color: '#fff' },
                    top: 10,
                  },
                  grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '12%',
                    top: '15%',
                    containLabel: true,
                  },
                  xAxis: {
                    type: 'category',
                    data: monthlyData?.map((d: any) =>
                      new Date(d.month).toLocaleDateString('en-US', {
                        month: 'short',
                        year: '2-digit',
                      })
                    ) || [],
                    axisLine: { lineStyle: { color: '#666' } },
                    axisLabel: { color: '#888', rotate: 45 },
                  },
                  yAxis: {
                    type: 'value',
                    name: 'VRSC Rewards',
                    axisLine: { lineStyle: { color: '#4ade80' } },
                    splitLine: {
                      lineStyle: { color: 'rgba(255, 255, 255, 0.05)' },
                    },
                    axisLabel: { color: '#888' },
                  },
                  series: [
                    {
                      name: 'Cumulative Total',
                      type: 'line',
                      data: monthlyData?.reduce(
                        (acc: number[], d: any, i: number) => {
                          const prev = i > 0 ? acc[i - 1] : 0;
                          acc.push(prev + d.totalRewardsVRSC);
                          return acc;
                        },
                        []
                      ) || [],
                      itemStyle: { color: '#4ade80' },
                      lineStyle: { width: 3 },
                      smooth: true,
                      areaStyle: {
                        color: {
                          type: 'linear',
                          x: 0,
                          y: 0,
                          x2: 0,
                          y2: 1,
                          colorStops: [
                            { offset: 0, color: 'rgba(74, 222, 128, 0.3)' },
                            { offset: 1, color: 'rgba(74, 222, 128, 0.05)' },
                          ],
                        },
                      },
                      emphasis: {
                        focus: 'series',
                        lineStyle: { width: 4 },
                      },
                    },
                    {
                      name: 'Monthly Rewards',
                      type: 'bar',
                      data: monthlyData?.map((d: any) => d.totalRewardsVRSC) || [],
                      itemStyle: {
                        color: 'rgba(251, 191, 36, 0.6)',
                        borderColor: '#fbbf24',
                        borderWidth: 1,
                      },
                      barMaxWidth: 30,
                    },
                  ],
                  dataZoom: [
                    {
                      type: 'slider',
                      start: 0,
                      end: 100,
                      bottom: 10,
                      borderColor: '#4ade80',
                      fillerColor: 'rgba(74, 222, 128, 0.2)',
                      handleStyle: { color: '#4ade80' },
                    },
                    { type: 'inside' },
                  ],
                }}
                style={{ height: '450px' }}
              />
            </div>

            {/* Yearly Breakdown */}
            <div className="pt-6 border-t border-white/10">
              <h5 className="text-lg font-semibold text-white mb-4">
                Yearly Summary
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {(() => {
                  const yearlyData: {
                    [key: string]: { stakes: number; rewards: number };
                  } = {};
                  monthlyData?.forEach((m: any) => {
                    const year = new Date(m.month).getFullYear().toString();
                    if (!yearlyData[year]) {
                      yearlyData[year] = { stakes: 0, rewards: 0 };
                    }
                    yearlyData[year].stakes += m.stakeCount;
                    yearlyData[year].rewards += m.totalRewardsVRSC;
                  });

                  return Object.entries(yearlyData)
                    .sort()
                    .map(([year, data]) => (
                      <div
                        key={year}
                        className="bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        <div className="text-yellow-300 text-lg font-bold">
                          {year}
                        </div>
                        <div className="text-white text-sm mt-1">
                          {data.stakes} stakes
                        </div>
                        <div className="text-green-400 text-sm font-semibold">
                          {data.rewards.toFixed(0)} VRSC
                        </div>
                      </div>
                    ));
                })()}
              </div>
            </div>

            {/* Activity Heatmap Calendar */}
            <div className="pt-6 border-t border-white/10">
              <h5 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-verus-blue" />
                Staking Activity Calendar
                <span className="text-sm text-gray-400 font-normal ml-2">
                  (Last 365 days)
                </span>
              </h5>
              <div className="bg-gray-100 dark:bg-gray-900/50 rounded-lg p-6 overflow-x-auto">
                <HeatmapCalendar
                  data={dailyData?.map((d: any) => ({
                    date: new Date(d.date).toISOString().split('T')[0],
                    value: d.stakeCount || 0,
                  })) || []}
                  cellSize={14}
                  gap={3}
                />
              </div>
              <div className="mt-4 text-center text-sm text-gray-400">
                Darker colors indicate more staking activity on that day
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Data Export & Reports */}
      <div className="bg-gradient-to-r from-verus-blue/10 to-verus-green/10 backdrop-blur-sm rounded-2xl border border-verus-blue/20 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xl font-semibold text-white mb-2">
              Export Your Data
            </h4>
            <p className="text-sm text-blue-200">
              DownloadSimple your staking statistics for analysis or tax
              purposes
            </p>
          </div>
          <StakingReportExporter
            data={{
              friendlyName: stats.friendlyName || '',
              summary: stats.summary,
              monthlyData: monthlyData,
              dailyData: dailyData,
              utxoHealth: hybridUTXOHealth,
              rankings: stats.rankings,
            }}
            iaddr={iaddr}
          />
        </div>
      </div>

      {/* Metadata */}
      <div className="text-center text-sm text-blue-200">
        <div className="flex items-center justify-center space-x-4">
          <span>
            Last Updated:{' '}
            {stats.metadata?.lastCalculated ? new Date(stats.metadata.lastCalculated).toLocaleString() : 'Never'}
          </span>
          <button
            onClick={fetchStats}
            className="flex items-center space-x-1 text-yellow-300 hover:text-verus-teal transition-colors"
          >
            <ArrowsClockwise className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </div>
  );
}
