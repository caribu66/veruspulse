import { NextRequest, NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';
import { resolveVerusID, getCachedIdentity, cacheIdentity, getCachedBalances, cacheBalance } from '@/lib/verusid-cache';

export async function POST(request: NextRequest) {
  try {
    const { verusid } = await request.json();

    if (!verusid) {
      return NextResponse.json(
        {
          success: false,
          error: 'VerusID is required',
        },
        { status: 400 }
      );
    }

    console.log(`\n========================================`);
    console.log(`🔍 Getting balance for VerusID: ${verusid}`);
    console.log(`========================================\n`);

    // Try to get from cache first (avoids RPC call if already cached)
    console.log(`[1/3] Checking cache for ${verusid}...`);
    let cachedIdentity = await getCachedIdentity(verusid);
    
    // If not in cache OR cached but primary addresses field is undefined/null, fetch from RPC
    // Note: primaryAddresses can be empty array [] if identity legitimately has no addresses
    if (!cachedIdentity || cachedIdentity.primaryAddresses === undefined || cachedIdentity.primaryAddresses === null) {
      if (cachedIdentity) {
        console.log(`⚠️  Cache entry found but incomplete (primary addresses not populated)`);
      } else {
        console.log(`❌ Cache MISS - identity not in cache`);
      }
      
      console.log(`[2/3] 🌐 Calling RPC: getidentity("${verusid}") to fetch complete data...`);
      cachedIdentity = await resolveVerusID(verusid);
      console.log(`✓ RPC response received - got ${cachedIdentity.primaryAddresses.length} primary addresses`);
      
      // Update cache with complete data
      console.log(`[3/3] 💾 Storing in cache for next time...`);
      cacheIdentity(
        cachedIdentity.identityAddress, 
        cachedIdentity.name, 
        cachedIdentity.friendlyName,
        cachedIdentity.primaryAddresses
      ).catch(err => console.error('Cache error:', err));
    } else {
      console.log(`✅ Cache HIT! Identity found in cache`);
      console.log(`   - Identity Address: ${cachedIdentity.identityAddress}`);
      console.log(`   - Friendly Name: ${cachedIdentity.friendlyName}`);
      console.log(`   - Primary Addresses: ${cachedIdentity.primaryAddresses.length} found`);
      console.log(`[2/3] ⚡ SKIPPING RPC call to getidentity - using cached data!`);
    }

    // Use cached data - no RPC call to getidentity needed!
    const identityAddress = cachedIdentity.identityAddress;
    const primaryAddresses = cachedIdentity.primaryAddresses;

    console.log(`\n[3/3] 💰 Fetching balances...`);
    console.log(`   Identity has ${primaryAddresses.length} primary address(es): ${primaryAddresses.join(', ')}`);

    if (primaryAddresses.length === 0) {
      console.log(`⚠️  No primary addresses - returning zero balance`);
      return NextResponse.json({
        success: true,
        data: {
          verusid: verusid,
          balance: 0,
          primaryAddresses: [],
          message: 'No primary addresses found for this VerusID',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Get balance for VerusID I-address and each primary address
    const allAddresses = [identityAddress, ...primaryAddresses];
    
    // Check cache first for all addresses
    console.log(`   💾 Checking balance cache for ${allAddresses.length} address(es)...`);
    const cachedBalances = await getCachedBalances(allAddresses);
    
    // Identify which addresses need RPC calls
    const uncachedAddresses = allAddresses.filter(addr => !cachedBalances.has(addr));
    
    if (uncachedAddresses.length > 0) {
      console.log(`   🌐 Calling RPC: getaddressbalance for ${uncachedAddresses.length} uncached address(es)...`);
    } else {
      console.log(`   ⚡ ALL BALANCES IN CACHE - NO RPC CALLS NEEDED!`);
    }
    
    // Fetch balances for uncached addresses only
    const balancePromises = uncachedAddresses.map(async (address: string) => {
      try {
        const balanceData = await verusAPI.getAddressBalance(address);
        // Calculate sent amount properly: sent = received - balance
        const received = balanceData?.received || 0;
        const balance = balanceData?.balance || 0;
        const sent = Math.max(0, received - balance); // Ensure sent is never negative

        // Cache this balance for future requests (in satoshis)
        await cacheBalance(address, balance, received, sent);

        return {
          address,
          balance,
          received,
          sent,
          isIdentityAddress: address === identityAddress,
        };
      } catch (error) {
        console.error(`Error getting balance for address ${address}:`, error);
        return {
          address,
          balance: 0,
          received: 0,
          sent: 0,
          isIdentityAddress: address === identityAddress,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    const fetchedBalances = await Promise.allSettled(balancePromises);
    
    // Combine cached and fetched balances
    const addressBalances: any[] = [];
    
    // Add all addresses in order
    for (const address of allAddresses) {
      if (cachedBalances.has(address)) {
        // Use cached balance
        const cached = cachedBalances.get(address)!;
        addressBalances.push({
          status: 'fulfilled',
          value: {
            address,
            balance: cached.balance,
            received: cached.received,
            sent: cached.sent,
            isIdentityAddress: address === identityAddress,
            fromCache: true,
          }
        });
      } else {
        // Use fetched balance
        const fetchedIndex = uncachedAddresses.indexOf(address);
        addressBalances.push(fetchedBalances[fetchedIndex]);
      }
    }

    // Calculate total balance (convert from satoshis to VRSC)
    let totalBalance = 0;
    let totalReceived = 0;
    let totalSent = 0;
    const addressDetails: any[] = [];

    addressBalances.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const balance = result.value;
        // Convert from satoshis to VRSC (divide by 100,000,000)
        const balanceVRSC = balance.balance / 100000000;
        const receivedVRSC = balance.received / 100000000;
        const sentVRSC = balance.sent / 100000000;
        
        totalBalance += balanceVRSC;
        totalReceived += receivedVRSC;
        totalSent += sentVRSC;
        
        // Store converted values for address details
        addressDetails.push({
          ...balance,
          balance: balanceVRSC,
          received: receivedVRSC,
          sent: sentVRSC,
        });
      } else {
        console.error(
          `Failed to get balance for address ${primaryAddresses[index]}:`,
          result.reason
        );
        addressDetails.push({
          address: primaryAddresses[index],
          balance: 0,
          received: 0,
          sent: 0,
          error:
            result.reason instanceof Error
              ? result.reason.message
              : 'Unknown error',
        });
      }
    });

    console.log(`\n✅ Balance lookup complete for ${verusid}:`);
    console.log(`   Total Balance: ${totalBalance} VRSC`);
    console.log(`   Total Received: ${totalReceived} VRSC`);
    console.log(`   Total Sent: ${totalSent} VRSC`);
    console.log(`========================================\n`);

    return NextResponse.json({
      success: true,
      data: {
        verusid: verusid, // Use original input, not normalized
        totalBalance: totalBalance,
        totalReceived: totalReceived,
        totalSent: totalSent,
        primaryAddresses: primaryAddresses,
        identityAddress: identityAddress,
        addressDetails: addressDetails,
        friendlyName: cachedIdentity.friendlyName,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting VerusID balance:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get VerusID balance',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
