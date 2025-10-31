import { type NextRequest, NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ txid: string }> }
) {
  try {
    const { txid } = await params;

    if (!txid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transaction ID is required',
        },
        { status: 400 }
      );
    }

    // Fetch detailed transaction information
    const transaction = await verusAPI.getRawTransaction(txid, true);

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transaction not found',
        },
        { status: 404 }
      );
    }

    // Get additional transaction details
    const [blockInfo] = await Promise.allSettled([
      transaction.blockhash ? verusAPI.getBlock(transaction.blockhash) : null,
      // verusAPI.getMempoolInfo(),
    ]);

    let confirmations = 0;
    let fee = 0;

    if (blockInfo.status === 'fulfilled' && blockInfo.value) {
      const currentHeight = await verusAPI.getBlockCount();
      confirmations = currentHeight - blockInfo.value.height + 1;
    }

    // Calculate fee if possible
    if (transaction.vin && transaction.vout) {
      try {
        // For UTXO transactions, we need to get input values
        const inputValues = await Promise.allSettled(
          transaction.vin.map(async (input: any) => {
            if (input.txid && input.vout !== undefined) {
              const prevTx = await verusAPI.getRawTransaction(input.txid, true);
              return prevTx?.vout?.[input.vout]?.value || 0;
            }
            return 0;
          })
        );

        const totalInputValue = inputValues
          .filter((result: any) => result.status === 'fulfilled')
          .reduce((sum: any, result: any) => sum + result.value, 0);

        const totalOutputValue = transaction.vout.reduce(
          (sum: number, output: any) => sum + (output.value || 0),
          0
        );

        fee = Math.max(0, totalInputValue - totalOutputValue);
      } catch (error) {}
    }

    const response = {
      success: true,
      data: {
        ...transaction,
        confirmations,
        fee: fee > 0 ? fee : undefined,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching transaction details:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch transaction details',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
