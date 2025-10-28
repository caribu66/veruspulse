import {
  isValidVerusAddress,
  isValidTxId,
  isValidBlockHash,
  isValidVerusId,
  validateApiResponse,
  RateLimiter,
  sanitizeInput,
  handleApiError,
} from '@/lib/utils/validation';

describe('Validation Utilities', () => {
  describe('isValidVerusAddress', () => {
    it('should validate legacy addresses', () => {
      expect(isValidVerusAddress('RTest123456789012345678901234567890')).toBe(
        true
      );
      expect(isValidVerusAddress('RTest123456789012345678901234567890')).toBe(
        true
      );
    });

    it('should validate identity addresses', () => {
      expect(isValidVerusAddress('iTest123456789012345678901234567890')).toBe(
        true
      );
    });

    it('should validate sapling addresses', () => {
      expect(isValidVerusAddress('zTest123456789012345678901234567890')).toBe(
        true
      );
    });

    it('should reject invalid addresses', () => {
      expect(isValidVerusAddress('')).toBe(false);
      expect(isValidVerusAddress('invalid')).toBe(false);
      expect(isValidVerusAddress('123')).toBe(false);
      expect(isValidVerusAddress(null as any)).toBe(false);
      expect(isValidVerusAddress(undefined as any)).toBe(false);
    });
  });

  describe('isValidTxId', () => {
    it('should validate transaction IDs', () => {
      expect(
        isValidTxId(
          'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456'
        )
      ).toBe(true);
    });

    it('should reject invalid transaction IDs', () => {
      expect(isValidTxId('')).toBe(false);
      expect(isValidTxId('invalid')).toBe(false);
      expect(isValidTxId('123')).toBe(false);
      expect(
        isValidTxId(
          'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345'
        )
      ).toBe(false); // Too short
    });
  });

  describe('isValidBlockHash', () => {
    it('should validate block hashes', () => {
      expect(
        isValidBlockHash(
          'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456'
        )
      ).toBe(true);
    });

    it('should reject invalid block hashes', () => {
      expect(isValidBlockHash('')).toBe(false);
      expect(isValidBlockHash('invalid')).toBe(false);
      expect(isValidBlockHash('123')).toBe(false);
    });
  });

  describe('isValidVerusId', () => {
    it('should validate VerusIDs', () => {
      expect(isValidVerusId('test@')).toBe(true);
      expect(isValidVerusId('test.user@')).toBe(true);
      expect(isValidVerusId('test-user@')).toBe(true);
      expect(isValidVerusId('test_user@')).toBe(true);
    });

    it('should reject invalid VerusIDs', () => {
      expect(isValidVerusId('')).toBe(false);
      expect(isValidVerusId('test')).toBe(false);
      expect(isValidVerusId('test@domain')).toBe(false);
      expect(isValidVerusId('test@domain.com')).toBe(false);
    });
  });

  describe('validateApiResponse', () => {
    it('should validate successful responses', () => {
      const response = { data: { test: 'value' } };
      const result = validateApiResponse(response);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ test: 'value' });
    });

    it('should handle error responses', () => {
      const response = { error: 'Something went wrong' };
      const result = validateApiResponse(response);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Something went wrong');
    });

    it('should handle null responses', () => {
      const result = validateApiResponse(null);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No response received');
    });
  });

  describe('RateLimiter', () => {
    it('should allow requests within limit', () => {
      const limiter = new RateLimiter(1000, 5); // 5 requests per second

      expect(limiter.isAllowed('test')).toBe(true);
      expect(limiter.isAllowed('test')).toBe(true);
      expect(limiter.isAllowed('test')).toBe(true);
      expect(limiter.isAllowed('test')).toBe(true);
      expect(limiter.isAllowed('test')).toBe(true);
    });

    it('should block requests over limit', () => {
      const limiter = new RateLimiter(1000, 2); // 2 requests per second

      expect(limiter.isAllowed('test')).toBe(true);
      expect(limiter.isAllowed('test')).toBe(true);
      expect(limiter.isAllowed('test')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize input strings', () => {
      expect(sanitizeInput('  test  ')).toBe('test');
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe(
        'scriptalert(&quot;xss&quot;)/script'
      );
      expect(sanitizeInput('a'.repeat(2000))).toHaveLength(1000);
    });

    it('should handle non-string inputs', () => {
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
      expect(sanitizeInput(123 as any)).toBe('');
    });
  });

  describe('handleApiError', () => {
    it('should handle ValidationError', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';

      expect(handleApiError(error)).toBe('Error: Validation failed');
    });

    it('should handle API errors', () => {
      const error = {
        response: {
          status: 404,
          statusText: 'Not Found',
        },
      };

      expect(handleApiError(error)).toBe('API error: 404 Not Found');
    });

    it('should handle generic errors', () => {
      const error = new Error('Something went wrong');

      expect(handleApiError(error)).toBe('Error: Something went wrong');
    });

    it('should handle unknown errors', () => {
      expect(handleApiError({})).toBe('An unexpected error occurred');
    });
  });
});
