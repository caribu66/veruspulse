import { type NextRequest, NextResponse } from 'next/server';
import { verusAPI } from '@/lib/rpc-client-robust';

export async function GET(_request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // Cap at 50 to prevent memory issues
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get current block height
    const blockchainInfo = await verusAPI.getBlockchainInfo();
    const currentHeight = blockchainInfo.blocks;

    // Fetch block hashes in parallel for better performance
    const blockHashPromises = [];
    for (let i = 0; i < Math.min(limit, 10); i++) {
      const height = currentHeight - offset - i;
      if (height > 0) {
        blockHashPromises.push(
          verusAPI.getBlockHash(height).then(hash => ({ height, hash }))
        );
      }
    }

    const blockHashes = await Promise.allSettled(blockHashPromises);

    // Fetch blocks in parallel
    const blockPromises = blockHashes
      .filter(result => result.status === 'fulfilled')
      .map(result => {
        const { height, hash } = (result as any).value;
        return verusAPI.getBlock(hash, true).then(block => ({ height, block }));
      });

    const blockResults = await Promise.allSettled(blockPromises);
    const transactions = [];

    // Process blocks and extract transactions
    for (const result of blockResults) {
      if (result.status === 'fulfilled' && transactions.length < limit) {
        const { height, block } = result.value;

        if (block.tx && block.tx.length > 0) {
          // Take only the number of transactions we need
          const txids: string[] = block.tx.slice(
            0,
            limit - transactions.length
          );

          // Fetch transaction details in parallel
          const txPromises = txids.map(txid =>
            verusAPI.getRawTransaction(txid, true).catch(() => null)
          );

          const txResults = await Promise.allSettled(txPromises);

          for (const txResult of txResults) {
            if (
              txResult.status === 'fulfilled' &&
              txResult.value &&
              transactions.length < limit
            ) {
              const tx = txResult.value;
              transactions.push({
                txid: tx.txid,
                hash: tx.hash,
                version: tx.version,
                size: tx.size,
                vsize: tx.vsize,
                weight: tx.weight,
                locktime: tx.locktime,
                vin: tx.vin || [],
                vout: tx.vout || [],
                hex: tx.hex,
                blockhash: block.hash,
                confirmations: currentHeight - height + 1,
                time: block.time,
                blocktime: block.time,
              });
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        totalTransactions: currentHeight * 10, // Estimate
        limit,
        offset,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching latest transactions:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch latest transactions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
