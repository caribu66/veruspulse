#!/usr/bin/env node
/**
 * build-pos-block-index.js
 * ONE-TIME scanner to build complete PoS block index
 *
 * This scans the entire blockchain once and stores all PoS block numbers
 * in the database. Once complete, scanning any VerusID becomes much faster
 * because we only scan known PoS blocks instead of all blocks.
 *
 * Estimated time: 2-4 hours for full blockchain
 * But this is a ONE-TIME operation that benefits ALL VerusIDs forever!
 */

require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');
const http = require('http');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║   PoS Block Index Builder - ONE-TIME OPERATION            ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// Configuration
const BATCH_SIZE = 200; // Larger batches for speed
const CHECKPOINT_INTERVAL = 5000; // Save progress every 5000 blocks

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
let stats = {
  startTime: Date.now(),
  blocksScanned: 0,
  posBlocksFound: 0,
  lastSavedHeight: 0,
  currentHeight: 0,
  totalBlocks: 0,
};

// Make RPC call
async function rpcCall(method, params = []) {
  const auth = Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString('base64');
  const postData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'pos-indexer',
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
 * Get the last indexed block height
 */
async function getLastIndexedBlock() {
  try {
    const result = await pool.query(`
      SELECT MAX(block_height) as last_height
      FROM pos_blocks
    `);

    const lastHeight = result.rows[0].last_height;
    return lastHeight ? parseInt(lastHeight) : null;
  } catch (error) {
    return null;
  }
}

/**
 * Save PoS blocks to database (batch insert)
 */
async function savePosBlocks(posBlocks) {
  if (posBlocks.length === 0) return 0;

  try {
    const values = posBlocks
      .map((block, index) => {
        const offset = index * 4;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
      })
      .join(', ');

    const params = posBlocks.flatMap(block => [
      block.height,
      block.hash,
      block.time,
      block.stakerAddress,
    ]);

    await pool.query(
      `
      INSERT INTO pos_blocks 
        (block_height, block_hash, block_time, staker_address)
      VALUES ${values}
      ON CONFLICT (block_height) DO NOTHING
    `,
      params
    );

    return posBlocks.length;
  } catch (error) {
    console.error(`   ❌ Failed to save PoS blocks: ${error.message}`);
    return 0;
  }
}

/**
 * Scan blocks in batches
 */
async function scanBlocks(startHeight, endHeight) {
  console.log(
    `\n📊 Scanning blocks ${startHeight.toLocaleString()} → ${endHeight.toLocaleString()}\n`
  );

  stats.totalBlocks = endHeight - startHeight + 1;
  let posBlocksBuffer = [];

  for (let height = startHeight; height <= endHeight; height += BATCH_SIZE) {
    const batchEnd = Math.min(height + BATCH_SIZE - 1, endHeight);
    const batch = [];

    for (let h = height; h <= batchEnd; h++) {
      batch.push(h);
    }

    try {
      // Fetch blocks in parallel
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

        stats.blocksScanned++;
        stats.currentHeight = block.height;

        // Check if this is a PoS block
        const isPoS =
          block.validationtype === 'stake' || block.blocktype === 'minted';

        if (isPoS) {
          // Extract staker address from tx[0].vout[0] (Oink70's method)
          let stakerAddress = null;

          if (
            block.tx &&
            block.tx.length > 0 &&
            block.tx[0].vout &&
            block.tx[0].vout.length > 0 &&
            block.tx[0].vout[0].scriptPubKey &&
            block.tx[0].vout[0].scriptPubKey.addresses
          ) {
            const addresses = block.tx[0].vout[0].scriptPubKey.addresses;
            // Get the first non-trustless address
            stakerAddress =
              addresses.find(
                addr => addr !== 'RCG8KwJNDVwpUBcdoa6AoHqHVJsA1uMYMR'
              ) || addresses[0];
          }

          posBlocksBuffer.push({
            height: block.height,
            hash: block.hash,
            time: new Date(block.time * 1000),
            stakerAddress: stakerAddress,
          });

          stats.posBlocksFound++;
        }
      }

      // Save PoS blocks periodically
      if (posBlocksBuffer.length >= 1000) {
        await savePosBlocks(posBlocksBuffer);
        posBlocksBuffer = [];
      }

      // Progress update
      if (stats.blocksScanned % 500 === 0) {
        const elapsed = Date.now() - stats.startTime;
        const rate = (stats.blocksScanned / elapsed) * 1000; // blocks per second
        const remaining = (stats.totalBlocks - stats.blocksScanned) / rate;
        const progress = (
          (stats.blocksScanned / stats.totalBlocks) *
          100
        ).toFixed(2);
        const posPercentage = (
          (stats.posBlocksFound / stats.blocksScanned) *
          100
        ).toFixed(1);

        console.log(
          `   Progress: ${progress}% | Blocks: ${stats.blocksScanned.toLocaleString()}/${stats.totalBlocks.toLocaleString()} | PoS: ${stats.posBlocksFound.toLocaleString()} (${posPercentage}%) | Rate: ${rate.toFixed(1)}/s | ETA: ${Math.round(remaining)}s`
        );
      }

      // Checkpoint - save remaining buffer and update progress
      if (stats.blocksScanned % CHECKPOINT_INTERVAL === 0) {
        if (posBlocksBuffer.length > 0) {
          await savePosBlocks(posBlocksBuffer);
          posBlocksBuffer = [];
        }

        stats.lastSavedHeight = stats.currentHeight;
        console.log(
          `   💾 Checkpoint: Saved up to block ${stats.lastSavedHeight.toLocaleString()}`
        );
      }
    } catch (error) {
      console.error(`   ❌ Batch error at height ${height}: ${error.message}`);
    }
  }

  // Save remaining PoS blocks
  if (posBlocksBuffer.length > 0) {
    await savePosBlocks(posBlocksBuffer);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 Starting PoS Block Index Builder\n');

    // Get current blockchain height
    const blockchainInfo = await rpcCall('getblockchaininfo');
    const currentTip = blockchainInfo.blocks;
    console.log(`Current blockchain height: ${currentTip.toLocaleString()}`);

    // Check if we have a checkpoint to resume from
    const lastIndexed = await getLastIndexedBlock();

    let startHeight;
    if (lastIndexed) {
      startHeight = lastIndexed + 1;
      console.log(`Resuming from block: ${startHeight.toLocaleString()}`);
      console.log(`(Last indexed block: ${lastIndexed.toLocaleString()})\n`);
    } else {
      // Start from Caribu66@ creation block (earliest test VerusID)
      startHeight = 987861;
      console.log(
        `Starting from Caribu66@ creation block: ${startHeight.toLocaleString()}\n`
      );
    }

    // Scan all blocks
    await scanBlocks(startHeight, currentTip);

    // Final summary
    const duration = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(2);
    const posPercentage = (
      (stats.posBlocksFound / stats.blocksScanned) *
      100
    ).toFixed(1);

    console.log(
      `\n\n╔═══════════════════════════════════════════════════════════╗`
    );
    console.log(
      `║   PoS BLOCK INDEX BUILD COMPLETE                          ║`
    );
    console.log(
      `╚═══════════════════════════════════════════════════════════╝\n`
    );
    console.log(`📊 Statistics:`);
    console.log(`   Blocks scanned: ${stats.blocksScanned.toLocaleString()}`);
    console.log(
      `   PoS blocks found: ${stats.posBlocksFound.toLocaleString()} (${posPercentage}%)`
    );
    console.log(`   Duration: ${duration} minutes`);
    console.log(
      `   Average rate: ${((stats.blocksScanned / duration) * 60).toFixed(1)} blocks/second\n`
    );

    console.log(`✅ Index is now ready for fast VerusID scanning!\n`);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
