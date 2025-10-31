'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  TrendUp,
  TrendDown,
  Pulse,
  Hash,
  Clock,
  Lightning,
  ChartBar,
  ChartLine,
} from '@phosphor-icons/react';

interface ChartDataPoint {
  timestamp: number;
  value: number;
  label?: string;
}

interface MiniChartProps {
  data: ChartDataPoint[];
  color?: string;
  height?: number;
  showTrend?: boolean;
  formatValue?: (value: number) => string;
  className?: string;
}

// Simple SVG-based mini chart component
export function MiniChart({
  data,
  color = '#3b82f6',
  height = 40,
  showTrend = true,
  formatValue = v => v.toString(),
  className = '',
}: MiniChartProps) {
  const tCommon = useTranslations('common');
  const tBlocks = useTranslations('blocks');
  const tNetwork = useTranslations('network');
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center h-${height} bg-white/5 rounded`}
      >
        <span className="text-xs text-gray-400">No data</span>
      </div>
    );
  }

  // Calculate chart dimensions and scaling
  const width = 100; // Reduced from 120 to prevent overflow
  const padding = 6; // Reduced padding
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Find min/max values for scaling
  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;

  // Calculate trend
  const trend =
    data.length > 1
      ? ((data[data.length - 1].value - data[0].value) / data[0].value) * 100
      : 0;

  // Generate path points
  const points = data
    .map((point, index) => {
      const x =
        padding +
        (data.length > 1
          ? (index / (data.length - 1)) * chartWidth
          : chartWidth / 2);
      const y =
        padding +
        chartHeight -
        ((point.value - minValue) / valueRange) * chartHeight;

      // Ensure x and y are valid numbers
      const validX = isNaN(x) ? padding + chartWidth / 2 : x;
      const validY = isNaN(y) ? padding + chartHeight / 2 : y;

      return `${validX},${validY}`;
    })
    .join(' ');

  const pathData = `M ${points}`;

  return (
    <div className={`relative ${className} overflow-hidden`}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="overflow-hidden"
        viewBox={`0 0 ${width} ${height}`}
        onMouseLeave={() => setHoveredPoint(null)}
      >
        {/* Grid lines */}
        <defs>
          <pattern
            id="grid"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Chart line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-sm"
        />

        {/* Area fill */}
        <path
          d={`${pathData} L ${padding + chartWidth},${padding + chartHeight} L ${padding},${padding + chartHeight} Z`}
          fill={`url(#gradient-${color.replace('#', '')})`}
          opacity="0.2"
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient
            id={`gradient-${color.replace('#', '')}`}
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Data points */}
        {data.map((point, index) => {
          const x =
            padding +
            (data.length > 1
              ? (index / (data.length - 1)) * chartWidth
              : chartWidth / 2);
          const y =
            padding +
            chartHeight -
            ((point.value - minValue) / valueRange) * chartHeight;
          const isHovered = hoveredPoint === index;

          // Ensure x and y are valid numbers
          const validX = isNaN(x) ? padding + chartWidth / 2 : x;
          const validY = isNaN(y) ? padding + chartHeight / 2 : y;

          return (
            <circle
              key={index}
              cx={validX}
              cy={validY}
              r={isHovered ? 4 : 2}
              fill={color}
              stroke="white"
              strokeWidth={isHovered ? 2 : 1}
              className="transition-all duration-200 cursor-pointer"
              onMouseEnter={() => setHoveredPoint(index)}
            />
          );
        })}
      </svg>

      {/* Trend indicator */}
      {showTrend && (
        <div className="absolute top-0 right-0 flex items-center gap-1">
          {trend > 0 ? (
            <TrendUp className="h-3 w-3 text-green-400" />
          ) : trend < 0 ? (
            <TrendDown className="h-3 w-3 text-red-400" />
          ) : (
            <Pulse className="h-3 w-3 text-gray-400" />
          )}
          <span
            className={`text-xs font-medium ${
              trend > 0
                ? 'text-green-400'
                : trend < 0
                  ? 'text-red-400'
                  : 'text-gray-400'
            }`}
          >
            {Math.abs(trend).toFixed(1)}%
          </span>
        </div>
      )}

      {/* Tooltip */}
      {hoveredPoint !== null && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
          {formatValue(data[hoveredPoint].value)}
        </div>
      )}
    </div>
  );
}

