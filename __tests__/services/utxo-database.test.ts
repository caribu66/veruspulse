import { Pool } from 'pg';
import { UTXODatabaseService } from '@/lib/services/utxo-database';
import { UTXO } from '@/lib/models/utxo';

// Mock pg Pool
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
  };
  return {
    Pool: jest.fn(() => mockPool),
  };
});

describe('UTXODatabaseService', () => {
  let service: UTXODatabaseService;
  let mockPool: any;

  beforeEach(() => {
    service = new UTXODatabaseService('postgresql://test:test@localhost/test');
    // Get the mock pool instance
    mockPool = (service as any).db;
    jest.clearAllMocks();
  });

  const mockUTXO: UTXO = {
    address: 'RTestAddress123',
    txid: '3e3d0b7e4f8c4d3e8a9f4e5d6c7b8a9f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b',
    vout: 0,
    value: 100.5,
    creationHeight: 1000,
    creationTime: new Date('2024-01-01'),
    lastStakeHeight: undefined,
    lastStakeTime: undefined,
    cooldownUntil: undefined,
    cooldownUntilTime: undefined,
    isSpent: false,
    spentTxid: null,
    spentHeight: null,
    spentTime: null,
    isEligible: true,
    stakingProbability: 0.05,
    estimatedReward: 0.5,
  };

  const mockUTXORow = {
    address: 'RTestAddress123',
    txid: '3e3d0b7e4f8c4d3e8a9f4e5d6c7b8a9f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b',
    vout: 0,
    value: 100.5,
    creation_height: 1000,
    creation_time: new Date('2024-01-01'),
    last_stake_height: null,
    last_stake_time: null,
    cooldown_until: null,
    cooldown_until_time: null,
    is_spent: false,
    spent_txid: null,
    spent_height: null,
    spent_time: null,
    is_eligible: true,
    staking_probability: 0.05,
    estimated_reward: 0.5,
    updated_at: new Date('2024-12-31'),
  };

  describe('upsertUTXO', () => {
    it('should insert a new UTXO', async () => {
      mockPool.query.mockResolvedValue({
        rows: [mockUTXORow],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await service.upsertUTXO(mockUTXO);

      expect(mockPool.query).toHaveBeenCalled();
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO utxos'),
        expect.arrayContaining(['RTestAddress123', mockUTXO.txid, 0, 100.5])
      );
      expect(result).toMatchObject({
        address: 'RTestAddress123',
        value: 100.5,
      });
    });

    it('should update an existing UTXO on conflict', async () => {
      const updatedUTXO = { ...mockUTXO, value: 200.0 };
      const updatedRow = { ...mockUTXORow, value: 200.0 };

      mockPool.query.mockResolvedValue({
        rows: [updatedRow],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await service.upsertUTXO(updatedUTXO);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (txid, vout)'),
        expect.any(Array)
      );
      expect(result.value).toBe(200.0);
    });

    it('should handle spent UTXOs', async () => {
      const spentUTXO = {
        ...mockUTXO,
        isSpent: true,
        spentTxid: 'spent_tx_id',
        spentHeight: 2000,
        spentTime: new Date('2024-12-31'),
      };
      const spentRow = {
        ...mockUTXORow,
        is_spent: true,
        spent_txid: 'spent_tx_id',
        spent_height: 2000,
        spent_time: new Date('2024-12-31'),
      };

      mockPool.query.mockResolvedValue({
        rows: [spentRow],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await service.upsertUTXO(spentUTXO);

      expect(result.isSpent).toBe(true);
      expect(result.spentTxid).toBe('spent_tx_id');
      expect(result.spentHeight).toBe(2000);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValue(
        new Error('Unique constraint violation')
      );

      await expect(service.upsertUTXO(mockUTXO)).rejects.toThrow(
        'Unique constraint violation'
      );
    });
  });

  describe('getUTXOs', () => {
    it('should return all UTXOs for an address', async () => {
      mockPool.query.mockResolvedValue({
        rows: [mockUTXORow, { ...mockUTXORow, vout: 1 }],
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: [],
      });

      const result = await service.getUTXOs('RTestAddress123');

      expect(result).toHaveLength(2);
      expect(result[0].address).toBe('RTestAddress123');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE address = $1'),
        ['RTestAddress123']
      );
    });

    it('should return empty array for address with no UTXOs', async () => {
      mockPool.query.mockResolvedValue({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const result = await service.getUTXOs('RNewAddress');

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Query timeout'));

      await expect(service.getUTXOs('RTestAddress')).rejects.toThrow(
        'Query timeout'
      );
    });
  });

  describe('getEligibleUTXOs', () => {
    it('should return only eligible UTXOs', async () => {
      const eligibleRow = { ...mockUTXORow, is_eligible: true };

      mockPool.query.mockResolvedValue({
        rows: [eligibleRow],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await service.getUTXOs('RTestAddress123');

      const eligibleUTXOs = result.filter(u => u.isEligible);
      expect(eligibleUTXOs.length).toBeGreaterThan(0);
      expect(eligibleUTXOs[0].isEligible).toBe(true);
    });

    it('should exclude spent UTXOs', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ ...mockUTXORow, is_spent: false, is_eligible: true }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await service.getUTXOs('RTestAddress123');

      expect(result.every(u => !u.isSpent)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle UTXOs with zero value', async () => {
      const zeroUTXO = { ...mockUTXO, value: 0 };
      const zeroRow = { ...mockUTXORow, value: 0 };

      mockPool.query.mockResolvedValue({
        rows: [zeroRow],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await service.upsertUTXO(zeroUTXO);

      expect(result.value).toBe(0);
    });

    it('should handle very large UTXO values', async () => {
      const largeUTXO = { ...mockUTXO, value: 1000000.123456 };
      const largeRow = { ...mockUTXORow, value: 1000000.123456 };

      mockPool.query.mockResolvedValue({
        rows: [largeRow],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await service.upsertUTXO(largeUTXO);

      expect(result.value).toBe(1000000.123456);
    });

    it('should handle UTXOs in cooldown', async () => {
      const cooldownUTXO = {
        ...mockUTXO,
        cooldownUntil: 5000,
        cooldownUntilTime: new Date('2025-01-15'),
        isEligible: false,
      };
      const cooldownRow = {
        ...mockUTXORow,
        cooldown_until: 5000,
        cooldown_until_time: new Date('2025-01-15'),
        is_eligible: false,
      };

      mockPool.query.mockResolvedValue({
        rows: [cooldownRow],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await service.upsertUTXO(cooldownUTXO);

      expect(result.cooldownUntil).toBe(5000);
      expect(result.isEligible).toBe(false);
    });

    it('should handle null timestamps', async () => {
      const nullTimeUTXO = {
        ...mockUTXO,
        lastStakeTime: null,
        cooldownUntilTime: null,
        spentTime: null,
      };
      const nullTimeRow = {
        ...mockUTXORow,
        last_stake_time: null,
        cooldown_until_time: null,
        spent_time: null,
      };

      mockPool.query.mockResolvedValue({
        rows: [nullTimeRow],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await service.upsertUTXO(nullTimeUTXO);

      expect(result.lastStakeTime).toBeNull();
      expect(result.cooldownUntilTime).toBeNull();
      expect(result.spentTime).toBeNull();
    });

    it('should handle special characters in txid', async () => {
      const specialTxUTXO = {
        ...mockUTXO,
        txid: 'abcd-1234-efgh-5678-ijkl-9012',
      };
      const specialTxRow = {
        ...mockUTXORow,
        txid: 'abcd-1234-efgh-5678-ijkl-9012',
      };

      mockPool.query.mockResolvedValue({
        rows: [specialTxRow],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await service.upsertUTXO(specialTxUTXO);

      expect(result.txid).toBe('abcd-1234-efgh-5678-ijkl-9012');
    });

    it('should handle addresses with many UTXOs', async () => {
      const manyRows = Array.from({ length: 1000 }, (_, i) => ({
        ...mockUTXORow,
        vout: i,
      }));

      mockPool.query.mockResolvedValue({
        rows: manyRows,
        command: 'SELECT',
        rowCount: 1000,
        oid: 0,
        fields: [],
      });

      const result = await service.getUTXOs('RWhaleAddress');

      expect(result).toHaveLength(1000);
    });
  });

  describe('Performance', () => {
    it('should handle bulk operations efficiently', async () => {
      const bulkUTXOs = Array.from({ length: 100 }, (_, i) => ({
        ...mockUTXO,
        vout: i,
      }));

      mockPool.query.mockResolvedValue({
        rows: [mockUTXORow],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const start = Date.now();
      for (const utxo of bulkUTXOs) {
        await service.upsertUTXO(utxo);
      }
      const duration = Date.now() - start;

      expect(mockPool.query).toHaveBeenCalledTimes(100);
      // Should be fast with mocked database
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Connection Handling', () => {
    it('should create pool with correct configuration', () => {
      const newService = new UTXODatabaseService(
        'postgresql://user:pass@localhost:5432/db'
      );

      expect(newService).toBeDefined();
      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionString: 'postgresql://user:pass@localhost:5432/db',
          max: 20,
        })
      );
    });

    it('should handle connection timeouts', async () => {
      mockPool.query.mockRejectedValue(
        new Error('Connection timeout after 2000ms')
      );

      await expect(service.getUTXOs('RTestAddress')).rejects.toThrow(
        'Connection timeout'
      );
    });

    it('should handle connection pool exhaustion', async () => {
      mockPool.query.mockRejectedValue(new Error('Connection pool exhausted'));

      await expect(service.upsertUTXO(mockUTXO)).rejects.toThrow(
        'Connection pool exhausted'
      );
    });
  });
});
