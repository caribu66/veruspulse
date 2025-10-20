'use client';

/**
 * QuickStatsTicker - Displays blockchain statistics in a ticker format
 * Shows key metrics like block height, hash rate, difficulty, mempool, and more
 */

import { useEffect, useState, useRef } from 'react';
import {
  TrendUp,
  UsersThree,
  Pulse,
  Lightning,
  Database,
  Globe,
  Clock,
  CurrencyDollar,
  Hash,
  Cpu,
  ChartBar,
  Network,
} from '@phosphor-icons/react';
import { MiniChart, generateMockChartData } from './interactive-charts';
import { useRealtimeCharts } from './realtime-data-provider';
import { logger } from '@/lib/utils/logger';

interface QuickStat {
  id: string;
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  prefix?: string;
  suffix?: string;
}

interface QuickStatsTickerProps {
  networkStats?: any;
  miningStats?: any;
  mempoolStats?: any;
  stakingStats?: any;
}

export function QuickStatsTicker({
  networkStats,
  miningStats,
  mempoolStats,
  stakingStats,
}: QuickStatsTickerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Get real-time chart data
  const realtimeCharts = useRealtimeCharts();

  // Generate chart data for interactive charts
  const [chartData, setChartData] = useState<Record<string, any[]>>({});

  useEffect(() => {
    // Use real-time data when available, fallback to mock data
    // Note: Keys must match the stat IDs used in the stats array
    const data = {
      'block-height': generateMockChartData(
        networkStats?.blocks || 425000,
        24,
        0.02
      ),
      mempool:
        realtimeCharts.mempool.length > 0
          ? realtimeCharts.mempool
          : generateMockChartData(mempoolStats?.size || 0, 24, 0.3),
      supply: generateMockChartData(
        networkStats?.circulatingSupply || 36830000000,
        24,
        0.05
      ),
      'staking-weight': generateMockChartData(
        stakingStats?.netstakeweight || 7889102,
        24,
        0.1
      ),
      connections: generateMockChartData(
        networkStats?.connections || 8,
        24,
        0.2
      ),
    };
    setChartData(data);
  }, [miningStats, mempoolStats, networkStats, stakingStats, realtimeCharts]);

  // No auto-scroll needed since cards fit within container

  // Debug logging to see what data we're receiving (only log once per data change)
  if (process.env.NODE_ENV === 'development') {
    logger.debug('QuickStatsTicker - Data received', {
      networkStats: networkStats ? '✅' : '❌',
      miningStats: miningStats ? '✅' : '❌',
      mempoolStats: mempoolStats ? '✅' : '❌',
      stakingStats: stakingStats ? '✅' : '❌',
      blocks: networkStats?.blocks,
      hashRate: miningStats?.networkhashps,
      mempoolSize: mempoolStats?.size,
    });
  }

  // Generate stats array - Reduced to 5 essential metrics
  const stats: QuickStat[] = [
    {
      id: 'block-height',
      label: 'Block Height',
      value: networkStats?.blocks?.toLocaleString() || '...',
      icon: Database,
      color: 'text-blue-600 dark:text-blue-400 bg-white dark:bg-blue-500/10 border-slate-300 dark:border-blue-500/20',
      trend: 'up',
    },
    {
      id: 'mempool',
      label: 'Mempool Txs',
      value:
        mempoolStats?.size !== undefined
          ? mempoolStats.size
          : miningStats?.pooledtx !== undefined
            ? miningStats.pooledtx
            : '...',
      icon: Pulse,
      color: 'text-blue-600 dark:text-blue-400 bg-white dark:bg-blue-500/10 border-slate-300 dark:border-blue-500/20',
      trend: 'neutral',
    },
    {
      id: 'supply',
      label: 'Circulating Supply',
      value: networkStats?.circulatingSupply
        ? `${(networkStats.circulatingSupply / 1000000).toFixed(2)}M`
        : '...',
      icon: CurrencyDollar,
      color: 'text-green-600 dark:text-green-400 bg-white dark:bg-green-500/10 border-slate-300 dark:border-green-500/20',
      suffix: 'VRSC',
    },
    {
      id: 'staking-weight',
      label: 'Network Stake',
      value:
        stakingStats?.netstakeweight && stakingStats.netstakeweight > 0
          ? formatStake(stakingStats.netstakeweight)
          : '...',
      icon: TrendUp,
      color: 'text-blue-600 dark:text-blue-400 bg-white dark:bg-blue-500/10 border-slate-300 dark:border-blue-500/20',
      trend: 'up',
    },
    {
      id: 'connections',
      label: 'Connections',
      value: networkStats?.connections || '...',
      icon: Network,
      color: 'text-blue-600 dark:text-verus-blue bg-white dark:bg-verus-blue/10 border-slate-300 dark:border-verus-blue/20',
      trend: 'neutral',
    },
  ];

  return (
    <div className="quick-stats-ticker-container relative w-full bg-gray-50 dark:bg-slate-900 border-y border-slate-300 dark:border-slate-700 py-4 md:py-6">
      {/* Desktop: Grid Layout */}
      <div className="hidden md:block w-full px-6">
        <div
          ref={scrollContainerRef}
          className="grid grid-cols-5 gap-4 w-full"
          style={{
            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          }}
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.id}
                className={`quick-stats-card flex flex-col items-center gap-1.5 sm:gap-2 md:gap-3 px-2 sm:px-3 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl border ${stat.color} 
                transition-all duration-300 active:scale-95 hover:brightness-110 group cursor-pointer 
                w-full min-h-[80px] max-w-full
                bg-white dark:bg-slate-900 shadow-md hover:shadow-lg touch-manipulation`}
                style={{
                  animationDelay: `${index * 100}ms`,
                  WebkitTapHighlightColor: 'transparent',
                  transformOrigin: 'center center',
                }}
              >
                {/* Icon */}
                <div className="relative flex-shrink-0 overflow-hidden">
                  <Icon className="h-5 w-5 md:h-6 md:w-6 transition-transform group-hover:scale-105" />
                  {stat.trend === 'up' && (
                    <TrendUp className="absolute -top-1 -right-1 h-2.5 w-2.5 md:h-3 md:w-3 text-green-400 animate-pulse" />
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-col items-center text-center min-w-0 w-full overflow-hidden">
                  <div className="text-[9px] sm:text-xs opacity-70 dark:opacity-70 opacity-60 whitespace-nowrap truncate font-medium mb-0.5 md:mb-1 leading-tight w-full text-slate-300 dark:text-slate-300 text-slate-600">
                    {stat.label}
                  </div>
                  <div className="text-xs sm:text-sm md:text-sm font-bold whitespace-nowrap flex items-center justify-center gap-1 leading-tight min-h-[16px] w-full text-white dark:text-white text-slate-900">
                    {stat.prefix && (
                      <span className="opacity-60 flex-shrink-0">
                        {stat.prefix}
                      </span>
                    )}
                    <span className="tabular-nums truncate">{stat.value}</span>
                    {stat.suffix && (
                      <span className="opacity-60 text-[10px] sm:text-xs ml-1 flex-shrink-0">
                        {stat.suffix}
                      </span>
                    )}
                  </div>

                  {/* Mini Chart */}
                  <div className="mt-1.5 opacity-60 group-hover:opacity-100 transition-opacity overflow-hidden">
                    <MiniChart
                      data={chartData[stat.id] || []}
                      color={stat.color.split(' ')[0].replace('text-', '')}
                      height={18}
                      showTrend={false}
                      className="w-full max-w-full"
                    />
                  </div>
                </div>

                {/* Pulse Animation for Active Stats */}
                {stat.value !== '...' && (
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute inset-0 rounded-xl animate-ping opacity-20 bg-current"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: Horizontal Scroll Layout */}
      <div className="md:hidden w-full">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 px-4 py-2 min-w-max">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.id}
                  className={`quick-stats-card flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-lg border ${stat.color} 
                    transition-all duration-300 active:scale-95 hover:brightness-110 group cursor-pointer 
                    w-[120px] min-h-[80px] flex-shrink-0
                    bg-slate-900 shadow-md hover:shadow-lg touch-manipulation`}
                  style={{
                    animationDelay: `${index * 100}ms`,
                    WebkitTapHighlightColor: 'transparent',
                    transformOrigin: 'center center',
                  }}
                >
                  {/* Icon */}
                  <div className="relative flex-shrink-0 overflow-hidden">
                    <Icon className="h-5 w-5 transition-transform group-hover:scale-105" />
                    {stat.trend === 'up' && (
                      <TrendUp className="absolute -top-1 -right-1 h-2.5 w-2.5 text-green-400 animate-pulse" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-col items-center text-center min-w-0 w-full overflow-hidden">
                    <div className="text-[9px] opacity-70 whitespace-nowrap truncate font-medium mb-0.5 leading-tight w-full">
                      {stat.label}
                    </div>
                    <div className="text-xs font-bold whitespace-nowrap flex items-center justify-center gap-1 leading-tight min-h-[16px] w-full">
                      {stat.prefix && (
                        <span className="opacity-60 flex-shrink-0">
                          {stat.prefix}
                        </span>
                      )}
                      <span className="tabular-nums truncate">
                        {stat.value}
                      </span>
                      {stat.suffix && (
                        <span className="opacity-60 text-[10px] ml-1 flex-shrink-0">
                          {stat.suffix}
                        </span>
                      )}
                    </div>

                    {/* Mini Chart */}
                    <div className="mt-1.5 opacity-60 group-hover:opacity-100 transition-opacity overflow-hidden">
                      <MiniChart
                        data={chartData[stat.id] || []}
                        color={stat.color.split(' ')[0].replace('text-', '')}
                        height={18}
                        showTrend={false}
                        className="w-full max-w-full"
                      />
                    </div>
                  </div>

                  {/* Hover effect */}
                  {stat.trend === 'up' && (
                    <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute inset-0 rounded-lg animate-ping opacity-20 bg-current"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Functions
function formatHashRate(hashps: number): string {
  if (hashps >= 1e15) return `${(hashps / 1e15).toFixed(2)} PH/s`;
  if (hashps >= 1e12) return `${(hashps / 1e12).toFixed(2)} TH/s`;
  if (hashps >= 1e9) return `${(hashps / 1e9).toFixed(2)} GH/s`;
  if (hashps >= 1e6) return `${(hashps / 1e6).toFixed(2)} MH/s`;
  return `${(hashps / 1e3).toFixed(2)} KH/s`;
}

function formatDifficulty(diff: number): string {
  if (diff >= 1e12) return `${(diff / 1e12).toFixed(2)}T`;
  if (diff >= 1e9) return `${(diff / 1e9).toFixed(2)}B`;
  if (diff >= 1e6) return `${(diff / 1e6).toFixed(2)}M`;
  if (diff >= 1e3) return `${(diff / 1e3).toFixed(2)}K`;
  return diff.toFixed(2);
}

function formatStake(stake: number): string {
  if (stake >= 1e9) return `${(stake / 1e9).toFixed(2)}B`;
  if (stake >= 1e6) return `${(stake / 1e6).toFixed(2)}M`;
  if (stake >= 1e3) return `${(stake / 1e3).toFixed(2)}K`;
  return stake.toFixed(0);
}

// CSS for hiding scrollbar and preventing overflow
const styles = `
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .quick-stats-card {
    contain: layout style paint;
    will-change: transform;
    transform-origin: center center;
  }
  .quick-stats-card * {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .quick-stats-ticker-container {
    overflow: visible;
  }
  .quick-stats-ticker-container .quick-stats-card:hover {
    z-index: 10;
    position: relative;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  if (!document.head.querySelector('style[data-ticker-styles]')) {
    styleSheet.setAttribute('data-ticker-styles', 'true');
    document.head.appendChild(styleSheet);
  }
}
