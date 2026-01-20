import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IndexManager, TaskIndex } from '../../src/core/index-manager';
import { Task } from '../../src/core/task-parser';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('IndexManager', () => {
  const testDir = path.join(__dirname, '../../test-data');
  const tasksDir = path.join(testDir, 'tasks');
  let indexManager: IndexManager;

  beforeEach(() => {
    fs.ensureDirSync(tasksDir);
    indexManager = new IndexManager(tasksDir);
  });

  afterEach(() => {
    fs.removeSync(testDir);
  });

  describe('readIndex', () => {
    it('should return default index when file does not exist', () => {
      const index = indexManager.readIndex();

      expect(index.version).toBe('1.0.0');
      expect(index.metadata.projectGoal).toBe('');
      expect(index.tasks).toEqual({});
      expect(index.updatedAt).toBeDefined();
    });

    it('should read existing index file', () => {
      const existingIndex: TaskIndex = {
        version: '1.0.0',
        updatedAt: '2024-01-18T10:00:00Z',
        metadata: {
          projectGoal: 'Test project',
        },
        tasks: {
          'test.task': {
            status: 'pending',
            priority: 1,
            module: 'test',
            description: 'Test task',
          },
        },
      };

      fs.writeJSONSync(path.join(tasksDir, 'index.json'), existingIndex);

      const index = indexManager.readIndex();

      expect(index.version).toBe('1.0.0');
      expect(index.metadata.projectGoal).toBe('Test project');
      expect(index.tasks['test.task']).toBeDefined();
    });
  });

  describe('writeIndex', () => {
    it('should write index to file and update timestamp', () => {
      const index: TaskIndex = {
        version: '1.0.0',
        updatedAt: '2024-01-01T00:00:00Z', // Old timestamp
        metadata: {
          projectGoal: 'New project',
        },
        tasks: {},
      };

      indexManager.writeIndex(index);

      const savedIndex = fs.readJSONSync(path.join(tasksDir, 'index.json'));

      expect(savedIndex.version).toBe('1.0.0');
      expect(savedIndex.metadata.projectGoal).toBe('New project');
      expect(savedIndex.updatedAt).not.toBe('2024-01-01T00:00:00Z');
      expect(new Date(savedIndex.updatedAt).getTime()).toBeGreaterThan(
        new Date('2024-01-01T00:00:00Z').getTime()
      );
    });

    it('should create directory if it does not exist', () => {
      fs.removeSync(testDir);

      const index: TaskIndex = {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        metadata: {
          projectGoal: 'Test',
        },
        tasks: {},
      };

      indexManager.writeIndex(index);

      expect(fs.existsSync(path.join(tasksDir, 'index.json'))).toBe(true);
    });
  });

  describe('upsertTask', () => {
    it('should add new task to index', () => {
      const task: Task = {
        id: 'auth.login',
        module: 'auth',
        priority: 1,
        status: 'pending',
        description: 'Login endpoint',
        acceptanceCriteria: ['Must authenticate users'],
      };

      indexManager.upsertTask(task);

      const index = indexManager.readIndex();

      expect(index.tasks['auth.login']).toBeDefined();
      expect(index.tasks['auth.login'].status).toBe('pending');
      expect(index.tasks['auth.login'].priority).toBe(1);
      expect(index.tasks['auth.login'].module).toBe('auth');
      expect(index.tasks['auth.login'].description).toBe('Login endpoint');
    });

    it('should update existing task in index', () => {
      const task1: Task = {
        id: 'auth.login',
        module: 'auth',
        priority: 1,
        status: 'pending',
        description: 'Login endpoint',
        acceptanceCriteria: [],
      };

      indexManager.upsertTask(task1);

      const task2: Task = {
        id: 'auth.login',
        module: 'auth',
        priority: 1,
        status: 'completed',
        description: 'Login endpoint (updated)',
        acceptanceCriteria: [],
      };

      indexManager.upsertTask(task2);

      const index = indexManager.readIndex();

      expect(index.tasks['auth.login'].status).toBe('completed');
      expect(index.tasks['auth.login'].description).toBe('Login endpoint (updated)');
    });

    it('should store relative file path when provided', () => {
      const task: Task = {
        id: 'auth.login',
        module: 'auth',
        priority: 1,
        status: 'pending',
        description: 'Login endpoint',
        acceptanceCriteria: [],
      };

      const taskFilePath = path.join(tasksDir, 'auth', 'login.md');

      indexManager.upsertTask(task, taskFilePath);

      const index = indexManager.readIndex();

      expect(index.tasks['auth.login'].filePath).toBe('auth/login.md');
    });
  });

  describe('updateTaskStatus', () => {
    beforeEach(() => {
      const task: Task = {
        id: 'auth.login',
        module: 'auth',
        priority: 1,
        status: 'pending',
        description: 'Login endpoint',
        acceptanceCriteria: [],
      };

      indexManager.upsertTask(task);
    });

    it('should update task status', () => {
      indexManager.updateTaskStatus('auth.login', 'in_progress');

      const index = indexManager.readIndex();

      expect(index.tasks['auth.login'].status).toBe('in_progress');
    });

    it('should throw error for non-existent task', () => {
      expect(() => {
        indexManager.updateTaskStatus('non.existent', 'completed');
      }).toThrow('Task not found in index: non.existent');
    });
  });

  describe('getNextTask', () => {
    it('should return null when no tasks exist', () => {
      const nextTask = indexManager.getNextTask();

      expect(nextTask).toBeNull();
    });

    it('should return highest priority pending task', () => {
      const tasks: Task[] = [
        {
          id: 'task.low',
          module: 'test',
          priority: 10,
          status: 'pending',
          description: 'Low priority',
          acceptanceCriteria: [],
        },
        {
          id: 'task.high',
          module: 'test',
          priority: 1,
          status: 'pending',
          description: 'High priority',
          acceptanceCriteria: [],
        },
        {
          id: 'task.medium',
          module: 'test',
          priority: 5,
          status: 'pending',
          description: 'Medium priority',
          acceptanceCriteria: [],
        },
      ];

      tasks.forEach((task) => indexManager.upsertTask(task));

      const nextTask = indexManager.getNextTask();

      expect(nextTask).toBe('task.high');
    });

    it('should include in_progress tasks in next task selection', () => {
      const tasks: Task[] = [
        {
          id: 'task.inprogress',
          module: 'test',
          priority: 1,
          status: 'in_progress',
          description: 'In progress',
          acceptanceCriteria: [],
        },
        {
          id: 'task.pending',
          module: 'test',
          priority: 2,
          status: 'pending',
          description: 'Pending',
          acceptanceCriteria: [],
        },
      ];

      tasks.forEach((task) => indexManager.upsertTask(task));

      const nextTask = indexManager.getNextTask();

      expect(nextTask).toBe('task.inprogress');
    });

    it('should exclude completed and failed tasks', () => {
      const tasks: Task[] = [
        {
          id: 'task.completed',
          module: 'test',
          priority: 1,
          status: 'completed',
          description: 'Completed',
          acceptanceCriteria: [],
        },
        {
          id: 'task.failed',
          module: 'test',
          priority: 2,
          status: 'failed',
          description: 'Failed',
          acceptanceCriteria: [],
        },
        {
          id: 'task.pending',
          module: 'test',
          priority: 3,
          status: 'pending',
          description: 'Pending',
          acceptanceCriteria: [],
        },
      ];

      tasks.forEach((task) => indexManager.upsertTask(task));

      const nextTask = indexManager.getNextTask();

      expect(nextTask).toBe('task.pending');
    });
  });

  describe('getTaskFilePath', () => {
    it('should return null for non-existent task', () => {
      const filePath = indexManager.getTaskFilePath('non.existent');

      expect(filePath).toBeNull();
    });

    it('should return stored file path if available', () => {
      const task: Task = {
        id: 'auth.login',
        module: 'auth',
        priority: 1,
        status: 'pending',
        description: 'Login',
        acceptanceCriteria: [],
      };

      const taskFilePath = path.join(tasksDir, 'auth', 'login.md');

      indexManager.upsertTask(task, taskFilePath);

      const retrievedPath = indexManager.getTaskFilePath('auth.login');

      expect(retrievedPath).toBe(taskFilePath);
    });

    it('should derive file path from ID if not stored', () => {
      const task: Task = {
        id: 'auth.login',
        module: 'auth',
        priority: 1,
        status: 'pending',
        description: 'Login',
        acceptanceCriteria: [],
      };

      indexManager.upsertTask(task);

      const retrievedPath = indexManager.getTaskFilePath('auth.login');

      expect(retrievedPath).toBe(path.join(tasksDir, 'auth', 'login.md'));
    });
  });

  describe('updateMetadata', () => {
    it('should update metadata fields', () => {
      indexManager.updateMetadata({
        projectGoal: 'Build authentication system',
      });

      const index = indexManager.readIndex();

      expect(index.metadata.projectGoal).toBe('Build authentication system');
    });

    it('should merge with existing metadata', () => {
      indexManager.updateMetadata({
        projectGoal: 'Initial goal',
      });

      indexManager.updateMetadata({
        languageConfig: {
          language: 'typescript',
        },
      });

      const index = indexManager.readIndex();

      expect(index.metadata.projectGoal).toBe('Initial goal');
      expect(index.metadata.languageConfig).toEqual({ language: 'typescript' });
    });
  });
});
