import { NextRequest, NextResponse } from 'next/server';
import { calculateStakingMomentum, formatMomentumTrend, getMomentumColor, calculateExpectedFrequency, calculatePerformanceRatio, formatPerformanceRatio } from '@/lib/utils/momentum-calculations';

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

    // Fetch data in parallel
    const [
      liveUTXOResponse,
      stakingStatsResponse,
      consolidatedResponse,
      realStakingResponse,
    ] = await Promise.allSettled([
      // Get live UTXO data for current weight (with timeout)
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/verusid/${iaddr}/live-utxos`, {
        signal: AbortSignal.timeout(5000)
      }).then(res => res.json()).catch(() => null),
      // Get historical staking stats for trend analysis (with timeout)
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/verusid/${iaddr}/staking-stats`, {
        signal: AbortSignal.timeout(5000)
      }).then(res => res.json()).catch(() => null),
      // Get network data for expected calculations (with timeout)
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/consolidated-data`, {
        signal: AbortSignal.timeout(5000)
      }).then(res => res.json()).catch(() => null),
      // Fallback: Get real staking data directly (with timeout)
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/real-staking-data`, {
        signal: AbortSignal.timeout(5000)
      }).then(res => res.json()).catch(() => null),
    ]);

    // Extract data from responses
    const liveUTXOData = liveUTXOResponse.status === 'fulfilled' && liveUTXOResponse.value.success 
      ? liveUTXOResponse.value.data 
      : null;
    const stakingStats = stakingStatsResponse.status === 'fulfilled' && stakingStatsResponse.value.success
      ? stakingStatsResponse.value.data
      : null;
    const consolidatedData = consolidatedResponse.status === 'fulfilled' && consolidatedResponse.value.success
      ? consolidatedResponse.value.data
      : null;
    const realStakingData = realStakingResponse.status === 'fulfilled' && realStakingResponse.value.success
      ? realStakingResponse.value.data
    : null;

  // Log debug info for troubleshooting
  console.log({
    liveUTXOAvailable: !!liveUTXOData,
    stakingStatsAvailable: !!stakingStats,
    consolidatedDataAvailable: !!consolidatedData,
    stakingStatsError: stakingStatsResponse.status === 'rejected' ? stakingStatsResponse.reason :
                        (stakingStatsResponse.status === 'fulfilled' && !stakingStatsResponse.value.success) ? stakingStatsResponse.value.error : null,
    });

    if (!liveUTXOData) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch live UTXO data for this VerusID' 
        },
        { status: 500 }
      );
    }

    // Get current staking weight
    const yourWeight = liveUTXOData.eligibleValueVRSC || 0;
    
    // Get network stake weight from multiple sources (same logic as network-participation)
    let networkWeight = 0;
    const stakingData = consolidatedData?.staking;
    
    if (stakingData && stakingData.netstakeweight && stakingData.netstakeweight > 0) {
      // Use consolidated staking data first (netstakeweight is already in VRSC)
      networkWeight = stakingData.netstakeweight;
    } else if (realStakingData?.staking?.netstakeweight && realStakingData.staking.netstakeweight > 0) {
      // Fallback to real-staking-data API (netstakeweight is already in VRSC)
      networkWeight = realStakingData.staking.netstakeweight;
    } else if (realStakingData?.mining?.stakingsupply && realStakingData.mining.stakingsupply > 0) {
      // Use mining data stakingsupply (this is the correct field!)
      networkWeight = realStakingData.mining.stakingsupply;
    } else if (consolidatedData?.blockchain?.circulatingSupply) {
      // Last resort: use circulating supply
      networkWeight = consolidatedData.blockchain.circulatingSupply / 100000000;
    }

    // Process historical stake data for momentum analysis
    let momentumAnalysis = null;
    if (stakingStats?.timeSeries?.daily && Array.isArray(stakingStats.timeSeries.daily)) {
      // Convert daily data to stake events format
      const recentStakes = stakingStats.timeSeries.daily
        .filter((day: any) => day.stakeCount > 0)
        .map((day: any) => ({
          timestamp: new Date(new Date(day.date).setHours(12, 0, 0, 0)), // Set to noon to represent the day
          amount: day.totalRewardsVRSC || 0,
        }))
        .sort((a: any, b: any) => a.timestamp.getTime() - b.timestamp.getTime()) // Sort by date
        .slice(-60); // Last 60 days for analysis

      // Only calculate momentum if we have enough historical data
      if (recentStakes.length >= 2) {
        momentumAnalysis = calculateStakingMomentum(recentStakes);
      }
    }

    // Calculate expected performance metrics
    const expectedFrequency = calculateExpectedFrequency(yourWeight, networkWeight);
    const actualFrequency = momentumAnalysis?.frequency7d || 0;
    const performanceRatio = calculatePerformanceRatio(actualFrequency, expectedFrequency);

    // Format results
    const result = {
      address: iaddr,
      yourWeight,
      networkWeight,
      
      // Current metrics
      currentFrequency: actualFrequency,
      expectedFrequency,
      performanceRatio,
      performanceRating: formatPerformanceRatio(performanceRatio),
      
      // Momentum analysis
      momentum: momentumAnalysis ? {
        score: momentumAnalysis.momentumScore,
        color: getMomentumColor(momentumAnalysis.momentumScore),
        frequencyTrend: momentumAnalysis.frequencyTrend,
        frequencyChange: momentumAnalysis.frequencyChange,
        rewardTrend: momentumAnalysis.rewardTrend,
        rewardChange: momentumAnalysis.rewardChange,
        
        // Formatted values
        frequencyTrendFormatted: formatMomentumTrend(momentumAnalysis.frequencyTrend as 'increasing' | 'stable' | 'decreasing'),
        rewardTrendFormatted: formatMomentumTrend(momentumAnalysis.rewardTrend as 'increasing' | 'stable' | 'decreasing'),
        frequencyChangeFormatted: `${momentumAnalysis.frequencyChange > 0 ? '+' : ''}${momentumAnalysis.frequencyChange.toFixed(1)}%`,
        rewardChangeFormatted: `${momentumAnalysis.rewardChange > 0 ? '+' : ''}${momentumAnalysis.rewardChange.toFixed(1)}%`,
        
        // Period comparisons
        last7d: momentumAnalysis.periods.last7d,
        previous7d: momentumAnalysis.periods.previous7d,
        last30d: momentumAnalysis.periods.last30d,
        
        // Activity status - use last7d count to determine if active
        lastStakeDays: momentumAnalysis.lastStakeDays,
        isActive: (momentumAnalysis.periods?.last7d || 0) > 0
      } : null,
      
      lastUpdated: new Date().toISOString(),
      _testField: 'UPDATED_CODE_V3', // Test field to verify code execution
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error fetching staking momentum data:', error);
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
