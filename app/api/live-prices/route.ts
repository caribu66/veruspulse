import { NextResponse } from 'next/server';
import { addSecurityHeaders } from '@/lib/middleware/security';
import { logger } from '@/lib/utils/logger';

interface LivePriceData {
  symbol: string;
  name: string;
  price: number;
  priceUSD: number;
  priceInVRSC?: number;
  change24h: number;
  volume24h: number;
  marketCap?: number;
  lastUpdate: number;
  source: 'rpc' | 'pbaas';
}

interface VRSCPriceSource {
  basketName: string;
  priceUSD: number;
  liquidity: number;
  method: 'stablecoin' | 'basket';
}

/**
 * Fetches VRSC price in USD from PBaaS basket currencies containing stablecoins
 * Uses method similar to cryptodashboard.faldt.net:
 * - Finds baskets with both VRSC and USD stablecoins (USDC, DAI, USDT, etc.)
 * - Calculates VRSC price from reserve ratios
 * - Cross-validates across multiple baskets
 * - Returns weighted average based on liquidity
 */
async function getVRSCPriceFromPBaaS(): Promise<{
  price: number;
  sources: VRSCPriceSource[];
} | null> {
  try {
    const pbaasResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/pbaas-prices`
    );

    if (!pbaasResponse.ok) {
      return null;
    }

    const pbaasData = await pbaasResponse.json();
    if (!pbaasData.success || !pbaasData.data.chains) {
      return null;
    }

    const vrscPriceSources: VRSCPriceSource[] = [];

    // USD stablecoins to look for (prioritized order)
    const usdStablecoins = [
      'DAI', // Most common on Bridge.vETH
      'USDC', // Circle stablecoin
      'USDT', // Tether
      'BUSD', // Binance USD
      'TUSD', // TrueUSD
      'EURC', // Euro stablecoin (can be converted)
    ];

    // Find all baskets with stablecoins to derive VRSC price
    for (const chain of pbaasData.data.chains) {
      const chainName = chain.name?.toUpperCase();

      // Check if this is a stablecoin
      const stablecoin = usdStablecoins.find(s => chainName?.includes(s));
      if (stablecoin && chain.priceInVRSC && chain.priceInVRSC > 0) {
        // For stablecoins: If 1 USDC = X VRSC, then 1 VRSC = 1/X USD
        let vrscPriceUSD = 1 / chain.priceInVRSC;

        // Adjust for EURC (Euro) - approximate conversion
        if (stablecoin === 'EURC') {
          vrscPriceUSD = vrscPriceUSD * 1.1; // Rough EUR to USD conversion
        }

        vrscPriceSources.push({
          basketName: chain.name || chain.fullyQualifiedName,
          priceUSD: vrscPriceUSD,
          liquidity: chain.reserves || 0,
          method: 'stablecoin',
        });

        logger.info(
          `📊 Found VRSC price from ${chain.name}: $${vrscPriceUSD.toFixed(4)} (reserves: ${chain.reserves || 0})`
        );
      }
    }

    if (vrscPriceSources.length === 0) {
      logger.warn(
        'No USD stablecoin found in PBaaS chains to derive VRSC price'
      );
      return null;
    }

    // Calculate weighted average based on liquidity (similar to cryptodashboard.faldt.net)
    // Baskets with higher liquidity have more weight
    const totalLiquidity = vrscPriceSources.reduce(
      (sum, s) => sum + s.liquidity,
      0
    );

    let weightedPrice = 0;
    if (totalLiquidity > 0) {
      weightedPrice = vrscPriceSources.reduce(
        (sum, source) =>
          sum + (source.priceUSD * source.liquidity) / totalLiquidity,
        0
      );
    } else {
      // If no liquidity data, use simple average
      weightedPrice =
        vrscPriceSources.reduce((sum, s) => sum + s.priceUSD, 0) /
        vrscPriceSources.length;
    }

    logger.info(
      `✅ Calculated VRSC price: $${weightedPrice.toFixed(4)} from ${vrscPriceSources.length} basket(s)`
    );

    return {
      price: weightedPrice,
      sources: vrscPriceSources,
    };
  } catch (error) {
    logger.warn('Failed to fetch VRSC price from PBaaS:', error);
    return null;
  }
}

export async function GET() {
  try {
    // Check if PBaaS prices are disabled (to reduce daemon load)
    if (process.env.DISABLE_PBAAS_PRICES === 'true') {
      return NextResponse.json({
        success: true,
        data: {
          prices: [],
          vrscPriceUSD: null,
          vrscPriceSources: [],
          timestamp: Date.now(),
          disabled: true,
        },
      });
    }

    logger.info('🔍 Fetching live price data from PBaaS chains only...');
    logger.info(
      '📊 Using cryptodashboard.faldt.net method: weighted average from multiple baskets'
    );

    const prices: LivePriceData[] = [];

    // Get VRSC price from PBaaS stablecoin bridges (USDC, DAI, etc.)
    // Uses weighted average across multiple baskets like cryptodashboard.faldt.net
    const vrscPriceData = await getVRSCPriceFromPBaaS();
    const vrscPriceUSD = vrscPriceData?.price || null;

    // Fetch all PBaaS chain prices from RPC
    try {
      const pbaasResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/pbaas-prices`
      );

      if (!pbaasResponse.ok) {
        throw new Error(`PBaaS API returned status ${pbaasResponse.status}`);
      }

      const pbaasData = await pbaasResponse.json();

      if (!pbaasData.success || !pbaasData.data.chains) {
        throw new Error('Invalid PBaaS API response');
      }

      logger.info(`📊 Processing ${pbaasData.data.chains.length} PBaaS chains`);

      // Add all PBaaS chains with on-chain pricing
      for (const chain of pbaasData.data.chains) {
        if (chain.priceInVRSC !== undefined) {
          // Calculate USD price if we have VRSC price
          const priceUSD = vrscPriceUSD ? vrscPriceUSD * chain.priceInVRSC : 0;

          prices.push({
            symbol: chain.name,
            name: chain.fullyQualifiedName || chain.name,
            price: priceUSD,
            priceUSD: priceUSD,
            priceInVRSC: chain.priceInVRSC,
            change24h: 0, // PBaaS chains don't have 24h change data on-chain
            volume24h: 0, // Would need to calculate from on-chain data
            lastUpdate: Date.now(),
            source: 'pbaas',
          });
        }
      }

      logger.info(
        `✅ Retrieved prices for ${prices.length} assets from PBaaS chains`
      );

      const response = NextResponse.json({
        success: true,
        data: {
          prices,
          count: prices.length,
          timestamp: Date.now(),
          sources: ['pbaas'],
          hasUSDPrice: vrscPriceUSD !== null,
          vrscPriceUSD: vrscPriceUSD,
          vrscPriceSources: vrscPriceData?.sources || [],
          priceCalculationMethod: 'weighted-average-across-baskets',
          lastUpdate: Date.now(),
          note: vrscPriceUSD
            ? `All prices derived from on-chain PBaaS data. VRSC price calculated from ${vrscPriceData?.sources.length || 0} basket(s) using weighted average (similar to cryptodashboard.faldt.net)`
            : 'USD prices unavailable - no stablecoin bridge found on PBaaS chains',
        },
      });

      return addSecurityHeaders(response);
    } catch (error: any) {
      logger.error('Failed to fetch PBaaS prices:', error);

      // Return error - no fallback to external sources
      const response = NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch prices from PBaaS chains',
          details: error.message,
          timestamp: Date.now(),
          note: 'Only PBaaS chain data is used - no external price sources',
        },
        { status: 500 }
      );

      return addSecurityHeaders(response);
    }
  } catch (error: any) {
    logger.error('❌ Failed to fetch live prices:', error);

    const response = NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch live prices',
        details: error.message,
        timestamp: Date.now(),
      },
      { status: 500 }
    );

    return addSecurityHeaders(response);
  }
}
