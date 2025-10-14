import { NextRequest, NextResponse } from 'next/server';
import { resolveVerusID, getCachedStats, getCachedIdentity, cacheIdentity } from '@/lib/verusid-cache';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input } = body;

    if (!input) {
      return NextResponse.json(
        { success: false, error: 'VerusID input required' },
        { status: 400 }
      );
    }

    // Try to get from cache first (avoids RPC call if already cached)
    let identity = await getCachedIdentity(input);
    let wasCached = identity !== null;
    
    // If not in cache, resolve via RPC and cache it
    if (!identity) {
      identity = await resolveVerusID(input);
      
      // Start background caching (doesn't block response)
      cacheIdentity(
        identity.identityAddress, 
        identity.name, 
        identity.friendlyName,
        identity.primaryAddresses
      );
    }
    
    // Get cached stats
    const stats = await getCachedStats(identity.identityAddress);

    return NextResponse.json({
      success: true,
      data: {
        identity: {
          identityAddress: identity.identityAddress,
          name: identity.name,
          friendlyName: identity.friendlyName,
        },
        stats: stats || { totalRewards: 0, rewardCount: 0, dailyStats: [] },
        cached: wasCached,
      },
    });
  } catch (error: any) {
    console.error('VerusID lookup error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lookup failed' },
      { status: 500 }
    );
  }
}

