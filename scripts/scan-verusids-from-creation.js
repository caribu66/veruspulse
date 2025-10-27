#!/usr/bin/env node
/**
 * scan-verusids-from-creation.js
 * OPTIMIZED scanner that scans each VerusID from its CREATION BLOCK
 *
 * This is much more efficient than scanning from the generic VerusID activation block (800,200)
 * because each VerusID only exists from its creation onward.
 *
 * Features:
 * - Fetches creation block using getidentityhistory
 * - Scans from creation block to current tip
 * - Captures both staking rewards AND UTXOs
 * - Updates identities table with creation block
 */

require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');
const http = require('http');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║   Creation-Aware VerusID Scanner                          ║');
console.log('║   Scans from actual VerusID creation blocks               ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// Configuration
const BATCH_SIZE = 100;
const PARALLEL_SCANS = 3; // Number of VerusIDs to scan in parallel
const CHECKPOINT_INTERVAL = 1000; // Save progress every N blocks

// RPC configuration
const RPC_URL = process.env.VERUS_RPC_HOST || 'http://127.0.0.1:18843';
const RPC_USER = process.env.VERUS_RPC_USER || 'verus';
const RPC_PASS = process.env.VERUS_RPC_PASSWORD || 'verus';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});

// Global stats
let globalStats = {
  verusidsProcessed: 0,
  totalStakes: 0,
  totalUtxos: 0,
  blocksScanned: 0,
  creationBlocksFetched: 0,
  errors: 0,
  startTime: Date.now(),
};

// Make RPC call
async function rpcCall(method, params = []) {
  const auth = Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString('base64');
  const postData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'creation-scanner',
    method,
    params,
  });

  const url = new URL(RPC_URL);
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length,
      Authorization: `Basic ${auth}`,
    },
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    protocol: url.protocol,
    agent:
      url.protocol === 'https:'
        ? new https.Agent({ rejectUnauthorized: false })
        : undefined,
  };

  return new Promise((resolve, reject) => {
    const req = (url.protocol === 'https:' ? https : http).request(
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

/**
 * Get creation block for a VerusID
 */
async function getCreationBlock(friendlyName) {
  try {
    const history = await rpcCall('getidentityhistory', [friendlyName]);

    if (!history || !history.history || history.history.length === 0) {
      console.warn(`   ⚠️  No history found for ${friendlyName}`);
      return null;
    }

    // First entry is the creation
    const firstEntry = history.history[0];
    return {
      block: firstEntry.height,
      txid: firstEntry.output?.txid || firstEntry.txid,
      blockhash: firstEntry.blockhash,
    };
  } catch (error) {
    console.error(
      `   ❌ Failed to get creation block for ${friendlyName}: ${error.message}`
    );
    return null;
  }
}

/**
 * Update identities table with creation block
 */
async function updateCreationBlock(
  identityAddress,
  creationBlock,
  creationTxid
) {
  try {
    await pool.query(
      `
      UPDATE identities 
      SET first_seen_block = $1, 
          first_seen_txid = $2
      WHERE identity_address = $3
    `,
      [creationBlock, creationTxid, identityAddress]
    );
  } catch (error) {
    console.error(`   ❌ Failed to update creation block: ${error.message}`);
  }
}

/**
 * Find stakes in a block for target addresses
 */
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
          txid: coinstake.txid,
          vout: voutIdx,
          reward: Math.round(totalReward * 100000000), // Convert to satoshis
        });
      }
    }
  }

  return stakes;
}

/**
 * Save stake to database
 */
async function saveStake(stake) {
  try {
    await pool.query(
      `
      INSERT INTO staking_rewards 
        (identity_address, block_height, block_hash, block_time, txid, vout_index, amount_sats)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (identity_address, block_height, txid) 
      DO UPDATE SET 
        amount_sats = EXCLUDED.amount_sats,
        block_time = EXCLUDED.block_time
    `,
      [
        stake.address,
        stake.blockHeight,
        stake.blockHash,
        stake.blockTime,
        stake.txid,
        stake.vout,
        stake.reward,
      ]
    );
    return true;
  } catch (error) {
    console.error(`   ❌ Failed to save stake: ${error.message}`);
    return false;
  }
}

/**
 * Update UTXOs from daemon for an address
 */
