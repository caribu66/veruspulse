import { type NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

let dbPool: Pool | null = null;

function getDbPool() {
  if (!dbPool) {
    dbPool = new Pool({
      connectionString:
        process.env.DATABASE_URL ||
        'postgres://verus_user:verus_secure_2024@localhost:5432/pos_db',
    });
  }
  return dbPool;
}

export async function GET(
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

    const db = getDbPool();

    // Check if identity exists and has been scanned
    const identityCheck = await db.query(
      `SELECT 
        identity_address,
        base_name,
        friendly_name,
        scan_status,
        last_scanned_at,
        created_at
      FROM identities 
      WHERE identity_address = $1`,
      [iaddr]
    );

    if (identityCheck.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          status: 'not_found',
          message: 'Identity not in database yet',
          stage: 'initial',
          progress: 0,
        },
      });
    }

    const identity = identityCheck.rows[0];

    // Check staking rewards count
    const stakingCount = await db.query(
      `SELECT COUNT(*) as count FROM staking_rewards WHERE identity_address = $1`,
      [iaddr]
    );

    const stakeCount = parseInt(stakingCount.rows[0]?.count || '0');

    // Check if there's an active scan
    const scanMetadata = await db.query(
      `SELECT 
        scan_type,
        scan_progress,
        start_height,
        end_height,
        current_height,
        estimated_completion_time,
        created_at
      FROM scan_metadata 
      WHERE identity_address = $1 
      ORDER BY created_at DESC 
      LIMIT 1`,
      [iaddr]
    );

    // Determine current status and stage
    let status:
      | 'not_started'
      | 'scanning'
      | 'processing'
      | 'complete'
      | 'error' = 'not_started';
    let stage:
      | 'initial'
      | 'blockchain_scan'
      | 'data_processing'
      | 'stats_calculation'
      | 'complete' = 'initial';
    let progress = 0;
    let message = '';
    let estimatedTimeRemaining = null;
    let stakesFound = stakeCount;

    if (identity.scan_status === 'complete' && stakeCount > 0) {
      status = 'complete';
      stage = 'complete';
      progress = 100;
      message = `Found ${stakeCount} ${stakeCount === 1 ? 'stake' : 'stakes'}`;
    } else if (identity.scan_status === 'complete' && stakeCount === 0) {
      status = 'complete';
      stage = 'complete';
      progress = 100;
      message = 'No staking activity found';
    } else if (scanMetadata.rows.length > 0) {
      const scan = scanMetadata.rows[0];
      const scanProgress = parseFloat(scan.scan_progress || '0');

      status = 'scanning';
      progress = Math.min(Math.round(scanProgress), 95); // Cap at 95% until fully done

      if (scanProgress < 33) {
        stage = 'blockchain_scan';
        message = `Scanning blockchain... ${progress}%`;
      } else if (scanProgress < 66) {
        stage = 'data_processing';
        message = `Processing staking data... ${progress}%`;
      } else {
        stage = 'stats_calculation';
        message = `Calculating statistics... ${progress}%`;
      }

      // Estimate time remaining based on progress
      if (scan.estimated_completion_time) {
        const timeRemaining =
          new Date(scan.estimated_completion_time).getTime() - Date.now();
        if (timeRemaining > 0) {
          estimatedTimeRemaining = Math.ceil(timeRemaining / 1000); // seconds
        }
      }

      stakesFound = stakeCount;
    } else if (
      identity.scan_status === 'scanning' ||
      identity.scan_status === 'pending'
    ) {
      status = 'scanning';
      stage = 'blockchain_scan';
      progress = 5;
      message = 'Initializing scan...';
    } else {
      status = 'not_started';
      stage = 'initial';
      progress = 0;
      message = 'Waiting to start scan';
    }

    // Calculate time since last scan
    let timeSinceLastScan = null;
    if (identity.last_scanned_at) {
      timeSinceLastScan = Math.floor(
        (Date.now() - new Date(identity.last_scanned_at).getTime()) / 1000
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        identityAddress: identity.identity_address,
        friendlyName: identity.friendly_name,
        status,
        stage,
        progress,
        message,
        stakesFound,
        estimatedTimeRemaining,
        timeSinceLastScan,
        scanStatus: identity.scan_status,
        lastScannedAt: identity.last_scanned_at,
      },
    });
  } catch (error: any) {
    console.error('Scan progress error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get scan progress',
      },
      { status: 500 }
    );
  }
}
