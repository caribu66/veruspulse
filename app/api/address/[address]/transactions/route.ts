import { type NextRequest, NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!address) {
      return NextResponse.json(
        {
          success: false,
          error: 'Address is required',
        },
        { status: 400 }
      );
    }

    // Get transaction IDs for the address
    const txids = await verusAPI.getAddressTxids(address);

    if (!txids || txids.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Get detailed transaction information for recent transactions
    const recentTxids = txids.slice(-50); // Get last 50 transactions
    const transactions = await Promise.allSettled(
      recentTxids.map(async (txid: string) => {
        try {
          const tx = await verusAPI.getRawTransaction(txid, true);
          if (!tx) return null;

          // Get block information for stake reward detection
          let blockInfo = null;
          if (tx.blockhash) {
            try {
              blockInfo = await verusAPI.getBlock(tx.blockhash, 1);
            } catch {
              // Ignore block info errors
            }
          }

          // Determine if this is a sent or received transaction
          let type: 'sent' | 'received' | 'stake_reward' = 'received';
          let value = 0;
          let isStakeReward = false;

          // Basic stake reward detection
          if (blockInfo?.blocktype === 'minted' && blockInfo.tx?.[0] === txid) {
            isStakeReward = true;
          }

          // Check outputs for this address
          const outputValue =
            tx.vout?.reduce((sum: number, output: any) => {
              if (output.scriptPubKey?.addresses?.includes(address)) {
                return sum + (output.value || 0);
              }
              return sum;
            }, 0) || 0;

          // Check inputs for this address
          const inputValue = await Promise.allSettled(
            (tx.vin || []).map(async (input: any) => {
              if (input.txid && input.vout !== undefined) {
                try {
                  const prevTx = await verusAPI.getRawTransaction(
                    input.txid,
                    true
                  );
                  if (
                    prevTx?.vout?.[
                      input.vout
                    ]?.scriptPubKey?.addresses?.includes(address)
                  ) {
                    return prevTx.vout[input.vout].value || 0;
                  }
                } catch {
                  // Ignore errors for individual inputs
                }
              }
              return 0;
            })
          );

          const totalInputValue = inputValue
            .filter(result => result.status === 'fulfilled')
            .reduce((sum, result) => sum + (result as any).value, 0);

          // Determine transaction type
          if (isStakeReward) {
            type = 'stake_reward';
            value = outputValue;
          } else if (totalInputValue > 0 && outputValue === 0) {
            type = 'sent';
            value = totalInputValue;
          } else if (outputValue > 0) {
            type = 'received';
            value = outputValue;
          }

          return {
            txid,
            time: tx.time || tx.blocktime || 0,
            value,
            type,
            confirmations: tx.confirmations || 0,
            blockHeight: blockInfo?.height,
            blockType: blockInfo?.blocktype === 'minted' ? 'pos' : 'pow',
          };
        } catch (error) {
          console.error(`Error processing transaction ${txid}:`, error);
          return null;
        }
      })
    );

    const validTransactions = transactions
      .filter((result: any) => result.status === 'fulfilled' && result.value)
      .map((result: any) => result.value)
      .sort((a: any, b: any) => b.time - a.time);

    return NextResponse.json({
      success: true,
      data: validTransactions,
    });
  } catch (error) {
    console.error('Error fetching address transactions:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch address transactions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
