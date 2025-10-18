#!/usr/bin/env node
/**
 * update-verusid-details.js
 * Updates VerusID details (names) for I-addresses in the database
 * Calls getidentity() for each to populate friendly names
 */

const { Pool } = require('pg');

console.log('╔════════════════════════════════════════════════╗');
console.log('║     VerusID Details Updater                    ║');
console.log('╚════════════════════════════════════════════════╝\n');

// Database configuration
const dbConfig = {
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 5,
};

const db = new Pool(dbConfig);

// Configuration
const BATCH_SIZE = 10; // Process 10 at a time
const DELAY_BETWEEN_CALLS = 100; // ms between RPC calls

let stats = {
  total: 0,
  updated: 0,
  failed: 0,
  skipped: 0,
  startTime: Date.now(),
};

// RPC helper
async function rpcCall(method, params = []) {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  const rpcUser = process.env.VERUS_RPC_USER || 'verus';
  const rpcPass = process.env.VERUS_RPC_PASSWORD || 'verus';
  const rpcHost = process.env.VERUS_RPC_HOST || '127.0.0.1';
  const rpcPort = process.env.VERUS_RPC_PORT || '18843';

  const rpcData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'updater',
    method,
    params,
  });

  // Escape single quotes in the JSON for shell
  const escapedData = rpcData.replace(/'/g, "'\\''");
  const cmd = `curl -s --user ${rpcUser}:${rpcPass} --data-binary '${escapedData}' -H 'content-type: text/plain;' http://${rpcHost}:${rpcPort}/`;

  try {
    const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 }); // 10MB buffer
    const result = JSON.parse(stdout);
    if (result.error) {
      throw new Error(result.error.message || JSON.stringify(result.error));
    }
    return result.result;
  } catch (error) {
    throw new Error(`RPC call failed: ${error.message}`);
  }
}

// Update a single VerusID
async function updateVerusID(iAddress, force = false) {
  try {
    // Call getidentity
    const identity = await rpcCall('getidentity', [iAddress]);

    if (!identity || !identity.identity) {
      console.log(`⚠️  ${iAddress}: No identity data returned`);
      stats.failed++;
      return false;
    }

    // Extract details
    const name = identity.identity.name || 'unknown';
    const friendlyName =
      identity.fullyqualifiedname || identity.friendlyname || `${name}.VRSC@`;
    const blockHeight = identity.blockheight || identity.height || null;
    const txid = identity.txid || null;

    // Update database
    await db.query(
      `
      UPDATE identities 
      SET 
        base_name = $1,
        friendly_name = $2,
        first_seen_block = COALESCE(first_seen_block, $3),
        last_refreshed_at = NOW()
      WHERE identity_address = $4
    `,
      [name, friendlyName, blockHeight, iAddress]
    );

    console.log(`✓ ${iAddress} → ${friendlyName}`);
    stats.updated++;
    return true;
  } catch (error) {
    console.error(`✗ ${iAddress}: ${error.message}`);
    stats.failed++;
    return false;
  }
}

// Process all VerusIDs
async function updateAll(onlyUnknown = true) {
  try {
    // Get all I-addresses that need updating
    const whereClause = onlyUnknown
      ? "WHERE identity_address LIKE 'i%' AND (base_name = 'unknown' OR base_name IS NULL)"
      : "WHERE identity_address LIKE 'i%'";

    const result = await db.query(`
      SELECT identity_address, base_name 
      FROM identities 
      ${whereClause}
      ORDER BY identity_address
    `);

    const addresses = result.rows;
    stats.total = addresses.length;

    console.log(`Found ${stats.total} VerusIDs to update\n`);

    if (stats.total === 0) {
      console.log('✅ All VerusIDs already have names!');
      return;
    }

    console.log('Starting updates...\n');

    // Process in batches
    for (let i = 0; i < addresses.length; i++) {
      const addr = addresses[i].identity_address;

      await updateVerusID(addr);

      // Progress report every 10 updates
      if ((i + 1) % 10 === 0) {
        const elapsed = (Date.now() - stats.startTime) / 1000;
        const rate = (i + 1) / elapsed;
        const remaining = addresses.length - (i + 1);
        const eta = remaining / rate;

        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(
          `Progress: ${i + 1}/${stats.total} (${(((i + 1) / stats.total) * 100).toFixed(1)}%)`
        );
        console.log(`Updated: ${stats.updated} | Failed: ${stats.failed}`);
        console.log(`Speed: ${rate.toFixed(1)} per second`);
        console.log(`ETA: ${(eta / 60).toFixed(1)} minutes`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      }

      // Small delay to avoid hammering RPC
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CALLS));
    }

    // Final stats
    const totalTime = (Date.now() - stats.startTime) / 1000;
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║          UPDATE COMPLETE!                      ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log(`Total processed: ${stats.total}`);
    console.log(`Successfully updated: ${stats.updated}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Total time: ${(totalTime / 60).toFixed(1)} minutes`);
    console.log(`Speed: ${(stats.total / totalTime).toFixed(1)} per second\n`);
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    throw error;
  }
}

// Main function
async function main() {
  try {
    const args = process.argv.slice(2);
    let onlyUnknown = true;

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--all' || args[i] === '-a') {
        onlyUnknown = false;
      } else if (args[i] === '--help' || args[i] === '-h') {
        console.log(`
Usage: node update-verusid-details.js [OPTIONS]

Options:
  -a, --all     Update all VerusIDs (including those with names)
                Default: Only update "unknown" entries
  -h, --help    Show this help

Examples:
  # Update only VerusIDs with "unknown" names (default)
  node update-verusid-details.js
  
  # Refresh all VerusID names
  node update-verusid-details.js --all

Environment Variables:
  VERUS_RPC_HOST      RPC host (default: 127.0.0.1)
  VERUS_RPC_PORT      RPC port (default: 18843)
  VERUS_RPC_USER      RPC username (default: verus)
  VERUS_RPC_PASSWORD  RPC password (default: verus)
  DATABASE_URL        PostgreSQL connection string
        `);
        process.exit(0);
      }
    }

    // Test database connection
    console.log('Testing database connection...');
    const dbTest = await db.query(
      "SELECT COUNT(*) FROM identities WHERE identity_address LIKE 'i%'"
    );
    console.log(`Total VerusIDs in database: ${dbTest.rows[0].count}`);

    const unknownTest = await db.query(
      "SELECT COUNT(*) FROM identities WHERE identity_address LIKE 'i%' AND base_name = 'unknown'"
    );
    console.log(
      `VerusIDs with "unknown" names: ${unknownTest.rows[0].count}\n`
    );

    // Test RPC connection
    console.log('Testing RPC connection...');
    const blockCount = await rpcCall('getblockcount');
    console.log(`✓ RPC connected (block height: ${blockCount})\n`);

    // Start processing
    stats.startTime = Date.now();
    await updateAll(onlyUnknown);
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

// Run
main().catch(console.error);
