import { NextRequest, NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';
import { addSecurityHeaders } from '@/lib/middleware/security';
import { logger } from '@/lib/utils/logger';
import { enhancedLogger } from '@/lib/utils/enhanced-logger';
import { SearchDatabaseService } from '@/lib/services/search-database';
import { getCachedIdentity, cacheIdentity } from '@/lib/verusid-cache';
import { needsPriorityScan } from '@/lib/services/priority-verusid-scanner';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let searchDb: SearchDatabaseService | null = null;
  let identity: string | undefined = undefined;

  try {
    const body = await request.json();
    identity = body?.identity;

    if (!identity) {
      const response = NextResponse.json(
        {
          success: false,
          error: 'Identity is required',
        },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    enhancedLogger.info('REQUEST', `Looking up VerusID: ${identity}`);

    // Initialize search database if available
    if (process.env.DATABASE_URL) {
      try {
        searchDb = new SearchDatabaseService(process.env.DATABASE_URL);
        await searchDb.initializeTables();
      } catch (error) {
        enhancedLogger.warn(
          'DATABASE',
          'Search database not available, continuing without storage',
          { error: (error as Error).message }
        );
      }
    }

    // Try cache first to avoid RPC call
    let cachedIdentity = null;
    let wasCached = false;
    try {
      cachedIdentity = await getCachedIdentity(identity);
      if (cachedIdentity) {
        wasCached = true;
        enhancedLogger.info('CACHE', `Found cached identity for: ${identity}`);
      }
    } catch (error) {
      enhancedLogger.warn('CACHE', 'Cache lookup failed, continuing with RPC', {
        error: (error as Error).message,
      });
    }

    // Look up the VerusID using latest API methods (or use cached data)
    const [identityData, identityHistory] = await Promise.allSettled([
      cachedIdentity
        ? Promise.resolve(null)
        : verusAPI.getIdentity(identity).catch(err => {
            logger.warn('Identity fetch failed:', err);
            return null;
          }),
      cachedIdentity
        ? Promise.resolve(null)
        : verusAPI.getIdentityHistory(identity).catch(err => {
            // Check if it's specifically the "Identity APIs not activated" error
            if (
              err.message &&
              err.message.includes('Identity APIs not activated')
            ) {
              logger.info(
                'Identity history not available - Identity APIs not activated on blockchain'
              );
              return {
                notAvailable: true,
                reason: 'Identity APIs not activated on blockchain',
              };
            }
            logger.warn('Identity history fetch failed:', err);
            return null;
          }),
    ]);

    // Build result from cache or RPC response
    let result;
    if (cachedIdentity) {
      // Use cached data - construct response format
      result = {
        identity: {
          identity: {
            identityaddress: cachedIdentity.identityAddress,
            name: cachedIdentity.name,
            primaryaddresses: cachedIdentity.primaryAddresses,
          },
          friendlyname: cachedIdentity.friendlyName,
        },
        history: null, // History not cached
        identityHistoryAvailable: false,
        timestamp: new Date().toISOString(),
        cached: true,
      };
    } else {
      result = {
        identity:
          identityData.status === 'fulfilled' ? identityData.value : null,
        history:
          identityHistory.status === 'fulfilled' ? identityHistory.value : null,
        identityHistoryAvailable:
          identityHistory.status === 'fulfilled' &&
          identityHistory.value &&
          !identityHistory.value.notAvailable,
        timestamp: new Date().toISOString(),
        cached: false,
      };

      // Cache the newly fetched identity
      if (result.identity) {
        try {
          const core = result.identity.identity || {};
          await cacheIdentity(
            core.identityaddress,
            core.name,
            result.identity.friendlyname,
            core.primaryaddresses || []
          );
          enhancedLogger.info('CACHE', `Cached identity for: ${identity}`);
        } catch (error) {
          enhancedLogger.warn('CACHE', 'Failed to cache identity', {
            error: (error as Error).message,
          });
        }
      }
    }

    if (!result.identity) {
      const response = NextResponse.json(
        {
          success: false,
          error: 'Identity not found',
        },
        { status: 404 }
      );
      return addSecurityHeaders(response);
    }

    // 🚀 PRIORITY SCANNING: Check if this VerusID needs priority scanning
    const identityAddress = result.identity.identity?.identityaddress;
    if (identityAddress) {
      try {
        const needsScan = await needsPriorityScan(identityAddress);
        if (needsScan) {
          enhancedLogger.info('SYSTEM', `Triggering priority scan for: ${identity} (${identityAddress})`);
          
          // Trigger priority scan in background (don't wait for completion)
          fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/verusid/priority-scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identityAddress }),
          }).catch(error => {
            enhancedLogger.warn('SYSTEM', 'Failed to trigger priority scan', {
              error: error.message,
            });
          });
        } else {
          enhancedLogger.info('SYSTEM', `No priority scan needed for: ${identity} (${identityAddress})`);
        }
      } catch (error) {
        enhancedLogger.warn('SYSTEM', 'Error checking priority scan status', {
          error: (error as Error).message,
        });
      }
    }

    enhancedLogger.info('REQUEST', `VerusID lookup successful: ${identity}`);

    // Store search in database if available
    if (searchDb && result.identity) {
      try {
        const responseTime = Date.now() - startTime;
        const userAgent = request.headers.get('user-agent') || undefined;
        const ipAddress =
          request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip') ||
          'unknown';

        // Store the search history
        const searchRecord = await searchDb.storeSearch({
          searchQuery: identity,
          searchType: 'verusid',
          resultFound: true,
          resultData: result,
          userAgent,
          ipAddress,
          timestamp: new Date(),
        });

        // Store the VerusID details
        const identityData = result.identity;
        const core = identityData.identity || {};

        await searchDb.storeVerusIDSearch({
          searchHistoryId: searchRecord.id,
          verusID: identity,
          identityAddress: core.identityaddress,
          primaryAddresses: core.primaryaddresses,
          friendlyName: identityData.friendlyname,
          fullyQualifiedName: identityData.fullyqualifiedname,
          parent: core.parent,
          minimumSignatures: core.minimumsignatures,
          canRevoke: Boolean(core.revocationauthority),
          privateAddress: core.privateaddress,
          contentMap: core.contentmap,
          revocationAuthority: core.revocationauthority,
          recoveryAuthority: core.recoveryauthority,
          timeLock: core.timelock,
          flags: core.flags,
          version: core.version,
          txid: identityData.txid,
          height: identityData.blockheight || identityData.height,
          status: identityData.status,
          blockHeight: identityData.blockheight || identityData.height,
          hasHistory: Boolean(result.history),
          historyAvailable: result.identityHistoryAvailable,
        });

        // Update analytics
        await searchDb.updateSearchAnalytics('verusid', responseTime, true);

        enhancedLogger.info(
          'DATABASE',
          `Stored VerusID search for: ${identity}`
        );
      } catch (error) {
        enhancedLogger.warn('DATABASE', 'Failed to store VerusID search', {
          error: (error as Error).message,
        });
        // Continue with response even if storage fails
      }
    }

    const response = NextResponse.json({
      success: true,
      data: result,
    });

    return addSecurityHeaders(response);
  } catch (error) {
    enhancedLogger.error('REQUEST', 'Error fetching VerusID', error as Error);

    // Store failed search if database is available
    if (searchDb) {
      try {
        const responseTime = Date.now() - startTime;
        const userAgent = request.headers.get('user-agent') || undefined;
        const ipAddress =
          request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip') ||
          'unknown';

        await searchDb.storeSearch({
          searchQuery: identity || 'unknown',
          searchType: 'verusid',
          resultFound: false,
          userAgent,
          ipAddress,
          timestamp: new Date(),
        });

        await searchDb.updateSearchAnalytics('verusid', responseTime, false);
      } catch (dbError) {
        enhancedLogger.warn('DATABASE', 'Failed to store failed search', {
          error: (dbError as Error).message,
        });
      }
    }

    const response = NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch VerusID',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );

    return addSecurityHeaders(response);
  } finally {
    // Close database connection if opened
    if (searchDb) {
      try {
        await searchDb.close();
      } catch (error) {
        enhancedLogger.warn(
          'DATABASE',
          'Failed to close search database connection',
          { error: (error as Error).message }
        );
      }
    }
  }
}
