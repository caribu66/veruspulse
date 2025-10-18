import { capturePerformanceMetric, captureCachePerformance } from './sentry';

// Performance monitoring utilities for Verus Explorer

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private enabled: boolean;

  constructor() {
    this.enabled =
      process.env.NODE_ENV === 'production' ||
      process.env.ENABLE_PERFORMANCE_MONITORING === 'true';
  }

  /**
   * Start timing a performance metric
   */
  start(name: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;

    const startTime = performance.now();
    this.metrics.set(name, {
      name,
      startTime,
      metadata,
    });
  }

  /**
   * End timing and record the metric
   */
  end(name: string, additionalMetadata?: Record<string, any>): number | null {
    if (!this.enabled) return null;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric '${name}' was not started`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;

    // Send to Sentry
    capturePerformanceMetric(name, duration, {
      ...metric.metadata,
      ...additionalMetadata,
    });

    // Clean up
    this.metrics.delete(name);

    return duration;
  }

  /**
   * Time an async function
   */
  async timeAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(name, metadata);
    try {
      const result = await fn();
      this.end(name, { success: true });
      return result;
    } catch (error) {
      this.end(name, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Time a synchronous function
   */
  time<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    this.start(name, metadata);
    try {
      const result = fn();
      this.end(name, { success: true });
      return result;
    } catch (error) {
      this.end(name, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

// Global performance monitor instance
export const perfMonitor = new PerformanceMonitor();

// Convenience functions
export function startPerformanceTiming(
  name: string,
  metadata?: Record<string, any>
): void {
  perfMonitor.start(name, metadata);
}

export function endPerformanceTiming(
  name: string,
  additionalMetadata?: Record<string, any>
): number | null {
  return perfMonitor.end(name, additionalMetadata);
}

export async function timeAsyncFunction<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  return perfMonitor.timeAsync(name, fn, metadata);
}

export function timeFunction<T>(
  name: string,
  fn: () => T,
  metadata?: Record<string, any>
): T {
  return perfMonitor.time(name, fn, metadata);
}

// Cache performance monitoring
export function monitorCacheOperation<T>(
  operation: string,
  cacheKey: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();

  return fn().then(
    result => {
      const duration = performance.now() - startTime;
      captureCachePerformance(operation, duration, true, { cacheKey });
      return result;
    },
    error => {
      const duration = performance.now() - startTime;
      captureCachePerformance(operation, duration, false, {
        cacheKey,
        error: error.message,
      });
      throw error;
    }
  );
}

// API response time monitoring
export function monitorAPIResponse(
  endpoint: string,
  method: string,
  statusCode: number,
  duration: number,
  metadata?: Record<string, any>
): void {
  capturePerformanceMetric('api-response', duration, {
    endpoint,
    method,
    statusCode,
    ...metadata,
  });
}

// RPC call monitoring
export function monitorRPCCall(
  method: string,
  duration: number,
  success: boolean,
  metadata?: Record<string, any>
): void {
  capturePerformanceMetric('rpc-call', duration, {
    method,
    success,
    ...metadata,
  });
}

// Database query monitoring
export function monitorDatabaseQuery(
  query: string,
  duration: number,
  success: boolean,
  rowCount?: number,
  metadata?: Record<string, any>
): void {
  capturePerformanceMetric('database-query', duration, {
    query: query.substring(0, 100), // Truncate long queries
    success,
    rowCount,
    ...metadata,
  });
}

// Memory usage monitoring
export function monitorMemoryUsage(): void {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const memoryUsage = process.memoryUsage();

    capturePerformanceMetric('memory-usage-rss', memoryUsage.rss);
    capturePerformanceMetric('memory-usage-heapUsed', memoryUsage.heapUsed);
    capturePerformanceMetric('memory-usage-heapTotal', memoryUsage.heapTotal);
    capturePerformanceMetric('memory-usage-external', memoryUsage.external);
  }
}

// CPU usage monitoring (approximate)
export function monitorCPUUsage(): void {
  const startUsage = process.cpuUsage();

  setTimeout(() => {
    const endUsage = process.cpuUsage(startUsage);
    const userTime = endUsage.user / 1000000; // Convert to seconds
    const systemTime = endUsage.system / 1000000; // Convert to seconds

    capturePerformanceMetric('cpu-usage-user', userTime);
    capturePerformanceMetric('cpu-usage-system', systemTime);
  }, 1000);
}

// Network latency monitoring
export function monitorNetworkLatency(
  endpoint: string,
  latency: number,
  success: boolean,
  metadata?: Record<string, any>
): void {
  capturePerformanceMetric('network-latency', latency, {
    endpoint,
    success,
    ...metadata,
  });
}

// ISR (Incremental Static Regeneration) monitoring
export function monitorISRGeneration(
  route: string,
  duration: number,
  success: boolean,
  cacheHit: boolean,
  metadata?: Record<string, any>
): void {
  capturePerformanceMetric('isr-generation', duration, {
    route,
    success,
    cacheHit,
    ...metadata,
  });
}

// Export the performance monitor for advanced usage
export { PerformanceMonitor };
