import * as Sentry from '@sentry/nextjs';

// Custom Sentry utilities for Verus Explorer

/**
 * Capture API errors with context
 */
export function captureAPIError(
  error: Error,
  context: {
    apiRoute: string;
    method: string;
    params?: any;
    userId?: string;
    requestId?: string;
  }
) {
  Sentry.withScope(scope => {
    scope.setTag('component', 'api');
    scope.setTag('apiRoute', context.apiRoute);
    scope.setTag('method', context.method);
    scope.setContext('apiContext', context);

    if (context.userId) {
      scope.setUser({ id: context.userId });
    }

    if (context.requestId) {
      scope.setTag('requestId', context.requestId);
    }

    Sentry.captureException(error);
  });
}

/**
 * Capture RPC errors with context
 */
export function captureRPCError(
  error: Error,
  context: {
    rpcMethod: string;
    params?: any;
    endpoint?: string;
  }
) {
  Sentry.withScope(scope => {
    scope.setTag('component', 'rpc');
    scope.setTag('rpcMethod', context.rpcMethod);
    scope.setTag('endpoint', context.endpoint || 'unknown');
    scope.setContext('rpcContext', context);

    Sentry.captureException(error);
  });
}

/**
 * Capture cache errors with context
 */
export function captureCacheError(
  error: Error,
  context: {
    cacheOperation: string;
    cacheKey: string;
    cacheType?: string;
  }
) {
  Sentry.withScope(scope => {
    scope.setTag('component', 'cache');
    scope.setTag('cacheOperation', context.cacheOperation);
    scope.setTag('cacheKey', context.cacheKey);
    scope.setTag('cacheType', context.cacheType || 'unknown');
    scope.setContext('cacheContext', context);

    Sentry.captureException(error);
  });
}

/**
 * Capture performance metrics
 */
export function capturePerformanceMetric(
  metric: string,
  value: number,
  context?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    category: 'performance',
    message: metric,
    data: {
      value,
      ...context,
    },
    level: 'info',
  });
}

/**
 * Capture user interactions
 */
export function captureUserInteraction(
  action: string,
  context?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    category: 'user',
    message: action,
    data: context,
    level: 'info',
  });
}

/**
 * Capture blockchain-specific events
 */
export function captureBlockchainEvent(
  event: string,
  data: {
    blockHeight?: number;
    blockHash?: string;
    txId?: string;
    address?: string;
    [key: string]: any;
  }
) {
  Sentry.withScope(scope => {
    scope.setTag('component', 'blockchain');
    scope.setTag('event', event);

    if (data.blockHeight)
      scope.setTag('blockHeight', data.blockHeight.toString());
    if (data.blockHash) scope.setTag('blockHash', data.blockHash);
    if (data.txId) scope.setTag('txId', data.txId);
    if (data.address) scope.setTag('address', data.address);

    scope.setContext('blockchainData', data);

    Sentry.captureMessage(`Blockchain Event: ${event}`, 'info');
  });
}

/**
 * Capture Redis/cache performance
 */
export function captureCachePerformance(
  operation: string,
  duration: number,
  hit: boolean,
  context?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    category: 'cache-performance',
    message: `${operation} - ${hit ? 'HIT' : 'MISS'}`,
    data: {
      duration,
      hit,
      ...context,
    },
    level: 'info',
  });
}

/**
 * Set user context for tracking
 */
export function setUserContext(user: {
  id?: string;
  username?: string;
  email?: string;
  address?: string;
}) {
  Sentry.setUser(user);
}

/**
 * Add custom tags for better filtering
 */
export function addCustomTags(tags: Record<string, string>) {
  Sentry.setTags(tags);
}

/**
 * Add custom context for debugging
 */
export function addCustomContext(key: string, context: any) {
  Sentry.setContext(key, context);
}

/**
 * Capture ISR (Incremental Static Regeneration) events
 */
export function captureISREvent(
  route: string,
  success: boolean,
  duration?: number,
  error?: Error
) {
  Sentry.withScope(scope => {
    scope.setTag('component', 'isr');
    scope.setTag('route', route);
    scope.setTag('success', success.toString());

    if (duration) {
      scope.setTag('duration', duration.toString());
      capturePerformanceMetric('isr-generation', duration, { route });
    }

    if (error) {
      scope.setContext('isrError', { route, duration });
      Sentry.captureException(error);
    } else {
      Sentry.captureMessage(`ISR Event: ${route}`, 'info');
    }
  });
}

/**
 * Capture API rate limiting events
 */
export function captureRateLimitEvent(
  endpoint: string,
  ip: string,
  attempts: number,
  blocked: boolean
) {
  Sentry.withScope(scope => {
    scope.setTag('component', 'rate-limit');
    scope.setTag('endpoint', endpoint);
    scope.setTag('blocked', blocked.toString());
    scope.setContext('rateLimitData', {
      ip,
      attempts,
      endpoint,
      blocked,
    });

    Sentry.captureMessage(
      `Rate Limit ${blocked ? 'BLOCKED' : 'WARNING'}: ${endpoint}`,
      blocked ? 'warning' : 'info'
    );
  });
}

/**
 * Capture system health events
 */
export function captureSystemHealth(
  component: string,
  status: 'healthy' | 'degraded' | 'unhealthy',
  metrics?: Record<string, any>
) {
  Sentry.withScope(scope => {
    scope.setTag('component', 'system-health');
    scope.setTag('healthComponent', component);
    scope.setTag('status', status);

    if (metrics) {
      scope.setContext('healthMetrics', metrics);
    }

    Sentry.captureMessage(
      `System Health: ${component} is ${status}`,
      status === 'unhealthy' ? 'error' : 'info'
    );
  });
}
