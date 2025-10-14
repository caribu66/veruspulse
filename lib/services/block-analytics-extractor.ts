// Block Analytics Extractor Service
// Extracts comprehensive analytical data from Verus blockchain blocks

import { verusAPI } from '@/lib/rpc-client-robust';
import { Pool } from 'pg';

export interface BlockAnalytics {
  // Basic
  height: number;
  blockHash: string;
  timestamp: Date;
  size: number;
  blockType: 'minted' | 'mined' | 'unknown';
  version: number;

  // PoS/PoW Data
  difficulty?: number;
  stakeModifier?: string;
  chainwork?: string;
  bits?: string;
  nonce?: string;

  // Transaction Data
  txCount: number;
  coinbaseAmount?: number; // satoshis
  stakingReward?: number; // satoshis
  totalFees?: number; // satoshis

  // Network Metrics
  networkHashrate?: number;
  totalSupply?: number; // satoshis
  stakingParticipationRate?: number;

  // Timing
  blockInterval?: number; // seconds from previous block
  averageBlockTime?: number;
  solveTime?: number;

  // Staker Info (for PoS blocks)
  stakerAddress?: string;
  stakerIdentity?: string;
  stakeAmount?: number; // satoshis
  coinAgeDestroyed?: number;
  stakeWeight?: number;

  // Advanced
  merkleRoot?: string;
  chainTrust?: string;
  proofHash?: string;
}

export class BlockAnalyticsExtractor {
  private db: Pool;
  private previousBlockTime?: number;

  constructor(dbPool: Pool) {
    this.db = dbPool;
  }

  /**
   * Extract comprehensive analytics from a block
   */
  async extractBlockAnalytics(
    blockHashOrHeight: string | number
  ): Promise<BlockAnalytics | null> {
    try {
      // Get block data - convert number to string if needed
      const blockIdentifier = typeof blockHashOrHeight === 'number' 
        ? (await verusAPI.getBlockHash(blockHashOrHeight))
        : blockHashOrHeight;
      const block = await verusAPI.getBlock(blockIdentifier, 2); // verbosity 2 for full tx data
      if (!block) {
        console.warn(`Block not found: ${blockHashOrHeight}`);
        return null;
      }

      const analytics: BlockAnalytics = {
        height: block.height,
        blockHash: block.hash,
        timestamp: new Date(block.time * 1000),
        size: block.size || 0,
        blockType: this.determineBlockType(block),
        version: block.version || 1,
        txCount: block.tx ? block.tx.length : 0,
        difficulty: parseFloat(block.difficulty) || 0,
        bits: block.bits,
        nonce: block.nonce,
        merkleRoot: block.merkleroot,
        chainwork: block.chainwork,
      };

      // Extract staking info for PoS blocks
      if (analytics.blockType === 'minted' && block.tx && block.tx.length > 0) {
        const stakingInfo = await this.extractStakingInfo(block, block.tx[0]);
        Object.assign(analytics, stakingInfo);
      }

      // Calculate block interval
      if (this.previousBlockTime) {
        analytics.blockInterval = block.time - this.previousBlockTime;
      } else {
        // Try to get previous block
        if (block.height > 0) {
          try {
            const prevBlockHash = await verusAPI.getBlockHash(block.height - 1);
            const prevBlock = await verusAPI.getBlock(prevBlockHash);
            if (prevBlock && prevBlock.time) {
              analytics.blockInterval = block.time - prevBlock.time;
            }
          } catch (e) {
            // Ignore errors getting previous block
          }
        }
      }
      this.previousBlockTime = block.time;

      // Extract transaction fees
      analytics.totalFees = await this.calculateTotalFees(block.tx);

      // Get network metrics
      const networkMetrics = await this.calculateNetworkMetrics(block.height);
      Object.assign(analytics, networkMetrics);

      return analytics;
    } catch (error) {
      console.error(`Error extracting block analytics for ${blockHashOrHeight}:`, error);
      return null;
    }
  }

