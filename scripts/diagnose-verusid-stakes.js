#!/usr/bin/env node
/**
 * diagnose-verusid-stakes.js
 * Diagnose missing stakes for a VerusID and provide solutions
 *
 * Usage: node diagnose-verusid-stakes.js <friendly-name>
 * Example: node diagnose-verusid-stakes.js caribu66@
 */

const { Pool } = require('pg');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const VERUSID_NAME = process.argv[2];

if (!VERUSID_NAME) {
  console.error('Usage: node diagnose-verusid-stakes.js <friendly-name>');
  console.error('Example: node diagnose-verusid-stakes.js caribu66@');
  process.exit(1);
}

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║     VerusID Staking Data Diagnostic Tool                ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

const dbConfig = {
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 5,
};

const db = new Pool(dbConfig);

// RPC helper
async function rpcCall(method, params = []) {
  const rpcUser = process.env.VERUS_RPC_USER || 'verus';
  const rpcPass = process.env.VERUS_RPC_PASSWORD || 'verus';
  const rpcHost = process.env.VERUS_RPC_HOST || '127.0.0.1';
  const rpcPort = process.env.VERUS_RPC_PORT || '18843';

  const rpcData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'diag',
    method,
    params,
  });

  const escapedData = rpcData.replace(/'/g, "'\\''");
  const cmd = `curl -s --user ${rpcUser}:${rpcPass} --data-binary '${escapedData}' -H 'content-type: text/plain;' http://${rpcHost}:${rpcPort}/`;

  try {
    const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
    const result = JSON.parse(stdout);
    if (result.error) {
      throw new Error(result.error.message);
    }
    return result.result;
  } catch (error) {
    throw new Error(`RPC call failed: ${error.message}`);
  }
}

async function normalizeVerusIDName(input) {
  let normalized = input.trim();
  if (!normalized.includes('@') && !normalized.startsWith('i')) {
    normalized = `${normalized}.VRSC@`;
  } else if (normalized.includes('@') && !normalized.includes('.')) {
    normalized = normalized.replace('@', '.VRSC@');
  }
  return normalized;
}

