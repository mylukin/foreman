import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SagaService, ISagaExecutor } from '../../src/services/saga-service';
import { SagaStep, SagaResult } from '../../src/core/saga-manager';
import { ILogger } from '../../src/infrastructure/logger';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

/**
 * Mock SagaExecutor for testing
 */
class MockSagaExecutor implements ISagaExecutor {
  executeCallCount = 0;
  rollbackCallCount = 0;
  shouldFailExecution = false;
  shouldFailRollback = false;

  async execute(steps: SagaStep[]): Promise<SagaResult> {
    this.executeCallCount++;

    if (this.shouldFailExecution) {
      return {
        success: false,
        completedSteps: [steps[0]?.name || ''],
        failedStep: steps[1]?.name || 'step2',
        error: new Error('Execution failed'),
        rollbackPerformed: true,
        rollbackSuccessful: !this.shouldFailRollback,
      };
    }

    return {
      success: true,
      completedSteps: steps.map(s => s.name),
      rollbackPerformed: false,
    };
  }

  async rollback(): Promise<boolean> {
    this.rollbackCallCount++;
    return !this.shouldFailRollback;
  }

  reset(): void {
    this.executeCallCount = 0;
    this.rollbackCallCount = 0;
    this.shouldFailExecution = false;
    this.shouldFailRollback = false;
  }
}

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
 * Helper to create mock saga steps
 */
function createMockSteps(count: number): SagaStep[] {
  const steps: SagaStep[] = [];

  for (let i = 0; i < count; i++) {
    steps.push({
      name: `step${i + 1}`,
      description: `Description for step ${i + 1}`,
      execute: vi.fn(async () => {}),
      compensate: vi.fn(async () => {}),
    });
  }

  return steps;
}

