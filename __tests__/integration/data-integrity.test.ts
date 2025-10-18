/**
 * Data Integrity Integration Tests
 *
 * These tests verify that the web API returns accurate data
 * that matches the blockchain state.
 *
 * Set TEST_LIVE_DATA=true to run against real blockchain data
 * Otherwise, tests will use mocked data
 */

import { verusAPI } from '@/lib/rpc-client-robust';

const USE_LIVE_DATA = process.env.TEST_LIVE_DATA === 'true';

describe('Data Integrity Tests', () => {
  // Skip these tests if not explicitly enabled
  const testFn = USE_LIVE_DATA ? test : test.skip;

  describe('Block Data Integrity', () => {
    testFn('should return accurate block height', async () => {
      const blockchainInfo = await verusAPI.getBlockchainInfo();
      expect(blockchainInfo.blocks).toBeGreaterThan(0);
      expect(typeof blockchainInfo.blocks).toBe('number');

      // Verify it's a reasonable block height (Verus has millions of blocks)
      expect(blockchainInfo.blocks).toBeGreaterThan(1000000);
    });

    testFn('should return accurate block hash for current height', async () => {
      const blockchainInfo = await verusAPI.getBlockchainInfo();
      const currentHeight = blockchainInfo.blocks;

      const hash = await verusAPI.getBlockHash(currentHeight);

      expect(hash).toBeDefined();
      expect(hash).toMatch(/^[0-9a-f]{64}$/); // 64 hex characters
      expect(hash).toBe(blockchainInfo.bestblockhash);
    });

    testFn('should return consistent block data', async () => {
      const blockchainInfo = await verusAPI.getBlockchainInfo();
      const hash = blockchainInfo.bestblockhash;

      // Get block twice
      const block1 = await verusAPI.getBlock(hash);
      const block2 = await verusAPI.getBlock(hash);

      // Should be identical
      expect(block1).toEqual(block2);
      expect(block1.hash).toBe(hash);
      expect(block1.height).toBe(blockchainInfo.blocks);
    });

    testFn('should correctly link previous and next blocks', async () => {
      const blockchainInfo = await verusAPI.getBlockchainInfo();
      const currentHeight = blockchainInfo.blocks;

      // Get current block and previous block
      const currentHash = await verusAPI.getBlockHash(currentHeight);
      const previousHash = await verusAPI.getBlockHash(currentHeight - 1);

      const currentBlock = await verusAPI.getBlock(currentHash);
      const previousBlock = await verusAPI.getBlock(previousHash);

      // Current block should reference previous block
      expect(currentBlock.previousblockhash).toBe(previousHash);

      // Previous block should reference current block as next
      // (unless a new block was just mined)
      if (previousBlock.nextblockhash) {
        expect(previousBlock.nextblockhash).toBe(currentHash);
      }
    });
  });

  describe('Transaction Data Integrity', () => {
    testFn('should return valid transaction data', async () => {
      const blockchainInfo = await verusAPI.getBlockchainInfo();
      const hash = await verusAPI.getBlockHash(blockchainInfo.blocks);
      const block = await verusAPI.getBlock(hash);

      expect(block.tx).toBeDefined();
      expect(Array.isArray(block.tx)).toBe(true);
      expect(block.tx.length).toBeGreaterThan(0);

      // First transaction should be coinbase/coinstake
      const firstTxId = block.tx[0];
      const firstTx = await verusAPI.getRawTransaction(firstTxId, true);

      expect(firstTx).toBeDefined();
      expect(firstTx.txid).toBe(firstTxId);
      expect(firstTx.vin).toBeDefined();
      expect(Array.isArray(firstTx.vin)).toBe(true);
    });

    testFn('should have correct transaction confirmations', async () => {
      const blockchainInfo = await verusAPI.getBlockchainInfo();
      const currentHeight = blockchainInfo.blocks;

      // Get a block 10 blocks ago
      const testHeight = currentHeight - 10;
      const hash = await verusAPI.getBlockHash(testHeight);
      const block = await verusAPI.getBlock(hash);

      expect(block.confirmations).toBeGreaterThanOrEqual(10);
      expect(block.confirmations).toBeLessThanOrEqual(12); // Allow for new blocks
    });
  });

  describe('Blockchain Info Accuracy', () => {
    testFn('should return valid chain name', async () => {
      const blockchainInfo = await verusAPI.getBlockchainInfo();

      expect(blockchainInfo.chain).toBeDefined();
      expect(['main', 'test', 'regtest']).toContain(blockchainInfo.chain);
    });

    testFn('should return positive difficulty', async () => {
      const blockchainInfo = await verusAPI.getBlockchainInfo();

      expect(blockchainInfo.difficulty).toBeDefined();
      expect(blockchainInfo.difficulty).toBeGreaterThan(0);
      expect(typeof blockchainInfo.difficulty).toBe('number');
    });

    testFn('should return valid verification progress', async () => {
      const blockchainInfo = await verusAPI.getBlockchainInfo();

      expect(blockchainInfo.verificationprogress).toBeDefined();
      expect(blockchainInfo.verificationprogress).toBeGreaterThanOrEqual(0);
      expect(blockchainInfo.verificationprogress).toBeLessThanOrEqual(1);
    });

    testFn('should return valid chainwork', async () => {
      const blockchainInfo = await verusAPI.getBlockchainInfo();

      expect(blockchainInfo.chainwork).toBeDefined();
      expect(blockchainInfo.chainwork).toMatch(/^[0-9a-f]+$/i);
    });
  });

  describe('Network Data Accuracy', () => {
    testFn('should return valid network info', async () => {
      const networkInfo = await verusAPI.getNetworkInfo();

      expect(networkInfo.connections).toBeDefined();
      expect(typeof networkInfo.connections).toBe('number');
      expect(networkInfo.connections).toBeGreaterThanOrEqual(0);

      expect(networkInfo.version).toBeDefined();
      expect(typeof networkInfo.version).toBe('number');

      expect(networkInfo.subversion).toBeDefined();
      expect(networkInfo.subversion).toContain('Verus');
    });

    testFn('should return reasonable connection count', async () => {
      const networkInfo = await verusAPI.getNetworkInfo();

      // Should have some peers (unless isolated testnet)
      expect(networkInfo.connections).toBeGreaterThanOrEqual(0);
      expect(networkInfo.connections).toBeLessThan(1000); // Sanity check
    });
  });

  describe('Supply and UTXO Data', () => {
    testFn('should return valid circulating supply', async () => {
      const txOutInfo = await verusAPI.getTxOutSetInfo();

      expect(txOutInfo.total_amount).toBeDefined();
      expect(typeof txOutInfo.total_amount).toBe('number');
      expect(txOutInfo.total_amount).toBeGreaterThan(0);

      // Verus has a maximum supply, should be less than that
      expect(txOutInfo.total_amount).toBeLessThan(100000000); // 100M max supply
    });

    testFn('should return valid UTXO count', async () => {
      const txOutInfo = await verusAPI.getTxOutSetInfo();

      expect(txOutInfo.txouts).toBeDefined();
      expect(typeof txOutInfo.txouts).toBe('number');
      expect(txOutInfo.txouts).toBeGreaterThan(0);

      expect(txOutInfo.transactions).toBeDefined();
      expect(typeof txOutInfo.transactions).toBe('number');
      expect(txOutInfo.transactions).toBeGreaterThan(0);
    });

    testFn('should have consistent best block across calls', async () => {
      const blockchainInfo = await verusAPI.getBlockchainInfo();
      const txOutInfo = await verusAPI.getTxOutSetInfo();

      // These should reference the same or adjacent blocks
      const heightDiff = Math.abs(blockchainInfo.blocks - txOutInfo.height);
      expect(heightDiff).toBeLessThanOrEqual(1); // Allow for racing blocks
    });
  });

  describe('Data Consistency Over Time', () => {
    testFn(
      'should maintain data consistency across multiple calls',
      async () => {
        // Call twice with small delay
        const info1 = await verusAPI.getBlockchainInfo();
        await new Promise(resolve => setTimeout(resolve, 1000));
        const info2 = await verusAPI.getBlockchainInfo();

        // Height should be same or slightly increased
        expect(info2.blocks).toBeGreaterThanOrEqual(info1.blocks);
        expect(info2.blocks - info1.blocks).toBeLessThanOrEqual(2);

        // Chain should be the same
        expect(info2.chain).toBe(info1.chain);

        // Verification progress should not decrease
        expect(info2.verificationprogress).toBeGreaterThanOrEqual(
          info1.verificationprogress
        );
      }
    );
  });

  describe('Edge Cases and Error Handling', () => {
    testFn('should handle invalid block height gracefully', async () => {
      const blockchainInfo = await verusAPI.getBlockchainInfo();
      const invalidHeight = blockchainInfo.blocks + 1000;

      await expect(verusAPI.getBlockHash(invalidHeight)).rejects.toThrow();
    });

    testFn('should handle invalid block hash gracefully', async () => {
      const invalidHash =
        '0000000000000000000000000000000000000000000000000000000000000000';

      const result = await verusAPI.getBlock(invalidHash);
      expect(result).toBeNull();
    });

    testFn('should handle invalid transaction ID gracefully', async () => {
      const invalidTxId = 'invalid_transaction_id';

      await expect(
        verusAPI.getRawTransaction(invalidTxId, true)
      ).rejects.toThrow();
    });
  });
});

