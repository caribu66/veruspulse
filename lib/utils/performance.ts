// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTiming(label: string): void {
    if (typeof window !== 'undefined' && window.performance) {
      this.metrics.set(label, performance.now());
    }
  }

  endTiming(label: string): number | null {
    if (typeof window !== 'undefined' && window.performance) {
      const startTime = this.metrics.get(label);
      if (startTime) {
        const duration = performance.now() - startTime;
        this.metrics.delete(label);
        return duration;
      }
    }
    return null;
  }

  measureWebVitals(): void {
    if (typeof window === 'undefined') return;

    // Measure Core Web Vitals
    this.measureLCP();
    this.measureFID();
    this.measureCLS();
  }

  private measureLCP(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log('LCP:', lastEntry.startTime);
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    }
  }

  private measureFID(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          console.log('FID:', (entry as any).processingStart - entry.startTime);
        });
      });
      observer.observe({ entryTypes: ['first-input'] });
    }
  }

  private measureCLS(): void {
    if ('PerformanceObserver' in window) {
      let clsValue = 0;
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        console.log('CLS:', clsValue);
      });
      observer.observe({ entryTypes: ['layout-shift'] });
    }
  }
}

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const monitor = PerformanceMonitor.getInstance();

  const startTiming = (label: string) => monitor.startTiming(label);
  const endTiming = (label: string) => monitor.endTiming(label);

  return { startTiming, endTiming };
}

// API response time monitoring
export function monitorApiCall<T>(
  apiCall: () => Promise<T>,
  endpoint: string
): Promise<T> {
  const monitor = PerformanceMonitor.getInstance();
  const label = `api-${endpoint}`;

  monitor.startTiming(label);

  return apiCall().finally(() => {
    const duration = monitor.endTiming(label);
    if (duration !== null) {
      console.log(`API ${endpoint} took ${duration.toFixed(2)}ms`);
    }
  });
}
