/**
 * Comprehensive tests for CircuitBreaker
 */

import {
  CircuitBreaker,
  CircuitState,
  CircuitBreakerManager,
  CIRCUIT_BREAKER_CONFIGS,
} from '@/lib/utils/circuit-breaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      recoveryTimeout: 1000,
      monitoringPeriod: 5000,
      successThreshold: 2,
    });
  });

  describe('initial state', () => {
    test('starts in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    test('can execute calls initially', () => {
      expect(circuitBreaker.canExecute()).toBe(true);
    });
  });

  describe('successful calls', () => {
    test('executes successful function', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await circuitBreaker.execute(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    test('resets failure count on success', async () => {
      // Simulate some failures first
      circuitBreaker['failures'] = 2;

      const mockFn = jest.fn().mockResolvedValue('success');
      await circuitBreaker.execute(mockFn);

      expect(circuitBreaker['failures']).toBe(0);
    });
  });

  describe('failed calls', () => {
    test('handles failed function', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow(
        'test error'
      );
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('opens circuit after failure threshold', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

      // Execute enough failures to open circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
      expect(circuitBreaker.canExecute()).toBe(false);
    });

    test('fails fast when circuit is open', async () => {
      // Open the circuit
      circuitBreaker['state'] = CircuitState.OPEN;
      circuitBreaker['nextAttemptTime'] = Date.now() + 1000;

      const mockFn = jest.fn().mockResolvedValue('success');

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow(
        'Circuit breaker is OPEN'
      );
      expect(mockFn).not.toHaveBeenCalled();
    });
  });

  describe('half-open state', () => {
    test('moves to half-open after recovery timeout', async () => {
      // Open the circuit
      circuitBreaker['state'] = CircuitState.OPEN;
      circuitBreaker['nextAttemptTime'] = Date.now() - 1000; // Past timeout

      const mockFn = jest.fn().mockResolvedValue('success');
      await circuitBreaker.execute(mockFn);

      expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);
    });

    test('closes circuit after success threshold in half-open', async () => {
      // Set to half-open state
      circuitBreaker['state'] = CircuitState.HALF_OPEN;
      circuitBreaker['successes'] = 1; // One success already

      const mockFn = jest.fn().mockResolvedValue('success');
      await circuitBreaker.execute(mockFn);

      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    test('opens circuit on failure in half-open state', async () => {
      // Set to half-open state
      circuitBreaker['state'] = CircuitState.HALF_OPEN;

      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('statistics', () => {
    test('tracks call statistics', async () => {
      const successFn = jest.fn().mockResolvedValue('success');
      const failFn = jest.fn().mockRejectedValue(new Error('test error'));

      await circuitBreaker.execute(successFn);
      await expect(circuitBreaker.execute(failFn)).rejects.toThrow();

      const stats = circuitBreaker.getStats();
      expect(stats.totalCalls).toBe(2);
      expect(stats.failures).toBe(1);
      expect(stats.successes).toBe(1);
      expect(stats.failureRate).toBe(50);
    });
  });

  describe('reset', () => {
    test('resets circuit breaker state', () => {
      // Set some state
      circuitBreaker['state'] = CircuitState.OPEN;
      circuitBreaker['failures'] = 5;
      circuitBreaker['totalCalls'] = 10;

      circuitBreaker.reset();

      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
      expect(circuitBreaker['failures']).toBe(0);
      expect(circuitBreaker['totalCalls']).toBe(0);
    });
  });
});

describe('CircuitBreakerManager', () => {
  let manager: CircuitBreakerManager;

  beforeEach(() => {
    manager = new CircuitBreakerManager();
  });

  describe('getBreaker', () => {
    test('creates new circuit breaker for service', () => {
      const breaker = manager.getBreaker('test-service');

      expect(breaker).toBeDefined();
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    test('returns same breaker for same service', () => {
      const breaker1 = manager.getBreaker('test-service');
      const breaker2 = manager.getBreaker('test-service');

      expect(breaker1).toBe(breaker2);
    });

    test('uses custom config when provided', () => {
      const customConfig = { failureThreshold: 5 };
      const breaker = manager.getBreaker('test-service', customConfig);

      expect(breaker).toBeDefined();
    });
  });

  describe('execute', () => {
    test('executes function with circuit breaker protection', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await manager.execute('test-service', mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('handles function failures', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

      await expect(manager.execute('test-service', mockFn)).rejects.toThrow(
        'test error'
      );
    });
  });

  describe('getAllStats', () => {
    test('returns statistics for all services', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      await manager.execute('service1', mockFn);
      await manager.execute('service2', mockFn);

      const stats = manager.getAllStats();

      expect(stats).toHaveProperty('service1');
      expect(stats).toHaveProperty('service2');
      expect(stats.service1).toBeDefined();
      expect(stats.service2).toBeDefined();
      expect(stats.service1?.totalCalls).toBe(1);
      expect(stats.service2?.totalCalls).toBe(1);
    });
  });

  describe('reset', () => {
    test('resets specific service', () => {
      const breaker = manager.getBreaker('test-service');
      breaker['failures'] = 5;

      manager.reset('test-service');

      expect(breaker['failures']).toBe(0);
    });

    test('resets all services', () => {
      const breaker1 = manager.getBreaker('service1');
      const breaker2 = manager.getBreaker('service2');

      breaker1['failures'] = 5;
      breaker2['failures'] = 3;

      manager.resetAll();

      expect(breaker1['failures']).toBe(0);
      expect(breaker2['failures']).toBe(0);
    });
  });
});

describe('CIRCUIT_BREAKER_CONFIGS', () => {
  test('has correct default configurations', () => {
    expect(CIRCUIT_BREAKER_CONFIGS.RPC.failureThreshold).toBe(3);
    expect(CIRCUIT_BREAKER_CONFIGS.RPC.recoveryTimeout).toBe(15000);

    expect(CIRCUIT_BREAKER_CONFIGS.DATABASE.failureThreshold).toBe(5);
    expect(CIRCUIT_BREAKER_CONFIGS.DATABASE.recoveryTimeout).toBe(30000);

    expect(CIRCUIT_BREAKER_CONFIGS.EXTERNAL_API.failureThreshold).toBe(2);
    expect(CIRCUIT_BREAKER_CONFIGS.EXTERNAL_API.recoveryTimeout).toBe(60000);
  });
});