describe('Calculated Data Accuracy', () => {
  const testFn = USE_LIVE_DATA ? test : test.skip;

  testFn('should calculate confirmations correctly', async () => {
    const blockchainInfo = await verusAPI.getBlockchainInfo();
    const currentHeight = blockchainInfo.blocks;

    // Get block 100 blocks ago
    const testHeight = currentHeight - 100;
    const hash = await verusAPI.getBlockHash(testHeight);
    const block = await verusAPI.getBlock(hash);

    // Confirmations = current height - block height + 1
    const expectedConfirmations = currentHeight - testHeight + 1;

    expect(block.confirmations).toBeCloseTo(expectedConfirmations, 1);
  });

  testFn('should have consistent block times', async () => {
    const blockchainInfo = await verusAPI.getBlockchainInfo();
    const currentHeight = blockchainInfo.blocks;

    // Get 10 recent blocks
    const blocks = [];
    for (let i = 0; i < 10; i++) {
      const height = currentHeight - i;
      const hash = await verusAPI.getBlockHash(height);
      const block = await verusAPI.getBlock(hash);
      blocks.push(block);
    }

    // Check that times are decreasing (blocks are ordered newest to oldest)
    for (let i = 1; i < blocks.length; i++) {
      expect(blocks[i].time).toBeLessThan(blocks[i - 1].time);
    }

    // Average block time should be around 60 seconds (1 minute target for Verus)
    const timeDiff = blocks[0].time - blocks[blocks.length - 1].time;
    const avgBlockTime = timeDiff / (blocks.length - 1);

    // Should be roughly 60 seconds, but allow wide variance
    expect(avgBlockTime).toBeGreaterThan(30);
    expect(avgBlockTime).toBeLessThan(120);
  });
});

// Integration test configuration
if (!USE_LIVE_DATA) {
  console.log(
    'ℹ️  Integration tests skipped. Set TEST_LIVE_DATA=true to run against live blockchain data.'
  );
}
