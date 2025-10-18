import { useState, useEffect, useCallback } from 'react';

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  version?: string; // Cache version for invalidation
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: string;
}

/**
 * Hook for caching data in localStorage with TTL and versioning
 * Reduces API calls and improves perceived performance
 */
export function useLocalStorageCache<T>(
  key: string,
  options: CacheOptions = {}
) {
  const { ttl = 60000, version = '1.0' } = options; // Default 1 minute TTL
  const cacheKey = `verus_cache_${key}`;

  const [cachedData, setCachedData] = useState<T | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  // Load from cache on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const entry: CacheEntry<T> = JSON.parse(cached);
        const now = Date.now();
        const isExpired = now - entry.timestamp > ttl;
        const isOldVersion = entry.version !== version;

        if (!isExpired && !isOldVersion) {
          setCachedData(entry.data);
          setIsFromCache(true);
        } else {
          // Clear expired or old version cache
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      console.error('Error loading from cache:', error);
      localStorage.removeItem(cacheKey);
    }
  }, [cacheKey, ttl, version]);

  // Save to cache
  const saveToCache = useCallback(
    (data: T) => {
      try {
        const entry: CacheEntry<T> = {
          data,
          timestamp: Date.now(),
          version,
        };
        localStorage.setItem(cacheKey, JSON.stringify(entry));
        setCachedData(data);
        setIsFromCache(false);
      } catch (error) {
        console.error('Error saving to cache:', error);
        // If quota exceeded, clear old caches
        if (
          error instanceof DOMException &&
          error.name === 'QuotaExceededError'
        ) {
          clearOldCaches();
        }
      }
    },
    [cacheKey, version]
  );

  // Clear this cache
  const clearCache = useCallback(() => {
    localStorage.removeItem(cacheKey);
    setCachedData(null);
    setIsFromCache(false);
  }, [cacheKey]);

  // Clear all Verus caches
  const clearAllCaches = useCallback(() => {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('verus_cache_')) {
        localStorage.removeItem(key);
      }
    });
    setCachedData(null);
    setIsFromCache(false);
  }, []);

  return {
    cachedData,
    isFromCache,
    saveToCache,
    clearCache,
    clearAllCaches,
  };
}

// Helper to clear old caches (called when quota exceeded)
function clearOldCaches() {
  try {
    const keys = Object.keys(localStorage);
    const cacheEntries: Array<{ key: string; timestamp: number }> = [];

    keys.forEach(key => {
      if (key.startsWith('verus_cache_')) {
        try {
          const entry = JSON.parse(localStorage.getItem(key) || '{}');
          if (entry.timestamp) {
            cacheEntries.push({ key, timestamp: entry.timestamp });
          }
        } catch (e) {
          // Invalid entry, remove it
          localStorage.removeItem(key);
        }
      }
    });

    // Sort by timestamp and remove oldest 50%
    cacheEntries.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = cacheEntries.slice(0, Math.floor(cacheEntries.length / 2));
    toRemove.forEach(({ key }) => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing old caches:', error);
  }
}
