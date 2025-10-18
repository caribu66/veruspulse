#!/usr/bin/env node
/**
 * targeted-scan.js
 * Scans specific VerusID addresses for stake events
 * Much faster than comprehensive discovery
 */

const { Pool } = require('pg');

console.log('==================================================');
console.log('  Targeted VerusID Stake Scanner');
console.log('==================================================\n');

// Configuration
const dbConfig = {
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 5,
};

const db = new Pool(dbConfig);
const API_BASE = 'http://localhost:3000';

// Target addresses
const TARGET_ADDRESSES = [
  'iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5', // Joanna@
  // Add farinole@ address when found
];

let stats = {
  blocksScanned: 0,
  stakeEventsFound: 0,
  errors: 0,
  startTime: Date.now(),
};

// Fetch from API
async function fetchAPI(endpoint) {
  const http = require('http');
  return new Promise((resolve, reject) => {
    http
      .get(`${API_BASE}${endpoint}`, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse JSON: ${e.message}`));
          }
        });
      })
      .on('error', reject);
  });
}

// Get current height
async function getCurrentHeight() {
  const response = await fetchAPI('/api/consolidated-data');
  return response.data.blockchain.blocks;
}

// Check if block contains stakes for our target addresses
function blockContainsTargetStakes(block) {
  const stakes = [];

  if (!block || !block.tx) return stakes;

  // Check if this is a PoS block
  if (block.validationtype !== 'stake') return stakes;

  // In PoS blocks, the coinstake transaction pays the staker
  const coinstake = block.tx[0]; // First transaction is coinbase/coinstake
  if (!coinstake || !coinstake.vout) return stakes;

  // Check each output to see if it pays our target addresses
  for (const vout of coinstake.vout) {
    if (!vout.scriptPubKey || !vout.scriptPubKey.addresses) continue;

    for (const addr of vout.scriptPubKey.addresses) {
      if (TARGET_ADDRESSES.includes(addr)) {
        stakes.push({
          address: addr,
          amount: vout.value,
          blockHeight: block.height,
          blockTime: block.time,
          txid: coinstake.txid,
          blockHash: block.hash,
        });
      }
    }
  }

  return stakes;
}

// Insert stake event
async function insertStakeEvent(stake) {
  try {
    await db.query(
      `
      INSERT INTO stake_events (
        address, amount_satoshis, block_height, block_time, 
        txid, block_hash, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (txid, address) DO NOTHING
    `,
      [
        stake.address,
        Math.round(stake.amount * 100000000), // Convert to satoshis
        stake.blockHeight,
        new Date(stake.blockTime * 1000),
        stake.txid,
        stake.blockHash,
      ]
    );

    stats.stakeEventsFound++;
    return true;
  } catch (error) {
    console.error(`Failed to insert stake:`, error.message);
    stats.errors++;
    return false;
  }
}

// Scan a range of blocks
async function scanBlocks(startHeight, endHeight) {
  console.log(
    `\nScanning blocks ${startHeight} to ${endHeight} for target VerusIDs...\n`
  );

  const batchSize = 20;
  let processedBlocks = 0;

  for (let offset = 0; offset < endHeight - startHeight; offset += batchSize) {
    try {
      // Get blocks from API
      const response = await fetchAPI(
        `/api/latest-blocks?limit=${batchSize}&offset=${offset}`
      );

      if (!response.success || !response.blocks) {
        console.error(`Failed to fetch blocks at offset ${offset}`);
        continue;
      }

      // Process each block
      for (const block of response.blocks) {
        const stakes = blockContainsTargetStakes(block);

        for (const stake of stakes) {
          await insertStakeEvent(stake);
          console.log(
            `📍 Block ${stake.blockHeight}: ${stake.address} staked ${stake.amount} VRSC`
          );
        }

        processedBlocks++;
        stats.blocksScanned++;
      }

      // Progress update
      if (processedBlocks % 100 === 0) {
        const elapsed = (Date.now() - stats.startTime) / 1000;
        const rate = processedBlocks / elapsed;
        console.log(
          `Progress: ${processedBlocks} blocks, ${stats.stakeEventsFound} stakes found (${rate.toFixed(1)} blocks/sec)`
        );
      }

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error at offset ${offset}:`, error.message);
      stats.errors++;
    }
  }

  return stats;
}

// Main function
async function main() {
  try {
    const args = process.argv.slice(2);
    let numBlocks = 50000; // Default: scan last 50k blocks

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--blocks' || args[i] === '-b') {
        numBlocks = parseInt(args[++i]);
      } else if (args[i] === '--help' || args[i] === '-h') {
        console.log(`
Usage: node targeted-scan.js [OPTIONS]

Options:
  -b, --blocks N    Number of recent blocks to scan (default: 50000)
  -h, --help        Show this help

Target VerusIDs:
${TARGET_ADDRESSES.map(addr => `  - ${addr}`).join('\n')}

Examples:
  # Scan last 10,000 blocks
  node targeted-scan.js --blocks 10000
  
  # Full scan (all blocks)
  node targeted-scan.js --blocks 3800000
        `);
        process.exit(0);
      }
    }

    console.log('Testing connections...');
    const height = await getCurrentHeight();
    console.log(`Current blockchain height: ${height}`);

    const dbTest = await db.query(
      'SELECT COUNT(*) FROM stake_events WHERE address = ANY($1)',
      [TARGET_ADDRESSES]
    );
    console.log(`Existing stake events for targets: ${dbTest.rows[0].count}\n`);

    console.log('Target VerusIDs:');
    TARGET_ADDRESSES.forEach(addr => console.log(`  - ${addr}`));

    // Start scanning
    stats.startTime = Date.now();
    const startHeight = Math.max(1, height - numBlocks);
    await scanBlocks(startHeight, height);

    // Final report
    const totalTime = (Date.now() - stats.startTime) / 1000;
    console.log('\n==================================================');
    console.log('  Targeted Scan Complete!');
    console.log('==================================================');
    console.log(`Blocks scanned: ${stats.blocksScanned}`);
    console.log(`Stake events found: ${stats.stakeEventsFound}`);
    console.log(`Errors: ${stats.errors}`);
    console.log(`Total time: ${(totalTime / 60).toFixed(1)} minutes`);
    console.log(
      `Rate: ${(stats.blocksScanned / totalTime).toFixed(1)} blocks/sec\n`
    );
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

main().catch(console.error);
