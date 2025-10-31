import { type NextRequest, NextResponse } from 'next/server';
import { enhancedLogger } from '@/lib/utils/enhanced-logger';

type RouteHandler = (
  request: NextRequest,
  context?: any
) => Promise<NextResponse>;

export function withEnhancedLogging(handler: RouteHandler) {
  return async (request: NextRequest, context?: any) => {
    const startTime = Date.now();
    const method = request.method;
    const url = request.url;
    const endpoint = new URL(url).pathname;

    // Extract address from URL if present
    const addressMatch = endpoint.match(/\/api\/address\/([^\/]+)/);
    const address = addressMatch ? addressMatch[1] : undefined;

    enhancedLogger.startTimer(`${method}-${endpoint}-${startTime}`);

    try {
      // Log the incoming request
      enhancedLogger.request(method, endpoint, undefined, undefined, {
        userAgent: request.headers.get('user-agent'),
        address: address ? address.substring(0, 8) + '...' : undefined,
      });

      const response = await handler(request, context);

      const duration = enhancedLogger.endTimer(
        `${method}-${endpoint}-${startTime}`
      );
      const status = response?.status || 200;

      // Log the response
      enhancedLogger.apiCall(method, endpoint, status, duration);

      return response;
    } catch (error) {
      const duration = enhancedLogger.endTimer(
        `${method}-${endpoint}-${startTime}`
      );

      // Log the error
      enhancedLogger.error(
        'API',
        `Request failed: ${method} ${endpoint}`,
        error as Error,
        { duration }
      );

      throw error;
    }
  };
}

// Middleware to log all requests
export function requestLoggingMiddleware(request: NextRequest) {
  const method = request.method;
  const url = request.url;
  const endpoint = new URL(url).pathname;

  // Only log API requests
  if (endpoint.startsWith('/api/')) {
    enhancedLogger.info('REQUEST', `Incoming ${method} request`, { endpoint });
  }

  return NextResponse.next();
}
