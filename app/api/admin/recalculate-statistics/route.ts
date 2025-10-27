import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
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
        apy_all_time,
        staking_efficiency,
        network_rank,
        created_at,
        updated_at
      )
      SELECT 
        sr.identity_address as address,
        COALESCE(i.friendly_name, i.base_name || '.VRSC@') as friendly_name,
        COUNT(*) as total_stakes,
        SUM(sr.amount_sats) as total_rewards_satoshis,
        MIN(sr.block_time) as first_stake_time,
        MAX(sr.block_time) as last_stake_time,
        -- Simple APY calculation
        CASE 
          WHEN EXTRACT(EPOCH FROM (MAX(sr.block_time) - MIN(sr.block_time))) > 86400 
          THEN (SUM(sr.amount_sats)::numeric / 100000000) / 
               (EXTRACT(EPOCH FROM (MAX(sr.block_time) - MIN(sr.block_time))) / 31536000) * 100
          ELSE 0 
        END as apy_all_time,
        0 as staking_efficiency,
        ROW_NUMBER() OVER (ORDER BY SUM(sr.amount_sats) DESC) as network_rank,
        NOW() as created_at,
        NOW() as updated_at
      FROM staking_rewards sr
      LEFT JOIN identities i ON sr.identity_address = i.identity_address
      GROUP BY sr.identity_address, i.friendly_name, i.base_name
      HAVING COUNT(*) > 0
    `;

    await db.query(recalcQuery);
    logger.info('✅ Recalculated verusid_statistics');

    // Refresh materialized views
    logger.info('🔄 Refreshing materialized views...');
    await db.query('REFRESH MATERIALIZED VIEW staking_daily');
    logger.info('✅ Refreshed staking_daily materialized view');

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
