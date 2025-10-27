#!/usr/bin/env node

/**
 * Get VerusID Creation Date Using getidentityhistory (CORRECT METHOD)
 *
 * This script uses the proper method discovered through research:
 * 1. Use getidentityhistory to get the full history
 * 2. The FIRST entry (history[0]) is the creation
 * 3. Get the block timestamp for the creation date
 *
 * This is the most accurate method for finding VerusID creation dates!
 */

const { execSync } = require('child_process');

function rpcCall(method, params = []) {
  try {
    const cmd = `/home/explorer/verus-cli/verus ${method} ${params.map(p => `"${p}"`).join(' ')}`;
    const result = execSync(cmd, { encoding: 'utf8' });
    return JSON.parse(result);
  } catch (error) {
    console.error(`RPC Error for ${method}:`, error.message);
    return null;
  }
}

async function getVerusIDCreationDate(identityName) {
  console.log(
    `🔍 Getting creation date for ${identityName} using getidentityhistory...`
  );

  try {
    // Step 1: Get identity history (this gives us the FULL history)
    const history = rpcCall('getidentityhistory', [identityName]);
    if (!history || !history.history || history.history.length === 0) {
      console.log(`❌ No history found for ${identityName}`);
      return null;
    }

    // Step 2: The FIRST entry is the creation
    const creationEntry = history.history[0];
    const creationBlockHeight = creationEntry.height;
    const creationBlockHash = creationEntry.blockhash;

    console.log(`📋 Creation entry:`, {
      blockHeight: creationBlockHeight,
      blockHash: creationBlockHash,
      totalHistoryEntries: history.history.length,
    });

    // Step 3: Get the block timestamp
    const block = rpcCall('getblock', [creationBlockHeight]);
    if (!block) {
      console.log(`❌ Could not get block ${creationBlockHeight}`);
      return null;
    }

    const creationTimestamp = new Date(block.time * 1000);

    console.log(`✅ Found creation date:`, {
      identityName,
      creationBlockHeight,
      creationTimestamp: creationTimestamp.toISOString(),
      creationDate: creationTimestamp.toLocaleDateString(),
      creationTime: creationTimestamp.toLocaleTimeString(),
    });

    return {
      identityName,
      creationBlockHeight,
      creationBlockHash,
      creationTimestamp: creationTimestamp.toISOString(),
      totalHistoryEntries: history.history.length,
    };
  } catch (error) {
    console.error(
      `❌ Error getting creation date for ${identityName}:`,
      error.message
    );
    return null;
  }
}

// Test with caribu66@
async function main() {
  const identityName = 'caribu66.VRSC@';
  const result = await getVerusIDCreationDate(identityName);

  if (result) {
    console.log(
      `\n🎉 SUCCESS! Found the correct creation date for ${identityName}:`
    );
    console.log(`   Block: ${result.creationBlockHeight}`);
    console.log(`   Date: ${result.creationTimestamp}`);
    console.log(`   History entries: ${result.totalHistoryEntries}`);
  }
}

main().catch(console.error);
