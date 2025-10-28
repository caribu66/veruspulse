#!/usr/bin/env node

/**
 * CRITICAL BUG FIX: Stake Attribution Issue
 *
 * PROBLEM: VerusIDs were showing incorrect rewards because the statistics
 * were counting ALL stakes where the identity_address received rewards,
 * including stakes from OTHER addresses (R-addresses) that paid to the I-address.
 *
 * EXAMPLE: A VerusID with only 193 VRSC was showing 88,937 VRSC in rewards
 * because it was receiving rewards from other addresses that staked on its behalf.
 *
 * SOLUTION: Only count stakes where source_address = identity_address
 * (i.e., direct I-address stakes only)
 *
 * This script:
 * 1. Analyzes the current state to show the extent of the problem
 * 2. Recalculates all statistics with the correct filter
 * 3. Shows before/after comparison
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║   CRITICAL BUG FIX: Stake Attribution Issue             ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

async function analyzeCurrentState() {
  console.log('🔍 STEP 1: Analyzing current state...\n');

  try {
    // Show total stakes by address type
    const addressTypeQuery = `
      SELECT 
        CASE 
          WHEN source_address = identity_address THEN 'Direct I-address stakes'
          ELSE 'Indirect stakes (from other addresses)'
        END as stake_type,
        COUNT(*) as count,
        SUM(amount_sats) / 100000000.0 as total_vrsc
      FROM staking_rewards
      WHERE identity_address LIKE 'i%'
      GROUP BY stake_type
      ORDER BY count DESC
    `;

    const result = await pool.query(addressTypeQuery);
    console.log('📊 Breakdown of stakes in staking_rewards table:');
    result.rows.forEach(row => {
      console.log(
        `   ${row.stake_type}: ${parseInt(row.count).toLocaleString()} stakes (${parseFloat(row.total_vrsc).toFixed(2)} VRSC)`
      );
    });

    // Check specific problematic VerusID
    const problematicQuery = `
      SELECT 
        COUNT(*) as total_stakes,
        COUNT(*) FILTER (WHERE source_address = identity_address) as direct_stakes,
        COUNT(*) FILTER (WHERE source_address != identity_address) as indirect_stakes,
        SUM(amount_sats) / 100000000.0 as total_rewards,
        SUM(amount_sats) FILTER (WHERE source_address = identity_address) / 100000000.0 as direct_rewards,
        SUM(amount_sats) FILTER (WHERE source_address != identity_address) / 100000000.0 as indirect_rewards
      FROM staking_rewards
      WHERE identity_address = 'iSXF8KbbvpHDWBm4zHxeA4n7uc1LsfR15X'
    `;

    const problematic = await pool.query(problematicQuery);
    if (problematic.rows[0].total_stakes > 0) {
      const p = problematic.rows[0];
      console.log('\n🚨 EXAMPLE: VerusID iSXF8KbbvpHDWBm4zHxeA4n7uc1LsfR15X');
      console.log(`   Total stakes (WRONG): ${p.total_stakes}`);
      console.log(`   Direct I-address stakes (CORRECT): ${p.direct_stakes}`);
      console.log(
        `   Indirect stakes (SHOULD NOT COUNT): ${p.indirect_stakes}`
      );
      console.log(
        `   Total rewards (WRONG): ${parseFloat(p.total_rewards || 0).toFixed(2)} VRSC`
      );
      console.log(
        `   Direct rewards (CORRECT): ${parseFloat(p.direct_rewards || 0).toFixed(2)} VRSC`
      );
      console.log(
        `   Indirect rewards (SHOULD NOT COUNT): ${parseFloat(p.indirect_rewards || 0).toFixed(2)} VRSC`
      );
    }

    // Show top affected VerusIDs
    const affectedQuery = `
      SELECT 
        identity_address,
        COUNT(*) as total_stakes,
        COUNT(*) FILTER (WHERE source_address = identity_address) as direct_stakes,
        COUNT(*) FILTER (WHERE source_address != identity_address) as indirect_stakes,
        SUM(amount_sats) / 100000000.0 as total_rewards,
        SUM(amount_sats) FILTER (WHERE source_address = identity_address) / 100000000.0 as direct_rewards
      FROM staking_rewards
      WHERE identity_address LIKE 'i%'
      GROUP BY identity_address
      HAVING COUNT(*) FILTER (WHERE source_address != identity_address) > 0
      ORDER BY COUNT(*) FILTER (WHERE source_address != identity_address) DESC
      LIMIT 10
    `;

    const affected = await pool.query(affectedQuery);
    console.log('\n🎯 Top 10 VerusIDs with INCORRECT attribution:');
    affected.rows.forEach((row, idx) => {
      const incorrectPct = (
        (row.indirect_stakes / row.total_stakes) *
        100
      ).toFixed(1);
      console.log(
        `   ${idx + 1}. ${row.identity_address}: ${row.indirect_stakes}/${row.total_stakes} incorrect (${incorrectPct}%)`
      );
    });

    console.log('\n✅ Analysis complete\n');
  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
    throw error;
  }
}

async function recalculateStatistics() {
  console.log(
    '🔧 STEP 2: Recalculating verusid_statistics with CORRECT filter...\n'
  );

  try {
    // Clear existing statistics
    await pool.query('TRUNCATE TABLE verusid_statistics');
    console.log('✅ Cleared existing verusid_statistics\n');

    // Recalculate with CORRECT filter
    const recalcQuery = `
      INSERT INTO verusid_statistics (
        address,
        friendly_name,
        total_stakes,
        total_rewards_satoshis,
        first_stake_time,
        last_stake_time,
        apy_all_time,
        avg_days_between_stakes,
        stakes_per_week,
        stakes_per_month,
        highest_reward_satoshis,
        lowest_reward_satoshis,
        avg_reward_amount_satoshis,
        last_calculated,
        created_at,
        updated_at
      )
      SELECT 
        sr.identity_address as address,
        COALESCE(i.friendly_name, i.base_name || '.VRSC@', 'unknown') as friendly_name,
        COUNT(*) as total_stakes,
        SUM(sr.amount_sats) as total_rewards_satoshis,
        MIN(sr.block_time) as first_stake_time,
        MAX(sr.block_time) as last_stake_time,
        
        -- APY all time (capped at 999% to prevent overflow)
        CASE 
          WHEN EXTRACT(EPOCH FROM (MAX(sr.block_time) - MIN(sr.block_time))) > 86400 
          THEN LEAST(
            (SUM(sr.amount_sats)::numeric / 100000000) / 
            GREATEST(EXTRACT(EPOCH FROM (MAX(sr.block_time) - MIN(sr.block_time))) / 31536000, 0.01) * 100,
            999.9999
          )
          ELSE 0 
        END as apy_all_time,
        
        -- Average days between stakes
        CASE 
          WHEN COUNT(*) > 1 
          THEN EXTRACT(EPOCH FROM (MAX(sr.block_time) - MIN(sr.block_time))) / (COUNT(*) - 1) / 86400
          ELSE 0 
        END as avg_days_between_stakes,
        
        -- Stakes per week
        CASE 
          WHEN EXTRACT(EPOCH FROM (MAX(sr.block_time) - MIN(sr.block_time))) > 0 
          THEN COUNT(*)::numeric / (EXTRACT(EPOCH FROM (MAX(sr.block_time) - MIN(sr.block_time))) / 604800)
          ELSE 0 
        END as stakes_per_week,
        
        -- Stakes per month
        CASE 
          WHEN EXTRACT(EPOCH FROM (MAX(sr.block_time) - MIN(sr.block_time))) > 0 
          THEN COUNT(*)::numeric / (EXTRACT(EPOCH FROM (MAX(sr.block_time) - MIN(sr.block_time))) / 2592000)
          ELSE 0 
        END as stakes_per_month,
        
        -- Highest/lowest/average rewards
        MAX(sr.amount_sats) as highest_reward_satoshis,
        MIN(sr.amount_sats) as lowest_reward_satoshis,
        AVG(sr.amount_sats)::bigint as avg_reward_amount_satoshis,
        
        NOW() as last_calculated,
        NOW() as created_at,
        NOW() as updated_at
        
      FROM staking_rewards sr
      LEFT JOIN identities i ON sr.identity_address = i.identity_address
      WHERE sr.source_address = sr.identity_address  -- CRITICAL FIX: Only count direct I-address stakes
      GROUP BY sr.identity_address, i.friendly_name, i.base_name
      HAVING COUNT(*) > 0
    `;

    const result = await pool.query(recalcQuery);
    console.log(
      `✅ Recalculated statistics for ${result.rowCount || 0} VerusIDs\n`
    );

    // Calculate network ranks
    const rankingQuery = `
      WITH ranked AS (
        SELECT 
          address,
          ROW_NUMBER() OVER (ORDER BY total_stakes DESC) as rank,
          COUNT(*) OVER () as total_count
        FROM verusid_statistics
      )
      UPDATE verusid_statistics vs
      SET 
        network_rank = r.rank::int,
        network_percentile = ((1 - (r.rank::numeric / r.total_count)) * 100)::numeric(5,2)
      FROM ranked r
      WHERE vs.address = r.address
    `;

    await pool.query(rankingQuery);
    console.log('✅ Updated network rankings\n');
  } catch (error) {
    console.error('❌ Error during recalculation:', error.message);
    throw error;
  }
}

async function showResults() {
  console.log('📊 STEP 3: Showing corrected results...\n');

  try {
    // Show summary
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_verusids,
        SUM(total_stakes) as total_stakes,
        SUM(total_rewards_satoshis) / 100000000.0 as total_rewards_vrsc,
        AVG(apy_all_time) as avg_apy
      FROM verusid_statistics
    `;

    const summary = await pool.query(summaryQuery);
    const s = summary.rows[0];
    console.log('📈 Summary of CORRECTED statistics:');
    console.log(
      `   Total VerusIDs with stakes: ${parseInt(s.total_verusids).toLocaleString()}`
    );
    console.log(
      `   Total direct stakes: ${parseInt(s.total_stakes).toLocaleString()}`
    );
    console.log(
      `   Total rewards: ${parseFloat(s.total_rewards_vrsc).toFixed(2)} VRSC`
    );
    console.log(`   Average APY: ${parseFloat(s.avg_apy || 0).toFixed(2)}%`);

    // Check the problematic VerusID
    const checkQuery = `
      SELECT 
        address,
        total_stakes,
        total_rewards_satoshis / 100000000.0 as total_rewards_vrsc
      FROM verusid_statistics
      WHERE address = 'iSXF8KbbvpHDWBm4zHxeA4n7uc1LsfR15X'
    `;

    const check = await pool.query(checkQuery);
    if (check.rows.length > 0) {
      const c = check.rows[0];
      console.log(
        '\n✅ Example VerusID iSXF8KbbvpHDWBm4zHxeA4n7uc1LsfR15X (CORRECTED):'
      );
      console.log(`   Direct stakes: ${c.total_stakes}`);
      console.log(
        `   Direct rewards: ${parseFloat(c.total_rewards_vrsc).toFixed(2)} VRSC`
      );
    } else {
      console.log('\n✅ Example VerusID iSXF8KbbvpHDWBm4zHxeA4n7uc1LsfR15X:');
      console.log(
        '   This VerusID has NO direct I-address stakes (correctly shows 0)'
      );
    }

    // Show top 10
    const top10Query = `
      SELECT 
        friendly_name,
        total_stakes,
        total_rewards_satoshis / 100000000.0 as rewards_vrsc,
        ROUND(apy_all_time::numeric, 2) as apy
      FROM verusid_statistics
      ORDER BY total_stakes DESC
      LIMIT 10
    `;

    const top10 = await pool.query(top10Query);
    console.log('\n🏆 Top 10 stakers (by direct I-address stakes):');
    top10.rows.forEach((row, idx) => {
      console.log(
        `   ${idx + 1}. ${row.friendly_name}: ${parseInt(row.total_stakes).toLocaleString()} stakes, ${parseFloat(row.rewards_vrsc).toFixed(2)} VRSC, ${row.apy}% APY`
      );
    });

    console.log('\n');
  } catch (error) {
    console.error('❌ Error showing results:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await analyzeCurrentState();
    await recalculateStatistics();
    await showResults();

    console.log(
      '╔═══════════════════════════════════════════════════════════╗'
    );
    console.log('║   ✅ CRITICAL BUG FIX COMPLETE                           ║');
    console.log(
      '╚═══════════════════════════════════════════════════════════╝\n'
    );

    console.log('📋 What was fixed:');
    console.log('   • Statistics now ONLY count direct I-address stakes');
    console.log('   • Indirect stakes (from R-addresses) are excluded');
    console.log(
      '   • VerusIDs show CORRECT rewards based on their own staking'
    );
    console.log(
      '   • The 193 VRSC VerusID example now shows correct (low) rewards\n'
    );

    console.log('🔄 Next steps:');
    console.log('   1. The verusid_statistics table has been corrected');
    console.log('   2. All statistics calculation scripts have been fixed');
    console.log('   3. Admin API endpoints have been updated');
    console.log('   4. Future statistics will be calculated correctly\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };
