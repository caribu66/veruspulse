import { type NextRequest, NextResponse } from 'next/server';
import { addSecurityHeaders } from '@/lib/middleware/security';

export async function GET(request: NextRequest) {
  const apiDocs = {
    title: 'Verus Explorer API',
    version: '1.0.0',
    description:
      'Comprehensive API for Verus blockchain data and network statistics',
    baseUrl: `${request.nextUrl.origin}/api`,
    endpoints: [
      {
        path: '/health',
        method: 'GET',
        description: 'Health check endpoint',
        parameters: [],
        response: {
          status: 'healthy | degraded | unhealthy',
          timestamp: 'string',
          uptime: 'number',
          version: 'string',
          environment: 'string',
          checks: 'object',
          metrics: 'object',
        },
      },
      {
        path: '/blockchain-info',
        method: 'GET',
        description: 'Get blockchain information',
        parameters: [],
        response: {
          success: 'boolean',
          data: {
            chain: 'string',
            blocks: 'number',
            difficulty: 'number',
            bestBlockHash: 'string',
            verificationProgress: 'number',
            connections: 'number',
            networkActive: 'boolean',
            chainwork: 'string',
            sizeOnDisk: 'number',
            commitments: 'number',
            valuePools: 'array',
            circulatingSupply: 'number',
          },
        },
      },
      {
        path: '/mining-info',
        method: 'GET',
        description: 'Get mining information',
        parameters: [],
        response: {
          success: 'boolean',
          data: {
            blocks: 'number',
            currentblocksize: 'number',
            currentblocktx: 'number',
            difficulty: 'number',
            networkhashps: 'number',
            pooledtx: 'number',
            chain: 'string',
            warnings: 'string',
          },
        },
      },
      {
        path: '/mempool/size',
        method: 'GET',
        description: 'Get mempool size information',
        parameters: [],
        response: {
          success: 'boolean',
          data: {
            size: 'number',
            bytes: 'number',
            usage: 'number',
            maxmempool: 'number',
            mempoolminfee: 'number',
            minrelaytxfee: 'number',
          },
        },
      },
      {
        path: '/real-staking-data',
        method: 'GET',
        description: 'Get staking information',
        parameters: [],
        response: {
          success: 'boolean',
          data: {
            enabled: 'boolean',
            staking: 'boolean',
            errors: 'string',
            currentblocksize: 'number',
            currentblocktx: 'number',
            pooledtx: 'number',
            difficulty: 'number',
            searchInterval: 'number',
            weight: 'number',
            netstakeweight: 'number',
            expectedtime: 'number',
          },
        },
      },
      {
        path: '/latest-blocks',
        method: 'GET',
        description: 'Get latest blocks',
        parameters: [
          {
            name: 'limit',
            type: 'number',
            required: false,
            description: 'Number of blocks to return (default: 10)',
          },
        ],
        response: {
          success: 'boolean',
          data: 'array',
        },
      },
      {
        path: '/latest-transactions',
        method: 'GET',
        description: 'Get latest transactions',
        parameters: [
          {
            name: 'limit',
            type: 'number',
            required: false,
            description: 'Number of transactions to return (default: 10)',
          },
        ],
        response: {
          success: 'boolean',
          data: 'array',
        },
      },
      {
        path: '/transaction/[txid]',
        method: 'GET',
        description: 'Get transaction details',
        parameters: [
          {
            name: 'txid',
            type: 'string',
            required: true,
            description: 'Transaction ID',
          },
        ],
        response: {
          success: 'boolean',
          data: 'object',
        },
      },
      {
        path: '/address/[address]',
        method: 'GET',
        description: 'Get address information',
        parameters: [
          {
            name: 'address',
            type: 'string',
            required: true,
            description: 'Verus address',
          },
        ],
        response: {
          success: 'boolean',
          data: 'object',
        },
      },
      {
        path: '/address/[address]/transactions',
        method: 'GET',
        description: 'Get address transactions',
        parameters: [
          {
            name: 'address',
            type: 'string',
            required: true,
            description: 'Verus address',
          },
          {
            name: 'limit',
            type: 'number',
            required: false,
            description: 'Number of transactions to return',
          },
        ],
        response: {
          success: 'boolean',
          data: 'array',
        },
      },
      {
        path: '/address/[address]/utxos',
        method: 'GET',
        description: 'Get address UTXOs',
        parameters: [
          {
            name: 'address',
            type: 'string',
            required: true,
            description: 'Verus address',
          },
        ],
        response: {
          success: 'boolean',
          data: 'array',
        },
      },
      {
        path: '/verusid-lookup',
        method: 'GET',
        description: 'Lookup VerusID information',
        parameters: [
          {
            name: 'name',
            type: 'string',
            required: true,
            description: 'VerusID name',
          },
        ],
        response: {
          success: 'boolean',
          data: 'object',
        },
      },
    ],
    rateLimits: {
      api: '100 requests per minute',
      search: '20 requests per minute',
    },
    authentication: 'None required for public endpoints',
    examples: {
      getBlockchainInfo: {
        url: '/api/blockchain-info',
        method: 'GET',
        response: {
          success: true,
          data: {
            chain: 'VRSCTEST',
            blocks: 751143,
            difficulty: 179865628.6996763,
            bestBlockHash:
              '0000000156634dd6c5af9e02cd1085a6685fad3b9ba5da6cddeea6531fb359f3',
            verificationProgress: 1,
            connections: 8,
            networkActive: true,
            chainwork:
              '0000000000000000000000000000000000000000000000000005af529053e5a3',
            sizeOnDisk: 1234567890,
            commitments: 0,
            valuePools: [],
          },
        },
      },
    },
  };

  const response = NextResponse.json(apiDocs, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return addSecurityHeaders(response);
}
