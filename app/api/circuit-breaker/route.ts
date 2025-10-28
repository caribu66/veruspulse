import { NextRequest, NextResponse } from 'next/server';
import { circuitBreakerManager } from '@/lib/utils/circuit-breaker';
import { addSecurityHeaders } from '@/lib/middleware/security';
import { logger } from '@/lib/utils/logger';
import { AuthService } from '@/lib/auth/auth-service';

/**
 * Circuit Breaker Status API
 * Provides real-time monitoring of circuit breaker states
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
    logger.info(`🔍 Fetching circuit breaker status for user: ${user.id}`);

    const stats = circuitBreakerManager.getAllStats();

    // Calculate overall health
    const totalBreakers = Object.keys(stats).length;
    const openBreakers = Object.values(stats).filter(
      s => s.state === 'OPEN'
    ).length;
    const halfOpenBreakers = Object.values(stats).filter(
      s => s.state === 'HALF_OPEN'
    ).length;

    const overallHealth =
      totalBreakers === 0
        ? 'unknown'
        : openBreakers === 0
          ? 'healthy'
          : halfOpenBreakers > 0
            ? 'degraded'
            : 'unhealthy';

    const response = NextResponse.json({
      success: true,
      data: {
        overallHealth,
        summary: {
          totalBreakers,
          openBreakers,
          halfOpenBreakers,
          closedBreakers: totalBreakers - openBreakers - halfOpenBreakers,
        },
        breakers: stats,
        timestamp: new Date().toISOString(),
      },
    });

    return addSecurityHeaders(response);
  } catch (error: any) {
    logger.error('❌ Failed to fetch circuit breaker status:', error);

    const response = NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch circuit breaker status',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );

    return addSecurityHeaders(response);
  }
}

/**
 * Reset Circuit Breaker API
 * Allows manual reset of circuit breakers (admin only)
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
    const { serviceName, action } = body;

    logger.info(
      `🔧 Circuit breaker action: ${action} for service: ${serviceName || 'all'} by user: ${user.id}`
    );

    if (action === 'reset') {
      if (serviceName) {
        circuitBreakerManager.reset(serviceName);
      } else {
        circuitBreakerManager.resetAll();
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
      message: `Circuit breaker ${action} completed`,
      serviceName: serviceName || 'all',
      timestamp: new Date().toISOString(),
    });

    return addSecurityHeaders(response);
  } catch (error: any) {
    logger.error('❌ Failed to execute circuit breaker action:', error);

    const response = NextResponse.json(
      {
        success: false,
        error: 'Failed to execute circuit breaker action',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );

    return addSecurityHeaders(response);
  }
}
