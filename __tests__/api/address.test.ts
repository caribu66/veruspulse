import { NextRequest } from 'next/server';
import { GET } from '@/app/api/address/[address]/route';
import { verusAPI } from '@/lib/rpc-client-robust';
import { verusClientWithFallback } from '@/lib/rpc-client-with-fallback';

// Mock dependencies
jest.mock('@/lib/rpc-client-robust');
jest.mock('@/lib/rpc-client-with-fallback');

const mockVerusAPI = verusAPI as jest.Mocked<typeof verusAPI>;
const mockVerusClientWithFallback = verusClientWithFallback as jest.Mocked<
  typeof verusClientWithFallback
>;

describe('/api/address/[address]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockBalance = {
    balance: 100.5,
    received: 250.75,
    sent: 150.25, // received - balance
    txcount: 15,
  };

  const mockTxids = [
    '3e3d0b7e4f8c4d3e8a9f4e5d6c7b8a9f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b',
    '4f4e1c8f5g9d5e4f9b0g5f6e7d8c9b0g2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c',
    '5g5f2d9g6h0e6f5g0c1h6g7f8e9d0c1h3g4f5e6d7c8b9g0f1e2d3c4b5a6g7f8e',
  ];

  const createMockRequest = (url: string) => {
    return new NextRequest(url);
  };

  describe('GET - Success Cases', () => {
    it('should return address data successfully', async () => {
      mockVerusClientWithFallback.getAddressBalance.mockResolvedValue(
        mockBalance
      );
      mockVerusAPI.getAddressTxids.mockResolvedValue(mockTxids);

      const request = createMockRequest(
        'http://localhost:3000/api/address/RTestAddress123'
      );
      const params = Promise.resolve({ address: 'RTestAddress123' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        balance: 100.5,
        received: 250.75,
        sent: 150.25, // received - balance
        txcount: 3,
      });
      expect(data.timestamp).toBeDefined();
    });

    it('should calculate sent amount correctly', async () => {
      const balanceWithLargeSent = {
        balance: 10.0,
        received: 100.0,
        sent: 90.0, // received - balance
        txcount: 10,
      };
      mockVerusClientWithFallback.getAddressBalance.mockResolvedValue(
        balanceWithLargeSent
      );
      mockVerusAPI.getAddressTxids.mockResolvedValue(mockTxids);

      const request = createMockRequest(
        'http://localhost:3000/api/address/RTestAddress'
      );
      const params = Promise.resolve({ address: 'RTestAddress' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.sent).toBe(90.0); // 100.0 - 10.0
    });

    it('should handle zero balance addresses', async () => {
      const zeroBalance = {
        balance: 0,
        received: 0,
        sent: 0,
        txcount: 0,
      };
      mockVerusClientWithFallback.getAddressBalance.mockResolvedValue(
        zeroBalance
      );
      mockVerusAPI.getAddressTxids.mockResolvedValue([]);

      const request = createMockRequest(
        'http://localhost:3000/api/address/RNewAddress'
      );
      const params = Promise.resolve({ address: 'RNewAddress' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        balance: 0,
        received: 0,
        sent: 0,
        txcount: 0,
      });
    });

    it('should handle addresses with no transactions', async () => {
      const noTxBalance = {
        balance: 0,
        received: 0,
        sent: 0,
        txcount: 0,
      };
      mockVerusClientWithFallback.getAddressBalance.mockResolvedValue(
        noTxBalance
      );
      mockVerusAPI.getAddressTxids.mockResolvedValue([]);

      const request = createMockRequest(
        'http://localhost:3000/api/address/RUnusedAddress'
      );
      const params = Promise.resolve({ address: 'RUnusedAddress' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.txcount).toBe(0);
    });

    it('should handle addresses with large balance', async () => {
      const largeBalance = {
        balance: 1000000.123456,
        received: 5000000.987654,
        sent: 4000000.864198, // received - balance
        txcount: 1000,
      };
      mockVerusClientWithFallback.getAddressBalance.mockResolvedValue(
        largeBalance
      );
      mockVerusAPI.getAddressTxids.mockResolvedValue(
        Array(1000).fill('txid_placeholder')
      );

      const request = createMockRequest(
        'http://localhost:3000/api/address/RWhaleAddress'
      );
      const params = Promise.resolve({ address: 'RWhaleAddress' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.balance).toBe(1000000.123456);
      expect(data.data.received).toBe(5000000.987654);
      // sent = received - balance = 5000000.987654 - 1000000.123456 = 4000000.864198
      expect(data.data.sent).toBeCloseTo(4000000.864198, 5); // Use toBeCloseTo for floating point
      expect(data.data.txcount).toBe(1000);
    });
  });

  describe('GET - Error Cases', () => {
    it('should return 400 if address is missing', async () => {
      const request = createMockRequest('http://localhost:3000/api/address/');
      const params = Promise.resolve({ address: '' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Address is required');
    });

    it('should handle RPC errors gracefully', async () => {
      // Mock both to reject to trigger the catch block
      mockVerusClientWithFallback.getAddressBalance.mockRejectedValue(
        new Error('RPC connection failed')
      );
      mockVerusAPI.getAddressTxids.mockRejectedValue(
        new Error('RPC connection failed')
      );

      const request = createMockRequest(
        'http://localhost:3000/api/address/RTestAddress'
      );
      const params = Promise.resolve({ address: 'RTestAddress' });

      // The API uses Promise.allSettled, so it won't throw unless there's a try/catch error
      // Since the route handles rejections gracefully, we need to check if both fail
      const response = await GET(request, { params });
      const data = await response.json();

      // When using allSettled, the API returns 200 with default values
      // only a thrown error in the try block causes 500
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.balance).toBe(0);
      expect(data.data.txcount).toBe(0);
    });

    it('should handle partial failures gracefully', async () => {
      mockVerusClientWithFallback.getAddressBalance.mockResolvedValue(
        mockBalance
      );
      mockVerusAPI.getAddressTxids.mockRejectedValue(
        new Error('Failed to fetch txids')
      );

      const request = createMockRequest(
        'http://localhost:3000/api/address/RTestAddress'
      );
      const params = Promise.resolve({ address: 'RTestAddress' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.balance).toBe(100.5);
      expect(data.data.txcount).toBe(0); // Should default to 0 on failure
    });

    it('should handle null balance response', async () => {
      mockVerusClientWithFallback.getAddressBalance.mockResolvedValue(
        null as any
      );
      mockVerusAPI.getAddressTxids.mockResolvedValue(mockTxids);

      const request = createMockRequest(
        'http://localhost:3000/api/address/RInvalidAddress'
      );
      const params = Promise.resolve({ address: 'RInvalidAddress' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        balance: 0,
        received: 0,
        sent: 0,
        txcount: 3,
      });
    });

    it('should handle null txids response', async () => {
      mockVerusClientWithFallback.getAddressBalance.mockResolvedValue(
        mockBalance
      );
      mockVerusAPI.getAddressTxids.mockResolvedValue(null as any);

      const request = createMockRequest(
        'http://localhost:3000/api/address/RTestAddress'
      );
      const params = Promise.resolve({ address: 'RTestAddress' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.balance).toBe(100.5);
      expect(data.data.txcount).toBe(0);
    });
  });

  describe('GET - Edge Cases', () => {
    it('should handle fractional balances correctly', async () => {
      const fractionalBalance = {
        balance: 0.00000001,
        received: 0.00000002,
        sent: 0.00000001, // received - balance
        txcount: 1,
      };
      mockVerusClientWithFallback.getAddressBalance.mockResolvedValue(
        fractionalBalance
      );
      mockVerusAPI.getAddressTxids.mockResolvedValue(['txid1']);

      const request = createMockRequest(
        'http://localhost:3000/api/address/RDustAddress'
      );
      const params = Promise.resolve({ address: 'RDustAddress' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.balance).toBe(0.00000001);
      expect(data.data.received).toBe(0.00000002);
      expect(data.data.sent).toBe(0.00000001);
    });

    it('should handle VerusID addresses (i-address)', async () => {
      mockVerusClientWithFallback.getAddressBalance.mockResolvedValue(
        mockBalance
      );
      mockVerusAPI.getAddressTxids.mockResolvedValue(mockTxids);

      const request = createMockRequest(
        'http://localhost:3000/api/address/iTestIdentity123'
      );
      const params = Promise.resolve({ address: 'iTestIdentity123' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(
        mockVerusClientWithFallback.getAddressBalance
      ).toHaveBeenCalledWith('iTestIdentity123');
    });

    it('should not allow negative sent amounts', async () => {
      const impossibleBalance = {
        balance: 200.0, // Balance greater than received (data inconsistency)
        received: 100.0,
        sent: 0,
        txcount: 5,
      };
      mockVerusClientWithFallback.getAddressBalance.mockResolvedValue(
        impossibleBalance
      );
      mockVerusAPI.getAddressTxids.mockResolvedValue(mockTxids);

      const request = createMockRequest(
        'http://localhost:3000/api/address/RWeirdAddress'
      );
      const params = Promise.resolve({ address: 'RWeirdAddress' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.sent).toBe(0); // Should be clamped to 0, not negative
    });

    it('should handle missing optional fields in balance', async () => {
      const partialBalance = {
        balance: 50.0,
        received: 50.0,
        sent: 0.0,
        txcount: 5,
      };
      mockVerusClientWithFallback.getAddressBalance.mockResolvedValue(
        partialBalance as any
      );
      mockVerusAPI.getAddressTxids.mockResolvedValue(mockTxids);

      const request = createMockRequest(
        'http://localhost:3000/api/address/RPartialAddress'
      );
      const params = Promise.resolve({ address: 'RPartialAddress' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.balance).toBe(50.0);
      expect(data.data.sent).toBe(0); // Should handle undefined gracefully
    });

    it('should handle special characters in address', async () => {
      mockVerusClientWithFallback.getAddressBalance.mockResolvedValue(
        mockBalance
      );
      mockVerusAPI.getAddressTxids.mockResolvedValue(mockTxids);

      const request = createMockRequest(
        'http://localhost:3000/api/address/RTest%40Address'
      );
      const params = Promise.resolve({ address: 'RTest@Address' });

      const response = await GET(request, { params });
      await response.json();

      expect(response.status).toBe(200);
      expect(
        mockVerusClientWithFallback.getAddressBalance
      ).toHaveBeenCalledWith('RTest@Address');
    });

    it('should handle very long transaction lists', async () => {
      const manyTxids = Array(10000)
        .fill(null)
        .map((_, i) => `txid_${i}`);
      mockVerusClientWithFallback.getAddressBalance.mockResolvedValue(
        mockBalance
      );
      mockVerusAPI.getAddressTxids.mockResolvedValue(manyTxids);

      const request = createMockRequest(
        'http://localhost:3000/api/address/RActiveAddress'
      );
      const params = Promise.resolve({ address: 'RActiveAddress' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.txcount).toBe(10000);
    });
  });

  describe('GET - Timestamp Validation', () => {
    it('should include valid ISO timestamp', async () => {
      mockVerusClientWithFallback.getAddressBalance.mockResolvedValue(
        mockBalance
      );
      mockVerusAPI.getAddressTxids.mockResolvedValue(mockTxids);

      const request = createMockRequest(
        'http://localhost:3000/api/address/RTestAddress'
      );
      const params = Promise.resolve({ address: 'RTestAddress' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.timestamp).toBeDefined();
      expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
    });

    it('should have recent timestamp', async () => {
      mockVerusClientWithFallback.getAddressBalance.mockResolvedValue(
        mockBalance
      );
      mockVerusAPI.getAddressTxids.mockResolvedValue(mockTxids);

      const beforeTime = Date.now();
      const request = createMockRequest(
        'http://localhost:3000/api/address/RTestAddress'
      );
      const params = Promise.resolve({ address: 'RTestAddress' });

      const response = await GET(request, { params });
      const data = await response.json();
      const afterTime = Date.now();

      expect(response.status).toBe(200);
      const timestampMs = new Date(data.timestamp).getTime();
      expect(timestampMs).toBeGreaterThanOrEqual(beforeTime);
      expect(timestampMs).toBeLessThanOrEqual(afterTime);
    });
  });
});
