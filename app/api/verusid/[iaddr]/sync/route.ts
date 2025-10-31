import { type NextRequest, NextResponse } from 'next/server';
import { VerusIDComprehensiveSync } from '@/lib/services/verusid-comprehensive-sync';

// Global sync service instance
let syncService: VerusIDComprehensiveSync | null = null;

function getSyncService() {
  if (!syncService && process.env.DATABASE_URL) {
    syncService = new VerusIDComprehensiveSync(process.env.DATABASE_URL);
  }
  return syncService;
}

/**
 * POST: Start syncing a specific VerusID
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ iaddr: string }> }
) {
  try {
    const { iaddr } = await params;

    if (!iaddr) {
      return NextResponse.json(
        { success: false, error: 'I-address is required' },
        { status: 400 }
      );
    }

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

    // Check if already running
    const currentProgress = service.getProgress();
    if (currentProgress.status === 'running') {
      return NextResponse.json(
        {
          success: false,
          error: 'Sync already in progress',
          progress: currentProgress,
        },
        { status: 409 }
      );
    }

    // Parse options from request
    const searchParams = request.nextUrl.searchParams;
    const batchSize = parseInt(searchParams.get('batch_size') || '1');
    const delay = parseInt(searchParams.get('delay') || '2000');

    // Validate parameters
    if (batchSize < 1 || batchSize > 5) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid batch_size (must be 1-5 for single VerusID sync)',
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

    // Start sync for this specific VerusID
    service
      .syncAllVerusIDs({
        batchSize,
        delayBetweenBatches: delay,
        specificId: iaddr,
        incremental: false,
      })
      .catch(error => {
        console.error('Single VerusID sync error:', error);
      });

    // Return immediately with initial progress
    return NextResponse.json({
      success: true,
      message: `Sync started for VerusID: ${iaddr}`,
      options: {
        batchSize,
        delay,
        specificId: iaddr,
      },
      progress: service.getProgress(),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error starting single VerusID sync:', error);
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
 * GET: Check sync status for a specific VerusID
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ iaddr: string }> }
) {
  try {
    const { iaddr } = await params;

    if (!iaddr) {
      return NextResponse.json(
        { success: false, error: 'I-address is required' },
        { status: 400 }
      );
    }

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

    // Check if this specific VerusID is currently being synced
    const isCurrentTarget = progress.current === iaddr;

    return NextResponse.json({
      success: true,
      progress: {
        ...progress,
        isCurrentTarget,
        targetVerusID: iaddr,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error getting single VerusID sync status:', error);
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
