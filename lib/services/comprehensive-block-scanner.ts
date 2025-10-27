/**
 * Comprehensive Block Scanner
 * Extracts all relevant analytical data from Verus blocks for deep staking analytics
 */

import { verusAPI } from '@/lib/rpc-client-robust';
import { Pool } from 'pg';

interface BlockData {
  height: number;
  hash: string;
  time: number;
  blocktype?: string;
  difficulty?: number;
  chainstake?: string;
  anchor?: string;
  solution?: string;
  size?: number;
  tx?: any[];
  stakeRewardInfo?: {
    isStakeReward: boolean;
    blockType: string;
    rewardAmount: number;
  };
  stakeAmount?: number;
  stakeAge?: number;
  merkleroot?: string;
  nonce?: string;
  bits?: string;
  version?: number;
  valuePools?: Array<{
    id: string;
    chainValue: number;
    valueDelta: number;
  }>;
}

interface StakeEvent {
  address: string;
  txid: string;
  blockHeight: number;
  blockTime: Date;
  rewardAmount: number; // satoshis
  stakeAmount: number; // satoshis
  stakeAge: number;
}

interface BlockAnalytics {
  height: number;
  blockHash: string;
  blockTime: Date;
  blockType: string;
  difficulty: number;
  stakeModifier?: string;
  chainwork?: string;
  chainstake?: string;
  chainStakeNumeric?: number;
  anchor?: string;
  solution?: string;
  rewardType?: string;
  size: number;
  txCount: number;
  stakeAmount: number;
  rewardAmount: number;
  totalFees: number;
  blockInterval?: number;
  stakerAddress?: string;
  merkleRoot?: string;
  nonce?: string;
  bits?: string;
  version?: number;
}

export class ComprehensiveBlockScanner {
  private db: Pool;
  private rpcClient: any;
  private isScanning: boolean = false;
  private scanProgress: {
    currentHeight: number;
    targetHeight: number;
    blocksProcessed: number;
    stakeEventsFound: number;
    startTime: number;
    estimatedCompletion?: number;
  };

  constructor(dbPool: Pool) {
    this.db = dbPool;
    this.rpcClient = verusAPI;
    this.scanProgress = {
      currentHeight: 0,
      targetHeight: 0,
      blocksProcessed: 0,
      stakeEventsFound: 0,
      startTime: Date.now(),
    };
  }

