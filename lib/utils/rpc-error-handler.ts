import { logger } from './logger';

// RPC Error Handler following Mike Toutonghi's best practices
export class RPCErrorHandler {
  // Common RPC error codes and their meanings
  private static readonly ERROR_CODES: Record<number, string> = {
    [-1]: 'Parse error',
    [-32600]: 'Invalid Request',
    [-32601]: 'Method not found',
    [-32602]: 'Invalid params',
    [-32603]: 'Internal error',
    [-32700]: 'Parse error',
  };

  // Handle RPC errors with proper logging and fallback strategies
  static handleRPCError(method: string, error: any, fallbackValue?: any): any {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorCode = error?.code || -1;

    logger.error(`❌ RPC Error: ${method}`, {
      error: errorMessage,
      code: errorCode,
      method,
    });

    // Handle specific error types
    switch (errorCode) {
      case -32601: // Method not found
        logger.warn(`🚫 RPC Method not found: ${method}`);
        return fallbackValue || null;

      case -32602: // Invalid params
        logger.warn(`🚫 Invalid parameters for ${method}: ${errorMessage}`);
        return fallbackValue || null;

      case -32603: // Internal error
        logger.error(`🚫 Internal RPC error for ${method}: ${errorMessage}`);
        return fallbackValue || null;

      default:
        // For other errors, try to provide meaningful fallback
        if (fallbackValue !== undefined) {
          logger.info(`🔄 Using fallback value for ${method}`);
          return fallbackValue;
        }

        throw error; // Re-throw if no fallback available
    }
  }

  // Validate RPC method parameters
  static validateRPCParams(method: string, params: any[]): boolean {
    try {
      // Check for common parameter issues
      if (params.some(param => param === '')) {
        logger.warn(`🚫 Empty parameter detected for ${method}`);
        return false;
      }

      // Method-specific validation
      switch (method) {
        case 'getcurrency':
          // getcurrency can be called without params or with a valid currency name
          if (params.length > 1) {
            logger.warn(`🚫 Too many parameters for ${method}`);
            return false;
          }
          if (params.length === 1 && typeof params[0] !== 'string') {
            logger.warn(`🚫 Invalid parameter type for ${method}`);
            return false;
          }
          break;

        case 'getidentity':
          if (params.length === 0 || typeof params[0] !== 'string') {
            logger.warn(`🚫 Invalid parameters for ${method}`);
            return false;
          }
          break;

        default:
          // For other methods, basic validation
          if (params.some(param => param === null || param === undefined)) {
            logger.warn(`🚫 Null/undefined parameter for ${method}`);
            return false;
          }
      }

      return true;
    } catch (error) {
      logger.error(`❌ Parameter validation failed for ${method}:`, error);
      return false;
    }
  }

  // Get user-friendly error message
  static getErrorMessage(method: string, error: any): string {
    const errorCode = error?.code || -1;
    const errorMessage = error?.message || 'Unknown error';

    switch (errorCode) {
      case -32601:
        return `Method '${method}' is not available on this Verus node`;
      case -32602:
        return `Invalid parameters for '${method}': ${errorMessage}`;
      case -32603:
        return `Internal error in '${method}': ${errorMessage}`;
      default:
        return `Error calling '${method}': ${errorMessage}`;
    }
  }

  // Create fallback response for common methods
  static createFallbackResponse(method: string): any {
    switch (method) {
      case 'getcurrency':
        return {
          name: 'VRSCTEST',
          fullyqualifiedname: 'VRSCTEST',
          version: 1,
          message: 'Using fallback currency info - RPC method not available',
        };

      case 'getidentity':
        return {
          name: 'unknown@',
          status: 'notfound',
          message: 'Identity not found - RPC method not available',
        };

      case 'getnotarizationdata':
        return {
          version: 1,
          message: 'Notarization data not available - RPC method not available',
        };

      default:
        return {
          error: `Method '${method}' not available`,
          message: 'RPC method not supported on this node',
        };
    }
  }
}
