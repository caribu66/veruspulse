import { Pool } from 'pg';
import {
  AchievementService,
  AchievementDefinition,
  StakingStats,
  StakingHistory,
} from '@/lib/services/achievement-service';

// Mock pg Pool
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
  };
  return {
    Pool: jest.fn(() => mockPool),
  };
});

describe('AchievementService', () => {
  let service: AchievementService;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    mockPool = new Pool() as jest.Mocked<Pool>;
    service = new AchievementService(mockPool);
    jest.clearAllMocks();
  });

  const mockAchievementDefinition: AchievementDefinition = {
    id: 1,
    slug: 'first-stake',
    name: 'First Stake',
    description: 'Complete your first stake',
    icon: '🎯',
    category: 'milestone',
    tier: 'bronze',
    requirements: { type: 'stake_count', operator: '>=', value: 1 },
    rarity: 'common',
    is_active: true,
  };

  const mockStakingStats: StakingStats = {
    total_stakes: 50,
    total_rewards_satoshis: 50000000000, // 500 VRSC
    highest_reward_satoshis: 1200000000, // 12 VRSC
    first_stake_time: '2024-01-01T00:00:00Z',
    last_stake_time: '2024-12-31T23:59:59Z',
    staking_efficiency: 0.95,
    stakes_per_week: 2.5,
    avg_days_between_stakes: 3.5,
    best_month_rewards_satoshis: 8000000000,
    longest_dry_spell_days: 10,
    network_rank: 150,
    network_percentile: 85.5,
  };

  const mockStakingHistory: StakingHistory[] = [
    { block_time: '2024-12-01T00:00:00Z', amount_sats: 1200000000 },
    { block_time: '2024-11-01T00:00:00Z', amount_sats: 1100000000 },
  ];

  describe('getAchievementDefinitions', () => {
    it('should return all active achievement definitions', async () => {
      const mockDefinitions = [
        mockAchievementDefinition,
        { ...mockAchievementDefinition, id: 2, slug: 'veteran-staker' },
      ];

      mockPool.query.mockResolvedValue({
        rows: mockDefinitions,
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: [],
      });

      const result = await service.getAchievementDefinitions();

      expect(result).toEqual(mockDefinitions);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('achievement_definitions')
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('is_active = true')
      );
    });

    it('should handle empty definitions', async () => {
      mockPool.query.mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const result = await service.getAchievementDefinitions();

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.getAchievementDefinitions()).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('getEarnedAchievements', () => {
    it('should return earned achievements for an identity', async () => {
      const mockEarned = [
        {
          id: 1,
          identity_address: 'iTest123',
          achievement_slug: 'first-stake',
          unlocked_at: '2024-01-15T00:00:00Z',
          unlock_value: 1,
          name: 'First Stake',
          description: 'Complete your first stake',
          icon: '🎯',
          category: 'milestone',
          tier: 'bronze',
          rarity: 'common',
        },
      ];

      mockPool.query.mockResolvedValue({
        rows: mockEarned,
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await service.getEarnedAchievements('iTest123');

      expect(result).toEqual(mockEarned);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('verusid_achievements'),
        ['iTest123']
      );
    });

    it('should return empty array for identity with no achievements', async () => {
      mockPool.query.mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const result = await service.getEarnedAchievements('iNewUser');

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Query timeout'));

      await expect(service.getEarnedAchievements('iTest123')).rejects.toThrow(
        'Query timeout'
      );
    });
  });

  describe('getAchievementProgress', () => {
    it('should return progress toward unearned achievements', async () => {
      const mockProgress = [
        {
          identity_address: 'iTest123',
          achievement_slug: 'stake-100',
          current_value: 50,
          target_value: 100,
          percentage: 50,
          last_updated: '2024-12-31T00:00:00Z',
          name: '100 Stakes',
          description: 'Complete 100 stakes',
          icon: '💯',
          category: 'milestone',
          tier: 'silver',
        },
      ];

      mockPool.query.mockResolvedValue({
        rows: mockProgress,
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await service.getAchievementProgress('iTest123');

      expect(result).toEqual(mockProgress);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('achievement_progress'),
        ['iTest123']
      );
    });

    it('should order progress by percentage and tier', async () => {
      mockPool.query.mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      await service.getAchievementProgress('iTest123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY ap.percentage DESC, ad.tier'),
        ['iTest123']
      );
    });
  });

  describe('evaluateAchievements', () => {
    it('should unlock new achievements and track progress', async () => {
      const definitions = [mockAchievementDefinition];
      const earnedAchievements: any[] = [];

      // Mock all the database calls
      mockPool.query
        .mockResolvedValueOnce({
          // getAchievementDefinitions
          rows: definitions,
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          // getEarnedAchievements
          rows: earnedAchievements,
          command: 'SELECT',
          rowCount: 0,
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          // unlockBadge INSERT
          rows: [{ id: 1 }],
          command: 'INSERT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

      const result = await service.evaluateAchievements(
        'iTest123',
        mockStakingStats, // has 50 stakes, requirement is 1
        mockStakingHistory
      );

      // With 50 stakes and requirement of 1, should unlock
      expect(result.unlocked).toContain('first-stake');
      // getAchievementDefinitions + getEarnedAchievements + unlockBadge (may have 2 queries)
      expect(mockPool.query).toHaveBeenCalled();
      expect(result.unlocked.length).toBeGreaterThan(0);
    });

    it('should skip already earned achievements', async () => {
      const definitions = [mockAchievementDefinition];
      const earnedAchievements = [
        {
          achievement_slug: 'first-stake',
          identity_address: 'iTest123',
        },
      ];

      mockPool.query
        .mockResolvedValueOnce({
          rows: definitions,
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: earnedAchievements,
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

      const result = await service.evaluateAchievements(
        'iTest123',
        mockStakingStats,
        mockStakingHistory
      );

      expect(result.unlocked).toHaveLength(0);
      expect(result.progress).toHaveLength(0);
    });

    it('should track progress for unearned achievements', async () => {
      const definitions = [
        {
          ...mockAchievementDefinition,
          slug: 'stake-100',
          requirements: { type: 'stake_count', operator: '>=', value: 100 },
        },
      ];

      mockPool.query
        .mockResolvedValueOnce({
          // getAchievementDefinitions
          rows: definitions,
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          // getEarnedAchievements
          rows: [],
          command: 'SELECT',
          rowCount: 0,
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          // updateProgress INSERT/UPDATE
          rows: [{ id: 1 }],
          command: 'INSERT',
          rowCount: 1,
          oid: 0,
          fields: [],
        });

      const result = await service.evaluateAchievements(
        'iTest123',
        mockStakingStats, // has 50 stakes
        mockStakingHistory
      );

      expect(result.unlocked).toHaveLength(0);
      expect(result.progress.length).toBeGreaterThan(0);
      expect(result.progress[0].current_value).toBe(50);
      expect(result.progress[0].target_value).toBe(100);
      expect(result.progress[0].percentage).toBe(50);
    });
  });

  describe('Edge Cases', () => {
    it('should handle stats with zero values', async () => {
      const zeroStats: StakingStats = {
        total_stakes: 0,
        total_rewards_satoshis: 0,
        highest_reward_satoshis: 0,
        first_stake_time: '',
        last_stake_time: '',
        staking_efficiency: 0,
        stakes_per_week: 0,
        avg_days_between_stakes: 0,
        best_month_rewards_satoshis: 0,
        longest_dry_spell_days: 0,
        network_rank: 0,
        network_percentile: 0,
      };

      mockPool.query
        .mockResolvedValueOnce({
          rows: [],
          command: 'SELECT',
          rowCount: 0,
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [],
          command: 'SELECT',
          rowCount: 0,
          oid: 0,
          fields: [],
        });

      const result = await service.evaluateAchievements(
        'iNewUser',
        zeroStats,
        []
      );

      expect(result.unlocked).toHaveLength(0);
      expect(result.progress).toHaveLength(0);
    });

    it('should handle very large stake counts', async () => {
      const largeStats = {
        ...mockStakingStats,
        total_stakes: 1000000,
      };

      mockPool.query
        .mockResolvedValueOnce({
          rows: [],
          command: 'SELECT',
          rowCount: 0,
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [],
          command: 'SELECT',
          rowCount: 0,
          oid: 0,
          fields: [],
        });

      const result = await service.evaluateAchievements(
        'iWhale',
        largeStats,
        mockStakingHistory
      );

      expect(result).toBeDefined();
    });

    it('should handle empty history array', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [],
          command: 'SELECT',
          rowCount: 0,
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [],
          command: 'SELECT',
          rowCount: 0,
          oid: 0,
          fields: [],
        });

      const result = await service.evaluateAchievements(
        'iTest123',
        mockStakingStats,
        []
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result.unlocked)).toBe(true);
      expect(Array.isArray(result.progress)).toBe(true);
    });
  });

  describe('Database Connection', () => {
    it('should handle connection timeouts', async () => {
      mockPool.query.mockRejectedValue(new Error('Connection timeout'));

      await expect(service.getAchievementDefinitions()).rejects.toThrow(
        'Connection timeout'
      );
    });

    it('should handle query syntax errors', async () => {
      mockPool.query.mockRejectedValue(
        new Error('syntax error at or near "FROM"')
      );

      await expect(service.getEarnedAchievements('iTest123')).rejects.toThrow(
        'syntax error'
      );
    });

    it('should handle null results gracefully', async () => {
      mockPool.query.mockResolvedValue({
        rows: null as any,
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const result = await service.getAchievementDefinitions();

      expect(result).toBeNull();
    });
  });
});
