export type TransactionType =
  | 'pos_reward'
  | 'pow_reward'
  | 'defi'
  | 'transfer'
  | 'self_transfer';

export interface TransactionClassification {
  type: TransactionType;
  description: string;
  shouldShowInFeed: boolean;
}

/**
 * Classifies a Verus transaction to determine its type and whether it should appear in the live activity feed.
 *
 * @param tx - The transaction object from the Verus API
 * @returns Classification result with type, description, and visibility recommendation
 */
export function classifyTransaction(tx: any): TransactionClassification {
  // 1. PoS/PoW Rewards (coinbase/coinstake transactions)
  if (tx.vin?.[0]?.coinbase !== undefined) {
    return {
      type: 'pos_reward',
      description: 'Staking/Mining Reward',
      shouldShowInFeed: false,
    };
  }

  // 2. DeFi Transactions (cryptoconditions - protocol-level DeFi operations)
  const hasCryptoCondition = tx.vout?.some(
    (out: any) => out.scriptPubKey?.type === 'cryptocondition'
  );

  if (hasCryptoCondition) {
    const hasReserveTransfer = tx.vout?.some(
      (out: any) => out.scriptPubKey?.reservetransfer
    );
    return {
      type: 'defi',
      description: hasReserveTransfer
        ? 'Reserve Currency Swap'
        : 'DeFi Transaction',
      shouldShowInFeed: false,
    };
  }

  // 3. Self-transfers (all inputs and outputs go to the same addresses)
  const inputAddrs = new Set<string>();
  const outputAddrs = new Set<string>();

  // Collect input addresses
  tx.vin?.forEach((inp: any) => {
    if (inp.addresses && Array.isArray(inp.addresses)) {
      inp.addresses.forEach((a: string) => inputAddrs.add(a));
    }
    if (inp.address) inputAddrs.add(inp.address);
  });

  // Collect output addresses
  tx.vout?.forEach((out: any) => {
    if (
      out.scriptPubKey?.addresses &&
      Array.isArray(out.scriptPubKey.addresses)
    ) {
      out.scriptPubKey.addresses.forEach((a: string) => outputAddrs.add(a));
    }
    if (out.addresses && Array.isArray(out.addresses)) {
      out.addresses.forEach((a: string) => outputAddrs.add(a));
    }
  });

  // Check if all addresses are the same (self-transfer)
  const isSelfTransfer =
    inputAddrs.size > 0 &&
    outputAddrs.size > 0 &&
    Array.from(inputAddrs).every(a => outputAddrs.has(a)) &&
    Array.from(outputAddrs).every(a => inputAddrs.has(a));

  if (isSelfTransfer) {
    return {
      type: 'self_transfer',
      description: 'Internal Wallet Movement',
      shouldShowInFeed: false,
    };
  }

  // 4. Regular P2P transfer (what we want to show!)
  return {
    type: 'transfer',
    description: 'Person-to-Person Transfer',
    shouldShowInFeed: true,
  };
}

/**
 * Helper function to get a user-friendly icon for transaction types
 */
export function getTransactionTypeIcon(type: TransactionType): string {
  switch (type) {
    case 'transfer':
      return '💸';
    case 'defi':
      return '🏦';
    case 'self_transfer':
      return '🔄';
    case 'pos_reward':
    case 'pow_reward':
      return '⚡';
    default:
      return '📄';
  }
}

/**
 * Helper function to get a user-friendly color for transaction types
 */
export function getTransactionTypeColor(type: TransactionType): string {
  switch (type) {
    case 'transfer':
      return 'text-green-400';
    case 'defi':
      return 'text-blue-400';
    case 'self_transfer':
      return 'text-yellow-400';
    case 'pos_reward':
    case 'pow_reward':
      return 'text-purple-400';
    default:
      return 'text-gray-400';
  }
}
