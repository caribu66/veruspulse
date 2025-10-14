#!/usr/bin/env node
/**
 * populate-from-blocks.js
 * Uses the Next.js API endpoints to discover VerusIDs from blocks
 * This avoids direct RPC calls and uses the existing API infrastructure
 */

const { Pool } = require('pg');
const http = require('http');

console.log('==================================================');
console.log('  VerusID Populator (via Next.js API)');
console.log('==================================================\n');

// Configuration
const API_BASE = 'http://localhost:3000';
const dbConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 5,
};

const db = new Pool(dbConfig);

let stats = {
  blocksProcessed: 0,
  verusIDsFound: 0,
  verusIDsInserted: 0,
  errors: 0,
  startTime: Date.now(),
};

// Fetch from API
async function fetchAPI(endpoint) {
  return new Promise((resolve, reject) => {
    http.get(`${API_BASE}${endpoint}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

// Get block by height (using Next.js API)
async function getBlock(height) {
  try {
    const response = await fetchAPI(`/api/latest-blocks?limit=1&offset=${await getCurrentHeight() - height}`);
    if (response.success && response.blocks && response.blocks.length > 0) {
      return response.blocks[0];
    }
    return null;
  } catch (error) {
    console.error(`Error fetching block ${height}:`, error.message);
    return null;
  }
}

// Get current height
async function getCurrentHeight() {
  const response = await fetchAPI('/api/consolidated-data');
  return response.data.blockchain.blocks;
}

// Extract I-addresses from block
function extractIAddresses(block) {
  const addresses = new Set();
  
  if (!block || !block.tx) {
    return addresses;
  }
  
  for (const tx of block.tx) {
    if (!tx.vout) continue;
    
    for (const vout of tx.vout) {
      if (!vout.scriptPubKey || !vout.scriptPubKey.addresses) continue;
      
      for (const addr of vout.scriptPubKey.addresses) {
        if (addr && addr.startsWith('i')) {
          addresses.add(addr);
        }
      }
    }
  }
  
  return addresses;
}

// Insert VerusID
async function insertVerusID(iAddress) {
  try {
    await db.query(`
      INSERT INTO identities (identity_address, base_name, friendly_name, last_refreshed_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (identity_address) 
      DO UPDATE SET last_refreshed_at = NOW()
    `, [iAddress, 'discovered', `${iAddress.substring(0,8)}...`, ]);
    
    stats.verusIDsInserted++;
    return true;
  } catch (error) {
    console.error(`Failed to insert ${iAddress}:`, error.message);
    stats.errors++;
    return false;
  }
}

// Simpler approach: Use the latest-blocks API which is optimized
async function discoverFromRecentBlocks(numBlocks = 1000) {
  console.log(`Discovering VerusIDs from last ${numBlocks} blocks...\n`);
  
  const batchSize = 20;
  const allAddresses = new Set();
  
  for (let offset = 0; offset < numBlocks; offset += batchSize) {
    try {
      const response = await fetchAPI(`/api/latest-blocks?limit=${batchSize}&offset=${offset}`);
      
      if (!response.success || !response.blocks) {
        console.error(`Failed to fetch blocks at offset ${offset}`);
        continue;
      }
      
      for (const block of response.blocks) {
        const addresses = extractIAddresses(block);
        addresses.forEach(addr => allAddresses.add(addr));
        stats.blocksProcessed++;
      }
      
      // Progress
      console.log(`Progress: ${stats.blocksProcessed}/${numBlocks} blocks, Found ${allAddresses.size} unique I-addresses`);
      
      // Delay to avoid hammering API
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`Error at offset ${offset}:`, error.message);
      stats.errors++;
    }
  }
  
  console.log(`\nTotal unique addresses found: ${allAddresses.size}`);
  console.log('Inserting into database...\n');
  
  // Insert all addresses
  let inserted = 0;
  for (const addr of allAddresses) {
    if (await insertVerusID(addr)) {
      inserted++;
      if (inserted % 50 === 0) {
        console.log(`Inserted: ${inserted}/${allAddresses.size}`);
      }
    }
  }
  
  stats.verusIDsFound = allAddresses.size;
  
  return allAddresses;
}

// Main
async function main() {
  try {
    const args = process.argv.slice(2);
    let numBlocks = 1000;
    
    // Parse arguments
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--blocks' || args[i] === '-b') {
        numBlocks = parseInt(args[++i]);
      } else if (args[i] === '--help' || args[i] === '-h') {
        console.log(`
Usage: node populate-from-blocks.js [OPTIONS]

Options:
  -b, --blocks N    Number of recent blocks to scan (default: 1000)
  -h, --help        Show this help

Examples:
  # Scan last 1,000 blocks
  node populate-from-blocks.js --blocks 1000
  
  # Scan last 10,000 blocks
  node populate-from-blocks.js --blocks 10000
        `);
        process.exit(0);
      }
    }
    
    console.log('Testing database connection...');
    const dbTest = await db.query('SELECT COUNT(*) FROM identities WHERE identity_address LIKE \'i%\'');
    console.log(`Current VerusIDs in database: ${dbTest.rows[0].count}\n`);
    
    console.log('Testing API connection...');
    const height = await getCurrentHeight();
    console.log(`Current blockchain height: ${height}\n`);
    
    stats.startTime = Date.now();
    await discoverFromRecentBlocks(numBlocks);
    
    // Final stats
    const totalTime = (Date.now() - stats.startTime) / 1000;
    console.log('\n==================================================');
    console.log('  Discovery Complete!');
    console.log('==================================================');
    console.log(`Blocks processed: ${stats.blocksProcessed}`);
    console.log(`VerusIDs found: ${stats.verusIDsFound}`);
    console.log(`VerusIDs inserted: ${stats.verusIDsInserted}`);
    console.log(`Errors: ${stats.errors}`);
    console.log(`Total time: ${(totalTime / 60).toFixed(1)} minutes`);
    console.log(`Speed: ${(stats.blocksProcessed / totalTime).toFixed(2)} blocks/sec\n`);
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

main().catch(console.error);

