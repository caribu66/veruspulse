// UTXO Database Service for Verus Staking Analytics
import { Pool, PoolClient } from 'pg';
import {
  UTXO,
  StakeEvent,
  UTXOAnalytics,
  StakingPerformance,
  UTXOStakeData,
} from '@/lib/models/utxo';

export class UTXODatabaseService {
  private db: Pool; // PostgreSQL connection pool

  constructor(databaseUrl: string) {
    this.db = new Pool({
      connectionString: databaseUrl,
      max: 20, // Maximum number of connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  // UTXO Management
  async upsertUTXO(utxo: UTXO): Promise<UTXO> {
    const query = `
      INSERT INTO utxos (
        address, txid, vout, value, creation_height, creation_time,
        last_stake_height, last_stake_time, cooldown_until, cooldown_until_time,
        is_spent, spent_txid, spent_height, spent_time, is_eligible,
        staking_probability, estimated_reward, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW()
      )
      ON CONFLICT (txid, vout) 
      DO UPDATE SET
        address = EXCLUDED.address,
        value = EXCLUDED.value,
        creation_height = EXCLUDED.creation_height,
        creation_time = EXCLUDED.creation_time,
        last_stake_height = EXCLUDED.last_stake_height,
        last_stake_time = EXCLUDED.last_stake_time,
        cooldown_until = EXCLUDED.cooldown_until,
        cooldown_until_time = EXCLUDED.cooldown_until_time,
        is_spent = EXCLUDED.is_spent,
        spent_txid = EXCLUDED.spent_txid,
        spent_height = EXCLUDED.spent_height,
        spent_time = EXCLUDED.spent_time,
        is_eligible = EXCLUDED.is_eligible,
        staking_probability = EXCLUDED.staking_probability,
        estimated_reward = EXCLUDED.estimated_reward,
        updated_at = NOW()
      RETURNING *
    `;

    const values = [
      utxo.address,
      utxo.txid,
      utxo.vout,
      utxo.value,
      utxo.creationHeight,
      utxo.creationTime,
      utxo.lastStakeHeight,
      utxo.lastStakeTime,
      utxo.cooldownUntil,
      utxo.cooldownUntilTime,
      utxo.isSpent,
      utxo.spentTxid,
      utxo.spentHeight,
      utxo.spentTime,
      utxo.isEligible,
      utxo.stakingProbability,
      utxo.estimatedReward,
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToUTXO(result.rows[0]);
  }

  async getUTXOs(address: string): Promise<UTXO[]> {
    const query = `
      SELECT * FROM utxos 
      WHERE address = $1 
      ORDER BY creation_height DESC
    `;

    const result = await this.db.query(query, [address]);
    return result.rows.map(row => this.mapRowToUTXO(row));
  }

  async getEligibleUTXOs(
    address: string,
    currentHeight: number
  ): Promise<UTXO[]> {
    const query = `
      SELECT * FROM utxos 
      WHERE address = $1 
        AND is_spent = false 
        AND is_eligible = true
        AND (cooldown_until IS NULL OR cooldown_until <= $2)
      ORDER BY value DESC
    `;

    const result = await this.db.query(query, [address, currentHeight]);
    return result.rows.map(row => this.mapRowToUTXO(row));
  }

  async markUTXOSpent(
    txid: string,
    vout: number,
    spentTxid: string,
    spentHeight: number
  ): Promise<void> {
    const query = `
      UPDATE utxos 
      SET is_spent = true, spent_txid = $3, spent_height = $4, spent_time = NOW(), updated_at = NOW()
      WHERE txid = $1 AND vout = $2
    `;

    await this.db.query(query, [txid, vout, spentTxid, spentHeight]);
  }

  // Stake Events Management
  async recordStakeEvent(stakeEvent: StakeEvent): Promise<StakeEvent> {
    const query = `
      INSERT INTO stake_events (
        utxo_id, address, txid, block_height, block_time, reward_amount,
        stake_amount, stake_age, staking_probability
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      stakeEvent.utxoId,
      stakeEvent.address,
      stakeEvent.txid,
      stakeEvent.blockHeight,
      stakeEvent.blockTime,
      stakeEvent.rewardAmount,
      stakeEvent.stakeAmount,
      stakeEvent.stakeAge,
      stakeEvent.stakingProbability,
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToStakeEvent(result.rows[0]);
  }

  async getStakeEvents(address: string, limit?: number): Promise<StakeEvent[]> {
    let query: string;
    let params: any[];

    if (typeof limit === 'number' && limit > 0) {
      query = `
      SELECT * FROM stake_events 
      WHERE address = $1 
      ORDER BY block_height DESC 
      LIMIT $2
    `;
      params = [address, limit];
    } else {
      // No limit - return all matching rows (use with caution)
      query = `
      SELECT * FROM stake_events 
      WHERE address = $1 
      ORDER BY block_height DESC
    `;
      params = [address];
    }

    const result = await this.db.query(query, params);
    return result.rows.map(row => this.mapRowToStakeEvent(row));
  }

  // Analytics Management
  async updateUTXOAnalytics(
    address: string,
    analytics: UTXOAnalytics
  ): Promise<void> {
    const query = `
      INSERT INTO utxo_analytics (
        address, total_utxos, total_value, eligible_utxos, eligible_value,
        average_stake_age, staking_efficiency, largest_utxo, smallest_eligible,
        total_staking_probability, last_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (address) 
      DO UPDATE SET
        total_utxos = EXCLUDED.total_utxos,
        total_value = EXCLUDED.total_value,
        eligible_utxos = EXCLUDED.eligible_utxos,
        eligible_value = EXCLUDED.eligible_value,
        average_stake_age = EXCLUDED.average_stake_age,
        staking_efficiency = EXCLUDED.staking_efficiency,
        largest_utxo = EXCLUDED.largest_utxo,
        smallest_eligible = EXCLUDED.smallest_eligible,
        total_staking_probability = EXCLUDED.total_staking_probability,
        last_updated = NOW()
    `;

    const values = [
      address,
      analytics.totalUTXOs,
      analytics.totalValue,
      analytics.eligibleUTXOs,
      analytics.eligibleValue,
      analytics.averageStakeAge,
      analytics.stakingEfficiency,
      analytics.largestUTXO,
      analytics.smallestEligible,
      analytics.totalStakingProbability,
    ];

    await this.db.query(query, values);
  }

  async getUTXOAnalytics(address: string): Promise<UTXOAnalytics | null> {
    const query = `
      SELECT * FROM utxo_analytics 
      WHERE address = $1
    `;

    const result = await this.db.query(query, [address]);
    if (result.rows.length === 0) return null;

    return this.mapRowToUTXOAnalytics(result.rows[0]);
  }

  // Performance Analytics
  async recordStakingPerformance(
    performance: StakingPerformance
  ): Promise<void> {
    const query = `
      INSERT INTO staking_performance (
        address, period_start, period_end, total_stakes, total_rewards,
        average_stake_age, staking_frequency, apy, roi
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    const values = [
      performance.address,
      performance.periodStart,
      performance.periodEnd,
      performance.totalStakes,
      performance.totalRewards,
      performance.averageStakeAge,
      performance.stakingFrequency,
      performance.apy,
      performance.roi,
    ];

    await this.db.query(query, values);
  }

  // Utility Methods
  private mapRowToUTXO(row: any): UTXO {
    return {
      id: row.id,
      address: row.address,
      txid: row.txid,
      vout: row.vout,
      value: Number(row.value), // Convert BigInt string to number
      creationHeight: row.creation_height,
      creationTime: row.creation_time,
      lastStakeHeight: row.last_stake_height,
      lastStakeTime: row.last_stake_time,
      cooldownUntil: row.cooldown_until,
      cooldownUntilTime: row.cooldown_until_time,
      isSpent: row.is_spent,
      spentTxid: row.spent_txid,
      spentHeight: row.spent_height,
      spentTime: row.spent_time,
      isEligible: row.is_eligible,
      stakingProbability: Number(row.staking_probability), // Convert numeric string to number
      estimatedReward: Number(row.estimated_reward), // Convert BigInt string to number
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToStakeEvent(row: any): StakeEvent {
    return {
      id: row.id,
      utxoId: row.utxo_id,
      address: row.address,
      txid: row.txid,
      blockHeight: row.block_height,
      blockTime: row.block_time,
      rewardAmount: Number(row.reward_amount), // Convert BigInt string to number
      stakeAmount: Number(row.stake_amount), // Convert BigInt string to number
      stakeAge: row.stake_age,
      stakingProbability: Number(row.staking_probability), // Convert numeric string to number
      createdAt: row.created_at,
    };
  }

  private mapRowToUTXOAnalytics(row: any): UTXOAnalytics {
    return {
      id: row.id,
      address: row.address,
      totalUTXOs: row.total_utxos,
      totalValue: Number(row.total_value), // Convert BigInt string to number
      eligibleUTXOs: row.eligible_utxos,
      eligibleValue: Number(row.eligible_value), // Convert BigInt string to number
      averageStakeAge: row.average_stake_age,
      stakingEfficiency: Number(row.staking_efficiency), // Convert numeric string to number
      largestUTXO: Number(row.largest_utxo), // Convert BigInt string to number
      smallestEligible: Number(row.smallest_eligible), // Convert BigInt string to number
      totalStakingProbability: Number(row.total_staking_probability), // Convert numeric string to number
      lastUpdated: row.last_updated,
    };
  }

  // Cleanup and maintenance
  async cleanupOldData(daysToKeep: number = 365): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // Clean up old spent UTXOs
    await this.db.query(
      `
      DELETE FROM utxos 
      WHERE is_spent = true AND spent_time < $1
    `,
      [cutoffDate]
    );

    // Clean up old stake events
    await this.db.query(
      `
      DELETE FROM stake_events 
      WHERE block_time < $1
    `,
      [cutoffDate]
    );
  }
}
