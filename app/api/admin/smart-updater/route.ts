import { type NextRequest, NextResponse } from 'next/server';
import {
  getSmartVerusIDUpdater,
  initializeSmartVerusIDUpdater,
} from '@/lib/services/smart-verusid-updater';
import { logger } from '@/lib/utils/logger';

/**
 * Smart VerusID Updater API
 * GET: Get status
 * POST: Initialize/start the smart updater
 */

export async function GET() {
  try {
    const smartUpdater = getSmartVerusIDUpdater();

    if (!smartUpdater) {
      return NextResponse.json({
        success: false,
        error: 'Smart updater not initialized',
        status: 'not_initialized',
      });
    }

    const status = smartUpdater.getStatus();

    return NextResponse.json({
      success: true,
      data: {
        status: 'running',
        ...status,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting smart updater status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get smart updater status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(_request: NextRequest) {
  try {
    const body = await _request.json();
    const { action } = body;

    if (action === 'initialize') {
      const databaseUrl = process.env.DATABASE_URL;

      if (!databaseUrl) {
        return NextResponse.json(
          {
            success: false,
            error: 'DATABASE_URL not configured',
          },
          { status: 400 }
        );
      }

      const smartUpdater = await initializeSmartVerusIDUpdater(databaseUrl);
      const status = smartUpdater.getStatus();

      return NextResponse.json({
        success: true,
        message: 'Smart VerusID Updater initialized and started',
        data: {
          status: 'initialized',
          ...status,
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'process') {
      const smartUpdater = getSmartVerusIDUpdater();

      if (!smartUpdater) {
        return NextResponse.json(
          {
            success: false,
            error: 'Smart updater not initialized',
          },
          { status: 400 }
        );
      }

      await smartUpdater.processNewBlocks();
      const status = smartUpdater.getStatus();

      return NextResponse.json({
        success: true,
        message: 'Processed new blocks',
        data: status,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action. Use "initialize" or "process"',
      },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Error in smart updater API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process smart updater request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
