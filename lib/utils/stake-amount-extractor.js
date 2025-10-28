/**
 * Stake Amount Extractor
 *
 * This utility extracts the actual staked amount from Verus coinstake transactions
 * by analyzing the transaction inputs (vins) and tracing them back to their origin.
 *
 * How it works:
 * 1. A coinstake transaction's inputs represent the UTXOs that were staked
 * 2. We fetch the previous transactions to get the value of each input
 * 3. We sum up the input values that belong to the target address
 * 4. This gives us the actual staked amount used to earn the reward
 *
 * Example:
 * - Staker has 10,000 VRSC in a UTXO
 * - That UTXO is used as input in a coinstake transaction
 * - The output = 10,000 VRSC (original) + 5 VRSC (reward)
 * - We extract: stakeAmount = 10,000 VRSC, reward = 5 VRSC
 */

const RATE_LIMIT_MS = 50; // Delay between RPC calls to avoid overload
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Extract the actual staked amount from a coinstake transaction
 *
 * @param {Object} coinstakeTx - The coinstake transaction object
 * @param {string} identityAddress - The identity address that staked (I-address)
 * @param {Function} rpcCall - RPC call function (method, params) => Promise
 * @param {Object} options - Optional configuration
 * @param {boolean} options.includeDetails - Include detailed breakdown
 * @param {number} options.rateLimit - Milliseconds to wait between RPC calls
 * @returns {Promise<Object>} Result object with stake amount and details
 */
async function extractStakeAmount(
  coinstakeTx,
  identityAddress,
  rpcCall,
  options = {}
) {
  const { includeDetails = false, rateLimit = RATE_LIMIT_MS } = options;

  try {
    if (!coinstakeTx || !coinstakeTx.vin || coinstakeTx.vin.length === 0) {
      return { stakeAmount: null, success: false, reason: 'No inputs found' };
    }

    let totalStakedAmount = 0;
    const inputDetails = [];
    let successfulInputs = 0;
    let failedInputs = 0;

    // Iterate through all inputs in the coinstake transaction
    for (let i = 0; i < coinstakeTx.vin.length; i++) {
      const vin = coinstakeTx.vin[i];

      // Skip coinbase inputs (shouldn't exist in coinstake, but check anyway)
      if (vin.coinbase) {
        if (includeDetails) {
          inputDetails.push({
            index: i,
            type: 'coinbase',
            skipped: true,
          });
        }
        continue;
      }

      // Validate input has required fields
      if (!vin.txid || vin.vout === undefined) {
        failedInputs++;
        if (includeDetails) {
          inputDetails.push({
            index: i,
            type: 'invalid',
            skipped: true,
            reason: 'Missing txid or vout',
          });
        }
        continue;
      }

      try {
        // Fetch the previous transaction with retries
        const prevTx = await fetchWithRetry(rpcCall, vin.txid);

        if (!prevTx || !prevTx.vout || !prevTx.vout[vin.vout]) {
          failedInputs++;
          if (includeDetails) {
            inputDetails.push({
              index: i,
              txid: vin.txid,
              vout: vin.vout,
              type: 'not_found',
              skipped: true,
              reason: 'Previous output not found',
            });
          }
          continue;
        }

        const prevOutput = prevTx.vout[vin.vout];

        // Check if this UTXO belonged to our identity address
        const outputAddresses = prevOutput.scriptPubKey?.addresses || [];

        if (outputAddresses.includes(identityAddress)) {
          // This input belongs to our staker!
          const inputValueSats = Math.round(prevOutput.value * 100000000);
          totalStakedAmount += inputValueSats;
          successfulInputs++;

          if (includeDetails) {
            inputDetails.push({
              index: i,
              txid: vin.txid,
              vout: vin.vout,
              value_sats: inputValueSats,
              value_vrsc: prevOutput.value,
              matched: true,
            });
          }
        } else {
          // Input belongs to a different address (mixed coinstake)
          if (includeDetails) {
            inputDetails.push({
              index: i,
              txid: vin.txid,
              vout: vin.vout,
              value_sats: Math.round(prevOutput.value * 100000000),
              value_vrsc: prevOutput.value,
              addresses: outputAddresses,
              matched: false,
              reason: 'Different address',
            });
          }
        }

        // Rate limiting to avoid overwhelming the daemon
        if (rateLimit > 0 && i < coinstakeTx.vin.length - 1) {
          await sleep(rateLimit);
        }
      } catch (error) {
        failedInputs++;
        if (includeDetails) {
          inputDetails.push({
            index: i,
            txid: vin.txid,
            vout: vin.vout,
            type: 'error',
            skipped: true,
            error: error.message,
          });
        }
        // Continue processing other inputs
      }
    }

    // Calculate total outputs for validation (optional)
    let totalOutput = 0;
    if (coinstakeTx.vout) {
      totalOutput = coinstakeTx.vout.reduce((sum, vout) => {
        return sum + (vout.value || 0) * 100000000;
      }, 0);
    }

    // Return result
    const result = {
      stakeAmount: totalStakedAmount > 0 ? totalStakedAmount : null,
      success: successfulInputs > 0,
      totalInputs: coinstakeTx.vin.length,
      successfulInputs,
      failedInputs,
      stakeAmountVRSC:
        totalStakedAmount > 0 ? totalStakedAmount / 100000000 : null,
    };

    if (includeDetails) {
      result.inputDetails = inputDetails;
      result.totalOutputSats = Math.round(totalOutput);
      result.rewardSats =
        totalStakedAmount > 0
          ? Math.round(totalOutput - totalStakedAmount)
          : null;
    }

    return result;
  } catch (error) {
    return {
      stakeAmount: null,
      success: false,
      error: error.message,
      reason: 'Extraction failed',
    };
  }
}

