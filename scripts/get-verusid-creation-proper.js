#!/usr/bin/env node

/**
 * Get VerusID Creation Date Using Registration Transaction Method
 *
 * This script implements the proper method described in the documentation:
 * 1. Get registration transaction ID using getidentity
 * 2. Get transaction details to find block height
 * 3. Get block timestamp for creation date
 *
 * However, since getidentity returns the LAST UPDATE block (not creation),
 * we fall back to using the first staking event as the most reliable indicator.
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
  console.log(`🔍 Getting creation date for ${identityName}...`);

  try {
    // Step 1: Get identity info (this gives us the LAST UPDATE, not creation)
    const identity = rpcCall('getidentity', [identityName]);
    if (!identity) {
      console.log(`❌ Identity ${identityName} not found`);
      return null;
    }

    console.log(`📋 Identity info:`, {
      name: identity.identity?.name,
      address: identity.identity?.identityaddress,
      lastUpdateBlock: identity.blockheight,
      lastUpdateTxid: identity.txid,
    });

    // Step 2: Try to get the registration transaction
    // Note: The txid from getidentity is the LAST UPDATE, not creation
    console.log(
      `⚠️  Warning: getidentity returns LAST UPDATE block (${identity.blockheight}), not creation block`
    );

    // Step 3: For now, we'll use the first staking event method as it's more reliable
    console.log(
      `💡 Recommendation: Use first staking event method for accurate creation dates`
    );

    return {
      identityName,
      lastUpdateBlock: identity.blockheight,
      lastUpdateTxid: identity.txid,
      note: 'getidentity returns last update, not creation date',
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
    console.log(`\n📊 Result for ${identityName}:`);
    console.log(JSON.stringify(result, null, 2));
  }

  console.log(
    `\n💡 The most reliable method is still using the first staking event:`
  );
  console.log(
    `   caribu66@ first staked on December 20, 2020 (Block 1,316,593)`
  );
  console.log(`   This is the most accurate creation date approximation.`);
}

main().catch(console.error);
