import { NextRequest } from 'next/server';
import { GET, DELETE } from '@/app/api/cache/route';
import { CacheManager } from '@/lib/cache/cache-utils';
import { CachedRPCClient } from '@/lib/cache/cached-rpc-client';

// Mock the dependencies
jest.mock('@/lib/cache/cache-utils');
jest.mock('@/lib/cache/cached-rpc-client');
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockCacheManager = CacheManager as jest.Mocked<typeof CacheManager>;
const mockCachedRPCClient = CachedRPCClient as jest.Mocked<
  typeof CachedRPCClient
>;

describe('/api/cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return cache stats successfully', async () => {
      const mockStats = {
        totalKeys: 15,
        memoryUsage: '2.5M',
        connectedClients: 3,
        uptime: 3600,
      };

      mockCacheManager.getStats.mockResolvedValue(mockStats);

      const request = new NextRequest(
        'http://localhost:3000/api/cache?action=stats'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockStats);
      expect(data.timestamp).toBeDefined();
    });

    it('should return cache health check successfully', async () => {
      // Mock successful cache operations
      mockCacheManager.set.mockResolvedValue(true);
      mockCacheManager.get.mockResolvedValue('ok');
      mockCacheManager.delete.mockResolvedValue(true);

      const request = new NextRequest(
        'http://localhost:3000/api/cache?action=health'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.redis).toBe(true);

      // Verify cache operations were called
      expect(mockCacheManager.set).toHaveBeenCalledWith('health:test', 'ok', 5);
      expect(mockCacheManager.get).toHaveBeenCalledWith('health:test');
      expect(mockCacheManager.delete).toHaveBeenCalledWith('health:test');
    });

    it('should handle cache health check failure', async () => {
      mockCacheManager.set.mockResolvedValue(false);
      mockCacheManager.get.mockResolvedValue(null);
      mockCacheManager.delete.mockResolvedValue(false);

      const request = new NextRequest(
        'http://localhost:3000/api/cache?action=health'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.redis).toBe(false);
    });

    it('should return error for invalid action', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/cache?action=invalid'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe(
        'Invalid action. Use ?action=stats or ?action=health'
      );
    });

    it('should handle cache stats error', async () => {
      mockCacheManager.getStats.mockRejectedValue(
        new Error('Redis connection failed')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/cache?action=stats'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cache operation failed');
      expect(data.details).toBe('Redis connection failed');
    });
  });

  describe('DELETE', () => {
    it('should clear all cache successfully', async () => {
      mockCacheManager.clearAll.mockResolvedValue(true);

      const request = new NextRequest(
        'http://localhost:3000/api/cache?type=all'
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Cache cleared for type: all');
      expect(mockCacheManager.clearAll).toHaveBeenCalled();
    });

    it('should clear blockchain cache successfully', async () => {
      mockCachedRPCClient.invalidateCache.mockResolvedValue();

      const request = new NextRequest(
        'http://localhost:3000/api/cache?type=blockchain'
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Cache cleared for type: blockchain');
      expect(mockCachedRPCClient.invalidateCache).toHaveBeenCalledWith(
        'blockchain'
      );
    });

    it('should clear specific block cache successfully', async () => {
      mockCachedRPCClient.invalidateCache.mockResolvedValue();

      const request = new NextRequest(
        'http://localhost:3000/api/cache?type=block&identifier=test_hash'
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Cache cleared for type: block (test_hash)');
      expect(mockCachedRPCClient.invalidateCache).toHaveBeenCalledWith(
        'block',
        'test_hash'
      );
    });

    it('should clear specific address cache successfully', async () => {
      mockCachedRPCClient.invalidateCache.mockResolvedValue();

      const request = new NextRequest(
        'http://localhost:3000/api/cache?type=address&identifier=R9vqQz8...'
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Cache cleared for type: address (R9vqQz8...)');
      expect(mockCachedRPCClient.invalidateCache).toHaveBeenCalledWith(
        'address',
        'R9vqQz8...'
      );
    });

    it('should clear specific transaction cache successfully', async () => {
      mockCachedRPCClient.invalidateCache.mockResolvedValue();

      const request = new NextRequest(
        'http://localhost:3000/api/cache?type=transaction&identifier=tx123'
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Cache cleared for type: transaction (tx123)');
      expect(mockCachedRPCClient.invalidateCache).toHaveBeenCalledWith(
        'transaction',
        'tx123'
      );
    });

    it('should clear VerusID cache successfully', async () => {
      mockCachedRPCClient.invalidateCache.mockResolvedValue();

      const request = new NextRequest(
        'http://localhost:3000/api/cache?type=verusid&identifier=test@'
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Cache cleared for type: verusid (test@)');
      expect(mockCachedRPCClient.invalidateCache).toHaveBeenCalledWith(
        'verusid',
        'test@'
      );
    });

    it('should clear all VerusID cache when no identifier provided', async () => {
      mockCachedRPCClient.invalidateCache.mockResolvedValue();

      const request = new NextRequest(
        'http://localhost:3000/api/cache?type=verusid'
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Cache cleared for type: verusid');
      expect(mockCachedRPCClient.invalidateCache).toHaveBeenCalledWith(
        'verusid'
      );
    });

    it('should return error for block cache without identifier', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/cache?type=block'
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe(
        'Block identifier required for block cache clearing'
      );
    });

    it('should return error for transaction cache without identifier', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/cache?type=transaction'
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe(
        'Transaction identifier required for transaction cache clearing'
      );
    });

    it('should return error for address cache without identifier', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/cache?type=address'
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe(
        'Address identifier required for address cache clearing'
      );
    });

    it('should return error for invalid cache type', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/cache?type=invalid'
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe(
        'Invalid cache type. Use: all, blockchain, block, transaction, address, or verusid'
      );
    });

    it('should handle cache deletion errors gracefully', async () => {
      mockCacheManager.clearAll.mockRejectedValue(
        new Error('Redis connection failed')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/cache?type=all'
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cache deletion failed');
      expect(data.details).toBe('Redis connection failed');
    });
  });
});
