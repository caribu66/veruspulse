#!/usr/bin/env node
/**
 * Standalone Verus Staking Scanner
 * Scans ALL VerusID staking rewards from December 2020 to current tip
 * Can be run outside Cursor and left running in background
 */

require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

/**
 * I-ADDRESS STAKING RULE IMPLEMENTATION
 *
 * This scanner now implements the I-Address Staking Rule:
 * - Only stakes where source_address = identity_address (I-address) are counted for VerusID statistics
 * - VerusIDs that receive staking help from other addresses show 0 stakes
 * - The getActualStakingAddress() function determines the real staking address
 * - Direct I-address stakes are logged as "✅ Direct I-address stake"
 * - Indirect stakes are logged as "📝 Indirect stake: I-address <- R-address"
 *
 * This ensures the VerusID page only shows VerusIDs that staked directly with their I-address.
 */

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║   Standalone Verus Staking Scanner                       ║');
console.log('║   Scanning ALL VerusIDs from Dec 2020 to Tip             ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// Configuration
const BATCH_SIZE = 100;
const PROGRESS_INTERVAL = 500;
const CHECKPOINT_INTERVAL = 5000;
const LOG_FILE = '/tmp/standalone-staking-scanner.log';
const PID_FILE = '/tmp/standalone-staking-scanner.pid';

// RPC configuration from environment
const RPC_URL = process.env.VERUS_RPC_HOST || 'http://127.0.0.1:18843';
const RPC_USER = process.env.VERUS_RPC_USER || 'verus';
const RPC_PASS = process.env.VERUS_RPC_PASSWORD || 'verus';

// Database configuration
const dbConfig = {
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 10,
};

const db = new Pool(dbConfig);

// Progress tracking
let stats = {
  totalVerusIDs: 0,
  blocksScanned: 0,
  stakeEventsFound: 0,
  verusIDsWithNewStakes: new Set(),
  errors: 0,
  startTime: Date.now(),
  lastSavedBlock: 0,
  currentHeight: 0,
  startHeight: 0,
};

// Logging function
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);

  // Also write to log file
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

// Make RPC call with retry logic
async function rpcCall(method, params = [], retries = 3) {
  const auth = Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString('base64');
  const postData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'standalone-scanner',
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

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`RPC timeout for ${method}`));
        }, 30000);

        const req = (url.protocol === 'https:' ? https : http).request(
          options,
          res => {
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => {
              clearTimeout(timeoutId);
              try {
                const json = JSON.parse(data);
                if (json.error) {
                  reject(
                    new Error(json.error.message || JSON.stringify(json.error))
                  );
                } else {
                  resolve(json.result);
                }
              } catch (e) {
                reject(new Error(`JSON parse error: ${e.message}`));
              }
            });
          }
        );

        req.on('error', error => {
          clearTimeout(timeoutId);
          reject(error);
        });

        req.write(postData);
        req.end();
      });
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      log(
        `RPC call failed (attempt ${attempt}/${retries}): ${error.message}`,
        'WARN'
      );
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
}

// Get ALL VerusID I-addresses from database
async function getAllVerusIDs() {
  const result = await db.query(`
    SELECT identity_address, base_name, friendly_name
    FROM identities
    WHERE identity_address LIKE 'i%'
    ORDER BY identity_address
  `);
  return result.rows.map(r => ({
    address: r.identity_address,
    name: r.base_name || 'unknown',
    friendlyName: r.friendly_name,
  }));
}

// Get the last block we've fully scanned (to resume if interrupted)
async function getLastScannedBlock() {
  try {
    const result = await db.query(`
      SELECT scan_progress 
      FROM scan_metadata 
      WHERE scan_type = 'standalone_staking_scan' 
      ORDER BY last_updated DESC 
      LIMIT 1
    `);

    if (result.rows.length > 0) {
      return result.rows[0].scan_progress;
    }
  } catch (error) {
    // Table might not exist, that's ok
  }

  // Default to December 2020 (approximately block 1,300,000)
  return 1300000;
}

