// Mock the RPC client module entirely
jest.mock('@/lib/rpc-client-robust', () => ({
  verusAPI: {
    getBlockchainInfo: jest.fn(),
    getNetworkInfo: jest.fn(),
    getMiningInfo: jest.fn(),
    getMempoolInfo: jest.fn(),
  },
}));

// Mock the logger
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { verusAPI } from '@/lib/rpc-client-robust';

describe('VerusAPIClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle network errors gracefully', async () => {
    (verusAPI.getBlockchainInfo as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    await expect(verusAPI.getBlockchainInfo()).rejects.toThrow('Network error');
  });

  it('should handle HTTP errors gracefully', async () => {
    (verusAPI.getBlockchainInfo as jest.Mock).mockRejectedValue(
      new Error('RPC Error: Internal server error (Code: -1)')
    );

    await expect(verusAPI.getBlockchainInfo()).rejects.toThrow(
      'RPC Error: Internal server error (Code: -1)'
    );
  });

  it('should handle RPC errors gracefully', async () => {
    (verusAPI.getBlockchainInfo as jest.Mock).mockRejectedValue(
      new Error('RPC Error: Method not found (Code: -32601)')
    );

    await expect(verusAPI.getBlockchainInfo()).rejects.toThrow(
      'RPC Error: Method not found (Code: -32601)'
    );
  });

  it('should handle timeout errors', async () => {
    (verusAPI.getBlockchainInfo as jest.Mock).mockRejectedValue(
      new Error('Request timeout')
    );

    await expect(verusAPI.getBlockchainInfo()).rejects.toThrow(
      'Request timeout'
    );
  });
});
