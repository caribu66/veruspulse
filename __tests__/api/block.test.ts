import { NextRequest } from 'next/server';
import { GET } from '@/app/api/block/[hash]/route';
import { verusAPI } from '@/lib/rpc-client-robust';
import { computeBlockFees } from '@/lib/utils/fees';
import { extractCoinbasePayout } from '@/lib/utils/coinbase';
import { isOrphan } from '@/lib/utils/orphan';
import { getMempoolTracker } from '@/lib/monitoring/mempool-tracker';

// Mock all dependencies
jest.mock('@/lib/rpc-client-robust');
jest.mock('@/lib/utils/fees');
jest.mock('@/lib/utils/coinbase');
jest.mock('@/lib/utils/orphan');
jest.mock('@/lib/monitoring/mempool-tracker');

const mockVerusAPI = verusAPI as jest.Mocked<typeof verusAPI>;
const mockComputeBlockFees = computeBlockFees as jest.MockedFunction<
  typeof computeBlockFees
>;
const mockExtractCoinbasePayout = extractCoinbasePayout as jest.MockedFunction<
  typeof extractCoinbasePayout
>;
const mockIsOrphan = isOrphan as jest.MockedFunction<typeof isOrphan>;
const mockGetMempoolTracker = getMempoolTracker as jest.MockedFunction<
  typeof getMempoolTracker
>;