  /**
   * Determine if block is PoS (minted) or PoW (mined)
   */
  private determineBlockType(block: any): 'minted' | 'mined' | 'unknown' {
    if (block.blocktype) {
      return block.blocktype === 'minted' ? 'minted' : 'mined';
    }
    // Fallback: check if first tx is coinbase with coinstake characteristics
    if (block.tx && block.tx.length > 0) {
      const firstTx = block.tx[0];
      if (firstTx.vin && firstTx.vin.length > 0 && firstTx.vin[0].coinbase) {
        // PoS blocks typically have coinstake tx
        return 'minted';
      }
    }
    return 'unknown';
  }

  /**
   * Extract staking information from a PoS block
   */
  private async extractStakingInfo(
    block: any,
    coinstakeTx: any
  ): Promise<Partial<BlockAnalytics>> {
    const info: Partial<BlockAnalytics> = {};

    try {
      // Get the coinstake transaction
      if (!coinstakeTx || !coinstakeTx.vout || coinstakeTx.vout.length === 0) {
        return info;
      }

      // Find staker address (usually first output)
      const firstOutput = coinstakeTx.vout[0];
      if (firstOutput && firstOutput.scriptPubKey && firstOutput.scriptPubKey.addresses) {
        info.stakerAddress = firstOutput.scriptPubKey.addresses[0];

        // Try to resolve identity
        if (info.stakerAddress) {
          try {
            const identity = await verusAPI.getIdentity(info.stakerAddress);
            if (identity && identity.identity && identity.identity.name) {
              info.stakerIdentity = identity.identity.name;
            }
          } catch (e) {
            // Ignore identity resolution errors
          }
        }
      }

      // Calculate staking reward (sum of all outputs minus stake amount)
      const totalOutput = coinstakeTx.vout.reduce((sum: number, vout: any) => {
        return sum + (vout.value || 0) * 100000000; // Convert to satoshis
      }, 0);

      info.stakingReward = totalOutput;
      info.coinbaseAmount = totalOutput;

      // Try to estimate stake amount (this is approximate)
      // In Verus, stake amount is typically the UTXO that was used to stake
      if (coinstakeTx.vin && coinstakeTx.vin.length > 1) {
        // Second input is usually the staking UTXO
        try {
          const stakingInput = coinstakeTx.vin[1];
          if (stakingInput.txid && stakingInput.vout !== undefined) {
            const prevTx = await verusAPI.getRawTransaction(stakingInput.txid, true);
            if (prevTx && prevTx.vout && prevTx.vout[stakingInput.vout]) {
              info.stakeAmount = Math.round((prevTx.vout[stakingInput.vout].value || 0) * 100000000);
            }
          }
        } catch (e) {
          // Ignore errors getting stake amount
        }
      }

      // Extract stake modifier if available
      if (block.stakemodifier) {
        info.stakeModifier = block.stakemodifier;
      }

    } catch (error) {
      console.error('Error extracting staking info:', error);
    }

    return info;
  }

  /**
   * Calculate total transaction fees in a block
   */
  private async calculateTotalFees(transactions: any[]): Promise<number> {
    if (!transactions || transactions.length <= 1) {
      return 0; // No fees in coinbase-only blocks
    }

    let totalFees = 0;
    // Skip first tx (coinbase/coinstake)
    for (let i = 1; i < transactions.length; i++) {
      const tx = transactions[i];
      try {
        const fee = await this.calculateTransactionFee(tx);
        totalFees += fee;
      } catch (e) {
        // Ignore errors calculating individual tx fees
      }
    }

    return totalFees;
  }

  /**
   * Calculate fee for a single transaction
   */
  private async calculateTransactionFee(tx: any): Promise<number> {
    if (!tx.vin || !tx.vout) return 0;

    // Calculate total input value
    let totalInput = 0;
    for (const input of tx.vin) {
      if (input.coinbase) continue; // Skip coinbase inputs
      try {
        if (input.txid && input.vout !== undefined) {
          const prevTx = await verusAPI.getRawTransaction(input.txid, true);
          if (prevTx && prevTx.vout && prevTx.vout[input.vout]) {
            totalInput += (prevTx.vout[input.vout].value || 0) * 100000000;
          }
        }
      } catch (e) {
        // Ignore errors
      }
    }

    // Calculate total output value
    const totalOutput = tx.vout.reduce((sum: number, vout: any) => {
      return sum + (vout.value || 0) * 100000000;
    }, 0);

    const fee = totalInput - totalOutput;
    return fee > 0 ? fee : 0;
  }

