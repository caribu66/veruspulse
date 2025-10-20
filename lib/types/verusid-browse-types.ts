export interface VerusIDBrowseData {
  address: string;
  baseName: string;
  friendlyName: string;
  displayName: string;
  firstSeenBlock: number | null;
  lastScannedBlock: number | null;
  lastRefreshed: string | null;
  totalStakes: number;
  totalRewardsVRSC: number;
  firstStakeTime: string | null;
  lastStakeTime: string | null;
  apyAllTime: number | null;
  apyYearly: number | null;
  apy90d: number | null;
  apy30d: number | null;
  apy7d: number | null;
  roiAllTime: number | null;
  stakingEfficiency: number | null;
  avgStakeAge: number | null;
  networkRank: number | null;
  networkPercentile: number | null;
  eligibleUtxos: number;
  currentUtxos: number;
  cooldownUtxos: number;
  totalValueVRSC: number;
  eligibleValueVRSC: number;
  largestUtxoVRSC: number;
  smallestEligibleVRSC: number;
  highestRewardVRSC: number;
  lowestRewardVRSC: number;
  lastCalculated: string | null;
  dataCompleteness: number;
  activityStatus: 'active' | 'inactive' | 'unknown';
  daysSinceLastStake: number | null;
}

export interface FilterState {
  stakeRange: [number, number];
  apyRange: [number, number];
  activityStatus: 'all' | 'active-7d' | 'active-30d' | 'inactive';
  searchQuery: string;
  top100Only: boolean;
}

export interface SortOptions {
  sortBy: 'name' | 'stakes' | 'rewards' | 'apy' | 'recent' | 'rank';
  sortOrder: 'asc' | 'desc';
}

export interface ViewMode {
  mode: 'cards' | 'table';
}

export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}

export interface VerusIDBrowseResponse {
  success: boolean;
  data: {
    identities: VerusIDBrowseData[];
    rpcIdentities: VerusIDBrowseData[];
    metadata: {
      totalCount: number;
      loadedCount: number;
      rpcCount: number;
      limit: number;
      includeRPC: boolean;
      dataFreshness: string;
    };
  };
  timestamp: string;
}
