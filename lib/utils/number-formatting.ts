/**
 * Comprehensive number formatting utilities for user-friendly display
 */

export interface NumberFormatOptions {
  precision?: number;
  showUnit?: boolean;
  unit?: string;
  compact?: boolean;
  locale?: string;
}

/**
 * Format large numbers with friendly suffixes (K, M, B, T)
 */
export function formatFriendlyNumber(
  value: number | string | null | undefined,
  options: NumberFormatOptions = {}
): string {
  const {
    precision = 1,
    showUnit = false,
    unit = '',
    compact = true,
    locale = 'en-US',
  } = options;

  if (value === null || value === undefined || isNaN(Number(value))) {
    return 'N/A';
  }

  const num = Number(value);

  if (num === 0) return '0' + (showUnit && unit ? ` ${unit}` : '');

  // For very small numbers, show more precision
  if (Math.abs(num) < 0.0001) {
    return num.toExponential(2) + (showUnit && unit ? ` ${unit}` : '');
  }

  if (!compact) {
    return (
      num.toLocaleString(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: precision,
      }) + (showUnit && unit ? ` ${unit}` : '')
    );
  }

  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (absNum >= 1e12) {
    return (
      sign +
      (absNum / 1e12).toFixed(precision) +
      'T' +
      (showUnit && unit ? ` ${unit}` : '')
    );
  } else if (absNum >= 1e9) {
    return (
      sign +
      (absNum / 1e9).toFixed(precision) +
      'B' +
      (showUnit && unit ? ` ${unit}` : '')
    );
  } else if (absNum >= 1e6) {
    return (
      sign +
      (absNum / 1e6).toFixed(precision) +
      'M' +
      (showUnit && unit ? ` ${unit}` : '')
    );
  } else if (absNum >= 1e3) {
    return (
      sign +
      (absNum / 1e3).toFixed(precision) +
      'K' +
      (showUnit && unit ? ` ${unit}` : '')
    );
  } else {
    return (
      sign +
      absNum.toFixed(Math.max(0, precision - 1)) +
      (showUnit && unit ? ` ${unit}` : '')
    );
  }
}

/**
 * Format cryptocurrency values with appropriate precision (Verus Explorer style)
 */
export function formatCryptoValue(
  value: number | string | null | undefined,
  currency: string = 'VRSC',
  options: Omit<NumberFormatOptions, 'unit'> = {}
): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return 'N/A';
  }

  const num = Number(value);

  // For very large amounts (1M+), show as whole numbers with commas
  if (Math.abs(num) >= 1000000) {
    return (
      num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }) + ` ${currency}`
    );
  }
  // For large amounts (1K+), show as whole numbers
  else if (Math.abs(num) >= 1000) {
    return Math.round(num).toLocaleString('en-US') + ` ${currency}`;
  }
  // For amounts >= 1, show with 2 decimal places
  else if (Math.abs(num) >= 1) {
    return (
      num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }) + ` ${currency}`
    );
  }
  // For small amounts < 1, show with more precision
  else {
    return num.toFixed(4) + ` ${currency}`;
  }
}

/**
 * Format file sizes in bytes to human-readable format
 */
