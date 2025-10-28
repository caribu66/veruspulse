import { NextRequest, NextResponse } from 'next/server';
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
    // Check if UTXO database is enabled
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const sortBy = searchParams.get('sort') || 'rewards'; // rewards, apy, efficiency, stakes
    const limit = parseInt(searchParams.get('limit') || '100');
    const period = searchParams.get('period') || 'all'; // all, 30d, 90d
    const minStakes = parseInt(searchParams.get('minStakes') || '0');

    // Build query based on parameters
    let orderByColumn = 'total_rewards_satoshis';
    switch (sortBy) {
      case 'apy':
        orderByColumn = 'apy_all_time';
        break;
      case 'efficiency':
        orderByColumn = 'staking_efficiency';
        break;
      case 'stakes':
        orderByColumn = 'total_stakes';
        break;
    }

    const query = `
      SELECT 
        vs.address,
        COALESCE(i.friendly_name, i.base_name || '.VRSC@', vs.address) as friendly_name,
        vs.total_stakes,
        vs.total_rewards_satoshis,
        vs.apy_all_time,
        vs.apy_30d,
        vs.staking_efficiency,
        -- Get actual last stake time from staking_rewards table (more reliable than cached value)
        sr_latest.last_stake_time,
        vs.network_rank,
        vs.network_percentile,
        vs.eligible_utxos,
        vs.current_utxos,
        -- Trend metrics
        tm.recent_stakes_7d,
        tm.recent_rewards_7d,
        tm.recent_views_7d,
        tm.stake_trend_percent,
        tm.reward_trend_percent,
        tm.view_trend_percent,
        tm.overall_trend_score,
        tm.last_calculated as trend_last_calculated,
        -- View data
        COALESCE(dv.total_views, 0) as total_views_7d
      FROM verusid_statistics vs
      LEFT JOIN identities i ON vs.address = i.identity_address
      LEFT JOIN verusid_trend_metrics tm ON vs.address = tm.verusid_address
      -- Get actual latest stake time from staking_rewards table
      LEFT JOIN (
        SELECT 
          identity_address,
          MAX(block_time) as last_stake_time
        FROM staking_rewards
        GROUP BY identity_address
      ) sr_latest ON vs.address = sr_latest.identity_address
      LEFT JOIN (
        SELECT 
          verusid_address,
          SUM(total_views) as total_views
        FROM verusid_daily_views
        WHERE view_date >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY verusid_address
      ) dv ON vs.address = dv.verusid_address
      WHERE vs.total_stakes >= $1
        -- Filter for active stakers: must have staked in last 30 days
        AND sr_latest.last_stake_time IS NOT NULL
        AND sr_latest.last_stake_time >= NOW() - INTERVAL '30 days'
      ORDER BY vs.${orderByColumn} DESC NULLS LAST
      LIMIT $2
    `;

    const result = await db.query(query, [minStakes, limit]);

    const leaderboard = result.rows.map((row, index) => ({
      rank: index + 1,
      address: row.address,
      friendlyName: row.friendly_name,
      displayName: row.friendly_name || row.address,
      totalStakes: row.total_stakes,
      totalRewardsVRSC:
        (parseFloat(row.total_rewards_satoshis) || 0) / 100000000,
      apyAllTime: parseFloat(row.apy_all_time) || 0,
      apy30d: parseFloat(row.apy_30d) || 0,
      stakingEfficiency: parseFloat(row.staking_efficiency) || 0,
      lastStake: row.last_stake_time,
      networkRank: row.network_rank,
      networkPercentile: parseFloat(row.network_percentile) || 0,
      eligibleUtxos: row.eligible_utxos,
      totalUtxos: row.current_utxos,
      // Trend data
      recentStakes7d: row.recent_stakes_7d || 0,
      recentRewards7d: row.recent_rewards_7d || 0,
      recentViews7d: row.total_views_7d || 0,
      stakeTrendPercent: parseFloat(row.stake_trend_percent) || 0,
      rewardTrendPercent: parseFloat(row.reward_trend_percent) || 0,
      viewTrendPercent: parseFloat(row.view_trend_percent) || 0,
      overallTrendScore: parseFloat(row.overall_trend_score) || 0,
      trendLastCalculated: row.trend_last_calculated,
    }));

    // Get total count for pagination (only active stakers)
    const countResult = await db.query(
      `SELECT COUNT(*) as total 
       FROM verusid_statistics vs
       LEFT JOIN (
         SELECT identity_address, MAX(block_time) as last_stake_time
         FROM staking_rewards
         GROUP BY identity_address
       ) sr_latest ON vs.address = sr_latest.identity_address
       WHERE vs.total_stakes >= $1 
         AND sr_latest.last_stake_time IS NOT NULL
         AND sr_latest.last_stake_time >= NOW() - INTERVAL '30 days'`,
      [minStakes]
    );
    const total = parseInt(countResult.rows[0]?.total) || 0;

    return NextResponse.json({
      success: true,
      data: {
        leaderboard,
        metadata: {
          total,
          limit,
          sortBy,
          period,
          minStakes,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch leaderboard',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
