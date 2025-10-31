import { type NextRequest, NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';
import { Pool } from 'pg';
import { UTXODatabaseService } from '@/lib/services/utxo-database';
import { resolveVerusID } from '@/lib/verusid-cache';

const MIN_CONFIRMATIONS_FOR_STAKING = 150;
const COOLDOWN_BLOCKS = 150;

// Function to calculate staking frequency from historical data
async function calculateStakingFrequency(identityAddress: string): Promise<{
  averageDaysBetweenStakes: number;
  formattedFrequency: string;
  totalStakes: number;
  hasHistoricalData: boolean;
}> {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Get historical stake data ordered by time
    const result = await pool.query(
      `
      SELECT block_time
      FROM staking_rewards
      WHERE identity_address = $1
      ORDER BY block_time ASC
    `,
      [identityAddress]
    );

    await pool.end();

    const stakes = result.rows;

    if (stakes.length < 2) {
      return {
        averageDaysBetweenStakes: 0,
        formattedFrequency: 'Insufficient data',
        totalStakes: stakes.length,
        hasHistoricalData: false,
      };
    }

    // Calculate time differences between consecutive stakes
    const timeDifferences: number[] = [];
    for (let i = 1; i < stakes.length; i++) {
      const prevTime = new Date(stakes[i - 1].block_time).getTime();
      const currTime = new Date(stakes[i].block_time).getTime();
      const diffInMs = currTime - prevTime;
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
      timeDifferences.push(diffInDays);
    }

    // Calculate average
    const averageDays =
      timeDifferences.reduce((sum, diff) => sum + diff, 0) /
      timeDifferences.length;

    // Format the frequency
    let formattedFrequency: string;
    if (averageDays < 1) {
      const hours = averageDays * 24;
      formattedFrequency = `Every ${hours.toFixed(1)} hours`;
    } else if (averageDays < 7) {
      formattedFrequency = `Every ${averageDays.toFixed(1)} days`;
    } else if (averageDays < 30) {
      const weeks = averageDays / 7;
      formattedFrequency = `Every ${weeks.toFixed(1)} weeks`;
    } else {
      const months = averageDays / 30;
      formattedFrequency = `Every ${months.toFixed(1)} months`;
    }

    return {
      averageDaysBetweenStakes: averageDays,
      formattedFrequency,
      totalStakes: stakes.length,
      hasHistoricalData: true,
    };
  } catch (error) {
    console.error('Error calculating staking frequency:', error);
    return {
      averageDaysBetweenStakes: 0,
      formattedFrequency: 'Unable to calculate',
      totalStakes: 0,
      hasHistoricalData: false,
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

    // Get current blockchain height
    const blockchainInfo = await verusAPI.getBlockchainInfo();
    const currentHeight = blockchainInfo.blocks;

    // Resolve VerusID to get the actual identity address
    const identity = await resolveVerusID(iaddr);
    if (!identity) {
      return NextResponse.json(
        {
          success: false,
          error: 'VerusID not found',
        },
        { status: 404 }
      );
    }

    const identityAddress = identity.identityAddress;

    // Get balance and UTXO data from RPC
    let utxos: any[] = [];
    let totalBalance = 0;

    try {
      // Get the actual balance (this works for VerusIDs)
      const balanceData = await verusAPI.getAddressBalance(identityAddress);
      totalBalance = balanceData.balance || 0;

      // Get UTXO list from RPC
      const rpcUtxos = await verusAPI.getAddressUTXOs(identityAddress);
      if (Array.isArray(rpcUtxos) && rpcUtxos.length > 0) {
        // Convert RPC UTXO format to our expected format
        // Note: In Verus RPC, 'height' is the block height where UTXO was created
        // and 'blocktime' is the timestamp when the UTXO was created
        utxos = rpcUtxos.map((utxo: any) => ({
          txid: utxo.txid,
          vout: utxo.outputIndex || utxo.vout || 0,
          value: utxo.satoshis || 0,
          creationHeight: utxo.height || 0, // This should be the creation height
          creationTime: new Date((utxo.blocktime || 0) * 1000).toISOString(),
          isSpent: false,
          isEligible: false,
        }));
      } else if (totalBalance > 0) {
        // Only create synthetic UTXO if we have balance but no UTXOs from RPC
        // This handles cases where RPC doesn't return UTXOs but balance exists
        utxos = [
          {
            txid: 'synthetic_utxo',
            vout: 0,
            value: totalBalance,
            creationHeight: currentHeight - 100, // Assume recent
            creationTime: new Date().toISOString(),
            isSpent: false,
            isEligible: true, // Assume eligible for staking
          },
        ];
      }
    } catch (error) {
      console.error('Error fetching data from RPC:', error);
      // Fallback to database
      const utxoService = new UTXODatabaseService(process.env.DATABASE_URL!);
      utxos = await utxoService.getUTXOs(identityAddress);
    }

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

    const total = utxos.length;
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
      // Database stores value in satoshis
      const value = utxo.value || 0;
      const confirmations = utxo.creationHeight
        ? currentHeight - utxo.creationHeight
        : 0;

      // Calculate staking wait time for UTXOs that have found rewards
      let stakingWaitTime = null;
      let stakingWaitDays = null;
      let stakingWaitHours = null;

      // Convert value to VRSC for calculations
      const valueVRSC = value / 100000000;

      // For high-value UTXOs that likely found rewards, calculate wait time
      if (valueVRSC >= 100) {
        // High-value UTXOs (100+ VRSC) are likely stake rewards
        // The current age represents how long this UTXO waited before finding a reward
        stakingWaitTime = confirmations; // Time it took to find a reward
        stakingWaitDays = Math.floor((confirmations * 60) / (24 * 60 * 60));
        stakingWaitHours = Math.floor((confirmations * 60) / (60 * 60));
      }

      totalValue += value;

      if (value > largest) {
        largest = value;
      }

      if (confirmations > maxConfirmations) maxConfirmations = confirmations;
      if (confirmations < minConfirmations) minConfirmations = confirmations;

      // Categorize by size and analyze dust
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
      if (confirmations >= MIN_CONFIRMATIONS_FOR_STAKING || utxo.isEligible) {
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

      // Determine if this UTXO is related to staking
      // (valueVRSC already declared above)

      // High-value UTXOs (100+ VRSC) are likely stake outputs or important UTXOs
      const isHighValue = valueVRSC >= 100;

      // Medium-value UTXOs (10-100 VRSC) are likely stake inputs or regular UTXOs
      const isMediumValue = valueVRSC >= 10 && valueVRSC < 100;

      // Recent stake detection (UTXOs in cooldown with specific characteristics)
      const isRecentStake = status === 'cooldown' && confirmations < 150;

      // Stake input: typically smaller UTXOs that were used to create a stake
      const isStakeInput = isRecentStake && valueVRSC < 100;

      // Stake output: typically larger UTXOs that are the result of a successful stake
      const isStakeOutput = isRecentStake && valueVRSC >= 100;

      // Eligible UTXOs that are ready for staking (high priority for visualization)
      const isEligibleForStaking = status === 'eligible' && valueVRSC >= 1;

      const result = {
        txid: utxo.txid,
        vout: utxo.vout,
        value: value,
        valueVRSC: valueVRSC,
        confirmations: confirmations, // Use original confirmations for age
        status,
        height: utxo.creationHeight,
        blockTime: utxo.creationTime,
        // Enhanced stake-related information
        isStakeInput: isStakeInput,
        isStakeOutput: isStakeOutput,
        isHighValue: isHighValue,
        isMediumValue: isMediumValue,
        isEligibleForStaking: isEligibleForStaking,
        earnedAmount: isStakeOutput ? 3 : undefined, // Assume 3 VRSC reward for output UTXOs
        stakeReward: 3, // Standard stake reward
        // Staking wait time information
        stakingWaitTime: stakingWaitTime,
        stakingWaitDays: stakingWaitDays,
        stakingWaitHours: stakingWaitHours,
      };

      return result;
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

    // Calculate staking frequency from historical data
    const stakingFrequency = await calculateStakingFrequency(identityAddress);

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
        stakingFrequency: {
          averageDaysBetweenStakes: stakingFrequency.averageDaysBetweenStakes,
          formattedFrequency: stakingFrequency.formattedFrequency,
          totalStakes: stakingFrequency.totalStakes,
          hasHistoricalData: stakingFrequency.hasHistoricalData,
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
