import { type NextRequest, NextResponse } from 'next/server';
// import { verusAPI } from '@/lib/rpc-client-robust'; // Unused
// import { CachedRPCClient } from '@/lib/cache/cached-rpc-client'; // Unused
import {
  calculateExpectedStakeTime,
  calculateParticipationRate,
  formatParticipationPercentage,
  // formatStakeDuration, // Unused
} from '@/lib/utils/staking-calculations';

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
    const [liveUTXOResponse, consolidatedResponse, realStakingResponse] =
      await Promise.allSettled([
        // Get live UTXO data for this VerusID
        fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/verusid/${iaddr}/live-utxos`
        ).then(res => res.json()),
        // Get consolidated network data (more reliable)
        fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/consolidated-data`
        ).then(res => res.json()),
        // Fallback: Get real staking data directly
        fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/real-staking-data`
        ).then(res => res.json()),
      ]);

    // Extract data from responses
    const liveUTXOData =
      liveUTXOResponse.status === 'fulfilled' && liveUTXOResponse.value.success
        ? liveUTXOResponse.value.data
        : null;
    const consolidatedData =
      consolidatedResponse.status === 'fulfilled' &&
      consolidatedResponse.value.success
        ? consolidatedResponse.value.data
        : null;
    const realStakingData =
      realStakingResponse.status === 'fulfilled' &&
      realStakingResponse.value.success
        ? realStakingResponse.value.data
        : null;

    if (!liveUTXOData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch live UTXO data for this VerusID',
        },
        { status: 500 }
      );
    }

    // Get your eligible staking weight in VRSC
    const yourWeight = liveUTXOData.eligibleValueVRSC || 0;

    // Get network stake weight from multiple sources (consolidated data preferred, real-staking-data as fallback)
    let networkWeight = 0;
    const stakingData = consolidatedData?.staking;

    if (
      stakingData &&
      stakingData.netstakeweight &&
      stakingData.netstakeweight > 0
    ) {
      // Use consolidated staking data first (netstakeweight is already in VRSC)
      networkWeight = stakingData.netstakeweight;
    } else if (
      realStakingData?.staking?.netstakeweight &&
      realStakingData.staking.netstakeweight > 0
    ) {
      // Fallback to real-staking-data API (netstakeweight is already in VRSC)
      networkWeight = realStakingData.staking.netstakeweight;
    } else if (
      realStakingData?.mining?.stakingsupply &&
      realStakingData.mining.stakingsupply > 0
    ) {
      // Use mining data stakingsupply (this is the correct field!)
      networkWeight = realStakingData.mining.stakingsupply;
    } else if (consolidatedData?.blockchain?.circulatingSupply) {
      // Last resort: use circulating supply
      networkWeight = consolidatedData.blockchain.circulatingSupply / 100000000;
    }

    // Add debug logging to help troubleshoot
    console.info({
      stakingData,
      networkWeight,
      yourWeight,
      consolidatedDataAvailable: !!consolidatedData,
    });

    // Handle edge cases where network weight is 0 or invalid
    let participationPercentage = 0;
    let expectedStakeTime = { seconds: 0, formatted: 'N/A' };

    if (networkWeight > 0 && yourWeight > 0) {
      participationPercentage = calculateParticipationRate(
        yourWeight,
        networkWeight
      );
      expectedStakeTime = calculateExpectedStakeTime(yourWeight, networkWeight);
    } else if (yourWeight === 0) {
      // User has no eligible staking balance
      expectedStakeTime = { seconds: 0, formatted: 'Not Staking' };
    } else if (networkWeight === 0) {
      // Network weight data unavailable
      participationPercentage = 0;
      expectedStakeTime = { seconds: 0, formatted: 'Network Data Unavailable' };
    }

    // Format values for display
    const participationFormatted = formatParticipationPercentage(
      participationPercentage
    );
    const yourWeightFormatted = yourWeight.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const networkWeightFormatted = networkWeight.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    // Determine status
    let status = 'active';
    if (yourWeight === 0) {
      status = 'not_staking';
    } else if (networkWeight === 0) {
      status = 'data_unavailable';
    } else if (participationPercentage < 0.001) {
      status = 'low_participation';
    }

    return NextResponse.json({
      success: true,
      data: {
        address: iaddr,
        participationPercentage,
        participationFormatted,
        expectedStakeTimeSeconds: expectedStakeTime.seconds,
        expectedStakeTimeFormatted: expectedStakeTime.formatted,
        yourWeight,
        yourWeightFormatted,
        networkWeight,
        networkWeightFormatted,
        status,
        // Additional metrics
        eligibleUTXOs: liveUTXOData.eligible || 0,
        totalUTXOs: liveUTXOData.total || 0,
        utxoEfficiency: liveUTXOData.efficiency || 0,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error fetching network participation data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch network participation data',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
