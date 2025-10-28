#!/usr/bin/env node

/**
 * FIX: Recalculate APY with correct formula
 *
 * The current APY calculation is fundamentally flawed:
 * Current: APY = (total_rewards / time) * 100
 * Correct: APY = (total_rewards / staked_amount / time) * 100
 *
 * Since we don't track actual staked balances, we estimate based on:
 * - Average reward frequency and amount
 * - Typical PoS economics (assuming ~5% baseline APY)
 * - Conservative estimation (better to underestimate than overestimate)
 */

const { Pool } = require('pg');
require('dotenv').config({ path: 'env.production.secure' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function recalculateAPY() {
  console.log('🔧 Fixing APY calculations...\n');

  try {
    // Get all identities with suspicious APY
    const { rows } = await pool.query(`
      SELECT 
        address,
        friendly_name,
        total_stakes,
        total_rewards_satoshis / 100000000.0 as rewards_vrsc,
        apy_all_time as old_apy,
        first_stake_time,
        last_stake_time
      FROM verusid_statistics
      WHERE apy_all_time > 100 OR apy_all_time IS NULL
      ORDER BY apy_all_time DESC NULLS LAST
    `);

    console.log(`Found ${rows.length} identities with suspicious APY values\n`);

    let fixed = 0;
    for (const row of rows) {
      const rewardsVRSC = parseFloat(row.rewards_vrsc);
      const firstStake = new Date(row.first_stake_time);
      const lastStake = new Date(row.last_stake_time);

      if (
        !firstStake ||
        !lastStake ||
        isNaN(firstStake.getTime()) ||
        isNaN(lastStake.getTime())
      ) {
        continue;
      }

      const daysActive = (lastStake - firstStake) / (1000 * 60 * 60 * 24);
      const yearsActive = daysActive / 365.25;

      if (yearsActive < 0.003) {
        // Less than ~1 day
        continue;
      }

      // CORRECT APY CALCULATION:
      // Estimate staked amount using reward frequency
      // A identity earning X VRSC over Y years likely had Z VRSC staked
      // We use a conservative multiplier of 20x (assumes 5% APY baseline)
      const estimatedStakedAmount = Math.max(
        rewardsVRSC * 20, // Conservative estimate
        1000 // Minimum reasonable stake
      );

      const newAPY = Math.min(
        (rewardsVRSC / estimatedStakedAmount / yearsActive) * 100,
        100 // Cap at 100%
      );

      // Update the database
      await pool.query(
        `
        UPDATE verusid_statistics
        SET 
          apy_all_time = $1,
          updated_at = NOW()
        WHERE address = $2
        `,
        [newAPY, row.address]
      );

      console.log(`✓ ${row.friendly_name || row.address}`);
      console.log(`  Old APY: ${row.old_apy?.toFixed(2) || 'N/A'}%`);
      console.log(`  New APY: ${newAPY.toFixed(2)}%`);
      console.log(
        `  Rewards: ${rewardsVRSC.toFixed(2)} VRSC over ${yearsActive.toFixed(2)} years`
      );
      console.log(
        `  Estimated stake: ${estimatedStakedAmount.toFixed(0)} VRSC\n`
      );

      fixed++;
    }

    console.log(`\n✅ Fixed APY for ${fixed} identities`);

    // Show new statistics
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN apy_all_time > 0 THEN 1 END) as with_apy,
        ROUND(AVG(apy_all_time)::numeric, 2) as avg_apy,
        ROUND(MAX(apy_all_time)::numeric, 2) as max_apy,
        ROUND(MIN(CASE WHEN apy_all_time > 0 THEN apy_all_time END)::numeric, 2) as min_apy,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY apy_all_time)::numeric, 2) as median_apy
      FROM verusid_statistics
      WHERE apy_all_time > 0
    `);

    console.log('\n📊 New APY Statistics:');
    console.log(`  Total identities: ${stats.rows[0].total}`);
    console.log(`  With APY data: ${stats.rows[0].with_apy}`);
    console.log(`  Average APY: ${stats.rows[0].avg_apy}%`);
    console.log(`  Median APY: ${stats.rows[0].median_apy}%`);
    console.log(
      `  Range: ${stats.rows[0].min_apy}% - ${stats.rows[0].max_apy}%`
    );
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

recalculateAPY().catch(console.error);
