export interface ValuePool {
  id: string;
  monitored: boolean;
  chainValue: number;
  chainValueZat: number;
  valueDelta: number;
  valueDeltaZat: number;
}

export interface Vin {
  coinbase?: string;
  txid?: string;
  vout?: number;
  scriptSig?: {
    asm: string;
    hex: string;
  };
  sequence: number;
}

export interface ScriptPubKey {
  asm: string;
  hex: string;
  reqSigs: number;
  type: string;
  addresses: string[];
}

export interface Vout {
  value: number;
  n: number;
  scriptPubKey: ScriptPubKey;
}

export interface Transaction {
  txid: string;
  version: number;
  locktime: number;
  vin: Vin[];
  vout: Vout[];
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

export interface ProofRoot {
  version: number;
  type: number;
  systemid: string;
  height: number;
  stateroot: string;
  blockhash: string;
  power: string;
}

export interface Block {
  hash: string;
  height: number;
  time: number;
  size: number;
  weight?: number;
  version: number;
  versionHex?: string;
  nonce: number | string;
  bits: string;
  difficulty: number;
  chainwork: string;
  nTx?: number;
  previousblockhash?: string;
  nextblockhash?: string;
  merkleroot: string;
  tx: Transaction[];
  modifier?: string;
  confirmations?: number;
  solution?: string;
  valuePools?: ValuePool[];
  anchor?: string;
  blocktype?: string;
  postarget?: string;
  chainstake?: string;
  reward?: number;
  rewardType?: string;
  stakeRewardInfo?: StakeRewardInfo;
  hasStakeReward?: boolean;
  stakeAmount?: number;
  stakeRewardAmount?: number;
  stakeAge?: number;
  // Verus-specific fields
  validationtype?: string;
  poshashbh?: string;
  poshashtx?: string;
  possourcetxid?: string;
  possourcevoutnum?: number;
  segid?: number;
  finalsaplingroot?: string;
  mediantime?: number;
  proofroot?: ProofRoot;
  // Heavy metrics fields
  feeTotal?: number;
  feePerByteAvg?: number;
  feeApproximate?: boolean;
  feeProcessedTxs?: number;
  feeTotalTxs?: number;
  coinbasePayout?: string;
  minerType?: 'miner' | 'staker';
  isShieldedPayout?: boolean;
  totalPayout?: number;
  isOrphan?: boolean;
  canonicalHash?: string;
  orphanConfidence?: 'high' | 'medium' | 'low';
  propagationSeconds?: number;
  firstSeenTx?: string;
  propagationTrackedTxs?: number;
  propagationTotalTxs?: number;
  metricsError?: boolean;
}

export interface BlockApiResponse {
  success: boolean;
  data?: Block;
  error?: string;
  metrics?: boolean;
}
