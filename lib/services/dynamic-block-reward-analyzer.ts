/**
 * Dynamic Block Reward Analyzer
 *
 * Analyzes actual blockchain data to determine block rewards at different heights
 * instead of relying on hardcoded schedules.
 */

import { verusAPI } from '@/lib/rpc-client-robust';

export interface BlockRewardAnalysis {
  height: number;
  blockReward: number;
  posReward: number;
  powReward: number;
  timestamp: number;
  hash: string;
  isHalving: boolean;
  totalValue: number;
  coinbaseValue: number;
  coinstakeValue: number;
}

export interface RewardSchedule {
  startHeight: number;
  endHeight: number;
  blockReward: number;
  posReward: number;
  powReward: number;
  startTime: number;
  endTime: number;
  blocksAnalyzed: number;
  averageReward: number;
  isCurrent: boolean;
}

export class DynamicBlockRewardAnalyzer {
  private static instance: DynamicBlockRewardAnalyzer;
  private rewardCache = new Map<number, BlockRewardAnalysis>();
  private scheduleCache: RewardSchedule[] | null = null;
  // Track last analyzed height for cache invalidation
  // Property is set but TypeScript doesn't detect usage - intentionally kept for future use
  // @ts-ignore TS6133 - property is set but not read in current code flow
  private lastAnalysisHeight = 0;

  private constructor() {}

  public static getInstance(): DynamicBlockRewardAnalyzer {
    if (!DynamicBlockRewardAnalyzer.instance) {
      DynamicBlockRewardAnalyzer.instance = new DynamicBlockRewardAnalyzer();
    }
    return DynamicBlockRewardAnalyzer.instance;
  }

