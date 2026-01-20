import { describe, it, expect, beforeEach } from 'vitest';
import { TaskService, CreateTaskInput, BatchOperation } from '../../src/services/task-service';
import { Task } from '../../src/domain/task-entity';
import { ITaskRepository, TaskFilter } from '../../src/repositories/task-repository';
import { IStateRepository, StateUpdate, StateConfig } from '../../src/repositories/state-repository';
import { State } from '../../src/domain/state-entity';
import { ILogger } from '../../src/infrastructure/logger';

/**
 * Mock TaskRepository for testing
 */
class MockTaskRepository implements ITaskRepository {
  private tasks = new Map<string, Task>();

  async findById(id: string): Promise<Task | null> {
    return this.tasks.get(id) || null;
  }

  async findAll(filter?: TaskFilter): Promise<Task[]> {
    let tasks = Array.from(this.tasks.values());

    if (filter?.status) {
      tasks = tasks.filter((t) => t.status === filter.status);
    }
    if (filter?.module) {
      tasks = tasks.filter((t) => t.module === filter.module);
    }
    if (filter?.priority !== undefined) {
      tasks = tasks.filter((t) => t.priority === filter.priority);
    }
    if (filter?.hasDependencies) {
      tasks = tasks.filter((t) => t.dependencies && t.dependencies.length > 0);
    }

    return tasks;
  }

  async save(task: Task): Promise<void> {
    this.tasks.set(task.id, task);
  }

  async delete(id: string): Promise<void> {
    this.tasks.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    return this.tasks.has(id);
  }

  // Test helper
  addTask(task: Task): void {
    this.tasks.set(task.id, task);
  }

  clear(): void {
    this.tasks.clear();
  }
}

/**
 * Mock StateRepository for testing
 */
class MockStateRepository implements IStateRepository {
  private state: State | null = null;

  async get(): Promise<State | null> {
    return this.state;
  }

  async set(stateConfig: Omit<StateConfig, 'updatedAt'>): Promise<void> {
    this.state = State.fromJSON({
      ...stateConfig,
      updatedAt: new Date().toISOString(),
    });
  }

  async update(updates: StateUpdate): Promise<void> {
    if (!this.state) {
      throw new Error('No state to update');
    }
    if (updates.currentTask !== undefined) {
      this.state.setCurrentTask(updates.currentTask);
    }
    if (updates.phase) {
      this.state.transitionTo(updates.phase);
    }
  }

  async clear(): Promise<void> {
    this.state = null;
  }

  async exists(): Promise<boolean> {
    return this.state !== null;
  }

