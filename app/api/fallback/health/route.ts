import { NextResponse } from 'next/server';
import { verusClientWithFallback } from '@/lib/rpc-client-with-fallback';
import { logger } from '@/lib/utils/logger';

/**
 * Fallback API Health Check Endpoint
 * Check availability of local daemon and all fallback API sources
 * Based on VerusPay pattern from official Verus GitHub
 */
export async function GET() {
  try {
    logger.info('🏥 Checking health of all data sources...');

    const startTime = Date.now();
    const healthCheck = await verusClientWithFallback.healthCheck();
    const duration = Date.now() - startTime;

    const response = {
      success: true,
      performance: {
        duration_ms: duration,
        checked_at: new Date().toISOString(),
      },
      sources: {
        localDaemon: healthCheck.localDaemon,
        fallbackAPIs: healthCheck.fallbackAPIs,
        summary: {
          total: 1 + healthCheck.fallbackAPIs.length,
          available:
            (healthCheck.localDaemon.available ? 1 : 0) +
            healthCheck.fallbackAPIs.filter(api => api.available).length,
          unavailable:
            (!healthCheck.localDaemon.available ? 1 : 0) +
            healthCheck.fallbackAPIs.filter(api => !api.available).length,
        },
      },
      status: {
        usingFallback: verusClientWithFallback.isUsingFallback(),
        recommendation: healthCheck.recommendation,
        configuredFallbacks: verusClientWithFallback.getFallbackAPIs().length,
      },
      benefits: [
        'High availability even if local daemon fails',
        'Automatic failover to backup APIs',
        'Suitable for shared hosting environments',
        'No single point of failure',
      ],
      setup: {
        local_daemon: 'Preferred source (best security & performance)',
        fallback_apis: 'Automatic backup sources (high availability)',
        configuration: 'Set FALLBACK_API_1, FALLBACK_API_2 in .env',
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    logger.error('❌ Error checking fallback health:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check fallback API health',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Test fallback functionality
 * Force using fallback mode to test it works
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, method } = body;

    if (action === 'test_fallback') {
      // Test a specific method with fallback
      let result;

      switch (method) {
        case 'getBlock':
          // Test with a recent block hash (you might want to get this dynamically)
          result = await verusClientWithFallback.getBlock(
            '0000000000000000000000000000000000000000000000000000000000000000'
          );
          break;

        case 'getBlockchainInfo':
          result = await verusClientWithFallback.getBlockchainInfo();
          break;

        default:
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid method',
              validMethods: ['getBlock', 'getBlockchainInfo'],
            },
            { status: 400 }
          );
      }

      return NextResponse.json({
        success: true,
        message: `Tested ${method} with fallback support`,
        usingFallback: verusClientWithFallback.isUsingFallback(),
        result,
      });
    } else if (action === 'toggle_fallback') {
      const enabled =
        body.enabled ?? !verusClientWithFallback.isUsingFallback();
      verusClientWithFallback.setFallbackMode(enabled);

      return NextResponse.json({
        success: true,
        message: `Fallback mode ${enabled ? 'enabled' : 'disabled'}`,
        fallbackEnabled: enabled,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action',
          validActions: ['test_fallback', 'toggle_fallback'],
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    logger.error('❌ Error testing fallback:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to test fallback functionality',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
