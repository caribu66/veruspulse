#!/usr/bin/env node
/**
 * Scan VerusID Staking Data - Fill the Gap
 *
 * Scans blocks between VerusID activation (1,520,000) and your existing data
 * to capture all historical VerusID staking rewards.
 *
 * Usage:
 *   node scripts/scan-verusid-gap.js --start 1520000 --end 1990205
 *   node scripts/scan-verusid-gap.js --auto  (automatically finds gaps)
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
    const auth = Buffer.from(`${RPC_USER}:${RPC_PASSWORD}`).toString('base64');

    const postData = JSON.stringify({
      jsonrpc: '1.0',
      id: Date.now(),
      method,
      params,
    });

    const options = {
      hostname: url.hostname,
      port: url.port || 18843,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(postData),
        Authorization: `Basic ${auth}`,
      },
      timeout: 10000,
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(json.error.message || JSON.stringify(json.error)));
          } else {
            resolve(json.result);
          }
        } catch (err) {
          reject(new Error(`Invalid JSON: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.write(postData);
    req.end();
  });
}

// Get block by height
async function getBlock(height) {
  const blockHash = await rpcCall('getblockhash', [height]);
  return await rpcCall('getblock', [blockHash, 2]); // 2 = full transaction data
}

// Check if block is a PoS block and extract staker address (I or R address)
// Using Oink70's proven method: block.validationtype === 'stake'
function extractStakingInfo(block) {
  // OINK70'S PROVEN METHOD: Only validationtype="stake" is PoS
  if (block.validationtype !== 'stake') {
    return null;
  }

  // First transaction is the coinstake
  if (!block.tx || block.tx.length === 0) {
    return null;
  }

  const coinstake = block.tx[0];

  // Get the first output address (the staker) - can be I-address OR R-address
  if (coinstake.vout && coinstake.vout.length > 0) {
    for (const vout of coinstake.vout) {
      if (
        vout.scriptPubKey &&
        vout.scriptPubKey.addresses &&
        vout.scriptPubKey.addresses.length > 0
      ) {
        const address = vout.scriptPubKey.addresses[0];
        // Only interested in I-addresses (VerusIDs)
        if (address && address.startsWith('i')) {
          // Only count non-zero value outputs (the actual stake reward)
          if (vout.value > 0) {
            return {
              identityAddress: address,
              blockHeight: block.height,
              blockTime: new Date(block.time * 1000),
              blockHash: block.hash,
              txid: coinstake.txid,
              amountSats: Math.floor(vout.value * 100000000),
            };
          }
        }
      }
    }
  }

  return null;
}

// Store staking reward in database
async function storeStakingReward(reward) {
  const query = `
    INSERT INTO staking_rewards (
      identity_address, txid, vout, block_height, block_time, block_hash, 
      amount_sats, classifier, source_address
    )
    VALUES ($1, $2, 0, $3, $4, $5, $6, 'coinbase', $1)
    ON CONFLICT (txid, vout) DO NOTHING
  `;

  await pool.query(query, [
    reward.identityAddress,
    reward.txid,
    reward.blockHeight,
    reward.blockTime,
    reward.blockHash,
    reward.amountSats,
  ]);
}

// Store or update identity
async function storeIdentity(address, blockHeight) {
  const query = `
    INSERT INTO identities (identity_address, base_name, friendly_name, first_seen_block)
    VALUES ($1, 'unknown', 'unknown.VRSC@', $2)
    ON CONFLICT (identity_address) 
    DO UPDATE SET 
      first_seen_block = LEAST(identities.first_seen_block, EXCLUDED.first_seen_block)
    WHERE identities.first_seen_block IS NULL OR identities.first_seen_block > EXCLUDED.first_seen_block
  `;

  await pool.query(query, [address, blockHeight]);
}

// Find gaps in existing data
async function findGaps() {
  const query = `
    SELECT 
      MIN(block_height) as min_block,
      MAX(block_height) as max_block
    FROM staking_rewards
  `;

  const result = await pool.query(query);
  const { min_block, max_block } = result.rows[0];

  // Get current blockchain height
  const info = await rpcCall('getblockchaininfo');
  const currentHeight = info.blocks;

  return {
    beforeExisting: min_block
      ? { start: VERUSID_START_BLOCK, end: min_block - 1 }
      : null,
    afterExisting: max_block
      ? { start: max_block + 1, end: currentHeight }
      : null,
    currentHeight,
  };
}

// Process a range of blocks
async function processBlockRange(start, end) {
  let processed = 0;
  let stakes = 0;
  let errors = 0;

  const startTime = Date.now();

  for (let height = start; height <= end; height += BATCH_SIZE) {
    const batchEnd = Math.min(height + BATCH_SIZE - 1, end);
    const batchPromises = [];

    // Process blocks in parallel batches
    for (
      let h = height;
      h <= batchEnd;
      h += Math.ceil(BATCH_SIZE / CONCURRENT_REQUESTS)
    ) {
      const chunkEnd = Math.min(
        h + Math.ceil(BATCH_SIZE / CONCURRENT_REQUESTS) - 1,
        batchEnd
      );
      batchPromises.push(processChunk(h, chunkEnd));
    }

    try {
      const results = await Promise.all(batchPromises);
      const batchStakes = results.reduce((sum, r) => sum + r.stakes, 0);
      stakes += batchStakes;
      processed += batchEnd - height + 1;

      // Progress update
      const progress = (((height - start) / (end - start)) * 100).toFixed(2);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (processed / elapsed).toFixed(1);
      const eta = ((end - height) / rate).toFixed(0);

      process.stdout.write(
        `\r[${progress}%] Block ${height}-${batchEnd} | ` +
          `Stakes: ${stakes} | Rate: ${rate}/s | ETA: ${eta}s    `
      );
    } catch (error) {
      errors++;
      console.error(
        `\nError processing batch ${height}-${batchEnd}:`,
        error.message
      );
    }

    // Add delay between batches to avoid hammering daemon
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { processed, stakes, errors };
}

// Process a chunk of blocks
async function processChunk(start, end) {
  let stakes = 0;

  for (let height = start; height <= end; height++) {
    try {
      const block = await getBlock(height);
      const stakeInfo = extractStakingInfo(block);

      if (stakeInfo) {
        await storeStakingReward(stakeInfo);
        await storeIdentity(stakeInfo.identityAddress, height);
        stakes++;
      }

      // Small delay to avoid hammering RPC
      if (height % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    } catch (error) {
      // Skip blocks that can't be retrieved (might not exist yet)
      if (!error.message.includes('Block not found')) {
        throw error;
      }
    }
  }

  return { stakes };
}

// Main function
async function main() {
  console.log('🔍 VerusID Staking Gap Scanner\n');
  console.log('━'.repeat(60));

  // Determine scan range
  if (autoMode) {
    console.log('\n📊 Auto mode: Finding gaps in data...\n');
    const gaps = await findGaps();

    console.log(`Current blockchain height: ${gaps.currentHeight}`);

    if (gaps.beforeExisting) {
      console.log(`\nGap before existing data:`);
      console.log(
        `  Blocks: ${gaps.beforeExisting.start} → ${gaps.beforeExisting.end}`
      );
      console.log(
        `  Count: ${gaps.beforeExisting.end - gaps.beforeExisting.start + 1} blocks`
      );
      startBlock = gaps.beforeExisting.start;
      endBlock = gaps.beforeExisting.end;
    } else if (gaps.afterExisting) {
      console.log(`\nGap after existing data:`);
      console.log(
        `  Blocks: ${gaps.afterExisting.start} → ${gaps.afterExisting.end}`
      );
      console.log(
        `  Count: ${gaps.afterExisting.end - gaps.afterExisting.start + 1} blocks`
      );
      startBlock = gaps.afterExisting.start;
      endBlock = gaps.afterExisting.end;
    } else {
      console.log('\n✅ No gaps found! Database is complete.');
      process.exit(0);
    }
  } else if (!startBlock || !endBlock) {
    console.error('\n❌ Error: Must specify --start and --end, or use --auto');
    console.error('\nUsage:');
    console.error(
      '  node scripts/scan-verusid-gap.js --start 1520000 --end 1990205'
    );
    console.error('  node scripts/scan-verusid-gap.js --auto');
    process.exit(1);
  }

  console.log(`\n🚀 Scanning blocks ${startBlock} → ${endBlock}`);
  console.log(`   Total blocks: ${endBlock - startBlock + 1}`);
  console.log(`   Batch size: ${BATCH_SIZE}`);
  console.log('');

  const result = await processBlockRange(startBlock, endBlock);

  console.log('\n\n━'.repeat(60));
  console.log('\n✅ Scan Complete!\n');
  console.log(`   Processed: ${result.processed} blocks`);
  console.log(`   Stakes Found: ${result.stakes}`);
  console.log(`   Errors: ${result.errors}`);
  console.log('\n💡 Next: Run recalculate-all-stats.js to update statistics');
  console.log('   node scripts/recalculate-all-stats.js\n');
}

// Run the script
main()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    pool.end();
    process.exit(1);
  });
