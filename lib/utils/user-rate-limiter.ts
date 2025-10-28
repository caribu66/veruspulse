/**
 * User-Based Rate Limiting System
 * Provides sophisticated rate limiting based on user sessions and behavior
 */

import { logger } from './logger';

export interface UserRateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  keyGenerator?: (req: any) => string; // Custom key generator
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export interface UserSession {
  userId?: string;
  sessionId: string;
  ipAddress: string;
  userAgent?: string;
  firstSeen: number;
  lastSeen: number;
  requestCount: number;
  isAuthenticated: boolean;
}

export class UserRateLimiter {
  private sessions: Map<string, UserSession> = new Map();
  private requestCounts: Map<string, { count: number; resetTime: number }> =
    new Map();
  private config: UserRateLimitConfig;

  constructor(config: UserRateLimitConfig) {
    this.config = {
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config,
    };
  }

  /**
   * Generate rate limit key for request
   */
  private generateKey(req: any): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(req);
    }

    // Default key generation strategy
    const userId = req.userId || req.sessionId || 'anonymous';
    const ipAddress = req.ipAddress || req.ip || 'unknown';

    // Use user ID if authenticated, otherwise IP + user agent
    if (req.userId) {
      return `user:${userId}`;
    } else {
      const userAgent = req.userAgent || 'unknown';
      return `ip:${ipAddress}:${this.hashUserAgent(userAgent)}`;
    }
  }

  /**
   * Hash user agent for consistent key generation
   */
  private hashUserAgent(userAgent: string): string {
    // Simple hash function for user agent
    let hash = 0;
    for (let i = 0; i < userAgent.length; i++) {
      const char = userAgent.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get or create user session
   */
  private getOrCreateSession(req: any): UserSession {
    const key = this.generateKey(req);

    if (!this.sessions.has(key)) {
      const session: UserSession = {
        userId: req.userId,
        sessionId: req.sessionId || this.generateSessionId(),
        ipAddress: req.ipAddress || req.ip || 'unknown',
        userAgent: req.userAgent,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        requestCount: 0,
        isAuthenticated: !!req.userId,
      };

      this.sessions.set(key, session);
      logger.debug(`🆕 Created new session for key: ${key}`);
    }

    const session = this.sessions.get(key)!;
    session.lastSeen = Date.now();
    return session;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if request is allowed
   */
  isAllowed(req: any): { allowed: boolean; info: RateLimitInfo } {
    const key = this.generateKey(req);
    const session = this.getOrCreateSession(req);
    const now = Date.now();

    // Clean up expired entries
    this.cleanupExpiredEntries(now);

    // Get or create request count entry
    let entry = this.requestCounts.get(key);
    if (!entry || now >= entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs,
      };
      this.requestCounts.set(key, entry);
    }

    // Check if limit exceeded
    const isAllowed = entry.count < this.config.maxRequests;

    if (isAllowed) {
      entry.count++;
      session.requestCount++;
    }

    const info: RateLimitInfo = {
      limit: this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.resetTime,
      retryAfter: !isAllowed
        ? Math.ceil((entry.resetTime - now) / 1000)
        : undefined,
    };

    return { allowed: isAllowed, info };
  }

  /**
   * Record successful request
   */
  recordSuccess(req: any): void {
    if (this.config.skipSuccessfulRequests) {
      const key = this.generateKey(req);
      const entry = this.requestCounts.get(key);
      if (entry && entry.count > 0) {
        entry.count--;
      }
    }
  }

  /**
   * Record failed request
   */
  recordFailure(req: any): void {
    if (this.config.skipFailedRequests) {
      const key = this.generateKey(req);
      const entry = this.requestCounts.get(key);
      if (entry && entry.count > 0) {
        entry.count--;
      }
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpiredEntries(now: number): void {
    // Clean up request counts
    const requestKeys = Array.from(this.requestCounts.keys());
    for (const key of requestKeys) {
      const entry = this.requestCounts.get(key);
      if (entry && now >= entry.resetTime) {
        this.requestCounts.delete(key);
      }
    }

    // Clean up old sessions (older than 24 hours)
    const sessionExpiry = 24 * 60 * 60 * 1000; // 24 hours
    const sessionKeys = Array.from(this.sessions.keys());
    for (const key of sessionKeys) {
      const session = this.sessions.get(key);
      if (session && now - session.lastSeen > sessionExpiry) {
        this.sessions.delete(key);
      }
    }
  }

  /**
   * Get rate limit status for a request
   */
  getStatus(req: any): RateLimitInfo {
    const key = this.generateKey(req);
    const entry = this.requestCounts.get(key);

    if (!entry) {
      return {
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests,
        resetTime: Date.now() + this.config.windowMs,
      };
    }

    return {
      limit: this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.resetTime,
      retryAfter:
        entry.count >= this.config.maxRequests
          ? Math.ceil((entry.resetTime - Date.now()) / 1000)
          : undefined,
    };
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): UserSession[] {
    this.cleanupExpiredEntries(Date.now());
    return Array.from(this.sessions.values());
  }

  /**
   * Get session statistics
   */
  getStats(): {
    totalSessions: number;
    authenticatedSessions: number;
    anonymousSessions: number;
    totalRequests: number;
    averageRequestsPerSession: number;
  } {
    this.cleanupExpiredEntries(Date.now());

    const sessions = Array.from(this.sessions.values());
    const totalRequests = sessions.reduce(
      (sum, session) => sum + session.requestCount,
      0
    );

    return {
      totalSessions: sessions.length,
      authenticatedSessions: sessions.filter(s => s.isAuthenticated).length,
      anonymousSessions: sessions.filter(s => !s.isAuthenticated).length,
      totalRequests,
      averageRequestsPerSession:
        sessions.length > 0 ? totalRequests / sessions.length : 0,
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): void {
    this.requestCounts.delete(key);
    this.sessions.delete(key);
    logger.info(`🔄 Reset rate limit for key: ${key}`);
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.requestCounts.clear();
    this.sessions.clear();
    logger.info('🔄 Reset all rate limits');
  }
}

/**
 * Rate Limiting Middleware Factory
 */
export class RateLimitMiddleware {
  private static instances: Map<string, UserRateLimiter> = new Map();

  /**
   * Create or get rate limiter instance
   */
  static getInstance(
    name: string,
    config: UserRateLimitConfig
  ): UserRateLimiter {
    if (!this.instances.has(name)) {
      this.instances.set(name, new UserRateLimiter(config));
      logger.info(`🔧 Created rate limiter instance: ${name}`);
    }
    return this.instances.get(name)!;
  }

  /**
   * Create middleware function
   */
  static createMiddleware(name: string, config: UserRateLimitConfig) {
    const limiter = this.getInstance(name, config);

    return (req: any, res: any, next: any) => {
      const { allowed, info } = limiter.isAllowed(req);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', info.limit);
      res.setHeader('X-RateLimit-Remaining', info.remaining);
      res.setHeader(
        'X-RateLimit-Reset',
        new Date(info.resetTime).toISOString()
      );

      if (!allowed) {
        res.setHeader('Retry-After', info.retryAfter);
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: info.retryAfter,
          limit: info.limit,
          remaining: info.remaining,
          resetTime: new Date(info.resetTime).toISOString(),
        });
      }

      // Record success/failure after request processing
      const originalSend = res.send;
      res.send = function (data: any) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          limiter.recordSuccess(req);
        } else {
          limiter.recordFailure(req);
        }
        return originalSend.call(this, data);
      };

      next();
    };
  }

  /**
   * Get all rate limiter statistics
   */
  static getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    this.instances.forEach((limiter, name) => {
      stats[name] = limiter.getStats();
    });

    return stats;
  }
}

// Pre-configured rate limiters for different use cases
export const RATE_LIMIT_CONFIGS = {
  // API calls - moderate limits
  API: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  // Search requests - more restrictive
  SEARCH: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    skipSuccessfulRequests: false,
    skipFailedRequests: true, // Don't penalize failed searches
  },

  // Authentication - very restrictive
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    skipSuccessfulRequests: true, // Don't count successful auth
    skipFailedRequests: false,
  },

  // File uploads - restrictive
  UPLOAD: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
};

// Global rate limiter instances
export const apiRateLimiter = RateLimitMiddleware.getInstance(
  'api',
  RATE_LIMIT_CONFIGS.API
);
export const searchRateLimiter = RateLimitMiddleware.getInstance(
  'search',
  RATE_LIMIT_CONFIGS.SEARCH
);
export const authRateLimiter = RateLimitMiddleware.getInstance(
  'auth',
  RATE_LIMIT_CONFIGS.AUTH
);
export const uploadRateLimiter = RateLimitMiddleware.getInstance(
  'upload',
  RATE_LIMIT_CONFIGS.UPLOAD
);
