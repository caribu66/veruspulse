import { NextRequest, NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';

interface UTXOStakeData {
  txid: string;
  vout: number;
  value: number;
  creationHeight: number;
  currentHeight: number;
  stakeAge: number;
  isEligible: boolean;
  stakingProbability: number;
  estimatedReward: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Address is required' },
        { status: 400 }
      );
    }

    // Get current blockchain info
    const blockchainInfo = await verusAPI.getBlockchainInfo();
    const currentHeight = blockchainInfo.blocks;

    // Get UTXOs for the address
    const utxos = await verusAPI.getAddressUTXOs(address);

    if (!utxos || !Array.isArray(utxos) || utxos.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          utxos: [],
          totalValue: 0,
          eligibleStakes: 0,
          totalStakingProbability: 0,
        },
      });
    }

    // Process each UTXO for staking analysis
    const utxoStakes: UTXOStakeData[] = [];
    let totalValue = 0;
    let eligibleStakes = 0;
    let totalStakingProbability = 0;

    for (const utxo of utxos) {
      const value = utxo.satoshis || utxo.value || 0;
      const creationHeight = utxo.height || 0;
      const stakeAge = currentHeight - creationHeight;

      // Verus staking requirements (minimum age and value)
      const minStakeAge = 2000; // ~33 hours at 60s/block
      const minStakeValue = 100000000; // 1 VRSC in satoshis

      const isEligible = stakeAge >= minStakeAge && value >= minStakeValue;

      // Calculate staking probability (simplified)
      // In reality, this would be more complex based on network weight
      const stakingProbability = isEligible
        ? Math.min(1, value / 1000000000)
        : 0; // Cap at 1B VRSC

      // Estimate potential reward (simplified calculation)
      const estimatedReward = isEligible ? value * 0.0001 : 0; // Rough estimate

      const utxoStake: UTXOStakeData = {
        txid: utxo.txid,
        vout: utxo.vout,
        value,
        creationHeight,
        currentHeight,
        stakeAge,
        isEligible,
        stakingProbability,
        estimatedReward,
      };

      utxoStakes.push(utxoStake);
      totalValue += value;

      if (isEligible) {
        eligibleStakes++;
        totalStakingProbability += stakingProbability;
      }
    }

    // Calculate staking analytics
    const averageStakeAge =
      utxoStakes.length > 0
        ? utxoStakes.reduce((sum, utxo) => sum + utxo.stakeAge, 0) /
          utxoStakes.length
        : 0;

    const totalStakingValue = utxoStakes
      .filter(utxo => utxo.isEligible)
      .reduce((sum, utxo) => sum + utxo.value, 0);

    return NextResponse.json({
      success: true,
      data: {
        utxos: utxoStakes,
        summary: {
          totalUTXOs: utxoStakes.length,
          totalValue: totalValue / 100000000, // Convert to VRSC
          eligibleStakes,
          totalStakingValue: totalStakingValue / 100000000, // Convert to VRSC
          averageStakeAge: Math.round(averageStakeAge),
          totalStakingProbability,
          currentHeight,
        },
        analytics: {
          stakingEfficiency: eligibleStakes / utxoStakes.length,
          averageUTXOSize: totalValue / utxoStakes.length / 100000000, // VRSC
          largestUTXO: Math.max(...utxoStakes.map(u => u.value)) / 100000000, // VRSC
          smallestEligible:
            Math.min(
              ...utxoStakes.filter(u => u.isEligible).map(u => u.value)
            ) / 100000000 || 0, // VRSC
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in UTXO stakes API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch UTXO stake data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
