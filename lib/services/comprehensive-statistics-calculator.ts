/**
 * Comprehensive Statistics Calculator
 * Calculates all advanced staking metrics from historical blockchain data
 */

import { type Pool } from 'pg';

interface VerusIDStats {
  address: string;
  friendlyName?: string;
  totalStakes: number;
  totalRewardsSatoshis: number;
  firstStakeTime?: Date;
  lastStakeTime?: Date;
  apyAllTime?: number;
  apyYearly?: number;
  apy90d?: number;
  apy30d?: number;
  apy7d?: number;
  roiAllTime?: number;
  roiYearly?: number;
  avgDaysBetweenStakes?: number;
  stakesPerWeek?: number;
  stakesPerMonth?: number;
  stakingEfficiency?: number;
  avgStakeAge?: number;
  avgRewardAmountSatoshis?: number;
  currentUtxos?: number;
  eligibleUtxos?: number;
  cooldownUtxos?: number;
  totalValueSatoshis?: number;
  eligibleValueSatoshis?: number;
  largestUtxoSatoshis?: number;
  smallestEligibleSatoshis?: number;
  networkRank?: number;
  networkPercentile?: number;
  highestRewardSatoshis?: number;
  highestRewardDate?: Date;
  lowestRewardSatoshis?: number;
  longestDrySpellDays?: number;
  currentStreakDays?: number;
  rewardTrend7d?: string;
  rewardTrend30d?: string;
  apyTrend7d?: string;
  apyTrend30d?: string;
}

export class ComprehensiveStatisticsCalculator {
  private db: Pool;

  constructor(dbPool: Pool) {
    this.db = dbPool;
  }

