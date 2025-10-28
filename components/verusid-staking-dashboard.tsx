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
  GlobeHemisphereWest,
  ChartBar,
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
// import { UTXOBubbleChartNew } from './charts/utxo-bubble-chart-new';
// import {
//   fetchUTXODataWithCache,
//   invalidateUTXOCache,
// } from '@/lib/utils/utxo-cache';
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
    new Set(['hero', 'performance', 'overview', 'weekly'])
  );
  const [liveUTXOData, setLiveUTXOData] = useState<any>(null);
  const [achievements, setAchievements] = useState<any>(null);
  const [networkParticipation, setNetworkParticipation] =
    useState<NetworkParticipationData | null>(null);
  const [stakingMomentum, setStakingMomentum] =
    useState<StakingMomentumData | null>(null);

  // Real-time events for live updates - REDUCED FREQUENCY
  const {
    connected: realtimeConnected,
    lastBlock,
    lastTransaction,
  } = useRealtimeEvents({
    onNewBlock: () => {
      // Only refresh critical data, not UTXOs on every block
      fetchStats();
      // Remove frequent UTXO updates - only fetch on user interaction
      // fetchLiveUTXOs();
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
      // Simplified UTXO fetching without cache
      const response = await fetch(`/api/verusid/${iaddr}/live-utxos`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch UTXO data');
      }

      // Store live UTXO data
      setLiveUTXOData(result.data);
    } catch (err: any) {
      console.warn('Failed to fetch UTXO data:', err);
      // Silent error handling - keep existing data
    }
  }, [iaddr]);

  // Cleanup when component unmounts or iaddr changes
  useEffect(() => {
    return () => {
      // Cleanup logic if needed
    };
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
      const response = await fetch(
        `/api/verusid/${iaddr}/network-participation`
      );
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
      const response = await fetch(
        `/api/verusid/${iaddr}/staking-momentum-simple-real`
      );
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
  }, [
    iaddr,
    fetchStats,
    fetchLiveUTXOs,
    fetchAchievements,
    fetchNetworkParticipation,
    fetchStakingMomentum,
  ]);

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
      <div className="bg-slate-600/10 backdrop-blur-sm rounded-2xl p-8 border border-slate-500/20">
        <div className="flex items-start space-x-4">
          <WarningCircle className="h-6 w-6 text-slate-300 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-slate-300 font-semibold text-lg mb-2">
              Error Loading Statistics
            </h3>
            <p className="text-slate-400 text-sm mb-4">{error}</p>
            <button
              onClick={fetchStats}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 rounded-lg text-white text-sm font-medium transition-colors"
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
  const weeklyData = stats.timeSeries?.weekly;

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
      data:
        monthlyData?.map((d: any) =>
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
      data:
        dailyData?.slice(-30).map((d: any) =>
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

  // Weekly rewards chart configuration
  const weeklyChartOption = {
    title: {
      text: `${weeklyData?.length || 0} Weeks of Staking History`,
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
        const week = params[0].axisValue;
        const stakes = params[0].value;
        const rewards = params[1]?.value || 0;
        return `${week}<br/>Stakes: ${stakes}<br/>Rewards: ${rewards.toFixed(2)} VRSC`;
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
      data:
        weeklyData?.map((d: any) =>
          new Date(d.week).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
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
        data: weeklyData?.map((d: any) => d.stakeCount) || [],
        itemStyle: { color: '#3165d4' },
      },
      {
        name: 'Rewards',
        type: 'line',
        yAxisIndex: 1,
        data: weeklyData?.map((d: any) => d.totalRewardsVRSC) || [],
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
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 px-2 sm:px-4 lg:px-6 xl:px-8">
      {/* Page Header */}
      {stats.friendlyName && (
        <div className="bg-gradient-to-r from-slate-600/20 to-slate-500/20 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-3 sm:p-4 lg:p-6 xl:p-8 border border-slate-500/30 text-center shadow-2xl">
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-gray-200 dark:bg-gray-700 rounded-xl sm:rounded-2xl">
              <Medal className="h-6 w-6 sm:h-8 sm:w-8 text-gray-600 dark:text-gray-400" />
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-white tracking-tight break-words max-w-full hyphens-auto">
              {stats.friendlyName}
            </h1>
          </div>
          <p className="text-slate-300 text-xs sm:text-sm lg:text-base font-medium mb-3 sm:mb-4 lg:mb-6">
            Comprehensive Staking Analytics Dashboard
          </p>

          {/* Real-time Status Indicator */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3 bg-black/20 rounded-full px-3 sm:px-4 py-2 mx-auto w-fit mb-3">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <div
                  className={`w-3 h-3 rounded-full ${realtimeConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`}
                ></div>
                {realtimeConnected && (
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-400 animate-ping opacity-75"></div>
                )}
              </div>
              <span className="text-xs sm:text-sm font-medium text-gray-200">
                {realtimeConnected
                  ? 'Live Updates Active'
                  : 'Real-time Disconnected'}
              </span>
            </div>
            {lastBlock && (
              <span className="text-xs sm:text-sm text-gray-400">
                • Block {lastBlock}
              </span>
            )}
          </div>

          {/* Coverage Information */}
          <div className="bg-slate-600/10 border border-slate-500/30 rounded-lg px-4 py-3 text-left max-w-4xl mx-auto">
            <div className="flex items-start space-x-2">
              <WarningCircle className="h-5 w-5 text-slate-300 flex-shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-slate-300">
                <span className="font-semibold">Coverage Note:</span> This
                dashboard tracks only VerusID stakers who stake with their
                I-address and receive rewards to the same I-address. VerusIDs
                that receive rewards to different addresses are not included in
                these statistics.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key Performance Metrics */}
      <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-3 sm:p-4 lg:p-6 xl:p-8 border border-slate-600/30 shadow-2xl">
        <div className="mb-3 sm:mb-4 lg:mb-6">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1 sm:mb-2">
            Key Performance Metrics
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm lg:text-base">
            Real-time staking performance and rewards overview
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {/* Total Rewards */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-500/20 to-slate-400/20 rounded-xl blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100"></div>
            <div className="relative bg-gradient-to-br from-slate-500/10 to-slate-400/10 border border-slate-500/30 rounded-xl p-3 sm:p-4 lg:p-5 hover:border-slate-500/50 transition-all">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="p-1.5 sm:p-2 bg-slate-600/20 rounded-lg">
                  <Medal className="h-5 w-5 sm:h-6 sm:w-6 text-slate-300" />
                </div>
                {monthlyData && monthlyData.length > 0 && (
                  <SparklineChart
                    data={monthlyData
                      .slice(-30)
                      .map((d: any) => d.totalRewardsVRSC)}
                    width={50}
                    height={16}
                    trend="up"
                    color="#fbbf24"
                  />
                )}
              </div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-200 mb-1 break-words">
                <AnimatedCounter
                  value={stats.summary.totalRewardsVRSC}
                  decimals={2}
                  duration={2000}
                />
              </div>
              <div className="text-xs sm:text-sm text-slate-300">
                Total Rewards (VRSC)
              </div>
              {monthlyData && monthlyData.length >= 2 && (
                <div className="text-xs text-slate-400 mt-1 sm:mt-2 flex items-center space-x-1">
                  <span>
                    +
                    {(
                      monthlyData?.[monthlyData.length - 1]?.totalRewardsVRSC ||
                      0
                    ).toFixed(1)}{' '}
                    this month
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* APY */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-600/20 to-slate-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100"></div>
            <div className="relative bg-gradient-to-br from-slate-600/10 to-slate-500/10 border border-slate-600/30 rounded-xl p-5 hover:border-slate-600/50 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-slate-600/20 rounded-lg">
                  <TrendUp className="h-6 w-6 text-slate-300" />
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
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-200 mb-1">
                <AnimatedCounter
                  value={stats.summary.apyAllTime || 0}
                  decimals={2}
                  duration={2000}
                  suffix="%"
                />
              </div>
              <div className="text-sm text-slate-300">APY (All Time)</div>
              {stats.trends?.apy?.['30d'] && (
                <div
                  className={`text-xs mt-2 flex items-center space-x-1 ${
                    stats.trends.apy['30d'] === 'increasing'
                      ? 'text-slate-300'
                      : stats.trends.apy['30d'] === 'decreasing'
                        ? 'text-slate-400'
                        : 'text-slate-400'
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
            <div className="absolute inset-0 bg-gradient-to-r from-slate-700/20 to-slate-600/20 rounded-xl blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100"></div>
            <div className="relative bg-gradient-to-br from-slate-700/10 to-slate-600/10 border border-slate-700/30 rounded-xl p-5 hover:border-slate-700/50 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-slate-700/20 rounded-lg">
                  <Pulse className="h-6 w-6 text-slate-300" />
                </div>
                {monthlyData && monthlyData.length > 0 && (
                  <SparklineChart
                    data={
                      monthlyData?.slice(-12).map((d: any) => d.stakeCount) ||
                      []
                    }
                    width={60}
                    height={20}
                    trend="neutral"
                    color="#3165d4"
                  />
                )}
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-200 mb-1">
                <AnimatedCounter
                  value={stats.summary.totalStakes}
                  decimals={0}
                  duration={2000}
                  format="number"
                />
              </div>
              <div className="text-sm text-slate-300">Total Stakes</div>
              {monthlyData && monthlyData.length >= 2 && (
                <div className="text-xs text-slate-400 mt-2">
                  {monthlyData?.[monthlyData.length - 1]?.stakeCount || 0} this
                  month
                </div>
              )}
            </div>
          </div>

          {/* Network Rank */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-800/20 to-slate-700/20 rounded-xl blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100"></div>
            <div className="relative bg-gradient-to-br from-slate-800/10 to-slate-700/10 border border-slate-800/30 rounded-xl p-5 hover:border-slate-800/50 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-slate-800/20 rounded-lg">
                  <Trophy className="h-6 w-6 text-slate-300" />
                </div>
                <div className="text-xs text-slate-300 bg-slate-800/20 px-2 py-1 rounded">
                  Top {stats.rankings?.percentile?.toFixed(1) || '0.0'}%
                </div>
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-200 mb-1">
                #{stats.rankings?.network || 'N/A'}
              </div>
              <div className="text-sm text-slate-300">Network Rank</div>
              <div className="text-xs text-slate-400 mt-2">
                {stats.rankings?.network
                  ? `Out of ${stats.rankings?.totalStakers || 'many'} stakers`
                  : 'Calculating...'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Performance Dashboard */}
      <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm rounded-3xl border border-slate-600/30 shadow-2xl">
        <div className="p-4 sm:p-6 lg:p-8 border-b border-slate-600/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="p-2 sm:p-3 bg-slate-600/20 rounded-xl sm:rounded-2xl">
                <Lightning className="h-5 w-5 sm:h-7 sm:w-7 text-slate-300" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  Live Performance
                </h2>
                <p className="text-gray-400 text-sm sm:text-base">
                  Real-time staking metrics and UTXO health
                </p>
              </div>
            </div>

            {/* Live Data Indicator - Positioned to the right */}
            <div className="flex items-center space-x-2 rounded-full px-4 py-2 border shadow-lg transition-all duration-300">
              {realtimeConnected && liveUTXOData ? (
                // Fully connected state - Green animation
                <div className="flex items-center space-x-2 bg-green-500/10 border-green-500/30">
                  <div className="relative">
                    {/* Outer pulsing ring */}
                    <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-400 animate-ping opacity-75"></div>
                    {/* Inner solid dot */}
                    <div className="relative w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-green-300">
                    Live Data
                  </span>
                </div>
              ) : realtimeConnected ? (
                // Connected but no live UTXO data - Yellow animation
                <div className="flex items-center space-x-2 bg-yellow-500/10 border-yellow-500/30">
                  <div className="relative">
                    {/* Outer pulsing ring */}
                    <div className="absolute inset-0 w-3 h-3 rounded-full bg-yellow-400 animate-pulse opacity-75"></div>
                    {/* Inner solid dot */}
                    <div className="relative w-3 h-3 rounded-full bg-yellow-400"></div>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-yellow-300">
                    Connected
                  </span>
                </div>
              ) : (
                // Disconnected state - Gray static
                <div className="flex items-center space-x-2 bg-slate-500/10 border-slate-500/30">
                  <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                  <span className="text-xs sm:text-sm font-medium text-slate-400">
                    Offline
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Staking Efficiency */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gray-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100"></div>
              <div className="relative flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-2xl p-6 hover:border-gray-400 dark:hover:border-gray-600 transition-all">
                <HealthScoreGauge
                  score={
                    liveUTXOData?.total > 0
                      ? (liveUTXOData.eligible / liveUTXOData.total) * 100
                      : hybridUTXOHealth.total > 0
                        ? (hybridUTXOHealth.eligible / hybridUTXOHealth.total) *
                          100
                        : 0
                  }
                  size={100}
                  strokeWidth={8}
                  showLabel={true}
                />
                <div className="text-lg font-semibold text-gray-900 dark:text-white mt-4 text-center">
                  Staking Efficiency
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {liveUTXOData?.eligible || hybridUTXOHealth.eligible} /{' '}
                  {liveUTXOData?.total || hybridUTXOHealth.total} UTXOs
                  <button
                    onClick={fetchLiveUTXOs}
                    className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Refresh UTXO data"
                  >
                    <ArrowsClockwise className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Network Participation Rate */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gray-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100"></div>
              <div className="relative bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-2xl p-6 hover:border-gray-400 dark:hover:border-gray-600 transition-all">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-xl">
                    <GlobeHemisphereWest className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Network Participation
                  </h5>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Your Share</div>
                    <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                      {networkParticipation ? (
                        networkParticipation.participationFormatted
                      ) : (
                        <div className="animate-pulse bg-slate-400/20 rounded h-8 w-20"></div>
                      )}
                    </div>
                    <div className="text-sm text-gray-400">
                      of Network Weight
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">
                      Expected Next Stake
                    </div>
                    <div className="text-lg font-bold text-gray-600 dark:text-gray-400">
                      {networkParticipation ? (
                        networkParticipation.expectedStakeTimeFormatted
                      ) : (
                        <div className="animate-pulse bg-cyan-400/20 rounded h-6 w-20"></div>
                      )}
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-gray-400">Your Weight</div>
                        <div className="text-gray-700 dark:text-gray-300 font-medium">
                          {networkParticipation ? (
                            `${networkParticipation.yourWeightFormatted || networkParticipation.yourWeight?.toFixed(2) || '0'} VRSC`
                          ) : (
                            <div className="animate-pulse bg-slate-300/20 rounded h-4 w-12"></div>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400">Network</div>
                        <div className="text-gray-600 dark:text-gray-400 font-medium">
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
                      <div
                        className={`w-2 h-2 rounded-full ${
                          networkParticipation.status === 'active'
                            ? 'bg-green-500' // Green when live data is working
                            : networkParticipation.status === 'not_staking'
                              ? 'bg-slate-500'
                              : networkParticipation.status ===
                                  'data_unavailable'
                                ? 'bg-slate-400'
                                : 'bg-slate-600'
                        }`}
                      ></div>
                      <span className="text-xs text-gray-400">
                        {networkParticipation.status === 'active'
                          ? 'Active Staking'
                          : networkParticipation.status === 'not_staking'
                            ? 'Not Staking'
                            : networkParticipation.status === 'data_unavailable'
                              ? 'Network Data Unavailable'
                              : 'Low Participation'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Activity (Simple Real Data) */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gray-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100"></div>
              <div className="relative bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-2xl p-6 hover:border-gray-400 dark:hover:border-gray-600 transition-all">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-xl">
                    <TrendUp className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Recent Activity
                  </h5>
                </div>
                <div className="space-y-4">
                  {stakingMomentum && stakingMomentum.momentum ? (
                    <>
                      {/* Last 7 Days */}
                      <div>
                        <div className="text-xs text-gray-400 mb-1">
                          Last 7 Days
                        </div>
                        <div className="text-xl font-bold text-gray-800 dark:text-gray-200">
                          {stakingMomentum.momentum.last7d} stake
                          {stakingMomentum.momentum.last7d !== 1 ? 's' : ''}
                        </div>
                      </div>

                      {/* Last Stake Date */}
                      <div>
                        <div className="text-xs text-gray-400 mb-1">
                          Last Stake
                        </div>
                        <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                          {stakingMomentum.momentum.lastStakeDays !== null
                            ? `${stakingMomentum.momentum.lastStakeDays} day${stakingMomentum.momentum.lastStakeDays !== 1 ? 's' : ''} ago`
                            : 'Unknown'}
                        </div>
                      </div>

                      {/* Recent Rewards (show if we can get this data) */}
                      {(() => {
                        // Calculate recent rewards from last 7 days chronologically
                        const sevenDaysAgo = new Date();
                        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                        const recentRewards =
                          dailyData
                            ?.filter((day: any) => {
                              const dayDate = new Date(day.date);
                              return dayDate >= sevenDaysAgo;
                            })
                            .reduce(
                              (sum: number, day: any) =>
                                sum + (day.totalRewardsVRSC || 0),
                              0
                            ) || 0;

                        return recentRewards > 0 ? (
                          <div className="pt-3 border-t border-gray-300 dark:border-gray-600">
                            <div className="text-xs text-gray-400 mb-1">
                              Recent Rewards
                            </div>
                            <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                              {recentRewards.toFixed(1)} VRSC
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Last 7 days
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </>
                  ) : (
                    // Loading or no data
                    <div className="space-y-2">
                      <div className="animate-pulse bg-slate-400/20 rounded h-6 w-20"></div>
                      <div className="animate-pulse bg-slate-400/20 rounded h-4 w-16"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Value at Stake */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gray-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100"></div>
              <div className="relative bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-2xl p-6 hover:border-gray-400 dark:hover:border-gray-600 transition-all">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-xl">
                    <Medal className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Value at Stake
                  </h5>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">
                      Eligible Value
                    </div>
                    <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                      {formatFriendlyNumber(
                        liveUTXOData?.eligibleValueVRSC ||
                          hybridUTXOHealth.eligibleValueVRSC,
                        {
                          precision: 2,
                        }
                      )}{' '}
                      VRSC
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">
                      Total Value
                    </div>
                    <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                      {formatFriendlyNumber(
                        liveUTXOData?.totalValueVRSC ||
                          hybridUTXOHealth.totalValueVRSC,
                        {
                          precision: 2,
                        }
                      )}{' '}
                      VRSC
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Charts */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
        <button
          onClick={() => toggleSection('performance')}
          className="w-full flex items-center justify-between p-4 sm:p-6 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <TrendUp className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
              Performance Charts
            </h4>
          </div>
          {expandedSections.has('performance') ? (
            <CaretDown className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          ) : (
            <CaretRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          )}
        </button>
        {expandedSections.has('performance') && (
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-white/10 overflow-hidden">
            {/* Big Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-4 sm:pt-6 mb-4 sm:mb-6">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-gray-300 dark:border-gray-700">
                <div className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
                  Total Stakes
                </div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.summary.totalStakes || 0}
                </div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-gray-300 dark:border-gray-700">
                <div className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
                  Total Earned
                </div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  {formatCryptoValue(stats.summary.totalRewardsVRSC || 0)}
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  VRSC
                </div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-gray-300 dark:border-gray-700">
                <div className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
                  Avg per Stake
                </div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  {(
                    (stats.summary.totalRewardsVRSC || 0) /
                    (stats.summary.totalStakes || 1)
                  ).toFixed(2)}
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  VRSC
                </div>
              </div>
              {achievements ? (
                <div
                  className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-gray-300 dark:border-gray-700 cursor-help"
                  title={`Earned ${achievements.total?.earned || 0} out of ${achievements.total?.available || 0} achievement badges`}
                >
                  <div className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
                    Badges
                  </div>
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                    {achievements.total?.earned || 0}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                    of {achievements.total?.available || 0}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-gray-300 dark:border-gray-700">
                  <div className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
                    Staking Since
                  </div>
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.summary.firstStake
                      ? new Date(stats.summary.firstStake).toLocaleDateString(
                          'en-US',
                          { month: 'short', year: 'numeric' }
                        )
                      : 'N/A'}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
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
              <div
                className="w-full overflow-x-auto pb-8 md:pb-4 cumulative-rewards-scroll relative"
                style={{
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'auto',
                  touchAction: 'pan-x',
                }}
              >
                <ReactEChartsCore
                  echarts={echarts}
                  option={{
                    tooltip: {
                      trigger: 'axis',
                      backgroundColor: 'rgba(0, 0, 0, 0.9)',
                      borderColor: '#4285F4',
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
                      data:
                        monthlyData?.map((d: any) =>
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
                        data:
                          monthlyData?.reduce(
                            (acc: number[], d: any, i: number) => {
                              const prev = i > 0 ? acc[i - 1] : 0;
                              acc.push(prev + d.totalRewardsVRSC);
                              return acc;
                            },
                            []
                          ) || [],
                        itemStyle: { color: '#4285F4' },
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
                              { offset: 0, color: 'rgba(66, 133, 244, 0.4)' },
                              { offset: 1, color: 'rgba(66, 133, 244, 0.05)' },
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
                        data:
                          monthlyData?.map((d: any) => d.totalRewardsVRSC) ||
                          [],
                        itemStyle: {
                          color: 'rgba(251, 188, 4, 0.7)',
                          borderColor: '#FBBC04',
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
                        bottom: 15,
                        borderColor: '#4285F4',
                        fillerColor: 'rgba(66, 133, 244, 0.25)',
                        handleStyle: {
                          color: '#4285F4',
                          borderColor: '#5A9BF5',
                          borderWidth: 2,
                          size: 20,
                          shadowBlur: 6,
                          shadowColor: 'rgba(66, 133, 244, 0.5)',
                        },
                        handleIcon:
                          'path://M10.7,11.9H9.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4h1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z',
                        moveHandleSize: 16,
                        height: 40,
                        brushSelect: false,
                      },
                      {
                        type: 'inside',
                        zoomOnMouseWheel: false,
                        moveOnMouseMove: true,
                        moveOnMouseWheel: false,
                      },
                    ],
                  }}
                  style={{ height: '450px', minWidth: '600px' }}
                />
              </div>
            </div>

            {/* Yearly Breakdown */}
            <div className="pt-6 border-t border-white/10">
              <h5 className="text-lg font-semibold text-white mb-4">
                Yearly Summary
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
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
                        className="bg-white/5 rounded-lg p-2 sm:p-3 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        <div className="text-yellow-300 text-sm sm:text-lg font-bold">
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
              <div className="bg-gray-100 dark:bg-gray-900/50 rounded-lg p-4 sm:p-6 overflow-x-auto">
                <HeatmapCalendar
                  data={
                    dailyData?.map((d: any) => ({
                      date: new Date(d.date).toISOString().split('T')[0],
                      value: d.stakeCount || 0,
                    })) || []
                  }
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

      {/* Weekly Rewards Chart */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
        <button
          onClick={() => toggleSection('weekly')}
          className="w-full flex items-center justify-between p-4 sm:p-6 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <ChartBar className="h-6 w-6 text-blue-400" />
            <h4 className="text-xl font-semibold text-white">
              Weekly Rewards Analysis
            </h4>
          </div>
          {expandedSections.has('weekly') ? (
            <CaretDown className="h-5 w-5 text-slate-300" />
          ) : (
            <CaretRight className="h-5 w-5 text-slate-300" />
          )}
        </button>
        {expandedSections.has('weekly') && (
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-white/10 overflow-hidden">
            {/* Weekly Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-4 sm:pt-6 mb-4 sm:mb-6">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-gray-300 dark:border-gray-700">
                <div className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
                  Total Weeks
                </div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  {weeklyData?.length || 0}
                </div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-gray-300 dark:border-gray-700">
                <div className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
                  Avg Weekly Rewards
                </div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  {weeklyData && weeklyData.length > 0
                    ? (
                        weeklyData.reduce(
                          (sum: number, week: any) =>
                            sum + (week.totalRewardsVRSC || 0),
                          0
                        ) / weeklyData.length
                      ).toFixed(2)
                    : '0.00'}
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  VRSC
                </div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-gray-300 dark:border-gray-700">
                <div className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
                  Best Week
                </div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  {weeklyData && weeklyData.length > 0
                    ? Math.max(
                        ...weeklyData.map((w: any) => w.totalRewardsVRSC || 0)
                      ).toFixed(2)
                    : '0.00'}
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  VRSC
                </div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-gray-300 dark:border-gray-700">
                <div className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
                  Avg Weekly Stakes
                </div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  {weeklyData && weeklyData.length > 0
                    ? (
                        weeklyData.reduce(
                          (sum: number, week: any) =>
                            sum + (week.stakeCount || 0),
                          0
                        ) / weeklyData.length
                      ).toFixed(1)
                    : '0.0'}
                </div>
              </div>
            </div>

            {/* Weekly Chart */}
            <div className="pt-6">
              <h5 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ChartBar className="h-5 w-5 text-blue-400" />
                Weekly Staking Performance
                <span className="text-sm text-gray-400 font-normal ml-2">
                  ({weeklyData?.length || 0} weeks of data)
                </span>
              </h5>
              <div className="w-full overflow-x-auto">
                <ReactEChartsCore
                  echarts={echarts}
                  option={weeklyChartOption}
                  style={{ height: '400px', minWidth: '600px' }}
                />
              </div>
            </div>

            {/* Recent Weeks Breakdown */}
            {weeklyData && weeklyData.length > 0 && (
              <div className="pt-6 border-t border-white/10">
                <h5 className="text-lg font-semibold text-white mb-4">
                  Recent Weeks Breakdown
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                  {weeklyData.slice(-8).map((week: any, index: number) => (
                    <div
                      key={index}
                      className="bg-white/5 rounded-lg p-2 sm:p-3 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="text-blue-300 text-sm sm:text-lg font-bold">
                        {new Date(week.week).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="text-white text-sm mt-1">
                        {week.stakeCount || 0} stakes
                      </div>
                      <div className="text-green-400 text-sm font-semibold">
                        {(week.totalRewardsVRSC || 0).toFixed(2)} VRSC
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Data Export & Reports */}
      <div className="bg-gray-100 dark:bg-gray-800 backdrop-blur-sm rounded-2xl border border-gray-300 dark:border-gray-700 p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
          <div className="flex-1 min-w-0">
            <h4 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Export Your Data
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Download your staking statistics for analysis or tax purposes
            </p>
          </div>
          <div className="flex-shrink-0">
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
      </div>

      {/* Metadata */}
      <div className="text-center text-sm text-blue-200">
        <div className="flex items-center justify-center space-x-4">
          <span>
            Last Updated:{' '}
            {stats.metadata?.lastCalculated
              ? new Date(stats.metadata.lastCalculated).toLocaleString()
              : 'Never'}
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
