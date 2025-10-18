import {
  CacheManager,
  CACHE_KEYS,
  CACHE_TTL,
  CacheInvalidation,
} from '@/lib/cache/cache-utils';
import { redis } from '@/lib/cache/redis';

// Mock Redis
jest.mock('@/lib/cache/redis', () => ({
  redis: {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    exists: jest.fn(),
    ttl: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    info: jest.fn(),
    dbsize: jest.fn(),
    flushdb: jest.fn(),
  },
}));

const mockRedis = redis as jest.Mocked<typeof redis>;

describe('CacheManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should retrieve cached data successfully', async () => {
      const mockData = { test: 'data' };
      mockRedis.get.mockResolvedValue(JSON.stringify(mockData));

      const result = await CacheManager.get('test:key');

      expect(result).toEqual(mockData);
      expect(mockRedis.get).toHaveBeenCalledWith('test:key');
    });

    it('should return null for non-existent key', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await CacheManager.get('nonexistent:key');

      expect(result).toBeNull();
    });

    it('should handle JSON parse errors', async () => {
      mockRedis.get.mockResolvedValue('invalid json');

      const result = await CacheManager.get('invalid:key');

      expect(result).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await CacheManager.get('error:key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set data with TTL successfully', async () => {
      const mockData = { test: 'data' };
      mockRedis.setex.mockResolvedValue('OK');

      const result = await CacheManager.set('test:key', mockData, 60);

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test:key',
        60,
        JSON.stringify(mockData)
      );
    });

    it('should handle Redis errors', async () => {
      const mockData = { test: 'data' };
      mockRedis.setex.mockRejectedValue(new Error('Redis connection failed'));

      const result = await CacheManager.set('error:key', mockData, 60);

      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete key successfully', async () => {
      mockRedis.del.mockResolvedValue(1);

      const result = await CacheManager.delete('test:key');

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('test:key');
    });

    it('should return false for non-existent key', async () => {
      mockRedis.del.mockResolvedValue(0);

      const result = await CacheManager.delete('nonexistent:key');

      expect(result).toBe(false);
    });

    it('should handle Redis errors', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis connection failed'));

      const result = await CacheManager.delete('error:key');

      expect(result).toBe(false);
    });
  });

  describe('deletePattern', () => {
    it('should delete keys matching pattern', async () => {
      const mockKeys = ['test:key1', 'test:key2', 'test:key3'];
      mockRedis.keys.mockResolvedValue(mockKeys);
      mockRedis.del.mockResolvedValue(3);

      const result = await CacheManager.deletePattern('test:*');

      expect(result).toBe(3);
      expect(mockRedis.keys).toHaveBeenCalledWith('test:*');
      expect(mockRedis.del).toHaveBeenCalledWith(...mockKeys);
    });

    it('should return 0 for no matching keys', async () => {
      mockRedis.keys.mockResolvedValue([]);

      const result = await CacheManager.deletePattern('nonexistent:*');

      expect(result).toBe(0);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should handle Redis errors', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis connection failed'));

      const result = await CacheManager.deletePattern('error:*');

      expect(result).toBe(0);
    });
  });

  describe('exists', () => {
    it('should return true for existing key', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const result = await CacheManager.exists('test:key');

      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith('test:key');
    });

    it('should return false for non-existent key', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const result = await CacheManager.exists('nonexistent:key');

      expect(result).toBe(false);
    });

    it('should handle Redis errors', async () => {
      mockRedis.exists.mockRejectedValue(new Error('Redis connection failed'));

      const result = await CacheManager.exists('error:key');

      expect(result).toBe(false);
    });
  });

  describe('getTTL', () => {
    it('should return TTL for key', async () => {
      mockRedis.ttl.mockResolvedValue(30);

      const result = await CacheManager.getTTL('test:key');

      expect(result).toBe(30);
      expect(mockRedis.ttl).toHaveBeenCalledWith('test:key');
    });

    it('should handle Redis errors', async () => {
      mockRedis.ttl.mockRejectedValue(new Error('Redis connection failed'));

      const result = await CacheManager.getTTL('error:key');

      expect(result).toBe(-1);
    });
  });

  describe('increment', () => {
    it('should increment counter with TTL', async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      const result = await CacheManager.increment('counter:key', 60);

      expect(result).toBe(1);
      expect(mockRedis.incr).toHaveBeenCalledWith('counter:key');
      expect(mockRedis.expire).toHaveBeenCalledWith('counter:key', 60);
    });

    it('should increment counter without TTL', async () => {
      mockRedis.incr.mockResolvedValue(2);

      const result = await CacheManager.increment('counter:key');

      expect(result).toBe(2);
      expect(mockRedis.incr).toHaveBeenCalledWith('counter:key');
      expect(mockRedis.expire).not.toHaveBeenCalled();
    });

    it('should handle Redis errors', async () => {
      mockRedis.incr.mockRejectedValue(new Error('Redis connection failed'));

      const result = await CacheManager.increment('error:key');

      expect(result).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      const mockMemoryInfo = 'used_memory_human:2.5M\nused_memory:2621440';
      const mockStatsInfo =
        'connected_clients:3\ntotal_commands_processed:1000';
      const mockServerInfo = 'uptime_in_seconds:3600\nredis_version:7.0.0';

      mockRedis.info
        .mockResolvedValueOnce(mockMemoryInfo)
        .mockResolvedValueOnce(mockStatsInfo)
        .mockResolvedValueOnce(mockServerInfo);
      mockRedis.dbsize.mockResolvedValue(15);

      const result = await CacheManager.getStats();

      expect(result).toEqual({
        totalKeys: 15,
        memoryUsage: '2.5M',
        connectedClients: 3,
        uptime: 3600,
      });
    });

    it('should handle Redis errors', async () => {
      mockRedis.info.mockRejectedValue(new Error('Redis connection failed'));

      const result = await CacheManager.getStats();

      expect(result).toEqual({
        totalKeys: 0,
        memoryUsage: 'unknown',
        connectedClients: 0,
        uptime: 0,
      });
    });
  });

  describe('clearAll', () => {
    it('should clear all cache', async () => {
      mockRedis.flushdb.mockResolvedValue('OK');

      const result = await CacheManager.clearAll();

      expect(result).toBe(true);
      expect(mockRedis.flushdb).toHaveBeenCalled();
    });

    it('should handle Redis errors', async () => {
      mockRedis.flushdb.mockRejectedValue(new Error('Redis connection failed'));

      const result = await CacheManager.clearAll();

      expect(result).toBe(false);
    });
  });
});

