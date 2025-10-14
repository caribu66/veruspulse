interface Vout {
  value: number;
  n: number;
  scriptPubKey: {
    asm: string;
    hex: string;
    reqSigs: number;
    type: string;
    addresses?: string[];
  };
}

interface Transaction {
  txid: string;
  vin: Array<{
    coinbase?: string;
  }>;
  vout: Vout[];
}

interface CoinbaseResult {
  payoutAddress: string | null;
  minerType: 'miner' | 'staker';
  isShielded: boolean;
  totalPayout: number;
}

export function extractCoinbasePayout(tx: Transaction): CoinbaseResult {
  const result: CoinbaseResult = {
    payoutAddress: null,
    minerType: 'miner',
    isShielded: false,
    totalPayout: 0,
  };

  if (!tx.vout || tx.vout.length === 0) {
    return result;
  }

  // Calculate total payout
  result.totalPayout = tx.vout.reduce(
    (sum, vout) => sum + (vout.value || 0),
    0
  );

  // Look for the largest output (likely the main payout)
  let largestOutput: Vout | null = null;
  let largestValue = 0;

  for (const vout of tx.vout) {
    if (vout.value > largestValue) {
      largestValue = vout.value;
      largestOutput = vout;
    }
  }

  if (!largestOutput) {
    return result;
  }

  // Check if it's a shielded output (no addresses)
  if (
    !largestOutput.scriptPubKey.addresses ||
    largestOutput.scriptPubKey.addresses.length === 0
  ) {
    result.isShielded = true;
    result.payoutAddress = 'Shielded';

    // Determine miner type based on script type
    if (
      largestOutput.scriptPubKey.type === 'sapling' ||
      largestOutput.scriptPubKey.type === 'sprout'
    ) {
      result.minerType = 'staker'; // More likely to be staking
    }
  } else {
    // Transparent output
    result.payoutAddress = largestOutput.scriptPubKey.addresses[0];
    result.isShielded = false;

    // Determine miner type based on address patterns or script type
    if (
      largestOutput.scriptPubKey.type === 'pubkeyhash' ||
      largestOutput.scriptPubKey.type === 'scripthash'
    ) {
      // Could be either, but transparent addresses are more common for mining
      result.minerType = 'miner';
    }
  }

  // Additional heuristics for miner type
  if (result.totalPayout > 50) {
    // Higher payouts are more likely to be mining rewards
    result.minerType = 'miner';
  } else if (result.totalPayout < 30) {
    // Lower payouts are more likely to be staking rewards
    result.minerType = 'staker';
  }

  return result;
}

export function formatPayoutAddress(
  address: string | null,
  maxLength: number = 12
): string {
  if (!address) return 'Unknown';
  if (address === 'Shielded') return 'Shielded';
  if (address.length <= maxLength) return address;

  const start = Math.ceil(maxLength / 2);
  const end = Math.floor(maxLength / 2);
  return `${address.substring(0, start)}...${address.substring(address.length - end)}`;
}

export function getMinerTypeIcon(minerType: 'miner' | 'staker'): string {
  return minerType === 'staker' ? '🛡️' : '⛏️';
}

export function getMinerTypeColor(minerType: 'miner' | 'staker'): string {
  return minerType === 'staker' ? 'text-green-400' : 'text-orange-400';
}
