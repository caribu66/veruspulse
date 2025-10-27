#!/usr/bin/env node

/**
 * Fix Best Month Data in VerusID Statistics
 * Calculates and updates best_month and best_month_rewards_satoshis for all VerusIDs
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
});

async function fixBestMonthData() {
  console.log('🔧 Fixing Best Month Data in VerusID Statistics...\n');

  try {
    // Get all VerusIDs that need best month data updated
    const verusIDsResult = await pool.query(`
      SELECT 
        address,
        friendly_name,
        best_month,
        best_month_rewards_satoshis
      FROM verusid_statistics 
      WHERE best_month IS NULL 
         OR best_month_rewards_satoshis IS NULL
         OR best_month_rewards_satoshis = 0
      ORDER BY total_stakes DESC
    `);

    console.log(
      `📊 Found ${verusIDsResult.rows.length} VerusIDs needing best month data update\n`
    );

    let updated = 0;
    let errors = 0;

    for (const verusID of verusIDsResult.rows) {
      try {
        // Calculate best month for this VerusID
        const bestMonthResult = await pool.query(
          `
          SELECT 
            DATE_TRUNC('month', block_time) as month,
            SUM(amount_sats) as monthly_rewards_sats,
            COUNT(*) as monthly_stakes,
            MIN(block_time) as month_start,
            MAX(block_time) as month_end
          FROM staking_rewards 
          WHERE identity_address = $1
          GROUP BY DATE_TRUNC('month', block_time)
          HAVING COUNT(*) > 0
          ORDER BY monthly_rewards_sats DESC
          LIMIT 1
        `,
          [verusID.address]
        );

        if (bestMonthResult.rows.length > 0) {
          const bestMonth = bestMonthResult.rows[0];
          const monthStr = new Date(bestMonth.month)
            .toISOString()
            .split('T')[0];
          const rewardsVRSC = (
            bestMonth.monthly_rewards_sats / 100000000
          ).toFixed(2);

          // Update the verusid_statistics table
          await pool.query(
            `
            UPDATE verusid_statistics 
            SET 
              best_month = $2,
              best_month_rewards_satoshis = $3,
              updated_at = NOW()
            WHERE address = $1
          `,
            [verusID.address, monthStr, bestMonth.monthly_rewards_sats]
          );

          console.log(
            `✅ Updated ${verusID.friendly_name || verusID.address.substring(0, 20)}...`
          );
          console.log(
            `   Best Month: ${monthStr} (${rewardsVRSC} VRSC, ${bestMonth.monthly_stakes} stakes)`
          );
          updated++;
        } else {
          console.log(
            `⚠️  No stakes found for ${verusID.friendly_name || verusID.address.substring(0, 20)}...`
          );
        }
      } catch (error) {
        console.log(`❌ Error updating ${verusID.address}: ${error.message}`);
        errors++;
      }
    }

    console.log(`\n🎉 Best Month Data Fix Complete!`);
    console.log(`   Updated: ${updated} VerusIDs`);
    console.log(`   Errors: ${errors}`);

    // Show some examples of the fixed data
    console.log(`\n📊 Sample Fixed Best Month Data:`);
    const sampleResult = await pool.query(`
      SELECT 
        address,
        friendly_name,
        best_month,
        best_month_rewards_satoshis,
        total_stakes,
        (best_month_rewards_satoshis/100000000.0) as best_month_vrsc
      FROM verusid_statistics 
      WHERE best_month IS NOT NULL 
         AND best_month_rewards_satoshis > 0
      ORDER BY best_month_rewards_satoshis DESC
      LIMIT 5
    `);

    sampleResult.rows.forEach((stat, i) => {
      console.log(
        `  ${i + 1}. ${stat.friendly_name || stat.address.substring(0, 20)}...`
      );
      console.log(`     Best Month: ${stat.best_month}`);
      console.log(
        `     Best Month Rewards: ${stat.best_month_vrsc.toFixed(2)} VRSC`
      );
      console.log(`     Total Stakes: ${stat.total_stakes}`);
      console.log();
    });
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  } finally {
    await pool.end();
  }
}

// Run the fix
if (require.main === module) {
  fixBestMonthData().catch(console.error);
}

module.exports = { fixBestMonthData };
