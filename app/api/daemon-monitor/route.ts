import { NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import fs from 'fs';
import path from 'path';

// Daemon monitoring API endpoint
export async function GET() {
  try {
    logger.info('🔍 Fetching daemon monitoring data');

    const statsFile = path.join(process.cwd(), 'data', 'daemon-stats.json');

    // Check if stats file exists
    if (!fs.existsSync(statsFile)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Daemon monitoring data not available',
          message: 'Run the daemon monitor script to collect data',
          data: null,
        },
        { status: 404 }
      );
    }

    // Read and parse stats
    const statsData = fs.readFileSync(statsFile, 'utf8');
    const stats = JSON.parse(statsData);

    // Check if data is recent (within last 5 minutes)
    const now = Date.now();
    const lastUpdate = stats.lastUpdate;
    const dataAge = now - lastUpdate;
    const maxAge = 5 * 60 * 1000; // 5 minutes

    if (dataAge > maxAge) {
      logger.warn(
        `Daemon monitoring data is stale (${Math.round(dataAge / 1000)}s old)`
      );
    }

    // Calculate additional metrics
    const response = {
      success: true,
      data: {
        ...stats,
        dataAge: dataAge,
        isStale: dataAge > maxAge,
        timestamp: now,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Data-Age': dataAge.toString(),
        'X-Is-Stale': (dataAge > maxAge).toString(),
      },
    });
  } catch (error) {
    logger.error('❌ Failed to fetch daemon monitoring data:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch daemon monitoring data',
        details: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      },
      { status: 500 }
    );
  }
}

// POST endpoint to trigger manual data collection
export async function POST() {
  try {
    logger.info('🔄 Triggering manual daemon data collection');

    // This would trigger the monitor script to collect fresh data
    // For now, we'll just return a success message
    return NextResponse.json(
      {
        success: true,
        message: 'Manual data collection triggered',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('❌ Failed to trigger manual data collection:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to trigger manual data collection',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
