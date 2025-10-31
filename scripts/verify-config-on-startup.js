#!/usr/bin/env node

/**
 * STARTUP CONFIGURATION VERIFIER
 * This runs automatically before your app starts
 * If anything is wrong, it tells you EXACTLY what to do
 */

require('dotenv').config();
const { Pool } = require('pg');

async function quickCheck() {
  // Quick silent check - only shows errors
  if (!process.env.DATABASE_URL || !process.env.VERUS_RPC_HOST) {
    console.error('❌ Missing critical environment variables!');
    console.error('   Run: cp env.example .env');
    process.exit(1);
  }

  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 3000
    });

    // Quick permission check
    const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE table_name = 'identities') as has_identities,
        COUNT(*) FILTER (WHERE table_name = 'staking_rewards') as has_rewards
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    if (result.rows[0].has_identities === 0 || result.rows[0].has_rewards === 0) {
      console.error('❌ Database tables missing!');
      console.error('   Run: ./scripts/lock-configuration.sh');
      process.exit(1);
    }

    // Try to read from tables
    await pool.query('SELECT 1 FROM identities LIMIT 1');
    
    await pool.end();
    
    // Silent success - app will start
    return true;

  } catch (error) {
    console.error('❌ Database configuration issue detected!');
    console.error('   Error:', error.message);
    console.error('');
    console.error('   FIX IT BY RUNNING:');
    console.error('   ./scripts/lock-configuration.sh');
    console.error('');
    process.exit(1);
  }
}

quickCheck().catch(err => {
  console.error('❌ Startup check failed:', err.message);
  process.exit(1);
});

