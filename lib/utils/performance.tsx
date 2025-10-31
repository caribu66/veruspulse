/**
 * Performance optimization utilities for React applications
 *
 * This module provides various utilities to optimize performance including:
 * - Request deduplication and batching
 * - Memory management and caching
 * - Lazy loading and virtualization
 * - Performance monitoring and measurement
 *
 * @fileoverview Performance optimization utilities
 */

import React from 'react';

// Types for better type safety
interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

interface MemoizedValue<T> {
  result: T;
  timestamp: number;
}

interface RequestQueueConfig {
  maxConcurrent: number;
  retryAttempts: number;
  retryDelay: number;
}

interface PerformanceConfig {
  enableLogging: boolean;
  slowRenderThreshold: number;
  memoizeTTL: number;
  cacheCleanupInterval: number;
}

// Configuration with environment-aware defaults
const defaultConfig: PerformanceConfig = {
  enableLogging: process.env.NODE_ENV === 'development',
  slowRenderThreshold: 16, // 60fps threshold
  memoizeTTL: 5000,
  cacheCleanupInterval: 60000,
};

// Request deduplication - prevents multiple identical requests
const pendingRequests = new Map<string, PendingRequest<any>>();

/**
 * Deduplicates requests by key to prevent multiple identical API calls
 *
 * @template T - The return type of the request
 * @param key - Unique identifier for the request
 * @param fetcher - Function that performs the actual request
 * @param ttl - Time-to-live for the request cache (default: 30000ms)
 * @returns Promise that resolves to the request result
 *
 * @example
 * ```typescript
 * const userData = await deduplicateRequest(
 *   'user-123',
 *   () => fetchUserData('123'),
 *   30000
 * );
 * ```
 */
export function deduplicateRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 30000
): Promise<T> {
  const now = Date.now();
  const existing = pendingRequests.get(key);

  // Return existing promise if request is pending and not expired
  if (existing && now - existing.timestamp < ttl) {
    return existing.promise;
  }

  // Create new request with error handling
  const promise = fetcher()
    .catch(error => {
      // Log error in development
      if (defaultConfig.enableLogging) {
        console.error(`[Performance] Request failed for key "${key}":`, error);
      }
      throw error;
    })
    .finally(() => {
      pendingRequests.delete(key);
    });

  pendingRequests.set(key, { promise, timestamp: now });
  return promise;
}

/**
 * Batches multiple API calls to prevent overwhelming the server
 *
 * @template T - The return type of each request
 * @param requests - Array of functions that return promises
 * @param batchSize - Maximum number of concurrent requests per batch (default: 5)
 * @param delay - Delay between batches in milliseconds (default: 100)
 * @returns Promise that resolves to an array of all results
 *
 * @example
 * ```typescript
 * const results = await batchRequests([
 *   () => fetchUser(1),
 *   () => fetchUser(2),
 *   () => fetchUser(3)
 * ], 2, 50);
 * ```
 */
