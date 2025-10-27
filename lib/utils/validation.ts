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

// Enhanced input validation with security focus
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') return '';

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[&<>"']/g, match => {
      // Escape HTML entities
      const escapeMap: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
      };
      return escapeMap[match];
    })
    .substring(0, maxLength); // Limit length
}

// Enhanced SQL injection protection
export function sanitizeForSQL(input: string): string {
  if (typeof input !== 'string') return '';

  return input
    .replace(/['"\\]/g, '') // Remove quotes and backslashes
    .replace(/;.*$/g, '') // Remove everything after semicolon
    .replace(/--.*$/g, '') // Remove SQL comments
    .replace(/\/\*.*?\*\//g, '') // Remove block comments
    .trim();
}

// Enhanced XSS protection
export function sanitizeForXSS(input: string): string {
  if (typeof input !== 'string') return '';

  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

// Request size validation
export function validateRequestSize(
  request: Request,
  maxSizeBytes: number = 1024 * 1024
): boolean {
  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    return size <= maxSizeBytes;
  }
  return true; // If no content-length header, assume it's okay
}

// File upload validation
export function validateFileUpload(
  file: File,
  allowedTypes: string[],
  maxSizeBytes: number = 10 * 1024 * 1024
): {
  isValid: boolean;
  error?: string;
} {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `File too large. Maximum size: ${maxSizeBytes} bytes`,
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  return { isValid: true };
}

// Enhanced rate limiting with IP tracking
export class EnhancedRateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> =
    new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly blockDurationMs: number;

  constructor(
    windowMs: number = 60000,
    maxRequests: number = 100,
    blockDurationMs: number = 300000 // 5 minutes
  ) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.blockDurationMs = blockDurationMs;
  }

  isAllowed(key: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const requestData = this.requests.get(key);

    if (!requestData) {
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs,
      };
    }

    // Check if window has expired
    if (now > requestData.resetTime) {
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs,
      };
    }

    // Check if blocked
    if (requestData.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: requestData.resetTime,
      };
    }

    // Increment count
    requestData.count++;
    this.requests.set(key, requestData);

    return {
      allowed: true,
      remaining: this.maxRequests - requestData.count,
      resetTime: requestData.resetTime,
    };
  }

  // Clean up expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, data] of Array.from(this.requests.entries())) {
      if (now > data.resetTime + this.blockDurationMs) {
        this.requests.delete(key);
      }
    }
  }
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
