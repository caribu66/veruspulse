import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

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

export async function GET(
  request: NextRequest,
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
      return NextResponse.json({
        success: false,
        error: 'UTXO database not enabled',
        message: 'Set UTXO_DATABASE_ENABLED=true and DATABASE_URL in your environment',
      }, { status: 503 });
    }

    const db = getDbPool();
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
      }, { status: 500 });
    }

    // Get comprehensive statistics from verusid_statistics table
    // Support lookup by I-address, friendly name, or base name
    const statsQuery = `
      SELECT vs.* FROM verusid_statistics vs
      LEFT JOIN identities i ON vs.address = i.identity_address
      WHERE vs.address = $1 
         OR LOWER(vs.friendly_name) = LOWER($1)
         OR LOWER(vs.friendly_name) LIKE LOWER($1) || '%'
         OR LOWER(i.base_name) = LOWER(REPLACE($1, '@', ''))
         OR LOWER(i.friendly_name) = LOWER($1)
      LIMIT 1
    `;

    const statsResult = await db.query(statsQuery, [iaddr]);
    
    if (statsResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Statistics not found',
        message: 'This VerusID has not been synced yet. Run the stake scanner to populate data.',
      }, { status: 404 });
    }

    const stats = statsResult.rows[0];

    // Generate COMPLETE monthly timeline data (ALL TIME, not just 12 months)
    const monthlyQuery = `
      SELECT 
        DATE_TRUNC('month', block_time) as period_start,
        COUNT(DISTINCT block_height) as stake_count,
        SUM(amount_sats) as total_rewards_satoshis,
        MIN(block_time) as period_min,
        MAX(block_time) as period_max
      FROM staking_rewards
      WHERE identity_address = $1
      GROUP BY DATE_TRUNC('month', block_time)
      ORDER BY period_start ASC
    `;

    const monthlyResult = await db.query(monthlyQuery, [stats.address]);
    const monthlyData = monthlyResult.rows.map(row => ({
      month: row.period_start,
      stakeCount: parseInt(row.stake_count) || 0,
      totalRewardsVRSC: (parseFloat(row.total_rewards_satoshis) || 0) / 100000000,
      periodStart: row.period_min,
      periodEnd: row.period_max,
    }));

    // Generate COMPLETE weekly timeline data (ALL TIME)
    const weeklyQuery = `
      SELECT 
        DATE_TRUNC('week', block_time) as period_start,
        COUNT(DISTINCT block_height) as stake_count,
        SUM(amount_sats) as total_rewards_satoshis,
        MIN(block_time) as period_min,
        MAX(block_time) as period_max
      FROM staking_rewards
      WHERE identity_address = $1
      GROUP BY DATE_TRUNC('week', block_time)
      ORDER BY period_start ASC
    `;

    const weeklyResult = await db.query(weeklyQuery, [stats.address]);
    const weeklyData = weeklyResult.rows.map(row => ({
      week: row.period_start,
      stakeCount: parseInt(row.stake_count) || 0,
      totalRewardsVRSC: (parseFloat(row.total_rewards_satoshis) || 0) / 100000000,
      periodStart: row.period_min,
      periodEnd: row.period_max,
    }));

    // Generate COMPLETE daily timeline data (ALL TIME)
    const dailyQuery = `
      SELECT 
        DATE(block_time) as stake_date,
        COUNT(DISTINCT block_height) as stake_count,
        SUM(amount_sats) as total_rewards_satoshis,
        MIN(block_time) as period_min,
        MAX(block_time) as period_max
      FROM staking_rewards
      WHERE identity_address = $1
      GROUP BY DATE(block_time)
      ORDER BY stake_date ASC
    `;

    const dailyResult = await db.query(dailyQuery, [stats.address]);
    const dailyData = dailyResult.rows.map(row => ({
      date: row.stake_date,
      stakeCount: parseInt(row.stake_count) || 0,
      totalRewardsVRSC: (parseFloat(row.total_rewards_satoshis) || 0) / 100000000,
      periodStart: row.period_min,
      periodEnd: row.period_max,
    }));

    // Convert stats to VRSC where applicable
    const response = {
      success: true,
      data: {
        address: stats.address,
        friendlyName: stats.friendly_name,
        summary: {
          totalStakes: stats.total_stakes,
          totalRewardsVRSC: (parseFloat(stats.total_rewards_satoshis) || 0) / 100000000,
          firstStake: stats.first_stake_time,
          lastStake: stats.last_stake_time,
          apyAllTime: parseFloat(stats.apy_all_time),
          stakingEfficiency: parseFloat(stats.staking_efficiency),
        },
        performance: {
          apy: {
            allTime: parseFloat(stats.apy_all_time) || 0,
            yearly: parseFloat(stats.apy_yearly) || 0,
            '90d': parseFloat(stats.apy_90d) || 0,
            '30d': parseFloat(stats.apy_30d) || 0,
            '7d': parseFloat(stats.apy_7d) || 0,
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
          totalValueVRSC: (parseFloat(stats.total_value_satoshis) || 0) / 100000000,
          eligibleValueVRSC: (parseFloat(stats.eligible_value_satoshis) || 0) / 100000000,
          largestUtxoVRSC: (parseFloat(stats.largest_utxo_satoshis) || 0) / 100000000,
          smallestEligibleVRSC: (parseFloat(stats.smallest_eligible_satoshis) || 0) / 100000000,
          efficiency: parseFloat(stats.staking_efficiency) || 0,
        },
        records: {
          highest: {
            amount: (parseFloat(stats.highest_reward_satoshis) || 0) / 100000000,
            date: stats.highest_reward_date,
          },
          lowest: {
            amount: (parseFloat(stats.lowest_reward_satoshis) || 0) / 100000000,
          },
          bestMonth: {
            month: stats.best_month,
            rewards: (parseFloat(stats.best_month_rewards_satoshis) || 0) / 100000000,
          },
          worstMonth: {
            month: stats.worst_month,
            rewards: (parseFloat(stats.worst_month_rewards_satoshis) || 0) / 100000000,
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
        },
        metadata: {
          lastCalculated: stats.last_calculated,
          dataCompleteness: parseFloat(stats.data_completeness) || 100,
        },
      },
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

