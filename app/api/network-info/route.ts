import { NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';
import { addSecurityHeaders } from '@/lib/middleware/security';
import { logger } from '@/lib/utils/logger';

export async function GET() {
  try {
    logger.info('🔍 Fetching network information...');

    // Get network info
    const networkInfo = await verusAPI.getNetworkInfo();

    // Get peer info
    const peerInfo = await verusAPI.getPeerInfo();

    logger.info(`✅ Retrieved network information`);

    const response = NextResponse.json({
      success: true,
      data: {
        network: networkInfo,
        peers: peerInfo,
        connections: networkInfo?.connections || 0,
        timestamp: Date.now(),
      },
    });

    return addSecurityHeaders(response);
  } catch (error: any) {
    logger.error('❌ Failed to fetch network info:', error);

    const response = NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch network information',
        details: error.message,
        timestamp: Date.now(),
      },
      { status: 500 }
    );

    return addSecurityHeaders(response);
  }
}
