import { NextRequest, NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';
import { addSecurityHeaders } from '@/lib/middleware/security';
import { logger } from '@/lib/utils/logger';
import { getCachedIdentity } from '@/lib/verusid-cache';

export async function GET(request: NextRequest) {
  try {
    logger.info('🔍 Fetching comprehensive VerusID data...');

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const search = searchParams.get('search') || '';

    // Get list of identities from RPC (this is the source of truth)
    const rpcIdentities = await verusAPI.listIdentities();
    
    if (!rpcIdentities || rpcIdentities.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          identities: [],
          metadata: {
            totalCount: 0,
            loadedCount: 0,
            search,
            limit,
            dataSource: 'rpc',
          },
        },
        timestamp: new Date().toISOString(),
      });
    }

    logger.info(`✅ Found ${rpcIdentities.length} identities from RPC`);

    // Filter by search if provided
    let filteredIdentities = rpcIdentities;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredIdentities = rpcIdentities.filter((identity: any) => 
        identity.friendlyname?.toLowerCase().includes(searchLower) ||
        identity.identity?.name?.toLowerCase().includes(searchLower) ||
        identity.identityaddress?.toLowerCase().includes(searchLower)
      );
    }

    // Limit results
    const limitedIdentities = filteredIdentities.slice(0, limit);

    // For each identity, try to get cached data (balance, staking info)
    const enrichedIdentities = await Promise.all(
      limitedIdentities.map(async (identity: any) => {
        try {
          // Get cached identity data if available
          const cachedData = await getCachedIdentity(identity.friendlyname || identity.identity?.name);
          
          // Get balance data if available
          let balanceData = null;
          try {
            const balanceResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/verusid-balance`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ verusid: identity.friendlyname || identity.identity?.name }),
            });
            
            if (balanceResponse.ok) {
              const balanceResult = await balanceResponse.json();
              if (balanceResult.success) {
                balanceData = balanceResult.data;
              }
            }
          } catch (error) {
            // Balance fetch failed, continue without balance data
          }

          return {
            address: identity.identityaddress || identity.primaryaddresses?.[0] || '',
            baseName: identity.identity?.name || '',
            friendlyName: identity.friendlyname || '',
            displayName: identity.friendlyname || identity.identity?.name || identity.identityaddress,
            totalStakes: 0,
            totalRewardsVRSC: 0,
            totalValueVRSC: balanceData?.totalBalance || 0,
            apyAllTime: null,
            apyYearly: null,
            apy90d: null,
            apy30d: null,
            apy7d: null,
            roiAllTime: null,
            stakingEfficiency: null,
            avgStakeAge: null,
            networkRank: null,
            networkPercentile: null,
            eligibleUtxos: 0,
            currentUtxos: 0,
            cooldownUtxos: 0,
            eligibleValueVRSC: balanceData?.totalBalance || 0,
            largestUtxoVRSC: 0,
            smallestEligibleVRSC: 0,
            highestRewardVRSC: 0,
            lowestRewardVRSC: 0,
            lastCalculated: null,
            dataCompleteness: balanceData ? 50 : 10,
            activityStatus: balanceData?.totalBalance > 0 ? 'active' : 'unknown',
            daysSinceLastStake: null,
            firstSeenBlock: null,
            lastScannedBlock: null,
            lastRefreshed: new Date().toISOString(),
            firstStakeTime: null,
            lastStakeTime: null,
          };
        } catch (error) {
          // If enrichment fails, return basic identity data
          return {
            address: identity.identityaddress || identity.primaryaddresses?.[0] || '',
            baseName: identity.identity?.name || '',
            friendlyName: identity.friendlyname || '',
            displayName: identity.friendlyname || identity.identity?.name || identity.identityaddress,
            totalStakes: 0,
            totalRewardsVRSC: 0,
            totalValueVRSC: 0,
            apyAllTime: null,
            apyYearly: null,
            apy90d: null,
            apy30d: null,
            apy7d: null,
            roiAllTime: null,
            stakingEfficiency: null,
            avgStakeAge: null,
            networkRank: null,
            networkPercentile: null,
            eligibleUtxos: 0,
            currentUtxos: 0,
            cooldownUtxos: 0,
            eligibleValueVRSC: 0,
            largestUtxoVRSC: 0,
            smallestEligibleVRSC: 0,
            highestRewardVRSC: 0,
            lowestRewardVRSC: 0,
            lastCalculated: null,
            dataCompleteness: 10,
            activityStatus: 'unknown',
            daysSinceLastStake: null,
            firstSeenBlock: null,
            lastScannedBlock: null,
            lastRefreshed: new Date().toISOString(),
            firstStakeTime: null,
            lastStakeTime: null,
          };
        }
      })
    );

    const response = NextResponse.json({
      success: true,
      data: {
        identities: enrichedIdentities,
        metadata: {
          totalCount: rpcIdentities.length,
          loadedCount: enrichedIdentities.length,
          search,
          limit,
          dataSource: 'rpc_with_cache',
          dataFreshness: new Date().toISOString(),
        },
      },
      timestamp: new Date().toISOString(),
    });

    return addSecurityHeaders(response);
  } catch (error: any) {
    logger.error('❌ Failed to fetch comprehensive VerusID data:', error);
    
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