describe('SagaService', () => {
  let logger: MockLogger;
  let service: SagaService;
  let workspaceDir: string;

  beforeEach(() => {
    // Create temp directory for tests
    workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'saga-service-test-'));
    logger = new MockLogger();
    service = new SagaService(logger, workspaceDir);
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(workspaceDir)) {
      fs.removeSync(workspaceDir);
    }
  });

  describe('validateSteps', () => {
    it('should validate correct saga steps', () => {
      // Arrange
      const steps = createMockSteps(3);

      // Act
      const result = service.validateSteps(steps);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty steps array', () => {
      // Arrange
      const steps: SagaStep[] = [];

      // Act
      const result = service.validateSteps(steps);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Steps array cannot be empty');
    });

    it('should reject step without name', () => {
      // Arrange
      const steps: SagaStep[] = [
        {
          name: '',
          description: 'Test step',
          execute: async () => {},
          compensate: async () => {},
        },
      ];

      // Act
      const result = service.validateSteps(steps);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('name is required'))).toBe(true);
    });

    it('should reject step without description', () => {
      // Arrange
      const steps: SagaStep[] = [
        {
          name: 'test',
          description: '',
          execute: async () => {},
          compensate: async () => {},
        },
      ];

      // Act
      const result = service.validateSteps(steps);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('description is required'))).toBe(true);
    });

    it('should reject step without execute function', () => {
      // Arrange
      const steps: SagaStep[] = [
        {
          name: 'test',
          description: 'Test step',
          execute: null as any,
          compensate: async () => {},
        },
      ];

      // Act
      const result = service.validateSteps(steps);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('execute must be a function'))).toBe(true);
    });

    it('should reject step without compensate function', () => {
      // Arrange
      const steps: SagaStep[] = [
        {
          name: 'test',
          description: 'Test step',
          execute: async () => {},
          compensate: null as any,
        },
      ];

      // Act
      const result = service.validateSteps(steps);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('compensate must be a function'))).toBe(true);
    });

    it('should reject duplicate step names', () => {
      // Arrange
      const steps: SagaStep[] = [
        {
          name: 'duplicate',
          description: 'Step 1',
          execute: async () => {},
          compensate: async () => {},
        },
        {
          name: 'duplicate',
          description: 'Step 2',
          execute: async () => {},
          compensate: async () => {},
        },
      ];

      // Act
      const result = service.validateSteps(steps);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Duplicate step names'))).toBe(true);
    });

    it('should collect multiple validation errors', () => {
      // Arrange
      const steps: SagaStep[] = [
        {
          name: '',
          description: '',
          execute: null as any,
          compensate: null as any,
        },
      ];

      // Act
      const result = service.validateSteps(steps);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    });

    it('should log validation warnings', () => {
      // Arrange
      const steps: SagaStep[] = [];

      // Act
      service.validateSteps(steps);

      // Assert
      expect(logger.logs.some(l => l.level === 'warn' && l.message.includes('validation failed'))).toBe(
        true
      );
    });
  });

  describe('executeSaga', () => {
    it('should execute saga successfully', async () => {
      // Arrange
      const steps = createMockSteps(3);

      // Act
      const result = await service.executeSaga(steps);

      // Assert
      expect(result.success).toBe(true);
      expect(result.completedSteps).toHaveLength(3);
      expect(result.rollbackPerformed).toBe(false);
    });

    it('should log saga start', async () => {
      // Arrange
      const steps = createMockSteps(2);

      // Act
      await service.executeSaga(steps);

      // Assert
      const logEntry = logger.logs.find(l => l.message.includes('Starting saga'));
      expect(logEntry).toBeDefined();
      expect(logEntry?.meta?.stepCount).toBe(2);
      expect(logEntry?.meta?.steps).toEqual(['step1', 'step2']);
    });

    it('should log successful completion', async () => {
      // Arrange
      const steps = createMockSteps(2);

      // Act
      await service.executeSaga(steps);

      // Assert
      expect(logger.logs.some(l => l.level === 'info' && l.message.includes('completed successfully'))).toBe(
        true
      );
    });

    it('should throw error for invalid steps', async () => {
      // Arrange
      const steps: SagaStep[] = [];

      // Act & Assert
      await expect(service.executeSaga(steps)).rejects.toThrow('Saga validation failed');
    });

    it('should log validation errors', async () => {
      // Arrange
      const steps: SagaStep[] = [];

      // Act
      try {
        await service.executeSaga(steps);
      } catch {
        // Expected
      }

      // Assert
      expect(logger.logs.some(l => l.level === 'error' && l.message.includes('validation failed'))).toBe(
        true
      );
    });
  });

  describe('triggerRollback', () => {
    it('should trigger manual rollback successfully', async () => {
      // Arrange
      const executor = new MockSagaExecutor();

      // Act
      const success = await service.triggerRollback(executor);

      // Assert
      expect(success).toBe(true);
      expect(executor.rollbackCallCount).toBe(1);
    });

    it('should handle failed rollback', async () => {
      // Arrange
      const executor = new MockSagaExecutor();
      executor.shouldFailRollback = true;

      // Act
      const success = await service.triggerRollback(executor);

      // Assert
      expect(success).toBe(false);
    });

    it('should log manual rollback warning', async () => {
      // Arrange
      const executor = new MockSagaExecutor();

      // Act
      await service.triggerRollback(executor);

      // Assert
      expect(logger.logs.some(l => l.level === 'warn' && l.message.includes('Manually triggering'))).toBe(
        true
      );
    });

    it('should log successful rollback', async () => {
      // Arrange
      const executor = new MockSagaExecutor();

      // Act
      await service.triggerRollback(executor);

      // Assert
      expect(
        logger.logs.some(l => l.level === 'info' && l.message.includes('rollback completed successfully'))
      ).toBe(true);
    });

    it('should log failed rollback', async () => {
      // Arrange
      const executor = new MockSagaExecutor();
      executor.shouldFailRollback = true;

      // Act
      await service.triggerRollback(executor);

      // Assert
      expect(logger.logs.some(l => l.level === 'error' && l.message.includes('rollback partially failed'))).toBe(
        true
      );
    });

    it('should handle rollback exceptions', async () => {
      // Arrange
      const failingExecutor: ISagaExecutor = {
        execute: async () => ({ success: true, completedSteps: [], rollbackPerformed: false }),
        rollback: async () => {
          throw new Error('Rollback error');
        },
      };

      // Act & Assert
      await expect(service.triggerRollback(failingExecutor)).rejects.toThrow('Rollback error');
    });

    it('should log rollback exceptions', async () => {
      // Arrange
      const failingExecutor: ISagaExecutor = {
        execute: async () => ({ success: true, completedSteps: [], rollbackPerformed: false }),
        rollback: async () => {
          throw new Error('Rollback error');
        },
      };

      // Act
      try {
        await service.triggerRollback(failingExecutor);
      } catch {
        // Expected
      }

      // Assert
      expect(logger.logs.some(l => l.level === 'error' && l.message.includes('rollback threw error'))).toBe(
        true
      );
    });
  });

  describe('integration scenarios', () => {
    it('should handle multi-step saga execution', async () => {
      // Arrange
      const steps = createMockSteps(5);

      // Act
      const result = await service.executeSaga(steps);

      // Assert
      expect(result.success).toBe(true);
      expect(result.completedSteps).toEqual(['step1', 'step2', 'step3', 'step4', 'step5']);
    });

    it('should validate before executing', async () => {
      // Arrange
      const invalidSteps: SagaStep[] = [
        {
          name: 'valid',
          description: 'Valid step',
          execute: async () => {},
          compensate: async () => {},
        },
        {
          name: 'valid', // Duplicate name
          description: 'Another step',
          execute: async () => {},
          compensate: async () => {},
        },
      ];

      // Act & Assert
      await expect(service.executeSaga(invalidSteps)).rejects.toThrow('Saga validation failed');
    });
  });
});