describe('/api/block/[hash]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockBlock = {
    hash: '0000000000571c2075bdfcd9ab8447fae18906f2e097c3fc5b866696b5e756ab',
    confirmations: 100,
    height: 3537,
    version: 4,
    merkleroot: 'test_merkle_root',
    time: 1609459200,
    nonce: '00000000000000000000000000000000000000000000000000000000000003e8',
    bits: '1d00ffff',
    difficulty: 31813098085.261,
    previousblockhash: 'previous_hash',
    nextblockhash: 'next_hash',
    tx: ['3e3d0b7e4f8c4d3e8a9f4e5d6c7b8a9f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b'],
    size: 1234,
  };

  const mockTransaction = {
    txid: '3e3d0b7e4f8c4d3e8a9f4e5d6c7b8a9f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b',
    version: 1,
    locktime: 0,
    vin: [
      {
        coinbase: '03dd0d00',
        sequence: 4294967295,
      },
    ],
    vout: [
      {
        value: 12.5,
        n: 0,
        scriptPubKey: {
          asm: 'test_asm',
          hex: 'test_hex',
          reqSigs: 1,
          type: 'pubkeyhash',
          addresses: ['RTestAddress123456789'],
        },
      },
    ],
  };

  const createMockRequest = (url: string) => {
    return new NextRequest(url);
  };

  describe('GET - Basic Block Data', () => {
    it('should return block data without metrics', async () => {
      mockVerusAPI.getBlock.mockResolvedValue(mockBlock);
      mockVerusAPI.getRawTransaction.mockResolvedValue(mockTransaction);

      const request = createMockRequest(
        'http://localhost:3000/api/block/test_hash'
      );
      const params = Promise.resolve({
        hash: '0000000000571c2075bdfcd9ab8447fae18906f2e097c3fc5b866696b5e756ab',
      });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metrics).toBe(false);
      expect(data.data).toMatchObject({
        hash: mockBlock.hash,
        height: mockBlock.height,
        confirmations: mockBlock.confirmations,
      });
      expect(data.data.tx).toHaveLength(1);
      expect(data.data.tx[0]).toEqual(mockTransaction);
    });

    it('should return 400 if hash is missing', async () => {
      const request = createMockRequest('http://localhost:3000/api/block/');
      const params = Promise.resolve({ hash: '' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Block hash is required');
    });

    it('should return 404 if block not found', async () => {
      mockVerusAPI.getBlock.mockResolvedValue(null);

      const request = createMockRequest(
        'http://localhost:3000/api/block/invalid_hash'
      );
      const params = Promise.resolve({ hash: 'invalid_hash' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Block not found');
    });

    it('should handle RPC errors gracefully', async () => {
      mockVerusAPI.getBlock.mockRejectedValue(
        new Error('RPC connection failed')
      );

      const request = createMockRequest(
        'http://localhost:3000/api/block/test_hash'
      );
      const params = Promise.resolve({ hash: 'test_hash' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch block details');
      expect(data.details).toBe('RPC connection failed');
    });
  });

  describe('GET - Block Data with Metrics', () => {
    beforeEach(() => {
      mockVerusAPI.getBlock.mockResolvedValue(mockBlock);
      mockVerusAPI.getRawTransaction.mockResolvedValue(mockTransaction);
    });

    it('should return block data with full metrics', async () => {
      const mockFeeResult = {
        feeTotal: 0.001,
        feePerByteAvg: 0.0000008,
        approximate: false,
        processedTxs: 10,
        totalTxs: 10,
      };

      const mockCoinbaseResult = {
        payoutAddress: 'RTestAddress123456789',
        minerType: 'staker' as const,
        isShielded: false,
        totalPayout: 12.5,
      };

      const mockOrphanResult = {
        isOrphan: false,
        canonicalHash: null,
        confidence: 'high' as const,
      };

      const mockPropagationResult = {
        propagationSeconds: 2.5,
        firstSeenTx: 'txid1',
        trackedTxs: 5,
        totalTxs: 10,
      };

      mockComputeBlockFees.mockResolvedValue(mockFeeResult);
      mockExtractCoinbasePayout.mockReturnValue(mockCoinbaseResult);
      mockIsOrphan.mockResolvedValue(mockOrphanResult);
      mockGetMempoolTracker.mockReturnValue({
        calculatePropagation: jest.fn().mockReturnValue(mockPropagationResult),
      } as any);

      const request = createMockRequest(
        'http://localhost:3000/api/block/test_hash?metrics=1'
      );
      const params = Promise.resolve({ hash: 'test_hash' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metrics).toBe(true);
      expect(data.data).toMatchObject({
        hash: mockBlock.hash,
        feeTotal: mockFeeResult.feeTotal,
        feePerByteAvg: mockFeeResult.feePerByteAvg,
        feeApproximate: mockFeeResult.approximate,
        coinbasePayout: mockCoinbaseResult.payoutAddress,
        minerType: mockCoinbaseResult.minerType,
        isShieldedPayout: mockCoinbaseResult.isShielded,
        totalPayout: mockCoinbaseResult.totalPayout,
        isOrphan: mockOrphanResult.isOrphan,
        canonicalHash: mockOrphanResult.canonicalHash,
        orphanConfidence: mockOrphanResult.confidence,
        propagationSeconds: mockPropagationResult.propagationSeconds,
        firstSeenTx: mockPropagationResult.firstSeenTx,
      });
    });

    it('should return base data with defaults when metrics fail', async () => {
      mockComputeBlockFees.mockRejectedValue(
        new Error('Metrics calculation failed')
      );

      const request = createMockRequest(
        'http://localhost:3000/api/block/test_hash?metrics=1'
      );
      const params = Promise.resolve({ hash: 'test_hash' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metrics).toBe(true);
      expect(data.data.metricsError).toBe(true);
      expect(data.data.feeTotal).toBe(0);
      expect(data.data.coinbasePayout).toBe(null);
      expect(data.data.isOrphan).toBe(false);
    });

    it('should handle blocks with no transactions', async () => {
      const emptyBlock = { ...mockBlock, tx: [] };
      mockVerusAPI.getBlock.mockResolvedValue(emptyBlock);

      const request = createMockRequest(
        'http://localhost:3000/api/block/test_hash?metrics=1'
      );
      const params = Promise.resolve({ hash: 'test_hash' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.tx).toHaveLength(0);
    });
  });

  describe('GET - Edge Cases', () => {
    it('should filter out null transactions', async () => {
      mockVerusAPI.getBlock.mockResolvedValue(mockBlock);
      mockVerusAPI.getRawTransaction
        .mockResolvedValueOnce(mockTransaction)
        .mockResolvedValueOnce(null);

      const blockWithMultipleTx = {
        ...mockBlock,
        tx: ['txid1', 'txid2'],
      };
      mockVerusAPI.getBlock.mockResolvedValue(blockWithMultipleTx);

      const request = createMockRequest(
        'http://localhost:3000/api/block/test_hash'
      );
      const params = Promise.resolve({ hash: 'test_hash' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.tx).toHaveLength(1);
      expect(data.data.tx[0]).toEqual(mockTransaction);
    });

    it('should handle blocks with non-coinbase first transaction', async () => {
      const regularTx = {
        ...mockTransaction,
        vin: [{ txid: 'prev_txid', vout: 0 }],
      };

      mockVerusAPI.getBlock.mockResolvedValue(mockBlock);
      mockVerusAPI.getRawTransaction.mockResolvedValue(regularTx);
      mockComputeBlockFees.mockResolvedValue({
        feeTotal: 0.001,
        feePerByteAvg: 0.0000008,
        approximate: false,
        processedTxs: 1,
        totalTxs: 1,
      });
      mockIsOrphan.mockResolvedValue({
        isOrphan: false,
        canonicalHash: null,
        confidence: 'high',
      });

      const request = createMockRequest(
        'http://localhost:3000/api/block/test_hash?metrics=1'
      );
      const params = Promise.resolve({ hash: 'test_hash' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.coinbasePayout).toBe(null);
      expect(mockExtractCoinbasePayout).not.toHaveBeenCalled();
    });
  });
});
