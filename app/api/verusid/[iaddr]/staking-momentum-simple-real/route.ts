import { type NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

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

    // Fetch real data from staking stats, network participation, live UTXOs, and recent stakes
    const [
      stakingStatsResponse,
      networkParticipationResponse,
      liveUTXOsResponse,
      recentStakesResponse,
    ] = await Promise.allSettled([
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/verusid/${iaddr}/staking-stats`
      ).then(res => res.json()),
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/verusid/${iaddr}/network-participation`
      ).then(res => res.json()),
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/verusid/${iaddr}/live-utxos`
      ).then(res => res.json()),
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/verusid/${iaddr}/recent-stakes`
      ).then(res => res.json()),
    ]);

    const stakingStats =
      stakingStatsResponse.status === 'fulfilled' &&
      stakingStatsResponse.value.success
        ? stakingStatsResponse.value.data
        : null;

    const networkParticipation =
      networkParticipationResponse.status === 'fulfilled' &&
      networkParticipationResponse.value.success
        ? networkParticipationResponse.value
        : null;

    const _liveUTXOs =
      liveUTXOsResponse.status === 'fulfilled' &&
      liveUTXOsResponse.value.success
        ? liveUTXOsResponse.value.data
        : null;

    const recentStakes =
      recentStakesResponse.status === 'fulfilled' &&
      recentStakesResponse.value.success
        ? recentStakesResponse.value.data
        : null;

    if (!stakingStats || !networkParticipation) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch required data',
      });
    }

    // Extract real data
    const yourWeight = networkParticipation.data.yourWeight || 0;
    const networkWeight = networkParticipation.data.networkWeight || 0;
    const totalStakes = stakingStats.summary?.totalStakes || 0;
    const _totalRewards = stakingStats.summary?.totalRewardsVRSC || 0;
    const firstStake = stakingStats.summary?.firstStake
      ? new Date(stakingStats.summary.firstStake)
      : null;
    const lastStake = stakingStats.summary?.lastStake
      ? new Date(stakingStats.summary.lastStake)
      : null;

    // Calculate performance metrics
    const daysSinceFirstStake = firstStake
      ? Math.max(1, (Date.now() - firstStake.getTime()) / (1000 * 60 * 60 * 24))
      : 1;
    const currentFrequency = totalStakes / daysSinceFirstStake;
    const expectedFrequency =
      networkWeight > 0 ? (yourWeight / networkWeight) * 2 : 0; // Assume 2 stakes per day network average
    const performanceRatio =
      expectedFrequency > 0 ? (currentFrequency / expectedFrequency) * 100 : 0;

    // Determine performance rating
    let performanceRating = 'Poor';
    if (performanceRatio >= 80) performanceRating = 'Excellent';
    else if (performanceRatio >= 60) performanceRating = 'Good';
    else if (performanceRatio >= 40) performanceRating = 'Average';

    // Calculate recent activity
    const daysSinceLastStake = lastStake
      ? (Date.now() - lastStake.getTime()) / (1000 * 60 * 60 * 24)
      : 999;
    const isActive = daysSinceLastStake <= 7; // Active if staked within last 7 days

    // Get ACTUAL recent stakes from daemon (most accurate)
    let last7d = 0;
    let last30d = 0;

    if (recentStakes) {
      // Use real daemon data - most accurate
      last7d = recentStakes.stakes7d || 0;
      last30d = recentStakes.stakes30d || 0;
    } else {
      // Fallback to database if daemon query fails
      try {
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
        });

        const last7dResult = await pool.query(
          `
          SELECT COUNT(*) as count
          FROM staking_rewards
          WHERE identity_address = $1
          AND block_time > NOW() - INTERVAL '7 days'
        `,
          [iaddr]
        );
        last7d = parseInt(last7dResult.rows[0]?.count || '0');

        const last30dResult = await pool.query(
          `
          SELECT COUNT(*) as count
          FROM staking_rewards
          WHERE identity_address = $1
          AND block_time > NOW() - INTERVAL '30 days'
        `,
          [iaddr]
        );
        last30d = parseInt(last30dResult.rows[0]?.count || '0');

        await pool.end();
      } catch (error) {
        console.error('Error querying database:', error);
        // Final fallback to frequency estimation
        last7d = isActive ? Math.max(1, Math.floor(currentFrequency * 7)) : 0;
        last30d = Math.max(0, Math.floor(currentFrequency * 30));
      }
    }

    const result = {
      address: iaddr,
      yourWeight: yourWeight,
      networkWeight: networkWeight,
      currentFrequency: currentFrequency,
      expectedFrequency: expectedFrequency,
      performanceRatio: performanceRatio,
      performanceRating: performanceRating,
      momentum: {
        score: Math.min(100, Math.max(0, performanceRatio)),
        color:
          performanceRatio >= 60
            ? 'green'
            : performanceRatio >= 40
              ? 'yellow'
              : 'red',
        frequencyTrend:
          performanceRatio > 100
            ? 'increasing'
            : performanceRatio < 80
              ? 'decreasing'
              : 'stable',
        frequencyChange: 0, // Would need historical data for this
        rewardTrend: 'stable', // Would need historical data for this
        rewardChange: 0, // Would need historical data for this
        frequencyTrendFormatted:
          performanceRatio > 100
            ? 'Accelerating'
            : performanceRatio < 80
              ? 'Decelerating'
              : 'Stable',
        rewardTrendFormatted: 'Stable',
        frequencyChangeFormatted: '0.0%',
        rewardChangeFormatted: '0.0%',
        last7d: last7d,
        previous7d: 0, // Would need historical data
        last30d: last30d,
        lastStakeDays: Math.floor(daysSinceLastStake),
        isActive: isActive,
      },
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error in real staking momentum:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch staking momentum data',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