export function formatFileSize(
  bytes: number | string | null | undefined,
  options: Omit<NumberFormatOptions, 'unit'> = {}
): string {
  if (bytes === null || bytes === undefined || isNaN(Number(bytes))) {
    return 'N/A';
  }

  const numBytes = Number(bytes);

  if (numBytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const k = 1024;
  const i = Math.floor(Math.log(numBytes) / Math.log(k));

  if (i >= units.length) {
    return formatFriendlyNumber(numBytes, {
      ...options,
      unit: 'B',
      precision: 1,
    });
  }

  const size = numBytes / Math.pow(k, i);
  // Check if size is a whole number - if so, use 0 decimals for cleaner display
  const isExactMatch = size === Math.floor(size);
  const precision = isExactMatch ? 0 : size >= 100 ? 0 : size >= 10 ? 1 : 2;

  return size.toFixed(precision) + ' ' + units[i];
}

/**
 * Format hash rates (hashes per second) - 2 decimal places (e.g., 40.24 MH/s)
 */
export function formatHashRate(
  hashRate: number | string | null | undefined,
  options: Omit<NumberFormatOptions, 'unit'> = {}
): string {
  if (hashRate === null || hashRate === undefined || isNaN(Number(hashRate))) {
    return 'N/A';
  }

  const rate = Number(hashRate);

  if (rate === 0) return '0.00 H/s';

  // Convert to appropriate units based on magnitude
  if (rate >= 1e12) {
    // Show as TH/s for very large values
    const thRate = rate / 1e12;
    return thRate.toFixed(2) + ' TH/s';
  } else if (rate >= 1e9) {
    // Show as GH/s for large values
    const ghRate = rate / 1e9;
    return ghRate.toFixed(2) + ' GH/s';
  } else {
    // Show as MH/s for smaller values
    const mhRate = rate / 1000000;
    return mhRate.toFixed(2) + ' MH/s';
  }
}

/**
 * Format percentages with appropriate precision
 */
export function formatPercentage(
  value: number | string | null | undefined,
  options: Omit<NumberFormatOptions, 'unit'> = {}
): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return 'N/A';
  }

  const num = Number(value);
  const precision = Math.abs(num) >= 100 ? 0 : Math.abs(num) >= 10 ? 1 : 2;

  return num.toFixed(precision) + '%';
}

/**
 * Format difficulty values - Compact style (e.g., 432.0M)
 */
export function formatDifficulty(
  difficulty: number | string | null | undefined,
  options: Omit<NumberFormatOptions, 'unit'> = {}
): string {
  if (
    difficulty === null ||
    difficulty === undefined ||
    isNaN(Number(difficulty))
  ) {
    return 'N/A';
  }

  const diff = Number(difficulty);

  if (diff === 0) return '0';

  // Convert to millions and show with 1 decimal place for compact display
  const diffInMillions = diff / 1000000;

  // Show compact format like 432.0M
  return diffInMillions.toFixed(1) + 'M';
}

/**
 * Format time durations in a friendly way
 */
export function formatDuration(
  seconds: number | string | null | undefined,
  options: Omit<NumberFormatOptions, 'unit'> = {}
): string {
  if (seconds === null || seconds === undefined || isNaN(Number(seconds))) {
    return 'N/A';
  }

  const secs = Math.abs(Number(seconds));
  const sign = Number(seconds) < 0 ? '-' : '';

  if (secs < 60) {
    return sign + secs.toFixed(0) + 's';
  } else if (secs < 3600) {
    const minutes = Math.floor(secs / 60);
    const remainingSeconds = Math.floor(secs % 60);
    return (
      sign +
      minutes +
      'm' +
      (remainingSeconds > 0 ? ' ' + remainingSeconds + 's' : '')
    );
  } else if (secs < 86400) {
    const hours = Math.floor(secs / 3600);
    const remainingMinutes = Math.floor((secs % 3600) / 60);
    return (
      sign +
      hours +
      'h' +
      (remainingMinutes > 0 ? ' ' + remainingMinutes + 'm' : '')
    );
  } else {
    const days = Math.floor(secs / 86400);
    const remainingHours = Math.floor((secs % 86400) / 3600);
    return (
      sign + days + 'd' + (remainingHours > 0 ? ' ' + remainingHours + 'h' : '')
    );
  }
}

/**
 * Format block heights with appropriate precision
 */
export function formatBlockHeight(
  height: number | string | null | undefined,
  options: Omit<NumberFormatOptions, 'unit'> = {}
): string {
  if (height === null || height === undefined || isNaN(Number(height))) {
    return 'N/A';
  }

  const blockHeight = Number(height);

  // For block heights, we usually want the full number with commas
  return blockHeight.toLocaleString('en-US');
}