/**
 * Fetch a transaction with automatic retries
 */
async function fetchWithRetry(rpcCall, txid, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await rpcCall('getrawtransaction', [txid, true]);
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      // Wait before retrying
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Batch extract stake amounts for multiple coinstake transactions
 * Processes in batches to manage RPC load
 *
 * @param {Array} coinstakes - Array of { tx, identityAddress } objects
 * @param {Function} rpcCall - RPC call function
 * @param {Object} options - Configuration options
 * @returns {Promise<Array>} Array of results
 */
async function batchExtractStakeAmounts(coinstakes, rpcCall, options = {}) {
  const { batchSize = 10, progressCallback = null } = options;

  const results = [];

  for (let i = 0; i < coinstakes.length; i += batchSize) {
    const batch = coinstakes.slice(
      i,
      Math.min(i + batchSize, coinstakes.length)
    );

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(({ tx, identityAddress }) =>
        extractStakeAmount(tx, identityAddress, rpcCall, options)
      )
    );

    results.push(...batchResults);

    if (progressCallback) {
      progressCallback({
        processed: Math.min(i + batchSize, coinstakes.length),
        total: coinstakes.length,
        successCount: results.filter(r => r.success).length,
      });
    }
  }

  return results;
}

/**
 * Calculate APY using actual stake amounts
 *
 * @param {number} totalRewardsSats - Total rewards earned (satoshis)
 * @param {number} avgStakeAmountSats - Average staked amount (satoshis)
 * @param {number} days - Number of days staking
 * @returns {number} APY percentage
 */
function calculateAPYFromStakeAmount(
  totalRewardsSats,
  avgStakeAmountSats,
  days
) {
  if (!avgStakeAmountSats || avgStakeAmountSats <= 0 || days <= 0) {
    return null;
  }

  const totalRewardsVRSC = totalRewardsSats / 100000000;
  const avgStakeAmountVRSC = avgStakeAmountSats / 100000000;
  const years = days / 365.25;

  // APY = (Total Rewards / Average Staked Amount / Years) * 100
  const apy = (totalRewardsVRSC / avgStakeAmountVRSC / years) * 100;

  return apy;
}

/**
 * Determine APY calculation method and confidence level
 */
function getAPYConfidence(totalStakes, stakesWithAmounts) {
  const completeness =
    totalStakes > 0 ? (stakesWithAmounts / totalStakes) * 100 : 0;

  if (stakesWithAmounts >= 100 && completeness >= 80) {
    return {
      level: 'very-high',
      method: 'actual',
      label: '🎯 High Confidence',
    };
  } else if (stakesWithAmounts >= 50 && completeness >= 50) {
    return { level: 'high', method: 'actual', label: '✅ Good Confidence' };
  } else if (stakesWithAmounts >= 30) {
    return { level: 'medium', method: 'hybrid', label: '📊 Medium Confidence' };
  } else if (stakesWithAmounts >= 10) {
    return { level: 'low', method: 'hybrid', label: '📈 Low Confidence' };
  } else {
    return { level: 'very-low', method: 'estimated', label: '⚠️ Estimated' };
  }
}

module.exports = {
  extractStakeAmount,
  batchExtractStakeAmounts,
  calculateAPYFromStakeAmount,
  getAPYConfidence,
};
