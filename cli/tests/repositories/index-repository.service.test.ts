import { describe, it, expect, beforeEach } from 'vitest';
import * as path from 'path';
import { FileSystemIndexRepository } from '../../src/repositories/index-repository.service';
import { TaskIndex, TaskIndexEntry, MetadataUpdate } from '../../src/repositories/index-repository';
import { MockFileSystem } from '../../src/test-utils/mock-file-system';

describe('FileSystemIndexRepository', () => {
  let repository: FileSystemIndexRepository;
  let mockFileSystem: MockFileSystem;
  const tasksDir = '/test/workspace/.ralph-dev/tasks';
  const indexPath = path.join(tasksDir, 'index.json');

  beforeEach(() => {
    mockFileSystem = new MockFileSystem();
    repository = new FileSystemIndexRepository(mockFileSystem, tasksDir);
  });

  describe('read', () => {
    it('should return default index when file does not exist', async () => {
      // Arrange - no index file

      // Act
      const result = await repository.read();

      // Assert
      expect(result.version).toBe('1.0.0');
      expect(result.metadata.projectGoal).toBe('');
      expect(result.tasks).toEqual({});
      expect(result.updatedAt).toBeDefined();
    });

    it('should read existing index from file', async () => {
      // Arrange
      const index: TaskIndex = {
        version: '1.0.0',
        updatedAt: '2026-01-20T00:00:00.000Z',
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
      mockFileSystem.setFile(indexPath, JSON.stringify(index, null, 2));

      // Act
      const result = await repository.read();

      // Assert
      expect(result).toEqual(index);
    });

    it('should read index with multiple tasks', async () => {
      // Arrange
      const index: TaskIndex = {
        version: '1.0.0',
        updatedAt: '2026-01-20T00:00:00.000Z',
        metadata: {
          projectGoal: 'Multi-task project',
        },
        tasks: {
          'auth.login': {
            status: 'completed',
            priority: 1,
            module: 'auth',
            description: 'Login feature',
            filePath: 'auth/login.md',
            dependencies: ['setup.scaffold'],
            estimatedMinutes: 30,
          },
          'auth.logout': {
            status: 'pending',
            priority: 2,
            module: 'auth',
            description: 'Logout feature',
            dependencies: ['auth.login'],
          },
        },
      };
      mockFileSystem.setFile(indexPath, JSON.stringify(index, null, 2));

      // Act
      const result = await repository.read();

      // Assert
      expect(Object.keys(result.tasks)).toHaveLength(2);
      expect(result.tasks['auth.login'].status).toBe('completed');
      expect(result.tasks['auth.logout'].status).toBe('pending');
    });

    it('should read index with language config', async () => {
      // Arrange
      const index: TaskIndex = {
        version: '1.0.0',
        updatedAt: '2026-01-20T00:00:00.000Z',
        metadata: {
          projectGoal: 'TypeScript project',
          languageConfig: {
            language: 'typescript',
            verifyCommands: ['npm test', 'npm run build'],
          },
        },
        tasks: {},
      };
      mockFileSystem.setFile(indexPath, JSON.stringify(index, null, 2));

      // Act
      const result = await repository.read();

      // Assert
      expect(result.metadata.languageConfig).toEqual({
        language: 'typescript',
        verifyCommands: ['npm test', 'npm run build'],
      });
    });
  });

  describe('write', () => {
    it('should write index to file', async () => {
      // Arrange
      const index: TaskIndex = {
        version: '1.0.0',
        updatedAt: '2026-01-20T00:00:00.000Z',
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

      // Act
      await repository.write(index);

      // Assert
      const content = mockFileSystem.getFile(indexPath) as string;
      const savedIndex = JSON.parse(content);
      expect(savedIndex.version).toBe('1.0.0');
      expect(savedIndex.metadata.projectGoal).toBe('Test project');
      expect(savedIndex.tasks['test.task']).toEqual({
        status: 'pending',
        priority: 1,
        module: 'test',
        description: 'Test task',
      });
    });

    it('should update timestamp on write', async () => {
      // Arrange
      const index: TaskIndex = {
        version: '1.0.0',
        updatedAt: '2026-01-20T00:00:00.000Z',
        metadata: {
          projectGoal: 'Test project',
        },
        tasks: {},
      };

      // Act
      await repository.write(index);

      // Assert
      const content = mockFileSystem.getFile(indexPath) as string;
      const savedIndex = JSON.parse(content);
      expect(savedIndex.updatedAt).not.toBe('2026-01-20T00:00:00.000Z');
    });

    it('should create directory if it does not exist', async () => {
      // Arrange
      const index: TaskIndex = {
        version: '1.0.0',
        updatedAt: '2026-01-20T00:00:00.000Z',
        metadata: {
          projectGoal: 'Test',
        },
        tasks: {},
      };

      // Act
      await repository.write(index);

      // Assert
      expect(mockFileSystem.hasDirectory(tasksDir)).toBe(true);
    });

    it('should format JSON with 2-space indentation', async () => {
      // Arrange
      const index: TaskIndex = {
        version: '1.0.0',
        updatedAt: '2026-01-20T00:00:00.000Z',
        metadata: {
          projectGoal: 'Test',
        },
        tasks: {},
      };

      // Act
      await repository.write(index);

      // Assert
      const content = mockFileSystem.getFile(indexPath) as string;
      expect(content).toContain('\n  "version"');
      expect(content).toContain('\n  "metadata"');
    });
  });

  describe('upsertTask', () => {
    it('should add new task to empty index', async () => {
      // Arrange
      const entry: TaskIndexEntry = {
        status: 'pending',
        priority: 1,
        module: 'test',
        description: 'Test task',
      };

      // Act
      await repository.upsertTask('test.task', entry);

      // Assert
      const index = await repository.read();
      expect(index.tasks['test.task']).toEqual(entry);
    });

    it('should update existing task', async () => {
      // Arrange
      await repository.upsertTask('test.task', {
        status: 'pending',
        priority: 1,
        module: 'test',
        description: 'Original description',
      });

      // Act
      await repository.upsertTask('test.task', {
        status: 'in_progress',
        priority: 1,
        module: 'test',
        description: 'Updated description',
      });

      // Assert
      const index = await repository.read();
      expect(index.tasks['test.task'].status).toBe('in_progress');
      expect(index.tasks['test.task'].description).toBe('Updated description');
    });

    it('should add task with all fields', async () => {
      // Arrange
      const entry: TaskIndexEntry = {
        status: 'pending',
        priority: 2,
        module: 'auth',
        description: 'Login feature',
        filePath: 'auth/login.md',
        dependencies: ['setup.scaffold'],
        estimatedMinutes: 30,
      };

      // Act
      await repository.upsertTask('auth.login', entry);

      // Assert
      const index = await repository.read();
      expect(index.tasks['auth.login']).toEqual(entry);
    });

    it('should preserve other tasks when upserting', async () => {
      // Arrange
      await repository.upsertTask('task1', {
        status: 'completed',
        priority: 1,
        module: 'module1',
        description: 'Task 1',
      });

      // Act
      await repository.upsertTask('task2', {
        status: 'pending',
        priority: 2,
        module: 'module2',
        description: 'Task 2',
      });

      // Assert
      const index = await repository.read();
      expect(Object.keys(index.tasks)).toHaveLength(2);
      expect(index.tasks['task1'].status).toBe('completed');
      expect(index.tasks['task2'].status).toBe('pending');
    });
  });

  describe('updateTaskStatus', () => {
    beforeEach(async () => {
      await repository.upsertTask('test.task', {
        status: 'pending',
        priority: 1,
        module: 'test',
        description: 'Test task',
      });
    });

    it('should update task status', async () => {
      // Arrange - task exists with 'pending' status

      // Act
      await repository.updateTaskStatus('test.task', 'in_progress');

      // Assert
      const index = await repository.read();
      expect(index.tasks['test.task'].status).toBe('in_progress');
    });

    it('should preserve other fields when updating status', async () => {
      // Arrange
      const originalEntry = {
        status: 'pending',
        priority: 1,
        module: 'test',
        description: 'Test task',
        dependencies: ['setup'],
        estimatedMinutes: 25,
      };
      await repository.upsertTask('test.task', originalEntry);

      // Act
      await repository.updateTaskStatus('test.task', 'completed');

      // Assert
      const index = await repository.read();
      const task = index.tasks['test.task'];
      expect(task.status).toBe('completed');
      expect(task.priority).toBe(1);
      expect(task.description).toBe('Test task');
      expect(task.dependencies).toEqual(['setup']);
      expect(task.estimatedMinutes).toBe(25);
    });

    it('should throw error when task does not exist', async () => {
      // Arrange - no such task

      // Act & Assert
      await expect(
        repository.updateTaskStatus('nonexistent.task', 'completed')
      ).rejects.toThrow('Task not found in index: nonexistent.task');
    });
  });

  describe('getTaskFilePathAsync', () => {
    it('should return null for non-existent task', async () => {
      // Arrange - no such task

      // Act
      const result = await repository.getTaskFilePathAsync('nonexistent.task');

      // Assert
      expect(result).toBeNull();
    });

    it('should return explicit filePath when provided', async () => {
      // Arrange
      await repository.upsertTask('auth.login', {
        status: 'pending',
        priority: 1,
        module: 'auth',
        description: 'Login',
        filePath: 'auth/login.md',
      });

      // Act
      const result = await repository.getTaskFilePathAsync('auth.login');

      // Assert
      expect(result).toBe(path.join(tasksDir, 'auth/login.md'));
    });

    it('should derive filePath from task ID when not provided', async () => {
      // Arrange
      await repository.upsertTask('auth.logout', {
        status: 'pending',
        priority: 1,
        module: 'auth',
        description: 'Logout',
      });

      // Act
      const result = await repository.getTaskFilePathAsync('auth.logout');

      // Assert
      expect(result).toBe(path.join(tasksDir, 'auth/logout.md'));
    });
  });

  describe('getNextTask', () => {
    it('should return null when no tasks exist', async () => {
      // Arrange - empty index

      // Act
      const result = await repository.getNextTask();

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when all tasks are completed', async () => {
      // Arrange
      await repository.upsertTask('task1', {
        status: 'completed',
        priority: 1,
        module: 'module',
        description: 'Task 1',
      });

      // Act
      const result = await repository.getNextTask();

      // Assert
      expect(result).toBeNull();
    });

    it('should return pending task with highest priority (lowest number)', async () => {
      // Arrange
      await repository.upsertTask('task1', {
        status: 'pending',
        priority: 3,
        module: 'module',
        description: 'Task 1',
      });
      await repository.upsertTask('task2', {
        status: 'pending',
        priority: 1,
        module: 'module',
        description: 'Task 2',
      });
      await repository.upsertTask('task3', {
        status: 'pending',
        priority: 2,
        module: 'module',
        description: 'Task 3',
      });

      // Act
      const result = await repository.getNextTask();

      // Assert
      expect(result).toBe('task2'); // priority 1 is highest
    });

    it('should return in_progress task if it exists', async () => {
      // Arrange
      await repository.upsertTask('task1', {
        status: 'pending',
        priority: 1,
        module: 'module',
        description: 'Task 1',
      });
      await repository.upsertTask('task2', {
        status: 'in_progress',
        priority: 2,
        module: 'module',
        description: 'Task 2',
      });

      // Act
      const result = await repository.getNextTask();

      // Assert
      expect(result).toBe('task1'); // Still returns highest priority among pending/in_progress
    });

    it('should skip failed tasks', async () => {
      // Arrange
      await repository.upsertTask('task1', {
        status: 'failed',
        priority: 1,
        module: 'module',
        description: 'Task 1',
      });
      await repository.upsertTask('task2', {
        status: 'pending',
        priority: 2,
        module: 'module',
        description: 'Task 2',
      });

      // Act
      const result = await repository.getNextTask();

      // Assert
      expect(result).toBe('task2');
    });
  });

  describe('updateMetadata', () => {
    it('should update project goal', async () => {
      // Arrange
      const update: MetadataUpdate = {
        projectGoal: 'New project goal',
      };

      // Act
      await repository.updateMetadata(update);

      // Assert
      const index = await repository.read();
      expect(index.metadata.projectGoal).toBe('New project goal');
    });

    it('should update language config', async () => {
      // Arrange
      const update: MetadataUpdate = {
        languageConfig: {
          language: 'typescript',
          verifyCommands: ['npm test'],
        },
      };

      // Act
      await repository.updateMetadata(update);

      // Assert
      const index = await repository.read();
      expect(index.metadata.languageConfig).toEqual({
        language: 'typescript',
        verifyCommands: ['npm test'],
      });
    });

    it('should merge with existing metadata', async () => {
      // Arrange
      await repository.updateMetadata({ projectGoal: 'Original goal' });

      // Act
      await repository.updateMetadata({
        languageConfig: { language: 'typescript' },
      });

      // Assert
      const index = await repository.read();
      expect(index.metadata.projectGoal).toBe('Original goal');
      expect(index.metadata.languageConfig).toEqual({ language: 'typescript' });
    });
  });

  describe('hasTask', () => {
    it('should return false when task does not exist', async () => {
      // Arrange - empty index

      // Act
      const result = await repository.hasTask('test.task');

      // Assert
      expect(result).toBe(false);
    });

    it('should return true when task exists', async () => {
      // Arrange
      await repository.upsertTask('test.task', {
        status: 'pending',
        priority: 1,
        module: 'test',
        description: 'Test task',
      });

      // Act
      const result = await repository.hasTask('test.task');

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('getAllTaskIds', () => {
    it('should return empty array when no tasks exist', async () => {
      // Arrange - empty index

      // Act
      const result = await repository.getAllTaskIds();

      // Assert
      expect(result).toEqual([]);
    });

    it('should return all task IDs', async () => {
      // Arrange
      await repository.upsertTask('task1', {
        status: 'pending',
        priority: 1,
        module: 'module',
        description: 'Task 1',
      });
      await repository.upsertTask('task2', {
        status: 'completed',
        priority: 2,
        module: 'module',
        description: 'Task 2',
      });
      await repository.upsertTask('task3', {
        status: 'failed',
        priority: 3,
        module: 'module',
        description: 'Task 3',
      });

      // Act
      const result = await repository.getAllTaskIds();

      // Assert
      expect(result).toHaveLength(3);
      expect(result).toContain('task1');
      expect(result).toContain('task2');
      expect(result).toContain('task3');
    });
  });

  describe('getTasksByStatus', () => {
    beforeEach(async () => {
      await repository.upsertTask('task1', {
        status: 'pending',
        priority: 1,
        module: 'module',
        description: 'Task 1',
      });
      await repository.upsertTask('task2', {
        status: 'completed',
        priority: 2,
        module: 'module',
        description: 'Task 2',
      });
      await repository.upsertTask('task3', {
        status: 'pending',
        priority: 3,
        module: 'module',
        description: 'Task 3',
      });
      await repository.upsertTask('task4', {
        status: 'failed',
        priority: 4,
        module: 'module',
        description: 'Task 4',
      });
    });

    it('should return tasks with pending status', async () => {
      // Act
      const result = await repository.getTasksByStatus('pending');

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toContain('task1');
      expect(result).toContain('task3');
    });

    it('should return tasks with completed status', async () => {
      // Act
      const result = await repository.getTasksByStatus('completed');

      // Assert
      expect(result).toHaveLength(1);
      expect(result).toContain('task2');
    });

    it('should return tasks with failed status', async () => {
      // Act
      const result = await repository.getTasksByStatus('failed');

      // Assert
      expect(result).toHaveLength(1);
      expect(result).toContain('task4');
    });

    it('should return empty array when no tasks match status', async () => {
      // Act
      const result = await repository.getTasksByStatus('in_progress');

      // Assert
      expect(result).toEqual([]);
    });
  });
});
