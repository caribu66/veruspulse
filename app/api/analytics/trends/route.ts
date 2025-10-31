import { type NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

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

export async function GET(request: NextRequest) {
  try {
    const dbEnabled = process.env.UTXO_DATABASE_ENABLED === 'true';
    if (!dbEnabled || !process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          success: false,
          error: 'UTXO database not enabled',
        },
        { status: 503 }
      );
    }

    const db = getDbPool();
    if (!db) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection failed',
        },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sort') || 'trend'; // trend, views, rewards, stakes

    // Build query based on sort parameter
    let orderByColumn = 'overall_trend_score';
    switch (sortBy) {
      case 'views':
        orderByColumn = 'recent_views_7d';
        break;
      case 'rewards':
        orderByColumn = 'recent_rewards_7d';
        break;
      case 'stakes':
        orderByColumn = 'recent_stakes_7d';
        break;
      case 'trend':
      default:
        orderByColumn = 'overall_trend_score';
    }

    const query = `
      SELECT
        tm.verusid_address,
        tm.recent_stakes_7d,
        tm.recent_rewards_7d,
        tm.recent_views_7d,
        tm.baseline_stakes_7d,
        tm.baseline_rewards_7d,
        tm.baseline_views_7d,
        tm.stake_trend_percent,
        tm.reward_trend_percent,
        tm.view_trend_percent,
        tm.overall_trend_score,
        tm.last_calculated,
        -- Get additional metrics from verusid_statistics
        vs.friendly_name,
        vs.total_stakes,
        vs.total_rewards_satoshis,
        vs.apy_all_time,
        vs.apy_30d,
        vs.staking_efficiency,
        vs.network_rank
      FROM verusid_trend_metrics tm
      LEFT JOIN verusid_statistics vs ON tm.verusid_address = vs.address
      WHERE tm.last_calculated >= NOW() - INTERVAL '1 hour'
      ORDER BY tm.${orderByColumn} DESC NULLS LAST
      LIMIT $1
    `;

    const result = await db.query(query, [limit]);

    const trends = result.rows.map((row, index) => ({
      rank: index + 1,
      address: row.verusid_address,
      friendlyName: row.friendly_name,
      // Recent activity
      recentStakes: row.recent_stakes_7d,
      recentRewards: row.recent_rewards_7d,
      recentViews: row.recent_views_7d,
      // Baseline activity
      baselineStakes: row.baseline_stakes_7d,
      baselineRewards: row.baseline_rewards_7d,
      baselineViews: row.baseline_views_7d,
      // Trend percentages
      stakeTrend: parseFloat(row.stake_trend_percent) || 0,
      rewardTrend: parseFloat(row.reward_trend_percent) || 0,
      viewTrend: parseFloat(row.view_trend_percent) || 0,
      overallTrend: parseFloat(row.overall_trend_score) || 0,
      // Additional metrics
      totalStakes: row.total_stakes || 0,
      totalRewardsVRSC:
        (parseFloat(row.total_rewards_satoshis) || 0) / 100000000,
      apyAllTime: parseFloat(row.apy_all_time) || 0,
      apy30d: parseFloat(row.apy_30d) || 0,
      stakingEfficiency: parseFloat(row.staking_efficiency) || 0,
      networkRank: row.network_rank,
      lastCalculated: row.last_calculated,
    }));

    return NextResponse.json({
      success: true,
      data: {
        trends,
        metadata: {
          total: trends.length,
          limit,
          sortBy,
          lastUpdated: new Date().toISOString(),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching trend data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch trend data',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const dbEnabled = process.env.UTXO_DATABASE_ENABLED === 'true';
    if (!dbEnabled || !process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          success: false,
          error: 'UTXO database not enabled',
        },
        { status: 503 }
      );
    }

    const db = getDbPool();
    if (!db) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection failed',
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { verusidAddress } = body;

    if (!verusidAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'VerusID address is required',
        },
        { status: 400 }
      );
    }

    // Calculate trends for specific VerusID
    await db.query('SELECT calculate_verusid_trends($1)', [verusidAddress]);

    return NextResponse.json({
      success: true,
      message: 'Trend calculation completed',
    });
  } catch (error: any) {
    console.error('Error calculating trends:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate trends',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
