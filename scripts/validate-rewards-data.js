#!/usr/bin/env node

/**
 * Data Validation Script: Validate Staking Rewards Data
 *
 * This script validates that staking rewards data is within reasonable limits
 * and can be used to monitor data quality
 */

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});

// Validation thresholds
const VALIDATION_THRESHOLDS = {
  MAX_REWARD_VRSC: 1000000, // 1M VRSC maximum
  MAX_REWARD_SATS: 100000000000, // 1M VRSC in satoshis
  MIN_REWARD_VRSC: 0.0001, // 0.0001 VRSC minimum
  MIN_REWARD_SATS: 10000, // 0.0001 VRSC in satoshis
  MAX_DAILY_REWARDS_VRSC: 10000, // 10K VRSC per day maximum
  MAX_DAILY_REWARDS_SATS: 1000000000000, // 10K VRSC in satoshis
};

async function validateRewardsData() {
  console.log('🔍 Starting validation of staking rewards data...');

  try {
    const issues = [];

    // 1. Check for individual rewards that are too large
    console.log('📊 Checking individual reward amounts...');
    const largeRewardsQuery = `
      SELECT 
        identity_address,
        txid,
        amount_sats,
        (amount_sats / 100000000.0) as amount_vrsc,
        block_time
      FROM staking_rewards
      WHERE amount_sats > $1
      ORDER BY amount_sats DESC
      LIMIT 20
    `;

    const largeRewardsResult = await pool.query(largeRewardsQuery, [
      VALIDATION_THRESHOLDS.MAX_REWARD_SATS,
    ]);

    if (largeRewardsResult.rows.length > 0) {
      issues.push({
        type: 'LARGE_REWARDS',
        count: largeRewardsResult.rows.length,
        description: 'Individual rewards exceed 1M VRSC',
        examples: largeRewardsResult.rows.slice(0, 5),
      });
    }

    // 2. Check for individual rewards that are too small
    const smallRewardsQuery = `
      SELECT 
        identity_address,
        txid,
        amount_sats,
        (amount_sats / 100000000.0) as amount_vrsc,
        block_time
      FROM staking_rewards
      WHERE amount_sats < $1 AND amount_sats > 0
      ORDER BY amount_sats ASC
      LIMIT 20
    `;

    const smallRewardsResult = await pool.query(smallRewardsQuery, [
      VALIDATION_THRESHOLDS.MIN_REWARD_SATS,
    ]);

    if (smallRewardsResult.rows.length > 0) {
      issues.push({
        type: 'SMALL_REWARDS',
        count: smallRewardsResult.rows.length,
        description: 'Individual rewards below 0.0001 VRSC',
        examples: smallRewardsResult.rows.slice(0, 5),
      });
    }

    // 3. Check for daily totals that are too large
    console.log('📅 Checking daily reward totals...');
    const dailyTotalsQuery = `
      SELECT 
        identity_address,
        DATE(block_time) as stake_date,
        COUNT(*) as stake_count,
        SUM(amount_sats) as total_rewards_sats,
        (SUM(amount_sats) / 100000000.0) as total_rewards_vrsc
      FROM staking_rewards
      GROUP BY identity_address, DATE(block_time)
      HAVING SUM(amount_sats) > $1
      ORDER BY SUM(amount_sats) DESC
      LIMIT 20
    `;

    const dailyTotalsResult = await pool.query(dailyTotalsQuery, [
      VALIDATION_THRESHOLDS.MAX_DAILY_REWARDS_SATS,
    ]);

    if (dailyTotalsResult.rows.length > 0) {
      issues.push({
        type: 'LARGE_DAILY_TOTALS',
        count: dailyTotalsResult.rows.length,
        description: 'Daily reward totals exceed 10K VRSC',
        examples: dailyTotalsResult.rows.slice(0, 5),
      });
    }

    // 4. Check for VerusID totals that are too large
    console.log('👤 Checking VerusID total rewards...');
    const verusidTotalsQuery = `
      SELECT 
        identity_address,
        COUNT(*) as total_stakes,
        SUM(amount_sats) as total_rewards_sats,
        (SUM(amount_sats) / 100000000.0) as total_rewards_vrsc
      FROM staking_rewards
      GROUP BY identity_address
      HAVING SUM(amount_sats) > $1
      ORDER BY SUM(amount_sats) DESC
      LIMIT 20
    `;

    const verusidTotalsResult = await pool.query(verusidTotalsQuery, [
      VALIDATION_THRESHOLDS.MAX_REWARD_SATS,
    ]);

    if (verusidTotalsResult.rows.length > 0) {
      issues.push({
        type: 'LARGE_VERUSID_TOTALS',
        count: verusidTotalsResult.rows.length,
        description: 'VerusID total rewards exceed 1M VRSC',
        examples: verusidTotalsResult.rows.slice(0, 5),
      });
    }

    // 5. Check for network total
    console.log('🌐 Checking network total rewards...');
    const networkTotalQuery = `
      SELECT 
        COUNT(*) as total_records,
        SUM(amount_sats) as total_rewards_sats,
        (SUM(amount_sats) / 100000000.0) as total_rewards_vrsc
      FROM staking_rewards
    `;

    const networkTotalResult = await pool.query(networkTotalQuery);
    const networkTotal = networkTotalResult.rows[0];

    // Network total should be reasonable (less than 100M VRSC total supply)
    const maxReasonableNetworkTotal = 100000000; // 100M VRSC
    if (networkTotal.total_rewards_vrsc > maxReasonableNetworkTotal) {
      issues.push({
        type: 'LARGE_NETWORK_TOTAL',
        count: 1,
        description: `Network total rewards (${networkTotal.total_rewards_vrsc.toFixed(2)} VRSC) exceed reasonable limit`,
        examples: [networkTotal],
      });
    }

    // 6. Check for duplicate transactions
    console.log('🔄 Checking for duplicate transactions...');
    const duplicatesQuery = `
      SELECT 
        txid,
        vout,
        COUNT(*) as duplicate_count
      FROM staking_rewards
      GROUP BY txid, vout
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 20
    `;

    const duplicatesResult = await pool.query(duplicatesQuery);

    if (duplicatesResult.rows.length > 0) {
      issues.push({
        type: 'DUPLICATE_TRANSACTIONS',
        count: duplicatesResult.rows.length,
        description: 'Duplicate transaction records found',
        examples: duplicatesResult.rows.slice(0, 5),
      });
    }

    // Report results
    console.log('\n📋 Validation Results:');
    console.log(`   Total records: ${networkTotal.total_records}`);
    console.log(
      `   Total rewards: ${networkTotal.total_rewards_vrsc.toFixed(2)} VRSC`
    );
    console.log(`   Issues found: ${issues.length}`);

    if (issues.length === 0) {
      console.log('✅ All validations passed! Data looks good.');
    } else {
      console.log('\n🚨 Issues found:');
      issues.forEach((issue, index) => {
        console.log(`\n   ${index + 1}. ${issue.type}: ${issue.description}`);
        console.log(`      Count: ${issue.count}`);
        if (issue.examples && issue.examples.length > 0) {
          console.log('      Examples:');
          issue.examples.slice(0, 3).forEach((example, i) => {
            if (
              issue.type === 'LARGE_REWARDS' ||
              issue.type === 'SMALL_REWARDS'
            ) {
              console.log(
                `         ${i + 1}. ${example.identity_address}: ${example.amount_vrsc.toFixed(2)} VRSC`
              );
            } else if (issue.type === 'LARGE_DAILY_TOTALS') {
              console.log(
                `         ${i + 1}. ${example.identity_address} (${example.stake_date}): ${example.total_rewards_vrsc.toFixed(2)} VRSC`
              );
            } else if (issue.type === 'LARGE_VERUSID_TOTALS') {
              console.log(
                `         ${i + 1}. ${example.identity_address}: ${example.total_rewards_vrsc.toFixed(2)} VRSC (${example.total_stakes} stakes)`
              );
            } else if (issue.type === 'DUPLICATE_TRANSACTIONS') {
              console.log(
                `         ${i + 1}. ${example.txid}:${example.vout} (${example.duplicate_count} duplicates)`
              );
            }
          });
        }
      });
    }

    // Return validation results
    return {
      isValid: issues.length === 0,
      issues: issues,
      stats: {
        totalRecords: parseInt(networkTotal.total_records),
        totalRewardsVRSC: networkTotal.total_rewards_vrsc,
        issueCount: issues.length,
      },
    };
  } catch (error) {
    console.error('❌ Error during validation:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the validation
if (require.main === module) {
  validateRewardsData()
    .then(result => {
      if (result.isValid) {
        console.log('✅ Validation completed successfully');
        process.exit(0);
      } else {
        console.log('❌ Validation found issues');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}

module.exports = { validateRewardsData, VALIDATION_THRESHOLDS };
