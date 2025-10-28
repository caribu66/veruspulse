/**
 * Comprehensive tests for VerusValidator
 */

import { VerusValidator } from '@/lib/utils/verus-validator';

describe('VerusValidator', () => {
  describe('isValidRAddress', () => {
    test('validates correct R-addresses', () => {
      expect(
        VerusValidator.isValidRAddress('RAbcdefghijklmnopqrstuvwxyz123')
      ).toBe(true);
      expect(
        VerusValidator.isValidRAddress('R123456789012345678901234567890')
      ).toBe(true);
    });

    test('rejects invalid R-addresses', () => {
      expect(VerusValidator.isValidRAddress('')).toBe(false);
      expect(VerusValidator.isValidRAddress('R')).toBe(false);
      expect(VerusValidator.isValidRAddress('R123')).toBe(false);
      expect(
        VerusValidator.isValidRAddress('iAbcdefghijklmnopqrstuvwxyz123')
      ).toBe(false);
      expect(VerusValidator.isValidRAddress('R0')).toBe(false); // Contains 0
      expect(VerusValidator.isValidRAddress('RO')).toBe(false); // Contains O
    });

    test('rejects null and undefined', () => {
      expect(VerusValidator.isValidRAddress(null as any)).toBe(false);
      expect(VerusValidator.isValidRAddress(undefined as any)).toBe(false);
    });

    test('handles whitespace', () => {
      expect(
        VerusValidator.isValidRAddress(' RAbcdefghijklmnopqrstuvwxyz123 ')
      ).toBe(true);
    });
  });

  describe('isValidIAddress', () => {
    test('validates correct I-addresses', () => {
      expect(
        VerusValidator.isValidIAddress('iAbcdefghijklmnopqrstuvwxyz123')
      ).toBe(true);
      expect(
        VerusValidator.isValidIAddress('i123456789012345678901234567890')
      ).toBe(true);
    });

    test('rejects invalid I-addresses', () => {
      expect(VerusValidator.isValidIAddress('')).toBe(false);
      expect(VerusValidator.isValidIAddress('i')).toBe(false);
      expect(VerusValidator.isValidIAddress('i123')).toBe(false);
      expect(
        VerusValidator.isValidIAddress('RAbcdefghijklmnopqrstuvwxyz123')
      ).toBe(false);
    });
  });

  describe('isValidVerusID', () => {
    test('validates correct VerusIDs', () => {
      expect(VerusValidator.isValidVerusID('joanna@')).toBe(true);
      expect(VerusValidator.isValidVerusID('test.id@')).toBe(true);
      expect(VerusValidator.isValidVerusID('user123@')).toBe(true);
    });

    test('rejects invalid VerusIDs', () => {
      expect(VerusValidator.isValidVerusID('joanna')).toBe(false);
      expect(VerusValidator.isValidVerusID('@')).toBe(false);
      expect(VerusValidator.isValidVerusID('test!@')).toBe(false);
      expect(VerusValidator.isValidVerusID('test space@')).toBe(false);
      expect(VerusValidator.isValidVerusID('')).toBe(false);
    });
  });

  describe('isValidTxId', () => {
    test('validates correct transaction IDs', () => {
      expect(VerusValidator.isValidTxId('a'.repeat(64))).toBe(true);
      expect(VerusValidator.isValidTxId('f'.repeat(64))).toBe(true);
      expect(VerusValidator.isValidTxId('0123456789abcdef'.repeat(4))).toBe(
        true
      );
    });

    test('rejects invalid transaction IDs', () => {
      expect(VerusValidator.isValidTxId('a'.repeat(63))).toBe(false);
      expect(VerusValidator.isValidTxId('a'.repeat(65))).toBe(false);
      expect(VerusValidator.isValidTxId('g'.repeat(64))).toBe(false);
      expect(VerusValidator.isValidTxId('')).toBe(false);
    });
  });

  describe('isValidBlockHash', () => {
    test('validates correct block hashes', () => {
      expect(VerusValidator.isValidBlockHash('f'.repeat(64))).toBe(true);
      expect(
        VerusValidator.isValidBlockHash('0123456789abcdef'.repeat(4))
      ).toBe(true);
    });

    test('rejects invalid block hashes', () => {
      expect(VerusValidator.isValidBlockHash('f'.repeat(63))).toBe(false);
      expect(VerusValidator.isValidBlockHash('g'.repeat(64))).toBe(false);
      expect(VerusValidator.isValidBlockHash('')).toBe(false);
    });
  });

  describe('isValidBlockHeight', () => {
    test('validates correct block heights', () => {
      expect(VerusValidator.isValidBlockHeight('1')).toBe(true);
      expect(VerusValidator.isValidBlockHeight('123456')).toBe(true);
      expect(VerusValidator.isValidBlockHeight(123456)).toBe(true);
    });

    test('rejects invalid block heights', () => {
      expect(VerusValidator.isValidBlockHeight('0')).toBe(false);
      expect(VerusValidator.isValidBlockHeight('-1')).toBe(false);
      expect(VerusValidator.isValidBlockHeight('abc')).toBe(false);
      expect(VerusValidator.isValidBlockHeight('')).toBe(false);
      expect(VerusValidator.isValidBlockHeight(0)).toBe(false);
      expect(VerusValidator.isValidBlockHeight(-1)).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    test('removes dangerous characters', () => {
      expect(
        VerusValidator.sanitizeInput('<script>alert("xss")</script>')
      ).toBe('scriptalert("xss")/script');
      expect(VerusValidator.sanitizeInput('test&value')).toBe('testvalue');
      expect(VerusValidator.sanitizeInput('test"value')).toBe('testvalue');
    });

    test('trims whitespace', () => {
      expect(VerusValidator.sanitizeInput('  test  ')).toBe('test');
    });

    test('limits length', () => {
      const long = 'a'.repeat(1500);
      expect(VerusValidator.sanitizeInput(long).length).toBe(1000);
    });

    test('handles non-string input', () => {
      expect(VerusValidator.sanitizeInput(null as any)).toBe('');
      expect(VerusValidator.sanitizeInput(undefined as any)).toBe('');
    });
  });

  describe('detectInputType', () => {
    test('detects address types', () => {
      expect(
        VerusValidator.detectInputType('RAbcdefghijklmnopqrstuvwxyz123')
      ).toBe('address');
      expect(
        VerusValidator.detectInputType('iAbcdefghijklmnopqrstuvwxyz123')
      ).toBe('address');
    });

    test('detects VerusID type', () => {
      expect(VerusValidator.detectInputType('joanna@')).toBe('verusid');
    });

    test('detects transaction ID type', () => {
      expect(VerusValidator.detectInputType('a'.repeat(64))).toBe('txid');
    });

    test('detects block hash type', () => {
      expect(VerusValidator.detectInputType('f'.repeat(64))).toBe('blockhash');
    });

    test('detects block height type', () => {
      expect(VerusValidator.detectInputType('123456')).toBe('blockheight');
    });

    test('detects currency type', () => {
      expect(VerusValidator.detectInputType('VRSC')).toBe('currency');
    });

    test('returns unknown for invalid input', () => {
      expect(VerusValidator.detectInputType('invalid')).toBe('unknown');
    });
  });

  describe('validateApiParams', () => {
    test('validates correct parameters', () => {
      const result = VerusValidator.validateApiParams({
        address: 'RAbcdefghijklmnopqrstuvwxyz123',
        txid: 'a'.repeat(64),
        height: '123456',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects invalid parameters', () => {
      const result = VerusValidator.validateApiParams({
        address: 'invalid',
        txid: 'invalid',
        height: 'invalid',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('handles empty parameters', () => {
      const result = VerusValidator.validateApiParams({});
      expect(result.valid).toBe(true);
    });
  });
});
