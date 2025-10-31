import { type NextRequest, NextResponse } from 'next/server';
import { fastScanVerusID, getProgress } from '@/scripts/fast-on-demand-scanner';

/**
 * API endpoint for on-demand VerusID scanning
 * POST /api/verusid/scan
 *
 * Body: { verusidName: string }
 * Response: { success: boolean, scanId?: string, error?: string }
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { verusidName } = body;

    if (!verusidName) {
      return NextResponse.json(
        { success: false, error: 'VerusID name is required' },
        { status: 400 }
      );
    }

    console.info(`🚀 Starting FAST on-demand scan for: ${verusidName}`);

    // Start the scan (this will run synchronously and return results)
    const result = await fastScanVerusID(verusidName);

    return NextResponse.json({
      success: true,
      result,
      message: `Successfully scanned ${verusidName}`,
    });
  } catch (error: any) {
    console.error('On-demand scan error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Scan failed',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check scan progress
 * GET /api/verusid/scan/progress
 */
export async function GET(_request: NextRequest) {
  try {
    const progress = getProgress();
    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get progress',
      },
      { status: 500 }
    );
  }
}
