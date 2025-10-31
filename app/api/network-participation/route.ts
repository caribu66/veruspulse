import { type NextRequest, NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';

export async function GET(_request: NextRequest) {
  try {
    // Get basic network metrics
    const [blockchainInfo, txOutInfo, miningInfo] = await Promise.all([
      verusAPI.getBlockchainInfo().catch(() => null),
      verusAPI.getTxOutSetInfo().catch(() => null),
      verusAPI.getMiningInfo().catch(() => null),
    ]);

    // Calculate basic participation metrics (without stake age analysis)
    const participationMetrics = {
      // Basic network stats
      totalSupply: txOutInfo?.total_amount || blockchainInfo?.moneysupply || 0,
      circulatingSupply: blockchainInfo?.moneysupply || 0,
      currentHeight: blockchainInfo?.blocks || 0,

      // Network health
      averageBlockTime: calculateAverageBlockTime(blockchainInfo),
      networkHashRate: miningInfo?.networkhashps || 0,
      difficulty: miningInfo?.difficulty || blockchainInfo?.difficulty || 0,
    };

    return NextResponse.json({
      success: true,
      data: participationMetrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching network participation metrics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch network participation metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(_request: NextRequest) {
  try {
    return NextResponse.json(
      {
        success: false,
        error:
          'Network participation analysis feature is not currently available',
      },
      { status: 503 }
    );
  } catch (error) {
    console.error('Error in network participation analysis:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform network participation analysis',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Helper function to calculate average block time
function calculateAverageBlockTime(blockchainInfo: any): number {
  if (!blockchainInfo || !blockchainInfo.blocks || !blockchainInfo.mediantime) {
    return 60; // Default to 60 seconds (1 minute)
  }

  // Simplified calculation - in reality you'd want to analyze recent block times
  const _currentTime = Date.now() / 1000;
  const blocksInLastHour = 60; // Assuming 1 block per minute
  const timeSpan = 3600; // 1 hour in seconds

  return timeSpan / blocksInLastHour; // Average block time in seconds
}

// Helper function to calculate participation trends (placeholder)
async function _calculateParticipationTrends() {
  // This would analyze historical participation data
  // For now, return placeholder data
  return {
    daily: [
      { date: '2024-01-01', participationRate: 28.5 },
      { date: '2024-01-02', participationRate: 29.1 },
      { date: '2024-01-03', participationRate: 28.8 },
      // ... more historical data
    ],
    weekly: [
      { week: '2024-W01', avgParticipation: 28.8 },
      { week: '2024-W02', avgParticipation: 29.2 },
      // ... more weekly data
    ],
  };
}
