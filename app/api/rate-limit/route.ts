import { type NextRequest, NextResponse } from 'next/server';
import {
  apiRateLimiter,
  searchRateLimiter,
  authRateLimiter,
} from '@/lib/utils/user-rate-limiter';
import { addSecurityHeaders } from '@/lib/middleware/security';
import { logger } from '@/lib/utils/logger';
import { AuthService } from '@/lib/auth/auth-service';

/**
 * Rate Limiting Status API
 * Provides real-time monitoring of rate limiting status
 */
export async function GET(request: NextRequest) {
  // Require authentication for monitoring access
  const user = await AuthService.getUserFromRequest(request);

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      },
      { status: 401 }
    );
  }

  // Check if user has monitoring permission
  if (!AuthService.hasPermission(user, 'admin:monitoring')) {
    return NextResponse.json(
      {
        success: false,
        error: 'Insufficient permissions',
        code: 'PERMISSION_DENIED',
        required: 'admin:monitoring',
      },
      { status: 403 }
    );
  }

  try {
    logger.info(`🔍 Fetching rate limiting status for user: ${user.id}`);

    const stats = {
      api: apiRateLimiter.getStats(),
      search: searchRateLimiter.getStats(),
      auth: authRateLimiter.getStats(),
    };

    const activeSessions = {
      api: apiRateLimiter.getActiveSessions(),
      search: searchRateLimiter.getActiveSessions(),
      auth: authRateLimiter.getActiveSessions(),
    };

    // Calculate overall health
    const totalSessions = Object.values(stats).reduce(
      (sum, stat) => sum + stat.totalSessions,
      0
    );
    const totalRequests = Object.values(stats).reduce(
      (sum, stat) => sum + stat.totalRequests,
      0
    );

    const overallHealth =
      totalSessions === 0
        ? 'idle'
        : totalRequests / totalSessions < 10
          ? 'healthy'
          : totalRequests / totalSessions < 50
            ? 'moderate'
            : 'high';

    const response = NextResponse.json({
      success: true,
      data: {
        overallHealth,
        summary: {
          totalSessions,
          totalRequests,
          averageRequestsPerSession:
            totalSessions > 0 ? totalRequests / totalSessions : 0,
        },
        stats,
        activeSessions: {
          api: activeSessions.api.length,
          search: activeSessions.search.length,
          auth: activeSessions.auth.length,
        },
        timestamp: new Date().toISOString(),
      },
    });

    return addSecurityHeaders(response);
  } catch (error: any) {
    logger.error('❌ Failed to fetch rate limiting status:', error);

    const response = NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch rate limiting status',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );

    return addSecurityHeaders(response);
  }
}

/**
 * Reset Rate Limiting API
 * Allows manual reset of rate limits (admin only)
 */
export async function POST(request: NextRequest) {
  // Require admin role for reset operations
  const user = await AuthService.getUserFromRequest(request);

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      },
      { status: 401 }
    );
  }

  if (!AuthService.hasRole(user, 'admin')) {
    return NextResponse.json(
      {
        success: false,
        error: 'Admin role required',
        code: 'ROLE_DENIED',
        required: 'admin',
        current: user.role,
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { limiter, action, key } = body;

    logger.info(
      `🔧 Rate limiting action: ${action} for limiter: ${limiter} by user: ${user.id}`
    );

    if (action === 'reset') {
      switch (limiter) {
        case 'api':
          if (key) {
            apiRateLimiter.reset(key);
          } else {
            apiRateLimiter.resetAll();
          }
          break;
        case 'search':
          if (key) {
            searchRateLimiter.reset(key);
          } else {
            searchRateLimiter.resetAll();
          }
          break;
        case 'auth':
          if (key) {
            authRateLimiter.reset(key);
          } else {
            authRateLimiter.resetAll();
          }
          break;
        case 'all':
          apiRateLimiter.resetAll();
          searchRateLimiter.resetAll();
          authRateLimiter.resetAll();
          break;
        default:
          return NextResponse.json(
            {
              success: false,
              error:
                'Invalid limiter. Supported limiters: api, search, auth, all',
            },
            { status: 400 }
          );
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Supported actions: reset',
        },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: `Rate limiting ${action} completed`,
      limiter: limiter || 'all',
      key: key || 'all',
      timestamp: new Date().toISOString(),
    });

    return addSecurityHeaders(response);
  } catch (error: any) {
    logger.error('❌ Failed to execute rate limiting action:', error);

    const response = NextResponse.json(
      {
        success: false,
        error: 'Failed to execute rate limiting action',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );

    return addSecurityHeaders(response);
  }
}
