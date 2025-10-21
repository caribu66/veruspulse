'use client';

import { useMemo, useState } from 'react';
import { formatFriendlyNumber } from '@/lib/utils/number-formatting';

interface UTXO {
  value: number; // in VRSC
  confirmations: number;
  status: 'eligible' | 'cooldown' | 'inactive';
  txid?: string;
}

interface UTXOBubbleChartProps {
  utxos: UTXO[];
  width?: number;
  height?: number;
  className?: string;
}

export function UTXOBubbleChart({
  utxos,
  width = 600,
  height = 400,
  className = '',
}: UTXOBubbleChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { bubbles, maxValue, minValue } = useMemo(() => {
    if (
      !utxos ||
      utxos.length === 0 ||
      !width ||
      !height ||
      width <= 0 ||
      height <= 0
    ) {
      return { bubbles: [], maxValue: 0, minValue: 0 };
    }

    const values = utxos.map(u => u.value);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);

    // Simple force-directed layout simulation
    // Position bubbles based on status and value
    const bubbles = utxos.map((utxo, index) => {
      // Determine base position by status
      let baseX = 0;
      let baseY = 0;

      if (utxo.status === 'eligible') {
        baseX = width * 0.25;
        baseY = height * 0.5;
      } else if (utxo.status === 'cooldown') {
        baseX = width * 0.5;
        baseY = height * 0.5;
      } else {
        baseX = width * 0.75;
        baseY = height * 0.5;
      }

      // Add some randomness but keep in clusters
      const angle = (index * 2.4) % (Math.PI * 2);
      const distance = Math.random() * 80 + 20;
      const x = baseX + Math.cos(angle) * distance;
      const y = baseY + Math.sin(angle) * distance;

      // Calculate radius based on value (logarithmic scale for better visualization)
      const minRadius = 4;
      const maxRadius = 40;
      const normalizedValue =
        maxValue > minValue
          ? (Math.log(utxo.value) - Math.log(minValue)) /
            (Math.log(maxValue) - Math.log(minValue))
          : 0.5;
      const radius = minRadius + normalizedValue * (maxRadius - minRadius);

      return {
        ...utxo,
        x: isNaN(x)
          ? width * 0.5
          : Math.max(radius, Math.min(width - radius, x)),
        y: isNaN(y)
          ? height * 0.5
          : Math.max(radius, Math.min(height - radius, y)),
        radius: isNaN(radius) ? 10 : radius,
      };
    });

    return { bubbles, maxValue, minValue };
  }, [utxos, width, height]);

  const getColor = (status: string) => {
    switch (status) {
      case 'eligible':
        return { fill: 'rgba(16, 185, 129, 0.6)', stroke: 'rgb(16, 185, 129)' }; // green
      case 'cooldown':
        return { fill: 'rgba(245, 158, 11, 0.6)', stroke: 'rgb(245, 158, 11)' }; // yellow
      case 'inactive':
        return {
          fill: 'rgba(107, 114, 128, 0.6)',
          stroke: 'rgb(107, 114, 128)',
        }; // gray
      default:
        return { fill: 'rgba(59, 130, 246, 0.6)', stroke: 'rgb(59, 130, 246)' }; // blue
    }
  };

  // Guard against invalid dimensions or empty data
  if (
    bubbles.length === 0 ||
    !width ||
    !height ||
    width <= 0 ||
    height <= 0 ||
    isNaN(width) ||
    isNaN(height)
  ) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-gray-800/30 rounded-lg`}
        style={{ width: width || 600, height: height || 400 }}
      >
        <p className="text-gray-400">No UTXO data available</p>
      </div>
    );
  }

  return (
    <div className={`${className} relative`}>
      <svg width={width} height={height} className="bg-gray-900/30 rounded-lg">
        {/* Status zone backgrounds */}
        <defs>
          <linearGradient
            id="eligible-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="rgba(16, 185, 129, 0.1)" />
            <stop offset="100%" stopColor="rgba(16, 185, 129, 0)" />
          </linearGradient>
          <linearGradient
            id="cooldown-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="rgba(245, 158, 11, 0.1)" />
            <stop offset="100%" stopColor="rgba(245, 158, 11, 0)" />
          </linearGradient>
          <linearGradient
            id="inactive-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="rgba(107, 114, 128, 0.1)" />
            <stop offset="100%" stopColor="rgba(107, 114, 128, 0)" />
          </linearGradient>
        </defs>

        {/* Zone backgrounds */}
        <rect
          x="0"
          y="0"
          width={width * 0.33}
          height={height}
          fill="url(#eligible-gradient)"
        />
        <rect
          x={width * 0.33}
          y="0"
          width={width * 0.33}
          height={height}
          fill="url(#cooldown-gradient)"
        />
        <rect
          x={width * 0.66}
          y="0"
          width={width * 0.34}
          height={height}
          fill="url(#inactive-gradient)"
        />

        {/* Zone labels */}
        <text
          x={width * 0.16}
          y="20"
          fill="rgb(16, 185, 129)"
          fontSize="12"
          textAnchor="middle"
          fontWeight="600"
        >
          ELIGIBLE
        </text>
        <text
          x={width * 0.5}
          y="20"
          fill="rgb(245, 158, 11)"
          fontSize="12"
          textAnchor="middle"
          fontWeight="600"
        >
          COOLDOWN
        </text>
        <text
          x={width * 0.83}
          y="20"
          fill="rgb(107, 114, 128)"
          fontSize="12"
          textAnchor="middle"
          fontWeight="600"
        >
          INACTIVE
        </text>

        {/* Bubbles */}
        {bubbles.map((bubble, index) => {
          const colors = getColor(bubble.status);
          const isHovered = hoveredIndex === index;

          return (
            <g
              key={index}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-pointer transition-all"
            >
              <circle
                cx={isNaN(bubble.x) ? width / 2 : bubble.x}
                cy={isNaN(bubble.y) ? height / 2 : bubble.y}
                r={isNaN(bubble.radius) ? 10 : bubble.radius}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth={isHovered ? 3 : 1.5}
                className="transition-all"
                style={{
                  filter: isHovered
                    ? `drop-shadow(0 0 10px ${colors.stroke})`
                    : 'none',
                }}
              >
                <title>
                  {formatFriendlyNumber(bubble.value, { precision: 2 })} VRSC
                  {'\n'}Status: {bubble.status}
                  {'\n'}Confirmations: {bubble.confirmations}
                </title>
              </circle>

              {/* Show value label on larger bubbles */}
              {bubble.radius > 15 && !isNaN(bubble.x) && !isNaN(bubble.y) && (
                <text
                  x={bubble.x}
                  y={bubble.y}
                  fill="white"
                  fontSize="10"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontWeight="600"
                  pointerEvents="none"
                >
                  {bubble.value >= 1000
                    ? formatFriendlyNumber(bubble.value, { precision: 0 })
                    : bubble.value.toFixed(0)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Hover info panel */}
      {hoveredIndex !== null && bubbles[hoveredIndex] && (
        <div className="absolute top-2 right-2 bg-gray-900/95 border border-gray-700 rounded-lg p-3 shadow-xl backdrop-blur-sm">
          <div className="text-white font-semibold mb-1">
            {formatFriendlyNumber(bubbles[hoveredIndex].value, {
              precision: 2,
            })}{' '}
            VRSC
          </div>
          <div className="text-sm text-gray-400 space-y-1">
            <div>
              Status:{' '}
              <span className="text-white capitalize">
                {bubbles[hoveredIndex].status}
              </span>
            </div>
            <div>
              Confirmations:{' '}
              <span className="text-white">
                {bubbles[hoveredIndex].confirmations}
              </span>
            </div>
            {bubbles[hoveredIndex].txid && (
              <div className="text-xs font-mono text-gray-500 mt-2">
                {bubbles[hoveredIndex].txid?.slice(0, 16)}...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 mt-4 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-gray-400">
            Eligible ({bubbles.filter(b => b.status === 'eligible').length})
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span className="text-gray-400">
            Cooldown ({bubbles.filter(b => b.status === 'cooldown').length})
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-gray-500"></div>
          <span className="text-gray-400">
            Inactive ({bubbles.filter(b => b.status === 'inactive').length})
          </span>
        </div>
      </div>
    </div>
  );
}
