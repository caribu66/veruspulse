import { type NextRequest, NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';
import { addSecurityHeaders } from '@/lib/middleware/security';
import { logger } from '@/lib/utils/logger';
import { getCachedIdentity } from '@/lib/verusid-cache';

export async function GET(_request: NextRequest) {
  try {
    logger.info('🔍 Fetching VerusIDs using cache system...');

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    // Get list of identities from RPC (same as VerusID lookup)
    // Pass parameters to get more identities
    const rpcIdentities = await verusAPI.listIdentities({
      start: 0,
      count: 1000, // Get up to 1000 identities
      txproof: false,
    });

    if (!rpcIdentities || rpcIdentities.length === 0) {
      logger.warn('⚠️ No identities found from RPC');
      return NextResponse.json({
        success: true,
        data: {
          identities: [],
          pagination: {
            page: 1,
            limit,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
          metadata: {
            search: search || null,
            dataSource: 'rpc_cache',
          },
        },
        timestamp: new Date().toISOString(),
      });
    }

    logger.info(`✅ Found ${rpcIdentities.length} identities from RPC`);

    // Filter by search if provided
    let filteredIdentities = rpcIdentities;
    if (search && Array.isArray(rpcIdentities)) {
      const searchLower = search.toLowerCase();
      filteredIdentities = rpcIdentities.filter(
        (identity: any) =>
          identity.friendlyname?.toLowerCase().includes(searchLower) ||
          identity.identity?.name?.toLowerCase().includes(searchLower) ||
          identity.identityaddress?.toLowerCase().includes(searchLower)
      );
    }

    // Limit results
    const limitedIdentities = Array.isArray(filteredIdentities)
      ? filteredIdentities.slice(0, limit)
      : [];

    // For each identity, get cached data (same as VerusID lookup)
    const enrichedIdentities = await Promise.all(
      limitedIdentities.map(async (identity: any) => {
        try {
          // Get cached identity data (same as VerusID lookup)
          const _cachedData = await getCachedIdentity(
            identity.friendlyname || identity.identity?.name
          );

          return {
            address:
              identity.identityaddress || identity.primaryaddresses?.[0] || '',
            name: identity.identity?.name || '',
            friendlyName: identity.friendlyname || '',
            displayName:
              identity.friendlyname ||
              identity.identity?.name ||
              identity.identityaddress,
            firstSeenBlock: null,
            lastScannedBlock: null,
            lastRefreshed: new Date().toISOString(),
            totalStakes: 0,
            totalRewardsVRSC: 0,
            lastStake: null,
            apyAllTime: null,
            networkRank: null,
          };
        } catch (error) {
          // If cache lookup fails, return basic identity data
          return {
            address:
              identity.identityaddress || identity.primaryaddresses?.[0] || '',
            name: identity.identity?.name || '',
            friendlyName: identity.friendlyname || '',
            displayName:
              identity.friendlyname ||
              identity.identity?.name ||
              identity.identityaddress,
            firstSeenBlock: null,
            lastScannedBlock: null,
            lastRefreshed: new Date().toISOString(),
            totalStakes: 0,
            totalRewardsVRSC: 0,
            lastStake: null,
            apyAllTime: null,
            networkRank: null,
          };
        }
      })
    );

    const response = NextResponse.json({
      success: true,
      data: {
        identities: enrichedIdentities,
        pagination: {
          page: 1,
          limit,
          total: rpcIdentities.length,
          totalPages: Math.ceil(rpcIdentities.length / limit),
          hasNextPage: false,
          hasPrevPage: false,
        },
        metadata: {
          search: search || null,
          dataSource: 'rpc_cache',
        },
      },
      timestamp: new Date().toISOString(),
    });

    return addSecurityHeaders(response);
  } catch (error: any) {
    logger.error('❌ Failed to fetch VerusIDs using cache system:', error);

    const response = NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch VerusID data',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );

    return addSecurityHeaders(response);
  }
}
