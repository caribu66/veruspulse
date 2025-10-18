#!/usr/bin/env node

/**
 * Achievement Evaluation Script
 * Evaluates and unlocks achievements for all VerusIDs based on their staking history
 */

const { Pool } = require('pg');

// Configuration
const dbConfig = {
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://verus_user:verus_secure_2024@localhost:5432/verus_utxo_db',
  max: 10,
};

class AchievementEvaluator {
  constructor() {
    this.db = new Pool(dbConfig);
    this.processedCount = 0;
    this.unlockedCount = 0;
    this.errorCount = 0;
  }

  async evaluateAllAchievements() {
    console.log('🏆 Starting achievement evaluation for all VerusIDs...\n');

    try {
      // Get all VerusIDs with statistics
      const statsQuery = `
        SELECT 
          vs.address,
          vs.friendly_name,
          vs.total_stakes,
          vs.total_rewards_satoshis,
          vs.highest_reward_satoshis,
          vs.first_stake_time,
          vs.last_stake_time,
          vs.staking_efficiency,
          vs.stakes_per_week,
          vs.avg_days_between_stakes,
          vs.best_month_rewards_satoshis,
          vs.worst_month_rewards_satoshis,
          vs.longest_dry_spell_days,
          vs.current_streak_days,
          vs.network_rank,
          vs.network_percentile
        FROM verusid_statistics vs
        WHERE vs.total_stakes > 0
        ORDER BY vs.total_stakes DESC
      `;

      const statsResult = await this.db.query(statsQuery);
      const verusIds = statsResult.rows;

      console.log(
        `📊 Found ${verusIds.length} VerusIDs with staking activity\n`
      );

      // Process each VerusID
      for (const verusId of verusIds) {
        await this.evaluateVerusIdAchievements(verusId);
        this.processedCount++;

        // Progress indicator
        if (this.processedCount % 10 === 0) {
          console.log(
            `⏳ Processed ${this.processedCount}/${verusIds.length} VerusIDs...`
          );
        }
      }

      // Final summary
      console.log('\n' + '='.repeat(60));
      console.log('🎉 ACHIEVEMENT EVALUATION COMPLETE');
      console.log('='.repeat(60));
      console.log(`📈 Total VerusIDs processed: ${this.processedCount}`);
      console.log(`🏆 Total badges unlocked: ${this.unlockedCount}`);
      console.log(`❌ Errors encountered: ${this.errorCount}`);
      console.log('='.repeat(60));
    } catch (error) {
      console.error('❌ Fatal error during evaluation:', error);
      this.errorCount++;
    } finally {
      await this.db.end();
    }
  }

  async evaluateVerusIdAchievements(verusId) {
    try {
      const { address, friendly_name } = verusId;

      // Get staking history for this VerusID
      const historyQuery = `
        SELECT 
          block_time,
          amount_sats
        FROM staking_rewards
        WHERE identity_address = $1
        ORDER BY block_time ASC
      `;

      const historyResult = await this.db.query(historyQuery, [address]);
      const history = historyResult.rows;

      if (history.length === 0) {
        return; // No history, skip
      }

      // Evaluate achievements
      const achievements = await this.evaluateAchievements(verusId, history);

      // Log newly unlocked achievements
      if (achievements.unlocked.length > 0) {
        console.log(
          `\n🎉 ${friendly_name || address} unlocked ${achievements.unlocked.length} badges:`
        );
        for (const badge of achievements.unlocked) {
          console.log(`   ✅ ${badge.name} (${badge.tier})`);
          this.unlockedCount++;
        }
      }
    } catch (error) {
      console.error(
        `❌ Error evaluating ${verusId.friendly_name || verusId.address}:`,
        error.message
      );
      this.errorCount++;
    }
  }