  /**
   * Analyze block rewards by sampling blocks across different heights
   */
  public async analyzeBlockRewards(
    sampleSize: number = 100,
    forceRefresh: boolean = false
  ): Promise<RewardSchedule[]> {
    if (!forceRefresh && this.scheduleCache && this.scheduleCache.length > 0) {
      return this.scheduleCache;
    }

    console.info(`Analyzing block rewards with ${sampleSize} samples...`);

    try {
      const blockchainInfo = await verusAPI.getBlockchainInfo();
      const currentHeight = blockchainInfo.blocks;

      if (currentHeight <= 0) {
        throw new Error('Invalid blockchain height');
      }

      // Sample blocks across the entire blockchain history
      const samples = this.generateSampleHeights(currentHeight, sampleSize);
      const analyses: BlockRewardAnalysis[] = [];

      console.info(
        `Sampling blocks at heights: ${samples.slice(0, 10).join(', ')}...`
      );

      // Analyze blocks in batches to avoid overwhelming the RPC
      const batchSize = 10;
      for (let i = 0; i < samples.length; i += batchSize) {
        const batch = samples.slice(i, i + batchSize);
        const batchPromises = batch.map(height => this.analyzeBlock(height));

        const batchResults = await Promise.allSettled(batchPromises);

        for (const result of batchResults) {
          if (result.status === 'fulfilled' && result.value) {
            analyses.push(result.value);
          }
        }

        // Small delay between batches to be respectful to the RPC
        if (i + batchSize < samples.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.info(`Successfully analyzed ${analyses.length} blocks`);

      // Detect reward schedule changes
      const schedule = this.detectRewardSchedule(analyses, currentHeight);
      this.scheduleCache = schedule;
      this.lastAnalysisHeight = currentHeight;

      return schedule;
    } catch (error) {
      console.error('Error analyzing block rewards:', error);
      throw error;
    }
  }

  /**
   * Get block reward for a specific height using cached data or analysis
   */
  public async getBlockReward(height: number): Promise<number> {
    // Check cache first
    if (this.rewardCache.has(height)) {
      return this.rewardCache.get(height)!.blockReward;
    }

    // Use schedule if available
    if (this.scheduleCache && this.scheduleCache.length > 0) {
      const reward = this.getRewardFromSchedule(height);
      if (reward > 0) {
        return reward;
      }
    }

    // Fallback: analyze the specific block
    try {
      const analysis = await this.analyzeBlock(height);
      if (analysis) {
        this.rewardCache.set(height, analysis);
        return analysis.blockReward;
      }
    } catch (error) {
      console.warn(`Failed to analyze block ${height}:`, error);
    }

    // Ultimate fallback
    return 3; // Current estimated reward
  }

  /**
   * Get PoS reward for a specific height (assumes 50/50 split)
   */
  public async getPoSReward(height: number): Promise<number> {
    const blockReward = await this.getBlockReward(height);
    return blockReward * 0.5;
  }

  /**
   * Generate sample heights across blockchain history
   */
  private generateSampleHeights(
    currentHeight: number,
    sampleSize: number
  ): number[] {
    const samples: number[] = [];

    // Always include genesis block
    samples.push(1);

    // Sample from different periods
    const periods = [
      { start: 1, end: Math.min(100000, currentHeight) }, // Early period
      { start: 100001, end: Math.min(1000000, currentHeight) }, // Early-mid period
      { start: 1000001, end: Math.min(3000000, currentHeight) }, // Mid period
      { start: 3000001, end: currentHeight }, // Recent period
    ];

    for (const period of periods) {
      if (period.start <= currentHeight) {
        const periodSamples = Math.ceil(
          ((sampleSize / periods.length) * (period.end - period.start)) /
            currentHeight
        );

        for (
          let i = 0;
          i < periodSamples && period.start + i * 1000 <= period.end;
          i++
        ) {
          const height = Math.min(period.start + i * 1000, period.end);
          if (height > 0 && height <= currentHeight) {
            samples.push(height);
          }
        }
      }
    }

    // Always include current block
    if (currentHeight > 1) {
      samples.push(currentHeight);
    }

    // Remove duplicates and sort
    return Array.from(new Set(samples)).sort((a, b) => a - b);
  }

  /**
   * Analyze a specific block to determine its reward structure
   */
  private async analyzeBlock(
    height: number
  ): Promise<BlockRewardAnalysis | null> {
    try {
      const hash = await verusAPI.getBlockHash(height);
      const block = await verusAPI.getBlock(hash, 2); // Verbosity 2 for full tx details

      if (!block || !block.tx || block.tx.length === 0) {
        console.warn(`Block ${height} has no transactions`);
        return null;
      }

      // The first transaction contains the block reward
      const firstTx = block.tx[0];

      let blockReward = 0;
      let coinbaseValue = 0;
      let coinstakeValue = 0;
      let isPoS = false;

      // Calculate total outputs (this is the block reward)
      if (firstTx && firstTx.vout && Array.isArray(firstTx.vout)) {
        blockReward = firstTx.vout.reduce((sum: number, output: any) => {
          return sum + (output.value || 0);
        }, 0);
      }

      // Determine if it's PoS or PoW based on inputs
      if (
        firstTx &&
        firstTx.vin &&
        Array.isArray(firstTx.vin) &&
        firstTx.vin.length > 0
      ) {
        const firstInput = firstTx.vin[0];
        if (firstInput.coinbase === undefined) {
          // Has coinstake input, this is PoS
          isPoS = true;
          coinstakeValue = blockReward;
        } else {
          // Has coinbase input, this is PoW
          isPoS = false;
          coinbaseValue = blockReward;
        }
      } else {
        // Default to PoW if we can't determine
        coinbaseValue = blockReward;
      }

      // For Verus, assume 50/50 split between PoS and PoW
      const posReward = blockReward * 0.5;
      const powReward = blockReward * 0.5;

      console.info(
        `Block ${height}: reward=${blockReward}, PoS=${isPoS}, hash=${hash}`
      );

      const analysis: BlockRewardAnalysis = {
        height,
        blockReward,
        posReward,
        powReward,
        timestamp: block.time,
        hash: block.hash,
        isHalving: false, // Will be determined during schedule detection
        totalValue: blockReward,
        coinbaseValue,
        coinstakeValue,
      };

      return analysis;
    } catch (error) {
      console.warn(`Failed to analyze block ${height}:`, error);
      return null;
    }
  }

  /**
   * Detect reward schedule changes from analyzed blocks
   */
  private detectRewardSchedule(
    analyses: BlockRewardAnalysis[],
    currentHeight: number
  ): RewardSchedule[] {
    // Sort by height
    analyses.sort((a, b) => a.height - b.height);

    const schedule: RewardSchedule[] = [];
    let currentReward = 0;
    let startHeight = 0;
    let startTime = 0;
    let blockCount = 0;
    let totalReward = 0;

    for (let i = 0; i < analyses.length; i++) {
      const analysis = analyses[i];

      if (!analysis) {
        continue;
      }

      if (currentReward === 0) {
        // First block
        currentReward = analysis.blockReward;
        startHeight = analysis.height;
        startTime = analysis.timestamp;
        blockCount = 1;
        totalReward = analysis.blockReward;
      } else if (Math.abs(analysis.blockReward - currentReward) > 0.01) {
        // Reward change detected - save current period
        schedule.push({
          startHeight,
          endHeight: analyses[i - 1]?.height ?? 0,
          blockReward: currentReward,
          posReward: currentReward * 0.5,
          powReward: currentReward * 0.5,
          startTime,
          endTime: analyses[i - 1]?.timestamp ?? 0,
          blocksAnalyzed: blockCount,
          averageReward: totalReward / blockCount,
          isCurrent: false,
        });

        // Start new period
        currentReward = analysis.blockReward;
        startHeight = analysis.height;
        startTime = analysis.timestamp;
        blockCount = 1;
        totalReward = analysis.blockReward;
      } else {
        // Same reward period
        blockCount++;
        totalReward += analysis.blockReward;
      }
    }

    // Add the last period
    if (blockCount > 0) {
      schedule.push({
        startHeight,
        endHeight: currentHeight,
        blockReward: currentReward,
        posReward: currentReward * 0.5,
        powReward: currentReward * 0.5,
        startTime,
        endTime: Date.now(),
        blocksAnalyzed: blockCount,
        averageReward: totalReward / blockCount,
        isCurrent: true,
      });
    }

    return schedule;
  }

  /**
   * Get reward from detected schedule
   */
  private getRewardFromSchedule(height: number): number {
    if (!this.scheduleCache) return 0;

    for (const period of this.scheduleCache) {
      if (height >= period.startHeight && height <= period.endHeight) {
        return period.blockReward;
      }
    }

    return 0;
  }

  /**
   * Get current reward schedule (cached or fresh analysis)
   */
  public async getRewardSchedule(
    forceRefresh: boolean = false
  ): Promise<RewardSchedule[]> {
    return await this.analyzeBlockRewards(100, forceRefresh);
  }

  /**
   * Debug method to print schedule
   */
  public async debugSchedule(): Promise<string> {
    const schedule = await this.getRewardSchedule();

    return schedule
      .map((period, index) => {
        const status = period.isCurrent ? ' (CURRENT)' : '';
        return `Period ${index + 1}: Blocks ${period.startHeight} - ${period.endHeight}: ${period.blockReward.toFixed(2)} VRSC${status}`;
      })
      .join('\n');
  }

  /**
   * Clear cache (for testing or when blockchain changes)
   */
  public clearCache(): void {
    this.rewardCache.clear();
    this.scheduleCache = null;
    this.lastAnalysisHeight = 0;
  }
}

// Export singleton instance
export const dynamicBlockRewardAnalyzer =
  DynamicBlockRewardAnalyzer.getInstance();
