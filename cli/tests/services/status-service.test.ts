/**
 * StatusService Unit Tests
 *
 * Tests the business logic for project progress tracking.
 * Follows AAA pattern: Arrange-Act-Assert
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StatusService } from '../../src/services/status-service';
import { ITaskRepository } from '../../src/repositories/task-repository';
import { IStateRepository } from '../../src/repositories/state-repository';
import { ILogger } from '../../src/infrastructure/logger';
import { Task } from '../../src/domain/task-entity';
import { State } from '../../src/domain/state-entity';

describe('StatusService', () => {
  let statusService: StatusService;
  let mockTaskRepository: ITaskRepository;
  let mockStateRepository: IStateRepository;
  let mockLogger: ILogger;

  beforeEach(() => {
    // Arrange: Create mock dependencies
    mockTaskRepository = {
      findById: vi.fn(),
      findAll: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      findNext: vi.fn(),
    };

    mockStateRepository = {
      get: vi.fn(),
      set: vi.fn(),
      update: vi.fn(),
      clear: vi.fn(),
      exists: vi.fn(),
    };

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    statusService = new StatusService(mockTaskRepository, mockStateRepository, mockLogger);
  });

  describe('getProjectStatus', () => {
    it('should return complete project status with overall and module stats', async () => {
      // Arrange: Create test tasks
      const tasks = [
        new Task({
          id: 'auth.login',
          module: 'auth',
          priority: 1,
          status: 'completed',
          estimatedMinutes: 30,
          description: 'Login feature',
          acceptanceCriteria: ['Should allow user login'],
          dependencies: [],
        }),
        new Task({
          id: 'auth.signup',
          module: 'auth',
          priority: 2,
          status: 'in_progress',
          estimatedMinutes: 45,
          description: 'Signup feature',
          acceptanceCriteria: ['Should allow user signup'],
          dependencies: [],
        }),
        new Task({
          id: 'user.profile',
          module: 'user',
          priority: 3,
          status: 'pending',
          estimatedMinutes: 20,
          description: 'User profile',
          acceptanceCriteria: ['Should display user profile'],
          dependencies: [],
        }),
      ];

      const state = new State({
        phase: 'implement',
        currentTask: 'auth.signup',
        startedAt: '2026-01-20T10:00:00Z',
        updatedAt: '2026-01-20T11:30:00Z',
      });

      vi.mocked(mockTaskRepository.findAll).mockResolvedValue(tasks);
      vi.mocked(mockStateRepository.get).mockResolvedValue(state);

      // Act: Get project status
      const result = await statusService.getProjectStatus();

      // Assert: Verify overall stats
      expect(result.overall.total).toBe(3);
      expect(result.overall.completed).toBe(1);
      expect(result.overall.inProgress).toBe(1);
      expect(result.overall.pending).toBe(1);
      expect(result.overall.failed).toBe(0);
      expect(result.overall.blocked).toBe(0);
      expect(result.overall.completionPercentage).toBe(33); // 1/3 = 33%

      // Assert: Verify current session
      expect(result.currentPhase).toBe('implement');
      expect(result.currentTask).toBe('auth.signup');
      expect(result.hasActiveTasks).toBe(true);

      // Assert: Verify module stats
      expect(result.byModule).toHaveLength(2);

      const authModule = result.byModule.find((m) => m.module === 'auth');
      expect(authModule).toBeDefined();
      expect(authModule!.total).toBe(2);
      expect(authModule!.completed).toBe(1);
      expect(authModule!.inProgress).toBe(1);
      expect(authModule!.completionPercentage).toBe(50); // 1/2 = 50%

      const userModule = result.byModule.find((m) => m.module === 'user');
      expect(userModule).toBeDefined();
      expect(userModule!.total).toBe(1);
      expect(userModule!.pending).toBe(1);
      expect(userModule!.completionPercentage).toBe(0);
    });

    it('should handle empty task list', async () => {
      // Arrange: No tasks
      vi.mocked(mockTaskRepository.findAll).mockResolvedValue([]);
      vi.mocked(mockStateRepository.get).mockResolvedValue(null);

      // Act
      const result = await statusService.getProjectStatus();

      // Assert
      expect(result.overall.total).toBe(0);
      expect(result.overall.completionPercentage).toBe(0);
      expect(result.byModule).toHaveLength(0);
      expect(result.currentPhase).toBe('none');
      expect(result.currentTask).toBe(null);
      expect(result.hasActiveTasks).toBe(false);
    });

    it('should handle null state gracefully', async () => {
      // Arrange: Tasks exist but no state
      const tasks = [
        new Task({
          id: 'test.task',
          module: 'test',
          priority: 1,
          status: 'pending',
          estimatedMinutes: 10,
          description: 'Test task',
          acceptanceCriteria: ['Should work'],
          dependencies: [],
        }),
      ];

      vi.mocked(mockTaskRepository.findAll).mockResolvedValue(tasks);
      vi.mocked(mockStateRepository.get).mockResolvedValue(null);

      // Act
      const result = await statusService.getProjectStatus();

      // Assert
      expect(result.currentPhase).toBe('none');
      expect(result.currentTask).toBe(null);
      expect(result.startedAt).toBe(null);
      expect(result.updatedAt).toBe(null);
      expect(result.hasActiveTasks).toBe(true);
    });

    it('should calculate completion percentage correctly', async () => {
      // Arrange: Mix of completed and other tasks
      const tasks = [
        new Task({
          id: 'task.1',
          module: 'test',
          priority: 1,
          status: 'completed',
          estimatedMinutes: 10,
          description: 'Task 1',
          acceptanceCriteria: ['Criteria 1'],
          dependencies: [],
        }),
        new Task({
          id: 'task.2',
          module: 'test',
          priority: 2,
          status: 'completed',
          estimatedMinutes: 10,
          description: 'Task 2',
          acceptanceCriteria: ['Criteria 2'],
          dependencies: [],
        }),
        new Task({
          id: 'task.3',
          module: 'test',
          priority: 3,
          status: 'completed',
          estimatedMinutes: 10,
          description: 'Task 3',
          acceptanceCriteria: ['Criteria 3'],
          dependencies: [],
        }),
        new Task({
          id: 'task.4',
          module: 'test',
          priority: 4,
          status: 'pending',
          estimatedMinutes: 10,
          description: 'Task 4',
          acceptanceCriteria: ['Criteria 4'],
          dependencies: [],
        }),
      ];

      vi.mocked(mockTaskRepository.findAll).mockResolvedValue(tasks);
      vi.mocked(mockStateRepository.get).mockResolvedValue(null);

      // Act
      const result = await statusService.getProjectStatus();

      // Assert
      expect(result.overall.completionPercentage).toBe(75); // 3/4 = 75%
    });

    it('should count all task statuses correctly', async () => {
      // Arrange: Tasks with different statuses
      const tasks = [
        new Task({
          id: 'task.completed',
          module: 'test',
          priority: 1,
          status: 'completed',
          estimatedMinutes: 10,
          description: 'Completed task',
          acceptanceCriteria: ['Should be completed'],
          dependencies: [],
        }),
        new Task({
          id: 'task.in_progress',
          module: 'test',
          priority: 2,
          status: 'in_progress',
          estimatedMinutes: 10,
          description: 'In progress task',
          acceptanceCriteria: ['Should be in progress'],
          dependencies: [],
        }),
        new Task({
          id: 'task.pending',
          module: 'test',
          priority: 3,
          status: 'pending',
          estimatedMinutes: 10,
          description: 'Pending task',
          acceptanceCriteria: ['Should be pending'],
          dependencies: [],
        }),
        new Task({
          id: 'task.failed',
          module: 'test',
          priority: 4,
          status: 'failed',
          estimatedMinutes: 10,
          description: 'Failed task',
          acceptanceCriteria: ['Should be failed'],
          dependencies: [],
        }),
        new Task({
          id: 'task.blocked',
          module: 'test',
          priority: 5,
          status: 'blocked',
          estimatedMinutes: 10,
          description: 'Blocked task',
          acceptanceCriteria: ['Should be blocked'],
          dependencies: [],
        }),
      ];

      vi.mocked(mockTaskRepository.findAll).mockResolvedValue(tasks);
      vi.mocked(mockStateRepository.get).mockResolvedValue(null);

      // Act
      const result = await statusService.getProjectStatus();

      // Assert
      expect(result.overall.total).toBe(5);
      expect(result.overall.completed).toBe(1);
      expect(result.overall.inProgress).toBe(1);
      expect(result.overall.pending).toBe(1);
      expect(result.overall.failed).toBe(1);
      expect(result.overall.blocked).toBe(1);
    });

    it('should sort modules alphabetically', async () => {
      // Arrange: Tasks from different modules
      const tasks = [
        new Task({
          id: 'zebra.task',
          module: 'zebra',
          priority: 1,
          status: 'pending',
          estimatedMinutes: 10,
          description: 'Zebra task',
          acceptanceCriteria: ['Should work'],
          dependencies: [],
        }),
        new Task({
          id: 'alpha.task',
          module: 'alpha',
          priority: 2,
          status: 'pending',
          estimatedMinutes: 10,
          description: 'Alpha task',
          acceptanceCriteria: ['Should work'],
          dependencies: [],
        }),
        new Task({
          id: 'beta.task',
          module: 'beta',
          priority: 3,
          status: 'pending',
          estimatedMinutes: 10,
          description: 'Beta task',
          acceptanceCriteria: ['Should work'],
          dependencies: [],
        }),
      ];

      vi.mocked(mockTaskRepository.findAll).mockResolvedValue(tasks);
      vi.mocked(mockStateRepository.get).mockResolvedValue(null);

      // Act
      const result = await statusService.getProjectStatus();

      // Assert
      expect(result.byModule).toHaveLength(3);
      expect(result.byModule[0].module).toBe('alpha');
      expect(result.byModule[1].module).toBe('beta');
      expect(result.byModule[2].module).toBe('zebra');
    });

    it('should log debug messages', async () => {
      // Arrange
      vi.mocked(mockTaskRepository.findAll).mockResolvedValue([]);
      vi.mocked(mockStateRepository.get).mockResolvedValue(null);

      // Act
      await statusService.getProjectStatus();

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith('Calculating project status...');
      expect(mockLogger.debug).toHaveBeenCalledWith('Project status calculated', {
        totalTasks: 0,
      });
    });
  });
});