  /**
   * Calculate network-wide metrics at a given height
   */
  private async calculateNetworkMetrics(
    height: number
  ): Promise<Partial<BlockAnalytics>> {
    const metrics: Partial<BlockAnalytics> = {};

    try {
      // Get blockchain info
      const info = await verusAPI.getBlockchainInfo();
      if (info) {
        // Calculate average block time from recent blocks
        if (info.blocks && info.mediantime) {
          metrics.averageBlockTime = 60; // Verus target is 60 seconds
        }
      }

      // Get mining info for network hashrate
      try {
        const miningInfo = await verusAPI.getMiningInfo();
        if (miningInfo && miningInfo.networkhashps) {
          metrics.networkHashrate = Math.round(miningInfo.networkhashps);
        }
      } catch (e) {
        // Mining info may not be available
      }

    } catch (error) {
      console.error('Error calculating network metrics:', error);
    }

    return metrics;
  }

  /**
   * Store block analytics in database
   */
  async storeBlockAnalytics(analytics: BlockAnalytics): Promise<void> {
    try {
      const query = `
        INSERT INTO block_analytics (
          height, block_hash, block_time, block_type, size, version,
          difficulty, stake_modifier, chainwork, bits, nonce,
          tx_count, coinbase_amount_satoshis, staking_reward_satoshis, total_fees_satoshis,
          network_hashrate, block_interval, average_block_time,
          staker_address, staker_identity, stake_amount_satoshis,
          merkle_root, chain_trust, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, NOW()
        )
        ON CONFLICT (height) DO UPDATE SET
          block_hash = EXCLUDED.block_hash,
          block_time = EXCLUDED.block_time,
          block_type = EXCLUDED.block_type,
          size = EXCLUDED.size,
          tx_count = EXCLUDED.tx_count,
          staking_reward_satoshis = EXCLUDED.staking_reward_satoshis,
          staker_address = EXCLUDED.staker_address,
          staker_identity = EXCLUDED.staker_identity
      `;

      const values = [
        analytics.height,
        analytics.blockHash,
        analytics.timestamp,
        analytics.blockType,
        analytics.size,
        analytics.version,
        analytics.difficulty,
        analytics.stakeModifier,
        analytics.chainwork,
        analytics.bits,
        analytics.nonce,
        analytics.txCount,
        analytics.coinbaseAmount,
        analytics.stakingReward,
        analytics.totalFees,
        analytics.networkHashrate,
        analytics.blockInterval,
        analytics.averageBlockTime,
        analytics.stakerAddress,
        analytics.stakerIdentity,
        analytics.stakeAmount,
        analytics.merkleRoot,
        analytics.chainTrust,
      ];

      await this.db.query(query, values);
    } catch (error) {
      console.error(`Error storing block analytics for height ${analytics.height}:`, error);
      throw error;
    }
  }

  /**
   * Extract and store analytics for a range of blocks
   */
  async extractBlockRange(startHeight: number, endHeight: number): Promise<number> {
    let processed = 0;
    console.log(`Extracting block analytics from ${startHeight} to ${endHeight}...`);

    for (let height = startHeight; height <= endHeight; height++) {
      try {
        const analytics = await this.extractBlockAnalytics(height);
        if (analytics) {
          await this.storeBlockAnalytics(analytics);
          processed++;

          if (processed % 100 === 0) {
            console.log(`Processed ${processed} blocks (current: ${height})...`);
          }
        }
      } catch (error) {
        console.error(`Error processing block ${height}:`, error);
        // Continue with next block
      }

      // Small delay to avoid overwhelming the RPC
      if (height % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Completed: Extracted ${processed} blocks`);
    return processed;
  }
}

