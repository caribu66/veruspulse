#!/usr/bin/env node

/**
 * Apply I-Address Staking Rule to All VerusIDs
 *
 * This script implements the rule that VerusIDs must have staked directly
 * with their I-address to appear on the VerusID page. VerusIDs that receive
 * staking help from other addresses should show 0 stakes.
 *
 * Rule: Only stakes where source_address = identity_address (I-address)
 * should be counted for VerusID statistics.
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function applyIAddressStakingRule() {
  console.log('🔧 Applying I-Address Staking Rule to All VerusIDs...\n');

  try {
    // Step 1: Get all VerusIDs with staking data
    const verusidsQuery = `
      SELECT DISTINCT identity_address, COUNT(*) as total_stakes
      FROM staking_rewards 
      WHERE identity_address LIKE 'i%'
      GROUP BY identity_address
      ORDER BY total_stakes DESC
    `;

    const verusidsResult = await pool.query(verusidsQuery);
    console.log(
      `📊 Found ${verusidsResult.rows.length} VerusIDs with staking data\n`
    );

    let processedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // Step 2: Process each VerusID
    for (const verusid of verusidsResult.rows) {
      const identityAddress = verusid.identity_address;
      const totalStakes = parseInt(verusid.total_stakes);

      console.log(
        `🔍 Processing ${identityAddress} (${totalStakes} total stakes)...`
      );

      // Count direct I-address stakes
      const directStakesQuery = `
        SELECT COUNT(*) as direct_stakes, COALESCE(SUM(amount_sats), 0) as direct_rewards
        FROM staking_rewards 
        WHERE identity_address = $1 AND source_address = identity_address
      `;

      const directStakesResult = await pool.query(directStakesQuery, [
        identityAddress,
      ]);
      const directStakes = parseInt(directStakesResult.rows[0].direct_stakes);
      const directRewards = parseInt(directStakesResult.rows[0].direct_rewards);

      console.log(`   Direct I-address stakes: ${directStakes}/${totalStakes}`);

      if (directStakes === 0) {
        console.log(
          `   ⚠️  No direct I-address stakes - this VerusID should show 0 stakes`
        );
        skippedCount++;
      } else {
        console.log(`   ✅ Has ${directStakes} direct I-address stakes`);
        updatedCount++;
      }

      // Step 3: Update verusid_statistics table
      const updateStatsQuery = `
        UPDATE verusid_statistics 
        SET 
          total_stakes = $1,
          total_rewards_satoshis = $2
        WHERE address = $3
      `;

      await pool.query(updateStatsQuery, [
        directStakes,
        directRewards,
        identityAddress,
      ]);

      // Step 4: Update identities table with correct primary addresses
      // Convert I-address to R-address for the primary address
      const rAddress = 'R' + identityAddress.substring(1);

      const updateIdentitiesQuery = `
        UPDATE identities 
        SET 
          primary_addresses = $1
        WHERE identity_address = $2
      `;

      await pool.query(updateIdentitiesQuery, [
        JSON.stringify([rAddress]),
        identityAddress,
      ]);

      processedCount++;

      // Progress indicator
      if (processedCount % 100 === 0) {
        console.log(
          `   📈 Processed ${processedCount}/${verusidsResult.rows.length} VerusIDs...`
        );
      }

      console.log('');
    }

    // Step 5: Summary
    console.log('📈 Summary:');
    console.log(`   ✅ Processed: ${processedCount} VerusIDs`);
    console.log(
      `   📊 Updated: ${updatedCount} VerusIDs with direct I-address stakes`
    );
    console.log(
      `   ⚠️  Skipped: ${skippedCount} VerusIDs with no direct I-address stakes`
    );

    // Step 6: Verify the changes
    console.log('\n🔍 Verification:');
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

    console.log(`   Total VerusIDs: ${stats.total_verusids}`);
    console.log(`   Total Direct Stakes: ${stats.total_direct_stakes}`);
    console.log(
      `   VerusIDs with Direct Stakes: ${stats.verusids_with_stakes}`
    );

    console.log('\n🎉 I-Address Staking Rule Applied Successfully!');
    console.log('\n📋 What This Means:');
    console.log(
      '   • Only VerusIDs that staked directly with their I-address will show staking statistics'
    );
    console.log(
      '   • VerusIDs that received staking help from other addresses will show 0 stakes'
    );
    console.log(
      '   • The VerusID page now correctly implements the staking rule'
    );
  } catch (err) {
    console.error(`❌ Fatal error: ${err.message}`);
    throw err;
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  applyIAddressStakingRule().catch(console.error);
}

module.exports = { applyIAddressStakingRule };
