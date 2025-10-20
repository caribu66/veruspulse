#!/usr/bin/env node
/**
 * Recalculate Statistics for All VerusIDs
 * 
 * This script fixes the mismatch between staking_rewards and verusid_statistics tables
 * by recalculating all statistics from actual staking reward data.
 * 
 * Usage:
 *   node scripts/recalculate-all-stats.js
 */

const { Pool } = require('pg');

// Configuration
const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db';

const pool = new Pool({ connectionString: DATABASE_URL });

// Calculate APY based on rewards and time period
function calculateAPY(totalRewardsSats, firstStake, lastStake, estimatedStake = 10000) {
  if (!firstStake || !lastStake) return 0;
  
  const totalRewardsVRSC = totalRewardsSats / 100000000;
  const daysDiff = (new Date(lastStake) - new Date(firstStake)) / (1000 * 60 * 60 * 24);
  
  if (daysDiff <= 0) return 0;
  
  // Simple APY calculation: (rewards / estimated_stake) * (365 / days) * 100
  const yearlyMultiplier = 365 / daysDiff;
  const apy = (totalRewardsVRSC / estimatedStake) * yearlyMultiplier * 100;
  
  return Math.min(apy, 1000); // Cap at 1000% to avoid extreme values
}

// Get all identities with staking rewards
async function getIdentitiesWithStakes() {
  const query = `
    SELECT DISTINCT identity_address
    FROM staking_rewards
    ORDER BY identity_address
  `;
  const result = await pool.query(query);
  return result.rows.map(row => row.identity_address);
}

// Recalculate statistics for a single identity
async function recalculateStats(identityAddress) {
  // Get aggregated stats from staking_rewards
  const statsQuery = `
    SELECT 
      COUNT(*) as total_stakes,
      SUM(amount_sats) as total_rewards_satoshis,
      MIN(block_time) as first_stake_time,
      MAX(block_time) as last_stake_time,
      MAX(amount_sats) as highest_reward_satoshis,
      MIN(amount_sats) as lowest_reward_satoshis,
      AVG(amount_sats) as avg_reward_amount_satoshis
    FROM staking_rewards
    WHERE identity_address = $1
  `;
  
  const result = await pool.query(statsQuery, [identityAddress]);
  const stats = result.rows[0];
  
  if (!stats || stats.total_stakes === '0') {
    return null; // No stakes for this identity
  }
  
  // Calculate APY
  const apyAllTime = calculateAPY(
    parseFloat(stats.total_rewards_satoshis),
    stats.first_stake_time,
    stats.last_stake_time
  );
  
  // Calculate average days between stakes
  let avgDaysBetween = 0;
  if (stats.total_stakes > 1) {
    const daysDiff = (new Date(stats.last_stake_time) - new Date(stats.first_stake_time)) / (1000 * 60 * 60 * 24);
    avgDaysBetween = daysDiff / (parseInt(stats.total_stakes) - 1);
  }
  
  // Calculate stakes per week/month
  const totalDays = (new Date(stats.last_stake_time) - new Date(stats.first_stake_time)) / (1000 * 60 * 60 * 24) || 1;
  const stakesPerWeek = (parseInt(stats.total_stakes) / totalDays) * 7;
  const stakesPerMonth = (parseInt(stats.total_stakes) / totalDays) * 30;
  
  return {
    address: identityAddress,
    total_stakes: parseInt(stats.total_stakes),
    total_rewards_satoshis: stats.total_rewards_satoshis,
    first_stake_time: stats.first_stake_time,
    last_stake_time: stats.last_stake_time,
    apy_all_time: apyAllTime,
    avg_days_between_stakes: avgDaysBetween,
    stakes_per_week: stakesPerWeek,
    stakes_per_month: stakesPerMonth,
    highest_reward_satoshis: stats.highest_reward_satoshis,
    lowest_reward_satoshis: stats.lowest_reward_satoshis,
    avg_reward_amount_satoshis: Math.floor(parseFloat(stats.avg_reward_amount_satoshis)),
  };
}

