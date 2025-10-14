// Statistics Calculator Service
// Calculates comprehensive staking statistics for VerusIDs

import { Pool } from 'pg';

export interface ComprehensiveStats {
  address: string;

  // Summary
  totalStakes: number;
  totalRewards: number; // satoshis
  firstStake?: Date;
  lastStake?: Date;

  // Performance (APY)
  apyAllTime?: number;
  apyYearly?: number;
  apy90d?: number;
  apy30d?: number;
  apy7d?: number;

  // Performance (ROI)
  roiAllTime?: number;
  roiYearly?: number;

  // Staking Frequency
  avgDaysBetweenStakes?: number;
  stakesPerWeek?: number;
  stakesPerMonth?: number;

  // Efficiency
  stakingEfficiency?: number;
  eligibleUtxoRatio?: number;
  avgStakeAge?: number;
  avgRewardAmount?: number; // satoshis
  successRate?: number;

  // UTXO Health
  currentUtxos: number;
  eligibleUtxos: number;
  cooldownUtxos: number;
  totalValue: number; // satoshis
  eligibleValue: number; // satoshis
  largestUtxo: number; // satoshis
  smallestEligible: number; // satoshis

  // Rankings
  networkRank?: number;
  networkPercentile?: number;
  categoryRank?: number;

  // Records
  highestReward?: number; // satoshis
  highestRewardDate?: Date;
  lowestReward?: number; // satoshis
  longestDrySpell?: number; // days
  currentStreak?: number; // days
  bestMonth?: string; // YYYY-MM
  bestMonthRewards?: number; // satoshis
  worstMonth?: string;
  worstMonthRewards?: number; // satoshis

  // Trends
  rewardTrend7d?: 'increasing' | 'stable' | 'decreasing';
  rewardTrend30d?: 'increasing' | 'stable' | 'decreasing';
  efficiencyTrend7d?: 'increasing' | 'stable' | 'decreasing';
  efficiencyTrend30d?: 'increasing' | 'stable' | 'decreasing';
  apyTrend7d?: 'increasing' | 'stable' | 'decreasing';
  apyTrend30d?: 'increasing' | 'stable' | 'decreasing';
}

export class StatisticsCalculator {
  private db: Pool;

  constructor(dbPool: Pool) {
    this.db = dbPool;
  }

  /**
   * Calculate comprehensive statistics for a VerusID
   */
  async calculateStats(address: string): Promise<ComprehensiveStats> {
    const stats: ComprehensiveStats = {
      address,
      totalStakes: 0,
      totalRewards: 0,
      currentUtxos: 0,
      eligibleUtxos: 0,
      cooldownUtxos: 0,
      totalValue: 0,
      eligibleValue: 0,
      largestUtxo: 0,
      smallestEligible: 0,
    };

    // Get stake events summary
    const stakesSummary = await this.getStakeEventsSummary(address);
    Object.assign(stats, stakesSummary);

    // Get UTXO health
    const utxoHealth = await this.getUTXOHealth(address);
    Object.assign(stats, utxoHealth);

    // Calculate performance metrics
    if (stats.totalStakes > 0) {
      const performance = await this.calculatePerformanceMetrics(address, stats);
      Object.assign(stats, performance);
    }

    // Calculate frequency metrics
    if (stats.firstStake && stats.lastStake && stats.totalStakes > 1) {
      const frequency = this.calculateFrequencyMetrics(
        stats.firstStake,
        stats.lastStake,
        stats.totalStakes
      );
      Object.assign(stats, frequency);
    }

    // Get records
    const records = await this.getRecords(address);
    Object.assign(stats, records);

    // Calculate trends
    const trends = await this.calculateTrends(address);
    Object.assign(stats, trends);

    // Calculate rankings
    const rankings = await this.calculateRankings(address, stats.totalRewards);
    Object.assign(stats, rankings);

    return stats;
  }