  /**
   * Calculate comprehensive statistics for a single address
   */
  async calculateStatsForAddress(address: string): Promise<VerusIDStats> {
    console.info(`[Stats Calculator] Calculating statistics for ${address}`);

    // Get all stake events for this address
    const stakeEventsResult = await this.db.query(
      'SELECT * FROM stake_events WHERE address = $1 ORDER BY block_time ASC',
      [address]
    );

    const stakeEvents = stakeEventsResult.rows;

    if (stakeEvents.length === 0) {
      throw new Error(`No stake events found for address ${address}`);
    }

    // Calculate basic metrics
    const totalStakes = stakeEvents.length;
    const totalRewardsSatoshis = stakeEvents.reduce(
      (sum, event) => sum + BigInt(event.reward_amount),
      BigInt(0)
    );
    const firstStakeTime = stakeEvents[0].block_time;
    const lastStakeTime = stakeEvents[stakeEvents.length - 1].block_time;

    // Calculate time-based metrics
    const firstTime = new Date(firstStakeTime).getTime();
    const lastTime = new Date(lastStakeTime).getTime();
    const totalDays = (lastTime - firstTime) / (1000 * 60 * 60 * 24);
    const avgDaysBetweenStakes = totalDays / (totalStakes - 1);
    const stakesPerWeek = totalStakes / (totalDays / 7);
    const stakesPerMonth = totalStakes / (totalDays / 30);

    // Calculate APY and ROI
    const avgStakeAmount =
      stakeEvents.reduce(
        (sum, event) => sum + BigInt(event.stake_amount),
        BigInt(0)
      ) / BigInt(totalStakes);
    const apyAllTime = this.calculateAPY(
      Number(totalRewardsSatoshis),
      Number(avgStakeAmount),
      totalDays
    );
    const roiAllTime = this.calculateROI(
      Number(totalRewardsSatoshis),
      Number(avgStakeAmount)
    );

    // Calculate time-period specific APYs
    const apy7d = await this.calculatePeriodAPY(address, 7);
    const apy30d = await this.calculatePeriodAPY(address, 30);
    const apy90d = await this.calculatePeriodAPY(address, 90);
    const apyYearly = await this.calculatePeriodAPY(address, 365);
    const roiYearly = await this.calculatePeriodROI(address, 365);

    // Calculate staking efficiency
    const stakingEfficiency = await this.calculateStakingEfficiency(address);

    // Calculate average metrics
    const avgStakeAge = Math.floor(
      stakeEvents.reduce((sum, event) => sum + event.stake_age, 0) / totalStakes
    );
    const avgRewardAmountSatoshis = Number(totalRewardsSatoshis) / totalStakes;

    // Get UTXO health metrics
    const utxoMetrics = await this.getUTXOMetrics(address);

    // Calculate records
    const highestReward = Math.max(
      ...stakeEvents.map(e => Number(e.reward_amount))
    );
    const lowestReward = Math.min(
      ...stakeEvents.map(e => Number(e.reward_amount))
    );
    const highestRewardEvent = stakeEvents.find(
      e => Number(e.reward_amount) === highestReward
    );

    // Calculate streaks and dry spells
    const { longestDrySpell, currentStreak } =
      this.calculateStreaks(stakeEvents);

    // Calculate trends
    const rewardTrend7d = await this.calculateTrend(address, 'reward', 7);
    const rewardTrend30d = await this.calculateTrend(address, 'reward', 30);
    const apyTrend7d = await this.calculateTrend(address, 'apy', 7);
    const apyTrend30d = await this.calculateTrend(address, 'apy', 30);

    // Resolve friendly name
    const friendlyName = await this.resolveFriendlyName(address);

    const stats: VerusIDStats = {
      address,
      friendlyName,
      totalStakes,
      totalRewardsSatoshis: Number(totalRewardsSatoshis),
      firstStakeTime,
      lastStakeTime,
      apyAllTime,
      apyYearly,
      apy90d,
      apy30d,
      apy7d,
      roiAllTime,
      roiYearly,
      avgDaysBetweenStakes,
      stakesPerWeek,
      stakesPerMonth,
      stakingEfficiency,
      avgStakeAge,
      avgRewardAmountSatoshis,
      ...utxoMetrics,
      highestRewardSatoshis: highestReward,
      highestRewardDate: highestRewardEvent?.block_time,
      lowestRewardSatoshis: lowestReward,
      longestDrySpellDays: longestDrySpell,
      currentStreakDays: currentStreak,
      rewardTrend7d,
      rewardTrend30d,
      apyTrend7d,
      apyTrend30d,
    };

    // Store statistics
    await this.storeStatistics(stats);

    // Generate time series data
    await this.generateTimeSeries(address, stakeEvents);

    return stats;
  }

  /**
   * Calculate APY (Annual Percentage Yield)
   */
  private calculateAPY(
    totalRewards: number,
    avgStakeAmount: number,
    durationDays: number
  ): number {
    if (avgStakeAmount === 0 || durationDays === 0) return 0;

    const roi = totalRewards / avgStakeAmount;
    const annualizedRoi = (roi / durationDays) * 365;
    return annualizedRoi * 100;
  }

  /**
   * Calculate ROI (Return on Investment)
   */
  private calculateROI(totalRewards: number, totalInvested: number): number {
    if (totalInvested === 0) return 0;
    return (totalRewards / totalInvested) * 100;
  }

  /**
   * Calculate APY for a specific time period
   */
  private async calculatePeriodAPY(
    address: string,
    days: number
  ): Promise<number> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await this.db.query(
      `SELECT
        SUM(reward_amount) as total_rewards,
        AVG(stake_amount) as avg_stake
      FROM stake_events
      WHERE address = $1 AND block_time >= $2`,
      [address, cutoffDate]
    );

    if (!result.rows[0] || !result.rows[0].total_rewards) return 0;

    const totalRewards = Number(result.rows[0].total_rewards);
    const avgStake = Number(result.rows[0].avg_stake);

