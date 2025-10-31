import { logger } from './logger';
import fs from 'fs';

// Application metrics
export interface AppMetrics {
  requests: number;
  errors: number;
  responseTime: number;
  memoryUsage: number;
  uptime: number;
}

export class MonitoringService {
  private static instance: MonitoringService;
  private metrics: AppMetrics = {
    requests: 0,
    errors: 0,
    responseTime: 0,
    memoryUsage: 0,
    uptime: 0,
  };
  private startTime: number = Date.now();

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  incrementRequests(): void {
    this.metrics.requests++;
  }

  incrementErrors(): void {
    this.metrics.errors++;
  }

  recordResponseTime(time: number): void {
    this.metrics.responseTime = time;
  }

  updateMemoryUsage(): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      try {
        // Get system memory information
        const memInfo = fs.readFileSync('/proc/meminfo', 'utf8');
        const memTotalMatch = memInfo.match(/MemTotal:\s+(\d+)\s+kB/);
        const memAvailableMatch = memInfo.match(/MemAvailable:\s+(\d+)\s+kB/);

        if (memTotalMatch && memAvailableMatch) {
          const systemTotalMemory = parseInt(memTotalMatch[1]) * 1024; // Convert to bytes
          const systemAvailableMemory = parseInt(memAvailableMatch[1]) * 1024; // Convert to bytes
          const systemUsedMemory = systemTotalMemory - systemAvailableMemory;
          const systemMemoryPercent =
            (systemUsedMemory / systemTotalMemory) * 100;
          this.metrics.memoryUsage = systemMemoryPercent; // Store as percentage
        } else {
          // Fallback to RSS-based calculation
          const memUsage = process.memoryUsage();
          this.metrics.memoryUsage = memUsage.rss / 1024 / 1024; // MB
        }
      } catch (error) {
        // Fallback to heap usage if system memory check fails
        const memUsage = process.memoryUsage();
        this.metrics.memoryUsage = memUsage.heapUsed / 1024 / 1024; // MB
      }
    }
  }

  getMetrics(): AppMetrics {
    this.metrics.uptime = Date.now() - this.startTime;
    this.updateMemoryUsage();
    return { ...this.metrics };
  }

  logMetrics(): void {
    const metrics = this.getMetrics();
    logger.info('Application Metrics', {
      requests: metrics.requests,
      errors: metrics.errors,
      responseTime: metrics.responseTime,
      memoryUsage: `${metrics.memoryUsage.toFixed(1)}%`,
      uptime: `${(metrics.uptime / 1000).toFixed(2)}s`,
    });
  }
}

// Health check service
export class HealthCheckService {
  private static instance: HealthCheckService;
  private checks: Map<string, () => Promise<boolean>> = new Map();

  static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  addCheck(name: string, checkFn: () => Promise<boolean>): void {
    this.checks.set(name, checkFn);
  }

  async runChecks(): Promise<{ [key: string]: boolean }> {
    const results: { [key: string]: boolean } = {};

    for (const [name, checkFn] of Array.from(this.checks.entries())) {
      try {
        results[name] = await checkFn();
      } catch (error) {
        logger.error(`Health check failed for ${name}:`, error);
        results[name] = false;
      }
    }

    return results;
  }

  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: { [key: string]: boolean };
    timestamp: number;
  }> {
    const checks = await this.runChecks();
    const allHealthy = Object.values(checks).every(Boolean);
    const someHealthy = Object.values(checks).some(Boolean);

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (allHealthy) {
      status = 'healthy';
    } else if (someHealthy) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      checks,
      timestamp: Date.now(),
    };
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private measurements: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMeasurement(label: string): void {
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark(`${label}-start`);
    }
  }

  endMeasurement(label: string): number | null {
    if (typeof window !== 'undefined' && window.performance) {
      try {
        performance.mark(`${label}-end`);
        performance.measure(label, `${label}-start`, `${label}-end`);

        const measure = performance.getEntriesByName(label)[0];
        if (!measure || measure.duration === undefined) return null;
        const duration = measure.duration;

        // Store measurement
        if (!this.measurements.has(label)) {
          this.measurements.set(label, []);
        }
        this.measurements.get(label)!.push(duration);

        // Keep only last 100 measurements
        const measurements = this.measurements.get(label)!;
        if (measurements.length > 100) {
          measurements.shift();
        }

        return duration;
      } catch (error) {
        logger.error(`Performance measurement failed for ${label}:`, error);
        return null;
      }
    }
    return null;
  }

  getAverageTime(label: string): number {
    const measurements = this.measurements.get(label) || [];
    if (measurements.length === 0) return 0;

    return (
      measurements.reduce((sum, time) => sum + time, 0) / measurements.length
    );
  }

  getMetrics(): { [key: string]: { average: number; count: number } } {
    const metrics: { [key: string]: { average: number; count: number } } = {};

    for (const [label, measurements] of Array.from(
      this.measurements.entries()
    )) {
      metrics[label] = {
        average: this.getAverageTime(label),
        count: measurements.length,
      };
    }

    return metrics;
  }
}

// Error tracking
export class ErrorTracker {
  private static instance: ErrorTracker;
  private errors: Array<{
    message: string;
    stack?: string;
    timestamp: number;
    context?: any;
  }> = [];

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  trackError(error: Error, context?: any): void {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      context,
    };

    this.errors.push(errorInfo);

    // Keep only last 100 errors
    if (this.errors.length > 100) {
      this.errors.shift();
    }

    logger.error('Error tracked:', errorInfo);
  }

  getErrors(): Array<{
    message: string;
    stack?: string;
    timestamp: number;
    context?: any;
  }> {
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
  }
}
