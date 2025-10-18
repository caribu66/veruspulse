import { NextRequest } from 'next/server';
import { GET } from '@/app/api/transaction/[txid]/route';
import { verusAPI } from '@/lib/rpc-client-robust';

// Mock dependencies
jest.mock('@/lib/rpc-client-robust');

const mockVerusAPI = verusAPI as jest.Mocked<typeof verusAPI>;

describe('/api/transaction/[txid]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockTransaction = {
    txid: '3e3d0b7e4f8c4d3e8a9f4e5d6c7b8a9f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b',
    version: 4,
    locktime: 0,
    expiryheight: 0,
    vin: [
      {
        txid: 'prev_txid_1',
        vout: 0,
        scriptSig: { asm: '', hex: '' },
        sequence: 4294967295,
      },
    ],
    vout: [
      {
        value: 10.0,
        n: 0,
        scriptPubKey: {
          asm: 'test_asm',
          hex: 'test_hex',
          reqSigs: 1,
          type: 'pubkeyhash',
          addresses: ['RTestAddress123'],
        },
      },
      {
        value: 9.999,
        n: 1,
        scriptPubKey: {
          asm: 'test_asm',
          hex: 'test_hex',
          reqSigs: 1,
          type: 'pubkeyhash',
          addresses: ['RTestAddress456'],
        },
      },
    ],
    blockhash:
      '0000000000571c2075bdfcd9ab8447fae18906f2e097c3fc5b866696b5e756ab',
    confirmations: 100,
    time: 1609459200,
    blocktime: 1609459200,
  };

  const mockBlock = {
    hash: '0000000000571c2075bdfcd9ab8447fae18906f2e097c3fc5b866696b5e756ab',
    height: 3537,
    time: 1609459200,
  };

  const mockPrevTransaction = {
    txid: 'prev_txid_1',
    vout: [
      {
        value: 20.0,
        n: 0,
        scriptPubKey: {
          addresses: ['RTestAddress789'],
        },
      },
    ],
  };

  const createMockRequest = (url: string) => {
    return new NextRequest(url);
  };

  describe('GET - Basic Transaction Data', () => {
    it('should return transaction data successfully', async () => {
      mockVerusAPI.getRawTransaction.mockResolvedValue(mockTransaction);
      mockVerusAPI.getBlock.mockResolvedValue(mockBlock);
      mockVerusAPI.getBlockCount.mockResolvedValue(3636);

      const request = createMockRequest(
        'http://localhost:3000/api/transaction/test_txid'
      );
      const params = Promise.resolve({ txid: mockTransaction.txid });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        txid: mockTransaction.txid,
        version: mockTransaction.version,
        confirmations: 100,
      });
      expect(data.data.vin).toHaveLength(1);
      expect(data.data.vout).toHaveLength(2);
    });

    it('should return 400 if txid is missing', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/transaction/'
      );
      const params = Promise.resolve({ txid: '' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Transaction ID is required');
    });

    it('should return 404 if transaction not found', async () => {
      mockVerusAPI.getRawTransaction.mockResolvedValue(null);

      const request = createMockRequest(
        'http://localhost:3000/api/transaction/invalid_txid'
      );
      const params = Promise.resolve({ txid: 'invalid_txid' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Transaction not found');
    });

    it('should handle RPC errors gracefully', async () => {
      mockVerusAPI.getRawTransaction.mockRejectedValue(
        new Error('RPC connection failed')
      );

      const request = createMockRequest(
        'http://localhost:3000/api/transaction/test_txid'
      );
      const params = Promise.resolve({ txid: 'test_txid' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch transaction details');
      expect(data.details).toBe('RPC connection failed');
    });
  });

  describe('GET - Transaction with Confirmations', () => {
    it('should calculate confirmations correctly', async () => {
      mockVerusAPI.getRawTransaction.mockResolvedValue(mockTransaction);
      mockVerusAPI.getBlock.mockResolvedValue(mockBlock);
      mockVerusAPI.getBlockCount.mockResolvedValue(3636);

      const request = createMockRequest(
        'http://localhost:3000/api/transaction/test_txid'
      );
      const params = Promise.resolve({ txid: mockTransaction.txid });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.confirmations).toBe(100); // 3636 - 3537 + 1
    });

    it('should handle unconfirmed transactions (no blockhash)', async () => {
      const unconfirmedTx = { ...mockTransaction, blockhash: undefined };
      mockVerusAPI.getRawTransaction.mockResolvedValue(unconfirmedTx);

      const request = createMockRequest(
        'http://localhost:3000/api/transaction/test_txid'
      );
      const params = Promise.resolve({ txid: mockTransaction.txid });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.confirmations).toBe(0);
      expect(data.data.blockhash).toBeUndefined();
    });

    it('should handle block fetch failure gracefully', async () => {
      mockVerusAPI.getRawTransaction.mockResolvedValue(mockTransaction);
      mockVerusAPI.getBlock.mockResolvedValue(null);

      const request = createMockRequest(
        'http://localhost:3000/api/transaction/test_txid'
      );
      const params = Promise.resolve({ txid: mockTransaction.txid });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.confirmations).toBe(0);
    });
  });

  describe('GET - Transaction Fee Calculation', () => {
    it('should calculate transaction fee correctly', async () => {
      mockVerusAPI.getRawTransaction
        .mockResolvedValueOnce(mockTransaction)
        .mockResolvedValueOnce(mockPrevTransaction);
      mockVerusAPI.getBlock.mockResolvedValue(mockBlock);
      mockVerusAPI.getBlockCount.mockResolvedValue(3636);

      const request = createMockRequest(
        'http://localhost:3000/api/transaction/test_txid'
      );
      const params = Promise.resolve({ txid: mockTransaction.txid });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      // Fee = input (20.0) - outputs (10.0 + 9.999) = 0.001
      expect(data.data.fee).toBeCloseTo(0.001, 6);
    });

    it('should handle coinbase transactions (no inputs)', async () => {
      const coinbaseTx = {
        ...mockTransaction,
        vin: [{ coinbase: '03dd0d00', sequence: 4294967295 }],
      };
      mockVerusAPI.getRawTransaction.mockResolvedValue(coinbaseTx);
      mockVerusAPI.getBlock.mockResolvedValue(mockBlock);
      mockVerusAPI.getBlockCount.mockResolvedValue(3636);

      const request = createMockRequest(
        'http://localhost:3000/api/transaction/test_txid'
      );
      const params = Promise.resolve({ txid: mockTransaction.txid });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.fee).toBeUndefined();
    });

    it('should handle fee calculation errors gracefully', async () => {
      mockVerusAPI.getRawTransaction
        .mockResolvedValueOnce(mockTransaction)
        .mockRejectedValueOnce(new Error('Failed to fetch previous tx'));
      mockVerusAPI.getBlock.mockResolvedValue(mockBlock);
      mockVerusAPI.getBlockCount.mockResolvedValue(3636);

      const request = createMockRequest(
        'http://localhost:3000/api/transaction/test_txid'
      );
      const params = Promise.resolve({ txid: mockTransaction.txid });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.fee).toBeUndefined();
    });

    it('should handle negative fees (should return 0)', async () => {
      const largePrevTx = {
        ...mockPrevTransaction,
        vout: [{ value: 5.0, n: 0 }], // Less than outputs
      };
      mockVerusAPI.getRawTransaction
        .mockResolvedValueOnce(mockTransaction)
        .mockResolvedValueOnce(largePrevTx);
      mockVerusAPI.getBlock.mockResolvedValue(mockBlock);
      mockVerusAPI.getBlockCount.mockResolvedValue(3636);

      const request = createMockRequest(
        'http://localhost:3000/api/transaction/test_txid'
      );
      const params = Promise.resolve({ txid: mockTransaction.txid });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.fee).toBeUndefined(); // Negative fee should not be included
    });

    it('should handle multiple inputs correctly', async () => {
      const multiInputTx = {
        ...mockTransaction,
        vin: [
          { txid: 'prev_txid_1', vout: 0 },
          { txid: 'prev_txid_2', vout: 0 },
        ],
      };

      const prevTx2 = {
        txid: 'prev_txid_2',
        vout: [{ value: 15.0, n: 0 }],
      };

      mockVerusAPI.getRawTransaction
        .mockResolvedValueOnce(multiInputTx)
        .mockResolvedValueOnce(mockPrevTransaction) // 20.0
        .mockResolvedValueOnce(prevTx2); // 15.0
      mockVerusAPI.getBlock.mockResolvedValue(mockBlock);
      mockVerusAPI.getBlockCount.mockResolvedValue(3636);

      const request = createMockRequest(
        'http://localhost:3000/api/transaction/test_txid'
      );
      const params = Promise.resolve({ txid: mockTransaction.txid });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      // Fee = inputs (20.0 + 15.0) - outputs (10.0 + 9.999) = 15.001
      expect(data.data.fee).toBeCloseTo(15.001, 6);
    });
  });

  describe('GET - Edge Cases', () => {
    it('should handle transactions with no outputs', async () => {
      const noOutputTx = { ...mockTransaction, vout: [] };
      mockVerusAPI.getRawTransaction.mockResolvedValue(noOutputTx);
      mockVerusAPI.getBlock.mockResolvedValue(mockBlock);
      mockVerusAPI.getBlockCount.mockResolvedValue(3636);

      const request = createMockRequest(
        'http://localhost:3000/api/transaction/test_txid'
      );
      const params = Promise.resolve({ txid: mockTransaction.txid });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.vout).toHaveLength(0);
    });

    it('should handle transactions with missing value in vout', async () => {
      const invalidVoutTx = {
        ...mockTransaction,
        vout: [
          {
            n: 0,
            scriptPubKey: {
              addresses: ['RTestAddress123'],
            },
          },
        ],
      };
      mockVerusAPI.getRawTransaction.mockResolvedValue(invalidVoutTx);
      mockVerusAPI.getBlock.mockResolvedValue(mockBlock);
      mockVerusAPI.getBlockCount.mockResolvedValue(3636);

      const request = createMockRequest(
        'http://localhost:3000/api/transaction/test_txid'
      );
      const params = Promise.resolve({ txid: mockTransaction.txid });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.vout).toHaveLength(1);
    });
  });
});