// Save scan progress
async function saveScanProgress(blockHeight) {
  try {
    await db.query(
      `
      INSERT INTO scan_metadata (scan_type, scan_progress, last_updated)
      VALUES ('standalone_staking_scan', $1, NOW())
      ON CONFLICT (scan_type) 
      DO UPDATE SET scan_progress = $1, last_updated = NOW()
    `,
      [blockHeight]
    );
    stats.lastSavedBlock = blockHeight;
  } catch (error) {
    // Table might not exist, create it
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS scan_metadata (
          scan_type VARCHAR(100) PRIMARY KEY,
          scan_progress INTEGER NOT NULL,
          last_updated TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      await db.query(
        `
        INSERT INTO scan_metadata (scan_type, scan_progress, last_updated)
        VALUES ('standalone_staking_scan', $1, NOW())
      `,
        [blockHeight]
      );
      stats.lastSavedBlock = blockHeight;
    } catch (e) {
      log(`Warning: Could not save progress: ${e.message}`, 'WARN');
    }
  }
}

// Check if block contains stakes for our addresses
function findStakesInBlock(block, targetAddresses) {
  const stakes = [];

  if (!block || !block.tx || block.tx.length === 0) return stakes;

  // Check if this is a PoS block (minted/staked)
  const isPoS =
    block.validationtype === 'stake' || block.blocktype === 'minted';
  if (!isPoS) return stakes;

  // Coinstake transaction (first tx in PoS block)
  const coinstake = block.tx[0];
  if (!coinstake || !coinstake.vout) return stakes;

  // Track which addresses we've already recorded for this block
  const addressesFoundInBlock = new Set();

  // Check each output and record ONE stake per address per block
  // Sum up all vout values that go to each target address
  const addressRewards = new Map();

  for (let voutIdx = 0; voutIdx < coinstake.vout.length; voutIdx++) {
    const vout = coinstake.vout[voutIdx];
    if (!vout.scriptPubKey || !vout.scriptPubKey.addresses) continue;

    for (const addr of vout.scriptPubKey.addresses) {
      // Only record if this is a target I-address
      if (targetAddresses.has(addr)) {
        if (!addressRewards.has(addr)) {
          addressRewards.set(addr, 0);
        }
        addressRewards.set(addr, addressRewards.get(addr) + vout.value);
      }
    }
  }

  // Create stakes for each address that received rewards
  for (const [addr, totalReward] of addressRewards) {
    if (!addressesFoundInBlock.has(addr)) {
      addressesFoundInBlock.add(addr);

      stakes.push({
        address: addr,
        amount: Math.round(totalReward * 100000000), // Convert to satoshis
        blockHeight: block.height,
        blockTime: new Date(block.time * 1000).toISOString(),
        txid: coinstake.txid,
        vout: 0, // Use 0 since we're summing multiple vouts
        blockHash: block.hash,
      });

      stats.verusIDsWithNewStakes.add(addr);
    }
  }

  return stakes;
}

// Get the actual staking address from transaction inputs
async function getActualStakingAddress(txid, identityAddress) {
  try {
    // Get the transaction details
    const tx = await rpcCall('getrawtransaction', [txid, true]);

    if (!tx || !tx.vin || tx.vin.length === 0) {
      log(`⚠️  No inputs found for tx ${txid}`, 'WARN');
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
          log(
            `⚠️  Error getting previous tx ${vin.txid}: ${err.message}`,
            'WARN'
          );
          continue;
        }
      }
    }

    return identityAddress; // Fallback to identity address
  } catch (err) {
    log(
      `⚠️  Error getting staking address for tx ${txid}: ${err.message}`,
      'WARN'
    );
    return identityAddress; // Fallback to identity address
  }
}

