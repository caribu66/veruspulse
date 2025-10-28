/**
 * Error Sanitization and Logging Utilities
 * Prevents sensitive information leakage in error responses
 */

import { logger } from './logger';

export interface SanitizedError {
  message: string;
  code?: string;
  timestamp: string;
  requestId?: string;
  sanitized: boolean;
}

export interface ErrorContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
}

export class ErrorSanitizer {
  // Patterns that might contain sensitive information
  private static readonly SENSITIVE_PATTERNS = [
    /password/i,
    /secret/i,
    /key/i,
    /token/i,
    /auth/i,
    /credential/i,
    /private/i,
    /api[_-]?key/i,
    /access[_-]?token/i,
    /refresh[_-]?token/i,
    /session[_-]?id/i,
    /cookie/i,
    /authorization/i,
    /bearer/i,
    /basic/i,
    /rpc[_-]?user/i,
    /rpc[_-]?password/i,
    /verus[_-]?rpc[_-]?user/i,
    /verus[_-]?rpc[_-]?password/i,
  ];

  // Stack trace patterns to remove
  private static readonly STACK_PATTERNS = [
    /\/home\/[^\/]+\/[^\/]+\/[^\/]+/g, // Remove home directory paths
    /\/Users\/[^\/]+\/[^\/]+\/[^\/]+/g, // Remove user directory paths
    /\/var\/www\/[^\/]+\/[^\/]+/g, // Remove web server paths
    /node_modules\/[^\/]+/g, // Remove node_modules paths
    /at\s+[^(]+\([^)]+\)/g, // Remove file paths from stack traces
  ];

  /**
   * Sanitize error message
   */
  static sanitizeMessage(message: string): string {
    if (!message || typeof message !== 'string') {
      return 'An error occurred';
    }

    let sanitized = message;

    // Remove sensitive patterns
    this.SENSITIVE_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });

    // Remove file paths
    sanitized = sanitized.replace(/\/[^\s]+/g, '[PATH]');

    // Remove IP addresses
    sanitized = sanitized.replace(
      /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
      '[IP]'
    );

    // Remove email addresses
    sanitized = sanitized.replace(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      '[EMAIL]'
    );

    // Remove URLs
    sanitized = sanitized.replace(/https?:\/\/[^\s]+/g, '[URL]');

    // Truncate if too long
    if (sanitized.length > 200) {
      sanitized = sanitized.substring(0, 197) + '...';
    }

    return sanitized;
  }

  /**
   * Sanitize stack trace
   */
  static sanitizeStack(stack: string): string {
    if (!stack || typeof stack !== 'string') {
      return '';
    }

    let sanitized = stack;

    // Remove sensitive patterns
    this.SENSITIVE_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });

    // Remove file paths and stack trace details
    this.STACK_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[STACK]');
    });

    // Truncate if too long
    if (sanitized.length > 500) {
      sanitized = sanitized.substring(0, 497) + '...';
    }

    return sanitized;
  }

  /**
   * Create sanitized error response
   */
  static createSanitizedError(
    error: Error | unknown,
    context?: ErrorContext
  ): SanitizedError {
    const timestamp = new Date().toISOString();
    const requestId = context?.requestId || this.generateRequestId();

    let message = 'An unexpected error occurred';
    let code = 'UNKNOWN_ERROR';

    if (error instanceof Error) {
      message = this.sanitizeMessage(error.message);
      code = this.getErrorCode(error);
    } else if (typeof error === 'string') {
      message = this.sanitizeMessage(error);
    }

    return {
      message,
      code,
      timestamp,
      requestId,
      sanitized: true,
    };
  }

  /**
   * Get error code from error
   */
  private static getErrorCode(error: Error): string {
    // Common error codes
    if (error.name === 'ValidationError') return 'VALIDATION_ERROR';
    if (error.name === 'AuthenticationError') return 'AUTH_ERROR';
    if (error.name === 'AuthorizationError') return 'AUTHZ_ERROR';
    if (error.name === 'NotFoundError') return 'NOT_FOUND';
    if (error.name === 'RateLimitError') return 'RATE_LIMIT';
    if (error.name === 'CircuitBreakerError') return 'CIRCUIT_BREAKER';
    if (error.name === 'TimeoutError') return 'TIMEOUT';
    if (error.name === 'NetworkError') return 'NETWORK_ERROR';
    if (error.name === 'DatabaseError') return 'DATABASE_ERROR';

    return 'UNKNOWN_ERROR';
  }

  /**
   * Generate request ID
   */
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log error with context (for internal logging)
   */
  static logError(
    error: Error | unknown,
    context?: ErrorContext,
    level: 'error' | 'warn' | 'info' = 'error'
  ): void {
    const requestId = context?.requestId || this.generateRequestId();

    const logData = {
      requestId,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error,
      context: {
        userId: context?.userId ? '[REDACTED]' : undefined,
        ipAddress: context?.ipAddress ? '[REDACTED]' : undefined,
        userAgent: context?.userAgent,
        endpoint: context?.endpoint,
        method: context?.method,
      },
      timestamp: new Date().toISOString(),
    };

    switch (level) {
      case 'error':
        logger.error('Application Error', logData);
        break;
      case 'warn':
        logger.warn('Application Warning', logData);
        break;
      case 'info':
        logger.info('Application Info', logData);
        break;
    }
  }

  /**
   * Create API error response
   */
  static createApiErrorResponse(
    error: Error | unknown,
    statusCode: number = 500,
    context?: ErrorContext
  ): Response {
    const sanitizedError = this.createSanitizedError(error, context);

    // Log the full error internally
    this.logError(error, context);

    return new Response(
      JSON.stringify({
        success: false,
        error: sanitizedError.message,
        code: sanitizedError.code,
        requestId: sanitizedError.requestId,
        timestamp: sanitizedError.timestamp,
      }),
      {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': sanitizedError.requestId || '',
        },
      }
    );
  }

  /**
   * Validate error context
   */
  static validateContext(context: ErrorContext): ErrorContext {
    return {
      userId: context.userId ? '[REDACTED]' : undefined,
      ipAddress: context.ipAddress ? '[REDACTED]' : undefined,
      userAgent: context.userAgent,
      requestId: context.requestId,
      endpoint: context.endpoint,
      method: context.method,
    };
  }
}

/**
 * Error boundary for React components
 */
export class ReactErrorBoundary {
  static createErrorResponse(error: Error, errorInfo?: any): SanitizedError {
    return ErrorSanitizer.createSanitizedError(error, {
      endpoint: 'react-component',
      method: 'render',
    });
  }
}

/**
 * Middleware for error handling
 */
export function errorHandlerMiddleware(
  error: Error | unknown,
  context?: ErrorContext
) {
  // Log the error
  ErrorSanitizer.logError(error, context);

  // Return sanitized response
  return ErrorSanitizer.createApiErrorResponse(error, 500, context);
}
