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

export async function GET(_request: NextRequest) {
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

    // Get network-wide statistics
    const networkQuery = `
      SELECT
        COUNT(*) as total_verusids,
        SUM(total_stakes) as total_stakes,
        SUM(total_rewards_satoshis) as total_rewards,
        AVG(apy_all_time) as avg_apy,
        AVG(staking_efficiency) as avg_efficiency,
        SUM(current_utxos) as total_utxos,
        SUM(eligible_utxos) as total_eligible_utxos
      FROM verusid_statistics
      WHERE total_stakes > 0
    `;

    const networkResult = await db.query(networkQuery);
    const networkStats = networkResult.rows[0];

    // Get recent block analytics (last 1000 blocks)
    const blocksQuery = `
      SELECT
        COUNT(*) as total_blocks,
        COUNT(CASE WHEN block_type = 'minted' THEN 1 END) as pos_blocks,
        COUNT(CASE WHEN block_type = 'mined' THEN 1 END) as pow_blocks,
        AVG(block_interval) as avg_block_time,
        AVG(difficulty) as avg_difficulty,
        SUM(staking_reward_satoshis) as total_staking_rewards
      FROM block_analytics
      WHERE height > (SELECT MAX(height) - 1000 FROM block_analytics)
    `;

    const blocksResult = await db.query(blocksQuery);
    const blockStats = blocksResult.rows[0];

    // Calculate PoS participation rate
    const posParticipation =
      blockStats.total_blocks > 0
        ? (parseInt(blockStats.pos_blocks) /
            parseInt(blockStats.total_blocks)) *
          100
        : 0;

    // Get distribution statistics
    const distributionQuery = `
      SELECT
        COUNT(CASE WHEN total_stakes BETWEEN 1 AND 10 THEN 1 END) as range_1_10,
        COUNT(CASE WHEN total_stakes BETWEEN 11 AND 50 THEN 1 END) as range_11_50,
        COUNT(CASE WHEN total_stakes BETWEEN 51 AND 100 THEN 1 END) as range_51_100,
        COUNT(CASE WHEN total_stakes BETWEEN 101 AND 500 THEN 1 END) as range_101_500,
        COUNT(CASE WHEN total_stakes > 500 THEN 1 END) as range_500_plus
      FROM verusid_statistics
      WHERE total_stakes > 0
    `;

    const distributionResult = await db.query(distributionQuery);
    const distribution = distributionResult.rows[0];

    const response = {
      success: true,
      data: {
        network: {
          totalVerusIDs: parseInt(networkStats.total_verusids) || 0,
          totalStakes: parseInt(networkStats.total_stakes) || 0,
          totalRewardsVRSC:
            (parseFloat(networkStats.total_rewards) || 0) / 100000000,
          averageAPY: parseFloat(networkStats.avg_apy) || 0,
          averageEfficiency: parseFloat(networkStats.avg_efficiency) || 0,
          totalUTXOs: parseInt(networkStats.total_utxos) || 0,
          totalEligibleUTXOs: parseInt(networkStats.total_eligible_utxos) || 0,
        },
        blocks: {
          recentBlocks: parseInt(blockStats.total_blocks) || 0,
          posBlocks: parseInt(blockStats.pos_blocks) || 0,
          powBlocks: parseInt(blockStats.pow_blocks) || 0,
          posParticipation: Math.round(posParticipation * 100) / 100,
          avgBlockTime: Math.round(parseFloat(blockStats.avg_block_time) || 60),
          avgDifficulty: parseFloat(blockStats.avg_difficulty) || 0,
          totalStakingRewardsVRSC:
            (parseFloat(blockStats.total_staking_rewards) || 0) / 100000000,
        },
        distribution: {
          '1-10': parseInt(distribution.range_1_10) || 0,
          '11-50': parseInt(distribution.range_11_50) || 0,
          '51-100': parseInt(distribution.range_51_100) || 0,
          '101-500': parseInt(distribution.range_101_500) || 0,
          '500+': parseInt(distribution.range_500_plus) || 0,
        },
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching network stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch network statistics',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
