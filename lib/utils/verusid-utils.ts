import {
  VerusIDBrowseData,
  FilterState,
  SortOptions,
} from '@/lib/types/verusid-browse-types';

/**
 * Filter identities by stake count range
 */
export function filterIdentitiesByStakeRange(
  identities: VerusIDBrowseData[],
  minStakes: number,
  maxStakes: number
): VerusIDBrowseData[] {
  return identities.filter(
    identity =>
      identity.totalStakes >= minStakes && identity.totalStakes <= maxStakes
  );
}

/**
 * Filter identities by APY range
 */
export function filterIdentitiesByAPYRange(
  identities: VerusIDBrowseData[],
  minAPY: number,
  maxAPY: number
): VerusIDBrowseData[] {
  return identities.filter(identity => {
    const apy = identity.apyAllTime;
    // If APY is null, always include it (treat as 0 APY)
    if (apy === null) {
      return true;
    }
    return apy >= minAPY && apy <= maxAPY;
  });
}

/**
 * Filter identities by activity status
 */
export function filterIdentitiesByActivity(
  identities: VerusIDBrowseData[],
  status: FilterState['activityStatus']
): VerusIDBrowseData[] {
  if (status === 'all') return identities;

  return identities.filter(identity => {
    const daysSince = identity.daysSinceLastStake;

    switch (status) {
      case 'active-7d':
        return daysSince !== null && daysSince <= 7;
      case 'active-30d':
        return daysSince !== null && daysSince <= 30;
      case 'inactive':
        return daysSince === null || daysSince > 30;
      default:
        return true;
    }
  });
}

/**
 * Search identities by name, friendly name, or address
 */
export function searchIdentities(
  identities: VerusIDBrowseData[],
  query: string
): VerusIDBrowseData[] {
  if (!query.trim()) return identities;

  const searchTerm = query.toLowerCase().trim();

  return identities.filter(
    identity =>
      identity.baseName.toLowerCase().includes(searchTerm) ||
      identity.friendlyName.toLowerCase().includes(searchTerm) ||
      identity.displayName.toLowerCase().includes(searchTerm) ||
      identity.address.toLowerCase().includes(searchTerm)
  );
}

/**
 * Sort identities by specified criteria
 */
export function sortIdentities(
  identities: VerusIDBrowseData[],
  sortBy: SortOptions['sortBy'],
  sortOrder: SortOptions['sortOrder']
): VerusIDBrowseData[] {
  const sorted = [...identities].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'name':
        comparison = a.baseName.localeCompare(b.baseName);
        break;
      case 'stakes':
        comparison = a.totalStakes - b.totalStakes;
        break;
      case 'rewards':
        comparison = a.totalRewardsVRSC - b.totalRewardsVRSC;
        break;
      case 'apy':
        const apyA = a.apyAllTime || 0;
        const apyB = b.apyAllTime || 0;
        comparison = apyA - apyB;
        break;
      case 'recent':
        const timeA = a.lastStakeTime ? new Date(a.lastStakeTime).getTime() : 0;
        const timeB = b.lastStakeTime ? new Date(b.lastStakeTime).getTime() : 0;
        comparison = timeA - timeB;
        break;
      case 'rank':
        const rankA = a.networkRank || 999999;
        const rankB = b.networkRank || 999999;
        comparison = rankA - rankB;
        break;
      default:
        comparison = 0;
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });

  return sorted;
}

/**
 * Get activity status based on last stake time
 */
