'use client';

import { useState, useMemo } from 'react';
import { formatFriendlyNumber } from '@/lib/utils/number-formatting';

interface UTXO {
  value: number; // Value in satoshis
  valueVRSC?: number; // Value in VRSC for display
  confirmations: number;
  status: 'eligible' | 'cooldown' | 'inactive';
  txid: string;
  blockTime?: string; // Block time for connecting related UTXOs
  // New fields for stake differentiation
  isStakeInput?: boolean; // UTXO that was used to find the stake
  isStakeOutput?: boolean; // UTXO created by the stake (includes earned amount)
  earnedAmount?: number; // Amount earned from this stake (in VRSC)
  stakeReward?: number; // The 3 VRSC reward amount
}

interface UTXOBubbleChartProps {
  utxos: UTXO[];
  width?: number;
  height?: number;
  className?: string;
}

export function UTXOBubbleChartNew({
  utxos,
  width = 600,
  height = 400,
  className = '',
}: UTXOBubbleChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Calculate bubble positions with a simple, reliable algorithm
  // Calculate original counts for sampling display
  const originalCounts = useMemo(() => {
    if (!utxos || utxos.length === 0)
      return { eligible: 0, cooldown: 0, inactive: 0 };

    return {
      eligible: utxos.filter(u => u.status === 'eligible').length,
      cooldown: utxos.filter(u => u.status === 'cooldown').length,
      inactive: utxos.filter(u => u.status === 'inactive').length,
    };
  }, [utxos]);

  const bubbles = useMemo(() => {
    if (!utxos || utxos.length === 0) return [];

    const zoneWidth = width / 3;
    const padding = 20;
    const minRadius = 6; // Increased for better visibility
    const maxRadius = 18; // Increased for better visibility

    // Group UTXOs by status
    const eligibleUtxos = utxos.filter(u => u.status === 'eligible');
    const cooldownUtxos = utxos.filter(u => u.status === 'cooldown');
    const inactiveUtxos = utxos.filter(u => u.status === 'inactive');

    // Smart UTXO management for large datasets
    const MAX_UTXOS_PER_SECTION = 50; // Maximum UTXOs to display per section (reduced for better readability)

    // Function to intelligently sample UTXOs - PRIORITIZE BIGGEST UTXOs FIRST!
    const smartSampleUtxos = (utxos: UTXO[], maxCount: number) => {
      if (utxos.length <= maxCount) return utxos;

      // Filter out dust UTXOs (less than 0.000001 VRSC - very small dust)
      const dustThreshold = 100; // 0.000001 VRSC in satoshis
      const nonDustUtxos = utxos.filter(u => u.value >= dustThreshold);

      // Always include stake-related UTXOs (highest priority)
      const stakeUtxos = nonDustUtxos.filter(
        u => u.isStakeInput || u.isStakeOutput
      );

      // Sort ALL non-stake UTXOs by value (BIGGEST FIRST!)
      const sortedByValue = nonDustUtxos
        .filter(u => !u.isStakeInput && !u.isStakeOutput)
        .sort((a, b) => b.value - a.value);

      const selected = new Set();
      const result: UTXO[] = [];

      // Add stake UTXOs first (always include)
      stakeUtxos.forEach(utxo => {
        if (!selected.has(utxo.txid)) {
          selected.add(utxo.txid);
          result.push(utxo);
        }
      });

      // Add BIGGEST UTXOs first - take as many as we can fit!
      const remainingSlots = maxCount - result.length;
      sortedByValue.slice(0, remainingSlots).forEach(utxo => {
        if (!selected.has(utxo.txid) && result.length < maxCount) {
          selected.add(utxo.txid);
          result.push(utxo);
        }
      });

      return result;
    };

    // Apply smart sampling to each section
    const sampledEligibleUtxos = smartSampleUtxos(
      eligibleUtxos,
      MAX_UTXOS_PER_SECTION
    );
    const sampledCooldownUtxos = smartSampleUtxos(
      cooldownUtxos,
      MAX_UTXOS_PER_SECTION
    );
    const sampledInactiveUtxos = smartSampleUtxos(
      inactiveUtxos,
      MAX_UTXOS_PER_SECTION
    );

    // Calculate average UTXO size for eligible UTXOs (for staking probability)
    const averageEligibleValue =
      sampledEligibleUtxos.length > 0
        ? sampledEligibleUtxos.reduce((sum, utxo) => sum + utxo.value, 0) /
          sampledEligibleUtxos.length
        : 0;

    // Calculate value range for radius scaling
    const allValues = utxos.map(u => u.value);
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);

    // Function to determine staking probability tier
    const getProbabilityTier = (utxo: UTXO): 'high' | 'medium' | 'low' => {
      // Dust amounts (less than 0.000001 VRSC) should never be considered for staking
      const dustThreshold = 100; // 0.000001 VRSC in satoshis
      if (utxo.status !== 'eligible' || utxo.value < dustThreshold)
        return 'low';

      // If no average value or very small average, be conservative
      if (averageEligibleValue === 0 || averageEligibleValue < dustThreshold)
        return 'low';

      const relativeSize = utxo.value / averageEligibleValue;
      if (relativeSize >= 0.5) return 'high';
      if (relativeSize >= 0.25) return 'medium';
      return 'low';
    };

    const processedBubbles: Array<
      UTXO & {
        x: number;
        y: number;
        radius: number;
        probabilityTier: 'high' | 'medium' | 'low';
      }
    > = [];

    // Process each status group
    const processGroup = (group: UTXO[], zoneIndex: number) => {
      const zoneX = zoneIndex * zoneWidth;
      const usableWidth = zoneWidth - padding * 2;
      const usableHeight = height - padding * 2;

      if (group.length === 0) return;

      // Simple grid calculation
      const cols = Math.ceil(Math.sqrt(group.length));
      const rows = Math.ceil(group.length / cols);

      const cellWidth = Math.max(usableWidth / cols, 30); // Minimum cell width for spacing
      const cellHeight = Math.max(usableHeight / rows, 30); // Minimum cell height for spacing

      group.forEach((utxo, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);

        // Calculate radius based on value
        const normalizedValue =
          maxValue > minValue
            ? (utxo.value - minValue) / (maxValue - minValue)
            : 0.5;
        const radius = minRadius + normalizedValue * (maxRadius - minRadius);

        // Calculate position within the zone with stricter bounds
        const x = zoneX + padding + col * cellWidth + cellWidth / 2;
        const y = padding + row * cellHeight + cellHeight / 2;

        // Ensure position is strictly within zone bounds
        const finalX = Math.max(
          zoneX + radius + 5,
          Math.min(zoneX + zoneWidth - radius - 5, x)
        );
        const finalY = Math.max(radius + 5, Math.min(height - radius - 5, y));

        processedBubbles.push({
          ...utxo,
          x: finalX,
          y: finalY,
          radius: Math.max(minRadius, radius),
          probabilityTier: getProbabilityTier(utxo),
        });
      });
    };

    // Process each zone with sampled UTXOs
    processGroup(sampledEligibleUtxos, 0); // Eligible zone
    processGroup(sampledCooldownUtxos, 1); // Cooldown zone
    processGroup(sampledInactiveUtxos, 2); // Inactive zone

    return processedBubbles;
  }, [utxos, width, height]);

  // Get bubble colors based on status, probability tier, and stake type
  const getBubbleColors = (
    utxo: UTXO & { probabilityTier?: 'high' | 'medium' | 'low' }
  ) => {
    const { status, probabilityTier, isStakeInput, isStakeOutput } = utxo;

    // Special colors for stake-related UTXOs (highest priority)
    if (isStakeInput === true) {
      return {
        fill: 'rgba(59, 130, 246, 0.9)', // Blue for input stake UTXO
        stroke: '#3b82f6',
        pattern: 'stake-input', // Special pattern identifier
      };
    }

    if (isStakeOutput === true) {
      return {
        fill: 'rgba(168, 85, 247, 0.9)', // Purple for output stake UTXO
        stroke: '#a855f7',
        pattern: 'stake-output', // Special pattern identifier
      };
    }

    // Regular UTXO colors
    switch (status) {
      case 'eligible':
        // Use probability-based colors for eligible UTXOs
        switch (probabilityTier) {
          case 'high':
            return {
              fill: 'rgba(16, 185, 129, 0.9)',
              stroke: '#10b981',
              pattern: 'normal',
            };
          case 'medium':
            return {
              fill: 'rgba(234, 179, 8, 0.8)',
              stroke: '#eab308',
              pattern: 'normal',
            };
          case 'low':
            return {
              fill: 'rgba(249, 115, 22, 0.8)',
              stroke: '#f97316',
              pattern: 'normal',
            };
          default:
            return {
              fill: 'rgba(16, 185, 129, 0.9)',
              stroke: '#10b981',
              pattern: 'normal',
            };
        }
      case 'cooldown':
        return {
          fill: 'rgba(249, 115, 22, 0.8)',
          stroke: '#f97316',
          pattern: 'normal',
        };
      case 'inactive':
        return {
          fill: 'rgba(156, 163, 175, 0.8)',
          stroke: '#9ca3af',
          pattern: 'normal',
        };
      default:
        return {
          fill: 'rgba(156, 163, 175, 0.8)',
          stroke: '#9ca3af',
          pattern: 'normal',
        };
    }
  };

  if (!utxos || utxos.length === 0) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-gray-900/30 rounded-lg`}
        style={{ width, height }}
      >
        <p className="text-gray-400">No UTXOs to display</p>
      </div>
    );
  }

  const zoneWidth = width / 3;

  return (
    <div className={`${className} relative`}>
      <svg
        width={width}
        height={height}
        className="bg-gray-900/30 rounded-lg"
        style={{ border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {/* Status zone backgrounds */}
        <defs>
          <linearGradient
            id="eligible-gradient-new"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="rgba(34, 197, 94, 0.1)" />
            <stop offset="100%" stopColor="rgba(34, 197, 94, 0.05)" />
          </linearGradient>
          <linearGradient
            id="cooldown-gradient-new"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="rgba(249, 115, 22, 0.1)" />
            <stop offset="100%" stopColor="rgba(249, 115, 22, 0.05)" />
          </linearGradient>
          <linearGradient
            id="inactive-gradient-new"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="rgba(156, 163, 175, 0.1)" />
            <stop offset="100%" stopColor="rgba(156, 163, 175, 0.05)" />
          </linearGradient>
        </defs>

        {/* Zone backgrounds */}
        <rect
          x={0}
          y={0}
          width={zoneWidth}
          height={height}
          fill="url(#eligible-gradient-new)"
        />
        <rect
          x={zoneWidth}
          y={0}
          width={zoneWidth}
          height={height}
          fill="url(#cooldown-gradient-new)"
        />
        <rect
          x={zoneWidth * 2}
          y={0}
          width={zoneWidth}
          height={height}
          fill="url(#inactive-gradient-new)"
        />

        {/* Zone labels */}
        <text
          x={zoneWidth / 2}
          y={20}
          textAnchor="middle"
          className="fill-teal-400 text-sm font-medium"
        >
          ELIGIBLE
        </text>
        <text
          x={zoneWidth + zoneWidth / 2}
          y={20}
          textAnchor="middle"
          className="fill-orange-400 text-sm font-medium"
        >
          COOLDOWN
        </text>
        <text
          x={zoneWidth * 2 + zoneWidth / 2}
          y={20}
          textAnchor="middle"
          className="fill-gray-400 text-sm font-medium"
        >
          INACTIVE
        </text>

        {/* Render connecting lines between related stake UTXOs */}
        {bubbles.map((bubble, index) => {
          if (bubble.isStakeInput && bubble.blockTime) {
            // Find the corresponding stake output UTXO (same blockTime)
            const correspondingOutput = bubbles.find(
              b =>
                b.isStakeOutput &&
                b.blockTime === bubble.blockTime &&
                b !== bubble
            );

            if (correspondingOutput) {
              return (
                <line
                  key={`connection-${index}`}
                  x1={bubble.x}
                  y1={bubble.y}
                  x2={correspondingOutput.x}
                  y2={correspondingOutput.y}
                  stroke="rgba(168, 85, 247, 0.6)"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  className="animate-pulse"
                />
              );
            }
          }
          return null;
        })}

        {/* Render bubbles */}
        {bubbles.map((bubble, index) => {
          const colors = getBubbleColors(bubble);
          const isHovered = hoveredIndex === index;

          // Get probability description
          const getProbabilityDescription = (
            tier: 'high' | 'medium' | 'low'
          ) => {
            switch (tier) {
              case 'high':
                return 'Good staking potential (larger UTXO)';
              case 'medium':
                return 'Moderate staking potential';
              case 'low':
                return 'Low staking potential (small/dust UTXO)';
              default:
                return 'Unknown probability';
            }
          };

          return (
            <g
              key={`${bubble.txid}-${index}`}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-pointer transition-all"
            >
              <circle
                cx={bubble.x}
                cy={bubble.y}
                r={bubble.radius}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth={isHovered ? 3 : 2}
                className="transition-all"
                style={{
                  filter: isHovered
                    ? `drop-shadow(0 0 10px ${colors.stroke})`
                    : `drop-shadow(0 0 2px ${colors.stroke})`,
                }}
              >
                <title>
                  {(() => {
                    // Use valueVRSC if available and > 0, otherwise calculate from satoshis
                    const vrscAmount =
                      bubble.valueVRSC && bubble.valueVRSC > 0
                        ? bubble.valueVRSC
                        : bubble.value / 100000000;

                    // Format VRSC amount properly
                    if (vrscAmount < 0.01) {
                      return vrscAmount.toFixed(6) + ' VRSC';
                    } else if (vrscAmount < 1) {
                      return vrscAmount.toFixed(4) + ' VRSC';
                    } else {
                      return vrscAmount.toFixed(2) + ' VRSC';
                    }
                  })()}
                  {'\n'}Status: {bubble.status}
                  {'\n'}Confirmations: {bubble.confirmations}
                  {bubble.isStakeInput && '\nInput UTXO (Found the stake)'}
                  {bubble.isStakeOutput &&
                    `\nOutput UTXO (+${bubble.earnedAmount || bubble.stakeReward || 3} VRSC earned)`}
                  {bubble.status === 'eligible' &&
                    !bubble.isStakeInput &&
                    !bubble.isStakeOutput &&
                    `\nStaking Probability: ${bubble.probabilityTier?.toUpperCase() || 'UNKNOWN'}`}
                  {bubble.status === 'eligible' &&
                    !bubble.isStakeInput &&
                    !bubble.isStakeOutput &&
                    `\n${getProbabilityDescription(bubble.probabilityTier || 'high')}`}
                </title>
              </circle>

              {/* Show earned amount for stake output UTXOs */}
              {bubble.isStakeOutput &&
                bubble.valueVRSC &&
                bubble.valueVRSC >= 2.9 &&
                bubble.valueVRSC <= 3.1 && (
                  <text
                    x={bubble.x}
                    y={bubble.y + bubble.radius + 12}
                    textAnchor="middle"
                    className="fill-purple-300 text-xs font-medium"
                    style={{ fontSize: '9px' }}
                  >
                    +{bubble.earnedAmount || bubble.stakeReward || 3} VRSC
                  </text>
                )}
            </g>
          );
        })}
      </svg>

      {/* Status Legend */}
      <div className="flex justify-center mt-4 space-x-6">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-slate-300"></div>
          <span className="text-sm text-gray-300">
            Eligible (
            {
              bubbles.filter(
                b =>
                  b.status === 'eligible' && !b.isStakeInput && !b.isStakeOutput
              ).length
            }
            )
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-slate-400"></div>
          <span className="text-sm text-gray-300">
            Cooldown (
            {
              bubbles.filter(
                b =>
                  b.status === 'cooldown' && !b.isStakeInput && !b.isStakeOutput
              ).length
            }
            )
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-gray-500"></div>
          <span className="text-sm text-gray-300">
            Inactive (
            {
              bubbles.filter(
                b =>
                  b.status === 'inactive' && !b.isStakeInput && !b.isStakeOutput
              ).length
            }
            )
          </span>
        </div>
      </div>

      {/* Sampling Information */}
      {(originalCounts.eligible > 50 ||
        originalCounts.cooldown > 50 ||
        originalCounts.inactive > 50) && (
        <div className="flex justify-center mt-3">
          <div className="bg-slate-500/20 border border-slate-400/30 rounded-lg px-3 py-2">
            <span className="text-sm text-slate-300">
              📊 Showing {Math.min(originalCounts.eligible, 50)}/
              {originalCounts.eligible} eligible,
              {Math.min(originalCounts.cooldown, 50)}/{originalCounts.cooldown}{' '}
              cooldown,
              {Math.min(originalCounts.inactive, 50)}/{originalCounts.inactive}{' '}
              inactive UTXOs
              <br />
              <span className="text-xs text-slate-400">
                Priority: Stake UTXOs → BIGGEST UTXOs first (no dust!)
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Stake UTXO Legend */}
      {(bubbles.some(b => b.isStakeInput) ||
        bubbles.some(b => b.isStakeOutput)) && (
        <div className="flex justify-center mt-3 space-x-6">
          {bubbles.some(b => b.isStakeInput) && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-slate-500"></div>
              <span className="text-sm text-gray-300">
                Input Stake ({bubbles.filter(b => b.isStakeInput).length})
              </span>
            </div>
          )}
          {bubbles.some(b => b.isStakeOutput) && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-slate-600"></div>
              <span className="text-sm text-gray-300">
                Output Stake ({bubbles.filter(b => b.isStakeOutput).length})
              </span>
            </div>
          )}
        </div>
      )}

      {/* Staking Probability Legend */}
      <div className="flex justify-center mt-3 space-x-6">
        <div className="flex items-center space-x-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: '#10b981' }}
          ></div>
          <span className="text-sm text-gray-300">
            High Probability (≥50% avg)
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: '#eab308' }}
          ></div>
          <span className="text-sm text-gray-300">
            Medium Probability (25-50% avg)
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: '#f97316' }}
          ></div>
          <span className="text-sm text-gray-300">
            Low Probability (&lt;25% avg)
          </span>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-2 text-xs text-gray-400 text-center">
        Bubble size = UTXO value • Color = Staking probability • Hover for
        details
      </div>
    </div>
  );
}
