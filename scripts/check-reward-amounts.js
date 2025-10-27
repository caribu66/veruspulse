#!/usr/bin/env node
/**
 * Check if recorded reward amounts make sense
 */

const { Pool } = require('pg');

async function checkRewardAmounts() {
  const dbConfig = {
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  };
  const pool = new Pool(dbConfig);

  try {
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║     VERIFY REWARD AMOUNT LOGIC               ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    // Get sample stakes from database
    console.log('📊 Sample stakes from joanna@ in staking_rewards:\n');

    const result = await pool.query(`
      SELECT 
        block_height,
        block_time,
        amount_sats,
        amount_sats / 100000000.0 as amount_vrsc,
        txid,
        vout
      FROM staking_rewards
      WHERE identity_address = 'iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5'
      ORDER BY block_height
      LIMIT 20
    `);

    result.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. Block ${row.block_height.toLocaleString()}`);
      console.log(`   Date: ${new Date(row.block_time).toLocaleDateString()}`);
      console.log(
        `   Amount: ${parseFloat(row.amount_vrsc).toFixed(8)} VRSC (${row.amount_sats} sats)`
      );
      console.log(`   TXID: ${row.txid}`);
      console.log(`   vout: ${row.vout}`);
      console.log(``);
    });

    // Statistics on reward amounts
    console.log('\n📈 Reward Amount Statistics:\n');

    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_stakes,
        MIN(amount_sats / 100000000.0) as min_reward,
        MAX(amount_sats / 100000000.0) as max_reward,
        AVG(amount_sats / 100000000.0) as avg_reward,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount_sats / 100000000.0) as median_reward
      FROM staking_rewards
      WHERE identity_address = 'iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5'
    `);

    const s = stats.rows[0];
    console.log(`Total stakes: ${s.total_stakes}`);
    console.log(`Min reward: ${parseFloat(s.min_reward).toFixed(8)} VRSC`);
    console.log(`Max reward: ${parseFloat(s.max_reward).toFixed(8)} VRSC`);
    console.log(`Avg reward: ${parseFloat(s.avg_reward).toFixed(8)} VRSC`);
    console.log(
      `Median reward: ${parseFloat(s.median_reward).toFixed(8)} VRSC`
    );

    // Check for suspicious patterns
    console.log('\n\n🔍 Checking for Suspicious Patterns:\n');

    // Very large rewards (might be staked amount + reward instead of just reward)
    const largeRewards = await pool.query(`
      SELECT 
        block_height,
        amount_sats / 100000000.0 as amount_vrsc
      FROM staking_rewards
      WHERE identity_address = 'iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5'
        AND amount_sats > 100 * 100000000
      ORDER BY amount_sats DESC
      LIMIT 10
    `);

    if (largeRewards.rows.length > 0) {
      console.log(`⚠️  Found ${largeRewards.rows.length} rewards > 100 VRSC:`);
      largeRewards.rows.forEach(row => {
        console.log(
          `   Block ${row.block_height}: ${parseFloat(row.amount_vrsc).toFixed(2)} VRSC`
        );
      });
      console.log(`\n   ⚠️  Typical Verus PoS reward is 24 VRSC`);
      console.log(`   ⚠️  Large amounts might include staked coins + reward!`);
    } else {
      console.log(`✅ No suspiciously large rewards found`);
    }

    // Very small rewards (might be just fees)
    console.log('\n');
    const smallRewards = await pool.query(`
      SELECT 
        block_height,
        amount_sats / 100000000.0 as amount_vrsc
      FROM staking_rewards
      WHERE identity_address = 'iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5'
        AND amount_sats < 1 * 100000000
      ORDER BY amount_sats
      LIMIT 10
    `);

    if (smallRewards.rows.length > 0) {
      console.log(`⚠️  Found ${smallRewards.rows.length} rewards < 1 VRSC:`);
      smallRewards.rows.forEach(row => {
        console.log(
          `   Block ${row.block_height}: ${parseFloat(row.amount_vrsc).toFixed(8)} VRSC`
        );
      });
      console.log(`\n   ⚠️  These might be incorrect or just transaction fees`);
    } else {
      console.log(`✅ No suspiciously small rewards found`);
    }

    // Check consistency
    console.log('\n\n📊 Reward Range Distribution:\n');

    const distribution = await pool.query(`
      SELECT 
        CASE 
          WHEN amount_sats < 10 * 100000000 THEN '< 10 VRSC'
          WHEN amount_sats < 20 * 100000000 THEN '10-20 VRSC'
          WHEN amount_sats < 25 * 100000000 THEN '20-25 VRSC (expected range)'
          WHEN amount_sats < 30 * 100000000 THEN '25-30 VRSC'
          WHEN amount_sats < 50 * 100000000 THEN '30-50 VRSC'
          ELSE '> 50 VRSC (suspicious)'
        END as range,
        COUNT(*) as count
      FROM staking_rewards
      WHERE identity_address = 'iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5'
      GROUP BY range
      ORDER BY MIN(amount_sats)
    `);

    distribution.rows.forEach(row => {
      const percentage = ((row.count / s.total_stakes) * 100).toFixed(1);
      console.log(`   ${row.range}: ${row.count} stakes (${percentage}%)`);
    });

    console.log('\n\n💡 Expected Verus PoS Rewards:');
    console.log('   - Block reward: 24 VRSC');
    console.log('   - Can vary slightly based on block time');
    console.log('   - Should NOT include the original staked amount\n');

    console.log(
      '✅ If most rewards are around 20-30 VRSC, the logic is likely CORRECT'
    );
    console.log(
      '⚠️  If most rewards are > 100 VRSC, we might be recording stake+reward\n'
    );

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkRewardAmounts();
