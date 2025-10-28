/**
 * Comprehensive tests for ErrorSanitizer
 */

import { ErrorSanitizer, ErrorContext } from '@/lib/utils/error-sanitizer';

describe('ErrorSanitizer', () => {
  describe('sanitizeMessage', () => {
    test('removes sensitive patterns', () => {
      expect(ErrorSanitizer.sanitizeMessage('password: secret123')).toBe(
        '[REDACTED]: [REDACTED]'
      );
      expect(ErrorSanitizer.sanitizeMessage('API key: abc123')).toBe(
        '[REDACTED]: [REDACTED]'
      );
      expect(ErrorSanitizer.sanitizeMessage('token: bearer123')).toBe(
        '[REDACTED]: [REDACTED]'
      );
    });

    test('removes file paths', () => {
      expect(
        ErrorSanitizer.sanitizeMessage('Error in /home/user/file.js')
      ).toBe('Error in [PATH]');
    });

    test('removes IP addresses', () => {
      expect(
        ErrorSanitizer.sanitizeMessage('Connection to 192.168.1.1 failed')
      ).toBe('Connection to [IP] failed');
    });

    test('removes email addresses', () => {
      expect(
        ErrorSanitizer.sanitizeMessage('User admin@example.com not found')
      ).toBe('User [EMAIL] not found');
    });

    test('removes URLs', () => {
      expect(
        ErrorSanitizer.sanitizeMessage(
          'Failed to fetch https://api.example.com'
        )
      ).toBe('Failed to fetch [URL]');
    });

    test('truncates long messages', () => {
      const longMessage = 'a'.repeat(300);
      const result = ErrorSanitizer.sanitizeMessage(longMessage);
      expect(result.length).toBeLessThanOrEqual(200);
      expect(result.endsWith('...')).toBe(true);
    });

    test('handles non-string input', () => {
      expect(ErrorSanitizer.sanitizeMessage(null as any)).toBe(
        'An error occurred'
      );
      expect(ErrorSanitizer.sanitizeMessage(undefined as any)).toBe(
        'An error occurred'
      );
    });
  });

  describe('sanitizeStack', () => {
    test('removes sensitive patterns from stack', () => {
      const stack = 'Error: password error\n    at /home/user/file.js:10:5';
      const result = ErrorSanitizer.sanitizeStack(stack);
      expect(result).toContain('[REDACTED]');
      expect(result).toContain('[STACK]');
    });

    test('truncates long stack traces', () => {
      const longStack = 'Error\n' + '    at line1\n'.repeat(100);
      const result = ErrorSanitizer.sanitizeStack(longStack);
      expect(result.length).toBeLessThanOrEqual(500);
    });

    test('handles empty stack', () => {
      expect(ErrorSanitizer.sanitizeStack('')).toBe('');
      expect(ErrorSanitizer.sanitizeStack(null as any)).toBe('');
    });
  });

  describe('createSanitizedError', () => {
    test('creates sanitized error from Error object', () => {
      const error = new Error('password: secret123');
      const context: ErrorContext = {
        endpoint: '/api/test',
        method: 'GET',
        requestId: 'req123',
      };

      const result = ErrorSanitizer.createSanitizedError(error, context);

      expect(result.message).toBe('[REDACTED]: [REDACTED]');
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.requestId).toBe('req123');
      expect(result.sanitized).toBe(true);
      expect(result.timestamp).toBeDefined();
    });

    test('creates sanitized error from string', () => {
      const result = ErrorSanitizer.createSanitizedError('password: secret123');

      expect(result.message).toBe('[REDACTED]: [REDACTED]');
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.sanitized).toBe(true);
    });

    test('handles unknown error types', () => {
      const result = ErrorSanitizer.createSanitizedError({ some: 'object' });

      expect(result.message).toBe('An unexpected error occurred');
      expect(result.code).toBe('UNKNOWN_ERROR');
    });

    test('generates request ID when not provided', () => {
      const result = ErrorSanitizer.createSanitizedError('test error');
      expect(result.requestId).toBeDefined();
      expect(result.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
    });
  });

  describe('logError', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test('logs error with context', () => {
      const error = new Error('test error');
      const context: ErrorContext = {
        endpoint: '/api/test',
        method: 'GET',
        userId: 'user123',
        ipAddress: '192.168.1.1',
      };

      ErrorSanitizer.logError(error, context);

      expect(consoleSpy).toHaveBeenCalled();
    });

    test('logs error without context', () => {
      const error = new Error('test error');
      ErrorSanitizer.logError(error);

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('createApiErrorResponse', () => {
    test('creates proper API error response', () => {
      const error = new Error('password: secret123');
      const context: ErrorContext = {
        endpoint: '/api/test',
        method: 'GET',
      };

      const response = ErrorSanitizer.createApiErrorResponse(
        error,
        500,
        context
      );

      expect(response.status).toBe(500);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('X-Request-ID')).toBeDefined();
    });

    test('creates response with default status code', () => {
      const error = new Error('test error');
      const response = ErrorSanitizer.createApiErrorResponse(error);

      expect(response.status).toBe(500);
    });
  });

  describe('validateContext', () => {
    test('redacts sensitive context fields', () => {
      const context: ErrorContext = {
        userId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        endpoint: '/api/test',
        method: 'GET',
      };

      const result = ErrorSanitizer.validateContext(context);

      expect(result.userId).toBe('[REDACTED]');
      expect(result.ipAddress).toBe('[REDACTED]');
      expect(result.userAgent).toBe('Mozilla/5.0');
      expect(result.endpoint).toBe('/api/test');
      expect(result.method).toBe('GET');
    });
  });
});
