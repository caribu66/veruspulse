import { NextRequest, NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ iaddr: string }> }
) {
  const { iaddr } = await params;

  try {
    if (!iaddr) {
      return NextResponse.json(
        { error: 'Identity address is required' },
        { status: 400 }
      );
    }

    // Get UTXOs for the identity address using the correct RPC method
    const utxos = await verusAPI.getAddressUTXOs(iaddr);

    // Get current block height to calculate confirmations
    const blockchainInfo = await verusAPI.getBlockchainInfo();
    const currentHeight = blockchainInfo.blocks;

    // Calculate health metrics (getaddressutxos returns satoshis, not VRSC)
    const totalUTXOs = utxos.length;
    const totalValue =
      utxos.reduce((sum: number, utxo: any) => sum + (utxo.satoshis || 0), 0) /
      100000000; // Convert satoshis to VRSC
    const highValueUTXOs = utxos.filter(
      (utxo: any) => (utxo.satoshis || 0) >= 1000 * 100000000
    ).length; // 1000 VRSC in satoshis
    // Eligible = >= 1 VRSC AND >= 150 confirmations (ready to stake)
    const eligibleUTXOs = utxos.filter((utxo: any) => {
      const valueVRSC = (utxo.satoshis || 0) / 100000000;
      const confirmations = utxo.height ? currentHeight - utxo.height + 1 : 0;
      return valueVRSC >= 1 && confirmations >= 150;
    }).length;

    // Calculate size distribution
    const sizeDistribution = {
      tiny: { count: 0, valueVRSC: 0 },
      small: { count: 0, valueVRSC: 0 },
      medium: { count: 0, valueVRSC: 0 },
      large: { count: 0, valueVRSC: 0 },
    };

    utxos.forEach((utxo: any) => {
      const valueVRSC = (utxo.satoshis || 0) / 100000000; // Convert satoshis to VRSC
      if (valueVRSC < 10) {
        sizeDistribution.tiny.count++;
        sizeDistribution.tiny.valueVRSC += valueVRSC;
      } else if (valueVRSC < 100) {
        sizeDistribution.small.count++;
        sizeDistribution.small.valueVRSC += valueVRSC;
      } else if (valueVRSC < 1000) {
        sizeDistribution.medium.count++;
        sizeDistribution.medium.valueVRSC += valueVRSC;
      } else {
        sizeDistribution.large.count++;
        sizeDistribution.large.valueVRSC += valueVRSC;
      }
    });

    // Calculate fragmentation score
    const avgUtxoSize = totalValue / totalUTXOs;
    const fragmentationScore =
      avgUtxoSize < 10 ? 'high' : avgUtxoSize < 50 ? 'medium' : 'low';

    // Calculate efficiency
    const efficiency = totalUTXOs > 0 ? (eligibleUTXOs / totalUTXOs) * 100 : 0;

    // Determine if consolidation is recommended
    const consolidationRecommended =
      fragmentationScore === 'high' || totalUTXOs > 100;

    // Find largest UTXO
    const largestUtxo = utxos.reduce(
      (max: any, utxo: any) =>
        (utxo.satoshis || 0) > max.satoshis ? utxo : max,
      { satoshis: 0 }
    );

    // Format UTXOs for the visualizer
    const formattedUtxos = utxos.map((utxo: any) => {
      const valueVRSC = (utxo.satoshis || 0) / 100000000;
      const confirmations = utxo.height ? currentHeight - utxo.height + 1 : 0;

      // Determine status based on confirmations and value
      let status: 'eligible' | 'cooldown' | 'inactive';
      if (confirmations >= 150 && valueVRSC >= 1) {
        status = 'eligible'; // Ready to stake
      } else if (confirmations > 0 && confirmations < 150 && valueVRSC >= 1) {
        status = 'cooldown'; // In cooldown period
      } else {
        status = 'inactive'; // Too small or too new
      }

      return {
        value: utxo.satoshis || 0, // Already in satoshis
        valueVRSC: valueVRSC,
        confirmations: confirmations,
        status: status,
        txid: utxo.txid,
        blockTime: utxo.blockTime || 0,
        isStakeInput: false, // This would need to be determined from stake history
        isStakeOutput: false, // This would need to be determined from stake history
        isHighValue: valueVRSC >= 1000,
        isMediumValue: valueVRSC >= 100 && valueVRSC < 1000,
        isEligibleForStaking: confirmations >= 150 && valueVRSC >= 1,
        earnedAmount: 0, // This would need to be calculated from stake rewards
        stakeReward: 3, // Default stake reward percentage
      };
    });

    // Count UTXOs in cooldown status
    const cooldownUTXOs = formattedUtxos.filter(
      (utxo: any) => utxo.status === 'cooldown'
    ).length;

    const health = {
      total: totalUTXOs,
      highValue: highValueUTXOs,
      eligible: eligibleUTXOs,
      cooldown: cooldownUTXOs,
      totalValueVRSC: totalValue,
      sizeDistribution,
      fragmentationScore,
      efficiency,
      consolidationRecommended,
      largestUtxoVRSC: (largestUtxo.satoshis || 0) / 100000000,
    };

    return NextResponse.json({
      utxos: formattedUtxos,
      health,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error fetching UTXO analytics:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      iaddr,
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch UTXO analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