  /**
   * Start comprehensive block scanning
   */
  async startScan(options: {
    startHeight: number;
    endHeight?: number;
    batchSize?: number;
    addresses?: string[];
  }): Promise<void> {
    if (this.isScanning) {
      throw new Error('Scan already in progress');
    }

    this.isScanning = true;
    const { startHeight, endHeight, batchSize = 100, addresses } = options;

    try {
      // Get current blockchain height if endHeight not specified
      const blockchainInfo = await this.rpcClient.getBlockchainInfo();
      const currentHeight = endHeight || blockchainInfo.blocks;

      this.scanProgress = {
        currentHeight: startHeight,
        targetHeight: currentHeight,
        blocksProcessed: 0,
        stakeEventsFound: 0,
        startTime: Date.now(),
      };

      console.log(
        `[Block Scanner] Starting scan from ${startHeight} to ${currentHeight}`
      );

      // Process blocks in batches
      for (
        let height = startHeight;
        height <= currentHeight;
        height += batchSize
      ) {
        if (!this.isScanning) break;

        const endBatch = Math.min(height + batchSize - 1, currentHeight);
        await this.processBatch(height, endBatch, addresses);

        // Update progress
        this.scanProgress.currentHeight = endBatch;
        this.scanProgress.blocksProcessed = endBatch - startHeight + 1;

        const elapsed = Date.now() - this.scanProgress.startTime;
        const blocksRemaining = currentHeight - endBatch;
        const avgTimePerBlock = elapsed / this.scanProgress.blocksProcessed;
        this.scanProgress.estimatedCompletion =
          Date.now() + blocksRemaining * avgTimePerBlock;

        if (this.scanProgress.blocksProcessed % 1000 === 0) {
          console.log(
            `[Block Scanner] Progress: ${this.scanProgress.blocksProcessed}/${currentHeight - startHeight} blocks processed, ${this.scanProgress.stakeEventsFound} stake events found`
          );
        }
      }

      console.log(
        `[Block Scanner] Scan complete! Processed ${this.scanProgress.blocksProcessed} blocks, found ${this.scanProgress.stakeEventsFound} stake events`
      );
    } catch (error) {
      console.error('[Block Scanner] Error during scan:', error);
      throw error;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Process a batch of blocks
   */
  private async processBatch(
    startHeight: number,
    endHeight: number,
    filterAddresses?: string[]
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    for (let height = startHeight; height <= endHeight; height++) {
      promises.push(this.processBlock(height, filterAddresses));
    }

    // Process blocks in parallel
    await Promise.allSettled(promises);
  }

  /**
   * Process a single block and extract all analytics
   */
  private async processBlock(
    height: number,
    filterAddresses?: string[]
  ): Promise<void> {
    try {
      // Get block hash
      const blockHash = await this.rpcClient.getBlockHash(height);

      // Get full block data with verbosity 2 (includes transaction details)
      const block: BlockData = await this.rpcClient.getBlock(blockHash, 2);

      // Extract block analytics
      const analytics = await this.extractBlockAnalytics(block);

      // Store block analytics
      await this.storeBlockAnalytics(analytics);

      // Extract and store stake events
      if (
        block.stakeRewardInfo?.isStakeReward ||
        block.blocktype === 'minted'
      ) {
        const stakeEvents = await this.extractStakeEvents(
          block,
          filterAddresses
        );
        for (const event of stakeEvents) {
          await this.storeStakeEvent(event);
          this.scanProgress.stakeEventsFound++;
        }
      }

      // Extract currency analytics if present
      if (block.valuePools && block.valuePools.length > 0) {
        await this.extractCurrencyAnalytics(block);
      }

      // Update block timing analytics
      await this.updateBlockTimingAnalytics(block);
    } catch (error) {
      console.error(`[Block Scanner] Error processing block ${height}:`, error);
      // Continue processing other blocks
    }
  }

  /**
   * Extract comprehensive block analytics
   */
  private async extractBlockAnalytics(
    block: BlockData
  ): Promise<BlockAnalytics> {
    const blockTime = new Date(block.time * 1000);

    // Determine block type and reward info
    const isPoS =
      block.stakeRewardInfo?.isStakeReward || block.blocktype === 'minted';
    const blockType = isPoS ? 'pos' : 'pow';
    const rewardAmount = block.stakeRewardInfo?.rewardAmount || 0;
    const stakeAmount = block.stakeAmount || 0;

    // Calculate total fees
    let totalFees = 0;
    if (block.tx) {
      for (const tx of block.tx) {
        // Calculate fees from transaction inputs and outputs
        if (tx.vin && tx.vout) {
          const inputSum = tx.vin.reduce(
            (sum: number, input: any) =>
              sum + (input.valueSat || input.value * 100000000 || 0),
            0
          );
          const outputSum = tx.vout.reduce(
            (sum: number, output: any) =>
              sum + (output.valueSat || output.value * 100000000 || 0),
            0
          );
          totalFees += Math.max(0, inputSum - outputSum);
        }
      }
    }

    // Extract staker address for PoS blocks
    let stakerAddress: string | undefined;
    if (isPoS && block.tx && block.tx.length > 0) {
      // First transaction is coinstake
      const coinstake = block.tx[0];
      if (coinstake.vout && coinstake.vout.length > 0) {
        // Check both first and second outputs for staker address
        const output = coinstake.vout[0] || coinstake.vout[1];
        if (
          output &&
          output.scriptPubKey?.addresses &&
          output.scriptPubKey.addresses.length > 0
        ) {
          stakerAddress = output.scriptPubKey.addresses[0];
        }
      }
    }

    // Calculate block interval (time since previous block)
    let blockInterval: number | undefined;
    if (block.height > 0) {
      try {
        const prevBlockHash = await this.rpcClient.getBlockHash(
          block.height - 1
        );
        const prevBlock = await this.rpcClient.getBlock(prevBlockHash, 1);
        blockInterval = block.time - prevBlock.time;
      } catch (error) {
        // Previous block not available
      }
    }

    // Parse chainstake value
    let chainStakeNumeric: number | undefined;
    if (block.chainstake) {
      try {
        chainStakeNumeric = parseInt(block.chainstake, 16);
      } catch (error) {
        // Invalid hex format
      }
    }

    return {
      height: block.height,
      blockHash: block.hash,
      blockTime,
      blockType,
      difficulty: block.difficulty || 0,
      chainstake: block.chainstake,
      chainStakeNumeric,
      anchor: block.anchor,
      solution: block.solution,
      rewardType: block.stakeRewardInfo?.blockType,
      size: block.size || 0,
      txCount: block.tx?.length || 0,
      stakeAmount: Math.floor(stakeAmount * 100000000),
      rewardAmount: Math.floor(rewardAmount * 100000000),
      totalFees,
      blockInterval,
      stakerAddress,
      merkleRoot: block.merkleroot,
      nonce: block.nonce,
      bits: block.bits,
      version: block.version,
    };
  }

  /**
   * Extract stake events from a block
   */
  private async extractStakeEvents(
    block: BlockData,
    filterAddresses?: string[]
  ): Promise<StakeEvent[]> {
    const events: StakeEvent[] = [];

    if (!block.tx || block.tx.length === 0) return events;

    // First transaction is coinstake for PoS blocks
    const coinstake = block.tx[0];

    // Extract staker address and reward
    if (coinstake.vout && coinstake.vout.length > 0) {
      // Check both first and second outputs for staker address
      const output = coinstake.vout[0] || coinstake.vout[1];

      if (
        output &&
        output.scriptPubKey?.addresses &&
        output.scriptPubKey.addresses.length > 0
      ) {
        const address = output.scriptPubKey.addresses[0];

        // Filter by addresses if specified
        if (filterAddresses && !filterAddresses.includes(address)) {
          return events;
        }

        // Calculate reward amount from transaction outputs
        const totalOutput = coinstake.vout.reduce((sum: number, vout: any) => {
          return sum + (vout.value || 0) * 100000000; // Convert to satoshis
        }, 0);

        const rewardAmount = totalOutput;
        const stakeAmount = block.stakeAmount || 0;
        const stakeAge = block.stakeAge || 0;

        events.push({
          address,
          txid: coinstake.txid,
          blockHeight: block.height,
          blockTime: new Date(block.time * 1000),
          rewardAmount: Math.floor(rewardAmount),
          stakeAmount: Math.floor(stakeAmount * 100000000),
          stakeAge,
        });
      }
    }

    return events;
  }

  /**
   * Store block analytics in database
   */
  private async storeBlockAnalytics(analytics: BlockAnalytics): Promise<void> {
    const query = `
      INSERT INTO block_analytics (
        height, block_hash, block_time, block_type, difficulty,
        chainstake, chain_stake_numeric, anchor, solution, reward_type,
        size, tx_count, stake_amount, reward_amount, total_fees,
        block_interval, staker_address, merkle_root, nonce, bits, version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      ON CONFLICT (height) 
      DO UPDATE SET
        block_hash = EXCLUDED.block_hash,
        block_time = EXCLUDED.block_time,
        block_type = EXCLUDED.block_type,
        difficulty = EXCLUDED.difficulty,
        chainstake = EXCLUDED.chainstake,
        chain_stake_numeric = EXCLUDED.chain_stake_numeric,
        anchor = EXCLUDED.anchor,
        solution = EXCLUDED.solution,
        reward_type = EXCLUDED.reward_type,
        size = EXCLUDED.size,
        tx_count = EXCLUDED.tx_count,
        stake_amount = EXCLUDED.stake_amount,
        reward_amount = EXCLUDED.reward_amount,
        total_fees = EXCLUDED.total_fees,
        block_interval = EXCLUDED.block_interval,
        staker_address = EXCLUDED.staker_address,
        merkle_root = EXCLUDED.merkle_root,
        nonce = EXCLUDED.nonce,
        bits = EXCLUDED.bits,
        version = EXCLUDED.version
    `;

    await this.db.query(query, [
      analytics.height,
      analytics.blockHash,
      analytics.blockTime,
      analytics.blockType,
      analytics.difficulty,
      analytics.chainstake,
      analytics.chainStakeNumeric,
      analytics.anchor,
      analytics.solution,
      analytics.rewardType,
      analytics.size,
      analytics.txCount,
      analytics.stakeAmount,
      analytics.rewardAmount,
      analytics.totalFees,
      analytics.blockInterval,
      analytics.stakerAddress,
      analytics.merkleRoot,
      analytics.nonce,
      analytics.bits,
      analytics.version,
    ]);
  }

  /**
   * Store stake event in database
   */
  private async storeStakeEvent(event: StakeEvent): Promise<void> {
    const query = `
      INSERT INTO staking_rewards (
        identity_address, txid, block_height, block_time,
        amount_sats, stake_amount, stake_age
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (txid) DO NOTHING
    `;

    await this.db.query(query, [
      event.address,
      event.txid,
      event.blockHeight,
      event.blockTime,
      event.rewardAmount,
      event.stakeAmount,
      event.stakeAge,
    ]);
  }

  /**
   * Extract currency analytics from value pools
   */
  private async extractCurrencyAnalytics(block: BlockData): Promise<void> {
    if (!block.valuePools) return;

    for (const pool of block.valuePools) {
      const query = `
        INSERT INTO currency_analytics (
          block_height, currency_id, currency_name,
          chain_value, value_delta
        ) VALUES ($1, $2, $3, $4, $5)
      `;

      await this.db.query(query, [
        block.height,
        pool.id,
        pool.id,
        pool.chainValue,
        pool.valueDelta || 0,
      ]);
    }
  }

  /**
   * Update block timing analytics
   */
  private async updateBlockTimingAnalytics(block: BlockData): Promise<void> {
    const blockTime = new Date(block.time * 1000);
    const date = blockTime.toISOString().split('T')[0];
    const hour = blockTime.getHours();

    const isPoS =
      block.stakeRewardInfo?.isStakeReward || block.blocktype === 'minted';

    // Update hourly stats
    const hourlyQuery = `
      INSERT INTO block_timing_analytics (
        date, hour, total_blocks, pos_blocks, pow_blocks
      ) VALUES ($1, $2, 1, $3, $4)
      ON CONFLICT (date, hour) 
      DO UPDATE SET
        total_blocks = block_timing_analytics.total_blocks + 1,
        pos_blocks = block_timing_analytics.pos_blocks + $3,
        pow_blocks = block_timing_analytics.pow_blocks + $4
    `;

    await this.db.query(hourlyQuery, [
      date,
      hour,
      isPoS ? 1 : 0,
      isPoS ? 0 : 1,
    ]);

    // Update daily stats
    const dailyQuery = `
      INSERT INTO block_timing_analytics (
        date, hour, total_blocks, pos_blocks, pow_blocks
      ) VALUES ($1, NULL, 1, $2, $3)
      ON CONFLICT (date, hour) 
      DO UPDATE SET
        total_blocks = block_timing_analytics.total_blocks + 1,
        pos_blocks = block_timing_analytics.pos_blocks + $2,
        pow_blocks = block_timing_analytics.pow_blocks + $3
    `;

    await this.db.query(dailyQuery, [date, isPoS ? 1 : 0, isPoS ? 0 : 1]);
  }

  /**
   * Stop the scan
   */
  stopScan(): void {
    this.isScanning = false;
  }

  /**
   * Get scan progress
   */
  getProgress() {
    return this.scanProgress;
  }

  /**
   * Check if scan is running
   */
  isRunning(): boolean {
    return this.isScanning;
  }
}