  /**
   * Get summary of stake events
   */
  private async getStakeEventsSummary(address: string): Promise<Partial<ComprehensiveStats>> {
    const query = `
      SELECT 
        COUNT(*) as total_stakes,
        SUM(reward_amount) as total_rewards,
        MIN(block_time) as first_stake,
        MAX(block_time) as last_stake,
        AVG(stake_age) as avg_stake_age,
        AVG(reward_amount) as avg_reward_amount
      FROM stake_events
      WHERE address = $1
    `;

    const result = await this.db.query(query, [address]);
    const row = result.rows[0];

    return {
      totalStakes: parseInt(row.total_stakes) || 0,
      totalRewards: parseInt(row.total_rewards) || 0,
      firstStake: row.first_stake ? new Date(row.first_stake) : undefined,
      lastStake: row.last_stake ? new Date(row.last_stake) : undefined,
      avgStakeAge: parseInt(row.avg_stake_age) || 0,
      avgRewardAmount: parseInt(row.avg_reward_amount) || 0,
    };
  }

  /**
   * Get UTXO health metrics
   */
  private async getUTXOHealth(address: string): Promise<Partial<ComprehensiveStats>> {
    const query = `
      SELECT 
        COUNT(*) as total_utxos,
        SUM(value) as total_value,
        COUNT(CASE WHEN is_eligible = true THEN 1 END) as eligible_utxos,
        SUM(CASE WHEN is_eligible = true THEN value ELSE 0 END) as eligible_value,
        COUNT(CASE WHEN cooldown_until IS NOT NULL AND cooldown_until > $2 THEN 1 END) as cooldown_utxos,
        MAX(value) as largest_utxo,
        MIN(CASE WHEN is_eligible = true THEN value END) as smallest_eligible
      FROM utxos
      WHERE address = $1 AND is_spent = false
    `;

    // Get current block height for cooldown calculation
    const blockchainInfo = await this.db.query('SELECT MAX(height) as current_height FROM block_analytics');
    const currentHeight = blockchainInfo.rows[0]?.current_height || 0;

    const result = await this.db.query(query, [address, currentHeight]);
    const row = result.rows[0];

    const totalUtxos = parseInt(row.total_utxos) || 0;
    const eligibleUtxos = parseInt(row.eligible_utxos) || 0;

    return {
      currentUtxos: totalUtxos,
      eligibleUtxos,
      cooldownUtxos: parseInt(row.cooldown_utxos) || 0,
      totalValue: parseInt(row.total_value) || 0,
      eligibleValue: parseInt(row.eligible_value) || 0,
      largestUtxo: parseInt(row.largest_utxo) || 0,
      smallestEligible: parseInt(row.smallest_eligible) || 0,
      stakingEfficiency: totalUtxos > 0 ? eligibleUtxos / totalUtxos : 0,
      eligibleUtxoRatio: totalUtxos > 0 ? eligibleUtxos / totalUtxos : 0,
    };
  }

  /**
   * Calculate performance metrics (APY, ROI)
   */
  private async calculatePerformanceMetrics(
    address: string,
    baseStats: Partial<ComprehensiveStats>
  ): Promise<Partial<ComprehensiveStats>> {
    const performance: Partial<ComprehensiveStats> = {};

    // Calculate APY for different periods
    const apyPeriods = [
      { days: null, key: 'apyAllTime' }, // All time
      { days: 365, key: 'apyYearly' },
      { days: 90, key: 'apy90d' },
      { days: 30, key: 'apy30d' },
      { days: 7, key: 'apy7d' },
    ];

    for (const period of apyPeriods) {
      const apy = await this.calculateAPY(address, period.days);
      if (apy !== null) {
        (performance as any)[period.key] = apy;
      }
    }

    // Calculate ROI
    if (baseStats.totalRewards && baseStats.totalValue) {
      performance.roiAllTime = (baseStats.totalRewards / baseStats.totalValue) * 100;
    }

    return performance;
  }