export function getActivityStatus(
  lastStakeTime: string | null
): 'active' | 'inactive' | 'unknown' {
  if (!lastStakeTime) return 'inactive';

  const lastStake = new Date(lastStakeTime);
  const now = new Date();
  const daysSince = Math.floor(
    (now.getTime() - lastStake.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSince <= 7) return 'active';
  if (daysSince <= 30) return 'active';
  return 'inactive';
}

/**
 * Format last activity timestamp
 */
export function formatLastActivity(timestamp: string | null): string {
  if (!timestamp) return 'Never';

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else {
    return 'Just now';
  }
}

/**
 * Get color class for APY value
 */
export function getAPYColorClass(apy: number | null): string {
  if (apy === null) return 'text-gray-400';
  if (apy >= 50) return 'text-green-400';
  if (apy >= 30) return 'text-yellow-400';
  if (apy >= 10) return 'text-orange-400';
  return 'text-red-400';
}

/**
 * Get color class for activity status
 */
export function getActivityColorClass(
  status: 'active' | 'inactive' | 'unknown'
): string {
  switch (status) {
    case 'active':
      return 'text-green-400';
    case 'inactive':
      return 'text-gray-400';
    case 'unknown':
      return 'text-yellow-400';
    default:
      return 'text-gray-400';
  }
}

/**
 * Format VRSC amount for display
 */
export function formatVRSCAmount(amount: number): string {
  if (amount === 0) return '0';
  // Handle negative numbers first
  if (amount < 0) {
    const absAmount = Math.abs(amount);
    if (absAmount < 1) return `-${absAmount.toFixed(3)}`;
    if (absAmount < 1000) return `-${absAmount.toFixed(2)}`;
    if (absAmount < 1000000) return `-${(absAmount / 1000).toFixed(1)}K`;
    return `-${(absAmount / 1000000).toFixed(1)}M`;
  }
  if (amount < 0.01) return '< 0.01';
  if (amount < 1) return amount.toFixed(3);
  if (amount < 1000) return amount.toFixed(2);
  if (amount < 1000000) return `${(amount / 1000).toFixed(1)}K`;
  return `${(amount / 1000000).toFixed(1)}M`;
}

/**
 * Format APY for display
 * Note: Caps at 100% to handle calculation errors from missing staked amount data
 */
export function formatAPY(apy: number | null): string {
  if (apy === null || apy === 0) return 'N/A';

  // Cap at 100% - values higher than this indicate calculation errors
  // (APY calculation requires staked amount which we don't always track)
  const cappedAPY = Math.min(apy, 100);

  return `${cappedAPY.toFixed(1)}%`;
}

/**
 * Get quick filter presets
 */
export function getQuickFilterPresets() {
  return {
    'top-100': {
      label: 'Top 100',
      description: 'Top 100 by network rank',
      filter: (identities: VerusIDBrowseData[]) =>
        identities.filter(id => id.networkRank && id.networkRank <= 100),
    },
    'high-apy': {
      label: 'High APY',
      description: 'APY > 50%',
      filter: (identities: VerusIDBrowseData[]) =>
        identities.filter(id => id.apyAllTime && id.apyAllTime > 50),
    },
    'active-stakers': {
      label: 'Active Stakers',
      description: 'Staked in last 7 days',
      filter: (identities: VerusIDBrowseData[]) =>
        identities.filter(
          id => id.daysSinceLastStake !== null && id.daysSinceLastStake <= 7
        ),
    },
    'high-stakes': {
      label: 'High Stakes',
      description: '> 1000 stakes',
      filter: (identities: VerusIDBrowseData[]) =>
        identities.filter(id => id.totalStakes > 1000),
    },
  };
}

/**
 * Search for a specific VerusID via RPC (for identities not in database)
 */
export async function searchVerusIDViaRPC(
  query: string
): Promise<VerusIDBrowseData | null> {
  try {
    // First, get the identity information
    const identityResponse = await fetch('/api/verusid-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: query }),
    });

    const identityResult = await identityResponse.json();

    if (!identityResult.success || !identityResult.data?.identity) {
      return null;
    }

    const identity = identityResult.data.identity;
    const identityAddress =
      identity.identity?.identityaddress ||
      identity.primaryaddresses?.[0] ||
      '';

    // Then, get the balance and staking information
    let balanceData = null;
    try {
      const balanceResponse = await fetch('/api/verusid-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verusid: query }),
      });

      const balanceResult = await balanceResponse.json();
      if (balanceResult.success && balanceResult.data) {
        balanceData = balanceResult.data;
      }
    } catch (balanceError) {
      console.warn('Failed to fetch balance data:', balanceError);
    }

    // Calculate total value from balance data
    const totalValueVRSC = balanceData?.totalBalance || 0;

    return {
      address: identityAddress,
      baseName: identity.identity?.name || '',
      friendlyName: identity.friendlyname || '',
      displayName: identity.friendlyname || identity.identity?.name || query,
      totalStakes: 0, // RPC doesn't provide detailed staking data
      totalRewardsVRSC: 0, // Would need additional API calls to get this
      apyAllTime: null,
      apyYearly: null,
      apy90d: null,
      apy30d: null,
      apy7d: null,
      roiAllTime: null,
      stakingEfficiency: null,
      avgStakeAge: null,
      networkRank: null,
      networkPercentile: null,
      eligibleUtxos: 0,
      currentUtxos: 0,
      cooldownUtxos: 0,
      totalValueVRSC: totalValueVRSC,
      eligibleValueVRSC: totalValueVRSC, // Assume all balance is eligible for staking
      largestUtxoVRSC: 0, // Would need UTXO analysis
      smallestEligibleVRSC: 0,
      highestRewardVRSC: 0,
      lowestRewardVRSC: 0,
      lastCalculated: new Date().toISOString(),
      dataCompleteness: balanceData ? 50 : 10, // Partial data from RPC
      activityStatus: totalValueVRSC > 0 ? 'active' : 'unknown',
      daysSinceLastStake: null,
      firstSeenBlock: null,
      lastScannedBlock: null,
      lastRefreshed: new Date().toISOString(),
      firstStakeTime: null,
      lastStakeTime: null,
    };
  } catch (error) {
    console.error('RPC search failed:', error);
    return null;
  }
}
