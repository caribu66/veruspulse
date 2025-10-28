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

// Types
export interface CoinstakeTransaction {
  vin: TransactionInput[];
  vout: TransactionOutput[];
  txid: string;
}

export interface TransactionInput {
  txid: string;
  vout: number;
  coinbase?: string;
}

export interface TransactionOutput {
  value: number;
  scriptPubKey?: {
    addresses?: string[];
  };
}

export interface PreviousTransaction {
  vout: TransactionOutput[];
  txid: string;
}

export interface InputDetail {
  txid: string;
  vout: number;
  value_sats?: number;
  value_vrsc?: number;
  addresses?: string[];
  matched?: boolean;
  skipped?: boolean;
  type?: string;
  reason?: string;
  error?: string;
}

export interface ExtractionResult {
  stakeAmount: number | null;
  success: boolean;
  successfulInputs?: number;
  failedInputs?: number;
  stakeAmountVRSC?: number | null;
  inputDetails?: InputDetail[];
  totalOutputSats?: number;
  rewardSats?: number | null;
  reason?: string;
  error?: string;
}

export interface ExtractionOptions {
  includeDetails?: boolean;
  rateLimit?: number;
}

export interface BatchExtractionOptions extends ExtractionOptions {
  batchSize?: number;
  progressCallback?: (progress: {
    processed: number;
    total: number;
    successCount: number;
  }) => void;
}

export interface APYConfidence {
  level: 'very-high' | 'high' | 'medium' | 'low' | 'very-low';
  method: 'actual' | 'hybrid' | 'estimated';
  label: string;
}

export type RPCCallFunction = (method: string, params: any[]) => Promise<any>;

const RATE_LIMIT_MS = 50; // Delay between RPC calls to avoid overload
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Helper functions
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  rpcCall: RPCCallFunction,
  txid: string,
  retries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY_MS
): Promise<PreviousTransaction | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await rpcCall('getrawtransaction', [txid, true]);
      if (result) return result;
    } catch (error) {
      if (i < retries - 1) {
        await sleep(delay * (i + 1)); // Exponential backoff
      } else {
        throw error;
      }
    }
  }
  return null;
}

/**
 * Extract the actual staked amount from a coinstake transaction
 *
 * @param coinstakeTx - The coinstake transaction object
 * @param identityAddress - The identity address that staked (I-address)
 * @param rpcCall - RPC call function (method, params) => Promise
 * @param options - Optional configuration
 * @returns Result object with stake amount and details
 */
export async function extractStakeAmount(
  coinstakeTx: CoinstakeTransaction,
  identityAddress: string,
  rpcCall: RPCCallFunction,
  options: ExtractionOptions = {}
): Promise<ExtractionResult> {
  const { includeDetails = false, rateLimit = RATE_LIMIT_MS } = options;

  try {
    if (!coinstakeTx || !coinstakeTx.vin || coinstakeTx.vin.length === 0) {
      return { stakeAmount: null, success: false, reason: 'No inputs found' };
    }

    let totalStakedAmount = 0;
    const inputDetails: InputDetail[] = [];
    let successfulInputs = 0;
    let failedInputs = 0;

    // Iterate through all inputs in the coinstake transaction
    for (let i = 0; i < coinstakeTx.vin.length; i++) {
      const vin = coinstakeTx.vin[i];

      // Skip coinbase inputs (shouldn't exist in coinstake, but check anyway)
      if (vin.coinbase) {
        if (includeDetails) {
          inputDetails.push({
            txid: 'coinbase',
            vout: -1,
            value_vrsc: 0,
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
            txid: 'unknown',
            vout: -1,
            value_vrsc: 0,
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
              txid: vin.txid,
              vout: vin.vout,
              value_vrsc: 0,
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
              txid: vin.txid,
              vout: vin.vout,
              value_sats: inputValueSats,
              value_vrsc: prevOutput.value,
              matched: true,
            });
          }
        } else {
          // Input belongs to a different address
          if (includeDetails) {
            inputDetails.push({
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

        await sleep(rateLimit);
      } catch (error: any) {
        failedInputs++;
        if (includeDetails) {
          inputDetails.push({
            txid: vin.txid,
            vout: vin.vout,
            value_vrsc: 0,
            type: 'error',
            skipped: true,
            error: error.message,
          });
        }
        // Log error but continue processing other inputs
        console.warn(
          `Error fetching previous transaction ${vin.txid}:${vin.vout} for ${identityAddress}: ${error.message}`
        );
      }
    }

    const result: ExtractionResult = {
      stakeAmount: totalStakedAmount > 0 ? totalStakedAmount : null,
      success: true,
      successfulInputs,
      failedInputs,
      stakeAmountVRSC:
        totalStakedAmount > 0 ? totalStakedAmount / 100000000 : null,
    };

    if (includeDetails) {
      result.inputDetails = inputDetails;
      result.totalOutputSats = Math.round(
        coinstakeTx.vout.reduce(
          (sum, vout) => sum + (vout.value || 0) * 100000000,
          0
        )
      );
      result.rewardSats =
        totalStakedAmount > 0
          ? Math.round(result.totalOutputSats! - totalStakedAmount)
          : null;
    }

    return result;
  } catch (error: any) {
    return {
      stakeAmount: null,
      success: false,
      error: error.message,
      reason: 'Extraction failed',
    };
  }
}

/**
 * Batch extract stake amounts for multiple coinstake transactions
 * Processes in batches to manage RPC load
 *
 * @param coinstakes - Array of { tx, identityAddress } objects
 * @param rpcCall - RPC call function
 * @param options - Configuration options
 * @returns Array of results
 */
export async function batchExtractStakeAmounts(
  coinstakes: Array<{ tx: CoinstakeTransaction; identityAddress: string }>,
  rpcCall: RPCCallFunction,
  options: BatchExtractionOptions = {}
): Promise<ExtractionResult[]> {
  const { batchSize = 10, progressCallback = null } = options;

  const results: ExtractionResult[] = [];

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
 * @param totalRewardsSats - Total rewards earned (satoshis)
 * @param avgStakeAmountSats - Average staked amount (satoshis)
 * @param days - Number of days staking
 * @returns APY percentage
 */
export function calculateAPYFromStakeAmount(
  totalRewardsSats: number,
  avgStakeAmountSats: number,
  days: number
): number | null {
  if (!avgStakeAmountSats || avgStakeAmountSats <= 0 || days <= 0) {
    return null;
  }

  const totalRewardsVRSC = totalRewardsSats / 100000000;
  const avgStakeAmountVRSC = avgStakeAmountSats / 100000000;
  const years = days / 365.25;

  const apy = (totalRewardsVRSC / avgStakeAmountVRSC / years) * 100;

  return apy;
}

/**
 * Determine APY calculation method and confidence level
 */
export function getAPYConfidence(
  totalStakes: number,
  stakesWithAmounts: number
): APYConfidence {
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
    return {
      level: 'very-low',
      method: 'estimated',
      label: '⚠️ Estimated',
    };
  }
}
