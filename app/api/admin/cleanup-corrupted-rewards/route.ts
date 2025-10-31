import { type NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    logger.info('🧹 Starting cleanup of corrupted staking rewards...');

    // Initialize database connection
    const db = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Reasonable limit for staking rewards (1M VRSC in satoshis)
    const MAX_REASONABLE_REWARD_SATS = 100000000000; // 1M VRSC

    // First, let's see what we're dealing with
    const statsQuery = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN amount_sats > $1 THEN 1 END) as corrupted_records,
        MIN(amount_sats) as min_amount,
        MAX(amount_sats) as max_amount,
        AVG(amount_sats) as avg_amount
      FROM staking_rewards
    `;

    const statsResult = await db.query(statsQuery, [
      MAX_REASONABLE_REWARD_SATS,
    ]);
    const stats = statsResult.rows[0];

    logger.info('📊 Current database state:', {
      totalRecords: stats.total_records,
      corruptedRecords: stats.corrupted_records,
      minAmount: (stats.min_amount / 100000000).toFixed(2) + ' VRSC',
      maxAmount: (stats.max_amount / 100000000).toFixed(2) + ' VRSC',
      avgAmount: (stats.avg_amount / 100000000).toFixed(2) + ' VRSC',
    });

    if (parseInt(stats.corrupted_records) === 0) {
      logger.info('✅ No corrupted records found. Database is clean!');
      await db.end();
      return NextResponse.json({
        success: true,
        message: 'No corrupted records found. Database is clean!',
        stats: {
          totalRecords: parseInt(stats.total_records),
          corruptedRecords: 0,
        },
      });
    }

    // Show some examples of corrupted records
    const examplesQuery = `
      SELECT 
        identity_address,
        txid,
        amount_sats,
        (amount_sats / 100000000.0) as amount_vrsc,
        block_time
      FROM staking_rewards
      WHERE amount_sats > $1
      ORDER BY amount_sats DESC
      LIMIT 10
    `;

    const examplesResult = await db.query(examplesQuery, [
      MAX_REASONABLE_REWARD_SATS,
    ]);
    logger.info(
      '🚨 Examples of corrupted records:',
      examplesResult.rows.map(row => ({
        address: row.identity_address,
        amountVRSC: parseFloat(row.amount_vrsc).toFixed(2),
        txid: row.txid,
      }))
    );

    logger.info(`🗑️ Deleting ${stats.corrupted_records} corrupted records...`);

    // Delete corrupted records
    const deleteQuery = `
      DELETE FROM staking_rewards 
      WHERE amount_sats > $1
    `;

    const deleteResult = await db.query(deleteQuery, [
      MAX_REASONABLE_REWARD_SATS,
    ]);

    logger.info(`✅ Deleted ${deleteResult.rowCount} corrupted records`);

    // Update statistics
    logger.info('🔄 Updating statistics...');

    // Refresh the materialized view
    await db.query('REFRESH MATERIALIZED VIEW staking_daily');
    logger.info('✅ Refreshed staking_daily materialized view');

    // Recalculate verusid_statistics
    const recalcQuery = `
      -- Clear existing statistics
      TRUNCATE TABLE verusid_statistics;
      
      -- Recalculate statistics from clean data
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
      WHERE sr.source_address = sr.identity_address  -- CRITICAL: Only count direct I-address stakes
      GROUP BY sr.identity_address, i.friendly_name, i.base_name
      HAVING COUNT(*) > 0
    `;

    await db.query(recalcQuery);
    logger.info('✅ Recalculated verusid_statistics');

    // Final stats
    const finalStatsQuery = `
      SELECT 
        COUNT(*) as total_records,
        MIN(amount_sats) as min_amount,
        MAX(amount_sats) as max_amount,
        AVG(amount_sats) as avg_amount
      FROM staking_rewards
    `;

    const finalStatsResult = await db.query(finalStatsQuery);
    const finalStats = finalStatsResult.rows[0];

    logger.info('📊 Final database state:', {
      totalRecords: finalStats.total_records,
      minAmount: (finalStats.min_amount / 100000000).toFixed(2) + ' VRSC',
      maxAmount: (finalStats.max_amount / 100000000).toFixed(2) + ' VRSC',
      avgAmount: (finalStats.avg_amount / 100000000).toFixed(2) + ' VRSC',
    });

    await db.end();

    logger.info('🎉 Cleanup completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed successfully!',
      stats: {
        totalRecords: parseInt(finalStats.total_records),
        deletedRecords: parseInt(stats.corrupted_records),
        minAmountVRSC: (finalStats.min_amount / 100000000).toFixed(2),
        maxAmountVRSC: (finalStats.max_amount / 100000000).toFixed(2),
        avgAmountVRSC: (finalStats.avg_amount / 100000000).toFixed(2),
      },
    });
  } catch (error: any) {
    logger.error('❌ Error during cleanup:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to cleanup corrupted rewards',
      },
      { status: 500 }
    );
  }
}
