'use client';

import { useEffect, useRef } from 'react';

// interface PerformanceMetrics {
//   componentName: string;
//   renderTime: number;
//   mountTime: number;
//   updateCount: number;
// }

export function usePerformanceMonitor(componentName: string) {
  const mountTimeRef = useRef<number>(Date.now());
  const updateCountRef = useRef<number>(0);
  const renderStartRef = useRef<number>(0);

  useEffect(() => {
    // Mark component mount
    const mountTime = Date.now() - mountTimeRef.current;

    // Log mount performance
    if (process.env.NODE_ENV === 'development') {
      console.info(`[Performance] ${componentName} mounted in ${mountTime}ms`);
    }

    // Set up performance observer for this component
    const observer = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        if (
          entry.entryType === 'measure' &&
          entry.name.includes(componentName)
        ) {
          console.info(`[Performance] ${entry.name}: ${entry.duration}ms`);
        }
      });
    });

    observer.observe({ entryTypes: ['measure'] });

    return () => {
      observer.disconnect();
    };
  }, [componentName]);

  const startRender = () => {
    renderStartRef.current = performance.now();
  };

  const endRender = () => {
    if (renderStartRef.current > 0) {
      const renderTime = performance.now() - renderStartRef.current;
      updateCountRef.current += 1;

      if (process.env.NODE_ENV === 'development') {
        console.info(
          `[Performance] ${componentName} render #${updateCountRef.current}: ${renderTime.toFixed(2)}ms`
        );
      }

      // Mark performance measure
      performance.mark(`${componentName}-render-${updateCountRef.current}`);
      performance.measure(
        `${componentName}-render-time`,
        `${componentName}-render-${updateCountRef.current}`,
        `${componentName}-render-${updateCountRef.current}`
      );
    }
  };

  const measureAsync = async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    const start = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - start;

      if (process.env.NODE_ENV === 'development') {
        console.info(
          `[Performance] ${componentName} ${operationName}: ${duration.toFixed(2)}ms`
        );
      }

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(
        `[Performance] ${componentName} ${operationName} failed after ${duration.toFixed(2)}ms:`,
        error
      );
      throw error;
    }
  };

  return {
    startRender,
    endRender,
    measureAsync,
    updateCount: updateCountRef.current,
  };
}

// Global performance monitoring hook
export function useGlobalPerformanceMonitor() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observer = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        if (entry.entryType === 'navigation') {
          console.info(`[Performance] Page load: ${entry.duration}ms`);
        } else if (entry.entryType === 'resource') {
          const resource = entry as PerformanceResourceTiming;
          if (resource.duration > 1000) {
            // Log slow resources
            console.warn(
              `[Performance] Slow resource: ${resource.name} (${resource.duration}ms)`
            );
          }
        }
      });
    });

    observer.observe({ entryTypes: ['navigation', 'resource'] });

    // Monitor Core Web Vitals
    if ('web-vital' in window) {
      // This would require installing web-vitals package
      // import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
    }

    return () => {
      observer.disconnect();
    };
  }, []);
}
