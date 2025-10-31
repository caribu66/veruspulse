#!/usr/bin/env node
/**
 * on-demand-verusid-scanner.js
 * On-demand scanner that runs when a user searches for their VerusID
 *
 * Features:
 * - Scans only the requested VerusID
 * - Shows real-time progress
 * - Saves results to database
 * - Returns JSON response for frontend
 */

require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');
const http = require('http');

// Configuration
const BATCH_SIZE = 500; // Much larger batches for speed
const MAX_SCAN_TIME_MS = 180000; // 3 minutes maximum
const BLOCKS_PER_DAY = 1440; // ~1 block per minute
const MAX_DAYS_TO_SCAN = 180; // Only scan last 6 months for speed
const MAX_BLOCKS_TO_SCAN = BLOCKS_PER_DAY * MAX_DAYS_TO_SCAN; // ~259,200 blocks

// RPC configuration
const RPC_URL = process.env.VERUS_RPC_HOST || 'http://127.0.0.1:18843';
const RPC_USER = process.env.VERUS_RPC_USER || 'verus';
const RPC_PASS = process.env.VERUS_RPC_PASSWORD || 'verus';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

// Progress tracking
let scanProgress = {
  status: 'idle', // idle, scanning, complete, error
  progress: 0,
  currentStep: '',
  stakesFound: 0,
  blocksScanned: 0,
  totalBlocks: 0,
  startTime: null,
  estimatedTimeRemaining: null,
};

// Make RPC call
async function rpcCall(method, params = []) {
  const auth = Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString('base64');
  const postData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'on-demand-scanner',
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
    scanProgress.currentStep = `Fetching creation block for ${friendlyName}...`;

    const history = await rpcCall('getidentityhistory', [friendlyName]);

    if (!history || !history.history || history.history.length === 0) {
      return null;
    }

    const firstEntry = history.history[0];
    return firstEntry.height;
  } catch (error) {
    throw new Error(`Failed to get creation block: ${error.message}`);
  }
}

/**
 * Find PoS blocks in a range
 */
async function findPosBlocks(startHeight, endHeight) {
  scanProgress.currentStep = `Finding PoS blocks in range ${startHeight.toLocaleString()} → ${endHeight.toLocaleString()}...`;

  const posBlocks = [];
  const totalBlocksToCheck = Math.ceil(
    (endHeight - startHeight) / POS_BLOCK_SAMPLE_RATE
  );
  let blocksChecked = 0;

  for (let h = startHeight; h <= endHeight; h += POS_BLOCK_SAMPLE_RATE) {
    try {
      const blockHash = await rpcCall('getblockhash', [h]);
      const block = await rpcCall('getblock', [blockHash, 2]);

      if (block.validationtype === 'stake' || block.blocktype === 'minted') {
        posBlocks.push(h);
      }

      blocksChecked++;

      // Update progress
      if (blocksChecked % 100 === 0) {
        scanProgress.progress = (blocksChecked / totalBlocksToCheck) * 20; // 20% for PoS finding
        console.log(
          `   Finding PoS blocks: ${blocksChecked}/${totalBlocksToCheck} (${scanProgress.progress.toFixed(1)}%)`
        );
      }
    } catch (error) {
      // Skip errors, continue scanning
    }
  }

  console.log(`   ✅ Found ${posBlocks.length} PoS blocks to scan`);
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
 * Save stakes to database
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
    throw new Error(`Failed to save stakes: ${error.message}`);
  }
}

/**
 * Update UTXOs from daemon
 */
async function updateUTXOs(identityAddress) {
  try {
    scanProgress.currentStep = `Updating UTXOs for ${identityAddress}...`;

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
    throw new Error(`Failed to update UTXOs: ${error.message}`);
  }
}

/**
 * Main on-demand scan function
 */