  /**
   * Calculate APY for a specific period
   */
  private async calculateAPY(address: string, days: number | null): Promise<number | null> {
    const query = days
      ? `
        SELECT 
          SUM(reward_amount) as total_rewards,
          AVG(stake_amount) as avg_stake
        FROM stake_events
        WHERE address = $1 AND block_time >= NOW() - INTERVAL '${days} days'
      `
      : `
        SELECT 
          SUM(reward_amount) as total_rewards,
          AVG(stake_amount) as avg_stake,
          EXTRACT(EPOCH FROM (MAX(block_time) - MIN(block_time))) / 86400 as period_days
        FROM stake_events
        WHERE address = $1
      `;

    const result = await this.db.query(query, [address]);
    const row = result.rows[0];

    const totalRewards = parseFloat(row.total_rewards) || 0;
    const avgStake = parseFloat(row.avg_stake) || 0;
    const periodDays = days || parseFloat(row.period_days) || 0;

    if (totalRewards === 0 || avgStake === 0 || periodDays === 0) {
      return null;
    }

    // APY = (rewards / stake) * (365 / days) * 100
    const apy = (totalRewards / avgStake) * (365 / periodDays) * 100;
    return Math.round(apy * 100) / 100; // Round to 2 decimals
  }

  /**
   * Calculate staking frequency metrics
   */
  private calculateFrequencyMetrics(
    firstStake: Date,
    lastStake: Date,
    totalStakes: number
  ): Partial<ComprehensiveStats> {
    const totalDays = (lastStake.getTime() - firstStake.getTime()) / (1000 * 60 * 60 * 24);

    if (totalDays === 0 || totalStakes <= 1) {
      return {};
    }

    const avgDaysBetweenStakes = totalDays / (totalStakes - 1);
    const stakesPerWeek = (totalStakes / totalDays) * 7;
    const stakesPerMonth = (totalStakes / totalDays) * 30;

    return {
      avgDaysBetweenStakes: Math.round(avgDaysBetweenStakes * 100) / 100,
      stakesPerWeek: Math.round(stakesPerWeek * 100) / 100,
      stakesPerMonth: Math.round(stakesPerMonth * 100) / 100,
    };
  }

  /**
   * Get record statistics
   */
  private async getRecords(address: string): Promise<Partial<ComprehensiveStats>> {
    // Highest and lowest rewards
    const rewardsQuery = `
      SELECT 
        MAX(reward_amount) as highest_reward,
        (SELECT block_time FROM stake_events WHERE address = $1 ORDER BY reward_amount DESC LIMIT 1) as highest_reward_date,
        MIN(reward_amount) as lowest_reward
      FROM stake_events
      WHERE address = $1
    `;

    const rewardsResult = await this.db.query(rewardsQuery, [address]);
    const rewardsRow = rewardsResult.rows[0];

    // Best and worst months
    const monthlyQuery = `
      SELECT 
        TO_CHAR(block_time, 'YYYY-MM') as month,
        SUM(reward_amount) as total_rewards
      FROM stake_events
      WHERE address = $1
      GROUP BY TO_CHAR(block_time, 'YYYY-MM')
      ORDER BY total_rewards DESC
    `;

    const monthlyResult = await this.db.query(monthlyQuery, [address]);
    const months = monthlyResult.rows;

    return {
      highestReward: parseInt(rewardsRow.highest_reward) || 0,
      highestRewardDate: rewardsRow.highest_reward_date ? new Date(rewardsRow.highest_reward_date) : undefined,
      lowestReward: parseInt(rewardsRow.lowest_reward) || 0,
      bestMonth: months.length > 0 ? months[0].month : undefined,
      bestMonthRewards: months.length > 0 ? parseInt(months[0].total_rewards) : 0,
      worstMonth: months.length > 0 ? months[months.length - 1].month : undefined,
      worstMonthRewards: months.length > 0 ? parseInt(months[months.length - 1].total_rewards) : 0,
    };
  }

