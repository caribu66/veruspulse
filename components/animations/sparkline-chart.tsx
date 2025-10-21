'use client';

import { useMemo } from 'react';

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showDots?: boolean;
  className?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export function SparklineChart({
  data,
  width = 80,
  height = 24,
  color,
  showDots = false,
  className = '',
  trend = 'neutral',
}: SparklineChartProps) {
  const { path, dots, trendColor } = useMemo(() => {
    if (!data || data.length === 0) {
      return { path: '', dots: [], trendColor: '#6b7280' };
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
      const x =
        data.length > 1 ? (index / (data.length - 1)) * width : width / 2;
      const y = height - ((value - min) / range) * height;

      // Ensure x and y are valid numbers
      const validX = isNaN(x) ? width / 2 : x;
      const validY = isNaN(y) ? height / 2 : y;

      return { x: validX, y: validY, value };
    });

    // Create SVG path
    const pathData = points
      .map((point, index) => {
        if (index === 0) {
          return `M ${point.x} ${point.y}`;
        }
        return `L ${point.x} ${point.y}`;
      })
      .join(' ');

    // Determine trend color
    let trendColor = color || '#6b7280';
    if (!color) {
      if (trend === 'up') {
        trendColor = '#10b981'; // green
      } else if (trend === 'down') {
        trendColor = '#ef4444'; // red
      } else {
        trendColor = '#60a5fa'; // blue
      }
    }

    return { path: pathData, dots: showDots ? points : [], trendColor };
  }, [data, width, height, color, showDots, trend]);

  if (!data || data.length === 0) {
    return (
      <svg width={width} height={height} className={className}>
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="#374151"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
      </svg>
    );
  }

  return (
    <svg width={width} height={height} className={className}>
      {/* Gradient definition */}
      <defs>
        <linearGradient
          id={`sparkline-gradient-${trend}`}
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor={trendColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={trendColor} stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Area under the line */}
      <path
        d={`${path} L ${width} ${height} L 0 ${height} Z`}
        fill={`url(#sparkline-gradient-${trend})`}
      />

      {/* Line */}
      <path
        d={path}
        fill="none"
        stroke={trendColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dots at each data point */}
      {dots.map(
        (dot, index) =>
          !isNaN(dot.x) &&
          !isNaN(dot.y) && (
            <circle
              key={index}
              cx={dot.x}
              cy={dot.y}
              r="2"
              fill={trendColor}
              className="opacity-70 hover:opacity-100 transition-opacity"
            />
          )
      )}
    </svg>
  );
}
