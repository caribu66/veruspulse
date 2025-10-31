import { GET } from '@/app/api/blockchain-info/route';
import { CachedRPCClient } from '@/lib/cache/cached-rpc-client';

// Mock the dependencies
jest.mock('@/lib/cache/cached-rpc-client');
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockCachedRPCClient = CachedRPCClient as jest.Mocked<
  typeof CachedRPCClient
>;

describe('/api/blockchain-info', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return blockchain info successfully', async () => {
      // Mock successful responses
      const mockBlockchainInfo = {
        chain: 'main',
        blocks: 3537,
        bestblockhash:
          '0000000000571c2075bdfcd9ab8447fae18906f2e097c3fc5b866696b5e756ab',
        difficulty: 31813098085.261,
        verificationprogress: 0.000941465444065853,
        chainwork:
          '0000000000000000000000000000000000000000000000000002f01551a8f1a3',
        size_on_disk: 10673073,
        commitments: 3658,
        valuePools: [
          {
            id: 'sprout',
            monitored: true,
            chainValue: 2622.08777336,
            chainValueZat: 262208777336,
          },
        ],
      };

      const mockNetworkInfo = {
        connections: 5,
        version: 2000753,
        subversion: '/MagicBean:2.0.7-3/',
        protocolversion: 170010,
        localservices: '0000000000000005',
        timeoffset: 0,
        networks: [],
        relayfee: 0.00001,
        localaddresses: [],
        warnings: '',
      };

      const mockTxOutInfo = {
        height: 3537,
        bestblock:
          '0000000000571c2075bdfcd9ab8447fae18906f2e097c3fc5b866696b5e756ab',
        transactions: 2986,
        txouts: 9433,
        bytes_serialized: 342315,
        hash_serialized:
          '4c0ec8a12ee63a34154dbb877ea30d218ebd2858898e673bd86b93b85ad34b96',
        total_amount: 235738.0845222,
      };

      mockCachedRPCClient.getBlockchainInfo.mockResolvedValue(
        mockBlockchainInfo
      );
      mockCachedRPCClient.getNetworkInfo.mockResolvedValue(mockNetworkInfo);
      mockCachedRPCClient.getTxOutSetInfo.mockResolvedValue(mockTxOutInfo);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        blocks: 3537,
        chain: 'main',
        difficulty: 31813098085.261,
        bestBlockHash:
          '0000000000571c2075bdfcd9ab8447fae18906f2e097c3fc5b866696b5e756ab',
        verificationProgress: 0.000941465444065853,
        connections: 5,
        networkActive: true,
        chainwork:
          '0000000000000000000000000000000000000000000000000002f01551a8f1a3',
        sizeOnDisk: 10673073,
        commitments: 3658,
        valuePools: expect.any(Array),
        circulatingSupply: 235738.0845222,
      });
      expect(data.timestamp).toBeDefined();
    });

    it('should handle blockchain info fetch failure', async () => {
      mockCachedRPCClient.getBlockchainInfo.mockResolvedValue(null);
      mockCachedRPCClient.getNetworkInfo.mockResolvedValue({});
      mockCachedRPCClient.getTxOutSetInfo.mockResolvedValue({});

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch blockchain information');
    });

    it('should handle RPC errors gracefully', async () => {
      mockCachedRPCClient.getBlockchainInfo.mockRejectedValue(
        new Error('RPC connection failed')
      );
      mockCachedRPCClient.getNetworkInfo.mockResolvedValue({});
      mockCachedRPCClient.getTxOutSetInfo.mockResolvedValue({});

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch blockchain information');
    });

    it('should include raw data for debugging', async () => {
      const mockBlockchainInfo = {
        chain: 'main',
        blocks: 3537,
        bestblockhash: 'test_hash',
        difficulty: 12345,
        verificationprogress: 0.5,
        chainwork: 'test_work',
        size_on_disk: 1000,
        commitments: 100,
        valuePools: [],
      };

      const mockNetworkInfo = {
        connections: 3,
        version: 2000753,
        subversion: '/test/',
        protocolversion: 170010,
        localservices: '0000000000000005',
        timeoffset: 0,
        networks: [],
        relayfee: 0.00001,
        localaddresses: [],
        warnings: '',
      };

      const mockTxOutInfo = {
        height: 3537,
        bestblock: 'test_block',
        transactions: 1000,
        txouts: 2000,
        bytes_serialized: 50000,
        hash_serialized: 'test_hash',
        total_amount: 100000,
      };

      mockCachedRPCClient.getBlockchainInfo.mockResolvedValue(
        mockBlockchainInfo
      );
      mockCachedRPCClient.getNetworkInfo.mockResolvedValue(mockNetworkInfo);
      mockCachedRPCClient.getTxOutSetInfo.mockResolvedValue(mockTxOutInfo);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data._raw).toBeDefined();
      expect(data.data._raw.blockchainInfo).toEqual(mockBlockchainInfo);
      expect(data.data._raw.networkInfo).toEqual(mockNetworkInfo);
      expect(data.data._raw.txOutInfo).toEqual(mockTxOutInfo);
    });

    it('should handle missing optional fields gracefully', async () => {
      const mockBlockchainInfo = {
        chain: 'main',
        blocks: 3537,
        // Missing optional fields
      };

      const mockNetworkInfo = {
        connections: 5,
        version: 2000753,
        subversion: '/test/',
        protocolversion: 170010,
        localservices: '0000000000000005',
        timeoffset: 0,
        networks: [],
        relayfee: 0.00001,
        localaddresses: [],
        warnings: '',
      };

      const mockTxOutInfo = {
        height: 3537,
        bestblock: 'test_block',
        transactions: 1000,
        txouts: 2000,
        bytes_serialized: 50000,
        hash_serialized: 'test_hash',
        total_amount: 100000,
      };

      mockCachedRPCClient.getBlockchainInfo.mockResolvedValue(
        mockBlockchainInfo
      );
      mockCachedRPCClient.getNetworkInfo.mockResolvedValue(mockNetworkInfo);
      mockCachedRPCClient.getTxOutSetInfo.mockResolvedValue(mockTxOutInfo);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.blocks).toBe(3537);
      expect(data.data.chain).toBe('main');
      expect(data.data.difficulty).toBe(0); // Default value
      expect(data.data.bestBlockHash).toBe(''); // Default value
      expect(data.data.verificationProgress).toBe(0); // Default value
      expect(data.data.connections).toBe(5);
      expect(data.data.networkActive).toBe(true);
    });
  });
});
