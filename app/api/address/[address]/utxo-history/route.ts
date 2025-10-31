// API endpoint for historical UTXO data
import { type NextRequest, NextResponse } from 'next/server';
import { UTXODatabaseService } from '@/lib/services/utxo-database';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
): Promise<NextResponse> {
  try {
    const { address } = await params;

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Address is required' },
        { status: 400 }
      );
    }

    // Check if UTXO database is enabled
    const utxoEnabled = process.env.UTXO_DATABASE_ENABLED === 'true';
    if (!utxoEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: 'UTXO database not enabled',
          message:
            'Set UTXO_DATABASE_ENABLED=true in .env.local to use this feature',
        },
        { status: 503 }
      );
    }

    // Initialize database service
    const databaseUrl = process.env.DATABASE_URL || '';
    const dbService = new UTXODatabaseService(databaseUrl);

    // Parse query parameters
    const searchParams = _request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined;

    // Get UTXO timeline from database

    // Get stake events for this address
    const stakeEvents = await dbService.getStakeEvents(address);

    // Filter by date range if provided
    let filteredEvents = stakeEvents;
    if (startDate || endDate) {
      filteredEvents = stakeEvents.filter((event: any) => {
        const eventDate = new Date(event.blockTime); // Use camelCase from mapper
        if (startDate && eventDate < startDate) return false;
        if (endDate && eventDate > endDate) return false;
        return true;
      });
    }

    // Format timeline data (mapper returns camelCase!)
    const timeline = filteredEvents.map((event: any) => ({
      blockHeight: event.blockHeight,  // Already camelCase from mapper
      blockTime: event.blockTime,      // Already camelCase from mapper
      txid: event.txid,
      rewardAmount: event.rewardAmount,  // Already camelCase from mapper
      stakeAmount: event.stakeAmount,    // Already camelCase from mapper
      stakeAge: event.stakeAge,          // Already camelCase from mapper
    }));

    return NextResponse.json({
      success: true,
      data: {
        address,
        timeline,
        summary: {
          totalEvents: timeline.length,
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in UTXO history API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch UTXO history',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST endpoint for triggering historical sync with custom parameters
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
): Promise<NextResponse> {
  try {
    const { address } = await params;

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Address is required' },
        { status: 400 }
      );
    }

    // Check if UTXO database is enabled
    const utxoEnabled = process.env.UTXO_DATABASE_ENABLED === 'true';
    if (!utxoEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: 'UTXO database not enabled',
          message:
            'Set UTXO_DATABASE_ENABLED=true in .env.local to use this feature',
        },
        { status: 503 }
      );
    }

    // Return message to use the comprehensive scanner instead
    return NextResponse.json(
      {
        success: false,
        error: 'This endpoint has been replaced',
        message: 'Use /api/admin/mass-scan to scan historical data',
        alternative: {
          endpoint: '/api/admin/mass-scan',
          method: 'POST',
          body: {
            action: 'start',
            options: {
              addresses: [address],
            },
          },
        },
        timestamp: new Date().toISOString(),
      },
      { status: 410 }
    );
  } catch (error) {
    console.error('Error in UTXO history sync:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync UTXO history',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
