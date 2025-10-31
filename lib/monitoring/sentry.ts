// Sentry monitoring stub
// TODO: Implement actual Sentry integration

export function capturePerformanceMetric(
  name: string,
  duration?: number,
  metadata?: Record<string, any>
): void {
  // Stub implementation - can be replaced with actual Sentry integration
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${name}:`, { duration, ...metadata });
  }
}

export function captureCachePerformance(
  operation: string,
  duration: number,
  success: boolean,
  metadata?: Record<string, any>
): void {
  // Stub implementation - can be replaced with actual Sentry integration
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Cache] ${operation}:`, { duration, success, ...metadata });
  }
}

export function captureSystemHealth(data: any): void {
  // Stub implementation - can be replaced with actual Sentry integration
  if (process.env.NODE_ENV === 'development') {
    console.log('[System Health]:', data);
  }
}

export function captureAPIError(error: any, context?: any): void {
  // Stub implementation - can be replaced with actual Sentry integration
  console.error('[API Error]:', error, context);
}
