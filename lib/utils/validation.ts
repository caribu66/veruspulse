// API validation utilities
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Enhanced Verus address validation (following Mike Toutonghi's security-first approach)
export function isValidVerusAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;

  // Enhanced Verus address patterns (based on VerusCoin specifications)
  const patterns = [
    /^R[a-zA-Z0-9]{25,34}$/, // Legacy P2PKH addresses
    /^i[a-zA-Z0-9]{25,34}$/, // Identity addresses (VerusID)
    /^z[a-zA-Z0-9]{25,34}$/, // Sapling shielded addresses
    /^u[a-zA-Z0-9]{25,34}$/, // Unified addresses
    /^[a-zA-Z0-9._-]+@$/, // VerusID names (e.g., "myname@")
  ];

  return patterns.some(pattern => pattern.test(address));
}

// VerusID name validation
export function isValidVerusIDName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;

  // VerusID naming conventions
  const verusIDPattern = /^[a-zA-Z0-9._-]+@$/;
  return verusIDPattern.test(name);
}

// Currency name validation for PBaaS
export function isValidCurrencyName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;

  // Currency naming conventions
  const currencyPattern = /^[A-Z0-9._-]+$/;
  return currencyPattern.test(name) && name.length >= 3 && name.length <= 32;
}

// Transaction ID validation
export function isValidTxId(txId: string): boolean {
  if (!txId || typeof txId !== 'string') return false;
  return /^[a-fA-F0-9]{64}$/.test(txId);
}

// Block hash validation
export function isValidBlockHash(hash: string): boolean {
  if (!hash || typeof hash !== 'string') return false;
  return /^[a-fA-F0-9]{64}$/.test(hash);
}

// VerusID validation
export function isValidVerusId(verusId: string): boolean {
  if (!verusId || typeof verusId !== 'string') return false;
  return /^[a-zA-Z0-9._-]+@$/.test(verusId);
}

// API response validation
export function validateApiResponse<T>(
  response: any,
  schema?: (data: any) => data is T
): ApiResponse<T> {
  if (!response) {
    return {
      success: false,
      error: 'No response received',
      timestamp: Date.now(),
    };
  }

  if (response.error) {
    return {
      success: false,
      error: response.error,
      timestamp: Date.now(),
    };
  }

  if (schema && !schema(response.data)) {
    return {
      success: false,
      error: 'Invalid response format',
      timestamp: Date.now(),
    };
  }

  return {
    success: true,
    data: response.data,
    timestamp: Date.now(),
  };
}

// Rate limiting helper
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true;
  }
}

// Input sanitization
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}

// API error handling
export function handleApiError(error: any): string {
  if (error instanceof ValidationError) {
    return `Validation error: ${error.message}`;
  }

  if (error?.response?.status) {
    return `API error: ${error.response.status} ${error.response.statusText}`;
  }

  if (error?.message) {
    return `Error: ${error.message}`;
  }

  return 'An unexpected error occurred';
}
