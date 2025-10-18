import { NextRequest } from 'next/server';
import { GET } from '@/app/api/verusid/[iaddr]/stats/route';
import { getCachedStats } from '@/lib/verusid-cache';

// Mock dependencies
jest.mock('@/lib/verusid-cache');

const mockGetCachedStats = getCachedStats as jest.MockedFunction<
  typeof getCachedStats
>;

describe('/api/verusid/[iaddr]/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockStats = {
    totalRewards: 125.5,
    rewardCount: 42,
    dailyStats: [
      {
        date: '2025-01-15',
        rewards: 5.5,
        count: 3,
      },
      {
        date: '2025-01-14',
        rewards: 10.2,
        count: 5,
      },
    ],
    weeklyStats: [
      {
        week: '2025-W02',
        rewards: 35.7,
        count: 15,
      },
    ],
    monthlyStats: [
      {
        month: '2025-01',
        rewards: 125.5,
        count: 42,
      },
    ],
  };

  const createMockRequest = (url: string) => {
    return new NextRequest(url);
  };

  describe('GET - Success Cases', () => {
    it('should return cached stats successfully', async () => {
      mockGetCachedStats.mockResolvedValue(mockStats);

      const request = createMockRequest(
        'http://localhost:3000/api/verusid/iTestAddress123/stats'
      );
      const params = Promise.resolve({ iaddr: 'iTestAddress123' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockStats);
      expect(mockGetCachedStats).toHaveBeenCalledWith('iTestAddress123');
    });

    it('should return empty stats when no cache exists', async () => {
      mockGetCachedStats.mockResolvedValue(null);

      const request = createMockRequest(
        'http://localhost:3000/api/verusid/iTestAddress456/stats'
      );
      const params = Promise.resolve({ iaddr: 'iTestAddress456' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        totalRewards: 0,
        rewardCount: 0,
        dailyStats: [],
      });
    });

    it('should handle stats with zero rewards', async () => {
      const zeroStats = {
        totalRewards: 0,
        rewardCount: 0,
        dailyStats: [],
      };
      mockGetCachedStats.mockResolvedValue(zeroStats);

      const request = createMockRequest(
        'http://localhost:3000/api/verusid/iNewAddress/stats'
      );
      const params = Promise.resolve({ iaddr: 'iNewAddress' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(zeroStats);
    });

    it('should handle stats with only daily data', async () => {
      const dailyOnlyStats = {
        totalRewards: 10.5,
        rewardCount: 5,
        dailyStats: [
          {
            date: '2025-01-15',
            rewards: 10.5,
            count: 5,
          },
        ],
      };
      mockGetCachedStats.mockResolvedValue(dailyOnlyStats);

      const request = createMockRequest(
        'http://localhost:3000/api/verusid/iAddress/stats'
      );
      const params = Promise.resolve({ iaddr: 'iAddress' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(dailyOnlyStats);
    });
  });

  describe('GET - Error Cases', () => {
    it('should handle cache fetch errors', async () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockGetCachedStats.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = createMockRequest(
        'http://localhost:3000/api/verusid/iTestAddress/stats'
      );
      const params = Promise.resolve({ iaddr: 'iTestAddress' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database connection failed');
      expect(consoleSpy).toHaveBeenCalledWith(
        'VerusID stats error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle unknown errors', async () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockGetCachedStats.mockRejectedValue('Unknown error string');

      const request = createMockRequest(
        'http://localhost:3000/api/verusid/iTestAddress/stats'
      );
      const params = Promise.resolve({ iaddr: 'iTestAddress' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');

      consoleSpy.mockRestore();
    });

    it('should handle timeout errors', async () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const timeoutError = new Error('Query timeout');
      mockGetCachedStats.mockRejectedValue(timeoutError);

      const request = createMockRequest(
        'http://localhost:3000/api/verusid/iTestAddress/stats'
      );
      const params = Promise.resolve({ iaddr: 'iTestAddress' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Query timeout');

      consoleSpy.mockRestore();
    });
  });

  describe('GET - Edge Cases', () => {
    it('should handle very large reward values', async () => {
      const largeStats = {
        totalRewards: 1000000.123456789,
        rewardCount: 50000,
        dailyStats: [
          {
            date: '2025-01-15',
            rewards: 1000000.123456789,
            count: 50000,
          },
        ],
      };
      mockGetCachedStats.mockResolvedValue(largeStats);

      const request = createMockRequest(
        'http://localhost:3000/api/verusid/iWhaleAddress/stats'
      );
      const params = Promise.resolve({ iaddr: 'iWhaleAddress' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.totalRewards).toBe(1000000.123456789);
      expect(data.data.rewardCount).toBe(50000);
    });

    it('should handle stats with many daily entries', async () => {
      const manyDays = Array.from({ length: 365 }, (_, i) => ({
        date: `2024-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
        rewards: 5.0,
        count: 2,
      }));

      const yearStats = {
        totalRewards: 1825.0,
        rewardCount: 730,
        dailyStats: manyDays,
      };
      mockGetCachedStats.mockResolvedValue(yearStats);

      const request = createMockRequest(
        'http://localhost:3000/api/verusid/iActiveAddress/stats'
      );
      const params = Promise.resolve({ iaddr: 'iActiveAddress' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.dailyStats).toHaveLength(365);
      expect(data.data.totalRewards).toBe(1825.0);
    });

    it('should handle fractional reward counts', async () => {
      const fractionalStats = {
        totalRewards: 0.000001,
        rewardCount: 1,
        dailyStats: [
          {
            date: '2025-01-15',
            rewards: 0.000001,
            count: 1,
          },
        ],
      };
      mockGetCachedStats.mockResolvedValue(fractionalStats);

      const request = createMockRequest(
        'http://localhost:3000/api/verusid/iAddress/stats'
      );
      const params = Promise.resolve({ iaddr: 'iAddress' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.totalRewards).toBe(0.000001);
    });

    it('should handle special characters in iaddr', async () => {
      mockGetCachedStats.mockResolvedValue(mockStats);

      const request = createMockRequest(
        'http://localhost:3000/api/verusid/iTest%40Address/stats'
      );
      const params = Promise.resolve({ iaddr: 'iTest@Address' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockGetCachedStats).toHaveBeenCalledWith('iTest@Address');
    });
  });

  describe('GET - Cache Performance', () => {
    it('should return quickly with cached data', async () => {
      mockGetCachedStats.mockResolvedValue(mockStats);

      const start = Date.now();
      const request = createMockRequest(
        'http://localhost:3000/api/verusid/iAddress/stats'
      );
      const params = Promise.resolve({ iaddr: 'iAddress' });

      await GET(request, { params });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Should be very fast with mocked cache
    });

    it('should call getCachedStats only once', async () => {
      mockGetCachedStats.mockResolvedValue(mockStats);

      const request = createMockRequest(
        'http://localhost:3000/api/verusid/iAddress/stats'
      );
      const params = Promise.resolve({ iaddr: 'iAddress' });

      await GET(request, { params });

      expect(mockGetCachedStats).toHaveBeenCalledTimes(1);
    });
  });
});
