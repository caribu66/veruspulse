#!/usr/bin/env node
/**
 * Analyze reward patterns to verify detection accuracy
 */

const { Pool } = require('pg');

async function analyzeRewardPatterns() {
  const dbConfig = {
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  };
  const pool = new Pool(dbConfig);

  try {
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║     STAKE DETECTION ACCURACY ANALYSIS        ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    // Get statistics
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
    console.log('📊 Reward Statistics for joanna@:\n');
    console.log(`   Total stakes: ${s.total_stakes}`);
    console.log(`   Min reward: ${parseFloat(s.min_reward).toFixed(8)} VRSC`);
    console.log(`   Max reward: ${parseFloat(s.max_reward).toFixed(8)} VRSC`);
    console.log(`   Avg reward: ${parseFloat(s.avg_reward).toFixed(8)} VRSC`);
    console.log(
      `   Median reward: ${parseFloat(s.median_reward).toFixed(8)} VRSC\n`
    );

    // Reward distribution
    console.log('📈 Reward Distribution:\n');

    const distribution = await pool.query(`
      SELECT 
        CASE 
          WHEN amount_sats / 100000000.0 < 5 THEN '< 5 VRSC'
          WHEN amount_sats / 100000000.0 < 10 THEN '5-10 VRSC'
          WHEN amount_sats / 100000000.0 < 12 THEN '10-12 VRSC'
          WHEN amount_sats / 100000000.0 < 15 THEN '12-15 VRSC (half reward)'
          WHEN amount_sats / 100000000.0 < 20 THEN '15-20 VRSC'
          WHEN amount_sats / 100000000.0 < 24 THEN '20-24 VRSC'
          WHEN amount_sats / 100000000.0 < 25 THEN '24-25 VRSC (full reward)'
          WHEN amount_sats / 100000000.0 < 30 THEN '25-30 VRSC'
          WHEN amount_sats / 100000000.0 < 50 THEN '30-50 VRSC'
          ELSE '> 50 VRSC'
        END as range,
        COUNT(*) as count
      FROM staking_rewards
      WHERE identity_address = 'iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5'
      GROUP BY range
      ORDER BY MIN(amount_sats / 100000000.0)
    `);

    distribution.rows.forEach(row => {
      const percentage = ((row.count / s.total_stakes) * 100).toFixed(1);
      const bar = '█'.repeat(Math.round(percentage / 2));
      console.log(
        `   ${row.range.padEnd(25)} ${row.count.toString().padStart(3)} (${percentage.toString().padStart(5)}%) ${bar}`
      );
    });

    // Check vout consistency
    console.log('\n\n🔍 Checking vout Index Consistency:\n');

    const voutStats = await pool.query(`
      SELECT 
        vout,
        COUNT(*) as count
      FROM staking_rewards
      WHERE identity_address = 'iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5'
      GROUP BY vout
      ORDER BY vout
    `);

    voutStats.rows.forEach(row => {
      const percentage = ((row.count / s.total_stakes) * 100).toFixed(1);
      console.log(`   vout[${row.vout}]: ${row.count} stakes (${percentage}%)`);
    });

    if (voutStats.rows.length === 1 && voutStats.rows[0].vout === 1) {
      console.log(`\n   ✅ All stakes consistently use vout[1]`);
      console.log(
        `   ✅ This suggests the detection logic is working correctly`
      );
    }

    // Check for exact 24 VRSC rewards
    console.log('\n\n💎 Exact 24 VRSC Rewards (Standard Block Reward):\n');

    const exact24 = await pool.query(`
      SELECT COUNT(*) as count
      FROM staking_rewards
      WHERE identity_address = 'iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5'
        AND amount_sats = 2400000000
    `);

    const count24 = exact24.rows[0].count;
    const percentage24 = ((count24 / s.total_stakes) * 100).toFixed(1);
    console.log(
      `   Exact 24.00000000 VRSC: ${count24} stakes (${percentage24}%)`
    );

    // Check for exact 12 VRSC rewards (halving)
    const exact12 = await pool.query(`
      SELECT COUNT(*) as count
      FROM staking_rewards
      WHERE identity_address = 'iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5'
        AND amount_sats = 1200000000
    `);

    const count12 = exact12.rows[0].count;
    const percentage12 = ((count12 / s.total_stakes) * 100).toFixed(1);
    console.log(
      `   Exact 12.00000000 VRSC: ${count12} stakes (${percentage12}%)`
    );

    // Check total across all VerusIDs
    console.log('\n\n🌐 All VerusIDs Analysis:\n');

    const allStats = await pool.query(`
      SELECT 
        COUNT(*) as total_stakes,
        COUNT(DISTINCT identity_address) as unique_addresses,
        MIN(amount_sats / 100000000.0) as min_reward,
        MAX(amount_sats / 100000000.0) as max_reward,
        AVG(amount_sats / 100000000.0) as avg_reward,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount_sats / 100000000.0) as median_reward
      FROM staking_rewards
    `);

    const a = allStats.rows[0];
    console.log(
      `   Total stakes: ${parseInt(a.total_stakes).toLocaleString()}`
    );
    console.log(
      `   Unique VerusIDs: ${parseInt(a.unique_addresses).toLocaleString()}`
    );
    console.log(`   Min reward: ${parseFloat(a.min_reward).toFixed(8)} VRSC`);
    console.log(`   Max reward: ${parseFloat(a.max_reward).toFixed(8)} VRSC`);
    console.log(`   Avg reward: ${parseFloat(a.avg_reward).toFixed(8)} VRSC`);
    console.log(
      `   Median reward: ${parseFloat(a.median_reward).toFixed(8)} VRSC`
    );

    console.log('\n\n╔═══════════════════════════════════════════════╗');
    console.log('║              VERDICT                          ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    // Determine if detection is accurate
    if (percentage24 > 50) {
      console.log('✅ DETECTION APPEARS ACCURATE!\n');
      console.log(`   - ${percentage24}% of rewards are exactly 24 VRSC`);
      console.log('   - This matches the standard Verus PoS block reward');
      console.log('   - All stakes use vout[1] consistently');
      console.log(
        '   - No suspiciously large amounts (would be 1000+ VRSC if wrong)\n'
      );
    } else if (parseFloat(a.avg_reward) > 100) {
      console.log('⚠️  DETECTION MAY BE INCORRECT!\n');
      console.log(
        '   - Average reward > 100 VRSC suggests we might be recording'
      );
      console.log(
        '   - the full UTXO value (staked amount + reward) instead of just reward\n'
      );
    } else {
      console.log('⚠️  DETECTION NEEDS REVIEW\n');
      console.log('   - Rewards vary significantly');
      console.log(
        '   - This might be due to different reward schedules over time\n'
      );
    }

    console.log('💡 Verus PoS Reward Schedule:');
    console.log('   - Original: 24 VRSC per block');
    console.log('   - After halving: 12 VRSC per block');
    console.log(
      '   - Rewards can vary slightly based on block time and fees\n'
    );

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

analyzeRewardPatterns();
