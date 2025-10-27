#!/usr/bin/env node

/**
 * Working script to populate VerusID creation dates in the database
 * Uses getidentityhistory to find the actual creation block and timestamp
 */

const { Pool } = require('pg');
const { execSync } = require('child_process');

// Database connection with explicit credentials
const db = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'verus_utxo_db',
  user: 'verus_user',
  password: 'verus_secure_2024',
});

// Statistics tracking
const stats = {
  total: 0,
  processed: 0,
  updated: 0,
  errors: 0,
  startTime: Date.now(),
};

/**
 * Get VerusID creation information from blockchain
 */
async function getVerusIDCreation(identityAddress) {
  try {
    const result = execSync(
      `/home/explorer/verus-cli/verus getidentityhistory "${identityAddress}"`,
      { encoding: 'utf8', timeout: 10000 }
    );

    const data = JSON.parse(result);

    if (data.blockheight && data.txid) {
      // Get block timestamp
      const blockResult = execSync(
        `/home/explorer/verus-cli/verus getblock ${data.blockheight}`,
        { encoding: 'utf8', timeout: 5000 }
      );

      const blockData = JSON.parse(blockResult);

      return {
        creationBlockHeight: data.blockheight,
        creationTxid: data.txid,
        creationTimestamp: new Date(blockData.time * 1000).toISOString(),
      };
    }

    return null;
  } catch (error) {
    console.error(
      `Error getting creation info for ${identityAddress}:`,
      error.message
    );
    return null;
  }
}

/**
 * Update VerusID creation information in database
 */
async function updateVerusIDCreation(identityAddress, creationInfo) {
  try {
    const result = await db.query(
      `UPDATE identities 
       SET creation_block_height = $1, 
           creation_txid = $2, 
           creation_timestamp = $3,
           last_refreshed_at = NOW()
       WHERE identity_address = $4`,
      [
        creationInfo.creationBlockHeight,
        creationInfo.creationTxid,
        creationInfo.creationTimestamp,
        identityAddress,
      ]
    );

    return result.rowCount > 0;
  } catch (error) {
    console.error(`Error updating ${identityAddress}:`, error.message);
    return false;
  }
}

/**
 * Process a batch of VerusIDs
 */
async function processBatch(verusIDs, batchSize = 5) {
  const promises = verusIDs.map(async verusID => {
    try {
      stats.processed++;

      // Check if already has creation info
      const existing = await db.query(
        'SELECT creation_block_height FROM identities WHERE identity_address = $1',
        [verusID.identity_address]
      );

      if (existing.rows[0]?.creation_block_height) {
        console.log(
          `✓ ${verusID.friendly_name || verusID.base_name} already has creation info`
        );
        return;
      }

      console.log(
        `🔍 Processing ${verusID.friendly_name || verusID.base_name} (${verusID.identity_address})`
      );

      const creationInfo = await getVerusIDCreation(verusID.identity_address);

      if (creationInfo) {
        const updated = await updateVerusIDCreation(
          verusID.identity_address,
          creationInfo
        );
        if (updated) {
          stats.updated++;
          console.log(
            `✅ Updated ${verusID.friendly_name || verusID.base_name}: Block ${creationInfo.creationBlockHeight}, ${creationInfo.creationTimestamp}`
          );
        }
      } else {
        console.log(
          `⚠️  No creation info found for ${verusID.friendly_name || verusID.base_name}`
        );
      }

      // Rate limiting - small delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      stats.errors++;
      console.error(
        `❌ Error processing ${verusID.identity_address}:`,
        error.message
      );
    }
  });

  await Promise.allSettled(promises);
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting VerusID creation date population...\n');

    // Test database connection
    await db.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Get all VerusIDs from database that don't have creation info
    console.log('📊 Loading VerusIDs from database...');
    const result = await db.query(
      `SELECT identity_address, base_name, friendly_name 
       FROM identities 
       WHERE identity_address LIKE 'i%' 
       AND creation_block_height IS NULL
       ORDER BY identity_address`
    );

    stats.total = result.rows.length;
    console.log(`✓ Found ${stats.total} VerusIDs without creation info\n`);

    if (stats.total === 0) {
      console.log('✅ All VerusIDs already have creation info!');
      return;
    }

    // Process in small batches to avoid overwhelming the RPC
    const batchSize = 3; // Very small batches
    const batches = [];

    for (let i = 0; i < result.rows.length; i += batchSize) {
      batches.push(result.rows.slice(i, i + batchSize));
    }

    console.log(
      `📦 Processing ${batches.length} batches of ${batchSize} VerusIDs each\n`
    );

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(
        `\n🔄 Processing batch ${i + 1}/${batches.length} (${batch.length} VerusIDs)`
      );

      await processBatch(batch);

      // Progress update
      const progress = ((stats.processed / stats.total) * 100).toFixed(1);
      const elapsed = (Date.now() - stats.startTime) / 1000;
      const rate = stats.processed / elapsed;
      const eta = (stats.total - stats.processed) / rate;

      console.log(
        `📊 Progress: ${stats.processed}/${stats.total} (${progress}%) | Updated: ${stats.updated} | Errors: ${stats.errors}`
      );
      console.log(
        `⏱️  Rate: ${rate.toFixed(2)}/sec | ETA: ${(eta / 60).toFixed(1)} minutes`
      );

      // Longer delay between batches
      if (i < batches.length - 1) {
        console.log('⏳ Waiting 3 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    // Final statistics
    const totalTime = (Date.now() - stats.startTime) / 1000;
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║              POPULATION COMPLETE!             ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log(`📊 Total VerusIDs: ${stats.total}`);
    console.log(`✅ Processed: ${stats.processed}`);
    console.log(`🔄 Updated: ${stats.updated}`);
    console.log(`❌ Errors: ${stats.errors}`);
    console.log(`⏱️  Total Time: ${(totalTime / 60).toFixed(1)} minutes`);
    console.log(
      `🚀 Rate: ${(stats.processed / totalTime).toFixed(2)} VerusIDs/sec`
    );

    // Show some examples of updated VerusIDs
    console.log('\n📋 Sample of updated VerusIDs:');
    const sample = await db.query(
      `SELECT identity_address, base_name, friendly_name, creation_block_height, creation_timestamp 
       FROM identities 
       WHERE creation_block_height IS NOT NULL 
       ORDER BY creation_timestamp ASC 
       LIMIT 10`
    );

    sample.rows.forEach(row => {
      console.log(
        `  • ${row.friendly_name || row.base_name}: Block ${row.creation_block_height}, ${row.creation_timestamp}`
      );
    });
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Received SIGINT, shutting down gracefully...');
  console.log(
    `📊 Final stats: ${stats.processed}/${stats.total} processed, ${stats.updated} updated, ${stats.errors} errors`
  );
  await db.end();
  process.exit(0);
});

main().catch(console.error);