// Enhanced stats card with mini chart
interface ChartStatsCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  data: ChartDataPoint[];
  formatValue?: (value: number) => string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function ChartStatsCard({
  title,
  value,
  icon: Icon,
  color,
  bgColor,
  data,
  formatValue,
  trend = 'neutral',
  className = '',
}: ChartStatsCardProps) {
  return (
    <div
      className={`bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:border-white/30 transition-all duration-300 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-white">{value}</div>
          <div className="text-xs text-gray-400">{title}</div>
        </div>
      </div>

      {/* Mini Chart */}
      <div className="mb-2">
        <MiniChart
          data={data}
          color={color}
          height={32}
          formatValue={formatValue}
        />
      </div>

      {/* Trend indicator */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">24h trend</span>
        <div className="flex items-center gap-1">
          {trend === 'up' && <TrendUp className="h-3 w-3 text-green-400" />}
          {trend === 'down' && <TrendDown className="h-3 w-3 text-red-400" />}
          {trend === 'neutral' && <Pulse className="h-3 w-3 text-gray-400" />}
          <span
            className={`font-medium ${
              trend === 'up'
                ? 'text-green-400'
                : trend === 'down'
                  ? 'text-red-400'
                  : 'text-gray-400'
            }`}
          >
            {trend === 'up' ? '+' : trend === 'down' ? '-' : '0'}%
          </span>
        </div>
      </div>
    </div>
  );
}

// Network metrics chart component
interface NetworkMetricsChartProps {
  hashRateData: ChartDataPoint[];
  difficultyData: ChartDataPoint[];
  mempoolData: ChartDataPoint[];
  blockTimeData: ChartDataPoint[];
}

export function NetworkMetricsChart({
  hashRateData,
  difficultyData,
  mempoolData,
  blockTimeData,
}: NetworkMetricsChartProps) {
  const [activeMetric, setActiveMetric] = useState<
    'hashrate' | 'difficulty' | 'mempool' | 'blocktime'
  >('hashrate');

  const metrics = {
    hashrate: {
      label: 'Hash Rate',
      icon: Hash,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      data: hashRateData,
      formatValue: (v: number) => `${(v / 1000000).toFixed(1)} MH/s`,
    },
    difficulty: {
      label: tBlocks("difficulty"),
      icon: ChartBar,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      data: difficultyData,
      formatValue: (v: number) => `${(v / 1000000).toFixed(1)}M`,
    },
    mempool: {
      label: tNetwork("mempoolSize"),
      icon: Pulse,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      data: mempoolData,
      formatValue: (v: number) => `${v} txs`,
    },
    blocktime: {
      label: tBlocks("blockTime"),
      icon: Clock,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      data: blockTimeData,
      formatValue: (v: number) => `${v.toFixed(1)}s`,
    },
  };

  const activeMetricData = metrics[activeMetric];

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20">
            <ChartLine className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Network Metrics</h3>
            <p className="text-sm text-gray-400">
              Real-time network performance
            </p>
          </div>
        </div>
      </div>

      {/* Metric Selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {Object.entries(metrics).map(([key, metric]) => {
          const Icon = metric.icon;
          return (
            <button
              key={key}
              onClick={() => setActiveMetric(key as any)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeMetric === key
                  ? 'bg-verus-cyan text-black'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <Icon className="h-4 w-4" />
              {metric.label}
            </button>
          );
        })}
      </div>

      {/* Chart Display */}
      <div className="bg-white/5 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-white">
            {activeMetricData.label}
          </h4>
          <span className="text-sm text-gray-400">Last 24 hours</span>
        </div>

        <div className="h-48 flex items-center justify-center">
          <MiniChart
            data={activeMetricData.data}
            color={activeMetricData.color
              .replace('text-', '')
              .replace('-400', '')}
            height={120}
            formatValue={activeMetricData.formatValue}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}

// Utility function to generate mock data for charts
export function generateMockChartData(
  baseValue: number,
  points: number = 24,
  variance: number = 0.1
): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;

  for (let i = points - 1; i >= 0; i--) {
    const timestamp = now - i * hourMs;
    const randomFactor = 1 + (Math.random() - 0.5) * variance;
    const value = baseValue * randomFactor;

    data.push({
      timestamp,
      value: Math.max(0, value),
      label: new Date(timestamp).toLocaleTimeString(),
    });
  }

  return data;
}