// Insert stake into database with proper I-Address Rule
async function insertStake(stake) {
  try {
    // Get the actual staking address
    const actualStakingAddress = await getActualStakingAddress(
      stake.txid,
      stake.address
    );

    await db.query(
      `
      INSERT INTO staking_rewards (
        identity_address, txid, vout, block_height, block_hash, 
        block_time, amount_sats, classifier, source_address
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (txid, vout) DO NOTHING
    `,
      [
        stake.address,
        stake.txid,
        stake.vout,
        stake.blockHeight,
        stake.blockHash,
        stake.blockTime,
        stake.amount,
        'coinbase', // PoS rewards
        actualStakingAddress, // Use the actual staking address
      ]
    );

    // Log the attribution for verification
    if (actualStakingAddress === stake.address) {
      log(`   ✅ Direct I-address stake: ${stake.address}`, 'INFO');
    } else {
      log(
        `   📝 Indirect stake: ${stake.address} <- ${actualStakingAddress}`,
        'INFO'
      );
    }

    stats.stakeEventsFound++;
  } catch (error) {
    log(`Error inserting stake: ${error.message}`, 'ERROR');
    stats.errors++;
  }
}

// Scan blocks
async function scanBlocks(startHeight, endHeight, targetAddresses) {
  log(
    `Starting block scan from ${startHeight.toLocaleString()} to ${endHeight.toLocaleString()}`
  );

  for (let height = startHeight; height <= endHeight; height += BATCH_SIZE) {
    const batchEnd = Math.min(height + BATCH_SIZE - 1, endHeight);
    const batch = [];

    // Prepare batch
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
          log(`Failed to fetch block ${blockHeight}: ${error.message}`, 'WARN');
          return null;
        }
      });

      const blocks = await Promise.all(blockPromises);

      // Process blocks
      for (const block of blocks) {
        if (!block) continue;

        const stakes = findStakesInBlock(block, targetAddresses);
        for (const stake of stakes) {
          await insertStake(stake);
        }

        stats.blocksScanned++;

        // Save progress periodically
        if (stats.blocksScanned % CHECKPOINT_INTERVAL === 0) {
          await saveScanProgress(block.height);
        }

        // Show progress
        if (stats.blocksScanned % PROGRESS_INTERVAL === 0) {
          const elapsed = (Date.now() - stats.startTime) / 1000;
          const rate = stats.blocksScanned / elapsed;
          const remaining = endHeight - block.height;
          const eta = remaining / rate;
          const progress = (
            ((block.height - startHeight) / (endHeight - startHeight)) *
            100
          ).toFixed(1);

          log(
            `Progress: ${progress}% | Block: ${block.height.toLocaleString()}/${endHeight.toLocaleString()} | Stakes: ${stats.stakeEventsFound.toLocaleString()} | Speed: ${rate.toFixed(1)} blocks/sec | ETA: ${(eta / 3600).toFixed(1)}h`
          );
        }
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      log(`Batch error at height ${height}: ${error.message}`, 'ERROR');
      stats.errors++;
    }
  }

  // Final save
  await saveScanProgress(endHeight);
}

// Create PID file
function createPidFile() {
  fs.writeFileSync(PID_FILE, process.pid.toString());
  log(`Created PID file: ${PID_FILE}`);
}

// Remove PID file
function removePidFile() {
  try {
    fs.unlinkSync(PID_FILE);
    log(`Removed PID file: ${PID_FILE}`);
  } catch (error) {
    // File might not exist, that's ok
  }
}

// Graceful shutdown handler
async function gracefulShutdown() {
  log('Graceful shutdown requested...', 'INFO');
  log(`Last scanned block: ${stats.lastSavedBlock.toLocaleString()}`, 'INFO');
  log(`Stakes found: ${stats.stakeEventsFound.toLocaleString()}`, 'INFO');
  log(
    `VerusIDs with stakes: ${stats.verusIDsWithNewStakes.size.toLocaleString()}`,
    'INFO'
  );

  removePidFile();
  await db.end();
  process.exit(0);
}

