import { NextResponse } from 'next/server';
import { CachedRPCClient } from '@/lib/cache/cached-rpc-client';

export async function GET() {
  try {
    // Use cached client (30s TTL) to reduce RPC calls
    const miningInfo = await CachedRPCClient.getMiningInfo();

    if (!miningInfo) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch mining information',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: miningInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching mining info:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch mining information',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
