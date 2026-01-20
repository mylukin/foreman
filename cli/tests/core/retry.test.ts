import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry } from '../../src/core/retry';

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Success Cases', () => {
    it('should succeed on first attempt', async () => {
      // Arrange
      const operation = vi.fn().mockResolvedValue('success');

      // Act
      const result = await withRetry(operation);

      // Assert
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should return undefined when operation returns undefined', async () => {
      // Arrange
      const operation = vi.fn().mockResolvedValue(undefined);

      // Act
      const result = await withRetry(operation);

      // Assert
      expect(result).toBeUndefined();
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should return null when operation returns null', async () => {
      // Arrange
      const operation = vi.fn().mockResolvedValue(null);

      // Act
      const result = await withRetry(operation);

      // Assert
      expect(result).toBeNull();
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Retry Logic', () => {
    it('should retry transient failures (EBUSY)', async () => {
      // Arrange
      const operation = vi.fn()
        .mockRejectedValueOnce(Object.assign(new Error('Resource busy'), { code: 'EBUSY' }))
        .mockResolvedValueOnce('success');

      // Act
      const promise = withRetry(operation);

      // Advance timers to trigger retry
      await vi.advanceTimersByTimeAsync(100);

      const result = await promise;

      // Assert
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry transient failures (ENOENT)', async () => {
      // Arrange
      const operation = vi.fn()
        .mockRejectedValueOnce(Object.assign(new Error('File not found'), { code: 'ENOENT' }))
        .mockResolvedValueOnce('success');

      // Act
      const promise = withRetry(operation);
      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      // Assert
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry transient failures (EAGAIN)', async () => {
      // Arrange
      const operation = vi.fn()
        .mockRejectedValueOnce(Object.assign(new Error('Try again'), { code: 'EAGAIN' }))
        .mockResolvedValueOnce('success');

      // Act
      const promise = withRetry(operation);
      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      // Assert
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry transient failures (ETIMEDOUT)', async () => {
      // Arrange
      const operation = vi.fn()
        .mockRejectedValueOnce(Object.assign(new Error('Timed out'), { code: 'ETIMEDOUT' }))
        .mockResolvedValueOnce('success');

      // Act
      const promise = withRetry(operation);
      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      // Assert
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should respect maxAttempts', async () => {
      // Arrange
      const operation = vi.fn().mockRejectedValue(
        Object.assign(new Error('Always fails'), { code: 'EBUSY' })
      );

      // Act - capture rejection to prevent unhandled rejection warning
      let caughtError: Error | null = null;
      const promise = withRetry(operation, { maxAttempts: 3 }).catch((e) => {
        caughtError = e;
      });

      // Advance timers for all retry attempts
      await vi.advanceTimersByTimeAsync(100); // First retry
      await vi.advanceTimersByTimeAsync(200); // Second retry
      await promise;

      // Assert - Should throw after 3 attempts
      expect(caughtError).not.toBeNull();
      expect(caughtError!.message).toBe('Always fails');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff delays', async () => {
      // Arrange
      const operation = vi.fn()
        .mockRejectedValueOnce(Object.assign(new Error('Fail 1'), { code: 'EBUSY' }))
        .mockRejectedValueOnce(Object.assign(new Error('Fail 2'), { code: 'EBUSY' }))
        .mockResolvedValueOnce('success');

      // Act
      const promise = withRetry(operation, {
        maxAttempts: 3,
        initialDelay: 100,
        backoffMultiplier: 2,
      });

      // First retry after 100ms
      await vi.advanceTimersByTimeAsync(100);

      // Second retry after 200ms (100 * 2)
      await vi.advanceTimersByTimeAsync(200);

      const result = await promise;

      // Assert
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should cap delay at maxDelay', async () => {
      // Arrange
      const operation = vi.fn()
        .mockRejectedValueOnce(Object.assign(new Error('Fail 1'), { code: 'EBUSY' }))
        .mockRejectedValueOnce(Object.assign(new Error('Fail 2'), { code: 'EBUSY' }))
        .mockResolvedValueOnce('success');

      // Act
      const promise = withRetry(operation, {
        maxAttempts: 3,
        initialDelay: 3000,
        maxDelay: 5000,
        backoffMultiplier: 2,
      });

      // First retry after 3000ms
      await vi.advanceTimersByTimeAsync(3000);

      // Second retry should be capped at 5000ms (not 6000ms)
      await vi.advanceTimersByTimeAsync(5000);

      const result = await promise;

      // Assert
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('Non-Retryable Errors', () => {
    it('should NOT retry validation errors', async () => {
      // Arrange
      const validationError = Object.assign(
        new Error('Validation failed'),
        { code: 'VALIDATION_ERROR' }
      );
      const operation = vi.fn().mockRejectedValue(validationError);

      // Act & Assert
      await expect(withRetry(operation)).rejects.toThrow('Validation failed');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry errors without error code', async () => {
      // Arrange
      const error = new Error('Generic error');
      const operation = vi.fn().mockRejectedValue(error);

      // Act & Assert
      await expect(withRetry(operation)).rejects.toThrow('Generic error');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry unknown error codes', async () => {
      // Arrange
      const error = Object.assign(new Error('Unknown error'), { code: 'UNKNOWN' });
      const operation = vi.fn().mockRejectedValue(error);

      // Act & Assert
      await expect(withRetry(operation)).rejects.toThrow('Unknown error');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry business logic errors', async () => {
      // Arrange
      const error = Object.assign(new Error('Task not found'), { code: 'TASK_NOT_FOUND' });
      const operation = vi.fn().mockRejectedValue(error);

      // Act & Assert
      await expect(withRetry(operation)).rejects.toThrow('Task not found');
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Custom Configuration', () => {
    it('should accept custom maxAttempts', async () => {
      // Arrange
      const operation = vi.fn().mockRejectedValue(
        Object.assign(new Error('Fail'), { code: 'EBUSY' })
      );

      // Act - capture rejection to prevent unhandled rejection warning
      let caughtError: Error | null = null;
      const promise = withRetry(operation, { maxAttempts: 5 }).catch((e) => {
        caughtError = e;
      });

      // Advance timers for all retry attempts
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);
      await vi.advanceTimersByTimeAsync(400);
      await vi.advanceTimersByTimeAsync(800);
      await promise;

      // Assert
      expect(caughtError).not.toBeNull();
      expect(caughtError!.message).toBe('Fail');
      expect(operation).toHaveBeenCalledTimes(5);
    });

    it('should accept custom initialDelay', async () => {
      // Arrange
      const operation = vi.fn()
        .mockRejectedValueOnce(Object.assign(new Error('Fail'), { code: 'EBUSY' }))
        .mockResolvedValueOnce('success');

      // Act
      const promise = withRetry(operation, { initialDelay: 500 });

      // First retry after custom initial delay
      await vi.advanceTimersByTimeAsync(500);

      const result = await promise;

      // Assert
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should accept custom backoffMultiplier', async () => {
      // Arrange
      const operation = vi.fn()
        .mockRejectedValueOnce(Object.assign(new Error('Fail 1'), { code: 'EBUSY' }))
        .mockRejectedValueOnce(Object.assign(new Error('Fail 2'), { code: 'EBUSY' }))
        .mockResolvedValueOnce('success');

      // Act
      const promise = withRetry(operation, {
        initialDelay: 100,
        backoffMultiplier: 3,
      });

      // First retry after 100ms
      await vi.advanceTimersByTimeAsync(100);

      // Second retry after 300ms (100 * 3)
      await vi.advanceTimersByTimeAsync(300);

      const result = await promise;

      // Assert
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should accept custom retryableErrors', async () => {
      // Arrange
      const operation = vi.fn()
        .mockRejectedValueOnce(Object.assign(new Error('Custom error'), { code: 'CUSTOM_ERROR' }))
        .mockResolvedValueOnce('success');

      // Act
      const promise = withRetry(operation, {
        retryableErrors: ['CUSTOM_ERROR'],
      });

      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      // Assert
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should work with empty retryableErrors (no retries)', async () => {
      // Arrange
      const operation = vi.fn().mockRejectedValue(
        Object.assign(new Error('Fail'), { code: 'EBUSY' })
      );

      // Act & Assert
      await expect(withRetry(operation, { retryableErrors: [] })).rejects.toThrow('Fail');
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Propagation', () => {
    it('should propagate original error after exhausting attempts', async () => {
      // Arrange
      const originalError = Object.assign(
        new Error('Original error message'),
        { code: 'EBUSY' }
      );
      const operation = vi.fn().mockRejectedValue(originalError);

      // Act - capture rejection to prevent unhandled rejection warning
      let caughtError: Error | null = null;
      const promise = withRetry(operation, { maxAttempts: 2 }).catch((e) => {
        caughtError = e;
      });
      await vi.advanceTimersByTimeAsync(100);
      await promise;

      // Assert
      expect(caughtError).not.toBeNull();
      expect(caughtError!.message).toBe('Original error message');
    });

    it('should preserve error properties', async () => {
      // Arrange
      const error = Object.assign(
        new Error('Error with props'),
        { code: 'EBUSY', statusCode: 503, details: 'Service unavailable' }
      );
      const operation = vi.fn().mockRejectedValue(error);

      // Act
      const promise = withRetry(operation, { maxAttempts: 1 });

      // Assert
      try {
        await promise;
        throw new Error('Should have thrown');
      } catch (err: any) {
        expect(err.code).toBe('EBUSY');
        expect(err.statusCode).toBe(503);
        expect(err.details).toBe('Service unavailable');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle operation that throws synchronously', async () => {
      // Arrange
      const operation = vi.fn(() => {
        throw new Error('Sync error');
      });

      // Act & Assert
      await expect(withRetry(operation)).rejects.toThrow('Sync error');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should handle maxAttempts of 1 (no retries)', async () => {
      // Arrange
      const operation = vi.fn().mockRejectedValue(
        Object.assign(new Error('Fail'), { code: 'EBUSY' })
      );

      // Act & Assert
      await expect(withRetry(operation, { maxAttempts: 1 })).rejects.toThrow('Fail');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should handle delay of 0 (immediate retry)', async () => {
      // Arrange
      const operation = vi.fn()
        .mockRejectedValueOnce(Object.assign(new Error('Fail'), { code: 'EBUSY' }))
        .mockResolvedValueOnce('success');

      // Act
      const promise = withRetry(operation, { initialDelay: 0 });
      await vi.advanceTimersByTimeAsync(0);
      const result = await promise;

      // Assert
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should handle large backoff multiplier', async () => {
      // Arrange
      const operation = vi.fn()
        .mockRejectedValueOnce(Object.assign(new Error('Fail 1'), { code: 'EBUSY' }))
        .mockRejectedValueOnce(Object.assign(new Error('Fail 2'), { code: 'EBUSY' }))
        .mockResolvedValueOnce('success');

      // Act
      const promise = withRetry(operation, {
        initialDelay: 10,
        maxDelay: 5000,
        backoffMultiplier: 100,
      });

      // First retry after 10ms
      await vi.advanceTimersByTimeAsync(10);

      // Second retry capped at maxDelay (5000ms, not 1000ms)
      await vi.advanceTimersByTimeAsync(5000);

      const result = await promise;

      // Assert
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('Default Configuration', () => {
    it('should use default configuration values', async () => {
      // Arrange
      const operation = vi.fn()
        .mockRejectedValueOnce(Object.assign(new Error('Fail 1'), { code: 'EBUSY' }))
        .mockRejectedValueOnce(Object.assign(new Error('Fail 2'), { code: 'EBUSY' }))
        .mockResolvedValueOnce('success');

      // Act - Use defaults: maxAttempts=3, initialDelay=100, backoffMultiplier=2
      const promise = withRetry(operation);

      // First retry after 100ms
      await vi.advanceTimersByTimeAsync(100);

      // Second retry after 200ms
      await vi.advanceTimersByTimeAsync(200);

      const result = await promise;

      // Assert
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should use default retryable error codes', async () => {
      // Arrange - Test all default error codes
      const codes = ['EBUSY', 'ENOENT', 'EAGAIN', 'ETIMEDOUT'];

      for (const code of codes) {
        const operation = vi.fn()
          .mockRejectedValueOnce(Object.assign(new Error(`Error ${code}`), { code }))
          .mockResolvedValueOnce('success');

        // Act
        const promise = withRetry(operation);
        await vi.advanceTimersByTimeAsync(100);
        const result = await promise;

        // Assert
        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(2);
      }
    });
  });

  describe('Partial Configuration', () => {
    it('should merge partial config with defaults', async () => {
      // Arrange
      const operation = vi.fn()
        .mockRejectedValueOnce(Object.assign(new Error('Fail'), { code: 'EBUSY' }))
        .mockResolvedValueOnce('success');

      // Act - Only override maxAttempts, use other defaults
      const promise = withRetry(operation, { maxAttempts: 2 });
      await vi.advanceTimersByTimeAsync(100); // Default initialDelay

      const result = await promise;

      // Assert
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });
});
