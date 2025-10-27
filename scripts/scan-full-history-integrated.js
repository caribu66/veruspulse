#!/usr/bin/env node
/**
 * scan-full-history-integrated.js
 * Complete historical scan from VerusID activation (block 800200) to current tip
 *
 * This is a ONE-TIME full historical scan that captures:
 * 1. ALL staking rewards from block 800200 onwards
 * 2. Current UTXO state for all VerusIDs
 *
 * After this completes, use scan-all-verusids-integrated.js for daily updates
 */

require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');
const fs = require('fs');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║   FULL HISTORICAL SCAN: Block 800200 → Current Tip       ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// Configuration
const VERUSID_ACTIVATION_BLOCK = 800200;
const BATCH_SIZE = 500; // Process 500 blocks at a time (aggressive!)
const CHECKPOINT_INTERVAL = 500; // Save progress every 500 blocks (faster checkpoints)
const PARALLEL_REQUESTS = 10; // Process 10 blocks in parallel (aggressive!)

// RPC configuration
const RPC_URL = 'http://127.0.0.1:18843';
const RPC_USER = 'verus';
const RPC_PASS = '1CvFqDVqdPlznV4pksyoiyZ1eKhLoRKb';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Progress tracking file
const PROGRESS_FILE = './scan-progress.json';

// Stats tracking
let stats = {
  totalAddresses: 0,
  blocksScanned: 0,
  stakeEventsFound: 0,
  utxosUpdated: 0,
  utxoErrors: 0,
  errors: 0,
  startTime: Date.now(),
  lastCheckpoint: 0,
};

// Make RPC call
async function rpcCall(method, params = []) {
  const auth = Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString('base64');

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      jsonrpc: '1.0',
      id: 'full-history-scan',
      method,
      params,
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
        Authorization: `Basic ${auth}`,
      },
    };

    const url = new URL(RPC_URL);
    options.hostname = url.hostname;
    options.port = url.port;
    options.path = url.pathname;
    options.protocol = url.protocol;

    const req = (url.protocol === 'https:' ? https : require('http')).request(
      options,
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) reject(new Error(json.error.message));
            else resolve(json.result);
          } catch (e) {
            reject(e);
          }
        });
      }
    );

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Load progress from file
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.log('⚠️  Could not load progress file, starting fresh');
  }
  return { lastScannedBlock: VERUSID_ACTIVATION_BLOCK - 1 };
}

