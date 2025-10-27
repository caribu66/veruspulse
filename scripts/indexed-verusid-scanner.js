#!/usr/bin/env node
/**
 * indexed-verusid-scanner.js
 * FAST scanner that uses the pre-built PoS block index
 *
 * This scanner is 100x faster because it only scans known PoS blocks
 * instead of checking every block in the blockchain.
 *
 * Prerequisites: Run build-pos-block-index.js first to build the index
 */

require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');
const http = require('http');

console.log('⚡ Indexed VerusID Scanner - Uses PoS Block Index');

// Configuration
const BATCH_SIZE = 200;

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
  status: 'idle',
  progress: 0,
  currentStep: '',
  stakesFound: 0,
  utxosFound: 0,
  blocksScanned: 0,
  totalBlocks: 0,
  startTime: null,
};

// Make RPC call
async function rpcCall(method, params = []) {
  const auth = Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString('base64');
  const postData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'indexed-scanner',
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
 * Get UTXOs (FAST - 1 RPC call)
 */
async function updateUTXOs(identityAddress) {
  try {
    scanProgress.currentStep = `Fetching UTXOs...`;
    console.log('   🔍 Fetching UTXOs from daemon...');

    const utxos = await rpcCall('getaddressutxos', [
      { addresses: [identityAddress] },
    ]);

    if (!utxos || utxos.length === 0) {
      console.log('   ℹ️  No UTXOs found');
      return 0;
    }

    console.log(`   ✅ Found ${utxos.length} UTXOs`);

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
            (txid, vout, address, value, creation_height, is_spent, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, false, NOW(), NOW())
          ON CONFLICT (txid, vout) 
          DO UPDATE SET 
            value = EXCLUDED.value,
            is_spent = false,
            updated_at = NOW()
        `,
          [
            utxo.txid,
            utxo.outputIndex,
            identityAddress,
            Math.round(utxo.satoshis),
            utxo.height,
          ]
        );
        inserted++;
      } catch (error) {
        if (!error.message.includes('duplicate')) {
          console.error(`   ⚠️  UTXO insert error: ${error.message}`);
        }
      }
    }

    scanProgress.utxosFound = inserted;
    return inserted;
  } catch (error) {
    throw new Error(`Failed to update UTXOs: ${error.message}`);
  }
}

/**
 * Get PoS blocks from index
 */
async function getPosBlocksFromIndex(startHeight, endHeight) {
  try {
    scanProgress.currentStep = `Getting PoS blocks from index...`;
    console.log('   🔍 Fetching PoS blocks from index...');

    const result = await pool.query(
      `
      SELECT block_height, block_hash
      FROM pos_blocks
      WHERE block_height >= $1 AND block_height <= $2
      ORDER BY block_height
    `,
      [startHeight, endHeight]
    );

    const blocks = result.rows.map(r => ({
      height: r.block_height,
      hash: r.block_hash,
    }));

    console.log(
      `   ✅ Found ${blocks.length.toLocaleString()} PoS blocks in index`
    );

    return blocks;
  } catch (error) {
    throw new Error(`Failed to get PoS blocks from index: ${error.message}`);
  }
}

/**
 * Find stakes in a block
 * Based on Oink70's PoS-rewards.sh: tx[0].vout[0] contains the staker address
 */
function findStakesInBlock(block, targetAddress) {
  const stakes = [];

  if (!block || !block.tx || block.tx.length === 0) return stakes;

  // Coinstake transaction (first tx)
  const coinstake = block.tx[0];
  if (!coinstake || !coinstake.vout || coinstake.vout.length === 0)
    return stakes;

  // According to Oink70's script: staker address is in tx[0].vout[0]
  const stakerVout = coinstake.vout[0];
  if (
    !stakerVout ||
    !stakerVout.scriptPubKey ||
    !stakerVout.scriptPubKey.addresses
  )
    return stakes;

  // Check if our target address is the staker
  if (stakerVout.scriptPubKey.addresses.includes(targetAddress)) {
    // Calculate total reward (sum of all vout values in coinstake)
    const totalReward = coinstake.vout.reduce(
      (sum, v) => sum + (v.value || 0),
      0
    );

    stakes.push({
      address: targetAddress,
      blockHeight: block.height,
      blockHash: block.hash,
      blockTime: new Date(block.time * 1000),
      txid: coinstake.txid,
      vout: 0, // Staker is always in vout[0]
      reward: Math.round(totalReward * 100000000), // Convert to satoshis
    });
  }

  return stakes;
}

/**
 * Scan PoS blocks for stakes
 */
async function scanPosBlocks(posBlocks, identityAddress) {
  scanProgress.currentStep = `Scanning ${posBlocks.length.toLocaleString()} PoS blocks...`;
  scanProgress.totalBlocks = posBlocks.length;
  console.log(
    `   🎯 Scanning ${posBlocks.length.toLocaleString()} PoS blocks for stakes...\n`
  );

  let allStakes = [];
  let blocksScanned = 0;

  // Process blocks in batches
  for (let i = 0; i < posBlocks.length; i += BATCH_SIZE) {
    const batch = posBlocks.slice(i, i + BATCH_SIZE);

    try {
      // Fetch blocks in parallel
      const blockPromises = batch.map(async posBlock => {
        try {
          const block = await rpcCall('getblock', [posBlock.hash, 2]);
          return block;
        } catch (error) {
          return null;
        }
      });

      const blocks = await Promise.all(blockPromises);

      // Process blocks
      for (const block of blocks) {
        if (!block) continue;

        const stakes = findStakesInBlock(block, identityAddress);
        allStakes.push(...stakes);
        blocksScanned++;
        scanProgress.blocksScanned = blocksScanned;
      }

      // Update progress
      scanProgress.progress = 20 + (blocksScanned / posBlocks.length) * 60;

      // Estimate time remaining
      if (scanProgress.startTime && blocksScanned % 500 === 0) {
        const elapsed = Date.now() - scanProgress.startTime;
        const rate = (blocksScanned / elapsed) * 1000; // blocks per second
        const remaining = (posBlocks.length - blocksScanned) / rate;

        console.log(
          `   Progress: ${scanProgress.progress.toFixed(1)}% | Blocks: ${blocksScanned.toLocaleString()}/${posBlocks.length.toLocaleString()} | Stakes: ${allStakes.length} | ETA: ${Math.round(remaining)}s`
        );
      }
    } catch (error) {
      console.error(`   ❌ Batch error: ${error.message}`);
    }
  }

  console.log(`   ✅ Found ${allStakes.length} stakes\n`);
  return allStakes;
}

/**
 * Save stakes to database
 */
async function saveStakes(stakes, identityAddress) {
  if (stakes.length === 0) return 0;

  scanProgress.currentStep = `Saving ${stakes.length} stakes...`;
  scanProgress.progress = 85;
  console.log(`   💾 Saving stakes to database...`);

  try {
    const values = stakes
      .map((stake, index) => {
        const offset = index * 8;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`;
      })
      .join(', ');

    const params = stakes.flatMap(stake => [
      identityAddress,
      stake.blockHeight,
      stake.blockHash,
      stake.blockTime,
      stake.txid,
      stake.vout,
      stake.reward,
      'stake',
    ]);

    await pool.query(
      `
      INSERT INTO staking_rewards 
        (identity_address, block_height, block_hash, block_time, txid, vout, amount_sats, classifier)
      VALUES ${values}
      ON CONFLICT DO NOTHING
    `,
      params
    );

    return stakes.length;
  } catch (error) {
    throw new Error(`Failed to save stakes: ${error.message}`);
  }
}

