import { logger } from './logger';

// Security utilities following Mike Toutonghi's security-first approach
export class SecurityUtils {
  // Rate limiting configuration
  static readonly RATE_LIMITS = {
    API_CALLS: 100, // per minute
    SEARCH_REQUESTS: 30, // per minute
    BLOCK_REQUESTS: 60, // per minute
  };

  // Input sanitization
  static sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') return '';

    return input
      .trim()
      .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
      .substring(0, 1000); // Limit length
  }

  // Validate RPC parameters
  static validateRPCParams(method: string, params: any[]): boolean {
    try {
      // Check for dangerous methods
      const dangerousMethods = ['stop', 'restart', 'shutdown'];
      if (dangerousMethods.includes(method.toLowerCase())) {
        logger.warn(`🚫 Blocked dangerous RPC method: ${method}`);
        return false;
      }

      // Validate parameter types
      for (const param of params) {
        if (typeof param === 'object' && param !== null) {
          const paramStr = JSON.stringify(param);
          if (paramStr.length > 10000) {
            // Limit parameter size
            logger.warn(`🚫 Parameter too large: ${paramStr.length} bytes`);
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      logger.error('❌ RPC parameter validation failed:', error);
      return false;
    }
  }

  // Generate secure headers
  static getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    };
  }

  // Validate blockchain data integrity
  static validateBlockchainData(data: any): boolean {
    try {
      if (!data || typeof data !== 'object') return false;

      // Check for required fields in common blockchain objects
      if (data.hash && typeof data.hash !== 'string') return false;
      if (data.height && typeof data.height !== 'number') return false;
      if (data.time && typeof data.time !== 'number') return false;

      return true;
    } catch (error) {
      logger.error('❌ Blockchain data validation failed:', error);
      return false;
    }
  }
}
