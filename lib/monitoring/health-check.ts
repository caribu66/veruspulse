import { captureSystemHealth, captureAPIError } from './sentry';
import { CachedRPCClient } from '@/lib/cache/cached-rpc-client';
import { CacheManager } from '@/lib/cache/cache-utils';
import { redis } from '@/lib/cache/redis';
import fs from 'fs';

// Health check utilities for Verus Explorer

interface HealthStatus {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  metrics?: Record<string, any>;
  lastChecked: string;
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: HealthStatus[];
  timestamp: string;
  uptime: number;
}

class HealthMonitor {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Check Redis health
   */
  async checkRedisHealth(): Promise<HealthStatus> {
    try {
      const startTime = Date.now();

      // Test basic Redis operations
      await redis.ping();
      await redis.setex('health:test', 5, 'ok');
      const testValue = await redis.get('health:test');
      await redis.del('health:test');

      const duration = Date.now() - startTime;

      if (testValue !== 'ok') {
        throw new Error('Redis test value mismatch');
      }

      // Get Redis stats
      const stats = await CacheManager.getStats();

      const status: HealthStatus = {
        component: 'redis',
        status:
          duration < 100
            ? 'healthy'
            : duration < 500
              ? 'degraded'
              : 'unhealthy',
        message: `Redis is responding (${duration}ms)`,
        metrics: {
          duration,
          totalKeys: stats.totalKeys,
          memoryUsage: stats.memoryUsage,
          connectedClients: stats.connectedClients,
          uptime: stats.uptime,
        },
        lastChecked: new Date().toISOString(),
      };

      // Report to Sentry
      captureSystemHealth({
        component: 'redis',
        status: status.status,
        ...status.metrics,
      });

      return status;
    } catch (error) {
      const status: HealthStatus = {
        component: 'redis',
        status: 'unhealthy',
        message: `Redis error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date().toISOString(),
      };

      captureAPIError(
        error instanceof Error ? error : new Error('Redis health check failed'),
        {
          apiRoute: 'health-check',
          method: 'GET',
          params: { component: 'redis' },
        }
      );

      return status;
    }
  }

  /**
   * Check Verus RPC health
   */
  async checkRPCHealth(): Promise<HealthStatus> {
    try {
      const startTime = Date.now();

      // Test basic RPC calls
      const blockchainInfo = await CachedRPCClient.getBlockchainInfo();
      const networkInfo = await CachedRPCClient.getNetworkInfo();

      const duration = Date.now() - startTime;

      if (!blockchainInfo || !networkInfo) {
        throw new Error('RPC returned null data');
      }

      const status: HealthStatus = {
        component: 'rpc',
        status:
          duration < 1000
            ? 'healthy'
            : duration < 5000
              ? 'degraded'
              : 'unhealthy',
        message: `RPC is responding (${duration}ms)`,
        metrics: {
          duration,
          blocks: blockchainInfo.blocks || 0,
          connections: networkInfo.connections || 0,
          chain: blockchainInfo.chain || 'unknown',
          syncProgress: (blockchainInfo.verificationprogress || 0) * 100,
        },
        lastChecked: new Date().toISOString(),
      };

      captureSystemHealth({
        component: 'rpc',
        status: status.status,
        ...status.metrics,
      });

      return status;
    } catch (error) {
      const status: HealthStatus = {
        component: 'rpc',
        status: 'unhealthy',
        message: `RPC error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date().toISOString(),
      };

      captureAPIError(
        error instanceof Error ? error : new Error('RPC health check failed'),
        {
          apiRoute: 'health-check',
          method: 'GET',
          params: { component: 'rpc' },
        }
      );

      return status;
    }
  }

