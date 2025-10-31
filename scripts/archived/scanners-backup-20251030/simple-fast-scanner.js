#!/usr/bin/env node
/**
 * simple-fast-scanner.js
 * Simple, reliable scanner with proper progress reporting
 */

require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');
const http = require('http');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║   Simple Fast VerusID Scanner                             ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// Configuration
const BATCH_SIZE = 100; // Smaller batches for reliability
const PARALLEL_SCANS = 3; // Conservative parallel processing

// RPC configuration
const RPC_URL = process.env.VERUS_RPC_HOST || 'http://127.0.0.1:18843';
const RPC_USER = process.env.VERUS_RPC_USER || 'verus';
const RPC_PASS = process.env.VERUS_RPC_PASSWORD || 'verus';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

// Global stats
let globalStats = {
  verusidsProcessed: 0,
  totalStakes: 0,
  totalBlocks: 0,
  errors: 0,
  startTime: Date.now(),
};

// Make RPC call with timeout
async function rpcCall(method, params = [], timeout = 10000) {
  const auth = Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString('base64');
  const postData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'simple-scanner',
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
    const timeoutId = setTimeout(() => {
      reject(new Error(`RPC timeout for ${method}`));
    }, timeout);

    const req = (url.protocol === 'https:' ? https : http).request(
      options,
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          clearTimeout(timeoutId);
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

    req.on('error', error => {
      clearTimeout(timeoutId);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
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

  // Need at least 2 transactions
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
 * Simple scan for a single VerusID
 */
async function simpleScanVerusID(verusid, currentTip) {
  const startTime = Date.now();

  console.log(`📋 Scanning: ${verusid.friendlyName || verusid.name}`);
  console.log(`   Address: ${verusid.address}`);

  // Use creation block or default to a reasonable start
  const startHeight = verusid.firstSeenBlock || 1000000; // Default to block 1M if no creation block
  const endHeight = Math.min(currentTip, startHeight + 100000); // Limit to 100k blocks for speed

  console.log(
    `   📊 Scan range: ${startHeight.toLocaleString()} → ${endHeight.toLocaleString()}`
  );
  console.log(
    `   📊 Blocks to scan: ${(endHeight - startHeight + 1).toLocaleString()}`
  );

  const targetAddresses = new Set([verusid.address]);
  let stakesFound = 0;
  let blocksScanned = 0;
  let lastProgressUpdate = Date.now();

  // Scan blocks in batches
  for (let h = startHeight; h <= endHeight; h += BATCH_SIZE) {
    const batchEnd = Math.min(h + BATCH_SIZE - 1, endHeight);

    try {
      // Fetch blocks in batch
      const blockPromises = [];
      for (let bh = h; bh <= batchEnd; bh++) {
        blockPromises.push(
          rpcCall('getblockhash', [bh])
            .then(hash => rpcCall('getblock', [hash, 2]))
            .catch(err => null) // Skip failed blocks
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
            console.log(
              `   🎉 Found stake in block ${stake.blockHeight}: ${(stake.reward / 100000000).toFixed(8)} VRSC`
            );
          }
        }
        blocksScanned++;
        globalStats.totalBlocks++;
      }

      // Progress update every 5 seconds
      const now = Date.now();
      if (now - lastProgressUpdate > 5000) {
        const progress = (
          ((h - startHeight) / (endHeight - startHeight)) *
          100
        ).toFixed(1);
        const elapsed = ((now - startTime) / 1000).toFixed(1);
        const rate = ((blocksScanned / (now - startTime)) * 1000).toFixed(0);

        console.log(
          `   Progress: ${progress}% | Blocks: ${blocksScanned.toLocaleString()} | Stakes: ${stakesFound} | Rate: ${rate} blocks/sec | Elapsed: ${elapsed}s`
        );
        lastProgressUpdate = now;
      }
    } catch (error) {
      console.error(`   ❌ Batch error at block ${h}: ${error.message}`);
      globalStats.errors++;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`   ✅ Complete: ${stakesFound} stakes found in ${duration}s`);

  return { stakes: stakesFound };
}

/**
 * Main execution
 */
async function main() {
  try {
    // Get current blockchain height
    console.log('🔍 Getting current blockchain height...');
    const blockchainInfo = await rpcCall('getblockchaininfo');
    const currentTip = blockchainInfo.blocks;
    console.log(`Current blockchain height: ${currentTip.toLocaleString()}\n`);

    // Get VerusIDs from database (limit for testing)
    const LIMIT = process.argv[2] ? parseInt(process.argv[2]) : 5; // Default to 5 for testing
    console.log(
      `Processing first ${LIMIT} VerusIDs (use argument to change: node script.js 100)\n`
    );

    const result = await pool.query(
      `
      SELECT 
        identity_address,
        base_name,
        friendly_name,
        first_seen_block
      FROM identities
      WHERE identity_address LIKE 'i%'
        AND base_name IS NOT NULL 
        AND base_name != 'unknown' 
        AND friendly_name IS NOT NULL 
        AND friendly_name != 'unknown.VRSC@'
      ORDER BY identity_address
      LIMIT $1
    `,
      [LIMIT]
    );

    const verusids = result.rows.map(r => ({
      address: r.identity_address,
      name: r.base_name || 'unknown',
      friendlyName: r.friendly_name,
      firstSeenBlock: r.first_seen_block,
    }));

    console.log(`Found ${verusids.length} VerusIDs to scan\n`);

    // Process VerusIDs sequentially (more reliable)
    for (const verusid of verusids) {
      const result = await simpleScanVerusID(verusid, currentTip);
      globalStats.totalStakes += result.stakes;
      globalStats.verusidsProcessed++;

      // Summary after each VerusID
      const duration = (
        (Date.now() - globalStats.startTime) /
        1000 /
        60
      ).toFixed(2);
      console.log(`\n${'─'.repeat(50)}`);
      console.log(
        `Progress: ${globalStats.verusidsProcessed}/${verusids.length} VerusIDs`
      );
      console.log(`Total stakes: ${globalStats.totalStakes.toLocaleString()}`);
      console.log(`Total blocks: ${globalStats.totalBlocks.toLocaleString()}`);
      console.log(`Errors: ${globalStats.errors}`);
      console.log(`Duration: ${duration} minutes`);
      console.log(`${'─'.repeat(50)}\n`);
    }

    // Final summary
    const duration = ((Date.now() - globalStats.startTime) / 1000 / 60).toFixed(
      2
    );
    console.log(
      `\n\n╔═══════════════════════════════════════════════════════════╗`
    );
    console.log(
      `║   SCAN COMPLETE                                            ║`
    );
    console.log(
      `╚═══════════════════════════════════════════════════════════╝`
    );
    console.log(`\n📊 Final Statistics:`);
    console.log(
      `   VerusIDs processed: ${globalStats.verusidsProcessed.toLocaleString()}`
    );
    console.log(
      `   Total stakes found: ${globalStats.totalStakes.toLocaleString()}`
    );
    console.log(
      `   Total blocks scanned: ${globalStats.totalBlocks.toLocaleString()}`
    );
    console.log(`   Errors: ${globalStats.errors}`);
    console.log(`   Duration: ${duration} minutes`);
    console.log(
      `   Speed: ${((globalStats.totalBlocks / (Date.now() - globalStats.startTime)) * 1000 * 60).toFixed(0)} blocks/minute\n`
    );
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
