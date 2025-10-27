#!/usr/bin/env node
/**
 * CORRECT Verus PoS Stake Detection Logic
 * Based on community feedback about Verus PoS implementation
 */

// ============================================================================
// CORRECT METHOD FOR VERUS POS STAKE DETECTION
// ============================================================================

/**
 * Find stakes for target addresses in a block
 *
 * KEY POINTS (from Verus community):
 * 1. Coinstake tx is the LAST transaction (block.tx[-1]), NOT first!
 * 2. Reward = sum(all vouts) - sum(all vins)
 * 3. Do NOT use a specific vout index
 * 4. May have multiple vouts to the same address
 *
 * @param {Object} block - Full block data with transactions
 * @param {Set} targetAddresses - Set of I-addresses to track
 * @returns {Array} Array of stake objects
 */
function findStakesInBlock(block, targetAddresses) {
  const stakes = [];

  if (!block || !block.tx || block.tx.length === 0) return stakes;

  // Check if this is a PoS block
  const isPoS =
    block.validationtype === 'stake' || block.blocktype === 'minted';
  if (!isPoS) return stakes;

  // CORRECT: Get coinstake transaction (LAST transaction in block)
  const coinstake = block.tx[block.tx.length - 1];
  if (!coinstake || !coinstake.vout || !coinstake.vin) return stakes;

  // Track which addresses staked in this block
  const stakersInBlock = new Map(); // address -> {totalOutput, totalInput}

  // Step 1: Calculate total output for each address
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

  // Step 2: Calculate total input for each address
  // Note: We need to look at what addresses the vins came from
  // This requires fetching the previous transactions, which is expensive
  // For now, we'll use the simplified method: sum(vouts) - sum(vins)

  // Calculate total input value (this is the staked amount being spent)
  let totalInputValue = 0;
  for (const vin of coinstake.vin) {
    // In a PoS coinstake, vins are the staked UTXOs
    // We'd need to fetch the previous tx to get the value
    // For now, we'll use the block-level calculation
    if (vin.value !== undefined) {
      totalInputValue += vin.value;
    }
  }

  // Step 3: For each staker, calculate the actual reward
  for (const [addr, staker] of stakersInBlock.entries()) {
    // The reward is: total output to this address - their staked input
    // If we don't have individual input values, we calculate at block level

    // SIMPLIFIED: Use block-level calculation
    // Total minted = sum(all vouts in coinstake) - sum(all vins in coinstake)
    const totalCoinstakeOutput = coinstake.vout.reduce(
      (sum, v) => sum + (v.value || 0),
      0
    );

    // For accurate per-address calculation, we'd need to track which vins belong to which address
    // Since that requires fetching previous txs, use this approximation for now:
    // If there's only one staker in the block, the reward goes to them
    if (stakersInBlock.size === 1) {
      // Reward = total_output - total_input
      // Since we have total output for this address, and assuming all inputs are theirs:
      const reward = staker.totalOutput - totalInputValue;

      stakes.push({
        address: addr,
        amount: Math.round(reward * 100000000), // Convert to satoshis
        blockHeight: block.height,
        blockTime: new Date(block.time * 1000).toISOString(),
        txid: coinstake.txid,
        vout: staker.vouts[0].index, // Reference first vout (for uniqueness)
        blockHash: block.hash,
      });
    } else {
      // Multiple stakers in one block (rare but possible with merged mining?)
      // For now, skip or use totalOutput as approximation
      console.warn(
        `Block ${block.height} has multiple stakers - needs investigation`
      );
    }
  }

  return stakes;
}

// ============================================================================
// ALTERNATIVE: FULL BLOCK REWARD CALCULATION
// ============================================================================

/**
 * Calculate the full block reward (more accurate but simpler)
 * This gives us the total minted amount, but doesn't attribute it to specific addresses
 */
function calculateBlockReward(block) {
  if (!block || !block.tx || block.tx.length === 0) return null;

  const isPoS =
    block.validationtype === 'stake' || block.blocktype === 'minted';
  if (!isPoS) return null;

  const coinstake = block.tx[block.tx.length - 1];

  // Sum all outputs
  const totalOutput = coinstake.vout.reduce(
    (sum, vout) => sum + (vout.value || 0),
    0
  );

  // Sum all inputs (would need to fetch previous txs for exact values)
  // For PoS, the coinbase vin has no value, so we need the actual staked UTXOs
  // This is a limitation without fetching previous transactions

  // Simplified: return total output (includes staked amount + reward)
  return totalOutput;
}

// ============================================================================
// VERUS BLOCK REWARD SCHEDULE
// ============================================================================

/**
 * Get expected block reward based on block height
 * From Verus community:
 * - Before 1,278,000: 24 VRSC
 * - 1,278,000 - 2,329,920: 12 VRSC (first halving)
 * - 2,329,920 - 3,381,840: 6 VRSC (second halving)
 * - After 3,381,840: 3 VRSC (third halving, then continues halvings ~1,051,920 interval)
 */
function getExpectedBlockReward(blockHeight) {
  if (blockHeight < 1278000) {
    return 24.0; // Initial reward
  } else if (blockHeight < 2329920) {
    return 12.0; // First halving
  } else if (blockHeight < 3381840) {
    return 6.0; // Second halving
  } else {
    return 3.0; // Third halving (and likely continues)
  }
}

// ============================================================================
// VALIDATION HELPER
// ============================================================================

/**
 * Validate if a recorded reward makes sense
 */
function isRewardAmountReasonable(amount, blockHeight) {
  const expected = getExpectedBlockReward(blockHeight);
  const amountVRSC = amount / 100000000;

  // Allow some variation for fees (± 2 VRSC)
  const minExpected = expected - 2;
  const maxExpected = expected + 2;

  return amountVRSC >= minExpected && amountVRSC <= maxExpected;
}

module.exports = {
  findStakesInBlock,
  calculateBlockReward,
  getExpectedBlockReward,
  isRewardAmountReasonable,
};

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/*
const block = await rpcCall('getblock', [blockHash, 2]);
const targetAddresses = new Set(['iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5']);

const stakes = findStakesInBlock(block, targetAddresses);

for (const stake of stakes) {
  console.log(`Block ${stake.blockHeight}: ${stake.address} earned ${stake.amount / 100000000} VRSC`);
  
  // Validate
  if (!isRewardAmountReasonable(stake.amount, stake.blockHeight)) {
    console.warn(`⚠️ Reward amount seems unusual for block ${stake.blockHeight}`);
  }
}
*/
