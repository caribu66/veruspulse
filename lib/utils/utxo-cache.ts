/**
 * Intelligent UTXO Data Caching System
 * Reduces API calls and improves performance for large datasets
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  key: string;
}

interface UTXOCacheConfig {
  defaultTTL?: number; // Default cache TTL in milliseconds
  maxSize?: number; // Maximum number of cache entries
  enableCompression?: boolean; // Enable data compression for large datasets
}

class UTXOCache {
  private cache = new Map<string, CacheEntry<any>>();
  private config: Required<UTXOCacheConfig>;

  constructor(config: UTXOCacheConfig = {}) {
    this.config = {
      defaultTTL: config.defaultTTL || 30000, // 30 seconds default
      maxSize: config.maxSize || 100, // Max 100 cache entries
      enableCompression: config.enableCompression || false,
    };
  }

  /**
   * Generate cache key for UTXO data
   */
  private generateKey(iaddr: string, filters?: any): string {
    const filterString = filters ? JSON.stringify(filters) : '';
    return `utxo_${iaddr}_${filterString}`;
  }

  /**
   * Check if cache entry is valid (not expired)
   */
  private isValid(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now - entry.timestamp >= entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Evict oldest entries if cache is full
   */
  private evictOldest(): void {
    if (this.cache.size >= this.config.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      // Remove oldest 10% of entries
      const toRemove = Math.ceil(entries.length * 0.1);
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  /**
   * Get cached data
   */
  get<T>(iaddr: string, filters?: any): T | null {
    const key = this.generateKey(iaddr, filters);
    const entry = this.cache.get(key);

    if (!entry || !this.isValid(entry)) {
      if (entry) {
        this.cache.delete(key); // Remove expired entry
      }
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached data
   */
  set<T>(iaddr: string, data: T, ttl?: number, filters?: any): void {
    const key = this.generateKey(iaddr, filters);

    // Clean up before adding new entry
    this.cleanup();
    this.evictOldest();

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      key,
    };

    this.cache.set(key, entry);
  }

  /**
   * Invalidate cache for specific iaddr
   */
  invalidate(iaddr: string): void {
    const keysToDelete: string[] = [];
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.includes(`utxo_${iaddr}_`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{ key: string; age: number; ttl: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      ttl: entry.ttl,
    }));

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: 0, // Would need to track hits/misses for accurate rate
      entries,
    };
  }

  /**
   * Preload data for better UX
   */
  async preload(
    iaddr: string,
    fetchFn: () => Promise<any>,
    ttl?: number
  ): Promise<void> {
    try {
      const data = await fetchFn();
      this.set(iaddr, data, ttl);
    } catch (error) {
      console.warn('Failed to preload UTXO data:', error);
    }
  }
}

// Create singleton instance
export const utxoCache = new UTXOCache({
  defaultTTL: 30000, // 30 seconds
  maxSize: 50, // Max 50 cache entries
  enableCompression: false,
});

// Cache-aware fetch function
export async function fetchUTXODataWithCache(
  iaddr: string,
  fetchFn: () => Promise<any>,
  options: {
    ttl?: number;
    filters?: any;
    forceRefresh?: boolean;
  } = {}
): Promise<any> {
  const { ttl, filters, forceRefresh = false } = options;

  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = utxoCache.get(iaddr, filters);
    if (cached) {
      return cached;
    }
  }

  // Fetch fresh data
  try {
    const data = await fetchFn();

    // Cache the result
    utxoCache.set(iaddr, data, ttl, filters);

    return data;
  } catch (error) {
    // Return cached data if available, even if expired
    const staleCache = utxoCache.get(iaddr, filters);
    if (staleCache) {
      console.warn('Using stale cache due to fetch error:', error);
      return staleCache;
    }

    throw error;
  }
}

// Utility for cache invalidation on data changes
export function invalidateUTXOCache(iaddr: string): void {
  utxoCache.invalidate(iaddr);
}

// Utility for cache statistics (useful for debugging)
export function getUTXOCacheStats() {
  return utxoCache.getStats();
}
