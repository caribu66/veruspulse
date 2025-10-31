// Rate Limiter for Verus RPC Calls
// Prevents hammering the Verus daemon with too many requests

import { type RateLimitConfig, type RateLimitStatus } from '../types/verus-rpc-types';

export class RateLimiter {
  private config: RateLimitConfig;
  private requestTimes: number[] = [];
  private burstTokens: number;
  private lastRefillTime: number;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      maxRequestsPerSecond: config.maxRequestsPerSecond || 10,
      maxRequestsPerMinute: config.maxRequestsPerMinute || 300,
      maxRequestsPerHour: config.maxRequestsPerHour || 10000,
      burstLimit: config.burstLimit || 20,
      windowMs: config.windowMs || 60000, // 1 minute window
      retryAfterMs: config.retryAfterMs || 1000, // 1 second default retry
      ...config,
    };

    this.burstTokens = this.config.burstLimit;
    this.lastRefillTime = Date.now();
  }

  /**
   * Check if a request is allowed and update counters
   */
  async checkLimit(): Promise<RateLimitStatus> {
    const now = Date.now();

    // Refill burst tokens
    this.refillBurstTokens(now);

    // Clean old request times (keep only requests within the window)
    this.cleanOldRequests(now);

    // Check various rate limits
    const secondLimit = this.checkSecondLimit(now);
    const minuteLimit = this.checkMinuteLimit();
    const hourLimit = this.checkHourLimit(now);
    const burstLimit = this.checkBurstLimit();

    // If any limit is exceeded, return limited status
    if (
      !secondLimit.allowed ||
      !minuteLimit.allowed ||
      !hourLimit.allowed ||
      !burstLimit.allowed
    ) {
      const retryAfter = Math.max(
        secondLimit.retryAfter || 0,
        minuteLimit.retryAfter || 0,
        hourLimit.retryAfter || 0,
        burstLimit.retryAfter || 0,
        this.config.retryAfterMs
      );

      return {
        remaining: 0,
        resetTime: now + retryAfter,
        retryAfter,
        isLimited: true,
      };
    }

    // Record this request
    this.requestTimes.push(now);
    this.burstTokens--;

    // Calculate remaining requests for the most restrictive limit
    const remaining = Math.min(
      this.config.maxRequestsPerSecond - this.getRequestsInLastSecond(now),
      this.config.maxRequestsPerMinute - this.requestTimes.length,
      this.config.maxRequestsPerHour - this.getRequestsInLastHour(now),
      this.burstTokens
    );

    return {
      remaining: Math.max(0, remaining),
      resetTime: now + this.config.windowMs,
      isLimited: false,
    };
  }

  /**
   * Wait for rate limit to allow next request
   */
  async waitForAllow(): Promise<void> {
    const status = await this.checkLimit();

    if (status.isLimited && status.retryAfter) {
      await this.sleep(status.retryAfter);
    }
  }

  /**
   * Execute a function with rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.waitForAllow();
    return await fn();
  }

  /**
   * Get current rate limit status without making a request
   */
  getStatus(): RateLimitStatus {
    const now = Date.now();
    this.refillBurstTokens(now);
    this.cleanOldRequests(now);

    const requestsInSecond = this.getRequestsInLastSecond(now);
    const requestsInMinute = this.requestTimes.length;
    const requestsInHour = this.getRequestsInLastHour(now);

    const remaining = Math.min(
      this.config.maxRequestsPerSecond - requestsInSecond,
      this.config.maxRequestsPerMinute - requestsInMinute,
      this.config.maxRequestsPerHour - requestsInHour,
      this.burstTokens
    );

    const isLimited = remaining <= 0;

    return {
      remaining: Math.max(0, remaining),
      resetTime: now + this.config.windowMs,
      isLimited,
    };
  }

  /**
   * Get detailed statistics about rate limiter usage
   */
  getDetailedStats() {
    const now = Date.now();
    this.refillBurstTokens(now);
    this.cleanOldRequests(now);

    const requestsInSecond = this.getRequestsInLastSecond(now);
    const requestsInMinute = this.requestTimes.length;
    const requestsInHour = this.getRequestsInLastHour(now);

    return {
      current: {
        perSecond: requestsInSecond,
        perMinute: requestsInMinute,
        perHour: requestsInHour,
      },
      limits: {
        perSecond: this.config.maxRequestsPerSecond,
        perMinute: this.config.maxRequestsPerMinute,
        perHour: this.config.maxRequestsPerHour,
        burst: this.config.burstLimit,
      },
      usage: {
        perSecond: (requestsInSecond / this.config.maxRequestsPerSecond) * 100,
        perMinute: (requestsInMinute / this.config.maxRequestsPerMinute) * 100,
        perHour: (requestsInHour / this.config.maxRequestsPerHour) * 100,
      },
      available: {
        perSecond: Math.max(
          0,
          this.config.maxRequestsPerSecond - requestsInSecond
        ),
        perMinute: Math.max(
          0,
          this.config.maxRequestsPerMinute - requestsInMinute
        ),
        perHour: Math.max(0, this.config.maxRequestsPerHour - requestsInHour),
        burst: Math.max(0, this.burstTokens),
      },
      totalTracked: this.requestTimes.length,
      isHealthy:
        requestsInSecond < this.config.maxRequestsPerSecond * 0.8 &&
        requestsInMinute < this.config.maxRequestsPerMinute * 0.8 &&
        requestsInHour < this.config.maxRequestsPerHour * 0.8,
    };
  }

  /**
   * Reset rate limiter state
   */
  reset(): void {
    this.requestTimes = [];
    this.burstTokens = this.config.burstLimit;
    this.lastRefillTime = Date.now();
  }

  /**
   * Update rate limit configuration
   */
  updateConfig(newConfig: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  private refillBurstTokens(now: number): void {
    const timeSinceLastRefill = now - this.lastRefillTime;
    const tokensToAdd = Math.floor(timeSinceLastRefill / 1000); // 1 token per second

    if (tokensToAdd > 0) {
      this.burstTokens = Math.min(
        this.config.burstLimit,
        this.burstTokens + tokensToAdd
      );
      this.lastRefillTime = now;
    }
  }

  private cleanOldRequests(now: number): void {
    const cutoff = now - this.config.windowMs;
    this.requestTimes = this.requestTimes.filter(time => time > cutoff);
  }

  private checkSecondLimit(now: number): {
    allowed: boolean;
    retryAfter?: number;
  } {
    const requestsInLastSecond = this.getRequestsInLastSecond(now);

    if (requestsInLastSecond >= this.config.maxRequestsPerSecond) {
      const oldestRequestInSecond = this.requestTimes
        .filter(time => time > now - 1000)
        .sort((a, b) => a - b)[0];

      return {
        allowed: false,
        retryAfter: oldestRequestInSecond
          ? 1000 - (now - oldestRequestInSecond)
          : 1000,
      };
    }

    return { allowed: true };
  }

  private checkMinuteLimit(): { allowed: boolean; retryAfter?: number } {
    if (this.requestTimes.length >= this.config.maxRequestsPerMinute) {
      const oldestRequest = Math.min(...this.requestTimes);
      return {
        allowed: false,
        retryAfter: this.config.windowMs - (Date.now() - oldestRequest),
      };
    }

    return { allowed: true };
  }

  private checkHourLimit(now: number): {
    allowed: boolean;
    retryAfter?: number;
  } {
    const requestsInLastHour = this.getRequestsInLastHour(now);

    if (requestsInLastHour >= this.config.maxRequestsPerHour) {
      const oldestRequestInHour = this.requestTimes
        .filter(time => time > now - 3600000)
        .sort((a, b) => a - b)[0];

      return {
        allowed: false,
        retryAfter: oldestRequestInHour
          ? 3600000 - (now - oldestRequestInHour)
          : 3600000,
      };
    }

    return { allowed: true };
  }

  private checkBurstLimit(): { allowed: boolean; retryAfter?: number } {
    if (this.burstTokens <= 0) {
      return {
        allowed: false,
        retryAfter: 1000, // Wait 1 second for burst token refill
      };
    }

    return { allowed: true };
  }

  private getRequestsInLastSecond(now: number): number {
    const cutoff = now - 1000;
    return this.requestTimes.filter(time => time > cutoff).length;
  }

  private getRequestsInLastHour(now: number): number {
    const cutoff = now - 3600000;
    return this.requestTimes.filter(time => time > cutoff).length;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Default rate limiter instances for different use cases
export const defaultRateLimiter = new RateLimiter({
  maxRequestsPerSecond: 10,
  maxRequestsPerMinute: 300,
  maxRequestsPerHour: 10000,
  burstLimit: 20,
});

export const conservativeRateLimiter = new RateLimiter({
  maxRequestsPerSecond: 5,
  maxRequestsPerMinute: 150,
  maxRequestsPerHour: 5000,
  burstLimit: 10,
});

export const aggressiveRateLimiter = new RateLimiter({
  maxRequestsPerSecond: 20,
  maxRequestsPerMinute: 600,
  maxRequestsPerHour: 20000,
  burstLimit: 40,
});

// Rate limiter factory for custom configurations
export function createRateLimiter(
  config: Partial<RateLimitConfig>
): RateLimiter {
  return new RateLimiter(config);
}
