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
      return NextResponse.json({
        success: false,
        error: 'UTXO database not enabled',
      }, { status: 503 });
    }

    const db = getDbPool();
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
      }, { status: 500 });
    }

    // Get comprehensive VerusID statistics
    const statsQuery = `
      WITH identity_stats AS (
        SELECT
          COUNT(*) as total_identities,
          COUNT(CASE WHEN last_refreshed_at > NOW() - INTERVAL '7 days' THEN 1 END) as active_7d,
          COUNT(CASE WHEN last_refreshed_at > NOW() - INTERVAL '30 days' THEN 1 END) as active_30d,
          COUNT(CASE WHEN first_seen_block IS NOT NULL THEN 1 END) as with_blocks
        FROM identities
      ),
      staking_stats AS (
        SELECT
          COUNT(*) as total_stakers,
          COUNT(CASE WHEN total_stakes > 0 THEN 1 END) as active_stakers,
          SUM(total_stakes) as total_stakes_all,
          SUM(total_rewards_satoshis) as total_rewards_all,
          AVG(apy_all_time) as avg_apy,
          MAX(apy_all_time) as max_apy,
          COUNT(CASE WHEN last_stake_time > NOW() - INTERVAL '24 hours' THEN 1 END) as staked_24h,
          COUNT(CASE WHEN last_stake_time > NOW() - INTERVAL '7 days' THEN 1 END) as staked_7d
        FROM verusid_statistics
      ),
      recent_activity AS (
        SELECT
          COUNT(DISTINCT identity_address) as new_identities_7d
        FROM identities
        WHERE last_refreshed_at > NOW() - INTERVAL '7 days'
      ),
      top_stakers AS (
        SELECT
          json_agg(
            json_build_object(
              'address', s.address,
              'friendlyName', s.friendly_name,
              'totalStakes', s.total_stakes,
              'totalRewardsVRSC', s.total_rewards_satoshis / 100000000.0,
              'networkRank', s.network_rank
            ) ORDER BY s.total_stakes DESC
          ) FILTER (WHERE s.total_stakes > 0) as top_5
        FROM verusid_statistics s
        LIMIT 5
      ),
      recent_stakers AS (
        SELECT
          json_agg(
            json_build_object(
              'address', s.address,
              'friendlyName', s.friendly_name,
              'lastStake', s.last_stake_time,
              'totalStakes', s.total_stakes
            ) ORDER BY s.last_stake_time DESC
          ) FILTER (WHERE s.last_stake_time IS NOT NULL) as recent_5
        FROM verusid_statistics s
        LIMIT 5
      )
      SELECT 
        i.*,
        s.*,
        r.new_identities_7d,
        t.top_5,
        rs.recent_5
      FROM identity_stats i
      CROSS JOIN staking_stats s
      CROSS JOIN recent_activity r
      CROSS JOIN top_stakers t
      CROSS JOIN recent_stakers rs
    `;

    const result = await db.query(statsQuery);
    const stats = result.rows[0];

    // Get distribution stats
    const distributionQuery = `
      SELECT
        COUNT(*) FILTER (WHERE total_stakes = 0) as no_stakes,
        COUNT(*) FILTER (WHERE total_stakes BETWEEN 1 AND 10) as stakes_1_10,
        COUNT(*) FILTER (WHERE total_stakes BETWEEN 11 AND 100) as stakes_11_100,
        COUNT(*) FILTER (WHERE total_stakes BETWEEN 101 AND 1000) as stakes_101_1000,
        COUNT(*) FILTER (WHERE total_stakes > 1000) as stakes_1000_plus
      FROM verusid_statistics
    `;
    const distResult = await db.query(distributionQuery);
    const distribution = distResult.rows[0];

    // Format response
    const response = {
      totalIdentities: parseInt(stats.total_identities) || 0,
      activeIdentities: {
        last7Days: parseInt(stats.active_7d) || 0,
        last30Days: parseInt(stats.active_30d) || 0,
        newIdentities7d: parseInt(stats.new_identities_7d) || 0,
      },
      staking: {
        totalStakers: parseInt(stats.total_stakers) || 0,
        activeStakers: parseInt(stats.active_stakers) || 0,
        totalStakes: parseInt(stats.total_stakes_all) || 0,
        totalRewardsVRSC: stats.total_rewards_all ? parseFloat(stats.total_rewards_all) / 100000000 : 0,
        averageAPY: stats.avg_apy ? parseFloat(stats.avg_apy) : 0,
        maxAPY: stats.max_apy ? parseFloat(stats.max_apy) : 0,
        staked24h: parseInt(stats.staked_24h) || 0,
        staked7d: parseInt(stats.staked_7d) || 0,
      },
      distribution: {
        noStakes: parseInt(distribution.no_stakes) || 0,
        stakes1to10: parseInt(distribution.stakes_1_10) || 0,
        stakes11to100: parseInt(distribution.stakes_11_100) || 0,
        stakes101to1000: parseInt(distribution.stakes_101_1000) || 0,
        stakes1000Plus: parseInt(distribution.stakes_1000_plus) || 0,
      },
      topStakers: stats.top_5 || [],
      recentStakers: stats.recent_5 || [],
    };

    return NextResponse.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching VerusID stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch VerusID statistics',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

