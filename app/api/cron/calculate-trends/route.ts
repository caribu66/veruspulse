import { Pool } from 'pg';
import { TrendCalculationService } from '@/lib/services/trend-calculation-service';

let dbPool: Pool | null = null;

function getDbPool() {
  if (!dbPool && process.env.DATABASE_URL) {
    dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return dbPool;
}

export async function POST(_request: Request) {
  try {
    const dbEnabled = process.env.UTXO_DATABASE_ENABLED === 'true';
    if (!dbEnabled || !process.env.DATABASE_URL) {
      return Response.json(
        {
          success: false,
          error: 'UTXO database not enabled',
        },
        { status: 503 }
      );
    }

    const db = getDbPool();
    if (!db) {
      return Response.json(
        {
          success: false,
          error: 'Database connection failed',
        },
        { status: 500 }
      );
    }

    const trendService = new TrendCalculationService(db);

    // Calculate trends for all VerusIDs
    await trendService.calculateAllTrends();

    // Update stale trends
    await trendService.updateStaleTrends();

    return Response.json({
      success: true,
      message: 'Trend calculation completed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in trend calculation cron:', error);
    return Response.json(
      {
        success: false,
        error: 'Failed to calculate trends',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to manually trigger trend calculation
export async function GET() {
  try {
    const dbEnabled = process.env.UTXO_DATABASE_ENABLED === 'true';
    if (!dbEnabled || !process.env.DATABASE_URL) {
      return Response.json(
        {
          success: false,
          error: 'UTXO database not enabled',
        },
        { status: 503 }
      );
    }

    const db = getDbPool();
    if (!db) {
      return Response.json(
        {
          success: false,
          error: 'Database connection failed',
        },
        { status: 500 }
      );
    }

    const trendService = new TrendCalculationService(db);

    // Get current trending data
    const trendingData = await trendService.getTrendingVerusIDs(10);
    const performanceMetrics = await trendService.getPerformanceMetrics();

    return Response.json({
      success: true,
      data: {
        trending: trendingData,
        performanceMetrics,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error fetching trend data:', error);
    return Response.json(
      {
        success: false,
        error: 'Failed to fetch trend data',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
