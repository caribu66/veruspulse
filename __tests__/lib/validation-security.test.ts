/**
 * Security and edge case tests for validation utilities
 */

import {
  isValidVerusAddress,
  isValidVerusIDName,
  isValidTxId,
  isValidBlockHash,
  sanitizeInput,
  RateLimiter,
  ValidationError,
} from '@/lib/utils/validation';

describe('Validation Security Tests', () => {
  describe('isValidVerusAddress', () => {
    test('validates R-addresses', () => {
      expect(isValidVerusAddress('RAbcdefghijklmnopqrstuvwxyz123')).toBe(true);
    });

    test('validates I-addresses', () => {
      expect(isValidVerusAddress('iCSq1EkTest123456789012345678')).toBe(true);
    });

    test('validates VerusID names with @', () => {
      expect(isValidVerusAddress('joanna@')).toBe(true);
      expect(isValidVerusAddress('test.id@')).toBe(true);
    });

    test('rejects null and undefined', () => {
      expect(isValidVerusAddress(null as any)).toBe(false);
      expect(isValidVerusAddress(undefined as any)).toBe(false);
    });

    test('rejects empty string', () => {
      expect(isValidVerusAddress('')).toBe(false);
    });

    test('rejects SQL injection attempts', () => {
      expect(isValidVerusAddress("R'; DROP TABLE users;--")).toBe(false);
      expect(isValidVerusAddress("i' OR '1'='1")).toBe(false);
    });

    test('rejects XSS attempts', () => {
      expect(isValidVerusAddress('<script>alert("xss")</script>')).toBe(false);
      expect(isValidVerusAddress('R<img src=x onerror=alert(1)>')).toBe(false);
    });

    test('rejects path traversal', () => {
      expect(isValidVerusAddress('../../../etc/passwd')).toBe(false);
    });
  });

  describe('isValidVerusIDName', () => {
    test('validates correct names', () => {
      expect(isValidVerusIDName('joanna@')).toBe(true);
      expect(isValidVerusIDName('test.id@')).toBe(true);
    });

    test('rejects names without @', () => {
      expect(isValidVerusIDName('joanna')).toBe(false);
    });

    test('rejects invalid characters', () => {
      expect(isValidVerusIDName('test!@')).toBe(false);
      expect(isValidVerusIDName('test space@')).toBe(false);
    });
  });

  describe('isValidTxId', () => {
    test('validates 64-char hex', () => {
      expect(isValidTxId('a'.repeat(64))).toBe(true);
    });

    test('rejects wrong length', () => {
      expect(isValidTxId('a'.repeat(63))).toBe(false);
      expect(isValidTxId('a'.repeat(65))).toBe(false);
    });

    test('rejects non-hex', () => {
      expect(isValidTxId('g'.repeat(64))).toBe(false);
    });
  });

  describe('isValidBlockHash', () => {
    test('validates 64-char hex', () => {
      expect(isValidBlockHash('f'.repeat(64))).toBe(true);
    });

    test('rejects wrong length', () => {
      expect(isValidBlockHash('f'.repeat(63))).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    test('trims whitespace', () => {
      expect(sanitizeInput('  test  ')).toBe('test');
    });

    test('removes < and >', () => {
      expect(sanitizeInput('<test>')).toBe('test');
    });

    test('limits length to 1000', () => {
      const long = 'a'.repeat(1500);
      expect(sanitizeInput(long).length).toBe(1000);
    });

    test('handles non-string input', () => {
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
    });

    test('prevents XSS', () => {
      const xss = '<script>alert("xss")</script>';
      const sanitized = sanitizeInput(xss);
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
    });
  });

  describe('RateLimiter', () => {
    test('allows requests within limit', () => {
      const limiter = new RateLimiter(60000, 10);
      for (let i = 0; i < 10; i++) {
        expect(limiter.isAllowed('user1')).toBe(true);
      }
    });

    test('blocks requests exceeding limit', () => {
      const limiter = new RateLimiter(60000, 5);
      for (let i = 0; i < 5; i++) {
        limiter.isAllowed('user1');
      }
      expect(limiter.isAllowed('user1')).toBe(false);
    });

    test('tracks different keys separately', () => {
      const limiter = new RateLimiter(60000, 3);
      limiter.isAllowed('user1');
      limiter.isAllowed('user1');
      limiter.isAllowed('user1');
      expect(limiter.isAllowed('user1')).toBe(false);
      expect(limiter.isAllowed('user2')).toBe(true);
    });
  });

  describe('ValidationError', () => {
    test('creates error with message and field', () => {
      const error = new ValidationError('Invalid email', 'email');
      expect(error.message).toBe('Invalid email');
      expect(error.field).toBe('email');
      expect(error.name).toBe('ValidationError');
    });

    test('is instance of Error', () => {
      const error = new ValidationError('Test');
      expect(error instanceof Error).toBe(true);
    });
  });
});
