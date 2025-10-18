import { NextRequest, NextResponse } from 'next/server';
import { VerusIDComprehensiveSync } from '@/lib/services/verusid-comprehensive-sync';

// Global sync instance
let syncService: VerusIDComprehensiveSync | null = null;

function getSyncService() {
  if (!syncService && process.env.DATABASE_URL) {
    syncService = new VerusIDComprehensiveSync(process.env.DATABASE_URL);
  }
  return syncService;
}

/**
 * POST: Start or configure a sync job
 */
export async function POST(request: NextRequest) {
  try {
    // Check if UTXO database is enabled
    const dbEnabled = process.env.UTXO_DATABASE_ENABLED === 'true';
    if (!dbEnabled || !process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          success: false,
          error: 'UTXO database not enabled',
          message:
            'Set UTXO_DATABASE_ENABLED=true and DATABASE_URL in your environment',
        },
        { status: 503 }
      );
    }

    const service = getSyncService();
    if (!service) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sync service not available',
        },
        { status: 500 }
      );
    }

    // Parse options from request
    const searchParams = request.nextUrl.searchParams;
    const batchSize = parseInt(searchParams.get('batch_size') || '5');
    const delay = parseInt(searchParams.get('delay') || '10000');
    const specificId = searchParams.get('specific_id') || undefined;
    const incremental = searchParams.get('incremental') === 'true';

    // Check if already running (only block if it's a general sync, not a specific VerusID)
    const currentProgress = service.getProgress();
    if (currentProgress.status === 'running' && !specificId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sync already in progress',
          progress: currentProgress,
        },
        { status: 409 }
      );
    }

    // Validate parameters
    if (batchSize < 1 || batchSize > 20) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid batch_size (must be 1-20)',
        },
        { status: 400 }
      );
    }

    if (delay < 1000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid delay (must be >= 1000ms)',
        },
        { status: 400 }
      );
    }

    // Start sync in background (don't await)
    service
      .syncAllVerusIDs({
        batchSize,
        delayBetweenBatches: delay,
        specificId,
        incremental,
      })
      .catch(error => {
        console.error('Sync error:', error);
      });

    // Return immediately with initial progress
    return NextResponse.json({
      success: true,
      message: 'Sync started',
      options: {
        batchSize,
        delay,
        specificId,
        incremental,
      },
      progress: service.getProgress(),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error starting sync:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start sync',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Check sync status
 */
export async function GET(request: NextRequest) {
  try {
    const dbEnabled = process.env.UTXO_DATABASE_ENABLED === 'true';
    if (!dbEnabled || !process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          success: false,
          error: 'UTXO database not enabled',
        },
        { status: 503 }
      );
    }

    const service = getSyncService();
    if (!service) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sync service not available',
        },
        { status: 500 }
      );
    }

    const progress = service.getProgress();

    return NextResponse.json({
      success: true,
      progress,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get sync status',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Stop sync
 */
export async function DELETE(request: NextRequest) {
  try {
    const service = getSyncService();
    if (!service) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sync service not available',
        },
        { status: 500 }
      );
    }

    service.stop();

    return NextResponse.json({
      success: true,
      message: 'Sync stopped',
      progress: service.getProgress(),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error stopping sync:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to stop sync',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Pause/Resume sync
 */
export async function PATCH(request: NextRequest) {
  try {
    const service = getSyncService();
    if (!service) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sync service not available',
        },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action'); // 'pause' or 'resume'

    if (action === 'pause') {
      service.pause();
    } else if (action === 'resume') {
      service.resume();
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action (use ?action=pause or ?action=resume)',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Sync ${action}d`,
      progress: service.getProgress(),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error pausing/resuming sync:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to pause/resume sync',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
