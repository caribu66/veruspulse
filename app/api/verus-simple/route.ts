import { NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';
import { addSecurityHeaders } from '@/lib/middleware/security';
import { logger } from '@/lib/utils/logger';

export async function GET() {
  try {
    logger.info('🔍 Fetching Verus simple API data...');

    // Get basic blockchain info using latest API methods
    const [blockchainInfo, networkInfo, difficulty] = await Promise.allSettled([
      verusAPI.getBlockchainInfo().catch(err => {
        logger.warn('Blockchain info fetch failed:', err);
        return null;
      }),
      verusAPI.getNetworkInfo().catch(err => {
        logger.warn('Network info fetch failed:', err);
        return null;
      }),
      verusAPI.getDifficulty().catch(err => {
        logger.warn('Difficulty fetch failed:', err);
        return null;
      }),
    ]);

    const result = {
      message: 'Verus simple API working with latest methods',
      blockchain:
        blockchainInfo.status === 'fulfilled' ? blockchainInfo.value : null,
      network: networkInfo.status === 'fulfilled' ? networkInfo.value : null,
      difficulty: difficulty.status === 'fulfilled' ? difficulty.value : null,
      timestamp: Date.now(),
    };

    logger.info('✅ Verus simple API data fetched successfully');

    const response = NextResponse.json({
      success: true,
      data: result,
    });

    return addSecurityHeaders(response);
  } catch (error: any) {
    logger.error('❌ Verus simple API error:', error);

    const response = NextResponse.json(
      {
        success: false,
        error: 'Simple API error',
        details: error.message,
      },
      { status: 500 }
    );

    return addSecurityHeaders(response);
  }
}
