import { NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';
import { addSecurityHeaders } from '@/lib/middleware/security';
import { logger } from '@/lib/utils/logger';

export async function GET() {
  try {
    logger.info('🔍 Fetching PBaaS chains...');

    // Use listcurrencies with systemtype filter to get PBaaS chains
    const pbaasChains = await verusAPI.listCurrenciesWithFilter({
      systemtype: 'pbaas',
    });

    logger.info(
      `✅ Retrieved ${pbaasChains ? pbaasChains.length : 0} PBaaS chains`
    );

    const response = NextResponse.json({
      success: true,
      data: {
        pbaasChains: pbaasChains || [],
        count: pbaasChains ? pbaasChains.length : 0,
        timestamp: Date.now(),
      },
    });

    return addSecurityHeaders(response);
  } catch (error: any) {
    logger.error('❌ Failed to fetch PBaaS chains:', error);

    const response = NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch PBaaS chains',
        details: error.message,
        timestamp: Date.now(),
      },
      { status: 500 }
    );

    return addSecurityHeaders(response);
  }
}
