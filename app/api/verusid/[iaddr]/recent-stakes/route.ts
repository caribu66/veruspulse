import { type NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ iaddr: string }> }
) {
  try {
    const { iaddr } = await params;

    if (!iaddr) {
      return NextResponse.json(
        { success: false, error: 'I-address is required' },
        { status: 400 }
      );
    }

    // Get live UTXO data first to detect recent stakes
    const liveUTXOsResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/verusid/${iaddr}/live-utxos`
    );
    const liveUTXOsData = await liveUTXOsResponse.json();

    let stakes7d = 0;
    let stakes30d = 0;
    const recentStakes = [];

    if (liveUTXOsData.success) {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Look for stake output UTXOs (these indicate successful stakes)
      // Each stake output UTXO represents one successful stake
      const seenStakes = new Set(); // Track unique stakes to avoid double counting

      for (const utxo of liveUTXOsData.data.utxos) {
        const blockTime = new Date(utxo.blockTime);
        const valueVRSC = utxo.value / 100000000;

        // Only count UTXOs that are actual stake rewards (~3 VRSC)
        // Ignore the isStakeOutput flag since it's incorrectly marking large UTXOs
        const isActualStakeReward =
          blockTime >= sevenDaysAgo && valueVRSC >= 2.9 && valueVRSC <= 3.1; // Standard stake reward is ~3 VRSC

        if (isActualStakeReward) {
          // Create a unique key for this stake (use blockTime + value to identify unique stakes)
          const stakeKey = `${blockTime.getTime()}_${utxo.value}`;

          if (!seenStakes.has(stakeKey)) {
            seenStakes.add(stakeKey);

            // This is a successful stake (stake output UTXO)
            recentStakes.push({
              blockHeight: 0, // We don't have block height from UTXO data
              blockTime: blockTime,
              rewardAmount: utxo.value,
              stakeAmount: utxo.value - 300000000, // Subtract 3 VRSC reward to get stake amount
              txid: utxo.txid,
            });

            if (blockTime >= sevenDaysAgo) {
              stakes7d++;
            }
            if (blockTime >= thirtyDaysAgo) {
              stakes30d++;
            }
          }
        }
      }

      // Sort recent stakes by time
      recentStakes.sort(
        (a, b) => b.blockTime.getTime() - a.blockTime.getTime()
      );
    }

    // Fallback to database for historical data if no recent stakes found
    if (stakes7d === 0 && stakes30d === 0) {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });

      try {
        const stakes7dResult = await pool.query(
          `
          SELECT COUNT(*) as count
          FROM staking_rewards
          WHERE identity_address = $1
          AND block_time > NOW() - INTERVAL '7 days'
        `,
          [iaddr]
        );

        const stakes30dResult = await pool.query(
          `
          SELECT COUNT(*) as count
          FROM staking_rewards
          WHERE identity_address = $1
          AND block_time > NOW() - INTERVAL '30 days'
        `,
          [iaddr]
        );

        stakes7d = parseInt(stakes7dResult.rows[0]?.count || '0');
        stakes30d = parseInt(stakes30dResult.rows[0]?.count || '0');

        await pool.end();
      } catch (error) {
        console.error('Error querying database:', error);
        await pool.end();
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        address: iaddr,
        stakes7d: stakes7d,
        stakes30d: stakes30d,
        recentStakes: recentStakes.slice(0, 10),
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error fetching recent stakes:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch recent stakes',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
