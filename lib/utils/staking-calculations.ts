// Staking calculation utilities for Verus network

/**
 * Calculate expected time to next stake based on weight ratios
 * @param yourWeight - Your eligible staking balance in VRSC
 * @param networkWeight - Total network staking weight in VRSC
 * @returns Object with seconds and formatted string
 */
export function calculateExpectedStakeTime(
  yourWeight: number,
  networkWeight: number
): { seconds: number; formatted: string } {
  if (!yourWeight || !networkWeight || yourWeight <= 0 || networkWeight <= 0) {
    return { seconds: 0, formatted: 'N/A' };
  }

  // Verus has ~50% PoS blocks, so multiply by 2 for expected time
  // Formula: (networkWeight / yourWeight) * 2 * 60 seconds per block
  const blocksUntilStake = (networkWeight / yourWeight) * 2;
  const secondsUntilStake = blocksUntilStake * 60;

  return {
    seconds: Math.round(secondsUntilStake),
    formatted: formatStakeDuration(secondsUntilStake),
  };
}

/**
 * Format time duration in a human-readable format
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "18.5 hours", "2.3 days")
 */
export function formatStakeDuration(seconds: number): string {
  if (seconds <= 0) return 'N/A';

  const minutes = seconds / 60;
  const hours = minutes / 60;
  const days = hours / 24;

  if (days >= 1) {
    return `${days.toFixed(1)} days`;
  } else if (hours >= 1) {
    return `${hours.toFixed(1)} hours`;
  } else if (minutes >= 1) {
    return `${minutes.toFixed(1)} minutes`;
  } else {
    return `${seconds.toFixed(0)} seconds`;
  }
}

/**
 * Calculate network participation percentage
 * @param yourWeight - Your eligible staking balance in VRSC
 * @param networkWeight - Total network staking weight in VRSC
 * @returns Participation percentage (0-100)
 */
export function calculateParticipationRate(
  yourWeight: number,
  networkWeight: number
): number {
  if (!yourWeight || !networkWeight || yourWeight <= 0 || networkWeight <= 0) {
    return 0;
  }

  // Prevent division by zero and handle edge cases
  if (networkWeight === 0) {
    return 0;
  }

  const percentage = (yourWeight / networkWeight) * 100;

  // Cap at 100% to prevent display issues from data inconsistencies
  return Math.min(percentage, 100);
}

/**
 * Format participation percentage for display
 * @param percentage - Raw percentage value
 * @returns Formatted percentage string with appropriate precision
 */
export function formatParticipationPercentage(percentage: number): string {
  // Handle edge cases
  if (percentage === 0) {
    return '0%';
  }

  if (percentage >= 1) {
    return `${percentage.toFixed(2)}%`;
  } else if (percentage >= 0.01) {
    return `${percentage.toFixed(3)}%`;
  } else if (percentage >= 0.001) {
    return `${percentage.toFixed(4)}%`;
  } else if (percentage > 0) {
    return `${percentage.toFixed(6)}%`;
  } else {
    return '0%';
  }
}

/**
 * Calculate staking frequency based on weight
 * @param yourWeight - Your eligible staking balance in VRSC
 * @param networkWeight - Total network staking weight in VRSC
 * @returns Expected stakes per day
 */
export function calculateStakingFrequency(
  yourWeight: number,
  networkWeight: number
): number {
  if (!yourWeight || !networkWeight || yourWeight <= 0 || networkWeight <= 0) {
    return 0;
  }

  // With 50% PoS blocks and ~1440 blocks per day, your expected stakes per day
  const blocksPerDay = 1440;
  const posBlocksPerDay = blocksPerDay * 0.5; // 50% PoS
  const yourShare = yourWeight / networkWeight;

  return posBlocksPerDay * yourShare;
}
