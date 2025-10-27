#!/usr/bin/env node
/**
 * scan-caribu66-missing-stakes.js
 * Focused scan to find Caribu66@'s missing early stakes from 2020
 */

require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');
const http = require('http');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║   Caribu66@ Missing Stakes Scanner                        ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// RPC configuration
const RPC_URL = process.env.VERUS_RPC_HOST || 'http://127.0.0.1:18843';
const RPC_USER = process.env.VERUS_RPC_USER || 'verus';
const RPC_PASS = process.env.VERUS_RPC_PASSWORD || 'verus';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Make RPC call
async function rpcCall(method, params = []) {
  const auth = Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString('base64');
  const postData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'caribu66-scanner',
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

async function main() {
  try {
    const CARIBU66_ADDRESS = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB';
    const CARIBU66_CREATION_BLOCK = 987861;

    console.log(`🎯 Target: Caribu66@ (${CARIBU66_ADDRESS})`);
    console.log(
      `📅 Creation block: ${CARIBU66_CREATION_BLOCK.toLocaleString()}`
    );

    // Get current blockchain height
    const blockchainInfo = await rpcCall('getblockchaininfo');
    const currentTip = blockchainInfo.blocks;
    console.log(`📊 Current tip: ${currentTip.toLocaleString()}\n`);

    // Focus on the gap where we expect to find early stakes (2020-2021)
    const startHeight = CARIBU66_CREATION_BLOCK;
    const endHeight = Math.min(currentTip, 2500000); // Focus on 2020-2021 blocks first
    const totalBlocks = endHeight - startHeight + 1;

    console.log(
      `🔍 Scanning range: ${startHeight.toLocaleString()} → ${endHeight.toLocaleString()}`
    );
    console.log(`📊 Total blocks to scan: ${totalBlocks.toLocaleString()}\n`);

    const targetAddresses = new Set([CARIBU66_ADDRESS]);
    let stakesFound = 0;
    let blocksScanned = 0;
    const BATCH_SIZE = 50;

    // Scan in smaller batches
    for (let h = startHeight; h <= endHeight; h += BATCH_SIZE) {
      const batchEnd = Math.min(h + BATCH_SIZE - 1, endHeight);

      try {
        // Fetch blocks in batch
        const blockPromises = [];
        for (let bh = h; bh <= batchEnd; bh++) {
          blockPromises.push(
            rpcCall('getblockhash', [bh])
              .then(hash => rpcCall('getblock', [hash, 2]))
              .catch(err => {
                console.warn(
                  `   ⚠️  Failed to fetch block ${bh}: ${err.message}`
                );
                return null;
              })
          );
        }

        const blocks = await Promise.all(blockPromises);

        // Process blocks
        for (const block of blocks) {
          if (!block) continue;

          const stakes = findStakesInBlock(block, targetAddresses);
          for (const stake of stakes) {
            console.log(`   🎉 Found stake in block ${stake.blockHeight}:`);
            console.log(
              `      Reward: ${(stake.reward / 100000000).toFixed(8)} VRSC`
            );
            console.log(`      Time: ${stake.blockTime.toISOString()}`);
            console.log(`      TXID: ${stake.txid}\n`);

            if (await saveStake(stake)) {
              stakesFound++;
            }
          }
          blocksScanned++;
        }

        // Progress update every 1000 blocks
        if ((h - startHeight) % 1000 === 0) {
          const progress = (((h - startHeight) / totalBlocks) * 100).toFixed(1);
          process.stdout.write(
            `\r   Progress: ${progress}% | Blocks: ${blocksScanned.toLocaleString()} | Stakes: ${stakesFound}`
          );
        }
      } catch (error) {
        console.error(`\n   ❌ Batch error at block ${h}: ${error.message}`);
      }
    }

    console.log(`\n\n✅ Scan complete!`);
    console.log(`📊 Blocks scanned: ${blocksScanned.toLocaleString()}`);
    console.log(`🎯 Stakes found: ${stakesFound}`);

    // Check final count
    const result = await pool.query(
      `
      SELECT COUNT(*) as count, MIN(block_height) as first_stake, MAX(block_height) as last_stake
      FROM staking_rewards
      WHERE identity_address = $1
    `,
      [CARIBU66_ADDRESS]
    );

    const stats = result.rows[0];
    console.log(`\n📊 Caribu66@ Final Stats:`);
    console.log(`   Total stakes: ${stats.count}`);
    if (stats.count > 0) {
      console.log(
        `   First stake: Block ${parseInt(stats.first_stake).toLocaleString()}`
      );
      console.log(
        `   Last stake: Block ${parseInt(stats.last_stake).toLocaleString()}`
      );
    }
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