async function updateUTXOs(identityAddress) {
  try {
    const utxos = await rpcCall('getaddressutxos', [
      { addresses: [identityAddress] },
    ]);

    if (!utxos || utxos.length === 0) {
      return 0;
    }

    // Mark all existing UTXOs as spent
    await pool.query(
      `
      UPDATE utxos 
      SET is_spent = true, updated_at = NOW()
      WHERE address = $1 AND is_spent = false
    `,
      [identityAddress]
    );

    // Insert new UTXOs
    let inserted = 0;
    for (const utxo of utxos) {
      try {
        await pool.query(
          `
          INSERT INTO utxos 
            (txid, vout_index, address, amount_sats, block_height, is_spent, confirmations, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, false, $6, NOW(), NOW())
          ON CONFLICT (txid, vout_index) 
          DO UPDATE SET 
            amount_sats = EXCLUDED.amount_sats,
            confirmations = EXCLUDED.confirmations,
            is_spent = false,
            updated_at = NOW()
        `,
          [
            utxo.txid,
            utxo.outputIndex,
            identityAddress,
            Math.round(utxo.satoshis),
            utxo.height,
            utxo.confirmations || 0,
          ]
        );
        inserted++;
      } catch (error) {
        // Ignore duplicate errors
        if (!error.message.includes('duplicate')) {
          console.error(`   ⚠️  UTXO insert error: ${error.message}`);
        }
      }
    }

    return inserted;
  } catch (error) {
    console.error(`   ❌ Failed to update UTXOs: ${error.message}`);
    return 0;
  }
}

/**
 * Scan a single VerusID from its creation block to current tip
 */
async function scanVerusID(verusid, currentTip) {
  console.log(`\n📋 Scanning: ${verusid.friendlyName || verusid.name}`);
  console.log(`   Address: ${verusid.address}`);

  // Get creation block
  let creationBlock = verusid.firstSeenBlock;

  if (!creationBlock) {
    console.log(`   🔍 Fetching creation block...`);
    const creationInfo = await getCreationBlock(
      verusid.friendlyName || verusid.name + '@'
    );

    if (!creationInfo) {
      console.log(`   ❌ Could not determine creation block, skipping`);
      globalStats.errors++;
      return { stakes: 0, utxos: 0 };
    }

    creationBlock = creationInfo.block;
    console.log(`   ✅ Creation block: ${creationBlock.toLocaleString()}`);

    // Update database with creation block
    await updateCreationBlock(
      verusid.address,
      creationBlock,
      creationInfo.txid
    );
    globalStats.creationBlocksFetched++;
  } else {
    console.log(
      `   ✅ Using cached creation block: ${creationBlock.toLocaleString()}`
    );
  }

  // Determine scan range
  const startHeight = creationBlock;
  const endHeight = currentTip;
  const totalBlocks = endHeight - startHeight + 1;

  console.log(
    `   📊 Scan range: ${startHeight.toLocaleString()} → ${endHeight.toLocaleString()} (${totalBlocks.toLocaleString()} blocks)`
  );

  // Scan for stakes
  let stakesFound = 0;
  const targetAddresses = new Set([verusid.address]);

  for (let h = startHeight; h <= endHeight; h += BATCH_SIZE) {
    const batchEnd = Math.min(h + BATCH_SIZE - 1, endHeight);

    try {
      // Fetch blocks in batch
      const blockPromises = [];
      for (let bh = h; bh <= batchEnd; bh++) {
        blockPromises.push(
          rpcCall('getblockhash', [bh])
            .then(hash => rpcCall('getblock', [hash, 2]))
            .catch(err => null)
        );
      }

      const blocks = await Promise.all(blockPromises);

      // Process blocks
      for (const block of blocks) {
        if (!block) continue;

        const stakes = findStakesInBlock(block, targetAddresses);
        for (const stake of stakes) {
          if (await saveStake(stake)) {
            stakesFound++;
          }
        }
        globalStats.blocksScanned++;
      }

      // Progress update
      if ((h - startHeight) % (BATCH_SIZE * 10) === 0) {
        const progress = (((h - startHeight) / totalBlocks) * 100).toFixed(1);
        process.stdout.write(
          `\r   Progress: ${progress}% | Stakes: ${stakesFound}`
        );
      }
    } catch (error) {
      console.error(`\n   ❌ Batch error at block ${h}: ${error.message}`);
      globalStats.errors++;
    }
  }

  // Update UTXOs from current state
  console.log(`\n   🔄 Updating UTXOs...`);
  const utxosUpdated = await updateUTXOs(verusid.address);

  console.log(`   ✅ Complete: ${stakesFound} stakes, ${utxosUpdated} UTXOs`);

  return { stakes: stakesFound, utxos: utxosUpdated };
}

