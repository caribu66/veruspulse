/**
 * Edge case tests for staking calculations
 */

import {
  calculateExpectedStakeTime,
  formatStakeDuration,
  calculateParticipationRate,
  calculateStakingFrequency,
} from '@/lib/utils/staking-calculations';

describe('Staking Calculations Edge Cases', () => {
  describe('calculateExpectedStakeTime', () => {
    test('returns N/A for zero weights', () => {
      const result = calculateExpectedStakeTime(0, 100000000);
      expect(result.seconds).toBe(0);
      expect(result.formatted).toBe('N/A');
    });

    test('returns N/A for negative weights', () => {
      const result = calculateExpectedStakeTime(-10000, 100000000);
      expect(result.seconds).toBe(0);
      expect(result.formatted).toBe('N/A');
    });

    test('calculates correctly for typical case', () => {
      const result = calculateExpectedStakeTime(10000, 100000000);
      expect(result.seconds).toBeGreaterThan(0);
      expect(result.formatted).not.toBe('N/A');
    });

    test('handles very small weight', () => {
      const result = calculateExpectedStakeTime(1, 1000000000);
      expect(result.seconds).toBeGreaterThan(1000000);
    });

    test('handles equal weights', () => {
      const result = calculateExpectedStakeTime(50000000, 100000000);
      expect(result.seconds).toBe(240);
    });
  });

  describe('formatStakeDuration', () => {
    test('formats seconds', () => {
      expect(formatStakeDuration(30)).toBe('30 seconds');
    });

    test('formats minutes', () => {
      expect(formatStakeDuration(150)).toBe('2.5 minutes');
    });

    test('formats hours', () => {
      expect(formatStakeDuration(7200)).toBe('2.0 hours');
    });

    test('formats days', () => {
      expect(formatStakeDuration(172800)).toBe('2.0 days');
    });

    test('returns N/A for zero or negative', () => {
      expect(formatStakeDuration(0)).toBe('N/A');
      expect(formatStakeDuration(-100)).toBe('N/A');
    });
  });

  describe('calculateParticipationRate', () => {
    test('calculates correct percentage', () => {
      const result = calculateParticipationRate(1000000, 100000000);
      expect(result).toBe(1);
    });

    test('returns 0 for zero weights', () => {
      expect(calculateParticipationRate(0, 100000000)).toBe(0);
      expect(calculateParticipationRate(10000, 0)).toBe(0);
    });

    test('caps at 100%', () => {
      const result = calculateParticipationRate(150000000, 100000000);
      expect(result).toBe(100);
    });

    test('handles very small participation', () => {
      const result = calculateParticipationRate(1, 1000000000);
      expect(result).toBeLessThan(0.001);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('calculateStakingFrequency', () => {
    test('calculates correct frequency', () => {
      const result = calculateStakingFrequency(1000000, 100000000);
      expect(result).toBeCloseTo(7.2, 5);
    });

    test('returns 0 for zero weights', () => {
      expect(calculateStakingFrequency(0, 100000000)).toBe(0);
      expect(calculateStakingFrequency(10000, 0)).toBe(0);
    });

    test('calculates for 50% network weight', () => {
      const result = calculateStakingFrequency(50000000, 100000000);
      expect(result).toBe(360);
    });

    test('validates PoS block assumption', () => {
      const result = calculateStakingFrequency(100000000, 100000000);
      expect(result).toBe(720);
    });
  });
});
