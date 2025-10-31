#!/usr/bin/env node

/**
 * Cleanup History Script
 * Run this via cron to clean up old view history
 * Recommended: Daily (0 0 * * *)
 */

const { Pool } = require('pg');

// Load environment variables
require('dotenv').config();

const DB_CONN = process.env.DATABASE_URL;

if (!DB_CONN) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

async function cleanupHistory() {
  const pool = new Pool({
    connectionString: DB_CONN,
    max: 1,
  });

  try {
    console.log('🧹 Cleaning up old view history...');

    // Get count before cleanup
    const beforeResult = await pool.query(
      'SELECT COUNT(*) as count FROM view_history'
    );
    const beforeCount = beforeResult.rows[0].count;
    console.log(`   Records before cleanup: ${beforeCount}`);

    // Call the database function to cleanup old history
    await pool.query('SELECT cleanup_old_view_history()');

    // Get count after cleanup
    const afterResult = await pool.query(
      'SELECT COUNT(*) as count FROM view_history'
    );
    const afterCount = afterResult.rows[0].count;
    console.log(`   Records after cleanup: ${afterCount}`);
    console.log(`   Records removed: ${beforeCount - afterCount}`);

    console.log('✅ Cleanup completed successfully');
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

cleanupHistory().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
