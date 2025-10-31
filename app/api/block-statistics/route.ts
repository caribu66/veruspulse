import { type NextRequest, NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';

export const dynamic = 'force-dynamic';

interface BlockStats {
  timeRange: {
    start: Date;
    end: Date;
    durationHours: number;
  };
  blocks: {
    total: number;
    pow: number;
    pos: number;
    powPercentage: number;
    posPercentage: number;
  };
  difficulty: {
    avg: number;
    max: number;
    min: number;
  };
  hashrate: {
    avgGHS: number;
    maxGHS: number;
    minGHS: number;
  };
  rewards: {
    totalVRSC: number;
    powVRSC: number;
    posVRSC: number;
  };
  fees: {
    totalVRSC: number;
    powVRSC: number;
    posVRSC: number;
  };
}

/**
 * Get block statistics for a time range
 * Inspired by Oink70's block-stats.sh
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse time parameters
    const hoursParam = searchParams.get('hours') || '24';
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    const hours = parseInt(hoursParam, 10);

    // Get current block height
    const currentHeight = await verusAPI.getBlockCount();

    // Calculate block range
    // Verus: ~1 minute per block = 60 blocks/hour
    const blocksPerHour = 60;
    let endHeight = currentHeight;
    let startHeight = currentHeight - hours * blocksPerHour;

    if (startParam) {
      startHeight = parseInt(startParam, 10);
    }
    if (endParam) {
      endHeight = parseInt(endParam, 10);
    }

    // Validate range
    if (startHeight < 1) startHeight = 1;
    if (endHeight > currentHeight) endHeight = currentHeight;
    if (startHeight >= endHeight) {
      return NextResponse.json(
        { success: false, error: 'Invalid block range' },
        { status: 400 }
      );
    }

    const blockRange = endHeight - startHeight;

    // Limit range to prevent overload
    if (blockRange > 10000) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Block range too large (max 10,000 blocks). Use smaller time window or specific start/end.',
        },
        { status: 400 }
      );
    }

    console.info(
      `[Block Stats] Analyzing blocks ${startHeight} to ${endHeight} (${blockRange} blocks)`
    );

    // Initialize accumulators
    let totalPow = 0;
    let totalPos = 0;
    const difficulties: number[] = [];
    const hashrates: number[] = [];
    let powRewards = 0;
    let posRewards = 0;
    let powFees = 0;
    let posFees = 0;

    let startTime: Date | null = null;
    let endTime: Date | null = null;

    // Sample blocks (for large ranges, sample every Nth block)
    const sampleRate = blockRange > 1000 ? Math.floor(blockRange / 1000) : 1;
    const samplesToProcess = Math.ceil(blockRange / sampleRate);

    console.info(
      `[Block Stats] Sampling every ${sampleRate} block(s), processing ~${samplesToProcess} samples`
    );

    for (let height = startHeight; height <= endHeight; height += sampleRate) {
      try {
        const blockHash = await verusAPI.getBlockHash(height);
        const block: any = await verusAPI.getBlock(blockHash, 2); // verbosity 2 for full tx data

        if (!startTime) {
          startTime = new Date(block.time * 1000);
        }
        endTime = new Date(block.time * 1000);

        const isPow = !block.proofOfStake;

        if (isPow) {
          totalPow++;
          difficulties.push(block.difficulty || 0);

          // Calculate hashrate from difficulty
          // Hashrate (H/s) ≈ Difficulty / Block Time
          const blockTime = 60; // Verus target: 60 seconds
          const hashrate = block.difficulty / blockTime;
          hashrates.push(hashrate);
        } else {
          totalPos++;
        }

        // Calculate rewards and fees from coinbase transaction
        if (block.tx && block.tx.length > 0) {
          const coinbase = block.tx[0];
          let totalOut = 0;

          if (coinbase.vout) {
            for (const vout of coinbase.vout) {
              totalOut += vout.value || 0;
            }
          }

          // Block reward is the coinbase output
          const blockReward = totalOut;

          // Fees are sum of (inputs - outputs) for all transactions except coinbase
          let fees = 0;
          for (let i = 1; i < block.tx.length; i++) {
            const tx = block.tx[i];
            let inputSum = 0;
            let outputSum = 0;

            if (tx.vin) {
              for (const vin of tx.vin) {
                inputSum += vin.value || 0;
              }
            }

            if (tx.vout) {
              for (const vout of tx.vout) {
                outputSum += vout.value || 0;
              }
            }

            fees += Math.max(0, inputSum - outputSum);
          }

          if (isPow) {
            powRewards += blockReward;
            powFees += fees;
          } else {
            posRewards += blockReward;
            posFees += fees;
          }
        }
      } catch (error) {
        console.error(`[Block Stats] Error processing block ${height}:`, error);
        // Continue with next block
      }
    }

    // Calculate statistics
    const total = totalPow + totalPos;
    const avgDifficulty =
      difficulties.length > 0
        ? difficulties.reduce((a, b) => a + b, 0) / difficulties.length
        : 0;
    const maxDifficulty =
      difficulties.length > 0 ? Math.max(...difficulties) : 0;
    const minDifficulty =
      difficulties.length > 0 ? Math.min(...difficulties) : 0;

    const avgHashrate =
      hashrates.length > 0
        ? hashrates.reduce((a, b) => a + b, 0) / hashrates.length
        : 0;
    const maxHashrate = hashrates.length > 0 ? Math.max(...hashrates) : 0;
    const minHashrate = hashrates.length > 0 ? Math.min(...hashrates) : 0;

    // Convert to GH/s
    const avgHashrateGHS = avgHashrate / 1e9;
    const maxHashrateGHS = maxHashrate / 1e9;
    const minHashrateGHS = minHashrate / 1e9;

    const durationMs =
      endTime && startTime ? endTime.getTime() - startTime.getTime() : 0;
    const durationHours = durationMs / (1000 * 60 * 60);

    const stats: BlockStats = {
      timeRange: {
        start: startTime || new Date(),
        end: endTime || new Date(),
        durationHours: durationHours,
      },
      blocks: {
        total,
        pow: totalPow,
        pos: totalPos,
        powPercentage: total > 0 ? (totalPow / total) * 100 : 0,
        posPercentage: total > 0 ? (totalPos / total) * 100 : 0,
      },
      difficulty: {
        avg: avgDifficulty,
        max: maxDifficulty,
        min: minDifficulty,
      },
      hashrate: {
        avgGHS: avgHashrateGHS,
        maxGHS: maxHashrateGHS,
        minGHS: minHashrateGHS,
      },
      rewards: {
        totalVRSC: powRewards + posRewards,
        powVRSC: powRewards,
        posVRSC: posRewards,
      },
      fees: {
        totalVRSC: powFees + posFees,
        powVRSC: powFees,
        posVRSC: posFees,
      },
    };

    return NextResponse.json({
      success: true,
      data: stats,
      meta: {
        blockRange: {
          start: startHeight,
          end: endHeight,
          total: blockRange,
        },
        sampleRate,
        samplesProcessed: samplesToProcess,
      },
    });
  } catch (error: any) {
    console.error('[Block Stats] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate block statistics',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
