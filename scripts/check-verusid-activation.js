#!/usr/bin/env node
/**
 * check-verusid-activation.js
 * Check when VerusID was activated and when staking began
 */

require('dotenv').config();
const https = require('https');

// RPC configuration
const RPC_URL = 'http://127.0.0.1:18843';
const RPC_USER = 'verus';
const RPC_PASS = '1CvFqDVqdPlznV4pksyoiyZ1eKhLoRKb';

async function rpcCall(method, params = []) {
  const auth = Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString('base64');
  const postData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'check-verusid-activation',
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

async function checkVerusIDActivation() {
  console.log('🔍 Checking VerusID Activation Timeline...\n');

  try {
    const VERUSID_ACTIVATION_BLOCK = 800200;

    // Get block 800200 (VerusID activation)
    console.log('1️⃣ VerusID Activation Block (800,200):');
    const activationBlockHash = await rpcCall('getblockhash', [
      VERUSID_ACTIVATION_BLOCK,
    ]);
    const activationBlock = await rpcCall('getblock', [activationBlockHash, 2]);

    console.log(`   Block Height: ${activationBlock.height}`);
    console.log(`   Block Hash: ${activationBlock.hash}`);
    console.log(
      `   Block Time: ${new Date(activationBlock.time * 1000).toISOString()}`
    );
    console.log(
      `   Date: ${new Date(activationBlock.time * 1000).toLocaleDateString()}`
    );
    console.log(
      `   Transaction Count: ${activationBlock.tx ? activationBlock.tx.length : 0}\n`
    );

    // Get block 800208 (earliest VerusID in database)
    console.log('2️⃣ Earliest VerusID Block (800,208):');
    const earliestBlockHash = await rpcCall('getblockhash', [800208]);
    const earliestBlock = await rpcCall('getblock', [earliestBlockHash, 2]);

    console.log(`   Block Height: ${earliestBlock.height}`);
    console.log(`   Block Hash: ${earliestBlock.hash}`);
    console.log(
      `   Block Time: ${new Date(earliestBlock.time * 1000).toISOString()}`
    );
    console.log(
      `   Date: ${new Date(earliestBlock.time * 1000).toLocaleDateString()}`
    );
    console.log(
      `   Transaction Count: ${earliestBlock.tx ? earliestBlock.tx.length : 0}\n`
    );

    // Get block 1,077,805 (earliest stake in database)
    console.log('3️⃣ Earliest VerusID Stake Block (1,077,805):');
    const stakeBlockHash = await rpcCall('getblockhash', [1077805]);
    const stakeBlock = await rpcCall('getblock', [stakeBlockHash, 2]);

    console.log(`   Block Height: ${stakeBlock.height}`);
    console.log(`   Block Hash: ${stakeBlock.hash}`);
    console.log(
      `   Block Time: ${new Date(stakeBlock.time * 1000).toISOString()}`
    );
    console.log(
      `   Date: ${new Date(stakeBlock.time * 1000).toLocaleDateString()}`
    );
    console.log(
      `   Transaction Count: ${stakeBlock.tx ? stakeBlock.tx.length : 0}\n`
    );

    // Calculate time differences
    const activationTime = new Date(activationBlock.time * 1000);
    const earliestTime = new Date(earliestBlock.time * 1000);
    const stakeTime = new Date(stakeBlock.time * 1000);

    const daysToEarliest = Math.round(
      (earliestTime - activationTime) / (1000 * 60 * 60 * 24)
    );
    const daysToFirstStake = Math.round(
      (stakeTime - activationTime) / (1000 * 60 * 60 * 24)
    );

    console.log('4️⃣ Timeline Analysis:');
    console.log(
      `   VerusID Activation: ${activationTime.toLocaleDateString()}`
    );
    console.log(
      `   First VerusID Created: ${earliestTime.toLocaleDateString()} (+${daysToEarliest} days)`
    );
    console.log(
      `   First VerusID Stake: ${stakeTime.toLocaleDateString()} (+${daysToFirstStake} days)`
    );

    const blocksToEarliest = 800208 - VERUSID_ACTIVATION_BLOCK;
    const blocksToFirstStake = 1077805 - VERUSID_ACTIVATION_BLOCK;

    console.log(
      `\n   Blocks to first VerusID: ${blocksToEarliest.toLocaleString()}`
    );
    console.log(
      `   Blocks to first stake: ${blocksToFirstStake.toLocaleString()}\n`
    );

    // Check current blockchain height
    const currentHeight = await rpcCall('getblockchaininfo');
    const currentHeightNum = currentHeight.blocks;

    console.log('5️⃣ Current Status:');
    console.log(
      `   Current Blockchain Height: ${currentHeightNum.toLocaleString()}`
    );
    console.log(
      `   Blocks since activation: ${(currentHeightNum - VERUSID_ACTIVATION_BLOCK).toLocaleString()}`
    );
    console.log(
      `   Blocks since first stake: ${(currentHeightNum - 1077805).toLocaleString()}\n`
    );

    console.log('📊 Summary:');
    console.log(
      `   ✅ VerusID activated: ${activationTime.toLocaleDateString()} (Block ${VERUSID_ACTIVATION_BLOCK.toLocaleString()})`
    );
    console.log(
      `   ✅ First VerusID created: ${earliestTime.toLocaleDateString()} (Block 800,208)`
    );
    console.log(
      `   ✅ First VerusID stake: ${stakeTime.toLocaleDateString()} (Block 1,077,805)`
    );
    console.log(
      `   ⏱️  Gap between activation and first stake: ${daysToFirstStake} days (${blocksToFirstStake.toLocaleString()} blocks)`
    );
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
  }
}

checkVerusIDActivation().catch(console.error);
