/**
 * Enhanced Input Validation for Verus Blockchain
 * Provides strict validation patterns for Verus addresses, IDs, and blockchain data
 */

export class VerusValidator {
  // Verus-specific validation patterns
  private static readonly PATTERNS = {
    // R-address: Base58 encoded, starts with R, 26-35 characters
    R_ADDRESS: /^R[1-9A-HJ-NP-Za-km-z]{25,34}$/,

    // I-address: Base58 encoded, starts with i, 26-35 characters
    I_ADDRESS: /^i[1-9A-HJ-NP-Za-km-z]{25,34}$/,

    // VerusID: Alphanumeric with dots, ends with @
    VERUS_ID: /^[a-zA-Z0-9][a-zA-Z0-9.]*[a-zA-Z0-9]@$/,

    // Transaction ID: 64 hex characters
    TX_ID: /^[a-fA-F0-9]{64}$/,

    // Block hash: 64 hex characters
    BLOCK_HASH: /^[a-fA-F0-9]{64}$/,

    // Block height: positive integer
    BLOCK_HEIGHT: /^[1-9][0-9]*$/,

    // Currency ID: Alphanumeric with dots and hyphens
    CURRENCY_ID: /^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$/,

    // Safe string: alphanumeric, dots, hyphens, underscores only
    SAFE_STRING: /^[a-zA-Z0-9._-]+$/,
  };

  /**
   * Validate Verus R-address
   */
  static isValidRAddress(address: string): boolean {
    if (!address || typeof address !== 'string') return false;
    return this.PATTERNS.R_ADDRESS.test(address.trim());
  }

  /**
   * Validate Verus I-address
   */
  static isValidIAddress(address: string): boolean {
    if (!address || typeof address !== 'string') return false;
    return this.PATTERNS.I_ADDRESS.test(address.trim());
  }

  /**
   * Validate any Verus address (R or I)
   */
  static isValidVerusAddress(address: string): boolean {
    return this.isValidRAddress(address) || this.isValidIAddress(address);
  }

  /**
   * Validate VerusID name
   */
  static isValidVerusID(identity: string): boolean {
    if (!identity || typeof identity !== 'string') return false;
    const trimmed = identity.trim();

    // Must end with @
    if (!trimmed.endsWith('@')) return false;

    // Check pattern
    return this.PATTERNS.VERUS_ID.test(trimmed);
  }

  /**
   * Validate transaction ID
   */
  static isValidTxId(txid: string): boolean {
    if (!txid || typeof txid !== 'string') return false;
    return this.PATTERNS.TX_ID.test(txid.trim());
  }

  /**
   * Validate block hash
   */
  static isValidBlockHash(hash: string): boolean {
    if (!hash || typeof hash !== 'string') return false;
    return this.PATTERNS.BLOCK_HASH.test(hash.trim());
  }

  /**
   * Validate block height
   */
  static isValidBlockHeight(height: string | number): boolean {
    if (typeof height === 'number') {
      return Number.isInteger(height) && height > 0;
    }
    if (!height || typeof height !== 'string') return false;
    return this.PATTERNS.BLOCK_HEIGHT.test(height.trim());
  }

  /**
   * Validate currency ID
   */
  static isValidCurrencyId(currencyId: string): boolean {
    if (!currencyId || typeof currencyId !== 'string') return false;
    const trimmed = currencyId.trim();

    // Must be 1-64 characters
    if (trimmed.length < 1 || trimmed.length > 64) return false;

    return this.PATTERNS.CURRENCY_ID.test(trimmed);
  }

  /**
   * Sanitize input string
   */
  static sanitizeInput(input: string, maxLength: number = 1000): string {
    if (!input || typeof input !== 'string') return '';

    return input
      .trim()
      .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
      .substring(0, maxLength);
  }

  /**
   * Validate search query
   */
  static isValidSearchQuery(query: string): boolean {
    if (!query || typeof query !== 'string') return false;

    const trimmed = query.trim();

    // Must be 1-100 characters
    if (trimmed.length < 1 || trimmed.length > 100) return false;

    // Check if it matches any valid pattern
    return (
      this.isValidVerusAddress(trimmed) ||
      this.isValidVerusID(trimmed) ||
      this.isValidTxId(trimmed) ||
      this.isValidBlockHash(trimmed) ||
      this.isValidBlockHeight(trimmed) ||
      this.isValidCurrencyId(trimmed) ||
      this.PATTERNS.SAFE_STRING.test(trimmed)
    );
  }

  /**
   * Detect input type
   */
  static detectInputType(
    input: string
  ):
    | 'address'
    | 'verusid'
    | 'txid'
    | 'blockhash'
    | 'blockheight'
    | 'currency'
    | 'unknown' {
    if (!input || typeof input !== 'string') return 'unknown';

    const trimmed = input.trim();

    if (this.isValidVerusAddress(trimmed)) return 'address';
    if (this.isValidVerusID(trimmed)) return 'verusid';
    if (this.isValidTxId(trimmed)) return 'txid';
    if (this.isValidBlockHash(trimmed)) return 'blockhash';
    if (this.isValidBlockHeight(trimmed)) return 'blockheight';
    if (this.isValidCurrencyId(trimmed)) return 'currency';

    return 'unknown';
  }

  /**
   * Validate API parameters
   */
  static validateApiParams(params: Record<string, any>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined) continue;

      switch (key.toLowerCase()) {
        case 'address':
          if (!this.isValidVerusAddress(value)) {
            errors.push(`Invalid address format: ${value}`);
          }
          break;

        case 'identity':
        case 'verusid':
          if (!this.isValidVerusID(value)) {
            errors.push(`Invalid VerusID format: ${value}`);
          }
          break;

        case 'txid':
        case 'tx':
          if (!this.isValidTxId(value)) {
            errors.push(`Invalid transaction ID format: ${value}`);
          }
          break;

        case 'hash':
        case 'blockhash':
          if (!this.isValidBlockHash(value)) {
            errors.push(`Invalid block hash format: ${value}`);
          }
          break;

        case 'height':
        case 'blockheight':
          if (!this.isValidBlockHeight(value)) {
            errors.push(`Invalid block height format: ${value}`);
          }
          break;

        case 'currency':
        case 'currencyid':
          if (!this.isValidCurrencyId(value)) {
            errors.push(`Invalid currency ID format: ${value}`);
          }
          break;

        default:
          // For unknown parameters, use safe string validation
          if (
            typeof value === 'string' &&
            !this.PATTERNS.SAFE_STRING.test(value)
          ) {
            errors.push(`Invalid parameter format for ${key}: ${value}`);
          }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export individual validation functions for backward compatibility
export const {
  isValidVerusAddress,
  isValidVerusID,
  isValidTxId,
  isValidBlockHash,
  isValidBlockHeight,
  isValidCurrencyId,
  sanitizeInput,
  isValidSearchQuery,
  detectInputType,
  validateApiParams,
} = VerusValidator;