describe('CACHE_KEYS', () => {
  it('should generate correct cache keys', () => {
    expect(CACHE_KEYS.blockchainInfo()).toBe('blockchain:info');
    expect(CACHE_KEYS.blockData('hash123')).toBe('block:hash123');
    expect(CACHE_KEYS.transactionData('tx123')).toBe('tx:tx123');
    expect(CACHE_KEYS.addressBalance('addr123')).toBe(
      'address:addr123:balance'
    );
    expect(CACHE_KEYS.verusId('test@')).toBe('verusid:test@');
  });
});

describe('CACHE_TTL', () => {
  it('should have correct TTL values', () => {
    expect(CACHE_TTL.BLOCKCHAIN_INFO).toBe(30);
    expect(CACHE_TTL.BLOCK_DATA).toBe(300);
    expect(CACHE_TTL.TRANSACTION_DATA).toBe(120);
    expect(CACHE_TTL.ADDRESS_BALANCE).toBe(60);
    expect(CACHE_TTL.MEMPOOL_INFO).toBe(10);
    expect(CACHE_TTL.VERUS_ID).toBe(300);
    expect(CACHE_TTL.CURRENCY_DATA).toBe(600);
  });
});

describe('CacheInvalidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('invalidateBlockchain', () => {
    it('should invalidate blockchain-related cache', async () => {
      mockRedis.keys.mockResolvedValue(['blockchain:info', 'mining:info']);
      mockRedis.del.mockResolvedValue(2);

      await CacheInvalidation.invalidateBlockchain();

      expect(mockRedis.keys).toHaveBeenCalledWith('blockchain:*');
      expect(mockRedis.keys).toHaveBeenCalledWith('mining:*');
      expect(mockRedis.keys).toHaveBeenCalledWith('network:*');
      expect(mockRedis.keys).toHaveBeenCalledWith('mempool:*');
    });
  });

  describe('invalidateBlock', () => {
    it('should invalidate block-related cache', async () => {
      mockRedis.del.mockResolvedValue(1);
      mockRedis.keys.mockResolvedValue(['blocks:page:1']);
      mockRedis.del.mockResolvedValue(1);

      await CacheInvalidation.invalidateBlock('hash123');

      expect(mockRedis.del).toHaveBeenCalledWith('block:hash123');
      expect(mockRedis.keys).toHaveBeenCalledWith('blocks:*');
    });
  });

  describe('invalidateTransaction', () => {
    it('should invalidate transaction-related cache', async () => {
      mockRedis.del.mockResolvedValue(1);
      mockRedis.keys.mockResolvedValue(['transactions:page:1']);
      mockRedis.del.mockResolvedValue(1);

      await CacheInvalidation.invalidateTransaction('tx123');

      expect(mockRedis.del).toHaveBeenCalledWith('tx:tx123');
      expect(mockRedis.keys).toHaveBeenCalledWith('transactions:*');
    });
  });

  describe('invalidateAddress', () => {
    it('should invalidate address-related cache', async () => {
      mockRedis.keys.mockResolvedValue([
        'address:addr123:balance',
        'address:addr123:tx',
      ]);
      mockRedis.del.mockResolvedValue(2);

      await CacheInvalidation.invalidateAddress('addr123');

      expect(mockRedis.keys).toHaveBeenCalledWith('address:addr123:*');
      expect(mockRedis.del).toHaveBeenCalledWith(
        'address:addr123:balance',
        'address:addr123:tx'
      );
    });
  });

  describe('invalidateVerusId', () => {
    it('should invalidate VerusID-related cache', async () => {
      mockRedis.del.mockResolvedValue(1);
      mockRedis.del.mockResolvedValue(1);

      await CacheInvalidation.invalidateVerusId('test@');

      expect(mockRedis.del).toHaveBeenCalledWith('verusid:test@');
      expect(mockRedis.del).toHaveBeenCalledWith('verusid:list');
    });
  });
});
