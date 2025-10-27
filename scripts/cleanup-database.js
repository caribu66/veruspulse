#!/usr/bin/env node
/**
 * cleanup-database.js
 * Clean up unused/legacy database tables
 */

require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function cleanup() {
  console.log('🧹 Database Cleanup\n');

  try {
    // 1. Drop legacy stake_events table
    console.log('1️⃣ Dropping legacy stake_events table...');
    await pool.query('DROP TABLE IF EXISTS stake_events CASCADE');
    console.log('   ✅ Dropped stake_events\n');

    // 2. Truncate incomplete pos_blocks
    console.log('2️⃣ Truncating incomplete pos_blocks...');
    await pool.query('TRUNCATE TABLE pos_blocks');
    console.log('   ✅ Cleared pos_blocks (will rebuild fresh)\n');

    // 3. Delete stakes with old incorrect detection logic
    // These are stakes that might have been found with tx[-1] logic
    console.log('3️⃣ Clearing potentially incorrect stakes...');
    const deleted = await pool.query(`
      DELETE FROM staking_rewards
      WHERE identity_address IN ('iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB', 'iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5')
    `);
    console.log(
      `   ✅ Deleted ${deleted.rowCount} stakes for Caribu66@ and Joanna@ (will re-scan with correct logic)\n`
    );

    // 4. Drop unused analytics tables
    console.log('4️⃣ Dropping empty/unused tables...');
    const unusedTables = [
      'achievement_progress',
      'block_timing_analytics',
      'currency_analytics',
      'economic_indicators',
      'historical_trends',
      'identity_sync_state',
      'network_participation',
      'search_analytics',
      'stake_competition',
      'staker_rankings',
      'staking_performance',
      'staking_predictions',
      'staking_timeline',
      'utxo_health_metrics',
    ];

    for (const table of unusedTables) {
      try {
        await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`   ✅ Dropped ${table}`);
      } catch (e) {
        console.log(`   ⚠️  Could not drop ${table}: ${e.message}`);
      }
    }

    console.log('\n✅ Cleanup complete!\n');

    // Show final state
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('📊 Remaining tables:\n');
    for (const table of tables.rows) {
      const count = await pool.query(
        `SELECT COUNT(*) as count FROM ${table.table_name}`
      );
      console.log(
        `   ${table.table_name}: ${parseInt(count.rows[0].count).toLocaleString()} rows`
      );
    }
  } catch (error) {
    console.error('❌ Cleanup error:', error.message);
  } finally {
    await pool.end();
  }
}

cleanup();
