import { NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';
import { addSecurityHeaders } from '@/lib/middleware/security';
import { logger } from '@/lib/utils/logger';
import { type CurrencyDefinition } from 'verus-typescript-primitives/dist/currency/CurrencyDefinition';

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

// Fallback function to return mock data when RPC is unavailable
function getFallbackMockData() {
  logger.info('📦 Using fallback mock data (RPC unavailable)');
  
  const mockChains: PBaaSChainPrice[] = [
    {
      chainId: 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV',
      name: 'VRSC',
      fullyQualifiedName: 'VRSC',
      priceInVRSC: 1.0,
      reserves: 0,
      supply: 0,
      lastUpdate: Date.now(),
    },
    {
      chainId: 'i3f7tSctFkiPpiedY8QR5Tep9p4qDVebDx',
      name: 'Bridge.vETH',
      fullyQualifiedName: 'Bridge.vETH',
      priceInVRSC: 8.77,
      reserves: 9851,
      supply: 50000000,
      lastUpdate: Date.now(),
    },
    {
      chainId: 'iC5TQFrFXSYLQGkiZ8FYmZHFLuKPa7rjz2',
      name: 'Bridge.vDEX',
      fullyQualifiedName: 'Bridge.vDEX',
      priceInVRSC: 0.56,
      reserves: 79152,
      supply: 61200,
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
      name: 'USDC.vETH',
      fullyQualifiedName: 'USDC.vETH',
      priceInVRSC: 0.65,
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
      source: 'fallback-mock',
      note: 'Using fallback mock data - RPC connection unavailable. Please check Verus daemon is running.',
    },
  };

  // Cache the response
  cachedData = responseData;
  cacheTimestamp = Date.now();

  return addSecurityHeaders(NextResponse.json(responseData));
}

export async function GET() {
  // Check if PBaaS prices are disabled (to reduce daemon load)
  if (process.env.DISABLE_PBAAS_PRICES === 'true') {
    return addSecurityHeaders(
      NextResponse.json({
        success: true,
        data: {
          chains: [],
          count: 0,
          timestamp: Date.now(),
          disabled: true,
        },
      })
    );
  }

  // Return cached data if still fresh
  if (cachedData && Date.now() - cacheTimestamp < CACHE_TTL) {
    logger.info('Returning cached PBaaS prices');
    return addSecurityHeaders(NextResponse.json(cachedData));
  }
  try {
    logger.info('🔍 Fetching PBaaS chain prices from Verus blockchain...');

    let allChains;
    try {
      // ===== Fetch list of PBaaS chains =====
      allChains = await verusAPI.listCurrenciesWithFilter({
        systemtype: 'pbaas',
      });
    } catch (rpcError: any) {
      logger.warn('⚠️ RPC not available, using fallback mock data:', rpcError.message);
      // Fallback to mock data if RPC fails
      return getFallbackMockData();
    }

    // Filter to get real PBaaS chains (have a parent field)
    const pbaasChains = allChains
      ? (allChains as any[]).filter(chain => chain?.currencydefinition?.parent)
      : [];

    logger.info(
      `📊 Found ${pbaasChains.length} PBaaS chains to process for pricing`
    );

    // ===== Fetch price data for each PBaaS chain =====
    const chainPrices: PBaaSChainPrice[] = [];
    const seenChains = new Set<string>(); // Track unique chains to avoid duplicates

    // Always add VRSC with price 1.0 first
    chainPrices.push({
      chainId: 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV',
      name: 'VRSC',
      fullyQualifiedName: 'VRSC',
      priceInVRSC: 1.0,
      reserves: 0,
      supply: 0,
      lastUpdate: Date.now(),
    });
    seenChains.add('VRSC');

    for (const chain of pbaasChains) {
      try {
        // Validate chain data
        const currencyId =
          chain?.currencydefinition?.currencyid || chain?.currencyid;
        if (!currencyId || typeof currencyId !== 'string') {
          logger.warn(`Skipping chain with invalid currencyid:`, chain);
          continue;
        }

        // Get currency definition with bestcurrencystate
        const currencyDef: CurrencyDefinition = await verusAPI.call(
          'getcurrency',
          [currencyId]
        );

        if (currencyDef?.bestcurrencystate?.reservecurrencies) {
          const currencyState = currencyDef.bestcurrencystate;

          // Find price in primary reserve (VRSC or main chain)
          const vrscReserve = currencyState?.reservecurrencies.find(
            (r: any) =>
              r.currencyid === 'VRSC' ||
              r.currencyid === 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV' ||
              r.currencyid === 'VRSCTEST'
          );

          if (vrscReserve) {
            const priceInVRSC = vrscReserve?.priceinreserve || 0;
            const reserves = vrscReserve?.reserves || 0;

            // Skip if we've already seen this chain (avoid duplicates)
            if (seenChains.has(currencyDef.name)) {
              logger.info(`⏭️  Skipping duplicate: ${currencyDef.name}`);
              continue;
            }

            chainPrices.push({
              chainId: currencyDef.currencyid,
              name: currencyDef.name,
              fullyQualifiedName: currencyDef.fullyqualifiedname,
              priceInVRSC,
              reserves,
              supply: currencyState?.supply || 0,
              lastUpdate: Date.now(),
            });
            seenChains.add(currencyDef.name);

            logger.info(
              `✅ ${currencyDef.name}: ${priceInVRSC} VRSC (reserves: ${reserves})`
            );
          }
        }
      } catch (error) {
        logger.warn(
          `Failed to fetch price for chain ${chain?.currencydefinition?.name || 'unknown'}:`,
          error
        );
        // Continue with other chains
      }
    }

    logger.info(
      `✅ Retrieved prices for ${chainPrices.length} assets from Verus blockchain`
    );

    const responseData = {
      success: true,
      data: {
        chains: chainPrices,
        count: chainPrices.length,
        timestamp: Date.now(),
        source: 'verus-rpc',
        note: 'Live prices from Verus blockchain via RPC',
      },
    };

    // Cache the response
    cachedData = responseData;
    cacheTimestamp = Date.now();

    const response = NextResponse.json(responseData);
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
