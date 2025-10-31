import { type NextRequest, NextResponse } from 'next/server';
import { VerusIDScanner } from '@/lib/services/verusid-scanner';
import { logger } from '@/lib/utils/logger';

let scanner: VerusIDScanner | null = null;

export async function POST(_request: NextRequest) {
  try {
    const body = await _request.json();
    const {
      batchSize = 10,
      includeExisting = false,
      generateMockData = true,
    } = body;

    // Check if scan is already running
    if (scanner && scanner.getProgress().isRunning) {
      return NextResponse.json(
        {
          success: false,
          error: 'Scan already in progress',
          progress: scanner.getProgress(),
        },
        { status: 409 }
      );
    }

    // Start new scan
    scanner = new VerusIDScanner();

    // Start scan in background
    scanner.startScan({
      batchSize,
      includeExisting,
      generateMockData,
    });

    // Return immediately with progress info
    return NextResponse.json({
      success: true,
      message: 'VerusID scan started',
      progress: scanner.getProgress(),
      options: {
        batchSize,
        includeExisting,
        generateMockData,
      },
    });
  } catch (error: any) {
    logger.error('❌ Failed to start VerusID scan:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start scan',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    if (!scanner) {
      return NextResponse.json(
        {
          success: false,
          error: 'No scanner instance found',
        },
        { status: 404 }
      );
    }

    const progress = scanner.getProgress();

    return NextResponse.json({
      success: true,
      progress,
      isRunning: progress.isRunning,
    });
  } catch (error: any) {
    logger.error('❌ Failed to get scan progress:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get progress',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    if (scanner) {
      scanner.stop();
      await scanner.cleanup();
      scanner = null;
    }

    return NextResponse.json({
      success: true,
      message: 'Scan stopped and cleaned up',
    });
  } catch (error: any) {
    logger.error('❌ Failed to stop scan:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to stop scan',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
