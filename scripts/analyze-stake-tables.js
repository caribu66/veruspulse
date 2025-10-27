#!/usr/bin/env node
/**
 * Analyze both stake tables to understand which should be the primary source
 */

const { Pool } = require('pg');

async function analyzeTables() {
  const dbConfig = {
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  };
  const pool = new Pool(dbConfig);

  try {
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║     STAKE TABLE ANALYSIS & COMPARISON        ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    // Analyze stake_events table
    console.log('📊 STAKE_EVENTS TABLE:');
    console.log('─────────────────────────────────────────────────\n');

    const seSchema = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'stake_events'
      ORDER BY ordinal_position
    `);

    console.log('Schema:');
    seSchema.rows.forEach(col => {
      console.log(
        `  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`
      );
    });

    const seStats = await pool.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT address) as unique_addresses,
        MIN(block_height) as min_block,
        MAX(block_height) as max_block,
        MIN(block_time) as min_time,
        MAX(block_time) as max_time,
        SUM(reward_amount) as total_rewards
      FROM stake_events
    `);

    const se = seStats.rows[0];
    console.log('\nStatistics:');
    console.log(
      `  Total records: ${parseInt(se.total_records).toLocaleString()}`
    );
    console.log(
      `  Unique addresses: ${parseInt(se.unique_addresses).toLocaleString()}`
    );
    console.log(`  Block range: ${se.min_block} - ${se.max_block}`);
    console.log(`  Date range: ${se.min_time} to ${se.max_time}`);
    console.log(
      `  Total rewards: ${se.total_rewards ? (parseFloat(se.total_rewards) / 100000000).toLocaleString() : 0} VRSC`
    );

    // Analyze staking_rewards table
    console.log('\n\n📊 STAKING_REWARDS TABLE:');
    console.log('─────────────────────────────────────────────────\n');

    const srSchema = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'staking_rewards'
      ORDER BY ordinal_position
    `);

    console.log('Schema:');
    srSchema.rows.forEach(col => {
      console.log(
        `  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`
      );
    });

    const srStats = await pool.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT identity_address) as unique_addresses,
        MIN(block_height) as min_block,
        MAX(block_height) as max_block,
        MIN(block_time) as min_time,
        MAX(block_time) as max_time,
        SUM(amount_sats) as total_rewards
      FROM staking_rewards
    `);

    const sr = srStats.rows[0];
    console.log('\nStatistics:');
    console.log(
      `  Total records: ${parseInt(sr.total_records).toLocaleString()}`
    );
    console.log(
      `  Unique addresses: ${parseInt(sr.unique_addresses).toLocaleString()}`
    );
    console.log(`  Block range: ${sr.min_block} - ${sr.max_block}`);
    console.log(`  Date range: ${sr.min_time} to ${sr.max_time}`);
    console.log(
      `  Total rewards: ${sr.total_rewards ? (parseFloat(sr.total_rewards) / 100000000).toLocaleString() : 0} VRSC`
    );

    // Compare coverage
    console.log('\n\n📈 COVERAGE COMPARISON:');
    console.log('─────────────────────────────────────────────────\n');

    const comparison = {
      se_total: parseInt(se.total_records),
      sr_total: parseInt(sr.total_records),
      se_addresses: parseInt(se.unique_addresses),
      sr_addresses: parseInt(sr.unique_addresses),
      se_blocks: se.max_block - se.min_block,
      sr_blocks: sr.max_block - sr.min_block,
    };

    console.log(
      `stake_events:     ${comparison.se_total.toLocaleString()} records, ${comparison.se_addresses.toLocaleString()} addresses, ${comparison.se_blocks.toLocaleString()} blocks`
    );
    console.log(
      `staking_rewards:  ${comparison.sr_total.toLocaleString()} records, ${comparison.sr_addresses.toLocaleString()} addresses, ${comparison.sr_blocks.toLocaleString()} blocks`
    );

    console.log('\n🔍 Which table has more data?');
    if (comparison.se_total > comparison.sr_total) {
      console.log(
        `  ✅ stake_events has ${(comparison.se_total - comparison.sr_total).toLocaleString()} MORE records`
      );
    } else {
      console.log(
        `  ✅ staking_rewards has ${(comparison.sr_total - comparison.se_total).toLocaleString()} MORE records`
      );
    }

    if (comparison.se_addresses > comparison.sr_addresses) {
      console.log(
        `  ✅ stake_events covers ${(comparison.se_addresses - comparison.sr_addresses).toLocaleString()} MORE addresses`
      );
    } else {
      console.log(
        `  ✅ staking_rewards covers ${(comparison.sr_addresses - comparison.se_addresses).toLocaleString()} MORE addresses`
      );
    }

    // Check for overlap
    console.log('\n\n🔄 CHECKING FOR DUPLICATES/OVERLAP:');
    console.log('─────────────────────────────────────────────────\n');

    // For joanna@ specifically
    const joannaCompare = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM stake_events WHERE address = 'iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5') as se_count,
        (SELECT COUNT(*) FROM staking_rewards WHERE identity_address = 'iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5') as sr_count
    `);

    console.log(`joanna@ (iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5):`);
    console.log(`  stake_events: ${joannaCompare.rows[0].se_count} records`);
    console.log(`  staking_rewards: ${joannaCompare.rows[0].sr_count} records`);
    console.log(
      `  Difference: ${Math.abs(joannaCompare.rows[0].sr_count - joannaCompare.rows[0].se_count)} records`
    );

    // Check total VerusIDs
    console.log('\n\n📋 TOTAL VERUSIDS IN DATABASE:');
    console.log('─────────────────────────────────────────────────\n');

    const totalVerusIDs = await pool.query(`
      SELECT COUNT(*) as total FROM identities WHERE identity_address LIKE 'i%'
    `);

    console.log(
      `  Total VerusIDs (I-addresses): ${parseInt(totalVerusIDs.rows[0].total).toLocaleString()}`
    );

    const coverage = await pool.query(`
      SELECT 
        (SELECT COUNT(DISTINCT address) FROM stake_events) as se_coverage,
        (SELECT COUNT(DISTINCT identity_address) FROM staking_rewards) as sr_coverage
    `);

    const totalIDs = parseInt(totalVerusIDs.rows[0].total);
    const seCoverage = parseInt(coverage.rows[0].se_coverage);
    const srCoverage = parseInt(coverage.rows[0].sr_coverage);

    console.log(
      `  stake_events coverage: ${seCoverage.toLocaleString()} (${((seCoverage / totalIDs) * 100).toFixed(1)}%)`
    );
    console.log(
      `  staking_rewards coverage: ${srCoverage.toLocaleString()} (${((srCoverage / totalIDs) * 100).toFixed(1)}%)`
    );

    // Recommendation
    console.log('\n\n💡 RECOMMENDATION:');
    console.log('═════════════════════════════════════════════════\n');

    if (
      comparison.se_total > comparison.sr_total &&
      comparison.se_addresses > comparison.sr_addresses
    ) {
      console.log('  ✅ Use stake_events as the primary table');
      console.log(
        '  📝 Migrate any missing data from staking_rewards to stake_events'
      );
      console.log(
        '  🔧 Update API to query stake_events instead of staking_rewards'
      );
    } else if (
      comparison.sr_total > comparison.se_total &&
      comparison.sr_addresses > comparison.se_addresses
    ) {
      console.log('  ✅ Use staking_rewards as the primary table');
      console.log(
        '  📝 Migrate any missing data from stake_events to staking_rewards'
      );
      console.log('  🔧 Keep API querying staking_rewards (already correct)');
    } else {
      console.log(
        '  ⚠️  Tables have different strengths - need manual analysis'
      );
      console.log('  📝 Merge both tables into one unified source');
    }

    console.log('\n');
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

analyzeTables();
