import { NextRequest, NextResponse } from 'next/server';
import { getCachedStats } from '@/lib/verusid-cache';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ iaddr: string }> }
) {
  try {
    const { iaddr } = await params;
    const stats = await getCachedStats(iaddr);

    if (!stats) {
      // Return empty stats instead of error - this allows the UI to continue
      // The background indexing will populate the cache eventually
      return NextResponse.json({
        success: true,
        data: {
          totalRewards: 0,
          rewardCount: 0,
          dailyStats: [],
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('VerusID stats error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

