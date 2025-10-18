import { NextRequest, NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';

const MIN_CONFIRMATIONS_FOR_STAKING = 150;
const COOLDOWN_BLOCKS = 150;

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

    // Get current blockchain height
    const blockchainInfo = await verusAPI.getBlockchainInfo();
    const currentHeight = blockchainInfo.blocks;

    // Get live UTXO data
    const utxos = await verusAPI.getAddressUTXOs(iaddr);

    if (!utxos || !Array.isArray(utxos)) {
      return NextResponse.json({
        success: true,
        data: {
          address: iaddr,
          total: 0,
          eligible: 0,
          cooldown: 0,
          totalValue: 0,
          eligibleValue: 0,
          largest: 0,
          smallestEligible: 0,
          utxos: [],
          lastUpdated: new Date().toISOString(),
        },
      });
    }

    let total = utxos.length;
    let eligible = 0;
    let cooldown = 0;
    let cooldownValue = 0;
    let totalValue = 0;
    let eligibleValue = 0;
    let largest = 0;
    let smallestEligible: number | null = null;
    let maxConfirmations = 0;
    let minConfirmations = Infinity;

    // Dust analysis metrics
    const dustAnalysis = {
      dustUtxos: 0, // UTXOs < 1 VRSC (bad for staking)
      dustValue: 0, // Total value locked in dust (satoshis)
      dustPercentage: 0, // % of UTXOs that are dust
      consolidationSavings: 0, // Estimated VRSC saved by consolidating dust
      recommendation: '',
      dustThreshold: 100000000, // 1 VRSC in satoshis
      minStakingValue: 100000000, // Minimum viable staking amount
    };

    // Size distribution buckets
    const sizeBuckets = {
      tiny: { count: 0, value: 0, min: 0, max: 10 }, // 0-10 VRSC
      small: { count: 0, value: 0, min: 10, max: 100 }, // 10-100 VRSC
      medium: { count: 0, value: 0, min: 100, max: 1000 }, // 100-1000 VRSC
      large: { count: 0, value: 0, min: 1000, max: Infinity }, // 1000+ VRSC
    };

    const detailedUtxos = utxos.map((utxo: any) => {
      const value = utxo.satoshis || 0;
      const confirmations = utxo.height ? currentHeight - utxo.height : 0;

      totalValue += value;

      if (value > largest) {
        largest = value;
      }

      if (confirmations > maxConfirmations) maxConfirmations = confirmations;
      if (confirmations < minConfirmations) minConfirmations = confirmations;

      // Categorize by size and analyze dust
      const valueVRSC = value / 100000000;
      if (valueVRSC >= sizeBuckets.large.min) {
        sizeBuckets.large.count++;
        sizeBuckets.large.value += value;
      } else if (valueVRSC >= sizeBuckets.medium.min) {
        sizeBuckets.medium.count++;
        sizeBuckets.medium.value += value;
      } else if (valueVRSC >= sizeBuckets.small.min) {
        sizeBuckets.small.count++;
        sizeBuckets.small.value += value;
      } else {
        sizeBuckets.tiny.count++;
        sizeBuckets.tiny.value += value;
      }

      // Analyze dust UTXOs (< 1 VRSC)
      if (value < dustAnalysis.dustThreshold) {
        dustAnalysis.dustUtxos++;
        dustAnalysis.dustValue += value;
      }

      // Check if eligible for staking
      let status = 'inactive';
      if (confirmations >= MIN_CONFIRMATIONS_FOR_STAKING) {
        eligible++;
        eligibleValue += value;
        status = 'eligible';

        // Only consider UTXOs with meaningful value (filter out dust UTXOs < 0.001 VRSC)
        const minValueSatoshis = 100000; // 0.001 VRSC in satoshis
        if (
          value >= minValueSatoshis &&
          (smallestEligible === null || value < smallestEligible)
        ) {
          smallestEligible = value;
        }
      } else if (confirmations < COOLDOWN_BLOCKS) {
        cooldown++;
        cooldownValue += value;
        status = 'cooldown';
      }

      return {
        txid: utxo.txid,
        vout: utxo.vout,
        value: value,
        valueVRSC: value / 100000000,
        confirmations,
        status,
        height: utxo.height,
        blockTime: utxo.blockTime,
      };
    });

    // Calculate dust analysis metrics
    dustAnalysis.dustPercentage =
      total > 0 ? (dustAnalysis.dustUtxos / total) * 100 : 0;

    // Calculate consolidation savings (estimate how many viable UTXOs could be created)
    const totalDustValueVRSC = dustAnalysis.dustValue / 100000000;
    const potentialViableUtxos = Math.floor(
      totalDustValueVRSC / (dustAnalysis.minStakingValue / 100000000)
    );
    dustAnalysis.consolidationSavings =
      potentialViableUtxos > 0 ? potentialViableUtxos : 0;

    // Generate actionable recommendations
    if (dustAnalysis.dustPercentage > 50) {
      dustAnalysis.recommendation = `⚠️ CRITICAL: ${dustAnalysis.dustPercentage.toFixed(1)}% of your UTXOs are dust (<1 VRSC). Consolidate ${dustAnalysis.dustUtxos} dust UTXOs (${totalDustValueVRSC.toFixed(2)} VRSC) to create ${dustAnalysis.consolidationSavings} viable staking UTXOs.`;
    } else if (dustAnalysis.dustPercentage > 25) {
      dustAnalysis.recommendation = `⚠️ WARNING: ${dustAnalysis.dustPercentage.toFixed(1)}% dust UTXOs. Consider consolidating ${dustAnalysis.dustUtxos} small UTXOs (${totalDustValueVRSC.toFixed(2)} VRSC) to improve staking efficiency.`;
    } else if (dustAnalysis.dustPercentage > 10) {
      dustAnalysis.recommendation = `💡 TIP: ${dustAnalysis.dustPercentage.toFixed(1)}% dust UTXOs. Consolidation could create ${dustAnalysis.consolidationSavings} additional viable UTXOs.`;
    } else {
      dustAnalysis.recommendation = `✅ EXCELLENT: Only ${dustAnalysis.dustPercentage.toFixed(1)}% dust UTXOs. Your UTXO structure is well-optimized for staking.`;
    }

    return NextResponse.json({
      success: true,
      data: {
        address: iaddr,
        total,
        eligible,
        cooldown,
        cooldownValue,
        cooldownValueVRSC: cooldownValue / 100000000,
        inactive: total - eligible - cooldown,
        totalValue,
        totalValueVRSC: totalValue / 100000000,
        eligibleValue,
        eligibleValueVRSC: eligibleValue / 100000000,
        largest,
        largestVRSC: largest / 100000000,
        smallestEligible: smallestEligible || 0,
        smallestEligibleVRSC: (smallestEligible || 0) / 100000000,
        maxConfirmations,
        minConfirmations,
        currentHeight,
        utxos: detailedUtxos,
        lastUpdated: new Date().toISOString(),
        efficiency: total > 0 ? eligible / total : 0,
        sizeDistribution: {
          tiny: {
            count: sizeBuckets.tiny.count,
            valueVRSC: sizeBuckets.tiny.value / 100000000,
          },
          small: {
            count: sizeBuckets.small.count,
            valueVRSC: sizeBuckets.small.value / 100000000,
          },
          medium: {
            count: sizeBuckets.medium.count,
            valueVRSC: sizeBuckets.medium.value / 100000000,
          },
          large: {
            count: sizeBuckets.large.count,
            valueVRSC: sizeBuckets.large.value / 100000000,
          },
        },
        fragmentationScore:
          total > 200 ? 'high' : total > 100 ? 'medium' : 'low',
        consolidationRecommended: total > 200,
        dustAnalysis: {
          dustUtxos: dustAnalysis.dustUtxos,
          dustValue: dustAnalysis.dustValue,
          dustValueVRSC: dustAnalysis.dustValue / 100000000,
          dustPercentage: dustAnalysis.dustPercentage,
          consolidationSavings: dustAnalysis.consolidationSavings,
          recommendation: dustAnalysis.recommendation,
          dustThreshold: dustAnalysis.dustThreshold,
          dustThresholdVRSC: dustAnalysis.dustThreshold / 100000000,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching live UTXOs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch live UTXO data',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