  async evaluateAchievements(stats, history) {
    const { address } = stats;
    const unlocked = [];

    // Get all achievement definitions
    const definitionsQuery = `
      SELECT slug, name, description, icon, category, tier, requirements, rarity
      FROM achievement_definitions
      WHERE is_active = true
    `;

    const definitionsResult = await this.db.query(definitionsQuery);
    const definitions = definitionsResult.rows;

    // Get already earned achievements
    const earnedQuery = `
      SELECT achievement_slug
      FROM verusid_achievements
      WHERE identity_address = $1
    `;

    const earnedResult = await this.db.query(earnedQuery, [address]);
    const earnedSlugs = new Set(
      earnedResult.rows.map(row => row.achievement_slug)
    );

    // Evaluate each definition
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
        // Unlock the badge with the actual unlock date
        const unlockDate = evaluation.unlockDate || new Date().toISOString();
        await this.unlockBadge(
          address,
          definition.slug,
          evaluation.unlockValue,
          unlockDate
        );
        unlocked.push({
          name: definition.name,
          tier: definition.tier,
          slug: definition.slug,
        });
      }
    }

    return { unlocked };
  }

  async evaluateAchievement(definition, stats, history) {
    const { type, operator, value } = definition.requirements;

    switch (type) {
      case 'stake_count':
        return this.evaluateStakeCount(history, operator, value);

      case 'total_rewards':
        return this.evaluateTotalRewards(history, operator, value);

      case 'highest_reward':
        return this.evaluateHighestReward(history, operator, value);

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
        return this.evaluateDaysActive(stats.first_stake_time, operator, value);

      case 'first_stake_before':
        const firstStakeDate = new Date(stats.first_stake_time);
        const targetDate = new Date(value);
        return this.evaluateNumeric(
          firstStakeDate.getTime(),
          '<',
          targetDate.getTime(),
          stats.first_stake_time
        );

      case 'best_month_achieved':
        return this.evaluateBestMonth(
          history,
          stats.best_month_rewards_satoshis,
          operator,
          value
        );

      case 'returned_after_dry_spell':
        return this.evaluateNumeric(
          stats.longest_dry_spell_days,
          operator,
          value
        );

      case 'network_percentile':
        return this.evaluateNumeric(stats.network_percentile, operator, value);

      case 'early_staker_rank':
        return this.evaluateEarlyStakerRank(
          stats.network_rank,
          stats.first_stake_time,
          operator,
          value
        );

      default:
        console.warn(`Unknown achievement type: ${type}`);
        return { earned: false, current: 0, target: 1 };
    }
  }

  evaluateNumeric(current, operator, target, unlockDate = null) {
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
      unlockDate,
    };
  }

  // Evaluate stake count with actual unlock date
  evaluateStakeCount(history, operator, target) {
    if (history.length === 0) {
      return { earned: false, current: 0, target };
    }

    let unlockDate = null;
    let current = history.length;

    // Find when the target was first reached
    if (operator === '>=' && history.length >= target) {
      // Find the stake that pushed us over the target
      unlockDate = history[target - 1].block_time;
    } else if (operator === '>' && history.length > target) {
      unlockDate = history[target].block_time;
    }

    const earned = this.evaluateNumeric(current, operator, target).earned;
    return {
      earned,
      current,
      target,
      unlockValue: earned ? current : undefined,
      unlockDate,
    };
  }

  // Evaluate total rewards with actual unlock date
  evaluateTotalRewards(history, operator, target) {
    if (history.length === 0) {
      return { earned: false, current: 0, target };
    }

    let cumulativeRewards = 0;
    let unlockDate = null;
    const targetSats = target * 100000000; // Convert VRSC to satoshis

    for (const stake of history) {
      cumulativeRewards += stake.amount_sats;

      if (!unlockDate) {
        if (operator === '>=' && cumulativeRewards >= targetSats) {
          unlockDate = stake.block_time;
        } else if (operator === '>' && cumulativeRewards > targetSats) {
          unlockDate = stake.block_time;
        }
      }
    }

    const current = cumulativeRewards / 100000000; // Convert back to VRSC
    const earned = this.evaluateNumeric(current, operator, target).earned;
    return {
      earned,
      current,
      target,
      unlockValue: earned ? current : undefined,
      unlockDate,
    };
  }

  // Evaluate highest reward with actual unlock date
  evaluateHighestReward(history, operator, target) {
    if (history.length === 0) {
      return { earned: false, current: 0, target };
    }

    let highestReward = 0;
    let unlockDate = null;
    const targetSats = target * 100000000;

    for (const stake of history) {
      if (stake.amount_sats > highestReward) {
        highestReward = stake.amount_sats;

        if (
          !unlockDate &&
          this.evaluateNumeric(highestReward / 100000000, operator, target)
            .earned
        ) {
          unlockDate = stake.block_time;
        }
      }
    }

    const current = highestReward / 100000000;
    const earned = this.evaluateNumeric(current, operator, target).earned;
    return {
      earned,
      current,
      target,
      unlockValue: earned ? current : undefined,
      unlockDate,
    };
  }

  // Evaluate days active with actual unlock date
  evaluateDaysActive(firstStakeTime, operator, target) {
    const firstStakeDate = new Date(firstStakeTime);
    const currentDate = new Date();
    const daysActive = Math.floor(
      (currentDate.getTime() - firstStakeDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const earned = this.evaluateNumeric(daysActive, operator, target).earned;
    // For days active, we can't determine the exact unlock date without more complex logic
    // So we'll use the first stake time as a reasonable approximation
    const unlockDate = earned ? firstStakeTime : null;

    return {
      earned,
      current: daysActive,
      target,
      unlockValue: earned ? daysActive : undefined,
      unlockDate,
    };
  }

  // Evaluate best month achievement with actual unlock date
  evaluateBestMonth(history, bestMonthRewardsSats, operator, value) {
    if (history.length === 0) {
      return { earned: false, current: 0, target: value };
    }

    const bestMonthVRSC = bestMonthRewardsSats / 100000000;
    const earned = this.evaluateNumeric(bestMonthVRSC, operator, value).earned;

    let unlockDate = null;
    if (earned) {
      // Find the month with the highest rewards
      const monthlyRewards = new Map();

      history.forEach(stake => {
        const monthKey = new Date(stake.block_time)
          .toISOString()
          .substring(0, 7); // YYYY-MM
        monthlyRewards.set(
          monthKey,
          (monthlyRewards.get(monthKey) || 0) + stake.amount_sats
        );
      });

      let maxRewards = 0;
      let bestMonth = null;

      for (const [month, rewards] of monthlyRewards) {
        if (rewards > maxRewards) {
          maxRewards = rewards;
          bestMonth = month;
        }
      }

      if (bestMonth) {
        // Find the last stake of the best month
        const bestMonthStakes = history.filter(
          stake =>
            new Date(stake.block_time).toISOString().substring(0, 7) ===
            bestMonth
        );

        if (bestMonthStakes.length > 0) {
          // Use the last stake of the best month as unlock date
          unlockDate = bestMonthStakes[bestMonthStakes.length - 1].block_time;
        }
      }
    }

    return {
      earned,
      current: bestMonthVRSC,
      target: value,
      unlockValue: earned ? bestMonthVRSC : undefined,
      unlockDate,
    };
  }

  // Evaluate early staker rank (Genesis/Founding Member)
  evaluateEarlyStakerRank(networkRank, firstStakeTime, operator, value) {
    const earned = this.evaluateNumeric(networkRank, operator, value).earned;

    // For early staker achievements, use the first stake time as unlock date
    const unlockDate = earned ? firstStakeTime : null;

    return {
      earned,
      current: networkRank,
      target: value,
      unlockValue: earned ? networkRank : undefined,
      unlockDate,
    };
  }

  async evaluateConsistencyStreak(history, operator, targetDays) {
    if (history.length === 0) {
      return { earned: false, current: 0, target: targetDays };
    }

    // Group stakes by day and calculate consecutive days
    const stakesByDay = new Map();
    history.forEach(stake => {
      const day = new Date(stake.block_time).toISOString().split('T')[0];
      stakesByDay.set(day, (stakesByDay.get(day) || 0) + 1);
    });

    const sortedDays = Array.from(stakesByDay.keys()).sort();
    let maxConsecutive = 0;
    let currentConsecutive = 0;
    let unlockDate = null;
    let streakStartIndex = 0;

    for (let i = 0; i < sortedDays.length; i++) {
      if (i === 0 || this.isConsecutiveDay(sortedDays[i - 1], sortedDays[i])) {
        currentConsecutive++;
      } else {
        if (currentConsecutive > maxConsecutive) {
          maxConsecutive = currentConsecutive;
          // Find the actual stake date for the end of this streak
          if (maxConsecutive >= targetDays && !unlockDate) {
            unlockDate = new Date(
              sortedDays[streakStartIndex + targetDays - 1] + 'T23:59:59Z'
            ).toISOString();
          }
        }
        currentConsecutive = 1;
        streakStartIndex = i;
      }
    }

    if (currentConsecutive > maxConsecutive) {
      maxConsecutive = currentConsecutive;
      if (maxConsecutive >= targetDays && !unlockDate) {
        unlockDate = new Date(
          sortedDays[streakStartIndex + targetDays - 1] + 'T23:59:59Z'
        ).toISOString();
      }
    }

    const earned = operator === '>=' ? maxConsecutive >= targetDays : false;
    return {
      earned,
      current: maxConsecutive,
      target: targetDays,
      unlockValue: earned ? maxConsecutive : undefined,
      unlockDate,
    };
  }

  async evaluateConsecutiveDays(history, operator, targetDays) {
    if (history.length === 0) {
      return { earned: false, current: 0, target: targetDays };
    }

    const stakesByDay = new Set();
    history.forEach(stake => {
      const day = new Date(stake.block_time).toISOString().split('T')[0];
      stakesByDay.add(day);
    });

    const sortedDays = Array.from(stakesByDay).sort();
    let maxConsecutive = 0;
    let currentConsecutive = 0;
    let unlockDate = null;
    let streakStartIndex = 0;

    for (let i = 0; i < sortedDays.length; i++) {
      if (i === 0 || this.isConsecutiveDay(sortedDays[i - 1], sortedDays[i])) {
        currentConsecutive++;
      } else {
        if (currentConsecutive > maxConsecutive) {
          maxConsecutive = currentConsecutive;
          if (maxConsecutive >= targetDays && !unlockDate) {
            unlockDate = new Date(
              sortedDays[streakStartIndex + targetDays - 1] + 'T23:59:59Z'
            ).toISOString();
          }
        }
        currentConsecutive = 1;
        streakStartIndex = i;
      }
    }

    if (currentConsecutive > maxConsecutive) {
      maxConsecutive = currentConsecutive;
      if (maxConsecutive >= targetDays && !unlockDate) {
        unlockDate = new Date(
          sortedDays[streakStartIndex + targetDays - 1] + 'T23:59:59Z'
        ).toISOString();
      }
    }

    const earned = operator === '>=' ? maxConsecutive >= targetDays : false;
    return {
      earned,
      current: maxConsecutive,
      target: targetDays,
      unlockValue: earned ? maxConsecutive : undefined,
      unlockDate,
    };
  }

  isConsecutiveDay(day1, day2) {
    const date1 = new Date(day1);
    const date2 = new Date(day2);
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
  }

  async unlockBadge(identityAddress, achievementSlug, unlockValue, unlockDate) {
    const query = `
      INSERT INTO verusid_achievements (identity_address, achievement_slug, unlocked_at, unlock_value)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (identity_address, achievement_slug) DO NOTHING
    `;

    await this.db.query(query, [
      identityAddress,
      achievementSlug,
      unlockDate || new Date(),
      unlockValue,
    ]);

    // Remove from progress table
    await this.db.query(
      'DELETE FROM achievement_progress WHERE identity_address = $1 AND achievement_slug = $2',
      [identityAddress, achievementSlug]
    );
  }
}

// Main execution
if (require.main === module) {
  const evaluator = new AchievementEvaluator();
  evaluator.evaluateAllAchievements().catch(console.error);
}

module.exports = AchievementEvaluator;
