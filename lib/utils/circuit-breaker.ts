/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by monitoring RPC call success rates
 */

import { logger } from './logger';

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Circuit is open, calls fail fast
  HALF_OPEN = 'HALF_OPEN', // Testing if service is back
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  recoveryTimeout: number; // Time to wait before trying again (ms)
  monitoringPeriod: number; // Time window for monitoring (ms)
  successThreshold: number; // Successes needed to close circuit from half-open
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  totalCalls: number;
  failureRate: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number = 0;
  private lastSuccessTime: number = 0;
  private totalCalls: number = 0;
  private nextAttemptTime: number = 0;

  constructor(private config: CircuitBreakerConfig) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalCalls++;

    // Check if circuit is open and recovery timeout hasn't passed
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
      // Move to half-open state
      this.state = CircuitState.HALF_OPEN;
      logger.info('🔄 Circuit breaker moving to HALF_OPEN state');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful call
   */
  private onSuccess(): void {
    this.lastSuccessTime = Date.now();
    this.successes++;

    if (this.state === CircuitState.HALF_OPEN) {
      // If we have enough successes, close the circuit
      if (this.successes >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.resetCounters();
        logger.info('✅ Circuit breaker CLOSED - service recovered');
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success
      this.failures = 0;
    }
  }

  /**
   * Handle failed call
   */
  private onFailure(): void {
    this.lastFailureTime = Date.now();
    this.failures++;

    if (this.state === CircuitState.CLOSED) {
      // Check if we've exceeded the failure threshold
      if (this.failures >= this.config.failureThreshold) {
        this.state = CircuitState.OPEN;
        this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
        logger.warn(
          `🚨 Circuit breaker OPENED - ${this.failures} failures detected`
        );
      }
    } else if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open state opens the circuit
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
      logger.warn('🚨 Circuit breaker OPENED from HALF_OPEN state');
    }
  }

  /**
   * Reset counters
   */
  private resetCounters(): void {
    this.failures = 0;
    this.successes = 0;
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get detailed statistics
   */
  getStats(): CircuitBreakerStats {
    const failureRate =
      this.totalCalls > 0 ? (this.failures / this.totalCalls) * 100 : 0;

    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalCalls: this.totalCalls,
      failureRate: Math.round(failureRate * 100) / 100,
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.resetCounters();
    this.totalCalls = 0;
    this.nextAttemptTime = 0;
    logger.info('🔄 Circuit breaker manually reset');
  }

  /**
   * Check if circuit breaker allows calls
   */
  canExecute(): boolean {
    if (this.state === CircuitState.CLOSED) return true;
    if (this.state === CircuitState.HALF_OPEN) return true;
    if (this.state === CircuitState.OPEN) {
      return Date.now() >= this.nextAttemptTime;
    }
    return false;
  }
}

/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers for different services
 */
export class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Get or create a circuit breaker for a service
   */
  getBreaker(
    serviceName: string,
    config?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      const defaultConfig: CircuitBreakerConfig = {
        failureThreshold: 5,
        recoveryTimeout: 30000, // 30 seconds
        monitoringPeriod: 60000, // 1 minute
        successThreshold: 3,
        ...config,
      };

      this.breakers.set(serviceName, new CircuitBreaker(defaultConfig));
      logger.info(`🔧 Created circuit breaker for service: ${serviceName}`);
    }

    return this.breakers.get(serviceName)!;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    serviceName: string,
    fn: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>
  ): Promise<T> {
    const breaker = this.getBreaker(serviceName, config);
    return breaker.execute(fn);
  }

  /**
   * Get all circuit breaker statistics
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};

    this.breakers.forEach((breaker, serviceName) => {
      stats[serviceName] = breaker.getStats();
    });

    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.breakers.forEach((breaker, serviceName) => {
      breaker.reset();
      logger.info(`🔄 Reset circuit breaker for service: ${serviceName}`);
    });
  }

  /**
   * Reset a specific circuit breaker
   */
  reset(serviceName: string): void {
    const breaker = this.breakers.get(serviceName);
    if (breaker) {
      breaker.reset();
      logger.info(`🔄 Reset circuit breaker for service: ${serviceName}`);
    }
  }
}

// Default circuit breaker configurations for different services
export const CIRCUIT_BREAKER_CONFIGS = {
  // RPC calls - more sensitive to failures
  RPC: {
    failureThreshold: 3,
    recoveryTimeout: 15000, // 15 seconds
    monitoringPeriod: 30000, // 30 seconds
    successThreshold: 2,
  },

  // Database operations - more tolerant
  DATABASE: {
    failureThreshold: 5,
    recoveryTimeout: 30000, // 30 seconds
    monitoringPeriod: 60000, // 1 minute
    successThreshold: 3,
  },

  // External API calls - very sensitive
  EXTERNAL_API: {
    failureThreshold: 2,
    recoveryTimeout: 60000, // 1 minute
    monitoringPeriod: 120000, // 2 minutes
    successThreshold: 1,
  },
};

// Global circuit breaker manager instance
export const circuitBreakerManager = new CircuitBreakerManager();
