import { transactionCache } from './lru-cache';

interface Transaction {
  txid: string;
  vin: Array<{
    txid?: string;
    vout?: number;
    coinbase?: string;
  }>;
  vout: Array<{
    value: number;
  }>;
}

interface Block {
  tx: Transaction[];
  size: number;
}

interface FeeResult {
  feeTotal: number;
  feePerByteAvg: number;
  approximate: boolean;
  processedTxs: number;
  totalTxs: number;
}

export async function computeBlockFees(
  block: Block,
  getRawTransaction: (
    txid: string,
    verbose?: boolean
  ) => Promise<Transaction | null>,
  maxLookups: number = 200
): Promise<FeeResult> {
  const results: FeeResult = {
    feeTotal: 0,
    feePerByteAvg: 0,
    approximate: false,
    processedTxs: 0,
    totalTxs: block.tx.length,
  };

  if (!block.tx || block.tx.length === 0) {
    return results;
  }

  const prevTxIds = new Set<string>();
  const txPromises: Promise<Transaction | null>[] = [];
  let lookupCount = 0;

  // Collect all previous transaction IDs from inputs
  for (const tx of block.tx) {
    if (tx.vin) {
      for (const vin of tx.vin) {
        if (vin.txid && !vin.coinbase && !prevTxIds.has(vin.txid)) {
          prevTxIds.add(vin.txid);
          lookupCount++;

          // Respect lookup limit
          if (lookupCount > maxLookups) {
            results.approximate = true;
            break;
          }

          // Check cache first
          const cached = transactionCache.get(vin.txid);
          if (cached) {
            txPromises.push(Promise.resolve(cached));
          } else {
            txPromises.push(
              getRawTransaction(vin.txid, true).then(tx => {
                if (tx && vin.txid) {
                  transactionCache.set(vin.txid, tx);
                }
                return tx;
              })
            );
          }
        }
      }
    }

    if (results.approximate) break;
  }

  // Wait for all transaction lookups with timeout
  const timeoutPromise = new Promise<null>((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), 4000);
  });

  try {
    const prevTxs = await Promise.race([
      Promise.all(txPromises),
      timeoutPromise,
    ]);

    // Create a map of previous transactions for quick lookup
    const prevTxMap = new Map<string, Transaction>();
    if (prevTxs) {
      prevTxs.forEach(tx => {
        if (tx) {
          prevTxMap.set(tx.txid, tx);
        }
      });
    }

    // Calculate fees for each transaction
    for (const tx of block.tx) {
      if (tx.vin && tx.vout) {
        let inputTotal = 0;
        let outputTotal = 0;

        // Sum outputs
        outputTotal = tx.vout.reduce((sum, vout) => sum + (vout.value || 0), 0);

        // Sum inputs (skip coinbase)
        for (const vin of tx.vin) {
          if (vin.coinbase) {
            // Coinbase transaction - no input value
            continue;
          }

          if (vin.txid && vin.vout !== undefined) {
            const prevTx = prevTxMap.get(vin.txid);
            if (prevTx && prevTx.vout && prevTx.vout[vin.vout]) {
              const prevOutput = prevTx.vout[vin.vout];
              if (prevOutput) {
                inputTotal += prevOutput.value || 0;
              }
            }
          }
        }

        // Fee = inputs - outputs (for non-coinbase transactions)
        if (!tx.vin.some(vin => vin.coinbase)) {
          const fee = inputTotal - outputTotal;
          if (fee > 0) {
            results.feeTotal += fee;
          }
        }

        results.processedTxs++;
      }
    }

    // Calculate average fee per byte
    if (block.size > 0) {
      results.feePerByteAvg = results.feeTotal / block.size;
    }
  } catch (error) {
    console.warn('Fee calculation failed:', error);
    results.approximate = true;
  }

  return results;
}

export function formatFee(fee: number): string {
  if (fee === 0) return '0 VRSC';
  if (fee < 0.000001) return `${(fee * 1000000).toFixed(2)} μVRSC`;
  if (fee < 0.001) return `${(fee * 1000).toFixed(3)} mVRSC`;
  return `${fee.toFixed(8)} VRSC`;
}

export function formatFeePerByte(feePerByte: number): string {
  if (feePerByte === 0) return '0 sat/B';
  if (feePerByte < 0.001) return `${(feePerByte * 1000000).toFixed(2)} μsat/B`;
  if (feePerByte < 1) return `${(feePerByte * 1000).toFixed(2)} msat/B`;
  return `${feePerByte.toFixed(3)} sat/B`;
}
