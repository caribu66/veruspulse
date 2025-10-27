#!/usr/bin/env node
/**
 * Standalone Staking Scanner
 * Runs independently without requiring Next.js dev server
 * Can be run in the background with nohup or screen
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      process.env[key.trim()] = values.join('=').trim();
    }
  });
}

// Also try .env
const envPathAlt = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPathAlt)) {
  const envContent = fs.readFileSync(envPathAlt, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0 && !process.env[key.trim()]) {
      process.env[key.trim()] = values.join('=').trim();
    }
  });
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Database connection
const dbUrl =
  process.env.DATABASE_URL ||
  'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db';
const db = new Pool({ connectionString: dbUrl });

// RPC configuration
const RPC_USER = process.env.RPC_USER || 'verus';
const RPC_PASSWORD = process.env.RPC_PASSWORD || 'verus';
const RPC_HOST = process.env.RPC_HOST || '127.0.0.1';
const RPC_PORT = process.env.RPC_PORT || '27486';

// Simple RPC client
async function rpcCall(method, params = []) {
  const fetch = (await import('node-fetch')).default;

  const response = await fetch(`http://${RPC_HOST}:${RPC_PORT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:
        'Basic ' +
        Buffer.from(`${RPC_USER}:${RPC_PASSWORD}`).toString('base64'),
    },
    body: JSON.stringify({
      jsonrpc: '1.0',
      id: Date.now(),
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC call failed: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`RPC error: ${data.error.message}`);
  }

  return data.result;
}

// Get last scanned block from database
async function getLastScannedBlock() {
  try {
    const result = await db.query(
      'SELECT MAX(block_height) as last_height FROM staking_rewards'
    );
    return result.rows[0]?.last_height || 0;
  } catch (error) {
    log('⚠️  No existing data found, starting from beginning', 'yellow');
    return 0;
  }
}

// Get all VerusID addresses to track
async function getVerusIDAddresses() {
  try {
    const result = await db.query(`
      SELECT DISTINCT identity_address 
      FROM staking_rewards 
      WHERE identity_address LIKE 'i%'
      UNION
      SELECT DISTINCT identity_address 
      FROM identities 
      WHERE identity_address LIKE 'i%'
      ORDER BY identity_address
    `);
    return new Set(result.rows.map(r => r.identity_address));
  } catch (error) {
    log('⚠️  Error loading addresses, starting fresh', 'yellow');
    return new Set();
  }
}

// Find stakes in a block
function findStakesInBlock(block, targetAddresses) {
  const stakes = [];

  if (!block || !block.tx || block.tx.length === 0) return stakes;

  // Check if this is a PoS block
  const isPoS =
    block.validationtype === 'stake' || block.blocktype === 'minted';
  if (!isPoS) return stakes;

  // Coinstake transaction (first tx in PoS block)
  const coinstake = block.tx[0];
  if (!coinstake || !coinstake.vout) return stakes;

  // Track addresses found to avoid duplicates
  const addressesFoundInBlock = new Set();

  // Check each output
  for (let voutIdx = 0; voutIdx < coinstake.vout.length; voutIdx++) {
    const vout = coinstake.vout[voutIdx];
    if (!vout.scriptPubKey || !vout.scriptPubKey.addresses) continue;

    for (const addr of vout.scriptPubKey.addresses) {
      // Only record if target address and not already recorded for this block
      if (targetAddresses.has(addr) && !addressesFoundInBlock.has(addr)) {
        addressesFoundInBlock.add(addr);

        stakes.push({
          address: addr,
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

// Insert stake into database
async function insertStake(stake) {
  try {
    await db.query(
      `INSERT INTO staking_rewards 
       (identity_address, block_height, block_time, reward_amount, txid, vout, block_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (identity_address, block_height, txid) DO NOTHING`,
      [
        stake.address,
        stake.blockHeight,
        stake.blockTime,
        stake.amount,
        stake.txid,
        stake.vout,
        stake.blockHash,
      ]
    );
  } catch (error) {
    // Ignore duplicate errors
    if (!error.message.includes('duplicate')) {
      throw error;
    }
  }
}

// Save scan progress
async function saveScanProgress(blockHeight) {
  try {
    await db.query(
      `INSERT INTO scan_metadata 
       (scan_type, scan_progress, last_updated)
       VALUES ('standalone_scan', $1, NOW())
       ON CONFLICT (scan_type) 
       DO UPDATE SET scan_progress = $1, last_updated = NOW()`,
      [blockHeight]
    );
  } catch (error) {
    // Ignore if table doesn't exist
  }
}

// Main scanning function
async function scanBlocks(startHeight, endHeight, targetAddresses, config) {
  const stats = {
    blocksProcessed: 0,
    stakesFound: 0,
    errors: 0,
    startTime: Date.now(),
  };

  const addressSet = new Set(targetAddresses);
  const BATCH_SIZE = config.batchSize || 10;
  const DELAY = config.delay || 500;
  const MAX_CONCURRENT = config.concurrent || 1;

  log(`\n📊 Scan Configuration:`, 'cyan');
  log(`   Concurrent requests: ${MAX_CONCURRENT}`, 'cyan');
  log(`   Batch size: ${BATCH_SIZE}`, 'cyan');
  log(`   Delay between batches: ${DELAY}ms`, 'cyan');
  log(`   Target addresses: ${addressSet.size}`, 'cyan');

  let activeRequests = 0;
  const pendingBlocks = [];

  for (let height = startHeight; height <= endHeight; height++) {
    // Wait if too many concurrent requests
    while (activeRequests >= MAX_CONCURRENT) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    activeRequests++;

    // Process block
    (async h => {
      try {
        const hash = await rpcCall('getblockhash', [h]);
        const block = await rpcCall('getblock', [hash, 2]);

        const stakes = findStakesInBlock(block, addressSet);
        for (const stake of stakes) {
          await insertStake(stake);
          stats.stakesFound++;
        }

        stats.blocksProcessed++;

        // Progress update every 100 blocks
        if (stats.blocksProcessed % 100 === 0) {
          const elapsed = (Date.now() - stats.startTime) / 1000;
          const rate = stats.blocksProcessed / elapsed;
          const remaining = endHeight - h;
          const eta = remaining / rate;

          log(
            `\n📈 Progress: ${stats.blocksProcessed.toLocaleString()} blocks`,
            'green'
          );
          log(`   Current height: ${h.toLocaleString()}`, 'blue');
          log(
            `   Stakes found: ${stats.stakesFound.toLocaleString()}`,
            'green'
          );
          log(`   Speed: ${rate.toFixed(2)} blocks/sec`, 'cyan');
          log(
            `   Errors: ${stats.errors}`,
            stats.errors > 10 ? 'red' : 'yellow'
          );
          log(`   ETA: ${Math.floor(eta / 60)} minutes`, 'cyan');

          // Save progress
          await saveScanProgress(h);
        }
      } catch (error) {
        stats.errors++;
        if (stats.errors % 50 === 0) {
          log(`⚠️  Error count: ${stats.errors}`, 'red');
        }
      } finally {
        activeRequests--;
      }
    })(height);

    // Batch delay
    if (height % BATCH_SIZE === 0) {
      await new Promise(resolve => setTimeout(resolve, DELAY));
    }
  }

  // Wait for all requests to complete
  while (activeRequests > 0) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return stats;
}

// Main function
async function main() {
  log(
    '\n╔══════════════════════════════════════════════════════════════════════════════╗',
    'blue'
  );
  log(
    '║               Standalone Staking Scanner (No Dev Server Required)           ║',
    'blue'
  );
  log(
    '╚══════════════════════════════════════════════════════════════════════════════╝\n',
    'blue'
  );

  try {
    // Test database connection
    log('🔍 Testing database connection...', 'yellow');
    await db.query('SELECT 1');
    log('✅ Database connected', 'green');

    // Test RPC connection
    log('🔍 Testing RPC connection...', 'yellow');
    const blockCount = await rpcCall('getblockcount');
    log(
      `✅ RPC connected - Current tip: ${blockCount.toLocaleString()}`,
      'green'
    );

    // Get last scanned block
    log('\n🔍 Checking database status...', 'yellow');
    const lastScanned = await getLastScannedBlock();
    log(`📊 Last scanned block: ${lastScanned.toLocaleString()}`, 'cyan');

    // Get addresses to track
    log('🔍 Loading VerusID addresses...', 'yellow');
    const addresses = await getVerusIDAddresses();
    log(
      `📊 Tracking ${addresses.size.toLocaleString()} VerusID addresses`,
      'cyan'
    );

    if (addresses.size === 0) {
      log('\n⚠️  No addresses found! This might be your first scan.', 'yellow');
      log(
        '   The scanner will still work but may not find many stakes.',
        'yellow'
      );
    }

    // Determine scan range
    const startHeight = lastScanned + 1;
    const endHeight = blockCount;
    const blocksToScan = endHeight - startHeight + 1;

    if (blocksToScan <= 0) {
      log('\n✅ Database is already up to date!', 'green');
      process.exit(0);
    }

    log(
      '\n╔══════════════════════════════════════════════════════════════════════════════╗',
      'blue'
    );
    log(
      '║                            Scan Summary                                      ║',
      'blue'
    );
    log(
      '╚══════════════════════════════════════════════════════════════════════════════╝',
      'blue'
    );
    log(`   From block: ${startHeight.toLocaleString()}`, 'cyan');
    log(`   To block: ${endHeight.toLocaleString()}`, 'cyan');
    log(`   Blocks to scan: ${blocksToScan.toLocaleString()}`, 'cyan');
    log(
      `   Tracking: ${addresses.size.toLocaleString()} VerusID addresses`,
      'cyan'
    );

    // Choose config based on block count
    let config;
    if (blocksToScan < 10000) {
      config = { concurrent: 3, batchSize: 50, delay: 100 };
      log(`\n📊 Using FAST profile (< 10K blocks)`, 'green');
    } else if (blocksToScan < 100000) {
      config = { concurrent: 2, batchSize: 25, delay: 200 };
      log(`\n📊 Using BALANCED profile (< 100K blocks)`, 'yellow');
    } else {
      config = { concurrent: 1, batchSize: 10, delay: 500 };
      log(`\n📊 Using CONSERVATIVE profile (> 100K blocks)`, 'cyan');
    }

    const estimatedSeconds = blocksToScan / (config.concurrent * 10);
    const estimatedMinutes = Math.floor(estimatedSeconds / 60);
    log(`   Estimated time: ~${estimatedMinutes} minutes`, 'cyan');

    // Start scanning
    log('\n🚀 Starting scan...', 'green');
    log(
      '   (Press Ctrl+C to stop - progress is saved automatically)\n',
      'yellow'
    );

    const startTime = Date.now();
    const stats = await scanBlocks(startHeight, endHeight, addresses, config);
    const elapsed = (Date.now() - startTime) / 1000;

    // Final summary
    log(
      '\n╔══════════════════════════════════════════════════════════════════════════════╗',
      'green'
    );
    log(
      '║                          Scan Complete!                                      ║',
      'green'
    );
    log(
      '╚══════════════════════════════════════════════════════════════════════════════╝',
      'green'
    );
    log(
      `   Blocks processed: ${stats.blocksProcessed.toLocaleString()}`,
      'cyan'
    );
    log(`   Stakes found: ${stats.stakesFound.toLocaleString()}`, 'green');
    log(
      `   Errors: ${stats.errors.toLocaleString()}`,
      stats.errors > 100 ? 'red' : 'yellow'
    );
    log(
      `   Time taken: ${Math.floor(elapsed / 60)} minutes ${Math.floor(elapsed % 60)} seconds`,
      'cyan'
    );
    log(
      `   Average speed: ${(stats.blocksProcessed / elapsed).toFixed(2)} blocks/sec`,
      'cyan'
    );

    // Verify final state
    const finalBlock = await getLastScannedBlock();
    log(`\n✅ Database now at block: ${finalBlock.toLocaleString()}`, 'green');
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    log(error.stack, 'red');
    process.exit(1);
  } finally {
    await db.end();
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', async () => {
  log('\n\n⏸️  Scan interrupted by user', 'yellow');
  log(
    '   Progress has been saved. You can resume by running this script again.',
    'cyan'
  );
  await db.end();
  process.exit(0);
});

// Run
main();
