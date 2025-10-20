import { NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';

export async function GET() {
  try {
    const mempoolInfo = await verusAPI.getMempoolInfo();

    if (!mempoolInfo) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch mempool information',
        },
        { status: 500 }
      );
    }

    // Debug logging only when mempool is not empty
    if (mempoolInfo.size > 0) {
    }

    return NextResponse.json({
      success: true,
      data: mempoolInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching mempool info:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch mempool information',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
