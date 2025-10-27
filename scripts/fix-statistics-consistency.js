#!/usr/bin/env node

/**
 * Fix Statistics Consistency
 *
 * This script ensures that the verusid_statistics table accurately reflects
 * the actual direct I-address stakes in the staking_rewards table.
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixStatisticsConsistency() {
  console.log('🔧 Fixing Statistics Consistency...\n');

  try {
    // Step 1: Update verusid_statistics with correct direct stake counts
    const updateQuery = `
      UPDATE verusid_statistics 
      SET 
        total_stakes = COALESCE(direct_stakes.count, 0),
        total_rewards_satoshis = COALESCE(direct_stakes.total_rewards, 0),
        first_stake_time = direct_stakes.first_stake,
        last_stake_time = direct_stakes.last_stake
      FROM (
        SELECT 
          identity_address,
          COUNT(*) as count,
          SUM(amount_sats) as total_rewards,
          MIN(block_time) as first_stake,
          MAX(block_time) as last_stake
        FROM staking_rewards 
        WHERE source_address = identity_address
        GROUP BY identity_address
      ) as direct_stakes
      WHERE verusid_statistics.address = direct_stakes.identity_address
    `;

    const updateResult = await pool.query(updateQuery);
    console.log(`✅ Updated ${updateResult.rowCount} VerusID statistics`);

    // Step 2: Set statistics to 0 for VerusIDs with no direct stakes
    const zeroStatsQuery = `
      UPDATE verusid_statistics 
      SET 
        total_stakes = 0,
        total_rewards_satoshis = 0,
        first_stake_time = NULL,
        last_stake_time = NULL
      WHERE address LIKE 'i%'
        AND address NOT IN (
          SELECT DISTINCT identity_address 
          FROM staking_rewards 
          WHERE source_address = identity_address
        )
    `;

    const zeroResult = await pool.query(zeroStatsQuery);
    console.log(
      `✅ Set ${zeroResult.rowCount} VerusIDs to 0 stakes (no direct staking)`
    );

    // Step 3: Verify consistency
    const verificationQuery = `
      SELECT 
        COUNT(*) as total_verusids,
        SUM(total_stakes) as total_direct_stakes,
        COUNT(*) FILTER (WHERE total_stakes > 0) as verusids_with_stakes
      FROM verusid_statistics 
      WHERE address LIKE 'i%'
    `;

    const verificationResult = await pool.query(verificationQuery);
    const stats = verificationResult.rows[0];

    console.log('\n📊 Verification Results:');
    console.log(`   Total VerusIDs: ${stats.total_verusids}`);
    console.log(`   Total Direct Stakes: ${stats.total_direct_stakes}`);
    console.log(
      `   VerusIDs with Direct Stakes: ${stats.verusids_with_stakes}`
    );

    // Step 4: Check for any remaining inconsistencies
    const inconsistencyQuery = `
      SELECT 
        vs.address,
        vs.total_stakes as stats_stakes,
        COUNT(sr.id) as actual_direct_stakes,
        (vs.total_stakes - COUNT(sr.id)) as discrepancy
      FROM verusid_statistics vs
      LEFT JOIN staking_rewards sr ON vs.address = sr.identity_address 
        AND sr.source_address = sr.identity_address
      WHERE vs.address LIKE 'i%'
      GROUP BY vs.address, vs.total_stakes
      HAVING vs.total_stakes != COUNT(sr.id)
      ORDER BY ABS(vs.total_stakes - COUNT(sr.id)) DESC
      LIMIT 5
    `;

    const inconsistencyResult = await pool.query(inconsistencyQuery);

    if (inconsistencyResult.rows.length > 0) {
      console.log('\n⚠️  Remaining inconsistencies:');
      inconsistencyResult.rows.forEach(row => {
        console.log(
          `   ${row.address}: Stats=${row.stats_stakes}, Actual=${row.actual_direct_stakes}, Diff=${row.discrepancy}`
        );
      });
    } else {
      console.log('\n✅ All statistics are now consistent!');
    }

    console.log('\n🎉 Statistics consistency fix completed!');
  } catch (err) {
    console.error(`❌ Fatal error: ${err.message}`);
    throw err;
  } finally {
    await pool.end();
  }
}

// Run the fix
if (require.main === module) {
  fixStatisticsConsistency().catch(console.error);
}

module.exports = { fixStatisticsConsistency };