async function scanVerusID(verusidName) {
  try {
    scanProgress.status = 'scanning';
    scanProgress.progress = 0;
    scanProgress.currentStep = 'Starting scan...';
    scanProgress.stakesFound = 0;
    scanProgress.blocksScanned = 0;
    scanProgress.startTime = Date.now();

    console.log(`🔍 Starting on-demand scan for: ${verusidName}`);

    // Step 1: Get VerusID info from database
    scanProgress.currentStep = `Looking up VerusID in database...`;
    scanProgress.progress = 5;

    const result = await pool.query(
      `
      SELECT identity_address, base_name, friendly_name, first_seen_block
      FROM identities
      WHERE friendly_name ILIKE $1
         OR base_name ILIKE $2
         OR friendly_name ILIKE $3
      LIMIT 1
    `,
      [
        verusidName,
        verusidName.replace('@', ''),
        `%${verusidName.replace('@', '')}%`,
      ]
    );

    if (result.rows.length === 0) {
      throw new Error(`VerusID not found in database: ${verusidName}`);
    }

    const verusid = result.rows[0];
    console.log(`   ✅ Found VerusID: ${verusid.friendly_name}`);
    console.log(`   Address: ${verusid.identity_address}`);

    // Step 2: Get creation block
    scanProgress.currentStep = `Getting creation block...`;
    scanProgress.progress = 10;

    let creationBlock = verusid.first_seen_block;

    if (!creationBlock) {
      creationBlock = await getCreationBlock(verusid.friendly_name);

      if (!creationBlock) {
        throw new Error(
          `Could not determine creation block for ${verusidName}`
        );
      }

      console.log(`   ✅ Creation block: ${creationBlock.toLocaleString()}`);

      // Update database with creation block
      await pool.query(
        `
        UPDATE identities 
        SET first_seen_block = $1
        WHERE identity_address = $2
      `,
        [creationBlock, verusid.identity_address]
      );
    } else {
      console.log(
        `   ✅ Using cached creation block: ${creationBlock.toLocaleString()}`
      );
    }

    // Step 3: Get current blockchain height
    scanProgress.currentStep = `Getting current blockchain height...`;
    scanProgress.progress = 15;

    const blockchainInfo = await rpcCall('getblockchaininfo');
    const currentTip = blockchainInfo.blocks;

    // Step 4: Determine scan range
    const startHeight = creationBlock;
    const endHeight = Math.min(currentTip, startHeight + MAX_BLOCKS_TO_SCAN);
    const totalBlocks = endHeight - startHeight + 1;

    console.log(
      `   📊 Scan range: ${startHeight.toLocaleString()} → ${endHeight.toLocaleString()}`
    );
    console.log(`   📊 Total blocks: ${totalBlocks.toLocaleString()}`);

    scanProgress.totalBlocks = totalBlocks;

    // Step 5: Find PoS blocks
    scanProgress.progress = 20;
    const posBlocks = await findPosBlocks(startHeight, endHeight);

    if (posBlocks.length === 0) {
      console.log(`   ⚠️  No PoS blocks found in range`);
      scanProgress.status = 'complete';
      scanProgress.progress = 100;
      return { stakes: 0, utxos: 0 };
    }

    console.log(`   🎯 Found ${posBlocks.length} PoS blocks to scan`);

    // Step 6: Scan PoS blocks for stakes
    scanProgress.currentStep = `Scanning PoS blocks for stakes...`;
    scanProgress.progress = 30;

    const targetAddresses = new Set([verusid.identity_address]);
    let allStakes = [];
    let blocksScanned = 0;

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

        // Process blocks
        for (const block of blocks) {
          if (!block) continue;

          const stakes = findStakesInBlock(block, targetAddresses);
          allStakes.push(...stakes);
          blocksScanned++;
          scanProgress.blocksScanned = blocksScanned;
        }

        // Update progress (30% to 80% for stake scanning)
        const stakeProgress = (i / posBlocks.length) * 50 + 30;
        scanProgress.progress = Math.min(stakeProgress, 80);

        // Estimate time remaining
        if (scanProgress.startTime) {
          const elapsed = Date.now() - scanProgress.startTime;
          const rate = (blocksScanned / elapsed) * 1000; // blocks per second
          const remaining = (posBlocks.length - blocksScanned) / rate;
          scanProgress.estimatedTimeRemaining = Math.round(remaining);
        }

        console.log(
          `   Progress: ${scanProgress.progress.toFixed(1)}% | PoS blocks: ${blocksScanned}/${posBlocks.length} | Stakes: ${allStakes.length}`
        );
      } catch (error) {
        console.error(`   ❌ Batch error: ${error.message}`);
      }
    }

    // Step 7: Save stakes
    scanProgress.currentStep = `Saving stakes to database...`;
    scanProgress.progress = 85;

    const stakesSaved = await saveStakes(allStakes);
    scanProgress.stakesFound = stakesSaved;

    // Step 8: Update UTXOs
    scanProgress.currentStep = `Updating UTXOs...`;
    scanProgress.progress = 90;

    const utxosUpdated = await updateUTXOs(verusid.identity_address);

    // Step 9: Complete
    scanProgress.status = 'complete';
    scanProgress.progress = 100;
    scanProgress.currentStep = 'Scan complete!';

    const duration = ((Date.now() - scanProgress.startTime) / 1000).toFixed(1);
    console.log(`\n✅ Scan complete!`);
    console.log(`📊 Stakes found: ${stakesSaved}`);
    console.log(`📊 UTXOs updated: ${utxosUpdated}`);
    console.log(`⏱️  Duration: ${duration} seconds`);

    return {
      verusid: verusid.friendly_name,
      address: verusid.identity_address,
      creationBlock,
      stakes: stakesSaved,
      utxos: utxosUpdated,
      duration: parseFloat(duration),
      blocksScanned: blocksScanned,
    };
  } catch (error) {
    scanProgress.status = 'error';
    scanProgress.currentStep = `Error: ${error.message}`;
    console.error('❌ Scan failed:', error.message);
    throw error;
  }
}

/**
 * Get current progress
 */
function getProgress() {
  return { ...scanProgress };
}

/**
 * Main execution (for testing)
 */
async function main() {
  try {
    const verusidName = process.argv[2];
    if (!verusidName) {
      console.log('Usage: node on-demand-verusid-scanner.js <verusid-name>');
      console.log('Example: node on-demand-verusid-scanner.js "joanna@"');
      process.exit(1);
    }

    const result = await scanVerusID(verusidName);
    console.log('\n📊 Final Result:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Export functions for use in API
module.exports = {
  scanVerusID,
  getProgress,
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
