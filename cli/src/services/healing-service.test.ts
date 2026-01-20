import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HealingService, HealingOperation } from './healing-service';
import { CircuitState } from '../core/circuit-breaker';
import { ILogger } from '../infrastructure/logger';

/**
 * Mock Logger for testing
 */
class MockLogger implements ILogger {
  logs: Array<{ level: string; message: string; meta?: any }> = [];

  debug(message: string, meta?: any): void {
    this.logs.push({ level: 'debug', message, meta });
  }

  info(message: string, meta?: any): void {
    this.logs.push({ level: 'info', message, meta });
  }

  warn(message: string, meta?: any): void {
    this.logs.push({ level: 'warn', message, meta });
  }

  error(message: string, meta?: any): void {
    this.logs.push({ level: 'error', message, meta });
  }

  clear(): void {
    this.logs = [];
  }
}

/**
 * Mock HealingOperation for testing
 */
class MockHealingOperation implements HealingOperation {
  shouldFail = false;
  callCount = 0;

  async heal(): Promise<boolean> {
    this.callCount++;

    if (this.shouldFail) {
      throw new Error('Healing failed');
    }

    return true;
  }

  reset(): void {
    this.shouldFail = false;
    this.callCount = 0;
  }
}

describe('HealingService', () => {
  let logger: MockLogger;
  let service: HealingService;
  let operation: MockHealingOperation;

  beforeEach(() => {
    logger = new MockLogger();
    service = new HealingService(logger);
    operation = new MockHealingOperation();
  });

  describe('attemptHealing', () => {
    it('should heal successfully on first attempt', async () => {
      // Arrange
      const taskId = 'test.task';

      // Act
      const result = await service.attemptHealing(taskId, operation);

      // Assert
      expect(result.success).toBe(true);
      expect(result.taskId).toBe(taskId);
      expect(result.attemptNumber).toBe(1);
      expect(result.circuitState).toBe(CircuitState.CLOSED);
      expect(result.error).toBeUndefined();
    });

    it('should increment attempt number for same task', async () => {
      // Arrange
      const taskId = 'test.task';

      // Act
      const result1 = await service.attemptHealing(taskId, operation);
      const result2 = await service.attemptHealing(taskId, operation);
      const result3 = await service.attemptHealing(taskId, operation);

      // Assert
      expect(result1.attemptNumber).toBe(1);
      expect(result2.attemptNumber).toBe(2);
      expect(result3.attemptNumber).toBe(3);
    });

    it('should track attempts separately for different tasks', async () => {
      // Arrange
      const task1 = 'task1';
      const task2 = 'task2';

      // Act
      await service.attemptHealing(task1, operation);
      await service.attemptHealing(task1, operation);
      await service.attemptHealing(task2, operation);

      // Assert
      const result1 = await service.attemptHealing(task1, operation);
      const result2 = await service.attemptHealing(task2, operation);

      expect(result1.attemptNumber).toBe(3);
      expect(result2.attemptNumber).toBe(2);
    });

    it('should handle healing failure', async () => {
      // Arrange
      const taskId = 'failing.task';
      operation.shouldFail = true;

      // Act
      const result = await service.attemptHealing(taskId, operation);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Healing failed');
    });

    it('should log healing attempt', async () => {
      // Arrange
      const taskId = 'test.task';

      // Act
      await service.attemptHealing(taskId, operation);

      // Assert
      expect(logger.logs.some(l => l.level === 'info' && l.message.includes('Attempting to heal'))).toBe(
        true
      );
    });

    it('should log successful healing', async () => {
      // Arrange
      const taskId = 'test.task';

      // Act
      await service.attemptHealing(taskId, operation);

      // Assert
      expect(logger.logs.some(l => l.level === 'info' && l.message.includes('Healing succeeded'))).toBe(
        true
      );
    });

    it('should log failed healing', async () => {
      // Arrange
      const taskId = 'failing.task';
      operation.shouldFail = true;

      // Act
      await service.attemptHealing(taskId, operation);

      // Assert
      expect(logger.logs.some(l => l.level === 'error' && l.message.includes('Healing failed'))).toBe(
        true
      );
    });
  });

  describe('circuit breaker integration', () => {
    it('should open circuit after failure threshold', async () => {
      // Arrange
      service = new HealingService(logger, { failureThreshold: 3 });
      operation.shouldFail = true;
      const taskId = 'failing.task';

      // Act - Fail 3 times to reach threshold
      await service.attemptHealing(taskId, operation);
      await service.attemptHealing(taskId, operation);
      await service.attemptHealing(taskId, operation);

      // Assert
      expect(service.getCircuitState()).toBe(CircuitState.OPEN);
    });

    it('should block healing when circuit is open', async () => {
      // Arrange
      service = new HealingService(logger, { failureThreshold: 2 });
      operation.shouldFail = true;
      const taskId = 'failing.task';

      // Fail twice to open circuit
      await service.attemptHealing(taskId, operation);
      await service.attemptHealing(taskId, operation);

      // Act - Try to heal after circuit opens
      operation.shouldFail = false; // Operation would succeed, but circuit is open
      const result = await service.attemptHealing(taskId, operation);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Circuit breaker is OPEN');
      expect(operation.callCount).toBe(2); // Third call blocked
    });

    it('should log when circuit opens', async () => {
      // Arrange
      service = new HealingService(logger, { failureThreshold: 2 });
      operation.shouldFail = true;
      const taskId = 'failing.task';

      // Act
      await service.attemptHealing(taskId, operation);
      await service.attemptHealing(taskId, operation);

      // Assert
      expect(
        logger.logs.some(l => l.level === 'error' && l.message.includes('Circuit breaker opened'))
      ).toBe(true);
    });

    it('should return correct circuit state in result', async () => {
      // Arrange
      service = new HealingService(logger, { failureThreshold: 2 });
      operation.shouldFail = true;
      const taskId = 'failing.task';

      // Act
      const result1 = await service.attemptHealing(taskId, operation);
      const result2 = await service.attemptHealing(taskId, operation);

      // Assert
      expect(result1.circuitState).toBe(CircuitState.CLOSED);
      expect(result2.circuitState).toBe(CircuitState.OPEN);
    });
  });

  describe('getHealingStats', () => {
    it('should return initial stats', () => {
      // Act
      const stats = service.getHealingStats();

      // Assert
      expect(stats.totalAttempts).toBe(0);
      expect(stats.successfulAttempts).toBe(0);
      expect(stats.failedAttempts).toBe(0);
      expect(stats.circuitOpenCount).toBe(0);
      expect(stats.currentCircuitState).toBe(CircuitState.CLOSED);
    });

    it('should track successful attempts', async () => {
      // Arrange
      const taskId = 'test.task';

      // Act
      await service.attemptHealing(taskId, operation);
      await service.attemptHealing(taskId, operation);
      const stats = service.getHealingStats();

      // Assert
      expect(stats.totalAttempts).toBe(2);
      expect(stats.successfulAttempts).toBe(2);
      expect(stats.failedAttempts).toBe(0);
    });

    it('should track failed attempts', async () => {
      // Arrange
      operation.shouldFail = true;
      const taskId = 'failing.task';

      // Act
      await service.attemptHealing(taskId, operation);
      await service.attemptHealing(taskId, operation);
      const stats = service.getHealingStats();

      // Assert
      expect(stats.totalAttempts).toBe(2);
      expect(stats.successfulAttempts).toBe(0);
      expect(stats.failedAttempts).toBe(2);
    });

    it('should track mixed success and failure', async () => {
      // Arrange
      const taskId = 'test.task';

      // Act
      await service.attemptHealing(taskId, operation); // Success
      operation.shouldFail = true;
      await service.attemptHealing(taskId, operation); // Failure
      operation.shouldFail = false;
      await service.attemptHealing(taskId, operation); // Success

      const stats = service.getHealingStats();

      // Assert
      expect(stats.totalAttempts).toBe(3);
      expect(stats.successfulAttempts).toBe(2);
      expect(stats.failedAttempts).toBe(1);
    });

    it('should count circuit open events', async () => {
      // Arrange
      service = new HealingService(logger, { failureThreshold: 2 });
      operation.shouldFail = true;
      const taskId = 'failing.task';

      // Act - Open circuit
      await service.attemptHealing(taskId, operation);
      await service.attemptHealing(taskId, operation);

      const stats = service.getHealingStats();

      // Assert
      expect(stats.circuitOpenCount).toBe(1);
      expect(stats.currentCircuitState).toBe(CircuitState.OPEN);
    });

    it('should return copy of stats', async () => {
      // Act
      const stats1 = service.getHealingStats();
      await service.attemptHealing('test.task', operation);
      const stats2 = service.getHealingStats();

      // Assert
      expect(stats1).not.toBe(stats2);
      expect(stats1.totalAttempts).toBe(0);
      expect(stats2.totalAttempts).toBe(1);
    });
  });

  describe('getCircuitState', () => {
    it('should return CLOSED initially', () => {
      // Act
      const state = service.getCircuitState();

      // Assert
      expect(state).toBe(CircuitState.CLOSED);
    });

    it('should return OPEN after failures', async () => {
      // Arrange
      service = new HealingService(logger, { failureThreshold: 2 });
      operation.shouldFail = true;

      // Act
      await service.attemptHealing('task', operation);
      await service.attemptHealing('task', operation);

      // Assert
      expect(service.getCircuitState()).toBe(CircuitState.OPEN);
    });
  });

  describe('resetCircuit', () => {
    it('should reset circuit state to CLOSED', async () => {
      // Arrange
      service = new HealingService(logger, { failureThreshold: 2 });
      operation.shouldFail = true;

      // Open circuit
      await service.attemptHealing('task', operation);
      await service.attemptHealing('task', operation);
      expect(service.getCircuitState()).toBe(CircuitState.OPEN);

      // Act
      service.resetCircuit();

      // Assert
      expect(service.getCircuitState()).toBe(CircuitState.CLOSED);
    });

    it('should allow healing after reset', async () => {
      // Arrange
      service = new HealingService(logger, { failureThreshold: 2 });
      operation.shouldFail = true;

      // Open circuit
      await service.attemptHealing('task', operation);
      await service.attemptHealing('task', operation);

      // Act - Reset and try again
      service.resetCircuit();
      operation.shouldFail = false;
      const result = await service.attemptHealing('task', operation);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should log circuit reset', () => {
      // Act
      service.resetCircuit();

      // Assert
      expect(logger.logs.some(l => l.level === 'info' && l.message.includes('Resetting circuit'))).toBe(
        true
      );
    });
  });

  describe('edge cases', () => {
    it('should handle operation returning false', async () => {
      // Arrange
      const failingOperation: HealingOperation = {
        heal: vi.fn(async () => false),
      };

      // Act
      const result = await service.attemptHealing('task', failingOperation);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeUndefined();
      expect(
        logger.logs.some(l => l.level === 'warn' && l.message.includes('returned false'))
      ).toBe(true);
    });

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const throwingOperation: HealingOperation = {
        heal: vi.fn(async () => {
          throw 'String error';
        }),
      };

      // Act
      const result = await service.attemptHealing('task', throwingOperation);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('String error');
    });

    it('should handle concurrent healing attempts', async () => {
      // Arrange
      const tasks = ['task1', 'task2', 'task3', 'task4', 'task5'];

      // Act
      const results = await Promise.all(
        tasks.map(taskId => service.attemptHealing(taskId, operation))
      );

      // Assert
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.taskId).toBe(tasks[index]);
        expect(result.attemptNumber).toBe(1);
      });

      const stats = service.getHealingStats();
      expect(stats.totalAttempts).toBe(5);
      expect(stats.successfulAttempts).toBe(5);
    });
  });
});