export async function batchRequests<T>(
  requests: Array<() => Promise<T>>,
  batchSize: number = 5,
  delay: number = 100
): Promise<T[]> {
  if (!Array.isArray(requests) || requests.length === 0) {
    return [];
  }

  if (batchSize <= 0) {
    throw new Error('Batch size must be greater than 0');
  }

  const results: T[] = [];
  const errors: Error[] = [];

  try {
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);

      try {
        const batchResults = await Promise.allSettled(
          batch.map(async (req, index) => {
            try {
              return await req();
            } catch (error) {
              const errorMessage = `Request ${i + index} failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
              if (defaultConfig.enableLogging) {
                console.error(`[Performance] ${errorMessage}`, error);
              }
              throw new Error(errorMessage);
            }
          })
        );

        // Process results and collect errors
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            errors.push(new Error(`Batch ${i + index}: ${result.reason}`));
          }
        });

        // Small delay between batches to prevent overwhelming the API
        if (i + batchSize < requests.length && delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        const errorMessage = `Batch processing failed at index ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        if (defaultConfig.enableLogging) {
          console.error(`[Performance] ${errorMessage}`, error);
        }
        errors.push(new Error(errorMessage));
      }
    }

    // If there were errors, log them but don't fail the entire operation
    if (errors.length > 0 && defaultConfig.enableLogging) {
      console.warn(
        `[Performance] ${errors.length} requests failed during batching:`,
        errors
      );
    }

    return results;
  } catch (error) {
    const errorMessage = `Batch requests failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    if (defaultConfig.enableLogging) {
      console.error(`[Performance] ${errorMessage}`, error);
    }
    throw new Error(errorMessage);
  }
}

/**
 * Calculates the visible range for virtual scrolling to optimize large list rendering
 *
 * @param scrollTop - Current scroll position from the top
 * @param containerHeight - Height of the scrollable container
 * @param itemHeight - Height of each item in the list
 * @param totalItems - Total number of items in the list
 * @param overscan - Number of items to render outside the visible area (default: 3)
 * @returns Object containing startIndex, endIndex, and visibleCount
 *
 * @example
 * ```typescript
 * const { startIndex, endIndex, visibleCount } = calculateVisibleRange(
 *   100,    // scrollTop
 *   400,    // containerHeight
 *   50,     // itemHeight
 *   1000,   // totalItems
 *   5       // overscan
 * );
 * ```
 */
export function calculateVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan: number = 3
): { startIndex: number; endIndex: number; visibleCount: number } {
  // Input validation
  if (scrollTop < 0) {
    throw new Error('scrollTop must be non-negative');
  }
  if (containerHeight <= 0) {
    throw new Error('containerHeight must be positive');
  }
  if (itemHeight <= 0) {
    throw new Error('itemHeight must be positive');
  }
  if (totalItems < 0) {
    throw new Error('totalItems must be non-negative');
  }
  if (overscan < 0) {
    throw new Error('overscan must be non-negative');
  }

  // Handle empty list
  if (totalItems === 0) {
    return { startIndex: 0, endIndex: -1, visibleCount: 0 };
  }

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    totalItems - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  return {
    startIndex,
    endIndex,
    visibleCount: Math.max(0, endIndex - startIndex + 1),
  };
}

/**
 * Preloads images for better user experience
 *
 * @param urls - Array of image URLs to preload
 * @param timeout - Timeout in milliseconds for each image (default: 10000)
 * @returns Promise that resolves when all images are loaded or rejects on first failure
 *
 * @example
 * ```typescript
 * try {
 *   await preloadImages([
 *     '/images/hero.jpg',
 *     '/images/logo.png'
 *   ]);
 *   console.info('All images preloaded successfully');
 * } catch (error) {
 *   console.error('Failed to preload images:', error);
 * }
 * ```
 */
export function preloadImages(
  urls: string[],
  timeout: number = 10000
): Promise<void[]> {
  if (!Array.isArray(urls) || urls.length === 0) {
    return Promise.resolve([]);
  }

  return Promise.all(
    urls.map(url => {
      if (typeof url !== 'string' || !url.trim()) {
        throw new Error('Invalid URL provided for image preloading');
      }

      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        let isResolved = false;

        const cleanup = () => {
          img.onload = null;
          img.onerror = null;
        };

        const resolveOnce = () => {
          if (!isResolved) {
            isResolved = true;
            cleanup();
            resolve();
          }
        };

        const rejectOnce = (error: Error) => {
          if (!isResolved) {
            isResolved = true;
            cleanup();
            reject(error);
          }
        };

        // Set up timeout
        const timeoutId = setTimeout(() => {
          rejectOnce(
            new Error(`Image preload timeout for ${url} after ${timeout}ms`)
          );
        }, timeout);

        img.onload = () => {
          clearTimeout(timeoutId);
          resolveOnce();
        };

        img.onerror = () => {
          clearTimeout(timeoutId);
          rejectOnce(new Error(`Failed to load image: ${url}`));
        };

        // Start loading
        img.src = url;
      });
    })
  );
}

/**
 * Creates a lazy-loaded React component with error boundary and loading fallback
 *
 * @template T - The component type to lazy load
 * @param importFn - Function that returns a promise resolving to the component
 * @param fallback - Optional fallback component to show while loading
 * @param errorFallback - Optional fallback component to show on error
 * @returns Wrapped lazy component with Suspense and error handling
 *
 * @example
 * ```typescript
 * const LazyDashboard = createLazyComponent(
 *   () => import('./Dashboard'),
 *   <div>Loading dashboard...</div>,
 *   <div>Failed to load dashboard</div>
 * );
 * ```
 */
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ReactNode,
  errorFallback?: React.ReactNode
) {
  if (typeof importFn !== 'function') {
    throw new Error('importFn must be a function that returns a Promise');
  }

  const LazyComponent = React.lazy(importFn);

  const LazyWrapper = React.forwardRef<any, React.ComponentProps<T>>(
    (props, ref) => {
      const [hasError, setHasError] = React.useState(false);

      React.useEffect(() => {
        const handleError = () => setHasError(true);
        window.addEventListener('unhandledrejection', handleError);
        return () =>
          window.removeEventListener('unhandledrejection', handleError);
      }, []);

      if (hasError) {
        return errorFallback || <div>Failed to load component</div>;
      }

      return (
        <React.Suspense fallback={fallback || <div>Loading...</div>}>
          <LazyComponent {...(props as any)} ref={ref} />
        </React.Suspense>
      );
    }
  );

  LazyWrapper.displayName = 'LazyComponent';

  return LazyWrapper;
}

/**
 * Sets up an Intersection Observer for lazy loading elements
 *
 * @param element - The DOM element to observe
 * @param callback - Function to call when element becomes visible
 * @param options - Intersection Observer options
 * @param once - Whether to stop observing after first intersection (default: true)
 * @returns Cleanup function to disconnect the observer
 *
 * @example
 * ```typescript
 * const cleanup = observeElement(
 *   imageRef.current,
 *   () => loadImage(),
 *   { threshold: 0.1 },
 *   true
 * );
 *
 * // Later, cleanup
 * cleanup();
 * ```
 */
export function observeElement(
  element: Element,
  callback: () => void,
  options?: IntersectionObserverInit,
  once: boolean = true
): () => void {
  if (!element) {
    throw new Error('Element is required for intersection observation');
  }

  if (typeof callback !== 'function') {
    throw new Error('Callback must be a function');
  }

  // Check if IntersectionObserver is supported
  if (typeof IntersectionObserver === 'undefined') {
    if (defaultConfig.enableLogging) {
      console.warn(
        '[Performance] IntersectionObserver not supported, executing callback immediately'
      );
    }
    callback();
    return () => {}; // No-op cleanup function
  }

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          try {
            callback();
          } catch (error) {
            if (defaultConfig.enableLogging) {
              console.error(
                '[Performance] Intersection observer callback failed:',
                error
              );
            }
          }

          if (once) {
            observer.unobserve(entry.target);
          }
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '50px',
      ...options,
    }
  );

  observer.observe(element);

  return () => {
    observer.disconnect();
  };
}

/**
 * Measures component render time for performance monitoring
 *
 * @param componentName - Name of the component being measured
 * @param threshold - Performance threshold in milliseconds (default: 16ms for 60fps)
 * @returns Function to call when measurement should end
 *
 * @example
 * ```typescript
 * const endMeasurement = measureRenderTime('ExpensiveComponent');
 *
 * // Component renders...
 *
 * endMeasurement(); // Logs render time
 * ```
 */
export function measureRenderTime(
  componentName: string,
  threshold: number = defaultConfig.slowRenderThreshold
): () => void {
  if (!componentName || typeof componentName !== 'string') {
    throw new Error('Component name must be a non-empty string');
  }

  if (threshold <= 0) {
    throw new Error('Threshold must be positive');
  }

  const start = performance.now();

  return () => {
    const end = performance.now();
    const duration = end - start;

    if (duration > threshold) {
      if (defaultConfig.enableLogging) {
        console.warn(
          `[Performance] ${componentName} rendered in ${duration.toFixed(2)}ms (>${threshold}ms)`
        );
      }
    } else if (defaultConfig.enableLogging) {
      console.info(
        `[Performance] ${componentName} rendered in ${duration.toFixed(2)}ms`
      );
    }
  };
}

/**
 * Request queue for rate limiting and managing concurrent API calls
 */
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private maxConcurrent: number;
  private activeCount = 0;
  private config: RequestQueueConfig;

  constructor(maxConcurrent: number = 3, config?: Partial<RequestQueueConfig>) {
    this.maxConcurrent = maxConcurrent;
    this.config = {
      maxConcurrent,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  /**
   * Adds a request to the queue
   *
   * @template T - The return type of the request
   * @param request - Function that returns a promise
   * @returns Promise that resolves to the request result
   */
  async add<T>(request: () => Promise<T>): Promise<T> {
    if (typeof request !== 'function') {
      throw new Error('Request must be a function that returns a Promise');
    }

    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        let attempts = 0;

        while (attempts < this.config.retryAttempts) {
          try {
            const result = await request();
            resolve(result);
            return;
          } catch (error) {
            attempts++;

            if (attempts >= this.config.retryAttempts) {
              if (defaultConfig.enableLogging) {
                console.error(
                  `[Performance] Request failed after ${attempts} attempts:`,
                  error
                );
              }
              reject(error);
              return;
            }

            // Wait before retry
            await new Promise(resolve =>
              setTimeout(resolve, this.config.retryDelay * attempts)
            );
          }
        }
      });

      this.process();
    });
  }

  /**
   * Processes the request queue
   */
  private async process() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0 && this.activeCount < this.maxConcurrent) {
      const request = this.queue.shift();
      if (request) {
        this.activeCount++;
        request().finally(() => {
          this.activeCount--;
          this.process();
        });
      }
    }

    this.processing = false;
  }

  /**
   * Gets current queue statistics
   */
  getStats() {
    return {
      queueLength: this.queue.length,
      activeCount: this.activeCount,
      maxConcurrent: this.maxConcurrent,
    };
  }

  /**
   * Clears the queue
   */
  clear() {
    this.queue = [];
  }
}

export const apiRequestQueue = new RequestQueue(5);

// Memoize expensive calculations
const memoCache = new Map<string, MemoizedValue<any>>();

/**
 * Memoizes function results to avoid expensive recalculations
 *
 * @template T - The return type of the function
 * @param fn - Function to memoize
 * @param keyFn - Function to generate cache keys from arguments
 * @param ttl - Time-to-live for cached results in milliseconds (default: 5000)
 * @returns Memoized version of the function
 *
 * @example
 * ```typescript
 * const expensiveCalculation = memoize(
 *   (a: number, b: number) => a * b * Math.random(),
 *   (a, b) => `${a}-${b}`,
 *   10000
 * );
 * ```
 */
export function memoize<T>(
  fn: (...args: any[]) => T,
  keyFn: (...args: any[]) => string,
  ttl: number = defaultConfig.memoizeTTL
): (...args: any[]) => T {
  if (typeof fn !== 'function') {
    throw new Error('Function to memoize must be a function');
  }

  if (typeof keyFn !== 'function') {
    throw new Error('Key function must be a function');
  }

  if (ttl <= 0) {
    throw new Error('TTL must be positive');
  }

  return (...args: any[]): T => {
    const key = keyFn(...args);
    const now = Date.now();
    const cached = memoCache.get(key);

    if (cached && now - cached.timestamp < ttl) {
      return cached.result;
    }

    const result = fn(...args);
    memoCache.set(key, { result, timestamp: now });

    return result;
  };
}

/**
 * Clears old memoized values from the cache
 *
 * @param olderThan - Age threshold in milliseconds (default: 60000)
 * @returns Number of entries cleared
 */
export function clearMemoCache(olderThan: number = 60000): number {
  if (olderThan < 0) {
    throw new Error('olderThan must be non-negative');
  }

  const now = Date.now();
  const keysToDelete: string[] = [];

  memoCache.forEach((value, key) => {
    if (now - value.timestamp > olderThan) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => memoCache.delete(key));

  if (defaultConfig.enableLogging && keysToDelete.length > 0) {
    console.info(
      `[Performance] Cleared ${keysToDelete.length} memoized entries`
    );
  }

  return keysToDelete.length;
}

/**
 * Gets cache statistics
 */
export function getMemoCacheStats() {
  return {
    size: memoCache.size,
    entries: Array.from(memoCache.entries()).map(([key, value]) => ({
      key,
      age: Date.now() - value.timestamp,
    })),
  };
}

/**
 * Clears all memoized values
 */
export function clearAllMemoCache(): void {
  const size = memoCache.size;
  memoCache.clear();

  if (defaultConfig.enableLogging) {
    console.info(`[Performance] Cleared all ${size} memoized entries`);
  }
}

// Configuration management
export function updatePerformanceConfig(
  newConfig: Partial<PerformanceConfig>
): void {
  Object.assign(defaultConfig, newConfig);

  if (defaultConfig.enableLogging) {
    console.info('[Performance] Configuration updated:', defaultConfig);
  }
}

export function getPerformanceConfig(): PerformanceConfig {
  return { ...defaultConfig };
}

// Run cleanup periodically in browser environment
if (typeof window !== 'undefined') {
  setInterval(() => clearMemoCache(), defaultConfig.cacheCleanupInterval);

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    clearAllMemoCache();
  });
}
