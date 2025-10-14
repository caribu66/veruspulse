import { NextRequest, NextResponse } from 'next/server';
import { blockRewardTracker } from '@/lib/services/block-reward-tracker';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const height = searchParams.get('height');

    if (height) {
      // Get reward for specific height
      const blockHeight = parseInt(height);
      if (isNaN(blockHeight) || blockHeight < 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid block height' },
          { status: 400 }
        );
      }

      const rewardInfo = blockRewardTracker.getRewardInfo(blockHeight);
      const posReward = blockRewardTracker.getPoSReward(blockHeight);

      return NextResponse.json({
        success: true,
        data: {
          height: blockHeight,
          blockReward: rewardInfo.reward,
          posReward,
          halvingEvent: rewardInfo.halvingEvent,
          timestamp: rewardInfo.timestamp,
        },
      });
    }

    // Return full schedule
    const halvingEvents = blockRewardTracker.getHalvingEvents();
    const currentReward = await blockRewardTracker.getCurrentBlockReward();
    const schedule = blockRewardTracker.debugSchedule();

    return NextResponse.json({
      success: true,
      data: {
        currentBlockReward: currentReward,
        currentPosReward: currentReward * 0.5,
        halvingEvents,
        schedule: schedule.split('\n'),
        scheduleText: schedule,
      },
    });
  } catch (error) {
    console.error('Error fetching block reward info:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch block reward info' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startHeight, endHeight } = body;

    if (!startHeight || !endHeight) {
      return NextResponse.json(
        { success: false, error: 'startHeight and endHeight are required' },
        { status: 400 }
      );
    }

    const breakdown = blockRewardTracker.getRewardBreakdown(
      parseInt(startHeight),
      parseInt(endHeight)
    );

    return NextResponse.json({
      success: true,
      data: breakdown,
    });
  } catch (error) {
    console.error('Error calculating reward breakdown:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate reward breakdown' },
      { status: 500 }
    );
  }
}
