export interface NetworkStats {
  blocks: number;
  chain: string;
  difficulty: number;
  bestBlockHash: string;
  verificationProgress: number;
  connections: number;
  networkActive: boolean;
  chainwork: string;
  sizeOnDisk: number;
  commitments: number;
  valuePools: Array<{
    id: string;
    monitored: boolean;
    chainValue: number;
    chainValueZat: number;
  }>;
  circulatingSupply: number;
}

export interface MiningStats {
  blocks: number;
  currentblocksize: number;
  currentblocktx: number;
  difficulty: number;
  networkhashps: number;
  pooledtx: number;
  chain: string;
  warnings: string;
}

export interface MempoolStats {
  size: number;
  bytes: number;
  usage: number;
  maxmempool: number;
  mempoolminfee: number;
  minrelaytxfee: number;
}

export interface StakingStats {
  enabled: boolean;
  staking: boolean;
  errors: string;
  currentblocksize: number;
  currentblocktx: number;
  pooledtx: number;
  difficulty: number;
  searchInterval: number;
  weight: number;
  netstakeweight: number;
  chainstake: number;
  eligible_staking_outputs: number;
  eligible_staking_balance: number;
  expectedtime: number;
}

export interface StakeRewardInfo {
  isStakeReward: boolean;
  stakeAmount?: number;
  rewardAmount?: number;
  stakedInputs?: number;
  rewardOutputs?: number;
  stakeAge?: number;
  blockHeight?: number;
  blockType?: 'pos' | 'pow';
}

export interface EnhancedTransaction {
  txid: string;
  hash: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  vin: Array<{
    txid?: string;
    vout?: number;
    scriptSig?: {
      asm: string;
      hex: string;
    };
    coinbase?: string;
    sequence: number;
  }>;
  vout: Array<{
    value: number;
    n: number;
    scriptPubKey: {
      asm: string;
      hex: string;
      reqSigs: number;
      type: string;
      addresses?: string[];
    };
  }>;
  hex: string;
  blockhash?: string;
  confirmations?: number;
  time?: number;
  blocktime?: number;
  // Enhanced fields for stake reward detection
  transactionType?: 'coinbase' | 'stake_reward' | 'transfer' | 'burn';
  stakeRewardInfo?: StakeRewardInfo;
  value?: number;
  fee?: number;
}

export interface NetworkParticipationData {
  address: string;
  participationPercentage: number;
  participationFormatted: string;
  expectedStakeTimeSeconds: number;
  expectedStakeTimeFormatted: string;
  yourWeight: number;
  yourWeightFormatted: string;
  networkWeight: number;
  networkWeightFormatted: string;
  status: 'active' | 'not_staking' | 'low_participation' | 'data_unavailable';
  eligibleUTXOs: number;
  totalUTXOs: number;
  utxoEfficiency: number;
  lastUpdated: string;
}

export interface StakingMomentumData {
  address: string;
  yourWeight: number;
  networkWeight: number;
  currentFrequency: number;
  expectedFrequency: number;
  performanceRatio: number;
  performanceRating: string;
  momentum: {
    score: number;
    color: string;
    frequencyTrend: 'increasing' | 'stable' | 'decreasing';
    frequencyChange: number;
    rewardTrend: 'increasing' | 'stable' | 'decreasing';
    rewardChange: number;
    frequencyTrendFormatted: string;
    rewardTrendFormatted: string;
    frequencyChangeFormatted: string;
    rewardChangeFormatted: string;
    last7d: number;
    previous7d: number;
    last30d: number;
    lastStakeDays: number | null;
    isActive: boolean;
  } | null;
  lastUpdated: string;
}