/**
 * Format transaction counts
 */
export function formatTransactionCount(
  count: number | string | null | undefined,
  options: Omit<NumberFormatOptions, 'unit'> = {}
): string {
  if (count === null || count === undefined || isNaN(Number(count))) {
    return 'N/A';
  }

  const txCount = Number(count);

  if (txCount >= 1000000) {
    return formatFriendlyNumber(txCount, {
      ...options,
      unit: 'tx',
      precision: 1,
    });
  } else {
    return txCount.toLocaleString('en-US');
  }
}

/**
 * Format memory pool sizes
 */
export function formatMempoolSize(
  size: number | string | null | undefined,
  options: Omit<NumberFormatOptions, 'unit'> = {}
): string {
  if (size === null || size === undefined || isNaN(Number(size))) {
    return 'N/A';
  }

  const mempoolSize = Number(size);

  return formatFriendlyNumber(mempoolSize, {
    ...options,
    unit: 'tx',
    precision: 0,
  });
}

/**
 * Format network connections count
 */
export function formatConnectionCount(
  connections: number | string | null | undefined,
  options: Omit<NumberFormatOptions, 'unit'> = {}
): string {
  if (
    connections === null ||
    connections === undefined ||
    isNaN(Number(connections))
  ) {
    return 'N/A';
  }

  const connCount = Number(connections);

  if (connCount >= 1000) {
    return formatFriendlyNumber(connCount, {
      ...options,
      unit: 'conn',
      precision: 1,
    });
  } else {
    return connCount.toString();
  }
}

/**
 * Format staking amounts with appropriate precision
 */
export function formatStake(
  stake: number | string | null | undefined,
  options: Omit<NumberFormatOptions, 'unit'> = {}
): string {
  if (stake === null || stake === undefined || isNaN(Number(stake))) {
    return 'N/A';
  }

  const stakeAmount = Number(stake);

  if (stakeAmount >= 1e9) return `${(stakeAmount / 1e9).toFixed(2)}B`;
  if (stakeAmount >= 1e6) return `${(stakeAmount / 1e6).toFixed(2)}M`;
  if (stakeAmount >= 1e3) return `${(stakeAmount / 1e3).toFixed(2)}K`;
  return stakeAmount.toFixed(0);
}

/**
 * Calculate average block time from recent block timestamps
 */
export function calculateAverageBlockTime(
  blocks: Array<{ time: number; height: number }>
): number | null {
  if (!blocks || blocks.length < 2) {
    return null;
  }

  // Sort blocks by height (ascending) to ensure proper order
  const sortedBlocks = [...blocks].sort((a, b) => a.height - b.height);

  // Calculate time differences between consecutive blocks
  const timeDifferences: number[] = [];
  for (let i = 1; i < sortedBlocks.length; i++) {
    const timeDiff = sortedBlocks[i].time - sortedBlocks[i - 1].time;
    // Filter out unrealistic values (blocks should be between 1 second and 1 hour apart)
    if (timeDiff > 0 && timeDiff < 3600) {
      timeDifferences.push(timeDiff);
    }
  }

  if (timeDifferences.length === 0) {
    return null;
  }

  // Calculate average
  const averageTime =
    timeDifferences.reduce((sum, diff) => sum + diff, 0) /
    timeDifferences.length;
  return Math.round(averageTime);
}

/**
 * Format block time in seconds to human readable format
 */
export function formatBlockTime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(Number(seconds))) {
    return 'N/A';
  }

  const time = Number(seconds);

  if (time < 60) {
    return `${time.toFixed(0)}s`;
  } else if (time < 3600) {
    const minutes = Math.floor(time / 60);
    const remainingSeconds = time % 60;
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds.toFixed(0)}s`
      : `${minutes}m`;
  } else {
    const hours = Math.floor(time / 3600);
    const remainingMinutes = Math.floor((time % 3600) / 60);
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  }
}
