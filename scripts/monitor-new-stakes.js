#!/usr/bin/env node
/**
 * monitor-new-stakes.js
 * Continuously monitors for new blocks and updates stakes for tracked addresses
 */

const { Pool } = require('pg');
const http = require('http');

const dbConfig = {
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 3,
};

const db = new Pool(dbConfig);
const API_BASE = 'http://localhost:3000';
const CHECK_INTERVAL = 60000; // Check every 60 seconds

let lastCheckedHeight = 0;
let isChecking = false;

console.log('==================================================');
console.log('  Real-Time Stake Monitor');
console.log('==================================================\n');

// Get tracked addresses from database
async function getTrackedAddresses() {
  const result = await db.query(
    "SELECT DISTINCT identity_address FROM identities WHERE identity_address LIKE 'i%'"
  );
  return result.rows.map(row => row.identity_address);
}

// Fetch current blockchain height
async function getCurrentHeight() {
  return new Promise((resolve, reject) => {
    http
      .get(`${API_BASE}/api/consolidated-data`, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json.data.blockchain.blocks);
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

// Get block data
async function getBlock(height) {
  return new Promise((resolve, reject) => {
    http
      .get(`${API_BASE}/api/latest-blocks?limit=1&offset=0`, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.success && json.blocks && json.blocks.length > 0) {
              resolve(json.blocks[0]);
            } else {
              resolve(null);
            }
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

// Check if block contains stakes for tracked addresses
async function checkBlockForStakes(block, trackedAddresses) {
  if (!block || block.validationtype !== 'stake') return [];

  const stakes = [];
  const coinstake = block.tx[0];

  if (!coinstake || !coinstake.vout) return stakes;

  for (const vout of coinstake.vout) {
    if (!vout.scriptPubKey || !vout.scriptPubKey.addresses) continue;

    for (const addr of vout.scriptPubKey.addresses) {
      if (trackedAddresses.includes(addr)) {
        stakes.push({
          address: addr,
          reward: vout.value,
          blockHeight: block.height,
          blockTime: new Date(block.time * 1000),
          txid: coinstake.txid,
          blockHash: block.hash,
        });
      }
    }
  }

  return stakes;
}

// Insert stake into database
async function recordStake(stake) {
  try {
    await db.query(
      `
      INSERT INTO stake_events (
        address, txid, block_height, block_time, 
        reward_amount, stake_amount, stake_age, staking_probability,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, 0, 0, 0, NOW())
      ON CONFLICT (txid, address) DO NOTHING
    `,
      [
        stake.address,
        stake.txid,
        stake.blockHeight,
        stake.blockTime,
        Math.round(stake.reward * 100000000),
      ]
    );

    return true;
  } catch (error) {
    console.error('Failed to record stake:', error.message);
    return false;
  }
}

// Main monitoring loop
async function checkForNewStakes() {
  if (isChecking) return;
  isChecking = true;

  try {
    const currentHeight = await getCurrentHeight();

    if (lastCheckedHeight === 0) {
      lastCheckedHeight = currentHeight;
      console.log(`📍 Starting monitoring from block ${currentHeight}`);
      return;
    }

    if (currentHeight <= lastCheckedHeight) {
      // No new blocks
      return;
    }

    // New block(s) detected!
    const newBlocks = currentHeight - lastCheckedHeight;
    console.log(
      `\n🆕 ${newBlocks} new block(s) detected! (${lastCheckedHeight + 1} → ${currentHeight})`
    );

    const trackedAddresses = await getTrackedAddresses();
    console.log(`   Monitoring ${trackedAddresses.length} address(es)`);

    let newStakes = 0;

    // Check each new block
    for (
      let height = lastCheckedHeight + 1;
      height <= currentHeight;
      height++
    ) {
      const block = await getBlock(height);
      if (!block) continue;

      const stakes = await checkBlockForStakes(block, trackedAddresses);

      for (const stake of stakes) {
        if (await recordStake(stake)) {
          newStakes++;
          console.log(
            `   ✨ NEW STAKE! Block ${stake.blockHeight}: ${stake.address} earned ${stake.reward.toFixed(4)} VRSC`
          );
        }
      }
    }

    if (newStakes === 0) {
      console.log(`   No new stakes in these blocks`);
    } else {
      console.log(`\n🎉 Recorded ${newStakes} new stake(s)!`);
    }

    lastCheckedHeight = currentHeight;
  } catch (error) {
    console.error('❌ Error checking for stakes:', error.message);
  } finally {
    isChecking = false;
  }
}

// Initialize
async function start() {
  try {
    console.log('Testing connections...');

    const height = await getCurrentHeight();
    console.log(`✅ API connection successful (height: ${height})`);

    const addresses = await getTrackedAddresses();
    console.log(`✅ Database connection successful`);
    console.log(`✅ Monitoring ${addresses.length} VerusID(s):\n`);

    addresses.forEach(addr => {
      console.log(`   - ${addr}`);
    });

    console.log(
      `\n📡 Starting real-time monitoring (checking every ${CHECK_INTERVAL / 1000}s)...\n`
    );

    // Initial check
    await checkForNewStakes();

    // Start periodic checking
    setInterval(checkForNewStakes, CHECK_INTERVAL);
  } catch (error) {
    console.error('❌ Failed to start:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n👋 Shutting down monitor...');
  await db.end();
  process.exit(0);
});

start().catch(console.error);
