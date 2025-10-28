import { Pool } from 'pg';
import { logger } from '@/lib/utils/logger';

/**
 * Priority VerusID Scanner
 * Immediately scans and saves staking data for individual VerusIDs when users search for them
 */

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

// RPC helper
async function rpcCall(method: string, params: any[] = []) {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  const rpcUser = process.env.VERUS_RPC_USER || 'verus';
  const rpcPass = process.env.VERUS_RPC_PASSWORD || 'verus';
  const rpcHost = process.env.VERUS_RPC_HOST || '127.0.0.1';
  const rpcPort = process.env.VERUS_RPC_PORT || '18843';

  const rpcData = JSON.stringify({
    jsonrpc: '1.0',
    id: 'priority-scanner',
    method,
    params,
  });

  const escapedData = rpcData.replace(/'/g, "'\\''");
  const cmd = `curl -s --user ${rpcUser}:${rpcPass} --data-binary '${escapedData}' -H 'content-type: text/plain;' http://${rpcHost}:${rpcPort}/`;

  try {
    const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
    const result = JSON.parse(stdout);
    if (result.error) {
      throw new Error(result.error.message || JSON.stringify(result.error));
    }
    return result.result;
  } catch (error: any) {
    throw new Error(`RPC call failed: ${error.message}`);
  }
}

// Check if VerusID already has complete staking data
async function hasCompleteStakingData(
  identityAddress: string
): Promise<boolean> {
  const db = getDbPool();
  if (!db) return false;

  try {
    const result = await db.query(
      `
      SELECT COUNT(*) as stake_count
      FROM staking_rewards 
      WHERE identity_address = $1
        AND source_address = identity_address
    `,
      [identityAddress]
    );

    const stakeCount = parseInt(result.rows[0]?.stake_count) || 0;

    // Consider "complete" if we have at least 10 stakes or if it's been scanned recently
    if (stakeCount >= 10) return true;

    // Check if it was scanned recently (within last 24 hours)
    const recentResult = await db.query(
      `
      SELECT MAX(block_time) as last_stake
      FROM staking_rewards 
      WHERE identity_address = $1
        AND source_address = identity_address
    `,
      [identityAddress]
    );

    const lastStake = recentResult.rows[0]?.last_stake;
    if (lastStake) {
      const lastStakeTime = new Date(lastStake).getTime();
      const now = Date.now();
      const hoursSinceLastStake = (now - lastStakeTime) / (1000 * 60 * 60);

      // If last stake was within 24 hours, consider it complete
      if (hoursSinceLastStake < 24) return true;
    }

    return false;
  } catch (error) {
    logger.error('Error checking staking data completeness:', error);
    return false;
  }
}

// Find stakes for a specific VerusID in a block
function findStakesForVerusID(block: any, targetAddress: string) {
  const stakes: Array<{
    address: string;
    amount: number;
    blockHeight: number;
    blockTime: string;
    txid: string;
    vout: number;
    blockHash: string;
  }> = [];

  if (!block || !block.tx || block.tx.length === 0) return stakes;

  // Check if this is a PoS block (minted/staked)
  const isPoS =
    block.validationtype === 'stake' || block.blocktype === 'minted';
  if (!isPoS) return stakes;

  // Coinstake transaction (first tx in PoS block)
  const coinstake = block.tx[0];
  if (!coinstake || !coinstake.vout) return stakes;

  // Check each output for our target address
  for (let voutIdx = 0; voutIdx < coinstake.vout.length; voutIdx++) {
    const vout = coinstake.vout[voutIdx];
    if (!vout.scriptPubKey || !vout.scriptPubKey.addresses) continue;

    for (const addr of vout.scriptPubKey.addresses) {
      if (addr === targetAddress) {
        stakes.push({
          address: addr,
          amount: Math.round(vout.value * 100000000), // Reward amount in satoshis
          blockHeight: block.height,
          blockTime: new Date(block.time * 1000).toISOString(),
          txid: coinstake.txid,
          vout: voutIdx,
          blockHash: block.hash,
        });
      }
    }
  }

  return stakes;
}

// Insert stake into database
async function insertStake(stake: any) {
  const db = getDbPool();
  if (!db) return;

  try {
    await db.query(
      `
      INSERT INTO staking_rewards (
        identity_address, txid, vout, block_height, block_hash, 
        block_time, amount_sats, classifier, source_address
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (txid, vout) DO NOTHING
    `,
      [
        stake.address,
        stake.txid,
        stake.vout,
        stake.blockHeight,
        stake.blockHash,
        stake.blockTime,
        stake.amount,
        'coinbase', // PoS rewards
        stake.address,
      ]
    );
  } catch (error) {
    logger.error(`Error inserting stake: ${error}`);
  }
}

// Priority scan for a specific VerusID
export async function priorityScanVerusID(identityAddress: string): Promise<{
  success: boolean;
  stakesFound: number;
  message: string;
}> {
  try {
    logger.info(`🚀 Priority scanning VerusID: ${identityAddress}`);

    // Check if already has complete data
    const hasComplete = await hasCompleteStakingData(identityAddress);
    if (hasComplete) {
      logger.info(`✅ ${identityAddress} already has complete staking data`);
      return {
        success: true,
        stakesFound: 0,
        message: 'Already has complete staking data',
      };
    }

    const db = getDbPool();
    if (!db) {
      throw new Error('Database connection failed');
    }

    // Get VerusID info
    const verusIDResult = await db.query(
      `
      SELECT base_name, friendly_name 
      FROM identities 
      WHERE identity_address = $1
    `,
      [identityAddress]
    );

    if (verusIDResult.rows.length === 0) {
      throw new Error('VerusID not found in database');
    }

    const verusID = verusIDResult.rows[0];
    logger.info(
      `📊 Scanning ${verusID.friendly_name || verusID.base_name} (${identityAddress})`
    );

    // Get current blockchain height
    const currentHeight = await rpcCall('getblockcount');
    const VERUSID_ACTIVATION_BLOCK = 800200;

    // Start from VerusID activation or last scanned block
    const lastScannedResult = await db.query(
      `
      SELECT MAX(block_height) as last_height
      FROM staking_rewards 
      WHERE identity_address = $1
        AND source_address = identity_address
    `,
      [identityAddress]
    );

    const lastScanned =
      lastScannedResult.rows[0]?.last_height || VERUSID_ACTIVATION_BLOCK - 1;
    const startHeight = lastScanned + 1;
    const endHeight = currentHeight;

    if (startHeight > endHeight) {
      logger.info(`✅ ${identityAddress} is already up to date`);
      return {
        success: true,
        stakesFound: 0,
        message: 'Already up to date',
      };
    }

    logger.info(
      `🔍 Scanning blocks ${startHeight.toLocaleString()} to ${endHeight.toLocaleString()} for ${identityAddress}`
    );

    let stakesFound = 0;
    const BATCH_SIZE = 100; // Smaller batches for priority scanning
    const MAX_BLOCKS = 10000; // Limit to prevent long delays

    // Limit the scan to prevent long delays for users
    const actualEndHeight = Math.min(endHeight, startHeight + MAX_BLOCKS - 1);

    for (
      let height = startHeight;
      height <= actualEndHeight;
      height += BATCH_SIZE
    ) {
      const batchEnd = Math.min(height + BATCH_SIZE - 1, actualEndHeight);

      // Process batch
      for (let h = height; h <= batchEnd; h++) {
        try {
          const hash = await rpcCall('getblockhash', [h]);
          const block = await rpcCall('getblock', [hash, 2]);

          const stakes = findStakesForVerusID(block, identityAddress);
          for (const stake of stakes) {
            await insertStake(stake);
            stakesFound++;
          }

          // Show progress every 1000 blocks
          if ((h - startHeight) % 1000 === 0) {
            logger.info(
              `📈 Progress: Block ${h.toLocaleString()}/${actualEndHeight.toLocaleString()} - ${stakesFound} stakes found`
            );
          }
        } catch (error) {
          // Continue on individual block errors
          logger.warn(`Error scanning block ${h}: ${error}`);
        }
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Calculate and save statistics for this VerusID
    if (stakesFound > 0) {
      await calculateVerusIDStatistics(identityAddress);
    }

    const message =
      stakesFound > 0
        ? `Found ${stakesFound} new stakes for ${verusID.friendly_name || verusID.base_name}`
        : `No new stakes found for ${verusID.friendly_name || verusID.base_name}`;

    logger.info(`✅ Priority scan complete: ${message}`);

    return {
      success: true,
      stakesFound,
      message,
    };
  } catch (error: any) {
    logger.error(`❌ Priority scan failed for ${identityAddress}:`, error);
    return {
      success: false,
      stakesFound: 0,
      message: `Scan failed: ${error.message}`,
    };
  }
}

// Calculate statistics for a specific VerusID
async function calculateVerusIDStatistics(identityAddress: string) {
  const db = getDbPool();
  if (!db) return;

  try {
    // Get existing statistics
    const existingResult = await db.query(
      `
      SELECT * FROM verusid_statistics WHERE address = $1
    `,
      [identityAddress]
    );

    // Calculate new statistics (only count direct I-address stakes)
    const statsResult = await db.query(
      `
      SELECT 
        COUNT(*) as total_stakes,
        SUM(amount_sats) as total_rewards_satoshis,
        MIN(block_time) as first_stake_time,
        MAX(block_time) as last_stake_time
      FROM staking_rewards 
      WHERE identity_address = $1
        AND source_address = identity_address
    `,
      [identityAddress]
    );

    const stats = statsResult.rows[0];
    if (!stats || stats.total_stakes === '0') return;

    // Calculate APY (simplified)
    const totalRewardsVRSC =
      parseFloat(stats.total_rewards_satoshis) / 100000000;
    const firstStake = new Date(stats.first_stake_time);
    const lastStake = new Date(stats.last_stake_time);
    const daysActive =
      (lastStake.getTime() - firstStake.getTime()) / (1000 * 60 * 60 * 24);

    // Estimate stake amount based on rewards (rough calculation)
    const estimatedStakeAmount = Math.max(totalRewardsVRSC * 20, 10000); // Conservative estimate
    const apyAllTime =
      daysActive > 0
        ? (totalRewardsVRSC / estimatedStakeAmount) * (365 / daysActive) * 100
        : 0;

    if (existingResult.rows.length > 0) {
      // Update existing statistics
      await db.query(
        `
        UPDATE verusid_statistics SET
          total_stakes = $2,
          total_rewards_satoshis = $3,
          first_stake_time = $4,
          last_stake_time = $5,
          apy_all_time = $6,
          updated_at = NOW()
        WHERE address = $1
      `,
        [
          identityAddress,
          stats.total_stakes,
          stats.total_rewards_satoshis,
          stats.first_stake_time,
          stats.last_stake_time,
          apyAllTime,
        ]
      );
    } else {
      // Insert new statistics
      await db.query(
        `
        INSERT INTO verusid_statistics (
          address, friendly_name, total_stakes, total_rewards_satoshis,
          first_stake_time, last_stake_time, apy_all_time, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      `,
        [
          identityAddress,
          null, // Will be populated by the main statistics script
          stats.total_stakes,
          stats.total_rewards_satoshis,
          stats.first_stake_time,
          stats.last_stake_time,
          apyAllTime,
        ]
      );
    }

    logger.info(
      `📊 Statistics calculated for ${identityAddress}: ${stats.total_stakes} stakes, ${totalRewardsVRSC.toFixed(2)} VRSC, ${apyAllTime.toFixed(2)}% APY`
    );
  } catch (error) {
    logger.error(`Error calculating statistics for ${identityAddress}:`, error);
  }
}

// Check if a VerusID needs priority scanning
export async function needsPriorityScan(
  identityAddress: string
): Promise<boolean> {
  return !(await hasCompleteStakingData(identityAddress));
}