  /**
   * Check cache health
   */
  async checkCacheHealth(): Promise<HealthStatus> {
    try {
      const startTime = Date.now();

      // Test cache operations
      const testKey = 'health:cache:test';
      const testData = { test: 'data', timestamp: Date.now() };

      await CacheManager.set(testKey, testData, 10);
      const retrievedData = await CacheManager.get(testKey);
      await CacheManager.delete(testKey);

      const duration = Date.now() - startTime;

      if (!retrievedData || (retrievedData as any).test !== 'data') {
        throw new Error('Cache test data mismatch');
      }

      const stats = await CacheManager.getStats();

      const status: HealthStatus = {
        component: 'cache',
        status:
          duration < 50 ? 'healthy' : duration < 200 ? 'degraded' : 'unhealthy',
        message: `Cache is working (${duration}ms)`,
        metrics: {
          duration,
          totalKeys: stats.totalKeys,
          memoryUsage: stats.memoryUsage,
          hitRate: 'unknown', // Would need to track this separately
        },
        lastChecked: new Date().toISOString(),
      };

      captureSystemHealth({
        component: 'cache',
        status: status.status,
        ...status.metrics,
      });

      return status;
    } catch (error) {
      const status: HealthStatus = {
        component: 'cache',
        status: 'unhealthy',
        message: `Cache error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date().toISOString(),
      };

      captureAPIError(
        error instanceof Error ? error : new Error('Cache health check failed'),
        {
          apiRoute: 'health-check',
          method: 'GET',
          params: { component: 'cache' },
        }
      );

      return status;
    }
  }

  /**
   * Check system memory health
   */
  async checkMemoryHealth(): Promise<HealthStatus> {
    try {
      const memoryUsage = process.memoryUsage();

      // Get system memory information
      const memInfo = fs.readFileSync('/proc/meminfo', 'utf8');
      const memTotalMatch = memInfo.match(/MemTotal:\s+(\d+)\s+kB/);
      const memAvailableMatch = memInfo.match(/MemAvailable:\s+(\d+)\s+kB/);

      let systemMemoryPercent = 0;
      let systemTotalMemory = 0;
      let systemUsedMemory = 0;

      if (
        memTotalMatch &&
        memAvailableMatch &&
        memTotalMatch[1] &&
        memAvailableMatch[1]
      ) {
        systemTotalMemory = parseInt(memTotalMatch[1]) * 1024; // Convert to bytes
        const systemAvailableMemory = parseInt(memAvailableMatch[1]) * 1024; // Convert to bytes
        systemUsedMemory = systemTotalMemory - systemAvailableMemory;
        systemMemoryPercent = (systemUsedMemory / systemTotalMemory) * 100;
      } else {
        // Fallback to RSS-based calculation if /proc/meminfo is not available
        systemTotalMemory = memoryUsage.rss * 10; // Rough estimate
        systemUsedMemory = memoryUsage.rss;
        systemMemoryPercent = (systemUsedMemory / systemTotalMemory) * 100;
      }

      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (systemMemoryPercent < 70) {
        status = 'healthy';
      } else if (systemMemoryPercent < 90) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      const healthStatus: HealthStatus = {
        component: 'memory',
        status,
        message: `System memory usage: ${systemMemoryPercent.toFixed(1)}%`,
        metrics: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          rss: memoryUsage.rss,
          external: memoryUsage.external,
          usagePercent: systemMemoryPercent,
          systemTotalMemory,
          systemUsedMemory,
        },
        lastChecked: new Date().toISOString(),
      };

      captureSystemHealth({
        component: 'memory',
        status,
        ...healthStatus.metrics,
      });

      return healthStatus;
    } catch (error) {
      return {
        component: 'memory',
        status: 'unhealthy',
        message: `Memory check error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Run comprehensive health check
   */
  async runHealthCheck(): Promise<SystemHealth> {
    const startTime = Date.now();

    // Run all health checks in parallel
    const [redisHealth, rpcHealth, cacheHealth, memoryHealth] =
      await Promise.allSettled([
        this.checkRedisHealth(),
        this.checkRPCHealth(),
        this.checkCacheHealth(),
        this.checkMemoryHealth(),
      ]);

    const components: HealthStatus[] = [];

    // Process results
    if (redisHealth.status === 'fulfilled') {
      components.push(redisHealth.value);
    } else {
      components.push({
        component: 'redis',
        status: 'unhealthy',
        message: `Redis check failed: ${redisHealth.reason}`,
        lastChecked: new Date().toISOString(),
      });
    }

    if (rpcHealth.status === 'fulfilled') {
      components.push(rpcHealth.value);
    } else {
      components.push({
        component: 'rpc',
        status: 'unhealthy',
        message: `RPC check failed: ${rpcHealth.reason}`,
        lastChecked: new Date().toISOString(),
      });
    }

    if (cacheHealth.status === 'fulfilled') {
      components.push(cacheHealth.value);
    } else {
      components.push({
        component: 'cache',
        status: 'unhealthy',
        message: `Cache check failed: ${cacheHealth.reason}`,
        lastChecked: new Date().toISOString(),
      });
    }

    if (memoryHealth.status === 'fulfilled') {
      components.push(memoryHealth.value);
    } else {
      components.push({
        component: 'memory',
        status: 'unhealthy',
        message: `Memory check failed: ${memoryHealth.reason}`,
        lastChecked: new Date().toISOString(),
      });
    }

    // Determine overall health
    const unhealthyCount = components.filter(
      c => c.status === 'unhealthy'
    ).length;
    const degradedCount = components.filter(
      c => c.status === 'degraded'
    ).length;

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount > 0) {
      overall = 'unhealthy';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    const systemHealth: SystemHealth = {
      overall,
      components,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
    };

    // Report overall health to Sentry
    captureSystemHealth({
      component: 'system',
      overall,
      unhealthyCount,
      degradedCount,
      totalComponents: components.length,
      checkDuration: Date.now() - startTime,
    });

    return systemHealth;
  }
}

// Global health monitor instance
export const healthMonitor = new HealthMonitor();

// Convenience functions
export async function checkSystemHealth(): Promise<SystemHealth> {
  return healthMonitor.runHealthCheck();
}

export async function checkRedisHealth(): Promise<HealthStatus> {
  return healthMonitor.checkRedisHealth();
}

export async function checkRPCHealth(): Promise<HealthStatus> {
  return healthMonitor.checkRPCHealth();
}

export async function checkCacheHealth(): Promise<HealthStatus> {
  return healthMonitor.checkCacheHealth();
}

export async function checkMemoryHealth(): Promise<HealthStatus> {
  return healthMonitor.checkMemoryHealth();
}
