#!/usr/bin/env node

/**
 * Enhanced VerusID Staking Scanner with I-Address Rule
 *
 * This script implements the I-Address Staking Rule from the start:
 * Only stakes where source_address = identity_address (I-address)
 * should be counted for VerusID statistics.
 *
 * Usage:
 *   node scripts/scan-verusid-enhanced.js --start 1520000 --end 1990205
 *   node scripts/scan-verusid-enhanced.js --auto
 */

const { Pool } = require('pg');
const http = require('http');

// Configuration
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db';
const RPC_HOST = process.env.VERUS_RPC_HOST || 'http://127.0.0.1:18843';
const RPC_USER = process.env.VERUS_RPC_USER || 'verus';
const RPC_PASSWORD =
  process.env.VERUS_RPC_PASSWORD || '1CvFqDVqdPlznV4pksyoiyZ1eKhLoRKb';

const VERUSID_START_BLOCK = 1520000; // VerusID activation
const BATCH_SIZE = 1000; // Process 1000 blocks at a time
const CONCURRENT_REQUESTS = 5; // Number of parallel RPC requests

const pool = new Pool({ connectionString: DATABASE_URL });

// Parse command line arguments
const args = process.argv.slice(2);
let startBlock = null;
let endBlock = null;
let autoMode = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--start' && args[i + 1]) {
    startBlock = parseInt(args[i + 1]);
  } else if (args[i] === '--end' && args[i + 1]) {
    endBlock = parseInt(args[i + 1]);
  } else if (args[i] === '--auto') {
    autoMode = true;
  }
}

// RPC call helper
async function rpcCall(method, params = []) {
  return new Promise((resolve, reject) => {
    const url = new URL(RPC_HOST);
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: method,
      params: params,
    });

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        Authorization: `Basic ${Buffer.from(`${RPC_USER}:${RPC_PASSWORD}`).toString('base64')}`,
      },
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.result);
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', error => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Get the actual staking address from transaction inputs
async function getActualStakingAddress(txid, identityAddress) {
  try {
    // Get the transaction details
    const tx = await rpcCall('getrawtransaction', [txid, true]);

    if (!tx || !tx.vin || tx.vin.length === 0) {
      console.log(`⚠️  No inputs found for tx ${txid}`);
      return identityAddress; // Fallback to identity address
    }

    // Look for the address that provided the stake
    for (const vin of tx.vin) {
      if (vin.txid && vin.vout !== undefined) {
        try {
          const prevTx = await rpcCall('getrawtransaction', [vin.txid, true]);
          if (prevTx && prevTx.vout && prevTx.vout[vin.vout]) {
            const prevVout = prevTx.vout[vin.vout];
            if (prevVout.scriptPubKey && prevVout.scriptPubKey.addresses) {
              const addresses = prevVout.scriptPubKey.addresses;
              // Look for R-addresses (starting with 'R')
              for (const addr of addresses) {
                if (addr.startsWith('R')) {
                  return addr; // Found the actual R-address that staked
                }
              }
              // If no R-address found, return the first address
              if (addresses.length > 0) {
                return addresses[0];
              }
            }
          }
        } catch (err) {
          console.log(
            `⚠️  Error getting previous tx ${vin.txid}: ${err.message}`
          );
          continue;
        }
      }
    }

    return identityAddress; // Fallback to identity address
  } catch (err) {
    console.log(
      `⚠️  Error getting staking address for tx ${txid}: ${err.message}`
    );
    return identityAddress; // Fallback to identity address
  }
}

// Store staking reward in database with proper I-Address Rule
async function storeStakingReward(reward) {
  try {
    // Get the actual staking address
    const actualStakingAddress = await getActualStakingAddress(
      reward.txid,
      reward.identityAddress
    );

    const query = `
      INSERT INTO staking_rewards (
        identity_address, txid, vout, block_height, block_time, block_hash, 
        amount_sats, classifier, source_address
      )
      VALUES ($1, $2, 0, $3, $4, $5, $6, 'coinbase', $7)
      ON CONFLICT (txid, vout) DO NOTHING
    `;

    await pool.query(query, [
      reward.identityAddress,
      reward.txid,
      reward.blockHeight,
      reward.blockTime,
      reward.blockHash,
      reward.amount,
      actualStakingAddress, // Use the actual staking address
    ]);

    // Log the attribution for verification
    if (actualStakingAddress === reward.identityAddress) {
      console.log(`   ✅ Direct I-address stake: ${reward.identityAddress}`);
    } else {
      console.log(
        `   📝 Indirect stake: ${reward.identityAddress} <- ${actualStakingAddress}`
      );
    }
  } catch (error) {
    console.error(`❌ Error storing stake: ${error.message}`);
  }
}

