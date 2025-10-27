#!/usr/bin/env node
/**
 * Check ALL tables for joanna@ data
 */

const { Pool } = require('pg');

const JOANNA_IADDR = 'iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5';

async function checkAllTables() {
  const dbConfig = {
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  };
  const pool = new Pool(dbConfig);

  try {
    console.log(`\n🔍 Checking ALL tables for joanna@ (${JOANNA_IADDR})\n`);
    console.log(
      '═══════════════════════════════════════════════════════════\n'
    );

    // Check staking_rewards table
    console.log('1️⃣  staking_rewards table:');
    const stakingRewardsResult = await pool.query(
      `
      SELECT 
        COUNT(*) as total,
        MIN(block_height) as min_block,
        MAX(block_height) as max_block,
        MIN(block_time) as min_time,
        MAX(block_time) as max_time,
        SUM(amount_sats) as total_sats
      FROM staking_rewards
      WHERE identity_address = $1
    `,
      [JOANNA_IADDR]
    );

    const sr = stakingRewardsResult.rows[0];
    console.log(`   Records: ${sr.total}`);
    console.log(
      `   Block range: ${sr.min_block || 'N/A'} - ${sr.max_block || 'N/A'}`
    );
    console.log(
      `   Date range: ${sr.min_time || 'N/A'} to ${sr.max_time || 'N/A'}`
    );
    console.log(
      `   Total: ${sr.total_sats ? (parseFloat(sr.total_sats) / 100000000).toFixed(4) : 0} VRSC\n`
    );

    // Check stake_events table
    console.log('2️⃣  stake_events table:');
    try {
      const stakeEventsResult = await pool.query(
        `
        SELECT 
          COUNT(*) as total,
          MIN(block_height) as min_block,
          MAX(block_height) as max_block,
          MIN(block_time) as min_time,
          MAX(block_time) as max_time,
          SUM(reward_amount) as total_amount
        FROM stake_events
        WHERE address = $1
      `,
        [JOANNA_IADDR]
      );

      const se = stakeEventsResult.rows[0];
      console.log(`   Records: ${se.total}`);
      console.log(
        `   Block range: ${se.min_block || 'N/A'} - ${se.max_block || 'N/A'}`
      );
      console.log(
        `   Date range: ${se.min_time || 'N/A'} to ${se.max_time || 'N/A'}`
      );
      console.log(
        `   Total: ${se.total_amount ? parseFloat(se.total_amount).toFixed(4) : 0} VRSC\n`
      );
    } catch (error) {
      console.log(`   ⚠️  Table doesn't exist or error: ${error.message}\n`);
    }

    // Check utxos table
    console.log('3️⃣  utxos table:');
    try {
      const utxosResult = await pool.query(
        `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN is_coinbase THEN 1 ELSE 0 END) as coinbase_count,
          SUM(amount_sats) as total_sats
        FROM utxos
        WHERE address = $1
      `,
        [JOANNA_IADDR]
      );

      const u = utxosResult.rows[0];
      console.log(`   Total UTXOs: ${u.total}`);
      console.log(`   Coinbase UTXOs: ${u.coinbase_count}`);
      console.log(
        `   Total value: ${u.total_sats ? (parseFloat(u.total_sats) / 100000000).toFixed(4) : 0} VRSC\n`
      );
    } catch (error) {
      console.log(`   ⚠️  Table doesn't exist or error: ${error.message}\n`);
    }

    // Check verusid_statistics table
    console.log('4️⃣  verusid_statistics table:');
    try {
      const statsResult = await pool.query(
        `
        SELECT 
          total_stakes,
          total_rewards_satoshis,
          first_stake_time,
          last_stake_time,
          apy_all_time
        FROM verusid_statistics
        WHERE address = $1
      `,
        [JOANNA_IADDR]
      );

      if (statsResult.rows.length > 0) {
        const vs = statsResult.rows[0];
        console.log(`   Total stakes: ${vs.total_stakes}`);
        console.log(
          `   Total rewards: ${vs.total_rewards_satoshis ? (parseFloat(vs.total_rewards_satoshis) / 100000000).toFixed(4) : 0} VRSC`
        );
        console.log(`   First stake: ${vs.first_stake_time || 'N/A'}`);
        console.log(`   Last stake: ${vs.last_stake_time || 'N/A'}`);
        console.log(`   APY: ${vs.apy_all_time || 'N/A'}%\n`);
      } else {
        console.log(`   No statistics record found\n`);
      }
    } catch (error) {
      console.log(`   ⚠️  Table doesn't exist or error: ${error.message}\n`);
    }

    // List all tables in database
    console.log('📋 All tables in database:');
    const tablesResult = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    console.log(tablesResult.rows.map(r => `   - ${r.tablename}`).join('\n'));
    console.log('');

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkAllTables();
