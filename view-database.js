#!/usr/bin/env node

/**
 * Simple Database Viewer
 * View your staking database data easily
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function viewDatabase() {
  try {
    console.log('🔍 VERUS STAKING DATABASE VIEWER');
    console.log('================================\n');

    // 1. Overall statistics
    console.log('📊 OVERALL STATISTICS:');
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_stakes,
        MAX(block_height) as latest_block,
        MIN(block_time) as earliest_stake,
        MAX(block_time) as latest_stake
      FROM staking_rewards
    `);

    const stats = statsResult.rows[0];
    console.log(
      `   Total stake events: ${stats.total_stakes.toLocaleString()}`
    );
    console.log(`   Latest block: ${stats.latest_block.toLocaleString()}`);
    console.log(
      `   Date range: ${stats.earliest_stake} to ${stats.latest_stake}\n`
    );

    // 2. Recent stakes
    console.log('🎯 RECENT STAKES (Last 10):');
    const recentResult = await pool.query(`
      SELECT 
        identity_address,
        block_height,
        block_time,
        amount_sats,
        txid
      FROM staking_rewards 
      ORDER BY block_height DESC 
      LIMIT 10
    `);

    recentResult.rows.forEach((row, index) => {
      const amountVRSC = (row.amount_sats / 100000000).toFixed(8);
      console.log(
        `   ${index + 1}. Block ${row.block_height}: ${amountVRSC} VRSC to ${row.identity_address}`
      );
    });
    console.log('');

    // 3. Top stakers by count
    console.log('🏆 TOP STAKERS BY COUNT:');
    const topStakersResult = await pool.query(`
      SELECT 
        identity_address,
        COUNT(*) as stake_count,
        SUM(amount_sats) as total_amount_sats
      FROM staking_rewards 
      GROUP BY identity_address 
      ORDER BY stake_count DESC 
      LIMIT 10
    `);

    topStakersResult.rows.forEach((row, index) => {
      const totalVRSC = (row.total_amount_sats / 100000000).toFixed(2);
      console.log(
        `   ${index + 1}. ${row.identity_address}: ${row.stake_count} stakes, ${totalVRSC} VRSC total`
      );
    });
    console.log('');

    // 4. Database tables info
    console.log('📋 DATABASE TABLES:');
    const tablesResult = await pool.query(`
      SELECT 
        schemaname,
        relname as tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes
      FROM pg_stat_user_tables 
      ORDER BY n_tup_ins DESC
    `);

    tablesResult.rows.forEach(row => {
      console.log(
        `   ${row.tablename}: ${row.inserts.toLocaleString()} records`
      );
    });
  } catch (error) {
    console.error('❌ Error viewing database:', error.message);
  } finally {
    await pool.end();
  }
}

viewDatabase();
