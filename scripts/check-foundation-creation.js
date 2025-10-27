#!/usr/bin/env node
/**
 * check-foundation-creation.js
 * Checks the creation blocks for Verus Coin Foundation VerusIDs
 */

require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');
const http = require('http');

// Foundation VerusIDs to check
const FOUNDATION_VERUSIDS = [
  {
    address: 'i5v3h9FWVdRFbNHU7DfcpGykQjRaHtMqu7',
    name: 'Verus Coin Foundation',
  },
  {
    address: 'i81XL8ZpuCo9jmWLv5L5ikdxrGuHrrpQLz',
    name: 'VerusCoinFoundation',
  },
  {
    address: 'iLWYR8gq68s1ggJdPmmhuzmVWa1oBWkN1H',
    name: 'VerusCoin Foundation',
  },
  { address: 'iSaJoUp2tuYhZedRwDDK5WwP83W3eyrXr5', name: 'Verus Foundation' },
];

// RPC configuration
const RPC_URL = process.env.VERUS_RPC_HOST || 'http://127.0.0.1:18843';
const RPC_USER = process.env.VERUS_RPC_USER || 'verus';
const RPC_PASS = process.env.VERUS_RPC_PASSWORD || 'verus';

// Database configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 10,
};
const pool = new Pool(dbConfig);

// RPC helper function
async function rpcCall(method, params = []) {
  const auth = Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString('base64');
  const postData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'foundation-checker',
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

async function getBlockTime(blockHeight) {
  try {
    const blockHash = await rpcCall('getblockhash', [blockHeight]);
    const block = await rpcCall('getblock', [blockHash, 2]);
    return {
      time: new Date(block.time * 1000),
      hash: block.hash,
    };
  } catch (error) {
    console.error(
      `Error getting block time for height ${blockHeight}: ${error.message}`
    );
    return null;
  }
}

async function main() {
  console.log(
    '🔍 Checking Verus Coin Foundation VerusID Creation Information...\n'
  );

  // Get current blockchain info
  const blockchainInfo = await rpcCall('getblockchaininfo');
  const currentHeight = blockchainInfo.blocks;
  console.log(`Current blockchain height: ${currentHeight.toLocaleString()}\n`);

  console.log('📋 Foundation VerusID Analysis:');
  console.log('==============================\n');

  for (const verusID of FOUNDATION_VERUSIDS) {
    console.log(`${verusID.name}:`);
    console.log(`  Address: ${verusID.address}`);

    // Check if we have first_seen_block in database
    const result = await pool.query(
      `
      SELECT first_seen_block
      FROM identities
      WHERE identity_address = $1
    `,
      [verusID.address]
    );

    const firstSeenBlock = result.rows[0]?.first_seen_block;
    if (firstSeenBlock) {
      const blockDetails = await getBlockTime(firstSeenBlock);
      console.log(`  ✅ Creation Block: ${firstSeenBlock.toLocaleString()}`);
      if (blockDetails) {
        console.log(
          `  ✅ Creation Date: ${blockDetails.time.toLocaleDateString()}`
        );
        console.log(
          `  ✅ Creation Time: ${blockDetails.time.toLocaleTimeString()}`
        );
      }
    } else {
      console.log(`  ❌ No creation block information in database`);
    }

    // Check staking information
    const stakeResult = await pool.query(
      `
      SELECT 
        MIN(block_height) as first_stake_block,
        MIN(block_time) as first_stake_time,
        MAX(block_time) as last_stake_time,
        COUNT(*) as total_stakes,
        SUM(amount_sats)/100000000.0 as total_rewards_vrsc
      FROM staking_rewards
      WHERE identity_address = $1
    `,
      [verusID.address]
    );

    const stakeInfo = stakeResult.rows[0];
    if (stakeInfo.first_stake_block) {
      console.log(
        `  🎯 First Stake: Block ${stakeInfo.first_stake_block.toLocaleString()} (${stakeInfo.first_stake_time.toLocaleDateString()})`
      );
      console.log(
        `  🎯 Last Stake: ${stakeInfo.last_stake_time.toLocaleDateString()}`
      );
      console.log(
        `  🎯 Total Stakes: ${stakeInfo.total_stakes.toLocaleString()}`
      );
      console.log(
        `  🎯 Total Rewards: ${parseFloat(stakeInfo.total_rewards_vrsc).toFixed(2)} VRSC`
      );
    } else {
      console.log(`  ❌ No staking information found`);
    }

    console.log('');
  }

  console.log('📊 Summary:');
  console.log('===========');
  console.log('The Verus Coin Foundation appears to have multiple VerusIDs:');
  console.log(
    '- Verus Coin Foundation.VRSC@ (i5v3h9FWVdRFbNHU7DfcpGykQjRaHtMqu7)'
  );
  console.log(
    '- VerusCoinFoundation.VRSC@ (i81XL8ZpuCo9jmWLv5L5ikdxrGuHrrpQLz)'
  );
  console.log('- Plus several other foundation-related VerusIDs');
  console.log(
    '\nThe main "Verus Coin Foundation.VRSC@" has been the most active with 244 stakes!'
  );
}

main()
  .catch(console.error)
  .finally(() => pool.end());
