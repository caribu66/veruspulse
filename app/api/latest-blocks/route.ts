import { type NextRequest, NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';
import { computeBlockFees } from '@/lib/utils/fees';
import { extractCoinbasePayout } from '@/lib/utils/coinbase';

export async function GET(_request: NextRequest) {
  try {
    const { searchParams } = new URL(_request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const metrics = searchParams.get('metrics') === '1';

    // Get current block height
    const blockchainInfo = await verusAPI.getBlockchainInfo();
    const currentHeight = blockchainInfo.blocks;
    const verificationProgress = blockchainInfo.verificationprogress || 0;

    console.info(
      `Latest blocks API: Current height = ${currentHeight}, verification progress = ${(verificationProgress * 100).toFixed(1)}%, limit = ${limit}, offset = ${offset}`
    );

    // Check if blockchain is sufficiently synced (at least 95% synced)
    if (verificationProgress < 0.95) {
      console.warn(
        `Blockchain is only ${(verificationProgress * 100).toFixed(1)}% synced. Blocks may not be current.`
      );
    }

    // Ensure we don't fetch blocks beyond the current height
    if (currentHeight <= 0) {
      throw new Error('Invalid blockchain height');
    }

    // Fetch blocks in parallel
    const blockPromises = [];
    for (let i = 0; i < limit; i++) {
      const height = currentHeight - offset - i;
      if (height > 0 && height <= currentHeight) {
        blockPromises.push(
          verusAPI.getBlockHash(height).then(hash => verusAPI.getBlock(hash, 2))
        );
      } else {
        console.warn(
          `Skipping invalid height: ${height} (current: ${currentHeight})`
        );
      }
    }

    const blockResults = await Promise.allSettled(blockPromises);
    const blocks = await Promise.all(
      blockResults
        .filter(result => result.status === 'fulfilled')
        .map(async (result: any) => {
          const block = result.value;

          // Calculate block reward and detect stake rewards
          let reward = 0;
          let rewardType = 'unknown';
          let stakeRewardInfo = null;

          if (block.tx && block.tx.length > 0) {
            try {
              // First, try to use transaction data already in the block
              const firstTx = block.tx[0];

              if (firstTx && firstTx.vout && Array.isArray(firstTx.vout)) {
                // The coinbase transaction IS the reward - sum all outputs
                reward = firstTx.vout.reduce((sum: number, output: any) => {
                  return sum + (output.value || 0);
                }, 0);
              }

              // If no reward found in block data, try to fetch transaction details
              if (reward === 0) {
                const detailedTx = await verusAPI.getRawTransaction(
                  block.tx[0],
                  true
                );
                if (
                  detailedTx &&
                  detailedTx.vout &&
                  Array.isArray(detailedTx.vout)
                ) {
                  reward = detailedTx.vout.reduce(
                    (sum: number, output: any) => {
                      return sum + (output.value || 0);
                    },
                    0
                  );
                }
              }

              // Determine reward type based on block type
              if (block.blocktype === 'minted') {
                rewardType = 'pos'; // Proof of Stake
              } else if (block.blocktype === 'mined') {
                rewardType = 'pow'; // Proof of Work
              }

              // Basic stake reward info based on block type
              if (firstTx) {
                stakeRewardInfo = {
                  isStakeReward: block.blocktype === 'minted',
                  blockType: block.blocktype === 'minted' ? 'pos' : 'pow',
                  rewardAmount: reward,
                };
              }
            } catch (error) {
              console.error(
                `Error calculating reward for block ${block.height}:`,
                error
              );

              // Fallback: Use estimated rewards based on block type and height
              if (block.blocktype === 'minted') {
                rewardType = 'pos';
                // Current PoS reward (3 VRSC after January 2025 halving)
                reward = 3.0;
                stakeRewardInfo = {
                  isStakeReward: true,
                  blockType: 'pos',
                  rewardAmount: 3.0,
                  stakeAmount: 1000.0, // Estimated stake
                  stakeAge: 100, // Estimated stake age
                  stakedInputs: 1,
                  rewardOutputs: 1,
                };
              } else if (block.blocktype === 'mined') {
                rewardType = 'pow';
                // Current PoW reward (3 VRSC after January 2025 halving)
                reward = 3.0;
                stakeRewardInfo = {
                  isStakeReward: false,
                  blockType: 'pow',
                  rewardAmount: 3.0,
                };
              } else {
                // Default fallback for unknown block types
                reward = 3.0;
                rewardType = 'pow';
              }
            }
          }

          // Base block data
          const blockData = {
            hash: block.hash,
            height: block.height,
            time: block.time,
            size: block.size,
            weight: block.weight,
            version: block.version,
            nonce: block.nonce,
            bits: block.bits,
            difficulty: block.difficulty,
            chainwork: block.chainwork,
            nTx: block.tx ? block.tx.length : 0,
            previousblockhash: block.previousblockhash,
            nextblockhash: block.nextblockhash,
            merkleroot: block.merkleroot,
            tx: block.tx || [],
            modifier: block.modifier,
            confirmations: block.confirmations,
            solution: block.solution,
            valuePools: block.valuePools,
            anchor: block.anchor,
            blocktype: block.blocktype,
            postarget: block.postarget,
            chainstake: block.chainstake,
            reward: reward,
            rewardType: rewardType,
            // Include stake reward information for PoS blocks
            stakeRewardInfo: stakeRewardInfo,
            hasStakeReward: stakeRewardInfo?.isStakeReward || false,
            stakeAmount: stakeRewardInfo?.stakeAmount || 0,
            stakeRewardAmount: stakeRewardInfo?.rewardAmount || 0,
            stakeAge: stakeRewardInfo?.stakeAge || 0,
          };

          // Add heavy metrics if requested
          if (metrics) {
            try {
              // Calculate fees
              const feeResult = await computeBlockFees(
                block,
                (txid: string) => verusAPI.getRawTransaction(txid, true),
                200 // Limit lookups to prevent timeout
              );

              // Extract coinbase payout
              let coinbaseResult = null;
              if (block.tx && block.tx.length > 0) {
                const firstTx = block.tx[0];
                if (
                  firstTx &&
                  firstTx.vin &&
                  firstTx.vin.some((vin: any) => vin.coinbase)
                ) {
                  coinbaseResult = extractCoinbasePayout(firstTx);
                }
              }

              return {
                ...blockData,
                // Fee metrics
                feeTotal: feeResult.feeTotal,
                feePerByteAvg: feeResult.feePerByteAvg,
                feeApproximate: feeResult.approximate,
                feeProcessedTxs: feeResult.processedTxs,
                feeTotalTxs: feeResult.totalTxs,
                // Miner/Staker identity
                coinbasePayout: coinbaseResult?.payoutAddress || null,
                minerType: coinbaseResult?.minerType || 'miner',
                isShieldedPayout: coinbaseResult?.isShielded || false,
                totalPayout: coinbaseResult?.totalPayout || 0,
              };
            } catch (error) {
              console.error(
                `Heavy metrics failed for block ${block.height}:`,
                error
              );
              // Return base data with error flags
              return {
                ...blockData,
                feeTotal: 0,
                feePerByteAvg: 0,
                feeApproximate: true,
                feeProcessedTxs: 0,
                feeTotalTxs: block.tx ? block.tx.length : 0,
                coinbasePayout: null,
                minerType: 'miner',
                isShieldedPayout: false,
                totalPayout: 0,
                metricsError: true,
              };
            }
          }

          return blockData;
        })
    );

    return NextResponse.json({
      success: true,
      data: {
        blocks,
        totalBlocks: currentHeight,
        limit,
        offset,
        metrics: metrics,
        syncStatus: {
          verificationProgress: verificationProgress,
          isSynced: verificationProgress >= 0.95,
          syncPercentage: Math.round(verificationProgress * 100),
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching latest blocks:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch latest blocks',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
