import { type Pool } from 'pg';

export interface AchievementDefinition {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: 'milestone' | 'performance' | 'consistency' | 'special' | 'elite';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary';
  requirements: Record<string, any>;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  is_active: boolean;
}

export interface EarnedAchievement {
  id: number;
  identity_address: string;
  achievement_slug: string;
  unlocked_at: string;
  unlock_value?: number;
  // Joined with achievement_definitions
  name: string;
  description: string;
  icon: string;
  category: string;
  tier: string;
  rarity: string;
}

export interface AchievementProgress {
  identity_address: string;
  achievement_slug: string;
  current_value: number;
  target_value: number;
  percentage: number;
  last_updated: string;
  // Joined with achievement_definitions
  name: string;
  description: string;
  icon: string;
  category: string;
  tier: string;
}

export interface StakingStats {
  total_stakes: number;
  total_rewards_satoshis: number;
  highest_reward_satoshis: number;
  first_stake_time: string;
  last_stake_time: string;
  staking_efficiency: number;
  stakes_per_week: number;
  avg_days_between_stakes: number;
  best_month_rewards_satoshis: number;
  longest_dry_spell_days: number;
  network_rank: number;
  network_percentile: number;
}

export interface StakingHistory {
  block_time: string;
  amount_sats: number;
}

export class AchievementService {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  /**
   * Get all achievement definitions
   */
  async getAchievementDefinitions(): Promise<AchievementDefinition[]> {
    const query = `
      SELECT id, slug, name, description, icon, category, tier, requirements, rarity, is_active
      FROM achievement_definitions
      WHERE is_active = true
      ORDER BY
        CASE tier
          WHEN 'bronze' THEN 1
          WHEN 'silver' THEN 2
          WHEN 'gold' THEN 3
          WHEN 'platinum' THEN 4
          WHEN 'legendary' THEN 5
        END,
        name
    `;

    const result = await this.db.query(query);
    return result.rows;
  }

  /**
   * Get earned achievements for a VerusID
   */
  async getEarnedAchievements(
    identityAddress: string
  ): Promise<EarnedAchievement[]> {
    const query = `
      SELECT
        va.id,
        va.identity_address,
        va.achievement_slug,
        va.unlocked_at,
        va.unlock_value,
        ad.name,
        ad.description,
        ad.icon,
        ad.category,
        ad.tier,
        ad.rarity
      FROM verusid_achievements va
      JOIN achievement_definitions ad ON va.achievement_slug = ad.slug
      WHERE va.identity_address = $1
      ORDER BY va.unlocked_at DESC
    `;

    const result = await this.db.query(query, [identityAddress]);
    return result.rows;
  }

  /**
   * Get progress toward unearned badges
   */
  async getAchievementProgress(
    identityAddress: string
  ): Promise<AchievementProgress[]> {
    const query = `
      SELECT
        ap.identity_address,
        ap.achievement_slug,
        ap.current_value,
        ap.target_value,
        ap.percentage,
        ap.last_updated,
        ad.name,
        ad.description,
        ad.icon,
        ad.category,
        ad.tier
      FROM achievement_progress ap
      JOIN achievement_definitions ad ON ap.achievement_slug = ad.slug
      WHERE ap.identity_address = $1
      ORDER BY ap.percentage DESC, ad.tier
    `;

    const result = await this.db.query(query, [identityAddress]);
    return result.rows;
  }

  /**
   * Evaluate all achievements for a VerusID based on their stats and history
   */
  async evaluateAchievements(
    identityAddress: string,
    stats: StakingStats,
    history: StakingHistory[]
  ): Promise<{ unlocked: string[]; progress: AchievementProgress[] }> {
    const definitions = await this.getAchievementDefinitions();
    const earnedSlugs = new Set(
      (await this.getEarnedAchievements(identityAddress)).map(
        a => a.achievement_slug
      )
    );

    const unlocked: string[] = [];
    const progress: AchievementProgress[] = [];

    for (const definition of definitions) {
      if (earnedSlugs.has(definition.slug)) {
        continue; // Already earned
      }

      const evaluation = await this.evaluateAchievement(
        definition,
        stats,
        history
      );

      if (evaluation.earned) {
        await this.unlockBadge(
          identityAddress,
          definition.slug,
          evaluation.unlockValue
        );
        unlocked.push(definition.slug);
      } else {
        // Update progress
        await this.updateProgress(
          identityAddress,
          definition.slug,
          evaluation.current,
          evaluation.target
        );
        progress.push({
          identity_address: identityAddress,
          achievement_slug: definition.slug,
          current_value: evaluation.current,
          target_value: evaluation.target,
          percentage:
            evaluation.target > 0
              ? (evaluation.current / evaluation.target) * 100
              : 0,
          last_updated: new Date().toISOString(),
          name: definition.name,
          description: definition.description,
          icon: definition.icon,
          category: definition.category,
          tier: definition.tier,
        });
      }
    }

    return { unlocked, progress };
  }

