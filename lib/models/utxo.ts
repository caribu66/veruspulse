// UTXO Models and Types for Verus Staking Analytics

export interface UTXO {
  id?: number;
  address: string;
  txid: string;
  vout: number;
  value: number; // satoshis
  creationHeight: number;
  creationTime?: Date;
  lastStakeHeight?: number;
  lastStakeTime?: Date;
  cooldownUntil?: number;
  cooldownUntilTime?: Date;
  isSpent: boolean;
  spentTxid?: string;
  spentHeight?: number;
  spentTime?: Date;
  isEligible: boolean;
  stakingProbability: number;
  estimatedReward: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StakeEvent {
  id?: number;
  utxoId?: number;
  address: string;
  txid: string;
  blockHeight: number;
  blockTime: Date;
  rewardAmount: number; // satoshis
  stakeAmount: number; // satoshis
  stakeAge: number; // blocks
  stakingProbability: number;
  createdAt?: Date;
}

export interface UTXOAnalytics {
  id?: number;
  address: string;
  totalUTXOs: number;
  totalValue: number; // satoshis
  eligibleUTXOs: number;
  eligibleValue: number; // satoshis
  averageStakeAge: number; // blocks
  stakingEfficiency: number; // 0-1
  largestUTXO: number; // satoshis
  smallestEligible: number; // satoshis
  totalStakingProbability: number;
  lastUpdated?: Date;
}

export interface StakingPerformance {
  id?: number;
  address: string;
  periodStart: Date;
  periodEnd: Date;
  totalStakes: number;
  totalRewards: number; // satoshis
  averageStakeAge: number; // blocks
  stakingFrequency: number; // stakes per day
  apy: number; // percentage
  roi: number; // percentage
  createdAt?: Date;
}

export interface UTXOStakeData {
  txid: string;
  vout: number;
  value: number;
  creationHeight: number;
  currentHeight: number;
  stakeAge: number;
  isEligible: boolean;
  stakingProbability: number;
  estimatedReward: number;
  cooldownUntil?: number;
  lastStakeHeight?: number;
}

export interface UTXOSummary {
  totalUTXOs: number;
  totalValue: number; // VRSC
  eligibleStakes: number;
  totalStakingValue: number; // VRSC
  averageStakeAge: number; // blocks
  totalStakingProbability: number;
  currentHeight: number;
}

export interface UTXOAnalyticsData {
  stakingEfficiency: number;
  averageUTXOSize: number; // VRSC
  largestUTXO: number; // VRSC
  smallestEligible: number; // VRSC
  cooldownUTXOs: number;
  spentUTXOs: number;
  newUTXOs: number;
}

// Verus staking constants
export const VERUS_STAKING_CONSTANTS = {
  MIN_STAKE_AGE: 2000, // blocks (~33 hours at 60s/block)
  MIN_STAKE_VALUE: 100000000, // 1 VRSC in satoshis
  COOLDOWN_PERIOD: 2000, // blocks after staking
  BLOCK_TIME: 60, // seconds
  MAX_STAKING_PROBABILITY: 1.0,
  MIN_STAKING_PROBABILITY: 0.0,
} as const;

// UTXO eligibility checker
export function isUTXOEligible(utxo: UTXO, currentHeight: number): boolean {
  const age = currentHeight - utxo.creationHeight;
  const isOldEnough = age >= VERUS_STAKING_CONSTANTS.MIN_STAKE_AGE;
  const isLargeEnough = utxo.value >= VERUS_STAKING_CONSTANTS.MIN_STAKE_VALUE;
  const isNotSpent = !utxo.isSpent;
  const isNotInCooldown =
    !utxo.cooldownUntil || utxo.cooldownUntil <= currentHeight;

  return isOldEnough && isLargeEnough && isNotSpent && isNotInCooldown;
}

// Calculate staking probability based on UTXO value and network weight
export function calculateStakingProbability(
  utxo: UTXO,
  networkWeight?: number
): number {
  if (!isUTXOEligible(utxo, utxo.creationHeight)) return 0;

  // Simplified probability calculation
  // In reality, this would consider network weight and other factors
  const baseProbability = Math.min(1, utxo.value / 1000000000); // Cap at 1B VRSC

  return Math.max(
    VERUS_STAKING_CONSTANTS.MIN_STAKING_PROBABILITY,
    Math.min(VERUS_STAKING_CONSTANTS.MAX_STAKING_PROBABILITY, baseProbability)
  );
}

// Calculate estimated reward based on stake amount and age
export function calculateEstimatedReward(
  utxo: UTXO,
  currentHeight: number
): number {
  if (!isUTXOEligible(utxo, currentHeight)) return 0;

  const stakeAge = currentHeight - utxo.creationHeight;
  const ageInDays = stakeAge / (24 * 60); // Convert blocks to days

  // Simplified reward calculation (would be more complex in reality)
  const dailyReturn = 0.0001; // 0.01% daily return
  const estimatedReward = utxo.value * dailyReturn * ageInDays;

  return Math.max(0, estimatedReward);
}
