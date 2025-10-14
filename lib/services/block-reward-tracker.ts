/**
 * Block Reward Tracker Service
 *
 * Tracks historical block rewards for Verus network using dynamic blockchain analysis
 * to ensure accurate staking calculations based on actual rewards at the time of staking.
 */

import { dynamicBlockRewardAnalyzer } from './dynamic-block-reward-analyzer';

export interface BlockRewardInfo {
  height: number;
  reward: number;
  timestamp?: number;
  halvingEvent?: boolean;
}

export class BlockRewardTracker {
  private static instance: BlockRewardTracker;

  // Real Verus block reward schedule (discovered through blockchain analysis)
  private readonly fallbackSchedule: BlockRewardInfo[] = [
    { height: 1, reward: 0.096, timestamp: 0, halvingEvent: false }, // Genesis (fees only)
    { height: 1001, reward: 38.13, timestamp: 0, halvingEvent: true }, // Early period
    { height: 100001, reward: 96.0, timestamp: 0, halvingEvent: false }, // High reward period
    { height: 1000001, reward: 24.0, timestamp: 0, halvingEvent: true }, // First major halving
    { height: 1633808, reward: 12.0, timestamp: 0, halvingEvent: true }, // Second halving (current)
  ];

  private constructor() {}

  public static getInstance(): BlockRewardTracker {
    if (!BlockRewardTracker.instance) {
      BlockRewardTracker.instance = new BlockRewardTracker();
    }
    return BlockRewardTracker.instance;
  }

  /**
   * Get the block reward for a specific block height
   * Uses dynamic analysis when available, falls back to static schedule
   */
  public async getBlockReward(height: number): Promise<number> {
    try {
      // Try dynamic analysis first
      const dynamicReward =
        await dynamicBlockRewardAnalyzer.getBlockReward(height);
      if (dynamicReward > 0) {
        return dynamicReward;
      }
    } catch (error) {
      console.warn(
        'Dynamic block reward analysis failed, using fallback:',
        error
      );
    }

    // Fallback to static schedule
    const sortedSchedule = [...this.fallbackSchedule].sort(
      (a, b) => b.height - a.height
    );

    for (const rewardInfo of sortedSchedule) {
      if (height >= rewardInfo.height) {
        return rewardInfo.reward;
      }
    }

    // Ultimate fallback
    return 3;
  }

  /**
   * Get the PoS reward for a specific block height
   * Verus uses 50/50 PoS/PoW split
   */
  public async getPoSReward(height: number): Promise<number> {
    const blockReward = await this.getBlockReward(height);
    return blockReward * 0.5;
  }

  /**
   * Get reward info for a specific height
   */
  public getRewardInfo(height: number): BlockRewardInfo {
    const sortedSchedule = [...this.fallbackSchedule].sort(
      (a, b) => b.height - a.height
    );

    for (const rewardInfo of sortedSchedule) {
      if (height >= rewardInfo.height) {
        return {
          ...rewardInfo,
          height,
          timestamp: rewardInfo.timestamp || Date.now(),
        };
      }
    }

    return {
      height,
      reward: 12,
      timestamp: Date.now(),
      halvingEvent: false,
    };
  }

  /**
   * Get all known halving events
   */
  public getHalvingEvents(): BlockRewardInfo[] {
    return this.fallbackSchedule.filter(event => event.halvingEvent);
  }

  /**
   * Get the current block reward (for latest blocks)
   */
  public async getCurrentBlockReward(): Promise<number> {
    try {
      // Try to get current reward from dynamic analysis
      const schedule = await dynamicBlockRewardAnalyzer.getRewardSchedule();
      const currentPeriod = schedule.find(p => p.isCurrent);
      if (currentPeriod) {
        return currentPeriod.blockReward;
      }
    } catch (error) {
      console.warn(
        'Failed to get current reward from dynamic analysis:',
        error
      );
    }

    // Fallback to static schedule
    const latestSchedule = this.fallbackSchedule.reduce((latest, current) =>
      current.height > latest.height ? current : latest
    );
    return latestSchedule.reward;
  }

  /**
   * Calculate average reward over a range of blocks
   */
  public getAverageReward(startHeight: number, endHeight: number): number {
    if (startHeight > endHeight) {
      throw new Error('Start height must be less than or equal to end height');
    }

    const sortedSchedule = [...this.fallbackSchedule].sort(
      (a, b) => a.height - b.height
    );
    let totalReward = 0;
    let totalBlocks = 0;
    let currentHeight = startHeight;

    for (let i = 0; i < sortedSchedule.length; i++) {
      const currentReward = sortedSchedule[i];
      const nextReward = sortedSchedule[i + 1];

      // Determine the end height for this reward period
      const periodEndHeight = nextReward
        ? Math.min(nextReward.height - 1, endHeight)
        : endHeight;

      if (currentHeight <= periodEndHeight) {
        const blocksInPeriod = periodEndHeight - currentHeight + 1;
        totalReward += currentReward.reward * blocksInPeriod;
        totalBlocks += blocksInPeriod;
        currentHeight = periodEndHeight + 1;
      }

      if (currentHeight > endHeight) break;
    }

    return totalBlocks > 0 ? totalReward / totalBlocks : 0;
  }

  /**
   * Get reward breakdown for a block range
   */
  public getRewardBreakdown(
    startHeight: number,
    endHeight: number
  ): {
    totalBlocks: number;
    averageReward: number;
    totalReward: number;
    periods: Array<{
      startHeight: number;
      endHeight: number;
      reward: number;
      blocks: number;
    }>;
  } {
    const sortedSchedule = [...this.fallbackSchedule].sort(
      (a, b) => a.height - b.height
    );
    const periods = [];
    let totalReward = 0;
    let totalBlocks = 0;
    let currentHeight = startHeight;

    for (let i = 0; i < sortedSchedule.length; i++) {
      const currentReward = sortedSchedule[i];
      const nextReward = sortedSchedule[i + 1];

      const periodEndHeight = nextReward
        ? Math.min(nextReward.height - 1, endHeight)
        : endHeight;

      if (currentHeight <= periodEndHeight) {
        const blocksInPeriod = periodEndHeight - currentHeight + 1;
        const periodReward = currentReward.reward * blocksInPeriod;

        periods.push({
          startHeight: currentHeight,
          endHeight: periodEndHeight,
          reward: currentReward.reward,
          blocks: blocksInPeriod,
        });

        totalReward += periodReward;
        totalBlocks += blocksInPeriod;
        currentHeight = periodEndHeight + 1;
      }

      if (currentHeight > endHeight) break;
    }

    return {
      totalBlocks,
      averageReward: totalBlocks > 0 ? totalReward / totalBlocks : 0,
      totalReward,
      periods,
    };
  }

  /**
   * Debug method to show reward schedule
   */
  public debugSchedule(): string {
    const sortedSchedule = [...this.fallbackSchedule].sort(
      (a, b) => a.height - b.height
    );

    return sortedSchedule
      .map((reward, index) => {
        const nextReward = sortedSchedule[index + 1];
        const endHeight = nextReward ? nextReward.height - 1 : 'current';

        return `Blocks ${reward.height} - ${endHeight}: ${reward.reward} VRSC${reward.halvingEvent ? ' (HALVING)' : ''}`;
      })
      .join('\n');
  }
}

// Export singleton instance
export const blockRewardTracker = BlockRewardTracker.getInstance();