async function main() {
  try {
    console.log(`🔍 Analyzing: ${VERUSID_NAME}\n`);

    // Step 1: Resolve VerusID to I-address
    console.log('📍 Step 1: Resolving VerusID to I-address...');
    const normalizedName = await normalizeVerusIDName(VERUSID_NAME);
    console.log(`   Normalized name: ${normalizedName}`);

    const identity = await rpcCall('getidentity', [normalizedName]);
    if (!identity || !identity.identity) {
      console.error(
        `❌ ERROR: VerusID "${VERUSID_NAME}" not found on blockchain!`
      );
      process.exit(1);
    }

    const iAddress = identity.identity.identityaddress;
    const baseName = identity.identity.name;
    const primaryAddresses = identity.identity.primaryaddresses || [];

    console.log(`   ✓ I-address: ${iAddress}`);
    console.log(`   ✓ Base name: ${baseName}`);
    console.log(`   ✓ Primary R-addresses: ${primaryAddresses.length} found`);
    if (primaryAddresses.length > 0) {
      primaryAddresses.forEach((addr, idx) => {
        console.log(`      ${idx + 1}. ${addr}`);
      });
    }
    console.log('');

    // Step 2: Check database for this identity
    console.log('📊 Step 2: Checking database records...');

    // Check if identity exists in identities table
    const identityCheck = await db.query(
      'SELECT * FROM identities WHERE identity_address = $1',
      [iAddress]
    );

    if (identityCheck.rows.length === 0) {
      console.log(`   ⚠️  Identity NOT found in identities table`);
      console.log(
        `   📝 This identity needs to be added to the database first`
      );
    } else {
      const idRow = identityCheck.rows[0];
      console.log(`   ✓ Identity found in database`);
      console.log(
        `      Last scanned block: ${idRow.last_scanned_block || 'Never'}`
      );
      console.log(
        `      Last refreshed: ${idRow.last_refreshed_at || 'Never'}`
      );
    }
    console.log('');

    // Step 3: Check staking rewards data
    console.log('🎰 Step 3: Analyzing staking rewards data...');

    const rewardsQuery = await db.query(
      `
      SELECT 
        COUNT(*) as total_stakes,
        MIN(block_height) as first_stake_block,
        MAX(block_height) as last_stake_block,
        MIN(block_time) as first_stake_time,
        MAX(block_time) as last_stake_time,
        SUM(amount_sats) / 100000000.0 as total_rewards_vrsc,
        COUNT(DISTINCT DATE(block_time)) as distinct_days_with_stakes
      FROM staking_rewards
      WHERE identity_address = $1
      `,
      [iAddress]
    );

    const rewards = rewardsQuery.rows[0];
    const totalStakes = parseInt(rewards.total_stakes) || 0;

    if (totalStakes === 0) {
      console.log(`   ❌ NO STAKING DATA FOUND IN DATABASE!`);
      console.log(`   📝 This identity has never been scanned for stakes`);
    } else {
      console.log(`   ✓ Found ${totalStakes} stake records in database`);
      console.log(
        `   📅 First stake: Block ${rewards.first_stake_block} (${new Date(rewards.first_stake_time).toLocaleDateString()})`
      );
      console.log(
        `   📅 Last stake: Block ${rewards.last_stake_block} (${new Date(rewards.last_stake_time).toLocaleDateString()})`
      );
      console.log(
        `   💰 Total rewards: ${parseFloat(rewards.total_rewards_vrsc).toFixed(2)} VRSC`
      );
      console.log(
        `   📊 Distinct days with stakes: ${rewards.distinct_days_with_stakes}`
      );
    }
    console.log('');

    // Step 4: Check for gaps in the data
    console.log('🔎 Step 4: Checking for data gaps...');

    if (totalStakes > 0) {
      // Get all dates with stakes
      const datesQuery = await db.query(
        `
        SELECT DATE(block_time) as stake_date, COUNT(*) as stakes
        FROM staking_rewards
        WHERE identity_address = $1
        GROUP BY DATE(block_time)
        ORDER BY stake_date DESC
        LIMIT 365
        `,
        [iAddress]
      );

      const datesWithStakes = datesQuery.rows.length;
      const lastYear = new Date();
      lastYear.setFullYear(lastYear.getFullYear() - 1);

      const recentStakes = datesQuery.rows.filter(
        r => new Date(r.stake_date) >= lastYear
      );

      console.log(
        `   📅 Days with stakes in last 365 days: ${recentStakes.length}`
      );

      if (recentStakes.length < 30) {
        console.log(`   ⚠️  WARNING: Very few staking days found!`);
        console.log(`   🔴 Expected: ~365 days (if staking consistently)`);
        console.log(`   🔴 Found: ${recentStakes.length} days`);
        console.log(`   📝 This indicates MAJOR DATA GAPS`);
      } else if (recentStakes.length < 200) {
        console.log(`   ⚠️  WARNING: Fewer staking days than expected`);
        console.log(
          `   🟡 Found: ${recentStakes.length} days out of 365 possible`
        );
        console.log(`   📝 This indicates MODERATE DATA GAPS`);
      } else {
        console.log(
          `   ✓ Good coverage: ${recentStakes.length} days out of 365`
        );
      }
    }
    console.log('');

    // Step 5: Get current blockchain height and calculate expected stakes
    console.log('⛓️  Step 5: Comparing against blockchain data...');

    const currentHeight = await rpcCall('getblockcount');
    const verusidActivation = 800200;
    const totalBlocksSinceActivation = currentHeight - verusidActivation;

    console.log(
      `   Current blockchain height: ${currentHeight.toLocaleString()}`
    );
    console.log(
      `   VerusID activation block: ${verusidActivation.toLocaleString()}`
    );
    console.log(
      `   Total blocks since activation: ${totalBlocksSinceActivation.toLocaleString()}`
    );

    // Estimate: If staking for 5 years daily, expect ~1825 stakes minimum
    const yearsStaking = 5;
    const expectedMinStakes = yearsStaking * 365;

    console.log(`   \n   📊 Analysis for ${yearsStaking} years of staking:`);
    console.log(`   Expected (conservative): ~${expectedMinStakes} stakes`);
    console.log(`   Found in database: ${totalStakes} stakes`);

    if (totalStakes < expectedMinStakes * 0.1) {
      console.log(`   🔴 CRITICAL: Database has < 10% of expected data!`);
      console.log(`   📝 Missing: ${expectedMinStakes - totalStakes}+ stakes`);
    } else if (totalStakes < expectedMinStakes * 0.5) {
      console.log(`   🟡 WARNING: Database has < 50% of expected data!`);
      console.log(`   📝 Missing: ~${expectedMinStakes - totalStakes} stakes`);
    } else {
      console.log(
        `   ✓ Data appears reasonable (${((totalStakes / expectedMinStakes) * 100).toFixed(1)}% of expected)`
      );
    }
    console.log('');

    // Step 6: Provide recommendations
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                  RECOMMENDATIONS                         ║');
    console.log(
      '╚══════════════════════════════════════════════════════════╝\n'
    );

    if (totalStakes === 0) {
      console.log('🔄 SOLUTION: Run a full scan for this identity');
      console.log('\n   Command to run:');
      console.log(
        `   node scripts/scan-single-verusid-complete.js ${iAddress}`
      );
      console.log(
        '\n   This will scan the entire blockchain history for this I-address.'
      );
    } else if (totalStakes < expectedMinStakes * 0.5) {
      console.log('🔄 SOLUTION: The data is incomplete. Rescan recommended.');
      console.log(
        '\n   Option 1: Full rescan (deletes existing data and scans fresh)'
      );
      console.log(
        `   node scripts/scan-single-verusid-complete.js ${iAddress}`
      );
      console.log('\n   Option 2: Gap fill (only scans missing blocks)');
      console.log(`   node scripts/extend-staking-data-to-tip.sh ${iAddress}`);
      console.log('\n   Recommended: Option 1 (Full rescan) for accuracy');
    } else {
      console.log('✅ Data looks good! Just need to update statistics.');
      console.log('\n   Command to run:');
      console.log(
        `   node scripts/calculate-verusid-statistics.js ${iAddress}`
      );
    }

    console.log('\n\n⚠️  CRITICAL REMINDER:');
    console.log(
      '   According to your codebase rules, stake scanning should ONLY'
    );
    console.log('   scan the I-address (identityaddress), NOT R-addresses.');
    console.log(`   \n   ✓ Correct: Scan ${iAddress}`);
    if (primaryAddresses.length > 0) {
      console.log(
        `   ✗ Wrong: Don't scan R-addresses like ${primaryAddresses[0]}`
      );
    }
    console.log(
      '\n   Mixing I-address and R-address data will return incorrect results!'
    );
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

main().catch(console.error);