/**
 * Main execution
 */
async function main() {
  try {
    // Get current blockchain height
    const blockchainInfo = await rpcCall('getblockchaininfo');
    const currentTip = blockchainInfo.blocks;

    console.log(`Current blockchain height: ${currentTip.toLocaleString()}\n`);

    // Get all VerusIDs from database
    const result = await pool.query(`
      SELECT 
        identity_address,
        base_name,
        friendly_name,
        first_seen_block
      FROM identities
      WHERE identity_address LIKE 'i%'
      ORDER BY identity_address
    `);

    const totalVerusIDs = result.rows.length;
    const verusids = result.rows
      .filter(
        r =>
          r.base_name &&
          r.base_name !== 'unknown' &&
          r.friendly_name &&
          r.friendly_name !== 'unknown.VRSC@'
      )
      .map(r => ({
        address: r.identity_address,
        name: r.base_name || 'unknown',
        friendlyName: r.friendly_name,
        firstSeenBlock: r.first_seen_block,
      }));

    const skippedUnknown = totalVerusIDs - verusids.length;
    console.log(`Found ${totalVerusIDs} total VerusIDs in database`);
    if (skippedUnknown > 0) {
      console.log(`Skipping ${skippedUnknown} VerusIDs with unknown names`);
    }
    console.log(`Processing ${verusids.length} VerusIDs with valid names\n`);

    // Process VerusIDs in parallel batches
    for (let i = 0; i < verusids.length; i += PARALLEL_SCANS) {
      const batch = verusids.slice(i, i + PARALLEL_SCANS);

      const results = await Promise.allSettled(
        batch.map(verusid => scanVerusID(verusid, currentTip))
      );

      // Update stats
      for (const result of results) {
        if (result.status === 'fulfilled') {
          globalStats.totalStakes += result.value.stakes;
          globalStats.totalUtxos += result.value.utxos;
          globalStats.verusidsProcessed++;
        } else {
          globalStats.errors++;
        }
      }

      // Progress summary
      console.log(`\n${'═'.repeat(60)}`);
      console.log(
        `Progress: ${globalStats.verusidsProcessed}/${verusids.length} VerusIDs`
      );
      console.log(
        `Stakes: ${globalStats.totalStakes.toLocaleString()} | UTXOs: ${globalStats.totalUtxos.toLocaleString()}`
      );
      console.log(
        `Blocks scanned: ${globalStats.blocksScanned.toLocaleString()}`
      );
      console.log(`Errors: ${globalStats.errors}`);
      console.log(`${'═'.repeat(60)}`);
    }

    // Final summary
    const duration = ((Date.now() - globalStats.startTime) / 1000 / 60).toFixed(
      2
    );
    console.log(
      `\n\n╔═══════════════════════════════════════════════════════════╗`
    );
    console.log(
      `║   SCAN COMPLETE                                           ║`
    );
    console.log(
      `╚═══════════════════════════════════════════════════════════╝`
    );
    console.log(`\n📊 Final Statistics:`);
    console.log(
      `   VerusIDs processed: ${globalStats.verusidsProcessed.toLocaleString()}`
    );
    console.log(
      `   Creation blocks fetched: ${globalStats.creationBlocksFetched.toLocaleString()}`
    );
    console.log(
      `   Total stakes found: ${globalStats.totalStakes.toLocaleString()}`
    );
    console.log(
      `   Total UTXOs updated: ${globalStats.totalUtxos.toLocaleString()}`
    );
    console.log(
      `   Blocks scanned: ${globalStats.blocksScanned.toLocaleString()}`
    );
    console.log(`   Errors: ${globalStats.errors}`);
    console.log(`   Duration: ${duration} minutes\n`);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