  /**
   * Calculate trend indicators
   */
  private async calculateTrends(address: string): Promise<Partial<ComprehensiveStats>> {
    const trends: Partial<ComprehensiveStats> = {};

    // Reward trends
    trends.rewardTrend7d = await this.calculateTrend(address, 'reward', 7);
    trends.rewardTrend30d = await this.calculateTrend(address, 'reward', 30);

    // Efficiency trends
    trends.efficiencyTrend7d = await this.calculateTrend(address, 'efficiency', 7);
    trends.efficiencyTrend30d = await this.calculateTrend(address, 'efficiency', 30);

    // APY trends
    trends.apyTrend7d = await this.calculateTrend(address, 'apy', 7);
    trends.apyTrend30d = await this.calculateTrend(address, 'apy', 30);

    return trends;
  }

  /**
   * Calculate trend direction for a metric
   */
  private async calculateTrend(
    address: string,
    metric: string,
    days: number
  ): Promise<'increasing' | 'stable' | 'decreasing'> {
    // Get values for current period and previous period
    const halfDays = Math.floor(days / 2);

    let query = '';
    if (metric === 'reward') {
      query = `
        SELECT 
          (SELECT SUM(reward_amount) FROM stake_events WHERE address = $1 AND block_time >= NOW() - INTERVAL '${halfDays} days') as recent,
          (SELECT SUM(reward_amount) FROM stake_events WHERE address = $1 AND block_time >= NOW() - INTERVAL '${days} days' AND block_time < NOW() - INTERVAL '${halfDays} days') as previous
      `;
    } else if (metric === 'efficiency') {
      // For efficiency, use staking_timeline if available
      query = `
        SELECT 
          (SELECT AVG(staking_efficiency) FROM staking_timeline WHERE address = $1 AND period_start >= NOW() - INTERVAL '${halfDays} days') as recent,
          (SELECT AVG(staking_efficiency) FROM staking_timeline WHERE address = $1 AND period_start >= NOW() - INTERVAL '${days} days' AND period_start < NOW() - INTERVAL '${halfDays} days') as previous
      `;
    } else if (metric === 'apy') {
      query = `
        SELECT 
          (SELECT AVG(apy) FROM staking_timeline WHERE address = $1 AND period_start >= NOW() - INTERVAL '${halfDays} days') as recent,
          (SELECT AVG(apy) FROM staking_timeline WHERE address = $1 AND period_start >= NOW() - INTERVAL '${days} days' AND period_start < NOW() - INTERVAL '${halfDays} days') as previous
      `;
    }

    try {
      const result = await this.db.query(query, [address]);
      const row = result.rows[0];

      const recent = parseFloat(row.recent) || 0;
      const previous = parseFloat(row.previous) || 0;

      if (previous === 0) return 'stable';

      const change = ((recent - previous) / previous) * 100;

      if (change > 10) return 'increasing';
      if (change < -10) return 'decreasing';
      return 'stable';
    } catch (error) {
      return 'stable';
    }
  }

  /**
   * Calculate network rankings
   */
  private async calculateRankings(
    address: string,
    totalRewards: number
  ): Promise<Partial<ComprehensiveStats>> {
    // Get rank based on total rewards
    const rankQuery = `
      SELECT COUNT(*) + 1 as rank
      FROM verusid_statistics
      WHERE total_rewards_satoshis > $1
    `;

    const rankResult = await this.db.query(rankQuery, [totalRewards]);
    const rank = parseInt(rankResult.rows[0]?.rank) || 0;

    // Get total count for percentile
    const countQuery = `
      SELECT COUNT(*) as total
      FROM verusid_statistics
    `;

    const countResult = await this.db.query(countQuery);
    const total = parseInt(countResult.rows[0]?.total) || 0;

    const percentile = total > 0 ? ((total - rank) / total) * 100 : 0;

    return {
      networkRank: rank,
      networkPercentile: Math.round(percentile * 100) / 100,
    };
  }

