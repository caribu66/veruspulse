#!/usr/bin/env node
/**
 * UTXO-Based Stake Amount Extractor for Verus
 *
 * This script identifies actual staking UTXOs by analyzing the UTXOs
 * of identities that are earning staking rewards. Instead of estimating
 * based on rewards, we find the actual UTXOs that are staking.
 *
 * Key insight: Verus staking rewards (~3 VRSC) come from UTXOs of similar size
 * that are actively staking. We can identify these UTXOs and use their
 * actual amounts for accurate APY calculation.
 */

const { Pool } = require('pg');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

require('dotenv').config();

// Configuration
const BATCH_SIZE =
  parseInt(
    process.argv.find(a => a.startsWith('--batch-size'))?.split('=')[1]
  ) || 50;
const MAX_IDENTITIES =
  parseInt(
    process.argv.find(a => a.startsWith('--max-identities'))?.split('=')[1]
  ) || 100;
const MIN_STAKING_UTXO_SIZE = 0.001; // Minimum VRSC for a UTXO to be considered staking (all UTXOs can stake)
const MAX_STAKING_UTXO_SIZE = 1000000; // Maximum VRSC for a UTXO to be considered staking (no upper limit)

// RPC Configuration
const RPC_USER = process.env.VERUS_RPC_USER || 'verus';
const RPC_PASS = process.env.VERUS_RPC_PASSWORD || 'verus';
const RPC_HOST_ENV = process.env.VERUS_RPC_HOST || 'localhost:18843';
const RPC_PORT = process.env.VERUS_RPC_PORT || '18843';

// Handle both full URL and hostname in RPC_HOST
let RPC_URL = RPC_HOST_ENV.startsWith('http')
  ? RPC_HOST_ENV
  : `http://${RPC_HOST_ENV}`;
RPC_URL = RPC_URL.replace('127.0.0.1', 'localhost');

// Statistics
const stats = {
  totalProcessed: 0,
  successful: 0,
  failed: 0,
  skipped: 0,
  startTime: Date.now(),
  lastProgress: Date.now(),
};

/**
 * RPC call helper
 */
