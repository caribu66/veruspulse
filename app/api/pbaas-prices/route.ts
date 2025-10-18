import { NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';
import { addSecurityHeaders } from '@/lib/middleware/security';
import { logger } from '@/lib/utils/logger';
import { CurrencyDefinition } from 'verus-typescript-primitives/dist/currency/CurrencyDefinition';

interface PBaaSChainPrice {
  chainId: string;
  name: string;
  fullyQualifiedName: string;
  priceInVRSC: number;
  reserves: number;
  supply: number;
  lastUpdate: number;
}

export async function GET() {
  try {
    logger.info('🔍 Fetching PBaaS chain prices...');

    // Try to get PBaaS chains using existing pattern
    let pbaasChains;
    try {
      pbaasChains = await verusAPI.listCurrenciesWithFilter({
        systemtype: 'pbaas',
      });
    } catch (error) {
      logger.warn('listcurrencies method not available, using fallback data');
      // Fallback: return mock data for demonstration
      const mockChains: PBaaSChainPrice[] = [
        {
          chainId: 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq',
          name: 'VRSC',
          fullyQualifiedName: 'VRSC',
          priceInVRSC: 1.0,
          reserves: 1000000,
          supply: 100000000,
          lastUpdate: Date.now(),
        },
      ];

      return NextResponse.json({
        success: true,
        data: {
          chains: mockChains,
          count: mockChains.length,
          timestamp: Date.now(),
          note: 'Using fallback data - PBaaS RPC methods not available on this node',
        },
      });
    }

    logger.info(`PBaaS chains result:`, {
      type: typeof pbaasChains,
      isArray: Array.isArray(pbaasChains),
      length: pbaasChains?.length,
      data: pbaasChains,
    });

    if (
      !pbaasChains ||
      !Array.isArray(pbaasChains) ||
      pbaasChains.length === 0
    ) {
      logger.warn('No PBaaS chains found, using mock data for demonstration');
      // Return mock data for demonstration
      const mockChains: PBaaSChainPrice[] = [
        {
          chainId: 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq',
          name: 'VRSC',
          fullyQualifiedName: 'VRSC',
          priceInVRSC: 1.0,
          reserves: 1000000,
          supply: 100000000,
          lastUpdate: Date.now(),
        },
        {
          chainId: 'iBSUYP2aH3cLttnWWeMq4hQ2nVSFN8tWzo',
          name: 'VETH',
          fullyQualifiedName: 'VETH',
          priceInVRSC: 0.000045,
          reserves: 500000,
          supply: 50000000,
          lastUpdate: Date.now(),
        },
      ];

      return NextResponse.json({
        success: true,
        data: {
          chains: mockChains,
          count: mockChains.length,
          timestamp: Date.now(),
          note: 'Using mock data - PBaaS RPC methods not available on this node',
        },
      });
    }

    // Fetch price data for each PBaaS chain
    const chainPrices: PBaaSChainPrice[] = [];

    for (const chain of pbaasChains) {
      try {
        // Get currency definition with bestcurrencystate
        const currencyDef: CurrencyDefinition = await verusAPI.call(
          'getcurrency',
          [chain.currencyid]
        );

        if (currencyDef?.bestcurrencystate?.reservecurrencies) {
          const currencyState = currencyDef.bestcurrencystate;

          // Find price in primary reserve (VRSC or main chain)
          const vrscReserve = currencyState.reservecurrencies.find(
            r =>
              r.currencyid === 'VRSC' ||
              r.currencyid === 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV' ||
              r.currencyid === 'VRSCTEST'
          );

          if (vrscReserve) {
            const priceInVRSC = vrscReserve.priceinreserve || 0;
            const reserves = vrscReserve.reserves || 0;

            chainPrices.push({
              chainId: currencyDef.currencyid,
              name: currencyDef.name,
              fullyQualifiedName: currencyDef.fullyqualifiedname,
              priceInVRSC,
              reserves,
              supply: currencyState.supply,
              lastUpdate: Date.now(),
            });
          }
        }
      } catch (error) {
        logger.warn(
          `Failed to fetch price for chain ${chain.currencyid}:`,
          error
        );
        // Continue with other chains
      }
    }

    logger.info(`✅ Retrieved prices for ${chainPrices.length} PBaaS chains`);

    const response = NextResponse.json({
      success: true,
      data: {
        chains: chainPrices,
        count: chainPrices.length,
        timestamp: Date.now(),
      },
    });

    return addSecurityHeaders(response);
  } catch (error: any) {
    logger.error('❌ Failed to fetch PBaaS chain prices:', error);

    const response = NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch PBaaS chain prices',
        details: error.message,
        timestamp: Date.now(),
      },
      { status: 500 }
    );

    return addSecurityHeaders(response);
  }
}
