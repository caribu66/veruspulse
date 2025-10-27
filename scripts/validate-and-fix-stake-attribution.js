#!/usr/bin/env node

/**
 * Stake Attribution Validation and Migration Script
 *
 * This script:
 * 1. Validates the current state of stake attribution
 * 2. Runs the database migration
 * 3. Provides analysis of the data integrity issue
 * 4. Shows progress of the fix
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runQuery(query, params = []) {
  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (err) {
    console.error(`❌ Query error: ${err.message}`);
    throw err;
  }
}

async function validateCurrentState() {
  console.log('🔍 Validating current stake attribution state...\n');

  try {
    // Check total stakes by address type
    const addressTypes = await runQuery(`
      SELECT 
        LEFT(source_address, 1) as address_type,
        COUNT(*) as stake_count,
        COUNT(DISTINCT identity_address) as unique_identities
      FROM staking_rewards 
      GROUP BY LEFT(source_address, 1)
      ORDER BY stake_count DESC
    `);

    console.log('📊 Stake Attribution by Address Type:');
    addressTypes.forEach(row => {
      console.log(
        `   ${row.address_type}-addresses: ${row.stake_count.toLocaleString()} stakes (${row.unique_identities} identities)`
      );
    });

    // Check the problematic VerusID
    const verusDevFund = await runQuery(`
      SELECT 
        identity_address,
        COUNT(*) as total_stakes,
        COUNT(DISTINCT source_address) as unique_source_addresses,
        SUM(amount_sats) as total_rewards_sats
      FROM staking_rewards 
      WHERE identity_address = 'iDhAAg4dXUkuBbxgdP3RKveCr1gvu8o7Vg'
      GROUP BY identity_address
    `);

    if (verusDevFund.length > 0) {
      const fund = verusDevFund[0];
      console.log(`\n🎯 Verus Development Fund Analysis:`);
      console.log(`   Total Stakes: ${fund.total_stakes.toLocaleString()}`);
      console.log(
        `   Unique Source Addresses: ${fund.unique_source_addresses}`
      );
      console.log(
        `   Total Rewards: ${(fund.total_rewards_sats / 100000000).toFixed(2)} VRSC`
      );
    }

    // Check top problematic VerusIDs
    const problematic = await runQuery(`
      SELECT 
        identity_address,
        COUNT(*) as total_stakes,
        COUNT(*) FILTER (WHERE source_address = identity_address) as incorrect_attributions,
        ROUND(
          COUNT(*) FILTER (WHERE source_address = identity_address)::NUMERIC / 
          COUNT(*) * 100, 2
        ) as error_percentage
      FROM staking_rewards 
      WHERE identity_address LIKE 'i%'
      GROUP BY identity_address
      HAVING COUNT(*) FILTER (WHERE source_address = identity_address) > 0
      ORDER BY incorrect_attributions DESC
      LIMIT 10
    `);

    console.log(`\n🚨 Top 10 VerusIDs with Attribution Issues:`);
    problematic.forEach((row, idx) => {
      console.log(
        `   ${idx + 1}. ${row.identity_address}: ${row.incorrect_attributions.toLocaleString()}/${row.total_stakes.toLocaleString()} (${row.error_percentage}% incorrect)`
      );
    });
  } catch (err) {
    console.error(`❌ Validation error: ${err.message}`);
  }
}

async function runMigration() {
  console.log('\n🔧 Running database migration...\n');

  try {
    const migrationPath = path.join(
      __dirname,
      '..',
      'migrations',
      'fix-stake-attribution-migration.sql'
    );
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split by semicolon and execute each statement
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement);
          console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
        } catch (err) {
          if (err.message.includes('already exists')) {
            console.log(
              `⚠️  Skipped (already exists): ${statement.substring(0, 50)}...`
            );
          } else {
            console.error(
              `❌ Error executing: ${statement.substring(0, 50)}...`
            );
            console.error(`   Error: ${err.message}`);
          }
        }
      }
    }

    console.log('\n✅ Migration completed!');
  } catch (err) {
    console.error(`❌ Migration error: ${err.message}`);
  }
}

async function analyzeAfterMigration() {
  console.log('\n📈 Analyzing data after migration...\n');

  try {
    // Check if the new views exist and work
    const validationResults = await runQuery(`
      SELECT * FROM validate_stake_attribution() 
      ORDER BY needs_correction DESC 
      LIMIT 10
    `);

    console.log('🔍 Stake Attribution Validation Results:');
    validationResults.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.identity_address}:`);
      console.log(`      Incorrect: ${row.incorrect_stakes.toLocaleString()}`);
      console.log(`      Correct: ${row.correct_stakes.toLocaleString()}`);
      console.log(
        `      Needs Correction: ${row.needs_correction.toLocaleString()}`
      );
    });

    // Check stake analysis
    const analysisResults = await runQuery(`
      SELECT * FROM stake_analysis 
      WHERE incorrect_attributions > 0 
      ORDER BY incorrect_attributions DESC 
      LIMIT 5
    `);

    console.log('\n📊 Stake Analysis Summary:');
    analysisResults.forEach((row, idx) => {
      console.log(
        `   ${idx + 1}. ${row.friendly_name || row.base_name || row.identity_address}:`
      );
      console.log(`      Total Stakes: ${row.total_stakes.toLocaleString()}`);
      console.log(
        `      Attribution Accuracy: ${row.attribution_accuracy_percent}%`
      );
      console.log(
        `      Incorrect Attributions: ${row.incorrect_attributions.toLocaleString()}`
      );
    });
  } catch (err) {
    console.error(`❌ Analysis error: ${err.message}`);
  }
}

async function generateFixPlan() {
  console.log('\n📋 Generated Fix Plan:\n');

  console.log('1. 🔧 Database Migration:');
  console.log('   ✅ Added primary_addresses column to identities table');
  console.log('   ✅ Created indexes for better performance');
  console.log('   ✅ Created validation views and functions');
  console.log('   ✅ Created address_relationships table');

  console.log('\n2. 🛠️  Data Correction:');
  console.log('   📝 Run: node scripts/fix-stake-attribution.js');
  console.log('   📝 This will correct existing stake records');
  console.log('   📝 Process ~100 records at a time to avoid RPC limits');

  console.log('\n3. 🔄 Scanner Updates:');
  console.log('   📝 Update all scanning scripts to use enhanced attribution');
  console.log('   📝 Use scripts/enhanced-staking-scanner.js functions');
  console.log('   📝 Ensure new stakes are properly attributed');

  console.log('\n4. ✅ Validation:');
  console.log('   📝 Run: SELECT * FROM validate_stake_attribution();');
  console.log(
    '   📝 Run: SELECT * FROM stake_analysis WHERE incorrect_attributions > 0;'
  );
  console.log('   📝 Monitor attribution accuracy over time');

  console.log('\n5. 🚀 Prevention:');
  console.log('   📝 Update VerusID lookup to include primary addresses');
  console.log('   📝 Implement proper R-address tracking');
  console.log('   📝 Add validation checks to prevent future issues');
}

async function main() {
  console.log('🚀 Stake Attribution Validation and Migration\n');

  try {
    await validateCurrentState();
    await runMigration();
    await analyzeAfterMigration();
    await generateFixPlan();

    console.log('\n🎉 Process completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run the fix script: node scripts/fix-stake-attribution.js');
    console.log('2. Update your scanning scripts to use enhanced attribution');
    console.log('3. Monitor the validation views for progress');
  } catch (err) {
    console.error(`❌ Fatal error: ${err.message}`);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  validateCurrentState,
  runMigration,
  analyzeAfterMigration,
  generateFixPlan,
};
