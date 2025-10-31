import { type NextRequest, NextResponse } from 'next/server';
import { dynamicBlockRewardAnalyzer } from '@/lib/services/dynamic-block-reward-analyzer';

export async function GET(_request: NextRequest) {
  try {
    const { searchParams } = new URL(_request.url);
    const sampleSize = parseInt(searchParams.get('samples') || '100');
    const forceRefresh = searchParams.get('refresh') === 'true';

    const schedule = await dynamicBlockRewardAnalyzer.analyzeBlockRewards(
      sampleSize,
      forceRefresh
    );

    const scheduleText = await dynamicBlockRewardAnalyzer.debugSchedule();

    return NextResponse.json({
      success: true,
      data: {
        schedule,
        scheduleText,
        totalPeriods: schedule.length,
        currentReward: schedule.find(p => p.isCurrent)?.blockReward || 0,
        analysisInfo: {
          sampleSize,
          forceRefresh,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Error analyzing block rewards:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze block rewards',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(_request: NextRequest) {
  try {
    const body = await _request.json();
    const { sampleSize = 100, forceRefresh = true } = body;

    console.info(
      `Triggering block reward analysis with ${sampleSize} samples...`
    );

    // Clear cache if requested
    if (forceRefresh) {
      dynamicBlockRewardAnalyzer.clearCache();
    }

    const schedule = await dynamicBlockRewardAnalyzer.analyzeBlockRewards(
      sampleSize,
      forceRefresh
    );

    return NextResponse.json({
      success: true,
      message: `Block reward analysis complete. Found ${schedule.length} reward periods.`,
      data: {
        totalPeriods: schedule.length,
        currentReward: schedule.find(p => p.isCurrent)?.blockReward || 0,
        periods: schedule.map(p => ({
          startHeight: p.startHeight,
          endHeight: p.endHeight,
          blockReward: p.blockReward,
          isCurrent: p.isCurrent,
        })),
      },
    });
  } catch (error) {
    console.error('Error triggering block reward analysis:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to trigger block reward analysis',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
