/**
 * Edge case tests for formatting utilities
 */

import {
  formatFriendlyNumber,
  formatCryptoValue,
  formatFileSize,
  formatHashRate,
  formatPercentage,
  formatDuration,
  calculateAverageBlockTime,
} from '@/lib/utils/number-formatting';

describe('Formatting Edge Cases', () => {
  describe('formatFriendlyNumber', () => {
    test('formats zero', () => {
      expect(formatFriendlyNumber(0)).toBe('0');
    });

    test('formats with K suffix', () => {
      expect(formatFriendlyNumber(1000)).toBe('1.0K');
      expect(formatFriendlyNumber(1500)).toBe('1.5K');
    });

    test('formats with M suffix', () => {
      expect(formatFriendlyNumber(1000000)).toBe('1.0M');
    });

    test('formats with B suffix', () => {
      expect(formatFriendlyNumber(1000000000)).toBe('1.0B');
    });

    test('formats with T suffix', () => {
      expect(formatFriendlyNumber(1000000000000)).toBe('1.0T');
    });

    test('handles null', () => {
      expect(formatFriendlyNumber(null)).toBe('N/A');
    });

    test('handles negative numbers', () => {
      expect(formatFriendlyNumber(-1000)).toBe('-1.0K');
    });
  });

  describe('formatCryptoValue', () => {
    test('formats large amounts', () => {
      expect(formatCryptoValue(1000000)).toBe('1,000,000 VRSC');
    });

    test('formats small amounts with decimals', () => {
      expect(formatCryptoValue(0.1234)).toBe('0.1234 VRSC');
    });

    test('handles null', () => {
      expect(formatCryptoValue(null)).toBe('N/A');
    });

    test('handles different currencies', () => {
      expect(formatCryptoValue(100, 'BTC')).toBe('100 BTC');
    });
  });

  describe('formatFileSize', () => {
    test('formats bytes', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });

    test('formats KB', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
    });

    test('formats MB', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
    });

    test('formats GB', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    test('handles zero', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });

    test('handles null', () => {
      expect(formatFileSize(null)).toBe('N/A');
    });
  });

  describe('formatHashRate', () => {
    test('formats MH/s', () => {
      expect(formatHashRate(1000000)).toBe('1.00 MH/s');
    });

    test('formats GH/s', () => {
      expect(formatHashRate(1000000000)).toBe('1.00 GH/s');
    });

    test('formats TH/s', () => {
      expect(formatHashRate(1000000000000)).toBe('1.00 TH/s');
    });

    test('handles zero', () => {
      expect(formatHashRate(0)).toBe('0.00 H/s');
    });
  });

  describe('formatPercentage', () => {
    test('formats with appropriate decimals', () => {
      expect(formatPercentage(1.23)).toBe('1.23%');
      expect(formatPercentage(12.345)).toBe('12.3%');
      expect(formatPercentage(123.456)).toBe('123%');
    });

    test('handles zero', () => {
      expect(formatPercentage(0)).toBe('0.00%');
    });

    test('handles negative', () => {
      expect(formatPercentage(-5.5)).toBe('-5.50%');
    });
  });

  describe('formatDuration', () => {
    test('formats seconds', () => {
      expect(formatDuration(30)).toBe('30s');
    });

    test('formats minutes', () => {
      expect(formatDuration(90)).toBe('1m 30s');
    });

    test('formats hours', () => {
      expect(formatDuration(3660)).toBe('1h 1m');
    });

    test('formats days', () => {
      expect(formatDuration(90000)).toBe('1d 1h');
    });

    test('handles null', () => {
      expect(formatDuration(null)).toBe('N/A');
    });
  });

  describe('calculateAverageBlockTime', () => {
    test('calculates average', () => {
      const blocks = [
        { time: 1000, height: 1 },
        { time: 1060, height: 2 },
        { time: 1120, height: 3 },
      ];
      expect(calculateAverageBlockTime(blocks)).toBe(60);
    });

    test('returns null for insufficient data', () => {
      expect(calculateAverageBlockTime([{ time: 1000, height: 1 }])).toBeNull();
    });

    test('handles unsorted blocks', () => {
      const blocks = [
        { time: 1120, height: 3 },
        { time: 1000, height: 1 },
        { time: 1060, height: 2 },
      ];
      expect(calculateAverageBlockTime(blocks)).toBe(60);
    });

    test('filters unrealistic values', () => {
      const blocks = [
        { time: 1000, height: 1 },
        { time: 1060, height: 2 },
        { time: 5000, height: 3 }, // Unrealistic gap
        { time: 5060, height: 4 },
      ];
      expect(calculateAverageBlockTime(blocks)).toBe(60);
    });
  });
});
