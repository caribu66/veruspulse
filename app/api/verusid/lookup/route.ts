import { NextRequest, NextResponse } from 'next/server';
import {
  resolveVerusID,
  getCachedStats,
  getCachedIdentity,
  cacheIdentity,
} from '@/lib/verusid-cache';

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
    let cachedIdentity = await getCachedIdentity(input);
    let wasCached = cachedIdentity !== null;

    // Always resolve full identity details via RPC to get txid, height, etc.
    // The cache only stores basic info, but we need complete details for the UI
    let identity = await resolveVerusID(input);

    // If not in cache, start background caching (doesn't block response)
    if (!cachedIdentity) {
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
          primaryAddresses: identity.primaryAddresses,
          txid: identity.txid,
          height: identity.height,
          version: identity.version,
          minimumsignatures: identity.minimumsignatures,
          parent: identity.parent,
          canrevoke: identity.canrevoke,
          revocationauthority: identity.revocationauthority,
          recoveryauthority: identity.recoveryauthority,
          timelock: identity.timelock,
          flags: identity.flags,
          status: identity.status,
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