  /**
   * Evaluate a single achievement against stats and history
   */
  private async evaluateAchievement(
    definition: AchievementDefinition,
    stats: StakingStats,
    history: StakingHistory[]
  ): Promise<{
    earned: boolean;
    current: number;
    target: number;
    unlockValue?: number;
  }> {
    const { type, operator, value } = definition.requirements;

    switch (type) {
      case 'stake_count':
        return this.evaluateNumeric(stats.total_stakes, operator, value);

      case 'total_rewards':
        const totalRewardsVRSC = stats.total_rewards_satoshis / 100000000;
        return this.evaluateNumeric(totalRewardsVRSC, operator, value);

      case 'highest_reward':
        const highestRewardVRSC = stats.highest_reward_satoshis / 100000000;
        return this.evaluateNumeric(highestRewardVRSC, operator, value);

      case 'staking_efficiency':
        return this.evaluateNumeric(stats.staking_efficiency, operator, value);

      case 'consistency_streak':
        return this.evaluateConsistencyStreak(history, operator, value);

      case 'consecutive_days':
        return this.evaluateConsecutiveDays(history, operator, value);

      case 'days_active':
        const daysActive = Math.floor(
          (new Date(stats.last_stake_time).getTime() -
            new Date(stats.first_stake_time).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        return this.evaluateNumeric(daysActive, operator, value);

      case 'first_stake_before':
        const firstStakeDate = new Date(stats.first_stake_time);
        const targetDate = new Date(value);
        return this.evaluateNumeric(
          firstStakeDate.getTime(),
          '<',
          targetDate.getTime()
        );

      case 'best_month_achieved':
        const bestMonthVRSC = stats.best_month_rewards_satoshis / 100000000;
        return this.evaluateNumeric(bestMonthVRSC, operator, value);

      case 'returned_after_dry_spell':
        return this.evaluateNumeric(
          stats.longest_dry_spell_days,
          operator,
          value
        );

      case 'network_percentile':
        return this.evaluateNumeric(stats.network_percentile, operator, value);

      case 'early_staker_rank':
        return this.evaluateNumeric(stats.network_rank, operator, value);

      default:
        console.warn(`Unknown achievement type: ${type}`);
        return { earned: false, current: 0, target: 1 };
    }
  }

  /**
   * Evaluate numeric comparisons
   */
  private evaluateNumeric(
    current: number,
    operator: string,
    target: number
  ): {
    earned: boolean;
    current: number;
    target: number;
    unlockValue?: number;
  } {
    let earned = false;

    switch (operator) {
      case '>=':
        earned = current >= target;
        break;
      case '>':
        earned = current > target;
        break;
      case '<=':
        earned = current <= target;
        break;
      case '<':
        earned = current < target;
        break;
      case '=':
        earned = current === target;
        break;
    }

    return {
      earned,
      current,
      target,
      unlockValue: earned ? current : undefined,
    };
  }

  /**
   * Evaluate consistency streak (consecutive days with stakes)
   */
  private async evaluateConsistencyStreak(
    history: StakingHistory[],
    operator: string,
    targetDays: number
  ): Promise<{
    earned: boolean;
    current: number;
    target: number;
    unlockValue?: number;
  }> {
    if (history.length === 0) {
      return { earned: false, current: 0, target: targetDays };
    }

    // Group stakes by day and calculate consecutive days
    const stakesByDay = new Map<string, number>();
    history.forEach(stake => {
      if (stake.block_time) {
        const day = stake.block_time.split('T')[0];
        if (day) {
          stakesByDay.set(day, (stakesByDay.get(day) || 0) + 1);
        }
      }
    });

    const sortedDays = Array.from(stakesByDay.keys()).sort();
    let maxConsecutive = 0;
    let currentConsecutive = 0;

    for (let i = 0; i < sortedDays.length; i++) {
      const prevDay = sortedDays[i - 1];
      const currentDay = sortedDays[i];
      if (i === 0 || (prevDay && currentDay && this.isConsecutiveDay(prevDay, currentDay))) {
        currentConsecutive++;
      } else {
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
        currentConsecutive = 1;
      }
    }
    maxConsecutive = Math.max(maxConsecutive, currentConsecutive);

    const earned = operator === '>=' ? maxConsecutive >= targetDays : false;
    return {
      earned,
      current: maxConsecutive,
      target: targetDays,
      unlockValue: earned ? maxConsecutive : undefined,
    };
  }

  /**
   * Evaluate consecutive days with at least one stake
   */
  private async evaluateConsecutiveDays(
    history: StakingHistory[],
    operator: string,
    targetDays: number
  ): Promise<{
    earned: boolean;
    current: number;
    target: number;
    unlockValue?: number;
  }> {
    if (history.length === 0) {
      return { earned: false, current: 0, target: targetDays };
    }

    const stakesByDay = new Set<string>();
    history.forEach(stake => {
      if (stake.block_time) {
        const day = stake.block_time.split('T')[0];
        if (day) {
          stakesByDay.add(day);
        }
      }
    });

    const sortedDays = Array.from(stakesByDay).sort();
    let maxConsecutive = 0;
    let currentConsecutive = 0;

    for (let i = 0; i < sortedDays.length; i++) {
      const prevDay = sortedDays[i - 1];
      const currentDay = sortedDays[i];
      if (i === 0 || (prevDay && currentDay && this.isConsecutiveDay(prevDay, currentDay))) {
        currentConsecutive++;
      } else {
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
        currentConsecutive = 1;
      }
    }
    maxConsecutive = Math.max(maxConsecutive, currentConsecutive);

    const earned = operator === '>=' ? maxConsecutive >= targetDays : false;
    return {
      earned,
      current: maxConsecutive,
      target: targetDays,
      unlockValue: earned ? maxConsecutive : undefined,
    };
  }

  /**
   * Check if two date strings represent consecutive days
   */
  private isConsecutiveDay(day1: string, day2: string): boolean {
    const date1 = new Date(day1);
    const date2 = new Date(day2);
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
  }

  /**
   * Unlock a badge for a VerusID
   */
  async unlockBadge(
    identityAddress: string,
    achievementSlug: string,
    unlockValue?: number
  ): Promise<void> {
    const query = `
      INSERT INTO verusid_achievements (identity_address, achievement_slug, unlocked_at, unlock_value)
      VALUES ($1, $2, NOW(), $3)
      ON CONFLICT (identity_address, achievement_slug) DO NOTHING
    `;

    await this.db.query(query, [identityAddress, achievementSlug, unlockValue]);

    // Remove from progress table
    await this.db.query(
      'DELETE FROM achievement_progress WHERE identity_address = $1 AND achievement_slug = $2',
      [identityAddress, achievementSlug]
    );
  }

  /**
   * Update progress toward a badge
   */
  async updateProgress(
    identityAddress: string,
    achievementSlug: string,
    currentValue: number,
    targetValue: number
  ): Promise<void> {
    const query = `
      INSERT INTO achievement_progress (identity_address, achievement_slug, current_value, target_value)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (identity_address, achievement_slug)
      DO UPDATE SET
        current_value = $3,
        target_value = $4,
        last_updated = NOW()
    `;

    await this.db.query(query, [
      identityAddress,
      achievementSlug,
      currentValue,
      targetValue,
    ]);
  }

  /**
   * Get badge rarity statistics
   */
  async getBadgeRarity(): Promise<Record<string, number>> {
    const query = `
      SELECT
        ad.rarity,
        COUNT(ad.id) as total_badges,
        COUNT(va.id) as earned_count,
        ROUND((COUNT(va.id)::numeric / COUNT(ad.id)) * 100, 2) as percentage
      FROM achievement_definitions ad
      LEFT JOIN verusid_achievements va ON ad.slug = va.achievement_slug
      WHERE ad.is_active = true
      GROUP BY ad.rarity
      ORDER BY
        CASE ad.rarity
          WHEN 'common' THEN 1
          WHEN 'uncommon' THEN 2
          WHEN 'rare' THEN 3
          WHEN 'epic' THEN 4
          WHEN 'legendary' THEN 5
        END
    `;

    const result = await this.db.query(query);
    const rarity: Record<string, number> = {};

    result.rows.forEach(row => {
      rarity[row.rarity] = row.earned_count;
    });

    return rarity;
  }

  /**
   * Get recent unlocks (last 7 days)
   */
  async getRecentUnlocks(
    identityAddress: string,
    days: number = 7
  ): Promise<EarnedAchievement[]> {
    const query = `
      SELECT
        va.id,
        va.identity_address,
        va.achievement_slug,
        va.unlocked_at,
        va.unlock_value,
        ad.name,
        ad.description,
        ad.icon,
        ad.category,
        ad.tier,
        ad.rarity
      FROM verusid_achievements va
      JOIN achievement_definitions ad ON va.achievement_slug = ad.slug
      WHERE va.identity_address = $1
        AND va.unlocked_at >= NOW() - INTERVAL '${days} days'
      ORDER BY va.unlocked_at DESC
    `;

    const result = await this.db.query(query, [identityAddress]);
    return result.rows;
  }
}