async function rpcCall(method, params = []) {
  const rpcData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'utxo-extractor',
    method,
    params,
  });

  const escapedData = rpcData.replace(/'/g, "'\\''");
  const cmd = `curl -s --user ${RPC_USER}:${RPC_PASS} --data-binary '${escapedData}' -H 'content-type: text/plain;' ${RPC_URL}/`;

  try {
    const { stdout } = await execAsync(cmd, { maxBuffer: 50 * 1024 * 1024 });
    const result = JSON.parse(stdout);

    if (result.error) {
      throw new Error(result.error.message || JSON.stringify(result.error));
    }

    return result.result;
  } catch (error) {
    throw new Error(`RPC call failed: ${error.message}`);
  }
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get UTXOs for an identity address
 */
async function getIdentityUTXOs(identityAddress) {
  try {
    const utxos = await rpcCall('getaddressutxos', [
      { addresses: [identityAddress] },
    ]);
    return utxos || [];
  } catch (error) {
    console.warn(
      `  ⚠️  Could not fetch UTXOs for ${identityAddress}: ${error.message}`
    );
    return [];
  }
}

/**
 * Get current block height for confirmation calculation
 */
async function getCurrentBlockHeight() {
  try {
    return await rpcCall('getblockcount');
  } catch (error) {
    console.warn(`  ⚠️  Could not fetch block height: ${error.message}`);
    return null;
  }
}

/**
 * Identify staking UTXOs from a list of UTXOs
 * In Verus, ALL UTXOs can participate in staking if they have 150+ confirmations
 */
function identifyStakingUTXOs(utxos, currentBlockHeight) {
  if (!utxos || utxos.length === 0 || !currentBlockHeight) return [];

  // All UTXOs can stake in Verus if they have 150+ confirmations
  const stakingUtxos = utxos.filter(utxo => {
    const vrsc = utxo.satoshis / 100000000;
    const confirmations = currentBlockHeight - utxo.height + 1;

    // Must have VRSC and 150+ confirmations to stake
    return (
      vrsc >= MIN_STAKING_UTXO_SIZE &&
      vrsc <= MAX_STAKING_UTXO_SIZE &&
      confirmations >= 150
    );
  });

  return stakingUtxos;
}

/**
 * Calculate total staking amount from all UTXOs
 * In Verus, all UTXOs participate in staking, so we sum them all
 */
function calculateTotalStakingAmount(stakingUtxos) {
  if (!stakingUtxos || stakingUtxos.length === 0) return null;

  // Sum all UTXOs since they all participate in staking
  const totalSats = stakingUtxos.reduce((sum, utxo) => sum + utxo.satoshis, 0);

  return Math.round(totalSats);
}

/**
 * Extract actual stake amount using UTXO analysis
 */
async function extractActualStakeAmount(identityAddress) {
  try {
    // Get current block height for confirmation calculation
    const currentBlockHeight = await getCurrentBlockHeight();
    if (!currentBlockHeight) {
      return null;
    }

    // Get all UTXOs for this identity
    const utxos = await getIdentityUTXOs(identityAddress);

    if (utxos.length === 0) {
      return null;
    }

    // Identify staking UTXOs (must have 150+ confirmations)
    const stakingUtxos = identifyStakingUTXOs(utxos, currentBlockHeight);

    if (stakingUtxos.length === 0) {
      return null;
    }

    // Calculate total staking amount (all UTXOs participate)
    const totalStakingAmountSats = calculateTotalStakingAmount(stakingUtxos);

    return {
      stakeAmount: totalStakingAmountSats,
      stakingUtxoCount: stakingUtxos.length,
      totalStakingAmount: stakingUtxos.reduce(
        (sum, utxo) => sum + utxo.satoshis,
        0
      ),
      method: 'utxo_confirmed_analysis',
      confidence: 'high',
    };
  } catch (error) {
    console.error(
      `  ❌ Error analyzing UTXOs for ${identityAddress}: ${error.message}`
    );
    return null;
  }
}

/**
 * Show progress update
 */
function showProgress(totalToProcess, force = false) {
  const now = Date.now();

  // Only show progress every 10 seconds unless forced
  if (!force && now - stats.lastProgress < 10000) {
    return;
  }

  stats.lastProgress = now;

  const elapsed = now - stats.startTime;
  const rate = stats.totalProcessed / (elapsed / 1000); // per second
  const remaining = totalToProcess - stats.totalProcessed;
  const eta = remaining > 0 ? remaining / rate : 0;

  const pct = ((stats.totalProcessed / totalToProcess) * 100).toFixed(1);

  console.log(`\n📊 Progress Report:`);
  console.log(
    `   Processed: ${stats.totalProcessed.toLocaleString()}/${totalToProcess.toLocaleString()} (${pct}%)`
  );
  console.log(`   ✅ Successful: ${stats.successful.toLocaleString()}`);
  console.log(`   ❌ Failed: ${stats.failed.toLocaleString()}`);
  console.log(`   ⏭️  Skipped: ${stats.skipped.toLocaleString()}`);
  console.log(`   ⏱️  Elapsed: ${formatDuration(elapsed)}`);
  console.log(`   🚀 Rate: ${rate.toFixed(2)}/sec`);
  console.log(`   ⏳ ETA: ${formatDuration(eta * 1000)}`);
}

/**
 * Format duration
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Main UTXO-based backfill process
 */
async function backfillWithUTXOAnalysis() {
  console.log(
    '\n╔═══════════════════════════════════════════════════════════╗'
  );
  console.log('║        UTXO-Based Stake Amount Extraction         ║');
  console.log(
    '╚═══════════════════════════════════════════════════════════╝\n'
  );

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔗 Connecting to database...');

    // Get unique identity addresses that need stake amounts
    const identityQuery = `
      SELECT DISTINCT identity_address
      FROM staking_rewards
      WHERE stake_amount_sats IS NULL
        AND source_address = identity_address
      ORDER BY identity_address
      LIMIT $1
    `;

    const identitiesResult = await pool.query(identityQuery, [MAX_IDENTITIES]);
    const identities = identitiesResult.rows.map(row => row.identity_address);

    console.log(`\n📊 Found ${identities.length} unique identities to analyze`);
    console.log(`⚙️  Batch size: ${BATCH_SIZE}`);
    console.log(
      `🎯 UTXO analysis: All UTXOs with 150+ confirmations can stake (${MIN_STAKING_UTXO_SIZE}+ VRSC)`
    );
    console.log(`\n🚀 Starting UTXO analysis...\n`);

    if (identities.length === 0) {
      console.log('✅ No identities need analysis!\n');
      return;
    }

    // Process identities in batches
    for (let i = 0; i < identities.length; i += BATCH_SIZE) {
      const batch = identities.slice(
        i,
        Math.min(i + BATCH_SIZE, identities.length)
      );

      // Process each identity in the batch
      for (const identityAddress of batch) {
        try {
          stats.totalProcessed++;

          // Extract actual stake amount using UTXO analysis
          const result = await extractActualStakeAmount(identityAddress);

          if (result && result.stakeAmount > 0) {
            // Update all staking rewards for this identity with the calculated amount
            const updateResult = await pool.query(
              `UPDATE staking_rewards 
               SET stake_amount_sats = $1 
               WHERE identity_address = $2 
                 AND source_address = identity_address
                 AND stake_amount_sats IS NULL`,
              [result.stakeAmount, identityAddress]
            );

            stats.successful++;
            const stakeAmountVRSC = (result.stakeAmount / 100000000).toFixed(2);

            // Log successful extraction every 10 identities
            if (stats.successful % 10 === 0) {
              console.log(
                `   ✅ Identity ${stats.successful}: ${identityAddress.slice(0, 16)}... - ${stakeAmountVRSC} VRSC (${result.stakingUtxoCount} UTXOs)`
              );
            }
          } else {
            stats.skipped++;

            if (stats.skipped % 50 === 0) {
              console.log(
                `   ⏭️  Skipped ${stats.skipped} identities (no staking UTXOs found)`
              );
            }
          }

          // Rate limiting
          await sleep(100); // 100ms between identities
        } catch (error) {
          stats.failed++;
          console.warn(
            `  ⚠️  Error processing ${identityAddress}: ${error.message}`
          );
        }
      }

      // Show progress after each batch
      showProgress(identities.length);
    }

    // Final statistics
    const elapsed = Date.now() - stats.startTime;
    const successRate =
      stats.totalProcessed > 0
        ? (stats.successful / stats.totalProcessed) * 100
        : 0;

    console.log(
      '\n╔═══════════════════════════════════════════════════════════╗'
    );
    console.log('║                  Analysis Complete!               ║');
    console.log(
      '╚═══════════════════════════════════════════════════════════╝'
    );

    console.log(`\n✅ Successfully analyzed: ${stats.successful}`);
    console.log(`⏭️  Skipped (no staking UTXOs): ${stats.skipped}`);
    console.log(`❌ Failed: ${stats.failed}`);
    console.log(`📊 Success rate: ${successRate.toFixed(1)}%`);
    console.log(`⏱️  Total time: ${formatDuration(elapsed)}`);

    console.log(`\n🎯 Next steps:`);
    console.log(`   1. Run this script again to process more identities`);
    console.log(
      `   2. Recalculate VerusID statistics: node scripts/recalculate-all-stats.js`
    );
    console.log(`   3. Check APY confidence in the UI`);

    console.log(`\n✅ Script completed successfully`);
  } catch (error) {
    console.error(`\n❌ Backfill failed: ${error.message}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  backfillWithUTXOAnalysis().catch(error => {
    console.error(`❌ Script failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { backfillWithUTXOAnalysis };
