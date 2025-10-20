import { NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';
import { addSecurityHeaders } from '@/lib/middleware/security';
import { logger } from '@/lib/utils/logger';

export async function GET() {
  try {
    logger.info('🔍 Fetching Bridge.vETH real-time price...');

    // Get Bridge.vETH currency state directly
    const bridgeVethCurrencyId = 'i3f7tSctFkiPpiedY8QR5Tep9p4qDVebDx';
    
    const currencyState = await verusAPI.call('getcurrencystate', [bridgeVethCurrencyId]);
    
    if (!currencyState || !Array.isArray(currencyState) || currencyState.length === 0) {
      throw new Error('No currency state data returned');
    }

    const state = currencyState[0].currencystate;
    
    // Find VRSC reserve (primary pricing currency)
    const vrscReserve = state.reservecurrencies.find(
      (r: any) => r.currencyid === 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV'
    );

    if (!vrscReserve) {
      throw new Error('VRSC reserve not found in Bridge.vETH');
    }

    const bridgeVethData = {
      currencyId: bridgeVethCurrencyId,
      name: 'Bridge.vETH',
      fullyQualifiedName: 'Bridge.vETH',
      priceInVRSC: vrscReserve.priceinreserve,
      reserves: vrscReserve.reserves,
      supply: state.supply,
      lastUpdate: Date.now(),
      // Additional reserve info
      allReserves: state.reservecurrencies.map((r: any) => ({
        currencyId: r.currencyid,
        weight: r.weight,
        reserves: r.reserves,
        priceInReserve: r.priceinreserve
      }))
    };

    logger.info(`✅ Bridge.vETH price: ${bridgeVethData.priceInVRSC} VRSC`);

    const response = NextResponse.json({
      success: true,
      data: bridgeVethData,
      timestamp: Date.now(),
    });

    return addSecurityHeaders(response);
  } catch (error: any) {
    logger.error('❌ Failed to fetch Bridge.vETH price:', error);

    const response = NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch Bridge.vETH price',
        details: error.message,
        timestamp: Date.now(),
      },
      { status: 500 }
    );

    return addSecurityHeaders(response);
  }
}

