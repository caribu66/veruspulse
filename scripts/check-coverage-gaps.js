#!/usr/bin/env node
/**
 * Check coverage gaps in staking_rewards table
 */

const { Pool } = require('pg');

async function checkCoverageGaps() {
  const dbConfig = {
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  };
  const pool = new Pool(dbConfig);

  try {
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║      STAKING_REWARDS COVERAGE ANALYSIS       ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    // Get block range in staking_rewards
    const rangeResult = await pool.query(`
      SELECT 
        MIN(block_height) as min_block,
        MAX(block_height) as max_block,
        MIN(block_time) as min_time,
        MAX(block_time) as max_time,
        COUNT(DISTINCT block_height) as unique_blocks,
        COUNT(*) as total_stakes
      FROM staking_rewards
    `);

    const range = rangeResult.rows[0];
    console.log('📊 Current staking_rewards coverage:');
    console.log(
      `   Block range: ${parseInt(range.min_block).toLocaleString()} - ${parseInt(range.max_block).toLocaleString()}`
    );
    console.log(`   Date range: ${range.min_time} to ${range.max_time}`);
    console.log(
      `   Unique blocks with stakes: ${parseInt(range.unique_blocks).toLocaleString()}`
    );
    console.log(
      `   Total stake records: ${parseInt(range.total_stakes).toLocaleString()}\n`
    );

    // Check against VerusID activation
    const VERUSID_ACTIVATION = 800200;
    const missingBlocks = parseInt(range.min_block) - VERUSID_ACTIVATION;

    console.log('🔍 Gap analysis:');
    console.log(
      `   VerusID activation block: ${VERUSID_ACTIVATION.toLocaleString()}`
    );
    console.log(
      `   First stake in database: ${parseInt(range.min_block).toLocaleString()}`
    );
    if (missingBlocks > 0) {
      console.log(
        `   ⚠️  MISSING: ${missingBlocks.toLocaleString()} blocks (${VERUSID_ACTIVATION.toLocaleString()} - ${(parseInt(range.min_block) - 1).toLocaleString()})`
      );
      console.log(
        `   ⚠️  This covers approximately ${Math.round(missingBlocks / 1440)} days of early staking\n`
      );
    } else {
      console.log(`   ✅ Complete coverage from VerusID activation!\n`);
    }

    // Get current blockchain height
    console.log('🔗 Checking current blockchain height...');
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      const rpcUser = process.env.VERUS_RPC_USER || 'verus';
      const rpcPass = process.env.VERUS_RPC_PASSWORD || 'verus';
      const rpcHost = process.env.VERUS_RPC_HOST || '127.0.0.1';
      const rpcPort = process.env.VERUS_RPC_PORT || '18843';

      const rpcData = JSON.stringify({
        jsonrpc: '1.0',
        id: 'check',
        method: 'getblockcount',
        params: [],
      });

      const escapedData = rpcData.replace(/'/g, "'\\''");
      const cmd = `curl -s --user ${rpcUser}:${rpcPass} --data-binary '${escapedData}' -H 'content-type: text/plain;' http://${rpcHost}:${rpcPort}/`;

      const { stdout } = await execAsync(cmd);
      const result = JSON.parse(stdout);
      const currentHeight = result.result;

      console.log(
        `   Current blockchain height: ${currentHeight.toLocaleString()}`
      );
      console.log(
        `   Last stake in database: ${parseInt(range.max_block).toLocaleString()}`
      );

      const behindBlocks = currentHeight - parseInt(range.max_block);
      if (behindBlocks > 0) {
        console.log(
          `   ⚠️  Database is ${behindBlocks.toLocaleString()} blocks behind\n`
        );
      } else {
        console.log(`   ✅ Database is up to date!\n`);
      }
    } catch (error) {
      console.log(`   ⚠️  Could not get current height: ${error.message}\n`);
    }

    // Check VerusID coverage
    console.log('📋 VerusID coverage:');
    const totalIDs = await pool.query(`
      SELECT COUNT(*) as total FROM identities WHERE identity_address LIKE 'i%'
    `);

    const withStakes = await pool.query(`
      SELECT COUNT(DISTINCT identity_address) as with_stakes FROM staking_rewards
    `);

    const withoutStakes = await pool.query(`
      SELECT COUNT(*) as without_stakes 
      FROM identities 
      WHERE identity_address LIKE 'i%'
        AND identity_address NOT IN (SELECT DISTINCT identity_address FROM staking_rewards)
    `);

    const total = parseInt(totalIDs.rows[0].total);
    const covered = parseInt(withStakes.rows[0].with_stakes);
    const missing = parseInt(withoutStakes.rows[0].without_stakes);

    console.log(`   Total VerusIDs: ${total.toLocaleString()}`);
    console.log(
      `   With stake data: ${covered.toLocaleString()} (${((covered / total) * 100).toFixed(2)}%)`
    );
    console.log(
      `   Without stake data: ${missing.toLocaleString()} (${((missing / total) * 100).toFixed(2)}%)\n`
    );

    // Sample some VerusIDs without stakes
    console.log('🔍 Sample VerusIDs WITHOUT stake data (first 10):');
    const sampleWithout = await pool.query(`
      SELECT identity_address, base_name, friendly_name
      FROM identities 
      WHERE identity_address LIKE 'i%'
        AND identity_address NOT IN (SELECT DISTINCT identity_address FROM staking_rewards)
      LIMIT 10
    `);

    sampleWithout.rows.forEach((row, idx) => {
      console.log(
        `   ${idx + 1}. ${row.base_name || 'unknown'} (${row.identity_address})`
      );
    });

    // Show some VerusIDs WITH stakes
    console.log('\n\n✅ Sample VerusIDs WITH stake data (first 10):');
    const sampleWith = await pool.query(`
      SELECT 
        i.identity_address, 
        i.base_name, 
        i.friendly_name,
        COUNT(sr.id) as stake_count
      FROM identities i
      INNER JOIN staking_rewards sr ON i.identity_address = sr.identity_address
      WHERE i.identity_address LIKE 'i%'
      GROUP BY i.identity_address, i.base_name, i.friendly_name
      ORDER BY stake_count DESC
      LIMIT 10
    `);

    sampleWith.rows.forEach((row, idx) => {
      console.log(
        `   ${idx + 1}. ${row.base_name || 'unknown'} - ${row.stake_count} stakes`
      );
    });

    console.log('\n\n💡 CONSOLIDATION PLAN:');
    console.log('═════════════════════════════════════════════════\n');
    console.log(
      '1. ✅ Use staking_rewards as single source of truth (API already uses it)'
    );
    console.log('2. 🔄 Run comprehensive backfill scan:');
    console.log(
      `   - Scan blocks ${VERUSID_ACTIVATION.toLocaleString()} to ${parseInt(range.min_block) - 1} (historical gap)`
    );
    console.log('   - Scan all VerusIDs (32,990 addresses)');
    console.log(
      '   - Estimated: This will add stakes for ~1,000-5,000 more VerusIDs'
    );
    console.log('3. 🔄 Keep scanning up to current tip');
    console.log('4. 📝 Deprecate stake_events table (or keep as legacy)');
    console.log('5. ✅ API continues to use staking_rewards');

    console.log('\n');
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkCoverageGaps();
