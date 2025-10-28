import { randomUUID } from 'crypto';

/**
 * Nonce provider for Content Security Policy
 * Generates cryptographically secure nonces for script and style tags
 */
export class NonceProvider {
  private static instance: NonceProvider;
  private nonce: string;

  private constructor() {
    this.nonce = randomUUID();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): NonceProvider {
    if (!NonceProvider.instance) {
      NonceProvider.instance = new NonceProvider();
    }
    return NonceProvider.instance;
  }

  /**
   * Get current nonce
   */
  getNonce(): string {
    return this.nonce;
  }

  /**
   * Generate new nonce (for page refreshes)
   */
  generateNewNonce(): string {
    this.nonce = randomUUID();
    return this.nonce;
  }

  /**
   * Get nonce for script tags
   */
  getScriptNonce(): string {
    return `nonce="${this.nonce}"`;
  }

  /**
   * Get nonce for style tags
   */
  getStyleNonce(): string {
    return `nonce="${this.nonce}"`;
  }
}

// Export singleton instance
export const nonceProvider = NonceProvider.getInstance();
