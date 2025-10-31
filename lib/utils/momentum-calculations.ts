// Staking momentum calculation utilities for Verus network

/**
 * Calculate staking momentum trends based on recent performance
 * @param recentStakes - Array of recent stake events with timestamps
 * @returns Momentum analysis with trends and comparisons
 */
export function calculateStakingMomentum(
  recentStakes: Array<{ timestamp: Date; amount: number }>
) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Filter stakes by time periods
  const last7Days = recentStakes.filter(
    stake => stake.timestamp >= sevenDaysAgo
  );
  const last30Days = recentStakes.filter(
    stake => stake.timestamp >= thirtyDaysAgo
  );
  const previous7Days = recentStakes.filter(
    stake =>
      stake.timestamp >=
        new Date(thirtyDaysAgo.getTime() + 7 * 24 * 60 * 60 * 1000) &&
      stake.timestamp < sevenDaysAgo
  );

  // Calculate stake frequencies
  const frequency7d = last7Days.length / 7; // stakes per day
  const frequency30d = last30Days.length / 30;
  const frequencyPrevious7d = previous7Days.length / 7;

  // Calculate momentum indicators
  const frequencyTrend =
    frequency7d > frequencyPrevious7d
      ? 'increasing'
      : frequency7d < frequencyPrevious7d
        ? 'decreasing'
        : 'stable';

  const frequencyChange =
    frequencyPrevious7d > 0
      ? ((frequency7d - frequencyPrevious7d) / frequencyPrevious7d) * 100
      : 0;

  // Calculate reward momentum (if we have reward data)
  const reward7d = last7Days.reduce((sum, stake) => sum + stake.amount, 0);
  const rewardPrevious7d = previous7Days.reduce(
    (sum, stake) => sum + stake.amount,
    0
  );

  const rewardTrend =
    reward7d > rewardPrevious7d
      ? 'increasing'
      : reward7d < rewardPrevious7d
        ? 'decreasing'
        : 'stable';

  const rewardChange =
    rewardPrevious7d > 0
      ? ((reward7d - rewardPrevious7d) / rewardPrevious7d) * 100
      : 0;

  return {
    // Frequency metrics
    frequency7d,
    frequency30d,
    frequencyChange,
    frequencyTrend,

    // Reward metrics
    reward7d,
    rewardPrevious7d,
    rewardChange,
    rewardTrend,

    // Overall momentum score
    momentumScore: calculateMomentumScore(
      frequencyTrend,
      rewardTrend,
      frequencyChange,
      rewardChange
    ),

    // Activity indicators
    lastStakeDays:
      recentStakes.length > 0 && recentStakes[recentStakes.length - 1]
        ? Math.floor(
            (now.getTime() -
              recentStakes[recentStakes.length - 1]!.timestamp.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null,

    // Period comparisons
    periods: {
      last7d: last7Days.length,
      previous7d: previous7Days.length,
      last30d: last30Days.length,
    },
  };
}

/**
 * Calculate overall momentum score (0-100)
 */
function calculateMomentumScore(
  frequencyTrend: 'increasing' | 'stable' | 'decreasing',
  rewardTrend: 'increasing' | 'stable' | 'decreasing',
  frequencyChange: number,
  rewardChange: number
): number {
  let score = 50; // Base score

  // Frequency trend impact
  if (frequencyTrend === 'increasing') score += 20;
  else if (frequencyTrend === 'decreasing') score -= 20;

  // Reward trend impact
  if (rewardTrend === 'increasing') score += 20;
  else if (rewardTrend === 'decreasing') score -= 20;

  // Change magnitude impact (capped)
  const frequencyImpact = Math.min(Math.abs(frequencyChange) / 10, 10);
  const rewardImpact = Math.min(Math.abs(rewardChange) / 10, 10);

  if (frequencyChange > 0) score += frequencyImpact;
  else score -= frequencyImpact;

  if (rewardChange > 0) score += rewardImpact;
  else score -= rewardImpact;

  return Math.max(0, Math.min(100, score));
}

/**
 * Format momentum trend for display
 */
export function formatMomentumTrend(
  trend: 'increasing' | 'stable' | 'decreasing'
): string {
  switch (trend) {
    case 'increasing':
      return 'Accelerating';
    case 'decreasing':
      return 'Decelerating';
    case 'stable':
      return 'Stable';
    default:
      return 'Unknown';
  }
}

/**
 * Get momentum color for UI
 */
export function getMomentumColor(score: number): string {
  if (score >= 70) return 'green';
  if (score >= 40) return 'yellow';
  return 'red';
}

/**
 * Calculate expected frequency based on staking weight
 */
export function calculateExpectedFrequency(
  yourWeight: number,
  networkWeight: number
): number {
  if (!yourWeight || !networkWeight || yourWeight <= 0 || networkWeight <= 0) {
    return 0;
  }

  // With 50% PoS blocks and ~1440 blocks per day, expected stakes per day
  const blocksPerDay = 1440;
  const posBlocksPerDay = blocksPerDay * 0.5; // 50% PoS
  const yourShare = yourWeight / networkWeight;

  return posBlocksPerDay * yourShare;
}

/**
 * Calculate performance ratio (actual vs expected)
 */
export function calculatePerformanceRatio(
  actualFrequency: number,
  expectedFrequency: number
): number {
  if (!expectedFrequency || expectedFrequency <= 0) {
    return 0;
  }

  return (actualFrequency / expectedFrequency) * 100;
}

/**
 * Format performance ratio for display
 */
export function formatPerformanceRatio(ratio: number): string {
  if (ratio >= 120) return 'Excellent';
  if (ratio >= 100) return 'Good';
  if (ratio >= 80) return 'Fair';
  if (ratio >= 50) return 'Below Average';
  return 'Poor';
}
