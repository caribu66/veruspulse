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

// Simple in-memory cache to reduce load
let cachedData: any = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30000; // 30 seconds

export async function GET() {
  // Return cached data if still fresh
  if (cachedData && Date.now() - cacheTimestamp < CACHE_TTL) {
    logger.info('Returning cached PBaaS prices');
    return addSecurityHeaders(NextResponse.json(cachedData));
  }
  try {
    logger.info('🔍 Fetching PBaaS chain prices...');

    // Skip RPC calls and use mock data directly (RPC listcurrencies with systemtype filter not supported)
    // TODO: Remove this block and uncomment RPC logic below once RPC endpoint supports the required filters
    const USE_MOCK_DATA = true; // Set to false to re-enable RPC calls

    if (USE_MOCK_DATA) {
      logger.info(
        'Using realistic mock data based on cryptodashboard.faldt.net (RPC not configured)'
      );
      // Return realistic mock data based on actual cryptodashboard.faldt.net data
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
          name: 'Bridge.vETH',
          fullyQualifiedName: 'Bridge.vETH',
          priceInVRSC: 8.77, // Based on cryptodashboard: VRSC 8.77 = $13.42
          reserves: 9851,
          supply: 50000000,
          lastUpdate: Date.now(),
        },
        {
          chainId: 'iC1234567890ABCDEFGHIJKLMNOPQRSTUV',
          name: 'Bridge.vDEX',
          fullyQualifiedName: 'Bridge.vDEX',
          priceInVRSC: 0.56, // Based on cryptodashboard: $0.86 VRSC
          reserves: 79152,
          supply: 61200,
          lastUpdate: Date.now(),
        },
        {
          chainId: 'iD2345678901BCDEFGHIJKLMNOPQRSTUVW',
          name: 'Bridge.vARRR',
          fullyQualifiedName: 'Bridge.vARRR',
          priceInVRSC: 0.28, // Based on cryptodashboard: $0.43 VRSC
          reserves: 312567,
          supply: 104246,
          lastUpdate: Date.now(),
        },
        {
          chainId: 'iE3456789012CDEFGHIJKLMNOPQRSTUVWX',
          name: 'SUPER🛒',
          fullyQualifiedName: 'SUPER🛒',
          priceInVRSC: 0.65, // Based on cryptodashboard: $1.53 VRSC
          reserves: 50000,
          supply: 1000000,
          lastUpdate: Date.now(),
        },
        {
          chainId: 'iF4567890123DEFGHIJKLMNOPQRSTUVWXY',
          name: 'NATI🦉',
          fullyQualifiedName: 'NATI🦉',
          priceInVRSC: 0.65, // Based on cryptodashboard: $1.54 VRSC
          reserves: 25000,
          supply: 500000,
          lastUpdate: Date.now(),
        },
        {
          chainId: 'iG5678901234EFGHIJKLMNOPQRSTUVWXYZ',
          name: 'CHIPS',
          fullyQualifiedName: 'CHIPS',
          priceInVRSC: 0.065, // Based on cryptodashboard: $0.10 VRSC
          reserves: 1735790,
          supply: 10000000,
          lastUpdate: Date.now(),
        },
        {
          chainId: 'iH6789012345FGHIJKLMNOPQRSTUVWXYZ1',
          name: 'DAI.vETH',
          fullyQualifiedName: 'DAI.vETH',
          priceInVRSC: 0.65, // 1 DAI = 0.65 VRSC, so 1 VRSC = 1.54 USD
          reserves: 68069,
          supply: 100000000,
          lastUpdate: Date.now(),
        },
        {
          chainId: 'iI7890123456GHIJKLMNOPQRSTUVWXYZ12',
          name: 'USDC',
          fullyQualifiedName: 'USDC',
          priceInVRSC: 0.65, // Same as DAI for demo
          reserves: 4031,
          supply: 50000000,
          lastUpdate: Date.now(),
        },
      ];

      const responseData = {
        success: true,
        data: {
          chains: mockChains,
          count: mockChains.length,
          timestamp: Date.now(),
          note: 'Using realistic mock data based on cryptodashboard.faldt.net - connect to real Verus RPC endpoint for live data',
        },
      };

      // Cache the response
      cachedData = responseData;
      cacheTimestamp = Date.now();

      const response = NextResponse.json(responseData);
      return addSecurityHeaders(response);
    }

    // ===== RPC Logic (currently disabled) =====
    // Uncomment below to re-enable RPC calls once the endpoint supports required filters
    /*
    // Fetch price data for each PBaaS chain
    const chainPrices: PBaaSChainPrice[] = [];

    for (const chain of pbaasChains) {
      try {
        // Validate chain.currencyid before making the RPC call
        if (!chain?.currencyid || typeof chain.currencyid !== 'string') {
          logger.warn(`Skipping chain with invalid currencyid:`, chain);
          continue;
        }

        // Get currency definition with bestcurrencystate
        const currencyDef: CurrencyDefinition = await verusAPI.call(
          'getcurrency',
          [chain.currencyid]
        );

        if (currencyDef?.bestcurrencystate?.reservecurrencies) {
          const currencyState = currencyDef.bestcurrencystate;

          // Find price in primary reserve (VRSC or main chain)
          const vrscReserve = currencyState?.reservecurrencies.find(
            r =>
              r.currencyid === 'VRSC' ||
              r.currencyid === 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV' ||
              r.currencyid === 'VRSCTEST'
          );

          if (vrscReserve) {
            const priceInVRSC = vrscReserve?.priceinreserve || 0;
            const reserves = vrscReserve?.reserves || 0;

            chainPrices.push({
              chainId: currencyDef.currencyid,
              name: currencyDef.name,
              fullyQualifiedName: currencyDef.fullyqualifiedname,
              priceInVRSC,
              reserves,
              supply: currencyState?.supply || 0,
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
    */
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
