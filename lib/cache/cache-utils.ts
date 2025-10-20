import { redis } from './redis';
import { logger } from '@/lib/utils/logger';

// Cache configuration
export const CACHE_TTL = {
  // Blockchain data - cache for 30 seconds
  BLOCKCHAIN_INFO: 30,
  MINING_INFO: 30,
  NETWORK_INFO: 30,

  // Block data - cache for 5 minutes (blocks don't change)
  BLOCK_DATA: 300,
  BLOCK_LIST: 60,

  // Transaction data - cache for 2 minutes
  TRANSACTION_DATA: 120,
  TRANSACTION_LIST: 60,

  // Address data - cache for 1 minute
  ADDRESS_BALANCE: 60,
  ADDRESS_TRANSACTIONS: 60,
  ADDRESS_UTXOS: 60,

  // Mempool data - cache for 10 seconds (changes frequently)
  MEMPOOL_INFO: 10,
  MEMPOOL_TRANSACTIONS: 10,

  // Identity data - cache for 5 minutes (rarely changes)
  VERUS_ID: 300,
  VERUS_ID_LIST: 300,

  // Currency data - cache for 10 minutes
  CURRENCY_DATA: 600,

  // Health check - cache for 5 seconds
  HEALTH_CHECK: 5,
};

// Cache key generators
export const CACHE_KEYS = {
  blockchainInfo: () => 'blockchain:info',
  miningInfo: () => 'mining:info',
  networkInfo: () => 'network:info',

  blockData: (hash: string) => `block:${hash}`,
  blockList: (page: number, limit: number) =>
    `blocks:page:${page}:limit:${limit}`,

  transactionData: (txid: string) => `tx:${txid}`,
  transactionList: (page: number, limit: number) =>
    `transactions:page:${page}:limit:${limit}`,

  addressBalance: (address: string) => `address:${address}:balance`,
  addressTransactions: (address: string, page: number) =>
    `address:${address}:tx:page:${page}`,
  addressUtxos: (address: string) => `address:${address}:utxos`,

  mempoolInfo: () => 'mempool:info',
  mempoolTransactions: () => 'mempool:transactions',

  verusId: (identity: string) => `verusid:${identity}`,
  verusIdList: () => 'verusid:list',

  currencyData: (currencyId: string) => `currency:${currencyId}`,
  currencyList: () => 'currencies:list',

  healthCheck: () => 'health:check',
  
  circulatingSupply: () => 'blockchain:circulating_supply',
};

// Generic cache operations
export class CacheManager {
  /**
   * Get data from cache
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      if (data) {
        logger.debug(`📦 Cache HIT: ${key}`);
        return JSON.parse(data);
      }
      logger.debug(`❌ Cache MISS: ${key}`);
      return null;
    } catch (error) {
      logger.error(`❌ Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set data in cache with TTL
   */
  static async set<T>(
    key: string,
    data: T,
    ttlSeconds: number
  ): Promise<boolean> {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(data));
      logger.debug(`💾 Cache SET: ${key} (TTL: ${ttlSeconds}s)`);
      return true;
    } catch (error) {
      logger.error(`❌ Cache SET error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete data from cache
   */
  static async delete(key: string): Promise<boolean> {
    try {
      const result = await redis.del(key);
      logger.debug(`🗑️ Cache DELETE: ${key}`);
      return result > 0;
    } catch (error) {
      logger.error(`❌ Cache DELETE error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys with pattern
   */
  static async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        const result = await redis.del(...keys);
        logger.debug(`🗑️ Cache DELETE PATTERN: ${pattern} (${result} keys)`);
        return result;
      }
      return 0;
    } catch (error) {
      logger.error(`❌ Cache DELETE PATTERN error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`❌ Cache EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL for a key
   */
  static async getTTL(key: string): Promise<number> {
    try {
      return await redis.ttl(key);
    } catch (error) {
      logger.error(`❌ Cache TTL error for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Increment a counter (for rate limiting, etc.)
   */
  static async increment(key: string, ttlSeconds?: number): Promise<number> {
    try {
      const result = await redis.incr(key);
      if (ttlSeconds && result === 1) {
        await redis.expire(key, ttlSeconds);
      }
      return result;
    } catch (error) {
      logger.error(`❌ Cache INCREMENT error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    connectedClients: number;
    uptime: number;
  }> {
    try {
      const info = await redis.info('memory');
      const stats = await redis.info('stats');
      const server = await redis.info('server');

      // Parse memory usage
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'unknown';

      // Parse connected clients
      const clientsMatch = stats.match(/connected_clients:(\d+)/);
      const connectedClients = clientsMatch ? parseInt(clientsMatch[1]) : 0;

      // Parse uptime
      const uptimeMatch = server.match(/uptime_in_seconds:(\d+)/);
      const uptime = uptimeMatch ? parseInt(uptimeMatch[1]) : 0;

      // Count keys
      const totalKeys = await redis.dbsize();

      return {
        totalKeys,
        memoryUsage,
        connectedClients,
        uptime,
      };
    } catch (error) {
      logger.error('❌ Error getting cache stats:', error);
      return {
        totalKeys: 0,
        memoryUsage: 'unknown',
        connectedClients: 0,
        uptime: 0,
      };
    }
  }

  /**
   * Clear all cache
   */
  static async clearAll(): Promise<boolean> {
    try {
      await redis.flushdb();
      logger.info('🗑️ All cache cleared');
      return true;
    } catch (error) {
      logger.error('❌ Error clearing cache:', error);
      return false;
    }
  }
}

// Cache wrapper for API functions
export function withCache<T extends any[], R>(
  cacheKey: string | ((...args: T) => string),
  ttlSeconds: number,
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const key = typeof cacheKey === 'function' ? cacheKey(...args) : cacheKey;

    // Try to get from cache first
    const cached = await CacheManager.get<R>(key);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, execute function and cache result
    try {
      const result = await fn(...args);
      await CacheManager.set(key, result, ttlSeconds);
      return result;
    } catch (error) {
      logger.error(`❌ Error in cached function for key ${key}:`, error);
      throw error;
    }
  };
}

// Cache invalidation helpers
export const CacheInvalidation = {
  /**
   * Invalidate all blockchain-related cache
   */
  async invalidateBlockchain() {
    const patterns = ['blockchain:*', 'mining:*', 'network:*', 'mempool:*'];

    for (const pattern of patterns) {
      await CacheManager.deletePattern(pattern);
    }
  },

  /**
   * Invalidate block-related cache
   */
  async invalidateBlock(hash: string) {
    await CacheManager.delete(CACHE_KEYS.blockData(hash));
    await CacheManager.deletePattern('blocks:*');
  },

  /**
   * Invalidate transaction-related cache
   */
  async invalidateTransaction(txid: string) {
    await CacheManager.delete(CACHE_KEYS.transactionData(txid));
    await CacheManager.deletePattern('transactions:*');
  },

  /**
   * Invalidate address-related cache
   */
  async invalidateAddress(address: string) {
    const patterns = [`address:${address}:*`];

    for (const pattern of patterns) {
      await CacheManager.deletePattern(pattern);
    }
  },

  /**
   * Invalidate VerusID-related cache
   */
  async invalidateVerusId(identity: string) {
    await CacheManager.delete(CACHE_KEYS.verusId(identity));
    await CacheManager.delete(CACHE_KEYS.verusIdList());
  },
};
