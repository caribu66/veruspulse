import { type NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
// import { verusAPI } from '@/lib/rpc-client-robust'; // Unused

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

export async function GET(_request: NextRequest) {
  try {
    const { searchParams } = new URL(_request.url);
    const timeRange = (searchParams.get('range') || '24h') as
      | '24h'
      | '7d'
      | '30d';
    const limit = parseInt(searchParams.get('limit') || '10');
    const type = searchParams.get('type'); // 'blocks', 'verusids', 'addresses', etc.

    const db = getDbPool();

    // If no database, fetch from RPC only (fallback)
    if (!db) {
      return NextResponse.json({
        success: true,
        data: {
          trending: [],
          usingAnalytics: false,
          message: 'Analytics not available, showing recent data',
        },
      });
    }

    // Fetch trending from analytics if available
    let trendingWithScores: any[] = [];

    if (type) {
      const scoreColumn = `score_${timeRange}`;
      const result = await db.query(
        `SELECT entity_type, entity_id, score_24h, score_7d, score_30d,
                trend_direction, trend_percentage
         FROM trending_scores
         WHERE entity_type = $1
         ORDER BY ${scoreColumn} DESC
         LIMIT $2`,
        [type, limit]
      );

      trendingWithScores = result.rows.map(row => ({
        entityType: row.entity_type,
        entityId: row.entity_id,
        score24h: parseFloat(row.score_24h) || 0,
        score7d: parseFloat(row.score_7d) || 0,
        score30d: parseFloat(row.score_30d) || 0,
        trendDirection: row.trend_direction,
        trendPercentage: parseFloat(row.trend_percentage) || 0,
      }));
    }

    // Enrich with view counts
    for (const item of trendingWithScores) {
      const viewResult = await db.query(
        'SELECT view_count FROM view_analytics WHERE entity_type = $1 AND entity_id = $2',
        [item.entityType, item.entityId]
      );

      item.viewCount = viewResult.rows[0]?.view_count || 0;
    }

    // If we have trending data, return it
    if (trendingWithScores.length > 0) {
      return NextResponse.json({
        success: true,
        data: {
          trending: trendingWithScores,
          usingAnalytics: true,
          timeRange,
        },
      });
    }

    // Fallback to recent data if no analytics
    return NextResponse.json({
      success: true,
      data: {
        trending: [],
        usingAnalytics: false,
        message: 'No trending data yet, using recent data',
      },
    });
  } catch (error: any) {
    console.error('Error fetching trending data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch trending data',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
