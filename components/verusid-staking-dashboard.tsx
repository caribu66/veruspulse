'use client';

import { useState, useEffect } from 'react';
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
  Award,
  TrendingUp,
  Activity,
  Zap,
  Database,
  Calendar,
  Trophy,
  Target,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { formatCryptoValue, formatFriendlyNumber } from '@/lib/utils/number-formatting';

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
}

export function VerusIDStakingDashboard({ iaddr }: DashboardProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['hero', 'performance'])
  );

  useEffect(() => {
    if (iaddr) {
      fetchStats();
    }
  }, [iaddr]);

  const fetchStats = async () => {
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
  };

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
    return (
      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 backdrop-blur-sm rounded-2xl p-8 border border-yellow-500/20">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
            <p className="text-yellow-200 text-lg font-medium">Loading staking statistics...</p>
            <p className="text-blue-200 text-sm mt-2">Fetching comprehensive data from UTXO database</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 backdrop-blur-sm rounded-2xl p-8 border border-red-500/20">
        <div className="flex items-start space-x-4">
          <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-red-400 font-semibold text-lg mb-2">Error Loading Statistics</h3>
            <p className="text-red-300 text-sm mb-4">{error}</p>
            {error.includes('not been synced') && (
              <div className="bg-red-500/20 rounded-lg p-4">
                <p className="text-red-200 text-sm mb-3">
                  This VerusID hasn't been synced to the UTXO database yet.
                </p>
                <button
                  onClick={fetchStats}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white text-sm font-medium transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  // Use real data from API
  const utxoHealth = stats.utxoHealth;
  const monthlyData = stats.timeSeries.monthly;

  const monthlyChartOption = {
    title: {
      text: `${monthlyData.length} Months of Staking History`,
      left: 'center',
      top: 5,
      textStyle: { color: '#888', fontSize: 12 }
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      borderColor: '#8b5cf6',
      textStyle: { color: '#fff' },
      formatter: (params: any) => {
        const month = params[0].axisValue;
        const stakes = params[0].value;
        const rewards = params[1]?.value || 0;
        return `${month}<br/>Stakes: ${stakes}<br/>Rewards: ${rewards.toFixed(2)} VRSC`;
      }
    },
    legend: { data: ['Stakes', 'Rewards'], textStyle: { color: '#fff' }, top: 25 },
    grid: { left: '3%', right: '4%', bottom: '20%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: monthlyData.map((d: any) => 
        new Date(d.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      ),
      axisLine: { lineStyle: { color: '#8b5cf6' } },
      axisLabel: { rotate: 45, color: '#888' }
    },
    yAxis: [
      {
        type: 'value',
        name: 'Stakes',
        axisLine: { lineStyle: { color: '#8b5cf6' } },
        splitLine: { lineStyle: { color: 'rgba(139, 92, 246, 0.1)' } },
      },
      {
        type: 'value',
        name: 'VRSC',
        axisLine: { lineStyle: { color: '#ef4444' } },
        splitLine: { show: false },
      }
    ],
    series: [
      {
        name: 'Stakes',
        type: 'bar',
        data: monthlyData.map((d: any) => d.stakeCount),
        itemStyle: { color: '#8b5cf6' },
      },
      {
        name: 'Rewards',
        type: 'line',
        yAxisIndex: 1,
        data: monthlyData.map((d: any) => d.totalRewardsVRSC),
        itemStyle: { color: '#ef4444' },
        smooth: true,
        areaStyle: { opacity: 0.3 }
      }
    ],
    dataZoom: [
      { type: 'slider', start: 0, end: 100, bottom: 20 },
      { type: 'inside' }
    ]
  };

  // Use real daily data from API
  const dailyData = stats.timeSeries.daily;

  const apyTrendOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      textStyle: { color: '#fff' },
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: dailyData.slice(-30).map((d: any) => 
        new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      ),
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
        data: dailyData.slice(-30).map((d: any) => d.apy || 0),
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
    },
    series: [
      {
        name: 'UTXOs',
        type: 'pie',
        radius: ['40%', '70%'],
        data: [
          { value: utxoHealth.eligible, name: 'Eligible', itemStyle: { color: '#10b981' } },
          { value: utxoHealth.cooldown, name: 'Cooldown', itemStyle: { color: '#f59e0b' } },
          { 
            value: utxoHealth.total - utxoHealth.eligible - utxoHealth.cooldown, 
            name: 'Inactive', 
            itemStyle: { color: '#6b7280' } 
          },
        ],
        label: { color: '#fff' },
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Friendly Name Header */}
      {stats.friendlyName && (
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-2xl p-4 border border-purple-500/30 text-center">
          <div className="flex items-center justify-center space-x-3">
            <Award className="h-6 w-6 text-purple-400" />
            <h3 className="text-2xl font-bold text-white">
              {stats.friendlyName}
            </h3>
          </div>
          <p className="text-purple-200 text-sm mt-1">
            Comprehensive Staking Statistics
          </p>
        </div>
      )}

      {/* Hero Stats */}
      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 backdrop-blur-sm rounded-2xl p-6 border border-yellow-500/20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Total Rewards */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Award className="h-8 w-8 text-yellow-400" />
            </div>
            <div className="text-4xl font-bold text-yellow-400 mb-1">
              {formatFriendlyNumber(stats.summary.totalRewardsVRSC, { precision: 2 })}
            </div>
            <div className="text-sm text-blue-200">Total Rewards (VRSC)</div>
          </div>

          {/* APY */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-8 w-8 text-green-400" />
            </div>
            <div className="text-4xl font-bold text-green-400 mb-1">
              {stats.summary.apyAllTime?.toFixed(2) || '0.00'}%
            </div>
            <div className="text-sm text-blue-200">APY (All Time)</div>
            {stats.trends.apy['30d'] && (
              <div className={`text-xs mt-1 ${
                stats.trends.apy['30d'] === 'increasing' ? 'text-green-300' :
                stats.trends.apy['30d'] === 'decreasing' ? 'text-red-300' : 'text-gray-300'
              }`}>
                {stats.trends.apy['30d'] === 'increasing' ? '↗' : 
                 stats.trends.apy['30d'] === 'decreasing' ? '↘' : '→'} {stats.trends.apy['30d']}
              </div>
            )}
          </div>

          {/* Total Stakes */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Activity className="h-8 w-8 text-blue-400" />
            </div>
            <div className="text-4xl font-bold text-blue-400 mb-1">
              {stats.summary.totalStakes.toLocaleString()}
            </div>
            <div className="text-sm text-blue-200">Total Stakes</div>
          </div>

          {/* Network Rank */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Trophy className="h-8 w-8 text-purple-400" />
            </div>
            <div className="text-4xl font-bold text-purple-400 mb-1">
              #{stats.rankings.network || 'N/A'}
            </div>
            <div className="text-sm text-blue-200">Network Rank</div>
            <div className="text-xs text-purple-300 mt-1">
              Top {stats.rankings.percentile?.toFixed(1) || '0.0'}%
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
            <TrendingUp className="h-6 w-6 text-yellow-400" />
            <h4 className="text-xl font-semibold text-white">Performance Charts</h4>
          </div>
          {expandedSections.has('performance') ? (
            <ChevronDown className="h-5 w-5 text-yellow-300" />
          ) : (
            <ChevronRight className="h-5 w-5 text-yellow-300" />
          )}
        </button>
        {expandedSections.has('performance') && (
          <div className="px-6 pb-6 border-t border-white/10">
            {/* Big Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 mb-6">
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-lg p-4 border border-purple-500/30">
                <div className="text-purple-300 text-sm font-medium mb-1">Total Stakes</div>
                <div className="text-3xl font-bold text-white">{stats.summary.totalStakes || 0}</div>
              </div>
              <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-lg p-4 border border-green-500/30">
                <div className="text-green-300 text-sm font-medium mb-1">Total Earned</div>
                <div className="text-3xl font-bold text-white">{formatCryptoValue(stats.summary.totalRewardsVRSC || 0)}</div>
                <div className="text-green-300 text-xs mt-1">VRSC</div>
              </div>
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg p-4 border border-blue-500/30">
                <div className="text-blue-300 text-sm font-medium mb-1">Avg per Stake</div>
                <div className="text-3xl font-bold text-white">
                  {((stats.summary.totalRewardsVRSC || 0) / (stats.summary.totalStakes || 1)).toFixed(2)}
                </div>
                <div className="text-blue-300 text-xs mt-1">VRSC</div>
              </div>
              <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-lg p-4 border border-yellow-500/30">
                <div className="text-yellow-300 text-sm font-medium mb-1">Staking Since</div>
                <div className="text-2xl font-bold text-white">
                  {stats.summary.firstStake ? new Date(stats.summary.firstStake).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
                </div>
                <div className="text-yellow-300 text-xs mt-1">{monthlyData.length} months</div>
              </div>
            </div>

            {/* Cumulative Rewards Growth Chart */}
            <div className="pt-6">
              <h5 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                Cumulative Rewards Growth
                <span className="text-sm text-gray-400 font-normal ml-2">
                  ({new Date(monthlyData[0]?.month).getFullYear()} - {new Date(monthlyData[monthlyData.length - 1]?.month).getFullYear()})
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
                    }
                  },
                  legend: { 
                    data: ['Cumulative Total', 'Monthly Rewards'], 
                    textStyle: { color: '#fff' }, 
                    top: 10 
                  },
                  grid: { left: '3%', right: '4%', bottom: '12%', top: '15%', containLabel: true },
                  xAxis: {
                    type: 'category',
                    data: monthlyData.map((d: any) => 
                      new Date(d.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
                    ),
                    axisLine: { lineStyle: { color: '#666' } },
                    axisLabel: { color: '#888', rotate: 45 }
                  },
                  yAxis: {
                    type: 'value',
                    name: 'VRSC Rewards',
                    axisLine: { lineStyle: { color: '#4ade80' } },
                    splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
                    axisLabel: { color: '#888' }
                  },
                  series: [
                    {
                      name: 'Cumulative Total',
                      type: 'line',
                      data: monthlyData.reduce((acc: number[], d: any, i: number) => {
                        const prev = i > 0 ? acc[i - 1] : 0;
                        acc.push(prev + d.totalRewardsVRSC);
                        return acc;
                      }, []),
                      itemStyle: { color: '#4ade80' },
                      lineStyle: { width: 3 },
                      smooth: true,
                      areaStyle: { 
                        color: {
                          type: 'linear',
                          x: 0, y: 0, x2: 0, y2: 1,
                          colorStops: [
                            { offset: 0, color: 'rgba(74, 222, 128, 0.3)' },
                            { offset: 1, color: 'rgba(74, 222, 128, 0.05)' }
                          ]
                        }
                      },
                      emphasis: {
                        focus: 'series',
                        lineStyle: { width: 4 }
                      }
                    },
                    {
                      name: 'Monthly Rewards',
                      type: 'bar',
                      data: monthlyData.map((d: any) => d.totalRewardsVRSC),
                      itemStyle: { 
                        color: 'rgba(251, 191, 36, 0.6)',
                        borderColor: '#fbbf24',
                        borderWidth: 1
                      },
                      barMaxWidth: 30
                    }
                  ],
                  dataZoom: [
                    { 
                      type: 'slider', 
                      start: 0, 
                      end: 100, 
                      bottom: 10,
                      borderColor: '#4ade80',
                      fillerColor: 'rgba(74, 222, 128, 0.2)',
                      handleStyle: { color: '#4ade80' }
                    },
                    { type: 'inside' }
                  ]
                }}
                style={{ height: '450px' }}
              />
            </div>

            {/* Yearly Breakdown */}
            <div className="pt-6 border-t border-white/10">
              <h5 className="text-lg font-semibold text-white mb-4">Yearly Summary</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {(() => {
                  const yearlyData: { [key: string]: { stakes: number, rewards: number } } = {};
                  monthlyData.forEach((m: any) => {
                    const year = new Date(m.month).getFullYear().toString();
                    if (!yearlyData[year]) {
                      yearlyData[year] = { stakes: 0, rewards: 0 };
                    }
                    yearlyData[year].stakes += m.stakeCount;
                    yearlyData[year].rewards += m.totalRewardsVRSC;
                  });
                  
                  return Object.entries(yearlyData).sort().map(([year, data]) => (
                    <div key={year} className="bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="text-yellow-300 text-lg font-bold">{year}</div>
                      <div className="text-white text-sm mt-1">{data.stakes} stakes</div>
                      <div className="text-green-400 text-sm font-semibold">{data.rewards.toFixed(0)} VRSC</div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* UTXO Health */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
        <button
          onClick={() => toggleSection('utxo')}
          className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Database className="h-6 w-6 text-blue-400" />
            <h4 className="text-xl font-semibold text-white">UTXO Health</h4>
          </div>
          {expandedSections.has('utxo') ? (
            <ChevronDown className="h-5 w-5 text-blue-300" />
          ) : (
            <ChevronRight className="h-5 w-5 text-blue-300" />
          )}
        </button>
        {expandedSections.has('utxo') && (
          <div className="px-6 pb-6 border-t border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              <div>
                <h5 className="text-lg font-semibold text-white mb-4">UTXO Distribution</h5>
                <ReactEChartsCore
                  echarts={echarts}
                  option={utxoDistributionOption}
                  style={{ height: '300px' }}
                />
              </div>
              <div className="space-y-4">
                <h5 className="text-lg font-semibold text-white mb-4">Details</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-blue-200 text-sm mb-1">Total UTXOs</div>
                    <div className="text-2xl font-bold text-white">{utxoHealth.total}</div>
                  </div>
                  <div className="bg-green-500/20 rounded-lg p-4">
                    <div className="text-green-200 text-sm mb-1">Eligible</div>
                    <div className="text-2xl font-bold text-green-400">{stats.utxoHealth.eligible}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-blue-200 text-sm mb-1">Total Value</div>
                    <div className="text-xl font-bold text-white">
                      {formatFriendlyNumber(stats.utxoHealth.totalValueVRSC, { precision: 2 })} VRSC
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-blue-200 text-sm mb-1">Efficiency</div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {(stats.utxoHealth.efficiency * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Records & Achievements */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
        <button
          onClick={() => toggleSection('records')}
          className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Trophy className="h-6 w-6 text-yellow-400" />
            <h4 className="text-xl font-semibold text-white">Records & Achievements</h4>
          </div>
          {expandedSections.has('records') ? (
            <ChevronDown className="h-5 w-5 text-yellow-300" />
          ) : (
            <ChevronRight className="h-5 w-5 text-yellow-300" />
          )}
        </button>
        {expandedSections.has('records') && (
          <div className="px-6 pb-6 border-t border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg p-6 border border-yellow-500/30">
                <Trophy className="h-8 w-8 text-yellow-400 mb-3" />
                <div className="text-sm text-yellow-200 mb-1">Highest Reward</div>
                <div className="text-2xl font-bold text-yellow-400">
                  {formatCryptoValue(stats.records.highest.amount, 'VRSC')}
                </div>
                {stats.records.highest.date && (
                  <div className="text-xs text-yellow-300 mt-2">
                    {new Date(stats.records.highest.date).toLocaleDateString()}
                  </div>
                )}
              </div>
              
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg p-6 border border-green-500/30">
                <Calendar className="h-8 w-8 text-green-400 mb-3" />
                <div className="text-sm text-green-200 mb-1">Best Month</div>
                <div className="text-2xl font-bold text-green-400">
                  {formatFriendlyNumber(stats.records.bestMonth.rewards, { precision: 2 })} VRSC
                </div>
                {stats.records.bestMonth.month && (
                  <div className="text-xs text-green-300 mt-2">{stats.records.bestMonth.month}</div>
                )}
              </div>

              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg p-6 border border-purple-500/30">
                <Zap className="h-8 w-8 text-purple-400 mb-3" />
                <div className="text-sm text-purple-200 mb-1">Avg Frequency</div>
                <div className="text-2xl font-bold text-purple-400">
                  {stats.performance.frequency.stakesPerWeek.toFixed(1)} / week
                </div>
                <div className="text-xs text-purple-300 mt-2">
                  Every {stats.performance.frequency.avgDaysBetween.toFixed(1)} days
                </div>
              </div>
            </div>

            {/* Milestones */}
            <div className="mt-6 flex flex-wrap gap-3">
              {stats.summary.totalStakes >= 100 && (
                <div className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-300 text-sm font-medium flex items-center space-x-2">
                  <Target className="h-4 w-4" />
                  <span>100+ Stakes</span>
                </div>
              )}
              {stats.summary.totalStakes >= 500 && (
                <div className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-sm font-medium flex items-center space-x-2">
                  <Award className="h-4 w-4" />
                  <span>500+ Stakes</span>
                </div>
              )}
              {stats.summary.totalStakes >= 1000 && (
                <div className="px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-yellow-300 text-sm font-medium flex items-center space-x-2">
                  <Trophy className="h-4 w-4" />
                  <span>1000+ Stakes Club</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="text-center text-sm text-blue-200">
        <div className="flex items-center justify-center space-x-4">
          <span>Last Updated: {new Date(stats.metadata.lastCalculated).toLocaleString()}</span>
          <button
            onClick={fetchStats}
            className="flex items-center space-x-1 text-yellow-300 hover:text-yellow-400 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </div>
  );
}

