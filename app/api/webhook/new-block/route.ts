import { NextRequest, NextResponse } from 'next/server';
import { broadcastNewBlock } from '@/lib/websocket/broadcaster';

export const dynamic = 'force-dynamic';

/**
 * Webhook endpoint for new block notifications
 * Called by blocknotify.sh when a new block is found
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { block } = body;

    if (!block) {
      return NextResponse.json(
        { success: false, error: 'Missing block parameter' },
        { status: 400 }
      );
    }

    console.log(`[Webhook] New block notification: ${block}`);

    // Broadcast to WebSocket clients
    try {
      await broadcastNewBlock(block);
    } catch (wsError) {
      console.error('[Webhook] WebSocket broadcast error:', wsError);
      // Don't fail the webhook if WebSocket fails
    }

    // Optionally trigger cache refresh or other actions
    // await refreshBlockCache(block);

    return NextResponse.json({
      success: true,
      message: 'Block notification received',
      block,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Webhook] Error processing block notification:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process block notification',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check webhook status
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Block notification webhook is active',
    endpoint: '/api/webhook/new-block',
    methods: ['POST'],
  });
}
