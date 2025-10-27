import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    logger.info('🧹 Starting removal of duplicate staking rewards...');

    // Initialize database connection
    const db = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // First, let's see what we're dealing with
    const statsQuery = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT txid) as unique_transactions,
        COUNT(DISTINCT CONCAT(txid, '-', vout)) as unique_tx_vout,
        SUM(amount_sats) as total_amount_sats,
        (SUM(amount_sats) / 100000000.0) as total_amount_vrsc
      FROM staking_rewards
    `;

    const statsResult = await db.query(statsQuery);
    const stats = statsResult.rows[0];

    const totalRecords = parseInt(stats.total_records);
    const uniqueTxVout = parseInt(stats.unique_tx_vout);
    const duplicates = totalRecords - uniqueTxVout;

    logger.info('📊 Current database state:', {
      totalRecords,
      uniqueTxVout,
      duplicates,
      totalAmountVRSC: parseFloat(stats.total_amount_vrsc).toFixed(2),
    });

    if (duplicates === 0) {
      logger.info('✅ No duplicate records found. Database is clean!');
      await db.end();
      return NextResponse.json({
        success: true,
        message: 'No duplicate records found. Database is clean!',
        stats: {
          totalRecords,
          duplicates: 0,
        },
      });
    }

    logger.info(`🗑️ Removing ${duplicates} duplicate records...`);

    // Remove duplicates, keeping only the first occurrence
    const removeDuplicatesQuery = `
      DELETE FROM staking_rewards 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM staking_rewards 
        GROUP BY txid, vout
      )
    `;

    const deleteResult = await db.query(removeDuplicatesQuery);

    logger.info(`✅ Removed ${deleteResult.rowCount} duplicate records`);

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
      GROUP BY sr.identity_address, i.friendly_name, i.base_name
      HAVING COUNT(*) > 0
    `;

    await db.query(recalcQuery);
    logger.info('✅ Recalculated verusid_statistics');

    // Final stats
    const finalStatsQuery = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT txid) as unique_transactions,
        COUNT(DISTINCT CONCAT(txid, '-', vout)) as unique_tx_vout,
        SUM(amount_sats) as total_amount_sats,
        (SUM(amount_sats) / 100000000.0) as total_amount_vrsc
      FROM staking_rewards
    `;

    const finalStatsResult = await db.query(finalStatsQuery);
    const finalStats = finalStatsResult.rows[0];

    logger.info('📊 Final database state:', {
      totalRecords: parseInt(finalStats.total_records),
      uniqueTransactions: parseInt(finalStats.unique_transactions),
      uniqueTxVout: parseInt(finalStats.unique_tx_vout),
      totalAmountVRSC: parseFloat(finalStats.total_amount_vrsc).toFixed(2),
    });

    await db.end();

    logger.info('🎉 Duplicate removal completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Duplicate removal completed successfully!',
      stats: {
        totalRecords: parseInt(finalStats.total_records),
        removedDuplicates: duplicates,
        totalAmountVRSC: parseFloat(finalStats.total_amount_vrsc).toFixed(2),
      },
    });
  } catch (error: any) {
    logger.error('❌ Error during duplicate removal:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to remove duplicates',
      },
      { status: 500 }
    );
  }
}
