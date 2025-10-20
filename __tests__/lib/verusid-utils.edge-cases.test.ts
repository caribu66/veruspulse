/**
 * Edge case tests for VerusID utilities
 */

import {
  filterIdentitiesByStakeRange,
  filterIdentitiesByAPYRange,
  searchIdentities,
  sortIdentities,
  formatVRSCAmount,
  formatAPY,
} from '@/lib/utils/verusid-utils';
import { VerusIDBrowseData } from '@/lib/types/verusid-browse-types';

const createTestIdentity = (overrides: Partial<VerusIDBrowseData> = {}): VerusIDBrowseData => ({
  address: 'iAddress123',
  baseName: 'testid',
  friendlyName: 'testid@',
  displayName: 'testid@',
  totalStakes: 100,
  totalRewardsVRSC: 1000,
  apyAllTime: 25.5,
  apyYearly: 24.0,
  apy90d: 23.0,
  apy30d: 22.0,
  apy7d: 21.0,
  roiAllTime: 125.5,
  stakingEfficiency: 85.5,
  avgStakeAge: 7.5,
  networkRank: 50,
  networkPercentile: 95.5,
  eligibleUtxos: 10,
  currentUtxos: 15,
  cooldownUtxos: 5,
  totalValueVRSC: 5000,
  eligibleValueVRSC: 4500,
  largestUtxoVRSC: 1000,
  smallestEligibleVRSC: 10,
  highestRewardVRSC: 50,
  lowestRewardVRSC: 5,
  lastCalculated: '2025-01-01T00:00:00Z',
  dataCompleteness: 100,
  activityStatus: 'active',
  daysSinceLastStake: 3,
  firstSeenBlock: 1000,
  lastScannedBlock: 2000,
  lastRefreshed: '2025-01-01T00:00:00Z',
  firstStakeTime: '2024-01-01T00:00:00Z',
  lastStakeTime: '2025-01-01T00:00:00Z',
  ...overrides,
});

describe('VerusID Utils Edge Cases', () => {
  describe('filterIdentitiesByStakeRange', () => {
    test('handles negative stakes', () => {
      const identities = [
        createTestIdentity({ totalStakes: -5 }),
        createTestIdentity({ totalStakes: 5 }),
      ];
      const result = filterIdentitiesByStakeRange(identities, 0, 10);
      expect(result).toHaveLength(1);
    });

    test('handles empty array', () => {
      expect(filterIdentitiesByStakeRange([], 0, 100)).toHaveLength(0);
    });

    test('handles inverted range', () => {
      const identities = [createTestIdentity({ totalStakes: 100 })];
      expect(filterIdentitiesByStakeRange(identities, 150, 50)).toHaveLength(0);
    });
  });

  describe('filterIdentitiesByAPYRange', () => {
    test('includes null APY identities', () => {
      const identities = [
        createTestIdentity({ apyAllTime: null }),
        createTestIdentity({ apyAllTime: 50 }),
      ];
      const result = filterIdentitiesByAPYRange(identities, 40, 60);
      expect(result).toHaveLength(2);
    });

    test('handles negative APY', () => {
      const identities = [createTestIdentity({ apyAllTime: -10 })];
      const result = filterIdentitiesByAPYRange(identities, -20, 0);
      expect(result).toHaveLength(1);
    });
  });

  describe('searchIdentities', () => {
    test('handles empty query', () => {
      const identities = [createTestIdentity()];
      expect(searchIdentities(identities, '')).toHaveLength(1);
    });

    test('is case-insensitive', () => {
      const identities = [createTestIdentity({ baseName: 'TestID' })];
      expect(searchIdentities(identities, 'testid')).toHaveLength(1);
    });

    test('searches in address field', () => {
      const identities = [createTestIdentity({ address: 'iCSq1EkTestAddress' })];
      expect(searchIdentities(identities, 'iCSq1Ek')).toHaveLength(1);
    });
  });

  describe('sortIdentities', () => {
    test('sorts by name ascending', () => {
      const identities = [
        createTestIdentity({ baseName: 'charlie' }),
        createTestIdentity({ baseName: 'alice' }),
        createTestIdentity({ baseName: 'bob' }),
      ];
      const result = sortIdentities(identities, 'name', 'asc');
      expect(result[0].baseName).toBe('alice');
      expect(result[2].baseName).toBe('charlie');
    });

    test('handles null values in apy sort', () => {
      const identities = [
        createTestIdentity({ apyAllTime: 50 }),
        createTestIdentity({ apyAllTime: null }),
        createTestIdentity({ apyAllTime: 100 }),
      ];
      const result = sortIdentities(identities, 'apy', 'desc');
      expect(result[0].apyAllTime).toBe(100);
    });
  });

  describe('formatVRSCAmount', () => {
    test('formats zero', () => {
      expect(formatVRSCAmount(0)).toBe('0');
    });

    test('formats very small amounts', () => {
      expect(formatVRSCAmount(0.001)).toBe('< 0.01');
    });

    test('formats thousands with K', () => {
      expect(formatVRSCAmount(1000)).toBe('1.0K');
      expect(formatVRSCAmount(1500)).toBe('1.5K');
    });

    test('formats millions with M', () => {
      expect(formatVRSCAmount(1000000)).toBe('1.0M');
    });

    test('handles negative values', () => {
      expect(formatVRSCAmount(-100)).toBe('-100.00');
    });
  });

  describe('formatAPY', () => {
    test('returns N/A for null', () => {
      expect(formatAPY(null)).toBe('N/A');
    });

    test('formats with 1 decimal', () => {
      expect(formatAPY(25.567)).toBe('25.6%');
    });

    test('handles negative APY', () => {
      expect(formatAPY(-10.5)).toBe('-10.5%');
    });
  });
});