  /**
   * Store calculated statistics in database
   */
  async storeStats(stats: ComprehensiveStats): Promise<void> {
    const query = `
      INSERT INTO verusid_statistics (
        address, total_stakes, total_rewards_satoshis, first_stake_time, last_stake_time,
        apy_all_time, apy_yearly, apy_90d, apy_30d, apy_7d,
        roi_all_time, roi_yearly,
        avg_days_between_stakes, stakes_per_week, stakes_per_month,
        staking_efficiency, eligible_utxo_ratio, avg_stake_age, avg_reward_amount_satoshis,
        current_utxos, eligible_utxos, cooldown_utxos,
        total_value_satoshis, eligible_value_satoshis,
        largest_utxo_satoshis, smallest_eligible_satoshis,
        network_rank, network_percentile,
        highest_reward_satoshis, highest_reward_date, lowest_reward_satoshis,
        best_month, best_month_rewards_satoshis, worst_month, worst_month_rewards_satoshis,
        reward_trend_7d, reward_trend_30d,
        efficiency_trend_7d, efficiency_trend_30d,
        apy_trend_7d, apy_trend_30d,
        last_calculated, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
        $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41,
        NOW(), NOW()
      )
      ON CONFLICT (address) DO UPDATE SET
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
        eligible_utxo_ratio = EXCLUDED.eligible_utxo_ratio,
        avg_stake_age = EXCLUDED.avg_stake_age,
        avg_reward_amount_satoshis = EXCLUDED.avg_reward_amount_satoshis,
        current_utxos = EXCLUDED.current_utxos,
        eligible_utxos = EXCLUDED.eligible_utxos,
        cooldown_utxos = EXCLUDED.cooldown_utxos,
        total_value_satoshis = EXCLUDED.total_value_satoshis,
        eligible_value_satoshis = EXCLUDED.eligible_value_satoshis,
        largest_utxo_satoshis = EXCLUDED.largest_utxo_satoshis,
        smallest_eligible_satoshis = EXCLUDED.smallest_eligible_satoshis,
        network_rank = EXCLUDED.network_rank,
        network_percentile = EXCLUDED.network_percentile,
        highest_reward_satoshis = EXCLUDED.highest_reward_satoshis,
        highest_reward_date = EXCLUDED.highest_reward_date,
        lowest_reward_satoshis = EXCLUDED.lowest_reward_satoshis,
        best_month = EXCLUDED.best_month,
        best_month_rewards_satoshis = EXCLUDED.best_month_rewards_satoshis,
        worst_month = EXCLUDED.worst_month,
        worst_month_rewards_satoshis = EXCLUDED.worst_month_rewards_satoshis,
        reward_trend_7d = EXCLUDED.reward_trend_7d,
        reward_trend_30d = EXCLUDED.reward_trend_30d,
        efficiency_trend_7d = EXCLUDED.efficiency_trend_7d,
        efficiency_trend_30d = EXCLUDED.efficiency_trend_30d,
        apy_trend_7d = EXCLUDED.apy_trend_7d,
        apy_trend_30d = EXCLUDED.apy_trend_30d,
        last_calculated = NOW(),
        updated_at = NOW()
    `;

    const values = [
      stats.address,
      stats.totalStakes,
      stats.totalRewards,
      stats.firstStake,
      stats.lastStake,
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
      stats.eligibleUtxoRatio,
      stats.avgStakeAge,
      stats.avgRewardAmount,
      stats.currentUtxos,
      stats.eligibleUtxos,
      stats.cooldownUtxos,
      stats.totalValue,
      stats.eligibleValue,
      stats.largestUtxo,
      stats.smallestEligible,
      stats.networkRank,
      stats.networkPercentile,
      stats.highestReward,
      stats.highestRewardDate,
      stats.lowestReward,
      stats.bestMonth,
      stats.bestMonthRewards,
      stats.worstMonth,
      stats.worstMonthRewards,
      stats.rewardTrend7d,
      stats.rewardTrend30d,
      stats.efficiencyTrend7d,
      stats.efficiencyTrend30d,
      stats.apyTrend7d,
      stats.apyTrend30d,
    ];

    await this.db.query(query, values);
  }
}

