#!/usr/bin/env node

/**
 * I-Address Staking Rule Validator
 *
 * This script validates that the I-Address Staking Rule is being properly
 * applied to new stakes. It can be run periodically to ensure data integrity.
 *
 * Rule: Only stakes where source_address = identity_address (I-address)
 * should be counted for VerusID statistics.
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function validateIAddressStakingRule() {
  console.log('🔍 Validating I-Address Staking Rule Implementation...\n');

  try {
    // Step 1: Check for recent stakes that violate the rule
    const recentViolationsQuery = `
      SELECT 
        identity_address,
        COUNT(*) as total_stakes,
        COUNT(*) FILTER (WHERE source_address = identity_address) as direct_stakes,
        COUNT(*) FILTER (WHERE source_address != identity_address) as indirect_stakes,
        MAX(block_time) as last_stake_time
      FROM staking_rewards 
      WHERE identity_address LIKE 'i%'
        AND block_time >= NOW() - INTERVAL '7 days'
      GROUP BY identity_address
      HAVING COUNT(*) FILTER (WHERE source_address != identity_address) > 0
      ORDER BY indirect_stakes DESC
    `;

    const violationsResult = await pool.query(recentViolationsQuery);

    if (violationsResult.rows.length > 0) {
      console.log('⚠️  Found VerusIDs with recent indirect stakes:');
      violationsResult.rows.forEach(row => {
        console.log(
          `   ${row.identity_address}: ${row.indirect_stakes}/${row.total_stakes} indirect stakes`
        );
      });
      console.log('');
    } else {
      console.log(
        '✅ No recent violations found - all recent stakes follow the rule\n'
      );
    }

    // Step 2: Check statistics table consistency
    const statsConsistencyQuery = `
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
      LIMIT 10
    `;

    const consistencyResult = await pool.query(statsConsistencyQuery);

    if (consistencyResult.rows.length > 0) {
      console.log('⚠️  Found statistics inconsistencies:');
      consistencyResult.rows.forEach(row => {
        console.log(
          `   ${row.address}: Stats=${row.stats_stakes}, Actual=${row.actual_direct_stakes}, Diff=${row.discrepancy}`
        );
      });
      console.log('');
    } else {
      console.log(
        '✅ Statistics table is consistent with actual direct stakes\n'
      );
    }

    // Step 3: Overall summary
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT identity_address) as total_verusids,
        COUNT(*) FILTER (WHERE source_address = identity_address) as direct_stakes,
        COUNT(*) FILTER (WHERE source_address != identity_address) as indirect_stakes,
        COUNT(*) as total_stakes
      FROM staking_rewards 
      WHERE identity_address LIKE 'i%'
    `;

    const summaryResult = await pool.query(summaryQuery);
    const summary = summaryResult.rows[0];

    console.log('📊 Overall Summary:');
    console.log(`   Total VerusIDs: ${summary.total_verusids}`);
    console.log(`   Total Stakes: ${summary.total_stakes}`);
    console.log(`   Direct I-Address Stakes: ${summary.direct_stakes}`);
    console.log(`   Indirect Stakes: ${summary.indirect_stakes}`);
    console.log(
      `   Rule Compliance: ${((summary.direct_stakes / summary.total_stakes) * 100).toFixed(2)}%`
    );

    // Step 4: Recommendations
    console.log('\n📋 Recommendations:');

    if (violationsResult.rows.length > 0) {
      console.log('   🔧 Run: node scripts/apply-i-address-staking-rule.js');
      console.log('   📝 Update scanning scripts to prevent future violations');
    }

    if (consistencyResult.rows.length > 0) {
      console.log('   🔧 Run: node scripts/fix-statistics-consistency.js');
      console.log('   📝 Update statistics calculation logic');
    }

    if (
      violationsResult.rows.length === 0 &&
      consistencyResult.rows.length === 0
    ) {
      console.log(
        '   ✅ All systems are compliant with the I-Address Staking Rule'
      );
      console.log('   📝 Continue monitoring with regular validation runs');
    }

    console.log('\n🎉 Validation completed successfully!');
  } catch (err) {
    console.error(`❌ Fatal error: ${err.message}`);
    throw err;
  } finally {
    await pool.end();
  }
}

// Run the validation
if (require.main === module) {
  validateIAddressStakingRule().catch(console.error);
}

module.exports = { validateIAddressStakingRule };
