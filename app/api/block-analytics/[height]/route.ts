import { type NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

let dbPool: Pool | null = null;

function getDbPool() {
  if (!dbPool && process.env.DATABASE_URL) {
    dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return dbPool;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ height: string }> }
) {
  try {
    const { height } = await params;
    const blockHeight = parseInt(height);

    if (isNaN(blockHeight)) {
      return NextResponse.json(
        { success: false, error: 'Invalid block height' },
        { status: 400 }
      );
    }

    // Check if UTXO database is enabled
    const dbEnabled = process.env.UTXO_DATABASE_ENABLED === 'true';
    if (!dbEnabled || !process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          success: false,
          error: 'UTXO database not enabled',
        },
        { status: 503 }
      );
    }

    const db = getDbPool();
    if (!db) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection failed',
        },
        { status: 500 }
      );
    }

    // Get block analytics
    const query = `
      SELECT * FROM block_analytics WHERE height = $1
    `;

    const result = await db.query(query, [blockHeight]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Block analytics not found',
          message: 'This block has not been analyzed yet.',
        },
        { status: 404 }
      );
    }

    const block = result.rows[0];

    // Convert satoshis to VRSC where applicable
    const response = {
      success: true,
      data: {
        height: block.height,
        blockHash: block.block_hash,
        blockTime: block.block_time,
        blockType: block.block_type,
        size: block.size,
        version: block.version,
        difficulty: parseFloat(block.difficulty),
        stakeModifier: block.stake_modifier,
        chainwork: block.chainwork,
        bits: block.bits,
        nonce: block.nonce,
        transactions: {
          count: block.tx_count,
          coinbaseAmountVRSC:
            (parseFloat(block.coinbase_amount_satoshis) || 0) / 100000000,
          stakingRewardVRSC:
            (parseFloat(block.staking_reward_satoshis) || 0) / 100000000,
          totalFeesVRSC:
            (parseFloat(block.total_fees_satoshis) || 0) / 100000000,
        },
        network: {
          hashrate: block.network_hashrate,
          totalSupplyVRSC:
            (parseFloat(block.total_supply_satoshis) || 0) / 100000000,
          stakingParticipationRate: parseFloat(
            block.staking_participation_rate
          ),
        },
        timing: {
          blockInterval: block.block_interval,
          averageBlockTime: block.average_block_time,
          solveTime: block.solve_time,
        },
        staker:
          block.block_type === 'minted'
            ? {
                address: block.staker_address,
                identity: block.staker_identity,
                stakeAmountVRSC:
                  (parseFloat(block.stake_amount_satoshis) || 0) / 100000000,
                coinAgeDestroyed: block.coin_age_destroyed,
                stakeWeight: block.stake_weight,
              }
            : null,
        advanced: {
          merkleRoot: block.merkle_root,
          chainTrust: block.chain_trust,
          proofHash: block.proof_hash,
        },
        metadata: {
          createdAt: block.created_at,
        },
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching block analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch block analytics',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
