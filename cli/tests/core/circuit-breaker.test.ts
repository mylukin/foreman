import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircuitBreaker, CircuitState } from '../../src/core/circuit-breaker';

describe('CircuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Constructor and Initialization', () => {
    it('should start in CLOSED state', () => {
      // Arrange & Act
      const breaker = new CircuitBreaker();

      // Assert
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should use default configuration', () => {
      // Arrange & Act
      const breaker = new CircuitBreaker();
      const metrics = breaker.getMetrics();

      // Assert
      expect(metrics.state).toBe(CircuitState.CLOSED);
      expect(metrics.failureCount).toBe(0);
      expect(metrics.successCount).toBe(0);
      expect(metrics.lastFailureTime).toBeNull();
    });

    it('should accept custom configuration', () => {
      // Arrange
      const config = {
        failureThreshold: 3,
        timeout: 30000,
        successThreshold: 1,
      };

      // Act
      const breaker = new CircuitBreaker(config);

      // Assert
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('CLOSED State Behavior', () => {
    it('should execute operation successfully in CLOSED state', async () => {
      // Arrange
      const breaker = new CircuitBreaker();
      const operation = vi.fn().mockResolvedValue('success');

      // Act
      const result = await breaker.execute(operation);

      // Assert
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should remain CLOSED after single failure', async () => {
      // Arrange
      const breaker = new CircuitBreaker({ failureThreshold: 5 });
      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));

      // Act
      try {
        await breaker.execute(operation);
      } catch (error) {
        // Expected to throw
      }

      // Assert
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      const metrics = breaker.getMetrics();
      expect(metrics.failureCount).toBe(1);
    });

    it('should transition to OPEN after reaching failure threshold', async () => {
      // Arrange
      const breaker = new CircuitBreaker({ failureThreshold: 3 });
      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));

      // Act - Execute 3 times to reach threshold
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(operation);
        } catch (error) {
          // Expected to throw
        }
      }

      // Assert
      expect(breaker.getState()).toBe(CircuitState.OPEN);
      expect(breaker.getMetrics().failureCount).toBe(3);
    });

    it('should reset failure count after successful operation', async () => {
      // Arrange
      const breaker = new CircuitBreaker({ failureThreshold: 5 });
      const failingOp = vi.fn().mockRejectedValue(new Error('Failed'));
      const successOp = vi.fn().mockResolvedValue('success');

      // Act - Fail twice, then succeed
      try { await breaker.execute(failingOp); } catch (e) {}
      try { await breaker.execute(failingOp); } catch (e) {}
      await breaker.execute(successOp);

      // Assert
      const metrics = breaker.getMetrics();
      expect(metrics.failureCount).toBe(0);
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('OPEN State Behavior', () => {
    it('should fail fast when circuit is OPEN', async () => {
      // Arrange
      const breaker = new CircuitBreaker({ failureThreshold: 2, timeout: 60000 });
      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));

      // Open the circuit
      try { await breaker.execute(operation); } catch (e) {}
      try { await breaker.execute(operation); } catch (e) {}

      // Reset the mock to track new calls
      operation.mockClear();

      // Act & Assert - Circuit should fail fast without calling operation
      await expect(breaker.execute(operation)).rejects.toThrow('Circuit breaker is OPEN');
      expect(operation).not.toHaveBeenCalled();
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should stay OPEN before timeout expires', async () => {
      // Arrange
      const breaker = new CircuitBreaker({ failureThreshold: 2, timeout: 60000 });
      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));

      // Open the circuit
      try { await breaker.execute(operation); } catch (e) {}
      try { await breaker.execute(operation); } catch (e) {}

      // Act - Advance time by 30 seconds (half of timeout)
      vi.advanceTimersByTime(30000);

      // Assert - Circuit should still be OPEN
      await expect(breaker.execute(operation)).rejects.toThrow('Circuit breaker is OPEN');
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should transition to HALF_OPEN after timeout expires', async () => {
      // Arrange
      const breaker = new CircuitBreaker({ failureThreshold: 2, timeout: 60000 });
      const failingOp = vi.fn().mockRejectedValue(new Error('Failed'));

      // Open the circuit
      try { await breaker.execute(failingOp); } catch (e) {}
      try { await breaker.execute(failingOp); } catch (e) {}

      // Act - Advance time past timeout
      vi.advanceTimersByTime(60000);

      // Prepare success operation for HALF_OPEN test
      const successOp = vi.fn().mockResolvedValue('success');

      // Assert - Should transition to HALF_OPEN and allow operation
      const result = await breaker.execute(successOp);
      expect(result).toBe('success');
      expect(successOp).toHaveBeenCalled();
    });

    it('should record last failure time when circuit opens', async () => {
      // Arrange
      const now = Date.now();
      vi.setSystemTime(now);
      const breaker = new CircuitBreaker({ failureThreshold: 2 });
      const operation = vi.fn().mockRejectedValue(new Error('Failed'));

      // Act
      try { await breaker.execute(operation); } catch (e) {}
      try { await breaker.execute(operation); } catch (e) {}

      // Assert
      const metrics = breaker.getMetrics();
      expect(metrics.lastFailureTime).toBe(now);
    });
  });

  describe('HALF_OPEN State Behavior', () => {
    it('should transition to CLOSED after enough successes in HALF_OPEN', async () => {
      // Arrange
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        timeout: 60000,
        successThreshold: 2,
      });
      const failingOp = vi.fn().mockRejectedValue(new Error('Failed'));

      // Open the circuit
      try { await breaker.execute(failingOp); } catch (e) {}
      try { await breaker.execute(failingOp); } catch (e) {}

      // Advance time to enter HALF_OPEN
      vi.advanceTimersByTime(60000);

      // Act - Execute successes to close circuit
      const successOp = vi.fn().mockResolvedValue('success');
      await breaker.execute(successOp);
      await breaker.execute(successOp);

      // Assert
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.getMetrics().successCount).toBe(0); // Reset after closing
    });

    it('should transition back to OPEN if failure occurs in HALF_OPEN', async () => {
      // Arrange
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        timeout: 60000,
        successThreshold: 2,
      });
      const failingOp = vi.fn().mockRejectedValue(new Error('Failed'));

      // Open the circuit
      try { await breaker.execute(failingOp); } catch (e) {}
      try { await breaker.execute(failingOp); } catch (e) {}

      // Advance time to enter HALF_OPEN
      vi.advanceTimersByTime(60000);

      // Execute one success
      const successOp = vi.fn().mockResolvedValue('success');
      await breaker.execute(successOp);

      // Act - Fail in HALF_OPEN
      try {
        await breaker.execute(failingOp);
      } catch (e) {
        // Expected
      }

      // Assert
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should allow operation to execute in HALF_OPEN state', async () => {
      // Arrange
      const breaker = new CircuitBreaker({ failureThreshold: 2, timeout: 60000 });
      const failingOp = vi.fn().mockRejectedValue(new Error('Failed'));

      // Open the circuit
      try { await breaker.execute(failingOp); } catch (e) {}
      try { await breaker.execute(failingOp); } catch (e) {}

      // Advance time to transition to HALF_OPEN
      vi.advanceTimersByTime(60000);

      // Act
      const testOp = vi.fn().mockResolvedValue('test');
      const result = await breaker.execute(testOp);

      // Assert
      expect(result).toBe('test');
      expect(testOp).toHaveBeenCalledTimes(1);
    });

    it('should increment success count in HALF_OPEN state', async () => {
      // Arrange
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        timeout: 60000,
        successThreshold: 3,
      });
      const failingOp = vi.fn().mockRejectedValue(new Error('Failed'));

      // Open the circuit
      try { await breaker.execute(failingOp); } catch (e) {}
      try { await breaker.execute(failingOp); } catch (e) {}

      // Advance time to HALF_OPEN
      vi.advanceTimersByTime(60000);

      // Act - Execute one success
      const successOp = vi.fn().mockResolvedValue('success');
      await breaker.execute(successOp);

      // Assert
      expect(breaker.getMetrics().successCount).toBe(1);
    });
  });

  describe('getMetrics', () => {
    it('should return comprehensive metrics', async () => {
      // Arrange
      const now = Date.now();
      vi.setSystemTime(now);
      const breaker = new CircuitBreaker({ failureThreshold: 3 });
      const failingOp = vi.fn().mockRejectedValue(new Error('Failed'));

      // Act - Cause 2 failures
      try { await breaker.execute(failingOp); } catch (e) {}
      try { await breaker.execute(failingOp); } catch (e) {}

      const metrics = breaker.getMetrics();

      // Assert
      expect(metrics).toEqual({
        state: CircuitState.CLOSED,
        failureCount: 2,
        successCount: 0,
        lastFailureTime: now,
      });
    });

    it('should show correct metrics after state transition', async () => {
      // Arrange
      const breaker = new CircuitBreaker({ failureThreshold: 2 });
      const failingOp = vi.fn().mockRejectedValue(new Error('Failed'));

      // Act - Open circuit
      try { await breaker.execute(failingOp); } catch (e) {}
      try { await breaker.execute(failingOp); } catch (e) {}

      const metrics = breaker.getMetrics();

      // Assert
      expect(metrics.state).toBe(CircuitState.OPEN);
      expect(metrics.failureCount).toBe(2);
    });
  });

  describe('Error Propagation', () => {
    it('should propagate original error when operation fails in CLOSED state', async () => {
      // Arrange
      const breaker = new CircuitBreaker();
      const error = new Error('Custom error message');
      const operation = vi.fn().mockRejectedValue(error);

      // Act & Assert
      await expect(breaker.execute(operation)).rejects.toThrow('Custom error message');
    });

    it('should throw circuit breaker error when OPEN', async () => {
      // Arrange
      const breaker = new CircuitBreaker({ failureThreshold: 1 });
      const failingOp = vi.fn().mockRejectedValue(new Error('Failed'));

      // Open the circuit
      try { await breaker.execute(failingOp); } catch (e) {}

      // Act & Assert
      await expect(breaker.execute(failingOp)).rejects.toThrow('Circuit breaker is OPEN');
    });
  });

  describe('Edge Cases', () => {
    it('should handle operation that returns undefined', async () => {
      // Arrange
      const breaker = new CircuitBreaker();
      const operation = vi.fn().mockResolvedValue(undefined);

      // Act
      const result = await breaker.execute(operation);

      // Assert
      expect(result).toBeUndefined();
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should handle operation that returns null', async () => {
      // Arrange
      const breaker = new CircuitBreaker();
      const operation = vi.fn().mockResolvedValue(null);

      // Act
      const result = await breaker.execute(operation);

      // Assert
      expect(result).toBeNull();
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should handle rapid consecutive failures', async () => {
      // Arrange
      const breaker = new CircuitBreaker({ failureThreshold: 5 });
      const operation = vi.fn().mockRejectedValue(new Error('Failed'));

      // Act - Execute many failures rapidly
      for (let i = 0; i < 10; i++) {
        try {
          await breaker.execute(operation);
        } catch (e) {
          // Expected
        }
      }

      // Assert - Should stop at OPEN state
      expect(breaker.getState()).toBe(CircuitState.OPEN);
      expect(operation).toHaveBeenCalledTimes(5); // Only 5 calls before opening
    });

    it('should handle timeout of 0 (immediate HALF_OPEN)', async () => {
      // Arrange
      const breaker = new CircuitBreaker({ failureThreshold: 1, timeout: 0 });
      const failingOp = vi.fn().mockRejectedValue(new Error('Failed'));

      // Open the circuit
      try { await breaker.execute(failingOp); } catch (e) {}

      // Act - No time advancement needed
      const successOp = vi.fn().mockResolvedValue('success');
      const result = await breaker.execute(successOp);

      // Assert - Should allow operation immediately
      expect(result).toBe('success');
    });
  });

  describe('Configuration Validation', () => {
    it('should work with minimum configuration values', () => {
      // Arrange & Act
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        timeout: 1,
        successThreshold: 1,
      });

      // Assert
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should work with large configuration values', () => {
      // Arrange & Act
      const breaker = new CircuitBreaker({
        failureThreshold: 1000,
        timeout: 3600000, // 1 hour
        successThreshold: 100,
      });

      // Assert
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });
});