/**
 * Main indexed scan function
 */
async function indexedScanVerusID(verusidName) {
  try {
    scanProgress.status = 'scanning';
    scanProgress.progress = 0;
    scanProgress.currentStep = 'Starting indexed scan...';
    scanProgress.stakesFound = 0;
    scanProgress.utxosFound = 0;
    scanProgress.blocksScanned = 0;
    scanProgress.startTime = Date.now();

    console.log(`\n⚡ Starting INDEXED scan for: ${verusidName}\n`);

    // Step 1: Get VerusID info
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
      throw new Error(`VerusID not found: ${verusidName}`);
    }

    const verusid = result.rows[0];
    console.log(`✅ Found VerusID: ${verusid.friendly_name}`);
    console.log(`   Address: ${verusid.identity_address}`);
    console.log(
      `   Creation block: ${verusid.first_seen_block || 'Unknown'}\n`
    );

    // Step 2: Update UTXOs (FAST)
    const utxosUpdated = await updateUTXOs(verusid.identity_address);
    console.log('');

    // Step 3: Get current blockchain height
    const blockchainInfo = await rpcCall('getblockchaininfo');
    const currentTip = blockchainInfo.blocks;
    const startHeight = verusid.first_seen_block || 800200;

    console.log(
      `   📊 Scan range: ${startHeight.toLocaleString()} → ${currentTip.toLocaleString()}\n`
    );

    // Step 4: Get PoS blocks from index
    const posBlocks = await getPosBlocksFromIndex(startHeight, currentTip);

    if (posBlocks.length === 0) {
      console.log('   ⚠️  No PoS blocks found in index for this range!');
      console.log(
        '   💡 Run build-pos-block-index.js first to build the index.\n'
      );
      return {
        verusid: verusid.friendly_name,
        address: verusid.identity_address,
        stakes: 0,
        utxos: utxosUpdated,
        blocksScanned: 0,
        duration: 0,
        error: 'PoS block index not built',
      };
    }

    console.log('');

    // Step 5: Scan PoS blocks
    const stakes = await scanPosBlocks(posBlocks, verusid.identity_address);

    // Step 6: Save stakes
    const stakesSaved = await saveStakes(stakes, verusid.identity_address);
    scanProgress.stakesFound = stakesSaved;
    console.log('');

    // Complete
    scanProgress.status = 'complete';
    scanProgress.progress = 100;

    const duration = ((Date.now() - scanProgress.startTime) / 1000).toFixed(1);
    console.log(`✅ INDEXED SCAN COMPLETE!`);
    console.log(`📊 Stakes found: ${stakesSaved}`);
    console.log(`📊 UTXOs updated: ${utxosUpdated}`);
    console.log(
      `📊 PoS blocks scanned: ${scanProgress.blocksScanned.toLocaleString()}`
    );
    console.log(`⏱️  Duration: ${duration} seconds\n`);

    return {
      verusid: verusid.friendly_name,
      address: verusid.identity_address,
      stakes: stakesSaved,
      utxos: utxosUpdated,
      blocksScanned: scanProgress.blocksScanned,
      duration: parseFloat(duration),
    };
  } catch (error) {
    scanProgress.status = 'error';
    console.error('❌ Indexed scan failed:', error.message);
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
 * Main execution
 */
async function main() {
  try {
    const verusidName = process.argv[2];
    if (!verusidName) {
      console.log('Usage: node indexed-verusid-scanner.js <verusid-name>');
      console.log('Example: node indexed-verusid-scanner.js "caribu66@"');
      console.log(
        '\nPrerequisite: Run build-pos-block-index.js first to build the PoS block index'
      );
      process.exit(1);
    }

    const result = await indexedScanVerusID(verusidName);
    console.log('📊 Final Result:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Export functions
module.exports = {
  indexedScanVerusID,
  getProgress,
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
