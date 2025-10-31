/**
 * Unified data loading hook with proper caching and loading states
 * Eliminates multiple cascading loading screens
 */

import { useState, useEffect, useRef } from 'react';

interface UseInitialDataOptions {
  cacheKey: string;
  fetchFn: () => Promise<any>;
  cacheDuration?: number; // milliseconds
  staleWhileRevalidate?: boolean;
}

interface UseInitialDataReturn<T> {
  data: T | null;
  isLoading: boolean;
  isValidating: boolean;
  error: Error | null;
  mutate: () => Promise<void>;
}

// Global cache to persist data across component unmounts
const globalCache = new Map<string, { data: any; timestamp: number }>();

export function useInitialData<T = any>({
  cacheKey,
  fetchFn,
  cacheDuration = 30000, // 30 seconds default
  staleWhileRevalidate = true,
}: UseInitialDataOptions): UseInitialDataReturn<T> {
  const [data, setData] = useState<T | null>(() => {
    // Check cache first
    const cached = globalCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      return cached.data;
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(!data);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);
  const fetchingRef = useRef(false);

  const fetchData = async (showLoading = true) => {
    if (fetchingRef.current) return; // Prevent duplicate fetches

    try {
      fetchingRef.current = true;
      
      if (showLoading && !data) {
        setIsLoading(true);
      } else {
        setIsValidating(true);
      }

      const result = await fetchFn();

      if (isMountedRef.current) {
        setData(result);
        setError(null);

        // Update global cache
        globalCache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch data'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsValidating(false);
        fetchingRef.current = false;
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    const cached = globalCache.get(cacheKey);
    const isCacheValid = cached && Date.now() - cached.timestamp < cacheDuration;

    if (!isCacheValid) {
      // No valid cache, fetch immediately
      fetchData(true);
    } else if (staleWhileRevalidate && cached) {
      // Use cached data but revalidate in background
      setData(cached.data);
      setIsLoading(false);
      
      // Revalidate in background
      setTimeout(() => {
        fetchData(false);
      }, 100);
    }

    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  const mutate = async () => {
    await fetchData(false);
  };

  return {
    data,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

// Helper to clear cache for a specific key or all keys
export function clearCache(key?: string) {
  if (key) {
    globalCache.delete(key);
  } else {
    globalCache.clear();
  }
}

// Helper to prefetch data (useful for preloading)
export async function prefetchData(
  cacheKey: string,
  fetchFn: () => Promise<any>,
  cacheDuration = 30000
) {
  try {
    const result = await fetchFn();
    globalCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });
    return result;
  } catch (error) {
    console.error(`Failed to prefetch data for ${cacheKey}:`, error);
    return null;
  }
}

