import { NextRequest, NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';
import { addSecurityHeaders } from '@/lib/middleware/security';
import { logger } from '@/lib/utils/logger';
import { getCachedIdentity } from '@/lib/verusid-cache';

// List of known VerusIDs that we know exist - expanded list
const KNOWN_VERUSIDS = [
  'joanna@',
  'Joanna@',
  'joanna.VRSC@',
  'Joanna.VRSC@',
  'maestro@',
  'Maestro@',
  'maestro.VRSC@',
  'Maestro.VRSC@',
  'diana@',
  'Diana@',
  'diana.VRSC@',
  'Diana.VRSC@',
  'verus@',
  'Verus@',
  'verus.VRSC@',
  'Verus.VRSC@',
  'Verus Coin Foundation@',
  'Verus Coin Foundation.VRSC@',
  'mined@',
  'mined.VRSC@',
  'Mark81@',
  'Mark81.VRSC@',
  'gcb@',
  'gcb.VRSC@',
  'Jay@',
  'Jay.VRSC@',
  'Jan@',
  'Jan.VRSC@',
  'convo@',
  'convo.VRSC@',
  'Functionalize@',
  'Functionalize.VRSC@',
  'shout@',
  'shout.VRSC@',
  'caribu66@',
  'caribu66.VRSC@',
];

export async function GET(request: NextRequest) {
  try {
    logger.info('🔍 Fetching known VerusIDs using lookup system...');

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    // Try to lookup each known VerusID using the same system as VerusID lookup
    const enrichedIdentities = [];

    for (const verusid of KNOWN_VERUSIDS) {
      try {
        // Use the same lookup system as VerusID lookup
        const identityResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/verusid-lookup`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: verusid }),
          }
        );

        const identityResult = await identityResponse.json();

        if (identityResult.success && identityResult.data?.identity) {
          const identity = identityResult.data.identity;

          // Get cached data
          const cachedData = await getCachedIdentity(verusid);

          // Get balance data
          let balanceData = null;
          try {
            const balanceResponse = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/verusid-balance`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ verusid }),
              }
            );

            if (balanceResponse.ok) {
              const balanceResult = await balanceResponse.json();
              if (balanceResult.success) {
                balanceData = balanceResult.data;
              }
            }
          } catch (error) {
            // Balance fetch failed, continue without balance data
          }

          // Get comprehensive staking data
          let stakingData = null;
          try {
            const stakingResponse = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/verusid/${identity.identity?.identityaddress || identity.primaryaddresses?.[0]}/staking-stats`
            );

            if (stakingResponse.ok) {
              const stakingResult = await stakingResponse.json();
              if (stakingResult.success && stakingResult.data?.summary) {
                stakingData = stakingResult.data.summary;
              }
            }
          } catch (error) {
            // Staking data fetch failed, continue without staking data
          }

          const enrichedIdentity = {
            address:
              identity.identity?.identityaddress ||
              identity.primaryaddresses?.[0] ||
              '',
            name: identity.identity?.name || '',
            friendlyName: identity.friendlyname || '',
            displayName:
              identity.friendlyname || identity.identity?.name || verusid,
            firstSeenBlock: null,
            lastScannedBlock: null,
            lastRefreshed: new Date().toISOString(),
            totalStakes: stakingData?.totalStakes || 0,
            totalRewardsVRSC: stakingData?.totalRewardsVRSC || 0,
            lastStake: stakingData?.lastStake || null,
            apyAllTime: stakingData?.apyAllTime || null,
            networkRank: null,
            totalValueVRSC: balanceData?.totalBalance || 0,
          };

          // Apply search filter if provided
          if (
            !search ||
            enrichedIdentity.name
              .toLowerCase()
              .includes(search.toLowerCase()) ||
            enrichedIdentity.friendlyName
              .toLowerCase()
              .includes(search.toLowerCase()) ||
            enrichedIdentity.displayName
              .toLowerCase()
              .includes(search.toLowerCase())
          ) {
            enrichedIdentities.push(enrichedIdentity);
          }
        }
      } catch (error) {
        logger.warn(`Failed to lookup ${verusid}:`, error);
        // Continue with next identity
      }
    }

    // Limit results
    const limitedIdentities = enrichedIdentities.slice(0, limit);

    logger.info(
      `✅ Found ${limitedIdentities.length} identities from known list`
    );

    const response = NextResponse.json({
      success: true,
      data: {
        identities: limitedIdentities,
        pagination: {
          page: 1,
          limit,
          total: enrichedIdentities.length,
          totalPages: Math.ceil(enrichedIdentities.length / limit),
          hasNextPage: false,
          hasPrevPage: false,
        },
        metadata: {
          search: search || null,
          dataSource: 'known_identities',
        },
      },
      timestamp: new Date().toISOString(),
    });

    return addSecurityHeaders(response);
  } catch (error: any) {
    logger.error('❌ Failed to fetch known VerusIDs:', error);

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
