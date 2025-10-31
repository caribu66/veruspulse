import { type NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { logger } from '@/lib/utils/logger';

export async function POST(_request: NextRequest) {
  try {
    logger.info('🔄 Starting recalculation of VerusID statistics...');

    // Initialize database connection
    const db = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Clear existing statistics
    logger.info('🧹 Clearing existing statistics...');
    await db.query('TRUNCATE TABLE verusid_statistics');

    // Recalculate statistics from clean staking_rewards data
    logger.info('📊 Recalculating statistics from clean data...');
    const recalcQuery = `
      INSERT INTO verusid_statistics (
        address,
        friendly_name,
        total_stakes,
        total_rewards_satoshis,
        first_stake_time,
        last_stake_time,
        created_at,
        updated_at
      )
      SELECT
        sr.identity_address as address,
        COALESCE(i.friendly_name, i.base_name || '.VRSC@') as friendly_name,
        COUNT(*)::integer as total_stakes,
        SUM(sr.amount_sats)::bigint as total_rewards_satoshis,
        MIN(sr.block_time) as first_stake_time,
        MAX(sr.block_time) as last_stake_time,
        NOW() as created_at,
        NOW() as updated_at
      FROM staking_rewards sr
      LEFT JOIN identities i ON sr.identity_address = i.identity_address
      WHERE sr.source_address = sr.identity_address  -- CRITICAL: Only count direct I-address stakes
      GROUP BY sr.identity_address, i.friendly_name, i.base_name
      HAVING COUNT(*) > 0
    `;

    await db.query(recalcQuery);
    logger.info('✅ Recalculated verusid_statistics');

    // Skip materialized view refresh for now (may cause overflow)
    logger.info('⏭️  Skipping materialized view refresh');

    // Get final stats
    const statsQuery = `
      SELECT
        COUNT(*) as total_identities,
        SUM(total_rewards_satoshis) as total_rewards_satoshis,
        (SUM(total_rewards_satoshis) / 100000000.0) as total_rewards_vrsc,
        MAX(total_rewards_satoshis) as max_rewards_satoshis,
        (MAX(total_rewards_satoshis) / 100000000.0) as max_rewards_vrsc
      FROM verusid_statistics
    `;

    const statsResult = await db.query(statsQuery);
    const stats = statsResult.rows[0];

    logger.info('📊 Final statistics:', {
      totalIdentities: parseInt(stats.total_identities),
      totalRewardsVRSC: parseFloat(stats.total_rewards_vrsc).toFixed(2),
      maxRewardsVRSC: parseFloat(stats.max_rewards_vrsc).toFixed(2),
    });

    await db.end();

    logger.info('🎉 Statistics recalculation completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Statistics recalculation completed successfully!',
      stats: {
        totalIdentities: parseInt(stats.total_identities),
        totalRewardsVRSC: parseFloat(stats.total_rewards_vrsc).toFixed(2),
        maxRewardsVRSC: parseFloat(stats.max_rewards_vrsc).toFixed(2),
      },
    });
  } catch (error: any) {
    logger.error('❌ Error during statistics recalculation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to recalculate statistics',
      },
      { status: 500 }
    );
  }
}
