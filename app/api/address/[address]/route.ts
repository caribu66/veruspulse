import { NextRequest, NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';
import { verusClientWithFallback } from '@/lib/rpc-client-with-fallback';

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

    // Get address balance and transaction count
    const [balance, txids] = await Promise.allSettled([
      verusClientWithFallback.getAddressBalance(address),
      verusAPI.getAddressTxids(address), // Keep using direct API for txids as fallback doesn't support this
    ]);

    let balanceData = { balance: 0, received: 0, sent: 0, txcount: 0 };
    let txCount = 0;

    if (balance.status === 'fulfilled' && balance.value) {
      balanceData = balance.value;
      // Calculate sent amount properly: sent = received - balance
      balanceData.sent = Math.max(
        0,
        (balanceData.received || 0) - (balanceData.balance || 0)
      );
    }

    if (txids.status === 'fulfilled' && txids.value) {
      txCount = txids.value.length;
    }

    return NextResponse.json({
      success: true,
      data: {
        ...balanceData,
        txcount: txCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching address data:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch address data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
