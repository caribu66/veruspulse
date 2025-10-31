import { NextResponse } from 'next/server';
import { checkSystemHealth } from '@/lib/monitoring/health-check';
// import { captureAPIError } from '@/lib/monitoring/sentry';
import { logger } from '@/lib/utils/logger';

// Health check API endpoint
export async function GET() {
  try {
    logger.info('🔍 Running system health check');

    const healthData = await checkSystemHealth();

    // Always return 200; expose health via headers to avoid UI errors on polling
    return NextResponse.json(
      {
        success: true,
        data: healthData,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Health-Status': healthData.overall,
        },
      }
    );
  } catch (error) {
    logger.error('❌ Health check failed:', error);

    // captureAPIError(
    //   error instanceof Error ? error : new Error('Health check failed'),
    //   {
    //     apiRoute: 'health',
    //     method: 'GET',
    //   }
    // );

    return NextResponse.json(
      {
        success: false,
        error: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        data: {
          overall: 'unhealthy',
          components: [],
          timestamp: new Date().toISOString(),
          uptime: 0,
        },
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Health-Status': 'unhealthy',
        },
      }
    );
  }
}