// Save progress to file
function saveProgress(blockHeight) {
  try {
    fs.writeFileSync(
      PROGRESS_FILE,
      JSON.stringify(
        {
          lastScannedBlock: blockHeight,
          timestamp: new Date().toISOString(),
          stats: stats,
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error('⚠️  Could not save progress:', error.message);
  }
}

// Get all VerusID addresses from database
async function getAllVerusIDs() {
  const result = await pool.query(`
    SELECT identity_address, base_name, friendly_name
    FROM identities
    WHERE identity_address LIKE 'i%'
    ORDER BY identity_address
  `);
  return result.rows.map(r => ({
    address: r.identity_address,
    name: r.base_name || 'unknown',
    friendlyName: r.friendly_name,
  }));
}

// Check if block contains stakes for our addresses
// CORRECTED: Look at tx[-1] for staker addresses, tx[0] for rewards
function findStakesInBlock(block, targetAddresses) {
  const stakes = [];

  if (!block || !block.tx || block.tx.length === 0) return stakes;

  // Check if this is a PoS block
  const isPoS =
    block.validationtype === 'stake' || block.blocktype === 'minted';
  if (!isPoS) return stakes;

  // Need at least 2 transactions: coinstake (tx[0]) and staker (tx[-1])
  if (block.tx.length < 2) return stakes;

  // Coinstake transaction (first tx) - contains the reward
  const coinstake = block.tx[0];
  if (!coinstake || !coinstake.vout) return stakes;

  // Last transaction (tx[-1]) - contains the staker's address
  const stakerTx = block.tx[block.tx.length - 1];
  if (!stakerTx || !stakerTx.vout) return stakes;

  // Calculate total reward from coinstake
  const totalReward = coinstake.vout.reduce(
    (sum, v) => sum + (v.value || 0),
    0
  );

  // Look for target addresses in the staker transaction
  for (let voutIdx = 0; voutIdx < stakerTx.vout.length; voutIdx++) {
    const vout = stakerTx.vout[voutIdx];
    if (!vout.scriptPubKey || !vout.scriptPubKey.addresses) continue;

    for (const addr of vout.scriptPubKey.addresses) {
      if (targetAddresses.has(addr)) {
        stakes.push({
          address: addr,
          blockHeight: block.height,
          blockHash: block.hash,
          blockTime: new Date(block.time * 1000),
          txid: coinstake.txid, // Use coinstake TXID for the reward
          vout: voutIdx, // Use vout from staker transaction
          reward: Math.round(totalReward * 100000000), // Convert to satoshis
        });
      }
    }
  }

  return stakes;
}

// Save stake to database
async function saveStake(stake) {
  try {
    await pool.query(
      `INSERT INTO staking_rewards (
        identity_address, block_height, block_hash, block_time,
        txid, vout, amount_sats, classifier
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (txid, vout) DO NOTHING`,
      [
        stake.address,
        stake.blockHeight,
        stake.blockHash,
        stake.blockTime,
        stake.txid,
        stake.vout,
        stake.reward,
        'stake',
      ]
    );
  } catch (error) {
    console.error(`   Error saving stake: ${error.message}`);
    stats.errors++;
  }
}

// Scan blocks for stakes with parallel processing
async function scanBlocks(startHeight, endHeight, addressSet) {
  console.log(`🔍 Scanning blocks ${startHeight} to ${endHeight}...\n`);
  console.log(`⚡ Parallel processing: ${PARALLEL_REQUESTS} blocks at once\n`);

  const totalBlocks = endHeight - startHeight + 1;
  let currentHeight = startHeight;

  while (currentHeight <= endHeight) {
    const batchEnd = Math.min(currentHeight + BATCH_SIZE - 1, endHeight);

    try {
      // Process blocks in parallel within batch
      const blockPromises = [];

      for (let h = currentHeight; h <= batchEnd; h += PARALLEL_REQUESTS) {
        const parallelBatch = [];

        for (let i = 0; i < PARALLEL_REQUESTS && h + i <= batchEnd; i++) {
          const height = h + i;
          parallelBatch.push(
            (async () => {
              try {
                const blockHash = await rpcCall('getblockhash', [height]);
                const block = await rpcCall('getblock', [blockHash, 2]);

                const stakes = findStakesInBlock(block, addressSet);
                for (const stake of stakes) {
                  await saveStake(stake);
                  stats.stakeEventsFound++;
                }

                stats.blocksScanned++;

                // Save checkpoint
                if (stats.blocksScanned % CHECKPOINT_INTERVAL === 0) {
                  saveProgress(height);
                  stats.lastCheckpoint = height;
                }
              } catch (error) {
                console.error(
                  `\n   ❌ Error at block ${height}: ${error.message}`
                );
                stats.errors++;
              }
            })()
          );
        }

        // Wait for this parallel batch to complete before next
        await Promise.all(parallelBatch);
      }

      // Progress update
      const progress = ((stats.blocksScanned / totalBlocks) * 100).toFixed(2);
      const elapsed = (Date.now() - stats.startTime) / 1000;
      const rate = stats.blocksScanned / elapsed;
      const remaining = endHeight - currentHeight;
      const etaSeconds = remaining / rate;
      const etaHours = (etaSeconds / 3600).toFixed(1);
      const etaMinutes = Math.ceil(etaSeconds / 60);

      process.stdout.write(
        `\r📊 Block ${currentHeight}/${endHeight} (${progress}%) | ` +
          `Stakes: ${stats.stakeEventsFound} | ` +
          `Rate: ${rate.toFixed(1)} blk/s | ` +
          `ETA: ${etaHours}h (${etaMinutes}min) | ` +
          `Checkpoint: ${stats.lastCheckpoint}   `
      );

      currentHeight = batchEnd + 1;
    } catch (error) {
      console.error(
        `\n   ❌ Error at block ${currentHeight}: ${error.message}`
      );
      stats.errors++;
      currentHeight++; // Skip problematic block
    }
  }

  console.log('\n');
}

// Update UTXOs for all VerusIDs
async function updateAllUTXOs(verusIDs, currentHeight) {
  console.log('\n💾 Updating UTXO database from daemon...\n');

  for (let i = 0; i < verusIDs.length; i++) {
    const identity = verusIDs[i];
    const iaddr = identity.address;
    const name = identity.name;

    try {
      // Get current UTXOs from daemon
      const daemonUtxos = await rpcCall('getaddressutxos', [
        { addresses: [iaddr] },
      ]);

      if (
        !daemonUtxos ||
        !Array.isArray(daemonUtxos) ||
        daemonUtxos.length === 0
      ) {
        // No UTXOs - mark all as spent
        await pool.query(
          'UPDATE utxos SET is_spent = true, updated_at = NOW() WHERE address = $1 AND is_spent = false',
          [iaddr]
        );
        continue;
      }

      // Mark all existing UTXOs as spent
      await pool.query(
        'UPDATE utxos SET is_spent = true, updated_at = NOW() WHERE address = $1 AND is_spent = false',
        [iaddr]
      );

      // Insert/update current UTXOs
      for (const utxo of daemonUtxos) {
        const value = utxo.satoshis || 0;
        const height = utxo.height || 0;
        const blocktime = utxo.blocktime || 0;
        const txid = utxo.txid;
        const vout =
          utxo.outputIndex !== undefined ? utxo.outputIndex : utxo.vout;

        if (!txid || vout === undefined) continue;

        const confirmations = height ? currentHeight - height : 0;
        const isEligible = confirmations >= 150;
        const creationTime = blocktime ? new Date(blocktime * 1000) : null;

        await pool.query(
          `INSERT INTO utxos (
            address, txid, vout, value, creation_height, creation_time,
            is_spent, is_eligible, staking_probability, estimated_reward,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          ON CONFLICT (txid, vout) DO UPDATE SET
            address = EXCLUDED.address,
            value = EXCLUDED.value,
            creation_height = EXCLUDED.creation_height,
            creation_time = EXCLUDED.creation_time,
            is_spent = EXCLUDED.is_spent,
            is_eligible = EXCLUDED.is_eligible,
            updated_at = NOW()`,
          [
            iaddr,
            txid,
            vout,
            value,
            height,
            creationTime,
            false,
            isEligible,
            0,
            0,
          ]
        );
      }

      stats.utxosUpdated += daemonUtxos.length;

      // Progress update every 100 identities
      if ((i + 1) % 100 === 0 || i === verusIDs.length - 1) {
        const progress = (((i + 1) / verusIDs.length) * 100).toFixed(1);
        process.stdout.write(
          `\r💾 UTXO Progress: ${i + 1}/${verusIDs.length} (${progress}%) | ` +
            `UTXOs: ${stats.utxosUpdated}   `
        );
      }
    } catch (error) {
      stats.utxoErrors++;
      if ((i + 1) % 100 === 0) {
        console.error(`\n   ⚠️  UTXO errors: ${stats.utxoErrors}`);
      }
    }
  }

  console.log('\n');
}

// Main
async function main() {
  try {
    console.log('🔧 Initializing full historical scan...\n');

    // Load progress
    const progress = loadProgress();
    const startFromBlock = progress.lastScannedBlock + 1;

    if (startFromBlock > VERUSID_ACTIVATION_BLOCK) {
      console.log(`📂 Resuming from block ${startFromBlock}`);
      console.log(
        `   (Previous scan stopped at block ${progress.lastScannedBlock})\n`
      );
    }

    // Get all VerusIDs
    console.log('📋 Loading VerusIDs from database...');
    const verusIDs = await getAllVerusIDs();
    stats.totalAddresses = verusIDs.length;
    console.log(`✅ Found ${stats.totalAddresses} VerusIDs\n`);

    if (stats.totalAddresses === 0) {
      console.log('⚠️  No VerusIDs found in database!');
      process.exit(1);
    }

    // Create address set for fast lookup
    const addressSet = new Set(verusIDs.map(v => v.address));

    // Get current height
    console.log('⛓️  Getting blockchain height...');
    const currentHeight = await rpcCall('getblockcount');
    console.log(`✅ Current height: ${currentHeight}\n`);

    const totalBlocksToScan = currentHeight - startFromBlock + 1;
    const estimatedHours = (totalBlocksToScan / 5 / 3600).toFixed(1); // Assume 5 blocks/sec

    console.log('═══════════════════════════════════════════════════════════');
    console.log('SCAN CONFIGURATION');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Start block: ${startFromBlock}`);
    console.log(`   End block: ${currentHeight}`);
    console.log(`   Total blocks: ${totalBlocksToScan.toLocaleString()}`);
    console.log(`   VerusIDs: ${stats.totalAddresses.toLocaleString()}`);
    console.log(`   Estimated time: ~${estimatedHours} hours`);
    console.log(`   Progress saved every ${CHECKPOINT_INTERVAL} blocks`);
    console.log(
      '═══════════════════════════════════════════════════════════\n'
    );

    // Phase 1: Full historical scan for stakes
    console.log(
      '╔═══════════════════════════════════════════════════════════╗'
    );
    console.log(
      '║   PHASE 1: HISTORICAL STAKE SCAN                          ║'
    );
    console.log(
      '╚═══════════════════════════════════════════════════════════╝\n'
    );

    stats.startTime = Date.now();
    await scanBlocks(startFromBlock, currentHeight, addressSet);

    const stakeTime = (Date.now() - stats.startTime) / 1000;
    console.log(
      `✅ Historical stake scan complete in ${(stakeTime / 3600).toFixed(2)} hours\n`
    );

    // Save final progress
    saveProgress(currentHeight);

    // Phase 2: Update UTXOs
    console.log(
      '╔═══════════════════════════════════════════════════════════╗'
    );
    console.log(
      '║   PHASE 2: UTXO DATABASE UPDATE                           ║'
    );
    console.log(
      '╚═══════════════════════════════════════════════════════════╝'
    );

    const utxoStartTime = Date.now();
    await updateAllUTXOs(verusIDs, currentHeight);

    const utxoTime = (Date.now() - utxoStartTime) / 1000;
    console.log(
      `✅ UTXO update complete in ${(utxoTime / 60).toFixed(1)} minutes\n`
    );

    // Final stats
    const totalTime = (Date.now() - stats.startTime) / 1000;
    console.log(
      '╔═══════════════════════════════════════════════════════════╗'
    );
    console.log(
      '║        FULL HISTORICAL SCAN COMPLETE!                     ║'
    );
    console.log(
      '╚═══════════════════════════════════════════════════════════╝'
    );
    console.log('\n📊 STAKE SCANNING:');
    console.log(`   Blocks scanned: ${stats.blocksScanned.toLocaleString()}`);
    console.log(`   Stakes found: ${stats.stakeEventsFound.toLocaleString()}`);
    console.log(`   Errors: ${stats.errors}`);
    console.log(
      `   Speed: ${(stats.blocksScanned / stakeTime).toFixed(1)} blocks/sec`
    );
    console.log(`   Duration: ${(stakeTime / 3600).toFixed(2)} hours`);

    console.log('\n💾 UTXO UPDATE:');
    console.log(
      `   VerusIDs processed: ${stats.totalAddresses.toLocaleString()}`
    );
    console.log(`   UTXOs updated: ${stats.utxosUpdated.toLocaleString()}`);
    console.log(`   Errors: ${stats.utxoErrors}`);

    console.log(`\n⏱️  TOTAL TIME: ${(totalTime / 3600).toFixed(2)} hours\n`);

    console.log('✅ Complete historical data captured!');
    console.log(
      '✅ Database fully populated from block 800200 to current tip!'
    );
    console.log('\n📈 Next steps:');
    console.log('   1. Run: ./scripts/update-statistics.sh');
    console.log(
      '   2. For daily updates, use: node scripts/scan-all-verusids-integrated.js 7\n'
    );

    // Clean up progress file
    if (fs.existsSync(PROGRESS_FILE)) {
      fs.unlinkSync(PROGRESS_FILE);
      console.log('🧹 Progress file cleaned up\n');
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    console.log('\n💾 Progress saved to:', PROGRESS_FILE);
    console.log('   You can resume by running this script again\n');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
