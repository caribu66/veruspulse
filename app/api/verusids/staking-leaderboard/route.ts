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
        address,
        friendly_name,
        total_stakes,
        total_rewards_satoshis,
        apy_all_time,
        apy_30d,
        staking_efficiency,
        last_stake_time,
        network_rank,
        network_percentile,
        eligible_utxos,
        current_utxos
      FROM verusid_statistics
      WHERE total_stakes >= $1
      ORDER BY ${orderByColumn} DESC NULLS LAST
      LIMIT $2
    `;

    const result = await db.query(query, [minStakes, limit]);

    const leaderboard = result.rows.map((row, index) => ({
      rank: index + 1,
      address: row.address,
      friendlyName: row.friendly_name,
      displayName: row.friendly_name || row.address,
      totalStakes: row.total_stakes,
      totalRewardsVRSC: (parseFloat(row.total_rewards_satoshis) || 0) / 100000000,
      apyAllTime: parseFloat(row.apy_all_time) || 0,
      apy30d: parseFloat(row.apy_30d) || 0,
      stakingEfficiency: parseFloat(row.staking_efficiency) || 0,
      lastStake: row.last_stake_time,
      networkRank: row.network_rank,
      networkPercentile: parseFloat(row.network_percentile) || 0,
      eligibleUtxos: row.eligible_utxos,
      totalUtxos: row.current_utxos,
    }));

    // Get total count for pagination
    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM verusid_statistics WHERE total_stakes >= $1',
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