// Main function
async function main() {
  try {
    // Create PID file
    createPidFile();

    // Set up graceful shutdown handlers
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
    process.on('uncaughtException', error => {
      log(`Uncaught exception: ${error.message}`, 'ERROR');
      gracefulShutdown();
    });

    log('Starting standalone staking scanner...');

    // Load ALL VerusIDs (I-addresses only)
    log('Loading VerusIDs from database...');
    const verusIDs = await getAllVerusIDs();
    stats.totalVerusIDs = verusIDs.length;
    log(`Loaded ${stats.totalVerusIDs.toLocaleString()} VerusIDs`);

    if (stats.totalVerusIDs === 0) {
      throw new Error('No VerusIDs found in database!');
    }

    // Create address set for fast lookup
    const addressSet = new Set(verusIDs.map(v => v.address));
    log(
      `Created address lookup set (${addressSet.size.toLocaleString()} addresses)`
    );

    // Check if we can resume from previous run
    const lastScanned = await getLastScannedBlock();
    log(`Last scanned block: ${lastScanned.toLocaleString()}`);

    // Get current blockchain height
    log('Getting current blockchain height...');
    stats.currentHeight = await rpcCall('getblockcount');
    log(`Current blockchain height: ${stats.currentHeight.toLocaleString()}`);

    // Calculate scan range
    stats.startHeight = lastScanned + 1;
    const endHeight = stats.currentHeight;
    const totalBlocks = endHeight - stats.startHeight + 1;

    if (totalBlocks <= 0) {
      log('Scan already complete! All blocks scanned.', 'INFO');
      return;
    }

    log(`Scan Configuration:`);
    log(
      `  Start Block: ${stats.startHeight.toLocaleString()}${lastScanned > 1000000 ? ' (RESUMING)' : ' (December 2020)'}`
    );
    log(`  End Block: ${endHeight.toLocaleString()} (Current)`);
    log(`  Total Blocks: ${totalBlocks.toLocaleString()}`);
    log(`  VerusIDs: ${stats.totalVerusIDs.toLocaleString()}`);
    log(
      `  Est. Time: ~${(totalBlocks / 30 / 3600).toFixed(1)} hours at 30 blocks/sec`
    );

    // Start scan
    stats.startTime = Date.now();
    await scanBlocks(stats.startHeight, endHeight, addressSet);

    // Final stats
    const totalTime = (Date.now() - stats.startTime) / 1000;
    log('SCAN COMPLETE!', 'INFO');
    log(`Blocks scanned: ${stats.blocksScanned.toLocaleString()}`);
    log(`Stakes found: ${stats.stakeEventsFound.toLocaleString()}`);
    log(
      `VerusIDs with stakes: ${stats.verusIDsWithNewStakes.size.toLocaleString()}`
    );
    log(`Errors: ${stats.errors}`);
    log(`Total time: ${(totalTime / 3600).toFixed(1)} hours`);
    log(`Speed: ${(stats.blocksScanned / totalTime).toFixed(1)} blocks/sec`);

    // Final database stats
    const finalStats = await db.query(`
      SELECT 
        COUNT(DISTINCT identity_address) as verusids_with_stakes,
        COUNT(*) as total_stakes,
        ROUND(SUM(amount_sats) / 100000000.0, 2) as total_vrsc
      FROM staking_rewards
    `);

    const final = finalStats.rows[0];
    log('Final Database Statistics:');
    log(`  VerusIDs with stakes: ${final.verusids_with_stakes}`);
    log(`  Total stake events: ${final.total_stakes}`);
    log(`  Total VRSC staked: ${final.total_vrsc} VRSC`);

    log('Complete staking history for ALL VerusIDs saved!', 'INFO');
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'ERROR');
    throw error;
  } finally {
    removePidFile();
    await db.end();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    log(`Fatal error: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}

module.exports = { main };