// Update or insert statistics
async function upsertStats(stats) {
  const query = `
    INSERT INTO verusid_statistics (
      address,
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
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
    ON CONFLICT (address) 
    DO UPDATE SET
      total_stakes = EXCLUDED.total_stakes,
      total_rewards_satoshis = EXCLUDED.total_rewards_satoshis,
      first_stake_time = EXCLUDED.first_stake_time,
      last_stake_time = EXCLUDED.last_stake_time,
      apy_all_time = EXCLUDED.apy_all_time,
      avg_days_between_stakes = EXCLUDED.avg_days_between_stakes,
      stakes_per_week = EXCLUDED.stakes_per_week,
      stakes_per_month = EXCLUDED.stakes_per_month,
      highest_reward_satoshis = EXCLUDED.highest_reward_satoshis,
      lowest_reward_satoshis = EXCLUDED.lowest_reward_satoshis,
      avg_reward_amount_satoshis = EXCLUDED.avg_reward_amount_satoshis,
      last_calculated = NOW(),
      updated_at = NOW()
  `;
  
  await pool.query(query, [
    stats.address,
    stats.total_stakes,
    stats.total_rewards_satoshis,
    stats.first_stake_time,
    stats.last_stake_time,
    stats.apy_all_time,
    stats.avg_days_between_stakes,
    stats.stakes_per_week,
    stats.stakes_per_month,
    stats.highest_reward_satoshis,
    stats.lowest_reward_satoshis,
    stats.avg_reward_amount_satoshis,
  ]);
}

// Main function
async function main() {
  console.log('🔄 Recalculating Statistics for All VerusIDs\n');
  console.log('━'.repeat(60));
  
  try {
    // Get all identities with staking rewards
    console.log('\n📊 Step 1: Finding VerusIDs with staking rewards...');
    const identities = await getIdentitiesWithStakes();
    const total = identities.length;
    
    console.log(`   ✅ Found ${total} VerusIDs with staking data\n`);
    
    if (total === 0) {
      console.log('❌ No staking data found in database');
      return;
    }
    
    console.log('📈 Step 2: Recalculating statistics...\n');
    
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    const startTime = Date.now();
    
    for (let i = 0; i < identities.length; i++) {
      const identityAddress = identities[i];
      const progress = ((i + 1) / total * 100).toFixed(1);
      
      try {
        const stats = await recalculateStats(identityAddress);
        
        if (stats) {
          await upsertStats(stats);
          updated++;
          
          // Show progress every 100 identities or at milestones
          if ((i + 1) % 100 === 0 || i === 0 || i === total - 1) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const rate = ((i + 1) / elapsed).toFixed(1);
            const eta = ((total - i - 1) / rate).toFixed(0);
            
            process.stdout.write(
              `\r   [${progress}%] ${i + 1}/${total} ` +
              `(${rate}/s, ETA: ${eta}s) ` +
              `✅ ${updated} updated, ⏭️  ${skipped} skipped, ❌ ${errors} errors`
            );
          }
        } else {
          skipped++;
        }
      } catch (error) {
        errors++;
        if (errors <= 5) {
          console.error(`\n   ⚠️  Error processing ${identityAddress}: ${error.message}`);
        }
      }
    }
    
    console.log('\n\n━'.repeat(60));
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n📊 Results Summary:');
    console.log(`   ✅ Updated: ${updated} VerusIDs`);
    console.log(`   ⏭️  Skipped: ${skipped} VerusIDs`);
    console.log(`   ❌ Errors: ${errors} VerusIDs`);
    console.log(`   ⏱️  Time: ${totalTime}s`);
    console.log(`   ⚡ Rate: ${(total / totalTime).toFixed(1)} VerusIDs/sec`);
    
    // Show some sample statistics
    console.log('\n📈 Sample Statistics:');
    const sampleQuery = `
      SELECT 
        address,
        total_stakes,
        total_rewards_satoshis / 100000000.0 as total_vrsc,
        ROUND(apy_all_time::numeric, 2) as apy
      FROM verusid_statistics
      WHERE total_stakes > 0
      ORDER BY total_stakes DESC
      LIMIT 5
    `;
    
    const samples = await pool.query(sampleQuery);
    console.log('\n   Top 5 Stakers:');
    samples.rows.forEach((row, idx) => {
      console.log(
        `   ${idx + 1}. ${row.address.substring(0, 20)}... ` +
        `${row.total_stakes} stakes, ${parseFloat(row.total_vrsc).toFixed(2)} VRSC, ` +
        `${row.apy}% APY`
      );
    });
    
    console.log('\n✨ Statistics recalculation complete!');
    console.log('\n💡 Tip: You can now browse VerusIDs with accurate staking data:');
    console.log('   http://localhost:3000/verusid/browse\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    throw error;
  }
}

// Run the script
main()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Script failed:', error.message);
    pool.end();
    process.exit(1);
  });

