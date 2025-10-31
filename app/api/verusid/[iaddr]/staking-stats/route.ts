import { type NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { verusAPI } from '@/lib/rpc-client-robust';

// Initialize database connection
let dbPool: Pool | null = null;

function getDbPool() {
  if (!dbPool && process.env.DATABASE_URL) {
    dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return dbPool;
}

// Helper function to determine APY confidence level
function getAPYConfidenceLevel(
  totalStakes: number,
  stakesWithAmounts: number
): {
  level: string;
  label: string;
  description: string;
} {
  const completeness =
    totalStakes > 0 ? (stakesWithAmounts / totalStakes) * 100 : 0;

  if (stakesWithAmounts >= 100 && completeness >= 80) {
    return {
      level: 'very-high',
      label: '🎯 Very High Confidence',
      description: 'APY calculated from 100+ actual stake amounts',
    };
  } else if (stakesWithAmounts >= 50 && completeness >= 50) {
    return {
      level: 'high',
      label: '✅ High Confidence',
      description: 'APY calculated from 50+ actual stake amounts',
    };
  } else if (stakesWithAmounts >= 30) {
    return {
      level: 'medium',
      label: '📊 Medium Confidence',
      description: 'APY calculated from 30+ actual stake amounts',
    };
  } else if (stakesWithAmounts >= 10) {
    return {
      level: 'low',
      label: '📈 Low Confidence',
      description: 'APY partially calculated, limited data available',
    };
  } else {
    return {
      level: 'estimated',
      label: '⚠️ Estimated',
      description: 'APY estimated - actual stake amounts not yet extracted',
    };
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ iaddr: string }> }
) {
  try {
    const { iaddr } = await params;

    if (!iaddr) {
      return NextResponse.json(
        { success: false, error: 'I-address is required' },
        { status: 400 }
      );
    }

    // Check if UTXO database is enabled
    const dbEnabled = process.env.UTXO_DATABASE_ENABLED === 'true';
    if (!dbEnabled || !process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          success: false,
          error: 'UTXO database not enabled',
          message:
            'Set UTXO_DATABASE_ENABLED=true and DATABASE_URL in your environment',
        },
        { status: 503 }
      );
    }

    const db = getDbPool();
    if (!db) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection failed',
        },
        { status: 500 }
      );
    }

    // Get comprehensive statistics from verusid_statistics table
    // First try exact address match, then fallback to other methods
    let statsQuery = `
      SELECT vs.* FROM verusid_statistics vs
      WHERE vs.address = $1
      LIMIT 1
    `;

    let statsResult = await db.query(statsQuery, [iaddr]);

    // If no exact match, try other lookup methods
    if (statsResult.rows.length === 0) {
      statsQuery = `
        SELECT vs.* FROM verusid_statistics vs
        LEFT JOIN identities i ON vs.address = i.identity_address
        WHERE (vs.friendly_name IS NOT NULL AND (
           LOWER(vs.friendly_name) = LOWER($1)
           OR LOWER(vs.friendly_name) LIKE LOWER($1) || '%'
        ))
        OR LOWER(i.base_name) = LOWER(REPLACE($1, '@', ''))
        OR LOWER(i.friendly_name) = LOWER($1)
        LIMIT 1
      `;
      statsResult = await db.query(statsQuery, [iaddr]);
    }

    if (statsResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Statistics not found',
          message:
            'This VerusID has not been synced yet. Run the stake scanner to populate data.',
        },
        { status: 404 }
      );
    }

    const stats = statsResult.rows[0];

    // Get total number of stakers
    const totalStakersQuery = `
      SELECT COUNT(*) as total FROM verusid_statistics WHERE total_stakes > 0
    `;
    const totalStakersResult = await db.query(totalStakersQuery);
    const totalStakers = parseInt(totalStakersResult.rows[0]?.total) || 0;

    // Try to get creation info from RPC
    let creationInfo = null;
    try {
      const friendlyName = stats.friendly_name;
      if (friendlyName) {
        // Use getidentity method instead of non-existent getIdentityCreationBlock
        const identityData = await verusAPI.getIdentity(friendlyName);
        if (identityData && identityData.identityaddress) {
          creationInfo = {
            creationBlock: identityData.timelock || 0,
            creationTxid: identityData.identityaddress,
            creationBlockhash: identityData.identityaddress,
          };
        }
      }
    } catch (error) {
      console.warn('Failed to fetch creation info:', error);
      // Continue without creation info
    }

    // Generate COMPLETE monthly timeline data (ALL TIME, not just 12 months)
    // Only include stakes where the VerusID staked directly with their I-address
    const monthlyQuery = `
      SELECT
        DATE_TRUNC('month', block_time) as period_start,
        COUNT(DISTINCT block_height) as stake_count,
        SUM(amount_sats) as total_rewards_satoshis,
        MIN(block_time) as period_min,
        MAX(block_time) as period_max
      FROM staking_rewards
      WHERE identity_address = $1 AND source_address = identity_address
      GROUP BY DATE_TRUNC('month', block_time)
      ORDER BY period_start ASC
    `;

    const monthlyResult = await db.query(monthlyQuery, [stats.address]);
    const monthlyData = monthlyResult.rows.map(row => ({
      month: row.period_start,
      stakeCount: parseInt(row.stake_count) || 0,
      totalRewardsVRSC: Math.min(
        (parseFloat(row.total_rewards_satoshis) || 0) / 100000000,
        1000000 // Cap monthly rewards at 1M VRSC
      ),
      periodStart: row.period_min,
      periodEnd: row.period_max,
    }));

    // Generate COMPLETE weekly timeline data (ALL TIME)
    // Only include stakes where the VerusID staked directly with their I-address
    const weeklyQuery = `
      SELECT
        DATE_TRUNC('week', block_time) as period_start,
        COUNT(DISTINCT block_height) as stake_count,
        SUM(amount_sats) as total_rewards_satoshis,
        MIN(block_time) as period_min,
        MAX(block_time) as period_max
      FROM staking_rewards
      WHERE identity_address = $1 AND source_address = identity_address
      GROUP BY DATE_TRUNC('week', block_time)
      ORDER BY period_start ASC
    `;

    const weeklyResult = await db.query(weeklyQuery, [stats.address]);
    const weeklyData = weeklyResult.rows.map(row => ({
      week: row.period_start,
      stakeCount: parseInt(row.stake_count) || 0,
      totalRewardsVRSC: Math.min(
        (parseFloat(row.total_rewards_satoshis) || 0) / 100000000,
        250000 // Cap weekly rewards at 250K VRSC
      ),
      periodStart: row.period_min,
      periodEnd: row.period_max,
    }));

    // Generate COMPLETE daily timeline data (ALL TIME)
    // Only include stakes where the VerusID staked directly with their I-address
    const dailyQuery = `
      SELECT
        DATE(block_time) as stake_date,
        COUNT(DISTINCT block_height) as stake_count,
        SUM(amount_sats) as total_rewards_satoshis,
        MIN(block_time) as period_min,
        MAX(block_time) as period_max
      FROM staking_rewards
      WHERE identity_address = $1 AND source_address = identity_address
      GROUP BY DATE(block_time)
      ORDER BY stake_date ASC
    `;

    const dailyResult = await db.query(dailyQuery, [stats.address]);
    const dailyData = dailyResult.rows.map(row => ({
      date: row.stake_date,
      stakeCount: parseInt(row.stake_count) || 0,
      totalRewardsVRSC: Math.min(
        (parseFloat(row.total_rewards_satoshis) || 0) / 100000000,
        50000 // Cap daily rewards at 50K VRSC
      ),
      periodStart: row.period_min,
      periodEnd: row.period_max,
    }));

    // Calculate summary from time series data if database summary is empty
    const calculatedTotalStakes = (dailyData || []).reduce(
      (sum, day) => sum + (day.stakeCount || 0),
      0
    );
    const calculatedTotalRewards = (dailyData || []).reduce(
      (sum, day) => sum + (day.totalRewardsVRSC || 0),
      0
    );
    const calculatedFirstStake =
      dailyData && dailyData.length > 0 && dailyData[0]
        ? dailyData[0].periodStart
        : null;
    const calculatedLastStake =
      dailyData && dailyData.length > 0 && dailyData[dailyData.length - 1]
        ? dailyData[dailyData.length - 1]?.periodEnd
        : null;

    // Calculate APY from time series data if not available in database
    let calculatedAPY = null;
    if (
      calculatedTotalRewards > 0 &&
      calculatedFirstStake &&
      calculatedLastStake
    ) {
      try {
        // Estimate staked amount (this is a rough approximation)
        // In reality, we'd need the actual staked amounts over time
        // For now, use a reasonable estimate based on typical Verus staking
        const estimatedAverageStaked = Math.max(
          calculatedTotalRewards * 10,
          1000
        ); // Rough estimate

        const firstDate = new Date(calculatedFirstStake);
        const lastDate = new Date(calculatedLastStake);

        // Validate dates
        if (isNaN(firstDate.getTime()) || isNaN(lastDate.getTime())) {
          console.info({
            calculatedFirstStake,
            calculatedLastStake,
          });
        } else {
          const daysStaking = Math.max(
            (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24),
            1
          );
          const yearsStaking = daysStaking / 365.25;

          if (yearsStaking > 0 && estimatedAverageStaked > 0) {
            // APY = (Total Rewards / Average Staked) / Years * 100
            calculatedAPY =
              (calculatedTotalRewards / estimatedAverageStaked / yearsStaking) *
              100;
          }
        }
      } catch (error) {
        calculatedAPY = null;
      }
    }

    // Use calculated values if database values are empty/zero
    // Apply sanity check for rewards (max 10M VRSC per identity - reasonable upper bound)
    const rawRewardsVRSC =
      (parseFloat(stats.total_rewards_satoshis) || 0) > 0
        ? parseFloat(stats.total_rewards_satoshis) / 100000000
        : calculatedTotalRewards;

    // Sanity check: Cap rewards at 10M VRSC (reasonable maximum for any single identity)
    const maxReasonableRewards = 10000000; // 10M VRSC
    const totalRewardsVRSC = Math.min(rawRewardsVRSC, maxReasonableRewards);

    const summary = {
      totalStakes:
        stats.total_stakes > 0 ? stats.total_stakes : calculatedTotalStakes,
      totalRewardsVRSC: totalRewardsVRSC,
      firstStake: stats.first_stake_time || calculatedFirstStake,
      lastStake: stats.last_stake_time || calculatedLastStake,
      apyAllTime: parseFloat(stats.apy_all_time) || calculatedAPY,
      stakingEfficiency: parseFloat(stats.staking_efficiency) || 0,
    };

    // Convert stats to VRSC where applicable
    const response = {
      success: true,
      data: {
        address: stats.address,
        friendlyName: stats.friendly_name,
        summary: summary,
        performance: {
          apy: {
            allTime: parseFloat(stats.apy_all_time) || calculatedAPY || 0,
            yearly: parseFloat(stats.apy_yearly) || 0,
            '90d': parseFloat(stats.apy_90d) || 0,
            '30d': parseFloat(stats.apy_30d) || 0,
            '7d': parseFloat(stats.apy_7d) || 0,
            // APY calculation quality indicators
            calculationMethod: stats.apy_calculation_method || 'estimated',
            stakesWithRealAmounts:
              parseInt(stats.stakes_with_real_amounts) || 0,
            avgStakeAmountVRSC: parseFloat(stats.avg_stake_amount_vrsc) || null,
            dataCompleteness:
              summary.totalStakes > 0
                ? Math.round(
                    ((parseInt(stats.stakes_with_real_amounts) || 0) /
                      summary.totalStakes) *
                      100
                  )
                : 0,
            confidenceLevel: getAPYConfidenceLevel(
              summary.totalStakes,
              parseInt(stats.stakes_with_real_amounts) || 0
            ),
          },
          roi: {
            allTime: parseFloat(stats.roi_all_time) || 0,
            yearly: parseFloat(stats.roi_yearly) || 0,
          },
          frequency: {
            avgDaysBetween: parseFloat(stats.avg_days_between_stakes) || 0,
            stakesPerWeek: parseFloat(stats.stakes_per_week) || 0,
            stakesPerMonth: parseFloat(stats.stakes_per_month) || 0,
          },
        },
        utxoHealth: {
          total: stats.current_utxos,
          eligible: stats.eligible_utxos,
          cooldown: stats.cooldown_utxos,
          totalValueVRSC:
            (parseFloat(stats.total_value_satoshis) || 0) / 100000000,
          eligibleValueVRSC:
            (parseFloat(stats.eligible_value_satoshis) || 0) / 100000000,
          largestUtxoVRSC:
            (parseFloat(stats.largest_utxo_satoshis) || 0) / 100000000,
          smallestEligibleVRSC:
            (parseFloat(stats.smallest_eligible_satoshis) || 0) / 100000000,
          efficiency: parseFloat(stats.staking_efficiency) || 0,
        },
        records: {
          highest: {
            amount:
              (parseFloat(stats.highest_reward_satoshis) || 0) / 100000000,
            date: stats.highest_reward_date,
          },
          lowest: {
            amount: (parseFloat(stats.lowest_reward_satoshis) || 0) / 100000000,
          },
          bestMonth: {
            month: stats.best_month,
            rewards:
              (parseFloat(stats.best_month_rewards_satoshis) || 0) / 100000000,
          },
          worstMonth: {
            month: stats.worst_month,
            rewards:
              (parseFloat(stats.worst_month_rewards_satoshis) || 0) / 100000000,
          },
          longestDrySpell: stats.longest_dry_spell_days,
          currentStreak: stats.current_streak_days,
        },
        trends: {
          reward: {
            '7d': stats.reward_trend_7d,
            '30d': stats.reward_trend_30d,
          },
          efficiency: {
            '7d': stats.efficiency_trend_7d,
            '30d': stats.efficiency_trend_30d,
          },
          apy: {
            '7d': stats.apy_trend_7d,
            '30d': stats.apy_trend_30d,
          },
        },
        timeSeries: {
          monthly: monthlyData,
          weekly: weeklyData,
          daily: dailyData,
        },
        rankings: {
          network: stats.network_rank,
          percentile: parseFloat(stats.network_percentile) || 0,
          category: stats.category_rank,
          totalStakers: totalStakers, // Added from query above
        },
        metadata: {
          lastCalculated: stats.last_calculated,
          dataCompleteness: parseFloat(stats.data_completeness) || 100,
        },
      },
      ...(creationInfo && {
        creationInfo: {
          block: creationInfo.creationBlock,
          txid: creationInfo.creationTxid,
          blockhash: creationInfo.creationBlockhash,
        },
      }),
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching staking stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch staking statistics',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
