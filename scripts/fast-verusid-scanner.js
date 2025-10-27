#!/usr/bin/env node
/**
 * fast-verusid-scanner.js
 * OPTIMIZED high-speed scanner for VerusIDs
 *
 * Strategy:
 * 1. Focus on PoS blocks only (skip PoW blocks entirely)
 * 2. Use larger batch sizes
 * 3. Process multiple VerusIDs in parallel
 * 4. Use efficient RPC calls
 */

require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');
const http = require('http');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║   FAST VerusID Scanner - Optimized for 32K VerusIDs        ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// Configuration
const BATCH_SIZE = 500; // Larger batches for speed
const PARALLEL_SCANS = 5; // More parallel processing
const POS_BLOCK_SAMPLE_RATE = 10; // Sample every 10th block for PoS detection

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
  totalBlocks: 0,
  posBlocksFound: 0,
  posBlocksScanned: 0,
  errors: 0,
  startTime: Date.now(),
};

// Make RPC call
async function rpcCall(method, params = []) {
  const auth = Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString('base64');
  const postData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'fast-scanner',
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
      return null;
    }

    const firstEntry = history.history[0];
    return firstEntry.height;
  } catch (error) {
    return null;
  }
}

/**
 * Find PoS blocks in a range (sampling approach)
 */
async function findPosBlocks(startHeight, endHeight) {
  const posBlocks = [];

  // Sample every Nth block to find PoS blocks
  for (let h = startHeight; h <= endHeight; h += POS_BLOCK_SAMPLE_RATE) {
    try {
      const blockHash = await rpcCall('getblockhash', [h]);
      const block = await rpcCall('getblock', [blockHash, 2]);

      if (block.validationtype === 'stake' || block.blocktype === 'minted') {
        posBlocks.push(h);
        globalStats.posBlocksFound++;
      }

      globalStats.totalBlocks++;
    } catch (error) {
      // Skip errors, continue scanning
    }
  }

  return posBlocks;
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
 * Save stakes to database (batch insert)
 */
async function saveStakes(stakes) {
  if (stakes.length === 0) return 0;

  try {
    const values = stakes
      .map((stake, index) => {
        const offset = index * 7;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`;
      })
      .join(', ');

    const params = stakes.flatMap(stake => [
      stake.address,
      stake.blockHeight,
      stake.blockHash,
      stake.blockTime,
      stake.txid,
      stake.vout,
      stake.reward,
    ]);

    await pool.query(
      `
      INSERT INTO staking_rewards 
        (identity_address, block_height, block_hash, block_time, txid, vout_index, amount_sats)
      VALUES ${values}
      ON CONFLICT (identity_address, block_height, txid) 
      DO UPDATE SET 
        amount_sats = EXCLUDED.amount_sats,
        block_time = EXCLUDED.block_time
    `,
      params
    );

    return stakes.length;
  } catch (error) {
    console.error(`   ❌ Failed to save stakes: ${error.message}`);
    return 0;
  }
}

/**
 * Fast scan a single VerusID
 */
async function fastScanVerusID(verusid, currentTip) {
  console.log(`📋 Scanning: ${verusid.friendlyName || verusid.name}`);
  console.log(`   Address: ${verusid.address}`);

  // Get creation block
  let creationBlock = verusid.firstSeenBlock;

  if (!creationBlock) {
    console.log(`   🔍 Fetching creation block...`);
    creationBlock = await getCreationBlock(
      verusid.friendlyName || verusid.name + '@'
    );

    if (!creationBlock) {
      console.log(`   ❌ Could not determine creation block, skipping`);
      globalStats.errors++;
      return { stakes: 0 };
    }

    console.log(`   ✅ Creation block: ${creationBlock.toLocaleString()}`);

    // Update database with creation block
    try {
      await pool.query(
        `
        UPDATE identities 
        SET first_seen_block = $1
        WHERE identity_address = $2
      `,
        [creationBlock, verusid.address]
      );
    } catch (error) {
      // Ignore update errors
    }
  } else {
    console.log(
      `   ✅ Using cached creation block: ${creationBlock.toLocaleString()}`
    );
  }

  // Determine scan range (focus on recent blocks for speed)
  const startHeight = creationBlock;
  const endHeight = Math.min(currentTip, startHeight + 500000); // Limit to 500k blocks for speed

  console.log(
    `   📊 Scan range: ${startHeight.toLocaleString()} → ${endHeight.toLocaleString()}`
  );

  // Find PoS blocks in range
  console.log(`   🔍 Finding PoS blocks...`);
  const posBlocks = await findPosBlocks(startHeight, endHeight);
  console.log(`   ✅ Found ${posBlocks.length} PoS blocks to scan`);

  if (posBlocks.length === 0) {
    console.log(`   ⚠️  No PoS blocks found in range`);
    return { stakes: 0 };
  }

  // Scan PoS blocks for stakes
  let stakesFound = 0;
  const targetAddresses = new Set([verusid.address]);

  // Process PoS blocks in batches
  for (let i = 0; i < posBlocks.length; i += BATCH_SIZE) {
    const batch = posBlocks.slice(i, i + BATCH_SIZE);

    try {
      // Fetch blocks in batch
      const blockPromises = batch.map(async blockHeight => {
        try {
          const blockHash = await rpcCall('getblockhash', [blockHeight]);
          const block = await rpcCall('getblock', [blockHash, 2]);
          return block;
        } catch (error) {
          return null;
        }
      });

      const blocks = await Promise.all(blockPromises);
      const allStakes = [];

      // Process blocks
      for (const block of blocks) {
        if (!block) continue;

        const stakes = findStakesInBlock(block, targetAddresses);
        allStakes.push(...stakes);
        globalStats.posBlocksScanned++;
      }

      // Save stakes in batch
      if (allStakes.length > 0) {
        const saved = await saveStakes(allStakes);
        stakesFound += saved;
      }

      // Progress update
      const progress = (((i + batch.length) / posBlocks.length) * 100).toFixed(
        1
      );
      process.stdout.write(
        `\r   Progress: ${progress}% | PoS blocks: ${globalStats.posBlocksScanned} | Stakes: ${stakesFound}`
      );
    } catch (error) {
      console.error(`\n   ❌ Batch error: ${error.message}`);
      globalStats.errors++;
    }
  }

  console.log(`\n   ✅ Complete: ${stakesFound} stakes found`);

  return { stakes: stakesFound };
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

    // Get valid VerusIDs from database (limit for testing)
    const LIMIT = process.argv[2] ? parseInt(process.argv[2]) : 100; // Default to 100 for testing
    console.log(
      `Processing first ${LIMIT} VerusIDs (use argument to change: node script.js 1000)\n`
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

    // Process VerusIDs in parallel batches
    for (let i = 0; i < verusids.length; i += PARALLEL_SCANS) {
      const batch = verusids.slice(i, i + PARALLEL_SCANS);

      const results = await Promise.allSettled(
        batch.map(verusid => fastScanVerusID(verusid, currentTip))
      );

      // Update stats
      for (const result of results) {
        if (result.status === 'fulfilled') {
          globalStats.totalStakes += result.value.stakes;
          globalStats.verusidsProcessed++;
        } else {
          globalStats.errors++;
        }
      }

      // Progress summary
      const duration = (
        (Date.now() - globalStats.startTime) /
        1000 /
        60
      ).toFixed(2);
      console.log(`\n${'═'.repeat(60)}`);
      console.log(
        `Progress: ${globalStats.verusidsProcessed}/${verusids.length} VerusIDs`
      );
      console.log(
        `Stakes: ${globalStats.totalStakes.toLocaleString()} | PoS blocks: ${globalStats.posBlocksScanned.toLocaleString()}`
      );
      console.log(
        `Errors: ${globalStats.errors} | Duration: ${duration} minutes`
      );
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
      `║   FAST SCAN COMPLETE                                      ║`
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
      `   PoS blocks scanned: ${globalStats.posBlocksScanned.toLocaleString()}`
    );
    console.log(
      `   Total blocks checked: ${globalStats.totalBlocks.toLocaleString()}`
    );
    console.log(`   Errors: ${globalStats.errors}`);
    console.log(`   Duration: ${duration} minutes`);
    console.log(
      `   Speed: ${((globalStats.verusidsProcessed / (Date.now() - globalStats.startTime)) * 1000 * 60).toFixed(2)} VerusIDs/minute\n`
    );
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