  // Test helper
  setState(state: State): void {
    this.state = state;
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

describe('TaskService', () => {
  let taskRepo: MockTaskRepository;
  let stateRepo: MockStateRepository;
  let logger: MockLogger;
  let service: TaskService;

  beforeEach(() => {
    taskRepo = new MockTaskRepository();
    stateRepo = new MockStateRepository();
    logger = new MockLogger();
    service = new TaskService(taskRepo, stateRepo, logger);
  });

  describe('createTask', () => {
    it('should create task with all fields', async () => {
      // Arrange
      const input: CreateTaskInput = {
        id: 'auth.login',
        module: 'auth',
        priority: 2,
        estimatedMinutes: 25,
        description: 'Implement login feature',
        acceptanceCriteria: ['Criterion 1', 'Criterion 2'],
        dependencies: ['setup.scaffold'],
        testPattern: '**/*.test.ts',
      };

      // Act
      const task = await service.createTask(input);

      // Assert
      expect(task.id).toBe('auth.login');
      expect(task.module).toBe('auth');
      expect(task.priority).toBe(2);
      expect(task.status).toBe('pending');
      expect(task.estimatedMinutes).toBe(25);
      expect(task.description).toBe('Implement login feature');
      expect(task.acceptanceCriteria).toEqual(['Criterion 1', 'Criterion 2']);
      expect(task.dependencies).toEqual(['setup.scaffold']);
      expect(task.testRequirements).toBeDefined();
      expect(task.testRequirements?.unit?.pattern).toBe('**/*.test.ts');
    });

    it('should create task with default values', async () => {
      // Arrange
      const input: CreateTaskInput = {
        id: 'simple.task',
        module: 'simple',
        description: 'Simple task',
      };

      // Act
      const task = await service.createTask(input);

      // Assert
      expect(task.priority).toBe(1); // Default
      expect(task.estimatedMinutes).toBe(30); // Default
      expect(task.acceptanceCriteria).toEqual([]);
      expect(task.dependencies).toEqual([]);
      expect(task.testRequirements).toBeUndefined();
    });

    it('should throw error when task already exists', async () => {
      // Arrange
      const existing = new Task({
        id: 'duplicate.task',
        module: 'test',
        priority: 1,
        status: 'pending',
        estimatedMinutes: 30,
        description: 'Existing task',
        acceptanceCriteria: [],
        dependencies: [],
        notes: '',
      });
      taskRepo.addTask(existing);

      const input: CreateTaskInput = {
        id: 'duplicate.task',
        module: 'test',
        description: 'Duplicate task',
      };

      // Act & Assert
      await expect(service.createTask(input)).rejects.toThrow('Task already exists: duplicate.task');
    });

    it('should log task creation', async () => {
      // Arrange
      const input: CreateTaskInput = {
        id: 'test.task',
        module: 'test',
        description: 'Test task',
      };

      // Act
      await service.createTask(input);

      // Assert
      expect(logger.logs).toContainEqual({
        level: 'info',
        message: 'Creating task: test.task',
        meta: undefined,
      });
      expect(logger.logs).toContainEqual({
        level: 'info',
        message: 'Task created: test.task',
        meta: undefined,
      });
    });
  });

  describe('getTask', () => {
    it('should return task when found', async () => {
      // Arrange
      const task = new Task({
        id: 'existing.task',
        module: 'test',
        priority: 1,
        status: 'pending',
        estimatedMinutes: 30,
        description: 'Existing task',
        acceptanceCriteria: [],
        dependencies: [],
        notes: '',
      });
      taskRepo.addTask(task);

      // Act
      const result = await service.getTask('existing.task');

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe('existing.task');
    });

    it('should return null when task not found', async () => {
      // Act
      const result = await service.getTask('nonexistent.task');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('listTasks', () => {
    beforeEach(() => {
      // Add sample tasks
      taskRepo.addTask(
        new Task({
          id: 'task1',
          module: 'auth',
          priority: 1,
          status: 'pending',
          estimatedMinutes: 30,
          description: 'Task 1',
          acceptanceCriteria: [],
          dependencies: [],
          notes: '',
        })
      );
      taskRepo.addTask(
        new Task({
          id: 'task2',
          module: 'auth',
          priority: 2,
          status: 'completed',
          estimatedMinutes: 20,
          description: 'Task 2',
          acceptanceCriteria: [],
          dependencies: [],
          notes: '',
        })
      );
      taskRepo.addTask(
        new Task({
          id: 'task3',
          module: 'api',
          priority: 3,
          status: 'pending',
          estimatedMinutes: 40,
          description: 'Task 3',
          acceptanceCriteria: [],
          dependencies: ['task2'],
          notes: '',
        })
      );
    });

    it('should list all tasks with default options', async () => {
      // Act
      const result = await service.listTasks();

      // Assert
      expect(result.total).toBe(3);
      expect(result.returned).toBe(3);
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(100);
      expect(result.tasks).toHaveLength(3);
    });

    it('should filter tasks by status', async () => {
      // Act
      const result = await service.listTasks({
        filter: { status: 'pending' },
      });

      // Assert
      expect(result.total).toBe(2);
      expect(result.tasks.every((t) => t.status === 'pending')).toBe(true);
    });

    it('should filter tasks by module', async () => {
      // Act
      const result = await service.listTasks({
        filter: { module: 'auth' },
      });

      // Assert
      expect(result.total).toBe(2);
      expect(result.tasks.every((t) => t.module === 'auth')).toBe(true);
    });

    it('should filter tasks by priority', async () => {
      // Act
      const result = await service.listTasks({
        filter: { priority: 1 },
      });

      // Assert
      expect(result.total).toBe(1);
      expect(result.tasks[0].priority).toBe(1);
    });

    it('should filter ready tasks (dependencies satisfied)', async () => {
      // Act
      const result = await service.listTasks({
        filter: { ready: true },
      });

      // Assert
      // task1 has no dependencies → ready
      // task2 is completed → not ready
      // task3 depends on task2 (completed) → ready
      expect(result.total).toBe(2);
      const ids = result.tasks.map((t) => t.id);
      expect(ids).toContain('task1');
      expect(ids).toContain('task3');
    });

    it('should sort tasks by priority', async () => {
      // Act
      const result = await service.listTasks({
        sort: 'priority',
      });

      // Assert
      expect(result.tasks[0].priority).toBe(1);
      expect(result.tasks[1].priority).toBe(2);
      expect(result.tasks[2].priority).toBe(3);
    });

    it('should sort tasks by status', async () => {
      // Act
      const result = await service.listTasks({
        sort: 'status',
      });

      // Assert
      expect(result.tasks[0].status).toBe('completed');
      expect(result.tasks[1].status).toBe('pending');
      expect(result.tasks[2].status).toBe('pending');
    });

    it('should sort tasks by estimatedMinutes', async () => {
      // Act
      const result = await service.listTasks({
        sort: 'estimatedMinutes',
      });

      // Assert
      expect(result.tasks[0].estimatedMinutes).toBe(20);
      expect(result.tasks[1].estimatedMinutes).toBe(30);
      expect(result.tasks[2].estimatedMinutes).toBe(40);
    });

    it('should paginate tasks', async () => {
      // Act
      const result = await service.listTasks({
        offset: 1,
        limit: 1,
      });

      // Assert
      expect(result.total).toBe(3);
      expect(result.returned).toBe(1);
      expect(result.offset).toBe(1);
      expect(result.limit).toBe(1);
      expect(result.tasks).toHaveLength(1);
    });
  });

  describe('getNextTask', () => {
    it('should return highest priority task with no dependencies', async () => {
      // Arrange
      taskRepo.addTask(
        new Task({
          id: 'task1',
          module: 'test',
          priority: 2,
          status: 'pending',
          estimatedMinutes: 30,
          description: 'Task 1',
          acceptanceCriteria: [],
          dependencies: [],
          notes: '',
        })
      );
      taskRepo.addTask(
        new Task({
          id: 'task2',
          module: 'test',
          priority: 1,
          status: 'pending',
          estimatedMinutes: 30,
          description: 'Task 2',
          acceptanceCriteria: [],
          dependencies: [],
          notes: '',
        })
      );

      // Act
      const nextTask = await service.getNextTask();

      // Assert
      expect(nextTask).toBeDefined();
      expect(nextTask?.id).toBe('task2'); // Lower priority number = higher priority
    });

    it('should skip tasks with unsatisfied dependencies', async () => {
      // Arrange
      taskRepo.addTask(
        new Task({
          id: 'task1',
          module: 'test',
          priority: 1,
          status: 'pending',
          estimatedMinutes: 30,
          description: 'Task 1',
          acceptanceCriteria: [],
          dependencies: ['task2'], // Blocked
          notes: '',
        })
      );
      taskRepo.addTask(
        new Task({
          id: 'task2',
          module: 'test',
          priority: 2,
          status: 'pending', // Not completed
          estimatedMinutes: 30,
          description: 'Task 2',
          acceptanceCriteria: [],
          dependencies: [],
          notes: '',
        })
      );

      // Act
      const nextTask = await service.getNextTask();

      // Assert
      expect(nextTask).toBeDefined();
      expect(nextTask?.id).toBe('task2'); // task1 is blocked
    });

    it('should return task with satisfied dependencies', async () => {
      // Arrange
      taskRepo.addTask(
        new Task({
          id: 'task1',
          module: 'test',
          priority: 1,
          status: 'pending',
          estimatedMinutes: 30,
          description: 'Task 1',
          acceptanceCriteria: [],
          dependencies: ['task2'], // Dependency satisfied
          notes: '',
        })
      );
      taskRepo.addTask(
        new Task({
          id: 'task2',
          module: 'test',
          priority: 2,
          status: 'completed', // Completed
          estimatedMinutes: 30,
          description: 'Task 2',
          acceptanceCriteria: [],
          dependencies: [],
          notes: '',
        })
      );

      // Act
      const nextTask = await service.getNextTask();

      // Assert
      expect(nextTask).toBeDefined();
      expect(nextTask?.id).toBe('task1');
    });

    it('should return null when no pending tasks', async () => {
      // Arrange
      taskRepo.addTask(
        new Task({
          id: 'task1',
          module: 'test',
          priority: 1,
          status: 'completed',
          estimatedMinutes: 30,
          description: 'Task 1',
          acceptanceCriteria: [],
          dependencies: [],
          notes: '',
        })
      );

      // Act
      const nextTask = await service.getNextTask();

      // Assert
      expect(nextTask).toBeNull();
    });

    it('should return null when all tasks are blocked', async () => {
      // Arrange
      taskRepo.addTask(
        new Task({
          id: 'task1',
          module: 'test',
          priority: 1,
          status: 'pending',
          estimatedMinutes: 30,
          description: 'Task 1',
          acceptanceCriteria: [],
          dependencies: ['task2'], // Blocked
          notes: '',
        })
      );
      taskRepo.addTask(
        new Task({
          id: 'task2',
          module: 'test',
          priority: 2,
          status: 'pending', // Not completed
          estimatedMinutes: 30,
          description: 'Task 2',
          acceptanceCriteria: [],
          dependencies: ['task1'], // Circular dependency
          notes: '',
        })
      );

      // Act
      const nextTask = await service.getNextTask();

      // Assert
      expect(nextTask).toBeNull();
    });
  });

  describe('startTask', () => {
    it('should start pending task', async () => {
      // Arrange
      const task = new Task({
        id: 'test.task',
        module: 'test',
        priority: 1,
        status: 'pending',
        estimatedMinutes: 30,
        description: 'Test task',
        acceptanceCriteria: [],
        dependencies: [],
        notes: '',
      });
      taskRepo.addTask(task);

      const state = State.createNew();
      stateRepo.setState(state);

      // Act
      const result = await service.startTask('test.task');

      // Assert
      expect(result.status).toBe('in_progress');
      expect(result.startedAt).toBeDefined();
    });

    it('should be idempotent when task already in progress', async () => {
      // Arrange
      const task = new Task({
        id: 'test.task',
        module: 'test',
        priority: 1,
        status: 'in_progress',
        estimatedMinutes: 30,
        description: 'Test task',
        acceptanceCriteria: [],
        dependencies: [],
        notes: '',
      });
      taskRepo.addTask(task);

      // Act
      const result = await service.startTask('test.task');

      // Assert
      expect(result.status).toBe('in_progress');
      expect(logger.logs.some((l) => l.level === 'warn' && l.message.includes('already in progress'))).toBe(
        true
      );
    });

    it('should throw error when task not found', async () => {
      // Act & Assert
      await expect(service.startTask('nonexistent.task')).rejects.toThrow(
        'Task not found: nonexistent.task'
      );
    });

    it('should update state with current task', async () => {
      // Arrange
      const task = new Task({
        id: 'test.task',
        module: 'test',
        priority: 1,
        status: 'pending',
        estimatedMinutes: 30,
        description: 'Test task',
        acceptanceCriteria: [],
        dependencies: [],
        notes: '',
      });
      taskRepo.addTask(task);

      const state = State.createNew();
      stateRepo.setState(state);

      // Act
      await service.startTask('test.task');

      // Assert
      const updatedState = await stateRepo.get();
      expect(updatedState?.currentTask).toBe('test.task');
    });
  });

  describe('completeTask', () => {
    it('should complete in_progress task', async () => {
      // Arrange
      const task = new Task({
        id: 'test.task',
        module: 'test',
        priority: 1,
        status: 'in_progress',
        estimatedMinutes: 30,
        description: 'Test task',
        acceptanceCriteria: [],
        dependencies: [],
        notes: '',
      });
      taskRepo.addTask(task);

      // Act
      const result = await service.completeTask('test.task');

      // Assert
      expect(result.status).toBe('completed');
      expect(result.completedAt).toBeDefined();
    });

    it('should complete task with duration note', async () => {
      // Arrange
      const task = new Task({
        id: 'test.task',
        module: 'test',
        priority: 1,
        status: 'in_progress',
        estimatedMinutes: 30,
        description: 'Test task',
        acceptanceCriteria: [],
        dependencies: [],
        notes: '',
      });
      taskRepo.addTask(task);

      // Act
      const result = await service.completeTask('test.task', '5m30s');

      // Assert
      expect(result.status).toBe('completed');
      expect(result.notes).toContain('Completed in 5m30s');
    });

    it('should be idempotent when task already completed', async () => {
      // Arrange
      const task = new Task({
        id: 'test.task',
        module: 'test',
        priority: 1,
        status: 'completed',
        estimatedMinutes: 30,
        description: 'Test task',
        acceptanceCriteria: [],
        dependencies: [],
        notes: '',
      });
      taskRepo.addTask(task);

      // Act
      const result = await service.completeTask('test.task');

      // Assert
      expect(result.status).toBe('completed');
      expect(logger.logs.some((l) => l.level === 'warn' && l.message.includes('already completed'))).toBe(
        true
      );
    });

    it('should throw error when task not found', async () => {
      // Act & Assert
      await expect(service.completeTask('nonexistent.task')).rejects.toThrow(
        'Task not found: nonexistent.task'
      );
    });
  });

  describe('failTask', () => {
    it('should fail in_progress task with reason', async () => {
      // Arrange
      const task = new Task({
        id: 'test.task',
        module: 'test',
        priority: 1,
        status: 'in_progress',
        estimatedMinutes: 30,
        description: 'Test task',
        acceptanceCriteria: [],
        dependencies: [],
        notes: '',
      });
      taskRepo.addTask(task);

      // Act
      const result = await service.failTask('test.task', 'Build error');

      // Assert
      expect(result.status).toBe('failed');
      expect(result.notes).toContain('Failed: Build error');
    });

    it('should throw error when task not found', async () => {
      // Act & Assert
      await expect(service.failTask('nonexistent.task', 'Some reason')).rejects.toThrow(
        'Task not found: nonexistent.task'
      );
    });

    it('should log error when task fails', async () => {
      // Arrange
      const task = new Task({
        id: 'test.task',
        module: 'test',
        priority: 1,
        status: 'in_progress',
        estimatedMinutes: 30,
        description: 'Test task',
        acceptanceCriteria: [],
        dependencies: [],
        notes: '',
      });
      taskRepo.addTask(task);

      // Act
      await service.failTask('test.task', 'Build error');

      // Assert
      expect(
        logger.logs.some(
          (l) => l.level === 'error' && l.message.includes('Task failed') && l.meta?.reason === 'Build error'
        )
      ).toBe(true);
    });
  });

  describe('batchOperations', () => {
    beforeEach(() => {
      taskRepo.addTask(
        new Task({
          id: 'task1',
          module: 'test',
          priority: 1,
          status: 'pending',
          estimatedMinutes: 30,
          description: 'Task 1',
          acceptanceCriteria: [],
          dependencies: [],
          notes: '',
        })
      );
      taskRepo.addTask(
        new Task({
          id: 'task2',
          module: 'test',
          priority: 2,
          status: 'pending',
          estimatedMinutes: 30,
          description: 'Task 2',
          acceptanceCriteria: [],
          dependencies: [],
          notes: '',
        })
      );
    });

    it('should execute all operations successfully', async () => {
      // Arrange
      const operations: BatchOperation[] = [
        { action: 'start', taskId: 'task1' },
        { action: 'start', taskId: 'task2' },
      ];

      // Act
      const results = await service.batchOperations(operations, false);

      // Assert
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.success)).toBe(true);

      const task1 = await taskRepo.findById('task1');
      const task2 = await taskRepo.findById('task2');
      expect(task1?.status).toBe('in_progress');
      expect(task2?.status).toBe('in_progress');
    });

    it('should handle mixed success/failure in non-atomic mode', async () => {
      // Arrange
      const operations: BatchOperation[] = [
        { action: 'start', taskId: 'task1' },
        { action: 'start', taskId: 'nonexistent' }, // Will fail
        { action: 'start', taskId: 'task2' }, // Should still execute
      ];

      // Act
      const results = await service.batchOperations(operations, false);

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);

      // task1 and task2 should be started
      const task1 = await taskRepo.findById('task1');
      const task2 = await taskRepo.findById('task2');
      expect(task1?.status).toBe('in_progress');
      expect(task2?.status).toBe('in_progress');
    });

    it('should rollback all operations on failure in atomic mode', async () => {
      // Arrange
      const operations: BatchOperation[] = [
        { action: 'start', taskId: 'task1' },
        { action: 'start', taskId: 'nonexistent' }, // Will fail
        { action: 'start', taskId: 'task2' },
      ];

      // Act & Assert
      await expect(service.batchOperations(operations, true)).rejects.toThrow('Batch operation failed');

      // All tasks should be rolled back to original state
      const task1 = await taskRepo.findById('task1');
      const task2 = await taskRepo.findById('task2');
      expect(task1?.status).toBe('pending');
      expect(task2?.status).toBe('pending');
    });

    it('should support done operation with duration', async () => {
      // Arrange
      const task1 = await taskRepo.findById('task1');
      task1!.start(); // Start task first
      await taskRepo.save(task1!);

      const operations: BatchOperation[] = [{ action: 'done', taskId: 'task1', duration: '5m' }];

      // Act
      const results = await service.batchOperations(operations, false);

      // Assert
      expect(results[0].success).toBe(true);
      const task = await taskRepo.findById('task1');
      expect(task?.status).toBe('completed');
      expect(task?.notes).toContain('Completed in 5m');
    });

    it('should support fail operation with reason', async () => {
      // Arrange
      const task1 = await taskRepo.findById('task1');
      task1!.start(); // Start task first
      await taskRepo.save(task1!);

      const operations: BatchOperation[] = [
        { action: 'fail', taskId: 'task1', reason: 'Build failed' },
      ];

      // Act
      const results = await service.batchOperations(operations, false);

      // Assert
      expect(results[0].success).toBe(true);
      const task = await taskRepo.findById('task1');
      expect(task?.status).toBe('failed');
      expect(task?.notes).toContain('Failed: Build failed');
    });

    it('should throw error when fail operation missing reason', async () => {
      // Arrange
      const operations: BatchOperation[] = [{ action: 'fail', taskId: 'task1' } as BatchOperation];

      // Act
      const results = await service.batchOperations(operations, false);

      // Assert
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Reason required');
    });

    it('should throw error on unknown action', async () => {
      // Arrange
      const operations: BatchOperation[] = [
        { action: 'unknown' as any, taskId: 'task1' },
      ];

      // Act
      const results = await service.batchOperations(operations, false);

      // Assert
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Unknown action');
    });
  });
});
