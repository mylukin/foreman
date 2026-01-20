import { describe, it, expect, beforeEach } from 'vitest';
import { Task, TaskConfig } from '../../src/domain/task-entity';

describe('Task Domain Entity', () => {
  let baseConfig: TaskConfig;

  beforeEach(() => {
    baseConfig = {
      id: 'test.task',
      module: 'test',
      priority: 1,
      status: 'pending',
      description: 'Test task',
      acceptanceCriteria: ['Criterion 1', 'Criterion 2'],
      estimatedMinutes: 30,
      dependencies: [],
    };
  });

  describe('constructor', () => {
    it('should create task with all fields', () => {
      // Arrange
      const config: TaskConfig = {
        ...baseConfig,
        estimatedMinutes: 25,
        dependencies: ['dep1', 'dep2'],
        testRequirements: {
          unit: { required: true, pattern: '**/*.test.ts' },
        },
        notes: 'Test notes',
      };

      // Act
      const task = new Task(config);

      // Assert
      expect(task.id).toBe('test.task');
      expect(task.module).toBe('test');
      expect(task.priority).toBe(1);
      expect(task.status).toBe('pending');
      expect(task.description).toBe('Test task');
      expect(task.acceptanceCriteria).toEqual(['Criterion 1', 'Criterion 2']);
      expect(task.estimatedMinutes).toBe(25);
      expect(task.dependencies).toEqual(['dep1', 'dep2']);
      expect(task.testRequirements).toEqual({
        unit: { required: true, pattern: '**/*.test.ts' },
      });
      expect(task.notes).toBe('Test notes');
    });

    it('should parse startedAt timestamp', () => {
      // Arrange
      const config: TaskConfig = {
        ...baseConfig,
        startedAt: '2026-01-20T10:00:00.000Z',
      };

      // Act
      const task = new Task(config);

      // Assert
      expect(task.startedAt).toBeInstanceOf(Date);
      expect(task.startedAt?.toISOString()).toBe('2026-01-20T10:00:00.000Z');
    });

    it('should parse completedAt timestamp', () => {
      // Arrange
      const config: TaskConfig = {
        ...baseConfig,
        completedAt: '2026-01-20T10:30:00.000Z',
      };

      // Act
      const task = new Task(config);

      // Assert
      expect(task.completedAt).toBeInstanceOf(Date);
      expect(task.completedAt?.toISOString()).toBe('2026-01-20T10:30:00.000Z');
    });

    it('should handle undefined optional fields', () => {
      // Arrange
      const config: TaskConfig = {
        id: 'test.task',
        module: 'test',
        priority: 1,
        status: 'pending',
        description: 'Test task',
        acceptanceCriteria: ['Criterion 1'],
      };

      // Act
      const task = new Task(config);

      // Assert
      expect(task.estimatedMinutes).toBeUndefined();
      expect(task.dependencies).toEqual([]);
      expect(task.testRequirements).toBeUndefined();
      expect(task.notes).toBeUndefined();
      expect(task.startedAt).toBeUndefined();
      expect(task.completedAt).toBeUndefined();
      expect(task.failedAt).toBeUndefined();
    });
  });

  describe('canStart', () => {
    it('should return true when status is pending', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'pending' });

      // Act
      const result = task.canStart();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when status is in_progress', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'in_progress' });

      // Act
      const result = task.canStart();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when status is completed', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'completed' });

      // Act
      const result = task.canStart();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when status is failed', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'failed' });

      // Act
      const result = task.canStart();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('start', () => {
    it('should transition from pending to in_progress', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'pending' });

      // Act
      task.start();

      // Assert
      expect(task.status).toBe('in_progress');
      expect(task.startedAt).toBeInstanceOf(Date);
    });

    it('should set startedAt timestamp', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'pending' });
      const beforeStart = new Date();

      // Act
      task.start();

      // Assert
      const afterStart = new Date();
      expect(task.startedAt).toBeDefined();
      expect(task.startedAt!.getTime()).toBeGreaterThanOrEqual(beforeStart.getTime());
      expect(task.startedAt!.getTime()).toBeLessThanOrEqual(afterStart.getTime());
    });

    it('should throw error when starting in_progress task', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'in_progress' });

      // Act & Assert
      expect(() => task.start()).toThrow(
        'Cannot start task test.task: current status is in_progress. Only pending tasks can be started.'
      );
    });

    it('should throw error when starting completed task', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'completed' });

      // Act & Assert
      expect(() => task.start()).toThrow(
        'Cannot start task test.task: current status is completed. Only pending tasks can be started.'
      );
    });

    it('should throw error when starting failed task', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'failed' });

      // Act & Assert
      expect(() => task.start()).toThrow(
        'Cannot start task test.task: current status is failed. Only pending tasks can be started.'
      );
    });
  });

  describe('complete', () => {
    it('should transition from in_progress to completed', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'in_progress' });

      // Act
      task.complete();

      // Assert
      expect(task.status).toBe('completed');
      expect(task.completedAt).toBeInstanceOf(Date);
    });

    it('should set completedAt timestamp', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'in_progress' });
      const beforeComplete = new Date();

      // Act
      task.complete();

      // Assert
      const afterComplete = new Date();
      expect(task.completedAt).toBeDefined();
      expect(task.completedAt!.getTime()).toBeGreaterThanOrEqual(beforeComplete.getTime());
      expect(task.completedAt!.getTime()).toBeLessThanOrEqual(afterComplete.getTime());
    });

    it('should throw error when completing pending task', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'pending' });

      // Act & Assert
      expect(() => task.complete()).toThrow(
        'Cannot complete task test.task: current status is pending. Only in_progress tasks can be completed.'
      );
    });

    it('should throw error when completing already completed task', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'completed' });

      // Act & Assert
      expect(() => task.complete()).toThrow(
        'Cannot complete task test.task: current status is completed. Only in_progress tasks can be completed.'
      );
    });
  });

  describe('fail', () => {
    it('should transition from in_progress to failed', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'in_progress' });

      // Act
      task.fail();

      // Assert
      expect(task.status).toBe('failed');
      expect(task.failedAt).toBeInstanceOf(Date);
    });

    it('should set failedAt timestamp', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'in_progress' });
      const beforeFail = new Date();

      // Act
      task.fail();

      // Assert
      const afterFail = new Date();
      expect(task.failedAt).toBeDefined();
      expect(task.failedAt!.getTime()).toBeGreaterThanOrEqual(beforeFail.getTime());
      expect(task.failedAt!.getTime()).toBeLessThanOrEqual(afterFail.getTime());
    });


    it('should throw error when failing pending task', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'pending' });

      // Act & Assert
      expect(() => task.fail()).toThrow(
        'Cannot fail task test.task: current status is pending. Only in_progress tasks can be failed.'
      );
    });

    it('should throw error when failing completed task', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'completed' });

      // Act & Assert
      expect(() => task.fail()).toThrow(
        'Cannot fail task test.task: current status is completed. Only in_progress tasks can be failed.'
      );
    });
  });

  describe('isBlocked', () => {
    it('should return false when task has no dependencies', () => {
      // Arrange
      const task = new Task({ ...baseConfig, dependencies: [] });
      const completedTasks = new Set<string>([]);

      // Act
      const result = task.isBlocked(completedTasks);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when all dependencies are completed', () => {
      // Arrange
      const task = new Task({
        ...baseConfig,
        dependencies: ['dep1', 'dep2'],
      });
      const completedTasks = new Set<string>(['dep1', 'dep2']);

      // Act
      const result = task.isBlocked(completedTasks);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true when some dependencies are not completed', () => {
      // Arrange
      const task = new Task({
        ...baseConfig,
        dependencies: ['dep1', 'dep2', 'dep3'],
      });
      const completedTasks = new Set<string>(['dep1']); // only dep1 completed

      // Act
      const result = task.isBlocked(completedTasks);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when no dependencies are completed', () => {
      // Arrange
      const task = new Task({
        ...baseConfig,
        dependencies: ['dep1', 'dep2'],
      });
      const completedTasks = new Set<string>([]);

      // Act
      const result = task.isBlocked(completedTasks);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('getActualDuration', () => {
    it('should return undefined when task has not started', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'pending' });

      // Act
      const result = task.getActualDuration();

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined when task is in progress', () => {
      // Arrange
      const task = new Task({
        ...baseConfig,
        status: 'in_progress',
        startedAt: '2026-01-20T10:00:00.000Z',
      });

      // Act
      const result = task.getActualDuration();

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return duration in minutes when task is completed', () => {
      // Arrange
      const task = new Task({
        ...baseConfig,
        status: 'completed',
        startedAt: '2026-01-20T10:00:00.000Z',
        completedAt: '2026-01-20T10:25:00.000Z', // 25 minutes
      });

      // Act
      const result = task.getActualDuration();

      // Assert
      expect(result).toBe(25);
    });

    it('should return duration in minutes when task is failed', () => {
      // Arrange
      const task = new Task({
        ...baseConfig,
        status: 'failed',
        startedAt: '2026-01-20T10:00:00.000Z',
        failedAt: '2026-01-20T10:45:00.000Z', // 45 minutes
      });

      // Act
      const result = task.getActualDuration();

      // Assert
      expect(result).toBe(45);
    });

    it('should round duration to nearest minute', () => {
      // Arrange
      const task = new Task({
        ...baseConfig,
        status: 'completed',
        startedAt: '2026-01-20T10:00:00.000Z',
        completedAt: '2026-01-20T10:25:30.000Z', // 25.5 minutes
      });

      // Act
      const result = task.getActualDuration();

      // Assert
      expect(result).toBe(26); // Rounded up
    });
  });

  describe('isOverEstimate', () => {
    it('should return false when no estimated minutes', () => {
      // Arrange
      const task = new Task({
        ...baseConfig,
        estimatedMinutes: undefined,
        status: 'completed',
        startedAt: '2026-01-20T10:00:00.000Z',
        completedAt: '2026-01-20T11:00:00.000Z', // 60 minutes
      });

      // Act
      const result = task.isOverEstimate();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when task not completed', () => {
      // Arrange
      const task = new Task({
        ...baseConfig,
        estimatedMinutes: 30,
        status: 'in_progress',
      });

      // Act
      const result = task.isOverEstimate();

      // Assert
      expect(result).toBe(false);
    });

    it('should return true when actual duration exceeds estimate', () => {
      // Arrange
      const task = new Task({
        ...baseConfig,
        estimatedMinutes: 30,
        status: 'completed',
        startedAt: '2026-01-20T10:00:00.000Z',
        completedAt: '2026-01-20T10:45:00.000Z', // 45 minutes
      });

      // Act
      const result = task.isOverEstimate();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when actual duration equals estimate', () => {
      // Arrange
      const task = new Task({
        ...baseConfig,
        estimatedMinutes: 30,
        status: 'completed',
        startedAt: '2026-01-20T10:00:00.000Z',
        completedAt: '2026-01-20T10:30:00.000Z', // 30 minutes
      });

      // Act
      const result = task.isOverEstimate();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when actual duration is under estimate', () => {
      // Arrange
      const task = new Task({
        ...baseConfig,
        estimatedMinutes: 30,
        status: 'completed',
        startedAt: '2026-01-20T10:00:00.000Z',
        completedAt: '2026-01-20T10:20:00.000Z', // 20 minutes
      });

      // Act
      const result = task.isOverEstimate();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getCompletionPercentage', () => {
    it('should return 0 for pending task', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'pending' });

      // Act
      const result = task.getCompletionPercentage();

      // Assert
      expect(result).toBe(0);
    });

    it('should return 50 for in_progress task', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'in_progress' });

      // Act
      const result = task.getCompletionPercentage();

      // Assert
      expect(result).toBe(50);
    });

    it('should return 100 for completed task', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'completed' });

      // Act
      const result = task.getCompletionPercentage();

      // Assert
      expect(result).toBe(100);
    });

    it('should return 0 for failed task', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'failed' });

      // Act
      const result = task.getCompletionPercentage();

      // Assert
      expect(result).toBe(0);
    });

    it('should return 0 for blocked task', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'blocked' });

      // Act
      const result = task.getCompletionPercentage();

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('isTerminal', () => {
    it('should return false for pending task', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'pending' });

      // Act
      const result = task.isTerminal();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for in_progress task', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'in_progress' });

      // Act
      const result = task.isTerminal();

      // Assert
      expect(result).toBe(false);
    });

    it('should return true for completed task', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'completed' });

      // Act
      const result = task.isTerminal();

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for failed task', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'failed' });

      // Act
      const result = task.isTerminal();

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('hasDependencies', () => {
    it('should return false when dependencies array is empty', () => {
      // Arrange
      const task = new Task({ ...baseConfig, dependencies: [] });

      // Act
      const result = task.hasDependencies();

      // Assert
      expect(result).toBe(false);
    });

    it('should return true when dependencies exist', () => {
      // Arrange
      const task = new Task({
        ...baseConfig,
        dependencies: ['dep1'],
      });

      // Act
      const result = task.hasDependencies();

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('should serialize all fields to plain object', () => {
      // Arrange
      const config: TaskConfig = {
        id: 'test.task',
        module: 'test',
        priority: 1,
        status: 'completed',
        description: 'Test task',
        acceptanceCriteria: ['Criterion 1'],
        estimatedMinutes: 30,
        dependencies: ['dep1'],
        testRequirements: {
          unit: { required: true, pattern: '**/*.test.ts' },
        },
        notes: 'Test notes',
        startedAt: '2026-01-20T10:00:00.000Z',
        completedAt: '2026-01-20T10:30:00.000Z',
      };
      const task = new Task(config);

      // Act
      const result = task.toJSON();

      // Assert
      expect(result).toEqual(config);
    });

    it('should convert Date objects to ISO strings', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'pending' });
      task.start();
      task.complete();

      // Act
      const result = task.toJSON();

      // Assert
      expect(typeof result.startedAt).toBe('string');
      expect(typeof result.completedAt).toBe('string');
      expect(result.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('fromJSON', () => {
    it('should create Task from plain object', () => {
      // Arrange
      const config: TaskConfig = {
        id: 'test.task',
        module: 'test',
        priority: 1,
        status: 'pending',
        description: 'Test task',
        acceptanceCriteria: ['Criterion 1'],
        estimatedMinutes: 30,
      };

      // Act
      const task = Task.fromJSON(config);

      // Assert
      expect(task).toBeInstanceOf(Task);
      expect(task.id).toBe('test.task');
      expect(task.status).toBe('pending');
    });

    it('should round-trip through toJSON and fromJSON', () => {
      // Arrange
      const task1 = new Task({ ...baseConfig });
      task1.start();
      task1.complete();

      // Act
      const json = task1.toJSON();
      const task2 = Task.fromJSON(json);

      // Assert
      expect(task2.status).toBe('completed');
      expect(task2.startedAt?.getTime()).toBe(task1.startedAt?.getTime());
      expect(task2.completedAt?.getTime()).toBe(task1.completedAt?.getTime());
    });
  });

  describe('workflow integration', () => {
    it('should support full lifecycle: pending → in_progress → completed', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'pending' });

      // Act & Assert - pending
      expect(task.canStart()).toBe(true);
      expect(task.status).toBe('pending');

      // Act & Assert - start
      task.start();
      expect(task.status).toBe('in_progress');
      expect(task.startedAt).toBeDefined();

      // Act & Assert - complete
      task.complete();
      expect(task.status).toBe('completed');
      expect(task.completedAt).toBeDefined();
      expect(task.isTerminal()).toBe(true);
    });

    it('should support failure workflow: pending → in_progress → failed', () => {
      // Arrange
      const task = new Task({ ...baseConfig, status: 'pending' });

      // Act & Assert
      task.start();
      expect(task.status).toBe('in_progress');

      task.fail();
      expect(task.status).toBe('failed');
      expect(task.failedAt).toBeDefined();
      expect(task.isTerminal()).toBe(true);
    });
  });
});
