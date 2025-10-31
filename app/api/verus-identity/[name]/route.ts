import { type NextRequest, NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';
import { addSecurityHeaders } from '@/lib/middleware/security';
import { logger } from '@/lib/utils/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const resolvedParams = await params;
    const identityName = resolvedParams.name;
    logger.info(`🔍 Fetching Verus identity: ${identityName}`);

    // Get specific identity information
    const identity = await verusAPI.getIdentity(identityName);

    logger.info(`✅ Retrieved identity: ${identityName}`);

    const response = NextResponse.json({
      success: true,
      data: {
        identity,
        name: identityName,
        timestamp: Date.now(),
      },
    });

    return addSecurityHeaders(response);
  } catch (error: any) {
    const resolvedParams = await params;
    logger.error(`❌ Failed to fetch identity ${resolvedParams.name}:`, error);

    const response = NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch identity',
        details: error.message,
        timestamp: Date.now(),
      },
      { status: 500 }
    );

    return addSecurityHeaders(response);
  }
}