// Find stakes in a block
async function findStakesInBlock(block, targetIdentityAddresses) {
  const stakes = [];

  if (!block || !block.tx || block.tx.length === 0) return stakes;

  const isPoS =
    block.validationtype === 'stake' || block.blocktype === 'minted';
  if (!isPoS) return stakes;

  const coinstake = block.tx[0];
  if (!coinstake || !coinstake.vout) return stakes;

  for (let voutIdx = 0; voutIdx < coinstake.vout.length; voutIdx++) {
    const vout = coinstake.vout[voutIdx];
    if (!vout.scriptPubKey || !vout.scriptPubKey.addresses) continue;

    for (const outputAddress of vout.scriptPubKey.addresses) {
      if (targetIdentityAddresses.has(outputAddress)) {
        stakes.push({
          identityAddress: outputAddress,
          amount: Math.round(vout.value * 100000000),
          blockHeight: block.height,
          blockTime: new Date(block.time * 1000).toISOString(),
          txid: coinstake.txid,
          vout: voutIdx,
          blockHash: block.hash,
        });
      }
    }
  }

  return stakes;
}

// Get all VerusID addresses from database
async function getVerusIDAddresses() {
  const query = `
    SELECT DISTINCT identity_address 
    FROM identities 
    WHERE identity_address LIKE 'i%'
    ORDER BY identity_address
  `;

  const result = await pool.query(query);
  return new Set(result.rows.map(row => row.identity_address));
}

// Process a batch of blocks
async function processBlockBatch(startBlock, endBlock, targetAddresses) {
  console.log(`🔍 Processing blocks ${startBlock} to ${endBlock}...`);

  let totalStakes = 0;
  let directStakes = 0;
  let indirectStakes = 0;

  for (let blockHeight = startBlock; blockHeight <= endBlock; blockHeight++) {
    try {
      const block = await rpcCall('getblock', [blockHeight, 2]);
      const stakes = await findStakesInBlock(block, targetAddresses);

      for (const stake of stakes) {
        await storeStakingReward(stake);
        totalStakes++;

        // Count direct vs indirect stakes
        const actualStakingAddress = await getActualStakingAddress(
          stake.txid,
          stake.identityAddress
        );
        if (actualStakingAddress === stake.identityAddress) {
          directStakes++;
        } else {
          indirectStakes++;
        }
      }

      if (blockHeight % 100 === 0) {
        console.log(
          `   📊 Block ${blockHeight}: ${stakes.length} stakes found`
        );
      }
    } catch (error) {
      console.error(
        `❌ Error processing block ${blockHeight}: ${error.message}`
      );
    }
  }

  console.log(
    `✅ Batch complete: ${totalStakes} total stakes (${directStakes} direct, ${indirectStakes} indirect)`
  );
  return { totalStakes, directStakes, indirectStakes };
}

// Main scanning function
async function scanVerusIDStakes() {
  console.log('🚀 Starting Enhanced VerusID Staking Scan...\n');

  try {
    // Get all VerusID addresses
    console.log('📋 Loading VerusID addresses...');
    const targetAddresses = await getVerusIDAddresses();
    console.log(`   Found ${targetAddresses.size} VerusIDs to scan\n`);

    // Determine scan range
    let scanStart, scanEnd;

    if (autoMode) {
      // Find the latest block we have data for
      const latestQuery = `
        SELECT MAX(block_height) as latest_block 
        FROM staking_rewards
      `;
      const latestResult = await pool.query(latestQuery);
      const latestBlock =
        latestResult.rows[0].latest_block || VERUSID_START_BLOCK;

      scanStart = latestBlock + 1;
      scanEnd = await rpcCall('getblockcount');

      console.log(
        `🔍 Auto mode: Scanning from block ${scanStart} to ${scanEnd}`
      );
    } else {
      scanStart = startBlock || VERUSID_START_BLOCK;
      scanEnd = endBlock || (await rpcCall('getblockcount'));

      console.log(
        `🔍 Manual mode: Scanning from block ${scanStart} to ${scanEnd}`
      );
    }

    if (scanStart > scanEnd) {
      console.log('✅ No new blocks to scan');
      return;
    }

    // Process blocks in batches
    let totalProcessed = 0;
    let totalDirect = 0;
    let totalIndirect = 0;

    for (let start = scanStart; start <= scanEnd; start += BATCH_SIZE) {
      const end = Math.min(start + BATCH_SIZE - 1, scanEnd);
      const batchResult = await processBlockBatch(start, end, targetAddresses);

      totalProcessed += batchResult.totalStakes;
      totalDirect += batchResult.directStakes;
      totalIndirect += batchResult.indirectStakes;

      // Small delay to avoid overwhelming the RPC
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Final summary
    console.log('\n🎉 Scan Complete!');
    console.log(`📊 Total Stakes Found: ${totalProcessed}`);
    console.log(`✅ Direct I-Address Stakes: ${totalDirect}`);
    console.log(`📝 Indirect Stakes: ${totalIndirect}`);
    console.log(
      `📈 Rule Compliance: ${((totalDirect / totalProcessed) * 100).toFixed(2)}%`
    );

    console.log('\n📋 Next Steps:');
    console.log('   1. Run: node scripts/validate-i-address-staking-rule.js');
    console.log('   2. Update verusid_statistics table with correct counts');
    console.log('   3. Verify VerusID pages show correct staking data');
  } catch (error) {
    console.error(`❌ Fatal error: ${error.message}`);
  } finally {
    await pool.end();
  }
}

// Run the scan
if (require.main === module) {
  scanVerusIDStakes().catch(console.error);
}

module.exports = { scanVerusIDStakes, getActualStakingAddress };
