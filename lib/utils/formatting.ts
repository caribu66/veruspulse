import { useMemo } from 'react';

// Number formatting utilities
export const formatFriendlyNumber = (num: number): string => {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  } else {
    return num.toFixed(2);
  }
};

export const formatBytes = (bytes: number): string => {
  if (!bytes || bytes < 0) return 'N/A';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatHashRate = (hashRate: number): string => {
  if (!hashRate || hashRate < 0) return 'N/A';
  if (hashRate === 0) return '0.00 MH/s';
  const mhRate = hashRate / 1e6;
  if (mhRate >= 1000000) return (mhRate / 1000000).toFixed(2) + 'M MH/s';
  if (mhRate >= 1000) return (mhRate / 1000).toFixed(2) + 'K MH/s';
  return mhRate.toFixed(2) + ' MH/s';
};

export const formatDifficultyCompact = (difficulty: number): string => {
  if (!difficulty || difficulty < 0) return 'N/A';
  if (difficulty === 0) return '0';

  const absNum = Math.abs(difficulty);

  if (absNum >= 1e12) {
    return (difficulty / 1e12).toFixed(1) + 'T';
  } else if (absNum >= 1e9) {
    return (difficulty / 1e9).toFixed(1) + 'B';
  } else if (absNum >= 1e6) {
    return (difficulty / 1e6).toFixed(1) + 'M';
  } else if (absNum >= 1e3) {
    return (difficulty / 1e3).toFixed(1) + 'K';
  } else {
    return difficulty.toFixed(2);
  }
};

export const formatTime = (seconds: number): string => {
  if (!seconds || seconds < 0) return 'N/A';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  if (seconds < 86400)
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
};

export const formatTimestamp = (timestamp: number): string => {
  const now = Date.now() / 1000;
  const diff = now - timestamp;

  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export const formatValue = (value: number): string => {
  return (value / 100000000).toFixed(8) + ' VRSC';
};

// Memoized formatting hooks
export const useFormattedNumber = (num: number) => {
  return useMemo(() => formatFriendlyNumber(num), [num]);
};

export const useFormattedBytes = (bytes: number) => {
  return useMemo(() => formatBytes(bytes), [bytes]);
};

export const useFormattedHashRate = (hashRate: number) => {
  return useMemo(() => formatHashRate(hashRate), [hashRate]);
};

export const useFormattedDifficulty = (difficulty: number) => {
  return useMemo(() => formatDifficultyCompact(difficulty), [difficulty]);
};

export const useFormattedTime = (seconds: number) => {
  return useMemo(() => formatTime(seconds), [seconds]);
};

export const useFormattedTimestamp = (timestamp: number) => {
  return useMemo(() => formatTimestamp(timestamp), [timestamp]);
};

export const useFormattedValue = (value: number) => {
  return useMemo(() => formatValue(value), [value]);
};
