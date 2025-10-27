#!/usr/bin/env node
/**
 * search-caribu66-stakes.js
 * Search for Caribu66@ stakes in the blockchain
 */

require('dotenv').config();
const https = require('https');

// RPC configuration
const RPC_URL = 'http://127.0.0.1:18843';
const RPC_USER = 'verus';
const RPC_PASS = '1CvFqDVqdPlznV4pksyoiyZ1eKhLoRKb';

const CARIBU66_ADDRESS = 'iCDYc7VjEREzSBwj442MXrWLHLWJrDVdiB';

async function rpcCall(method, params = []) {
  const auth = Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString('base64');
  const postData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'search-caribu66-stakes',
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

  return new Promise((resolve, reject) => {
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

// CORRECTED stake detection logic
function findStakesInBlock(block, targetAddress) {
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

  // Look for target address in the staker transaction
  for (let voutIdx = 0; voutIdx < stakerTx.vout.length; voutIdx++) {
    const vout = stakerTx.vout[voutIdx];
    if (!vout.scriptPubKey || !vout.scriptPubKey.addresses) continue;

    for (const addr of vout.scriptPubKey.addresses) {
      if (addr === targetAddress) {
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

async function searchCaribu66Stakes() {
  console.log('🔍 Searching for Caribu66@ stakes in blockchain...\n');
  console.log(`Target address: ${CARIBU66_ADDRESS}\n`);

  try {
    // Search from VerusID activation to a reasonable range
    const startHeight = 800200; // VerusID activation
    const endHeight = 2500000; // Go well beyond known stakes
    const step = 1000; // Check every 1000th block for efficiency

    console.log(
      `Searching blocks ${startHeight.toLocaleString()} to ${endHeight.toLocaleString()} (every ${step}th block)...\n`
    );

    let posBlocksChecked = 0;
    let stakesFound = 0;
    let earliestStake = null;
    let latestStake = null;

    for (let height = startHeight; height <= endHeight; height += step) {
      try {
        const blockHash = await rpcCall('getblockhash', [height]);
        const block = await rpcCall('getblock', [blockHash, 2]);

        const stakes = findStakesInBlock(block, CARIBU66_ADDRESS);

        if (stakes.length > 0) {
          stakesFound += stakes.length;

          stakes.forEach(stake => {
            console.log(
              `🎯 Block ${stake.blockHeight}: Caribu66@ stake found!`
            );
            console.log(`   - Time: ${stake.blockTime.toISOString()}`);
            console.log(`   - Reward: ${stake.reward / 100000000} VRSC`);
            console.log(`   - TXID: ${stake.txid}`);
            console.log(
              `   - Staker TX: ${block.tx[block.tx.length - 1].txid}\n`
            );

            if (
              !earliestStake ||
              stake.blockHeight < earliestStake.blockHeight
            ) {
              earliestStake = stake;
            }
            if (!latestStake || stake.blockHeight > latestStake.blockHeight) {
              latestStake = stake;
            }
          });
        }

        // Count PoS blocks for progress
        const isPoS =
          block.validationtype === 'stake' || block.blocktype === 'minted';
        if (isPoS) {
          posBlocksChecked++;

          // Progress indicator
          if (posBlocksChecked % 50 === 0) {
            process.stdout.write(
              `\rChecked ${posBlocksChecked} PoS blocks... Found ${stakesFound} stakes`
            );
          }
        }
      } catch (error) {
        // Skip blocks that can't be fetched
        continue;
      }
    }

    console.log(`\n\n📊 Results:`);
    console.log(`   PoS blocks checked: ${posBlocksChecked}`);
    console.log(`   Caribu66@ stakes found: ${stakesFound}`);

    if (earliestStake) {
      console.log(`\n🏆 Earliest Caribu66@ Stake:`);
      console.log(
        `   Block Height: ${earliestStake.blockHeight.toLocaleString()}`
      );
      console.log(`   Date: ${earliestStake.blockTime.toLocaleDateString()}`);
      console.log(`   Time: ${earliestStake.blockTime.toLocaleTimeString()}`);
      console.log(`   Reward: ${earliestStake.reward / 100000000} VRSC`);
      console.log(`   TXID: ${earliestStake.txid}`);
    }

    if (latestStake) {
      console.log(`\n📈 Latest Caribu66@ Stake:`);
      console.log(
        `   Block Height: ${latestStake.blockHeight.toLocaleString()}`
      );
      console.log(`   Date: ${latestStake.blockTime.toLocaleDateString()}`);
      console.log(`   Time: ${latestStake.blockTime.toLocaleTimeString()}`);
      console.log(`   Reward: ${latestStake.reward / 100000000} VRSC`);
      console.log(`   TXID: ${latestStake.txid}`);
    }

    if (stakesFound === 0) {
      console.log('\n❌ No Caribu66@ stakes found in this range!');
      console.log(
        '   This suggests Caribu66@ may not have been an early staker.'
      );
    } else {
      console.log('\n✅ Caribu66@ stakes found!');
      console.log('   This confirms the stake detection logic is working.');
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
  }
}

searchCaribu66Stakes().catch(console.error);
