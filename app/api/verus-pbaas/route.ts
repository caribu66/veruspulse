import { NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';
import { addSecurityHeaders } from '@/lib/middleware/security';
import { logger } from '@/lib/utils/logger';

export async function GET() {
  try {
    logger.info('🔍 Fetching PBaaS chains...');

    // Use listcurrencies with systemtype filter to get PBaaS chains
    const allChains = await verusAPI.listCurrenciesWithFilter({
      systemtype: 'pbaas',
    });

    // Filter out VRSC (main chain) - Real PBaaS chains have a 'parent' field
    const pbaasChains = allChains 
      ? (allChains as any[]).filter(chain => 
          chain?.currencydefinition?.parent
        )
      : [];

    logger.info(
      `✅ Retrieved ${pbaasChains.length} PBaaS chains (filtered from ${allChains?.length || 0} total)`
    );

    // Enrich each chain with supply data from getcurrency
    const enrichedChains = await Promise.all(
      pbaasChains.map(async (chain) => {
        try {
          const currencyId = chain?.currencydefinition?.currencyid || chain?.currencyid;
          if (currencyId) {
            const currencyDef: any = await verusAPI.call('getcurrency', [currencyId]);
            if (currencyDef?.bestcurrencystate?.supply) {
              return {
                ...chain,
                supply: currencyDef.bestcurrencystate.supply,
              };
            }
          }
        } catch (error) {
          logger.warn(`Failed to get supply for chain ${chain?.currencydefinition?.name}:`, error);
        }
        return chain;
      })
    );

    const response = NextResponse.json({
      success: true,
      data: {
        pbaasChains: enrichedChains,
        count: enrichedChains.length,
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