    return this.calculateAPY(totalRewards, avgStake, days);
  }

  /**
   * Calculate ROI for a specific time period
   */
  private async calculatePeriodROI(
    address: string,
    days: number
  ): Promise<number> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await this.db.query(
      `SELECT
        SUM(reward_amount) as total_rewards,
        SUM(stake_amount) as total_stake
      FROM stake_events
      WHERE address = $1 AND block_time >= $2`,
      [address, cutoffDate]
    );

    if (!result.rows[0] || !result.rows[0].total_rewards) return 0;

    const totalRewards = Number(result.rows[0].total_rewards);
    const totalStake = Number(result.rows[0].total_stake);

    return this.calculateROI(totalRewards, totalStake);
  }

  /**
   * Calculate staking efficiency
   */
  private async calculateStakingEfficiency(address: string): Promise<number> {
    // Efficiency = actual stakes / expected stakes based on stake amount
    const result = await this.db.query(
      `SELECT COUNT(*) as actual_stakes FROM stake_events WHERE address = $1`,
      [address]
    );

    const actualStakes = Number(result.rows[0]?.actual_stakes || 0);

    // Simple efficiency metric: normalized by time
    // This can be enhanced with network difficulty and stake weight
    return Math.min(actualStakes / 100, 1.0); // Normalize to 0-1
  }

  /**
   * Get UTXO health metrics
   */
  private async getUTXOMetrics(address: string) {
    const result = await this.db.query(
      `SELECT
        COUNT(*) as current_utxos,
        COUNT(*) FILTER (WHERE is_eligible = true) as eligible_utxos,
        COUNT(*) FILTER (WHERE cooldown_until > EXTRACT(EPOCH FROM NOW())) as cooldown_utxos,
        COALESCE(SUM(value), 0) as total_value,
        COALESCE(SUM(value) FILTER (WHERE is_eligible = true), 0) as eligible_value,
        COALESCE(MAX(value), 0) as largest_utxo,
        COALESCE(MIN(value) FILTER (WHERE is_eligible = true), 0) as smallest_eligible
      FROM utxos
      WHERE address = $1 AND is_spent = false`,
      [address]
    );

    const row = result.rows[0];

    return {
      currentUtxos: Number(row.current_utxos),
      eligibleUtxos: Number(row.eligible_utxos),
      cooldownUtxos: Number(row.cooldown_utxos),
      totalValueSatoshis: Number(row.total_value),
      eligibleValueSatoshis: Number(row.eligible_value),
      largestUtxoSatoshis: Number(row.largest_utxo),
      smallestEligibleSatoshis: Number(row.smallest_eligible),
    };
  }

  /**
   * Calculate streaks and dry spells
   */
  private calculateStreaks(stakeEvents: any[]): {
    longestDrySpell: number;
    currentStreak: number;
  } {
    let longestDrySpell = 0;
    let currentStreak = 0;

    for (let i = 1; i < stakeEvents.length; i++) {
      const prevTime = new Date(stakeEvents[i - 1].block_time).getTime();
      const currTime = new Date(stakeEvents[i].block_time).getTime();
      const daysDiff = (currTime - prevTime) / (1000 * 60 * 60 * 24);

      longestDrySpell = Math.max(longestDrySpell, daysDiff);
    }

    // Calculate current streak (days since last stake)
    const lastStakeTime = new Date(
      stakeEvents[stakeEvents.length - 1].block_time
    ).getTime();
    currentStreak = (Date.now() - lastStakeTime) / (1000 * 60 * 60 * 24);

    return {
      longestDrySpell: Math.floor(longestDrySpell),
      currentStreak: Math.floor(currentStreak),
    };
  }

  /**
   * Calculate trend direction
   */
  private async calculateTrend(
    address: string,
    metric: 'reward' | 'apy',
    days: number
  ): Promise<string> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const midpointDate = new Date(
      Date.now() - (days / 2) * 24 * 60 * 60 * 1000
    );

    if (metric === 'reward') {
      const firstHalf = await this.db.query(
        `SELECT AVG(reward_amount) as avg_reward
        FROM stake_events
        WHERE address = $1 AND block_time >= $2 AND block_time < $3`,
        [address, cutoffDate, midpointDate]
      );

      const secondHalf = await this.db.query(
        `SELECT AVG(reward_amount) as avg_reward
        FROM stake_events
        WHERE address = $1 AND block_time >= $2`,
        [address, midpointDate]
      );

      const firstAvg = Number(firstHalf.rows[0]?.avg_reward || 0);
      const secondAvg = Number(secondHalf.rows[0]?.avg_reward || 0);

      const change = ((secondAvg - firstAvg) / firstAvg) * 100;

      if (change > 5) return 'increasing';
      if (change < -5) return 'decreasing';
      return 'stable';
    }

    // APY trend calculation would be similar
    return 'stable';
  }

  /**
   * Resolve friendly name from VerusID
   */
  private async resolveFriendlyName(
    address: string
  ): Promise<string | undefined> {
    try {
      const result = await this.db.query(
        'SELECT name FROM identities WHERE identityaddress = $1',
        [address]
      );

      if (result.rows.length > 0) {
        return result.rows[0].name + '@';
      }
    } catch (error) {
      // Friendly name not available
    }

    return undefined;
  }

  /**
   * Store statistics in database
   */
  private async storeStatistics(stats: VerusIDStats): Promise<void> {
    const query = `
      INSERT INTO verusid_statistics (
        address, friendly_name, total_stakes, total_rewards_satoshis,
        first_stake_time, last_stake_time,
        apy_all_time, apy_yearly, apy_90d, apy_30d, apy_7d,
        roi_all_time, roi_yearly,
        avg_days_between_stakes, stakes_per_week, stakes_per_month,
        staking_efficiency, avg_stake_age, avg_reward_amount_satoshis,
        current_utxos, eligible_utxos, cooldown_utxos,
        total_value_satoshis, eligible_value_satoshis,
        largest_utxo_satoshis, smallest_eligible_satoshis,
        highest_reward_satoshis, highest_reward_date, lowest_reward_satoshis,
        longest_dry_spell_days, current_streak_days,
        reward_trend_7d, reward_trend_30d, apy_trend_7d, apy_trend_30d,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, NOW()
      )
      ON CONFLICT (address)
      DO UPDATE SET
        friendly_name = EXCLUDED.friendly_name,
        total_stakes = EXCLUDED.total_stakes,
        total_rewards_satoshis = EXCLUDED.total_rewards_satoshis,
        first_stake_time = EXCLUDED.first_stake_time,
        last_stake_time = EXCLUDED.last_stake_time,
        apy_all_time = EXCLUDED.apy_all_time,
        apy_yearly = EXCLUDED.apy_yearly,
        apy_90d = EXCLUDED.apy_90d,
        apy_30d = EXCLUDED.apy_30d,
        apy_7d = EXCLUDED.apy_7d,
        roi_all_time = EXCLUDED.roi_all_time,
        roi_yearly = EXCLUDED.roi_yearly,
        avg_days_between_stakes = EXCLUDED.avg_days_between_stakes,
        stakes_per_week = EXCLUDED.stakes_per_week,
        stakes_per_month = EXCLUDED.stakes_per_month,
        staking_efficiency = EXCLUDED.staking_efficiency,
        avg_stake_age = EXCLUDED.avg_stake_age,
        avg_reward_amount_satoshis = EXCLUDED.avg_reward_amount_satoshis,
        current_utxos = EXCLUDED.current_utxos,
        eligible_utxos = EXCLUDED.eligible_utxos,
        cooldown_utxos = EXCLUDED.cooldown_utxos,
        total_value_satoshis = EXCLUDED.total_value_satoshis,
        eligible_value_satoshis = EXCLUDED.eligible_value_satoshis,
        largest_utxo_satoshis = EXCLUDED.largest_utxo_satoshis,
        smallest_eligible_satoshis = EXCLUDED.smallest_eligible_satoshis,
        highest_reward_satoshis = EXCLUDED.highest_reward_satoshis,
        highest_reward_date = EXCLUDED.highest_reward_date,
        lowest_reward_satoshis = EXCLUDED.lowest_reward_satoshis,
        longest_dry_spell_days = EXCLUDED.longest_dry_spell_days,
        current_streak_days = EXCLUDED.current_streak_days,
        reward_trend_7d = EXCLUDED.reward_trend_7d,
        reward_trend_30d = EXCLUDED.reward_trend_30d,
        apy_trend_7d = EXCLUDED.apy_trend_7d,
        apy_trend_30d = EXCLUDED.apy_trend_30d,
        updated_at = NOW()
    `;

    await this.db.query(query, [
      stats.address,
      stats.friendlyName,
      stats.totalStakes,
      stats.totalRewardsSatoshis,
      stats.firstStakeTime,
      stats.lastStakeTime,
      stats.apyAllTime,
      stats.apyYearly,
      stats.apy90d,
      stats.apy30d,
      stats.apy7d,
      stats.roiAllTime,
      stats.roiYearly,
      stats.avgDaysBetweenStakes,
      stats.stakesPerWeek,
      stats.stakesPerMonth,
      stats.stakingEfficiency,
      stats.avgStakeAge,
      stats.avgRewardAmountSatoshis,
      stats.currentUtxos,
      stats.eligibleUtxos,
      stats.cooldownUtxos,
      stats.totalValueSatoshis,
      stats.eligibleValueSatoshis,
      stats.largestUtxoSatoshis,
      stats.smallestEligibleSatoshis,
      stats.highestRewardSatoshis,
      stats.highestRewardDate,
      stats.lowestRewardSatoshis,
      stats.longestDrySpellDays,
      stats.currentStreakDays,
      stats.rewardTrend7d,
      stats.rewardTrend30d,
      stats.apyTrend7d,
      stats.apyTrend30d,
    ]);
  }

  /**
   * Generate time series data
   */
  private async generateTimeSeries(
    address: string,
    stakeEvents: any[]
  ): Promise<void> {
    // Generate daily, weekly, and monthly time series
    await this.generateDailyTimeSeries(address, stakeEvents);
    await this.generateWeeklyTimeSeries(address, stakeEvents);
    await this.generateMonthlyTimeSeries(address, stakeEvents);
  }

  /**
   * Generate daily time series
   */
  private async generateDailyTimeSeries(
    address: string,
    stakeEvents: any[]
  ): Promise<void> {
    const dailyData = new Map<string, any[]>();

    // Group events by day
    for (const event of stakeEvents) {
      if (event.block_time) {
        const dateParts = new Date(event.block_time).toISOString().split('T');
        const date = dateParts[0];
        if (date) {
          if (!dailyData.has(date)) {
            dailyData.set(date, []);
          }
          const dayEvents = dailyData.get(date);
          if (dayEvents) {
            dayEvents.push(event);
          } else {
            dailyData.set(date, [event]);
          }
        }
      }
    }

    // Store daily aggregates
    for (const [date, events] of Array.from(dailyData.entries())) {
      const stakeCount = events.length;
      const totalRewards = events.reduce(
        (sum, e) => sum + Number(e.reward_amount),
        0
      );
      const avgReward = totalRewards / stakeCount;
      const avgStakeAge =
        events.reduce((sum, e) => sum + e.stake_age, 0) / stakeCount;

      const periodStart = new Date(date + 'T00:00:00Z');
      const periodEnd = new Date(date + 'T23:59:59Z');

      await this.db.query(
        `INSERT INTO staking_timeline (
          address, period_type, period_start, period_end,
          stake_count, total_rewards_satoshis, avg_reward_satoshis, avg_stake_age
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (address, period_type, period_start) DO UPDATE SET
          stake_count = EXCLUDED.stake_count,
          total_rewards_satoshis = EXCLUDED.total_rewards_satoshis,
          avg_reward_satoshis = EXCLUDED.avg_reward_satoshis,
          avg_stake_age = EXCLUDED.avg_stake_age`,
        [
          address,
          'daily',
          periodStart,
          periodEnd,
          stakeCount,
          totalRewards,
          avgReward,
          avgStakeAge,
        ]
      );
    }
  }

  /**
   * Generate weekly time series
   */
  private async generateWeeklyTimeSeries(
    address: string,
    stakeEvents: any[]
  ): Promise<void> {
    // Similar to daily but grouped by week
    const weeklyData = new Map<string, any[]>();

    for (const event of stakeEvents) {
      const date = new Date(event.block_time);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0] || '';

      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, []);
      }
      weeklyData.get(weekKey)!.push(event);
    }

    for (const [weekStart, events] of Array.from(weeklyData.entries())) {
      const stakeCount = events.length;
      const totalRewards = events.reduce(
        (sum, e) => sum + Number(e.reward_amount),
        0
      );
      const avgReward = totalRewards / stakeCount;

      const periodStart = new Date(weekStart + 'T00:00:00Z');
      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 6);

      await this.db.query(
        `INSERT INTO staking_timeline (
          address, period_type, period_start, period_end,
          stake_count, total_rewards_satoshis, avg_reward_satoshis
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (address, period_type, period_start) DO UPDATE SET
          stake_count = EXCLUDED.stake_count,
          total_rewards_satoshis = EXCLUDED.total_rewards_satoshis,
          avg_reward_satoshis = EXCLUDED.avg_reward_satoshis`,
        [
          address,
          'weekly',
          periodStart,
          periodEnd,
          stakeCount,
          totalRewards,
          avgReward,
        ]
      );
    }
  }

  /**
   * Generate monthly time series
   */
  private async generateMonthlyTimeSeries(
    address: string,
    stakeEvents: any[]
  ): Promise<void> {
    const monthlyData = new Map<string, any[]>();

    for (const event of stakeEvents) {
      const date = new Date(event.block_time);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, []);
      }
      monthlyData.get(monthKey)!.push(event);
    }

    for (const [month, events] of Array.from(monthlyData.entries())) {
      const stakeCount = events.length;
      const totalRewards = events.reduce(
        (sum, e) => sum + Number(e.reward_amount),
        0
      );
      const avgReward = totalRewards / stakeCount;

      const [year, monthNum] = month.split('-');
      const periodStart = new Date(`${year}-${monthNum}-01T00:00:00Z`);
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      periodEnd.setDate(0);

      await this.db.query(
        `INSERT INTO staking_timeline (
          address, period_type, period_start, period_end,
          stake_count, total_rewards_satoshis, avg_reward_satoshis
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (address, period_type, period_start) DO UPDATE SET
          stake_count = EXCLUDED.stake_count,
          total_rewards_satoshis = EXCLUDED.total_rewards_satoshis,
          avg_reward_satoshis = EXCLUDED.avg_reward_satoshis`,
        [
          address,
          'monthly',
          periodStart,
          periodEnd,
          stakeCount,
          totalRewards,
          avgReward,
        ]
      );
    }
  }

  /**
   * Calculate network rankings
   */
  async calculateNetworkRankings(): Promise<void> {
    console.info('[Stats Calculator] Calculating network rankings...');

    // Update ranks based on total rewards
    await this.db.query(`
      UPDATE verusid_statistics
      SET network_rank = ranks.rank,
          network_percentile = ranks.percentile
      FROM (
        SELECT
          address,
          ROW_NUMBER() OVER (ORDER BY total_rewards_satoshis DESC) as rank,
          (100.0 * ROW_NUMBER() OVER (ORDER BY total_rewards_satoshis DESC) / COUNT(*) OVER()) as percentile
        FROM verusid_statistics
      ) as ranks
      WHERE verusid_statistics.address = ranks.address
    `);

    console.info('[Stats Calculator] Network rankings updated');
  }
}
