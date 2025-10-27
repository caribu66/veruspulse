#!/usr/bin/env node
/**
 * FINAL CORRECT Verus PoS Stake Detection Implementation
 *
 * Based on:
 * 1. Community feedback about coinstake structure
 * 2. Analysis of Oink70's stake-tracker.sh (wallet-based approach)
 * 3. Understanding of Verus PoS implementation
 *
 * Key Points:
 * - Coinstake transaction is the LAST transaction in PoS block
 * - Reward = sum(all vouts) - sum(all vins)
 * - Must fetch previous transactions to get input values
 * - Staking rewards have "generated" flag (but we can't query this from blocks)
 */

/**
 * Find stakes for target addresses in a PoS block
 * @param {Object} block - Full block object with transactions
 * @param {Set<string>} targetAddresses - Set of I-addresses to track
 * @param {Function} rpcCall - RPC function to fetch previous transactions
 * @returns {Promise<Array>} Array of stake objects
 */
async function findStakesInBlock(block, targetAddresses, rpcCall) {
  const stakes = [];

  // Validate inputs
  if (!block || !block.tx || block.tx.length === 0) {
    return stakes;
  }

  // Check if this is a PoS block
  const isPoS =
    block.validationtype === 'stake' || block.blocktype === 'minted';
  if (!isPoS) {
    return stakes;
  }

  // ✅ CORRECT: Get the LAST transaction (coinstake)
  const coinstake = block.tx[block.tx.length - 1];
  if (!coinstake || !coinstake.vout || !coinstake.vin) {
    return stakes;
  }

  // Track addresses that staked in this block
  const stakersInBlock = new Map();

  // Step 1: Calculate total OUTPUT for each target address
  for (let voutIdx = 0; voutIdx < coinstake.vout.length; voutIdx++) {
    const vout = coinstake.vout[voutIdx];
    if (!vout.scriptPubKey || !vout.scriptPubKey.addresses) continue;

    for (const addr of vout.scriptPubKey.addresses) {
      if (targetAddresses.has(addr)) {
        if (!stakersInBlock.has(addr)) {
          stakersInBlock.set(addr, {
            totalOutput: 0,
            totalInput: 0,
            vouts: [],
          });
        }
        const staker = stakersInBlock.get(addr);
        staker.totalOutput += vout.value;
        staker.vouts.push({ index: voutIdx, value: vout.value });
      }
    }
  }

  // If no target addresses found in outputs, return empty
  if (stakersInBlock.size === 0) {
    return stakes;
  }

  // Step 2: Calculate total INPUT for each target address
  // This requires fetching previous transactions
  for (const [addr, staker] of stakersInBlock.entries()) {
    let totalInputFromAddress = 0;

    for (const vin of coinstake.vin) {
      // Skip coinbase (PoS doesn't have traditional coinbase)
      if (vin.coinbase) continue;

      try {
        // Fetch the previous transaction to get the input value
        const prevTx = await rpcCall('getrawtransaction', [vin.txid, true]);

        if (prevTx && prevTx.vout && prevTx.vout[vin.vout]) {
          const prevVout = prevTx.vout[vin.vout];

          // Check if this input belonged to our target address
          if (prevVout.scriptPubKey?.addresses?.includes(addr)) {
            totalInputFromAddress += prevVout.value;
          }
        }
      } catch (error) {
        // If we can't fetch the previous tx, log warning but continue
        console.warn(
          `Warning: Could not fetch previous tx ${vin.txid}: ${error.message}`
        );
      }
    }

    staker.totalInput = totalInputFromAddress;
  }

  // Step 3: Calculate the actual reward for each staker
  for (const [addr, staker] of stakersInBlock.entries()) {
    // Reward = total output to address - total input from address
    const reward = staker.totalOutput - staker.totalInput;

    // Sanity check: reward should be positive and reasonable
    if (reward <= 0) {
      console.warn(
        `Warning: Block ${block.height} - Calculated reward ${reward} for ${addr} is not positive`
      );
      continue;
    }

    // Reward should be between 0 and ~30 VRSC (24 VRSC base + fees)
    const rewardVRSC = reward;
    if (rewardVRSC > 50) {
      console.warn(
        `Warning: Block ${block.height} - Reward ${rewardVRSC} VRSC seems too high for ${addr}`
      );
    }

    stakes.push({
      address: addr,
      amount: Math.round(reward * 100000000), // Convert to satoshis
      blockHeight: block.height,
      blockTime: new Date(block.time * 1000).toISOString(),
      txid: coinstake.txid,
      vout: staker.vouts[0].index, // Use first vout for uniqueness constraint
      blockHash: block.hash,
      // Debug info (can be removed in production)
      debug: {
        totalOutput: staker.totalOutput,
        totalInput: staker.totalInput,
        numVouts: staker.vouts.length,
      },
    });
  }

  return stakes;
}

/**
 * Get expected block reward based on halving schedule
 * Source: Verus community feedback
 */
function getExpectedBlockReward(blockHeight) {
  if (blockHeight < 1278000) {
    return 24.0; // Initial reward
  } else if (blockHeight < 2329920) {
    return 12.0; // First halving
  } else if (blockHeight < 3381840) {
    return 6.0; // Second halving
  } else {
    // Third halving and beyond (continues ~every 1,051,920 blocks)
    return 3.0;
  }
}

/**
 * Validate if a reward amount is reasonable
 */
function validateRewardAmount(amount, blockHeight) {
  const amountVRSC = amount / 100000000;
  const expected = getExpectedBlockReward(blockHeight);

  // Allow ±2 VRSC variation for fees and timing adjustments
  const minReasonable = expected - 2;
  const maxReasonable = expected + 2;

  if (amountVRSC < minReasonable) {
    console.warn(
      `⚠️ Block ${blockHeight}: Reward ${amountVRSC.toFixed(8)} VRSC is below expected ${expected} VRSC`
    );
    return false;
  }

  if (amountVRSC > maxReasonable) {
    console.warn(
      `⚠️ Block ${blockHeight}: Reward ${amountVRSC.toFixed(8)} VRSC is above expected ${expected} VRSC`
    );
    return false;
  }

  return true;
}

/**
 * Example usage:
 *
 * const block = await rpcCall('getblock', [blockHash, 2]);
 * const targetAddresses = new Set(['iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5']);
 *
 * const stakes = await findStakesInBlock(block, targetAddresses, rpcCall);
 *
 * for (const stake of stakes) {
 *   console.log(`Block ${stake.blockHeight}: ${stake.address} earned ${stake.amount / 100000000} VRSC`);
 *
 *   if (!validateRewardAmount(stake.amount, stake.blockHeight)) {
 *     console.warn('Reward amount validation failed!');
 *   }
 * }
 */

module.exports = {
  findStakesInBlock,
  getExpectedBlockReward,
  validateRewardAmount,
};
