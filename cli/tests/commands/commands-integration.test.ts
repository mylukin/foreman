/**
 * Integration Tests for Commands + Services
 *
 * Verifies that CLI commands work correctly with the service layer.
 * Tests end-to-end workflows using real service implementations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServices, ServiceContainer } from '../../src/commands/service-factory';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('Commands Integration Tests', () => {
  let workspaceDir: string;
  let services: ServiceContainer;

  beforeEach(() => {
    // Create temp directory for integration tests
    workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'commands-integration-'));
    services = createServices(workspaceDir);
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(workspaceDir)) {
      fs.removeSync(workspaceDir);
    }
  });

  describe('Task Workflow', () => {
    it('should create, start, and complete a task', async () => {
      // Arrange - Create a task
      const taskInput = {
        id: 'auth.login',
        module: 'auth',
        priority: 1,
        estimatedMinutes: 30,
        description: 'Implement login functionality',
        acceptanceCriteria: ['User can log in', 'Session is created'],
        dependencies: [],
      };

      // Act - Create task
      const createdTask = await services.taskService.createTask(taskInput);

      // Assert - Task created
      expect(createdTask.id).toBe('auth.login');
      expect(createdTask.status).toBe('pending');

      // Act - Start task
      const startedTask = await services.taskService.startTask('auth.login');

      // Assert - Task started
      expect(startedTask.status).toBe('in_progress');
      expect(startedTask.startedAt).toBeDefined();

      // Act - Complete task
      const completedTask = await services.taskService.completeTask('auth.login', '25 minutes');

      // Assert - Task completed
      expect(completedTask.status).toBe('completed');
      expect(completedTask.completedAt).toBeDefined();
      expect(completedTask.notes).toContain('25 minutes');
    });

    it('should handle task failure', async () => {
      // Arrange
      const taskInput = {
        id: 'failing.task',
        module: 'test',
        priority: 1,
        estimatedMinutes: 30,
        description: 'Task that will fail',
        acceptanceCriteria: [],
      };

      await services.taskService.createTask(taskInput);
      await services.taskService.startTask('failing.task');

      // Act
      const failedTask = await services.taskService.failTask('failing.task', 'API error');

      // Assert
      expect(failedTask.status).toBe('failed');
      expect(failedTask.failedAt).toBeDefined();
      expect(failedTask.notes).toContain('API error');
    });

    it('should get next task based on priority', async () => {
      // Arrange - Create multiple tasks
      await services.taskService.createTask({
        id: 'task1',
        module: 'test',
        priority: 3,
        description: 'Low priority',
        acceptanceCriteria: [],
      });

      await services.taskService.createTask({
        id: 'task2',
        module: 'test',
        priority: 1,
        description: 'High priority',
        acceptanceCriteria: [],
      });

      await services.taskService.createTask({
        id: 'task3',
        module: 'test',
        priority: 2,
        description: 'Medium priority',
        acceptanceCriteria: [],
      });

      // Act
      const nextTask = await services.taskService.getNextTask();

      // Assert - Should return highest priority (lowest number)
      expect(nextTask?.id).toBe('task2');
      expect(nextTask?.priority).toBe(1);
    });

    it('should respect task dependencies', async () => {
      // Arrange - Create tasks with dependencies
      await services.taskService.createTask({
        id: 'setup',
        module: 'test',
        priority: 1,
        description: 'Setup task',
        acceptanceCriteria: [],
        dependencies: [],
      });

      await services.taskService.createTask({
        id: 'dependent',
        module: 'test',
        priority: 1,
        description: 'Dependent task',
        acceptanceCriteria: [],
        dependencies: ['setup'],
      });

      // Act - Get next task (setup is not completed)
      const nextTask1 = await services.taskService.getNextTask();

      // Assert - Should return setup first
      expect(nextTask1?.id).toBe('setup');

      // Act - Complete setup and get next
      await services.taskService.startTask('setup');
      await services.taskService.completeTask('setup');
      const nextTask2 = await services.taskService.getNextTask();

      // Assert - Now dependent task is available
      expect(nextTask2?.id).toBe('dependent');
    });

    it('should list tasks with filters', async () => {
      // Arrange
      await services.taskService.createTask({
        id: 'auth.login',
        module: 'auth',
        priority: 1,
        description: 'Login',
        acceptanceCriteria: [],
      });

      await services.taskService.createTask({
        id: 'auth.signup',
        module: 'auth',
        priority: 2,
        description: 'Signup',
        acceptanceCriteria: [],
      });

      await services.taskService.createTask({
        id: 'api.users',
        module: 'api',
        priority: 1,
        description: 'Users API',
        acceptanceCriteria: [],
      });

      // Start one task
      await services.taskService.startTask('auth.login');

      // Act - Filter by module
      const authTasks = await services.taskService.listTasks({
        filter: { module: 'auth' },
      });

      // Assert
      expect(authTasks.tasks).toHaveLength(2);
      expect(authTasks.tasks.every(t => t.module === 'auth')).toBe(true);

      // Act - Filter by status
      const inProgressTasks = await services.taskService.listTasks({
        filter: { status: 'in_progress' },
      });

      // Assert
      expect(inProgressTasks.tasks).toHaveLength(1);
      expect(inProgressTasks.tasks[0].id).toBe('auth.login');
    });

    it('should handle batch operations', async () => {
      // Arrange
      await services.taskService.createTask({
        id: 'task1',
        module: 'test',
        priority: 1,
        description: 'Task 1',
        acceptanceCriteria: [],
      });

      await services.taskService.createTask({
        id: 'task2',
        module: 'test',
        priority: 2,
        description: 'Task 2',
        acceptanceCriteria: [],
      });

      // Act - Batch start and complete
      const results = await services.taskService.batchOperations(
        [
          { action: 'start', taskId: 'task1' },
          { action: 'start', taskId: 'task2' },
          { action: 'done', taskId: 'task1' },
        ],
        false // non-atomic
      );

      // Assert
      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);

      const task1 = await services.taskService.getTask('task1');
      const task2 = await services.taskService.getTask('task2');

      expect(task1?.status).toBe('completed');
      expect(task2?.status).toBe('in_progress');
    });
  });

  describe('State Workflow', () => {
    it('should initialize and transition state', async () => {
      // Act - Initialize
      const initialState = await services.stateService.initializeState('clarify');

      // Assert
      expect(initialState.phase).toBe('clarify');
      expect(initialState.startedAt).toBeDefined();

      // Act - Transition to next phase
      const nextState = await services.stateService.transitionToPhase('breakdown');

      // Assert
      expect(nextState.phase).toBe('breakdown');
    });

    it('should track current task in state', async () => {
      // Arrange
      await services.stateService.initializeState();

      // Act
      const updatedState = await services.stateService.setCurrentTask('auth.login');

      // Assert
      expect(updatedState.currentTask).toBe('auth.login');

      // Act - Clear current task
      const clearedState = await services.stateService.setCurrentTask(undefined);

      // Assert
      expect(clearedState.currentTask).toBeUndefined();
    });

    it('should manage PRD', async () => {
      // Arrange
      await services.stateService.initializeState();
      const prd = {
        title: 'Authentication System',
        description: 'Build user authentication',
        requirements: ['Login', 'Signup', 'Logout'],
      };

      // Act
      const updatedState = await services.stateService.setPrd(prd);

      // Assert
      expect(updatedState.prd).toEqual(prd);
    });

    it('should track errors', async () => {
      // Arrange
      await services.stateService.initializeState();

      // Act
      await services.stateService.addError({ message: 'Error 1', code: 'ERR1' });
      await services.stateService.addError({ message: 'Error 2', code: 'ERR2' });
      const state = await services.stateService.getState();

      // Assert
      expect(state?.errors).toHaveLength(2);

      // Act - Clear errors
      const clearedState = await services.stateService.clearErrors();

      // Assert
      expect(clearedState.errors).toHaveLength(0);
    });
  });

  describe('Detection Workflow', () => {
    it('should detect project language', async () => {
      // Arrange - Create package.json to simulate TypeScript project
      const packageJson = {
        name: 'test-project',
        dependencies: {
          react: '^18.0.0',
        },
        devDependencies: {
          typescript: '^5.0.0',
          vitest: '^1.0.0',
        },
        scripts: {
          test: 'vitest run',
          build: 'tsc',
        },
      };

      fs.writeJSONSync(path.join(workspaceDir, 'package.json'), packageJson);
      fs.writeFileSync(path.join(workspaceDir, 'tsconfig.json'), '{}');

      // Act
      const config = services.detectionService.detect();

      // Assert
      expect(config.language).toBe('typescript');
      expect(config.framework).toBe('react');
      expect(config.testFramework).toBe('vitest');
      expect(config.verifyCommands.length).toBeGreaterThan(0);
    });

    it('should save detection results', async () => {
      // Arrange - Create minimal project structure
      fs.writeJSONSync(path.join(workspaceDir, 'package.json'), {
        name: 'test',
        devDependencies: { typescript: '^5.0.0' },
      });
      fs.writeFileSync(path.join(workspaceDir, 'tsconfig.json'), '{}');

      // Act
      const result = await services.detectionService.detectAndSave();

      // Assert
      expect(result.saved).toBe(true);
      expect(result.languageConfig.language).toBe('typescript');
    });

    it('should detect and save to index with verification', async () => {
      // Arrange - Create minimal project structure
      fs.writeJSONSync(path.join(workspaceDir, 'package.json'), {
        name: 'integration-test',
        devDependencies: {
          typescript: '^5.0.0',
          vitest: '^1.0.0'
        },
      });
      fs.writeFileSync(path.join(workspaceDir, 'tsconfig.json'), '{}');

      // Act - Detect and save
      const result = await services.detectionService.detectAndSave();

      // Assert - Result is correct
      expect(result.saved).toBe(true);
      expect(result.languageConfig.language).toBe('typescript');
      expect(result.languageConfig.testFramework).toBe('vitest');

      // Assert - Verify saved to index file
      const indexPath = path.join(workspaceDir, '.ralph-dev', 'tasks', 'index.json');
      expect(fs.existsSync(indexPath)).toBe(true);

      const indexData = fs.readJSONSync(indexPath);
      expect(indexData.metadata).toBeDefined();
      expect(indexData.metadata.languageConfig).toBeDefined();
      expect(indexData.metadata.languageConfig.language).toBe('typescript');
      expect(indexData.metadata.languageConfig.testFramework).toBe('vitest');
    });
  });

  describe('Service Integration', () => {
    it('should coordinate task and state services', async () => {
      // Arrange
      await services.stateService.initializeState('implement');
      const taskInput = {
        id: 'test.task',
        module: 'test',
        priority: 1,
        description: 'Test task',
        acceptanceCriteria: [],
      };

      // Act - Create and start task
      await services.taskService.createTask(taskInput);
      await services.taskService.startTask('test.task');

      // Assert - State should track current task
      const state = await services.stateService.getState();
      expect(state?.currentTask).toBe('test.task');
    });

    it('should handle complete workflow from creation to completion', async () => {
      // Act - Initialize state
      await services.stateService.initializeState('implement');

      // Create task
      await services.taskService.createTask({
        id: 'feature.implementation',
        module: 'feature',
        priority: 1,
        description: 'Implement feature',
        acceptanceCriteria: ['Feature works', 'Tests pass'],
      });

      // Start task
      await services.taskService.startTask('feature.implementation');

      // Complete task
      await services.taskService.completeTask('feature.implementation', '45 minutes');

      // Transition phase
      const finalState = await services.stateService.transitionToPhase('deliver');

      // Assert - Everything completed successfully
      const task = await services.taskService.getTask('feature.implementation');
      expect(task?.status).toBe('completed');
      expect(finalState.phase).toBe('deliver');
    });

    it('should handle full breakdown phase workflow', async () => {
      // Arrange - Initialize to breakdown phase
      await services.stateService.initializeState('breakdown');

      const prd = {
        title: 'User Authentication',
        description: 'Implement user auth system',
        requirements: ['Login', 'Signup', 'Password reset'],
      };

      // Act - Set PRD
      await services.stateService.setPrd(prd);

      // Create multiple tasks from breakdown
      const tasks = [
        { id: 'auth.models', module: 'auth', priority: 1, description: 'User models' },
        { id: 'auth.login', module: 'auth', priority: 2, description: 'Login endpoint', dependencies: ['auth.models'] },
        { id: 'auth.signup', module: 'auth', priority: 2, description: 'Signup endpoint', dependencies: ['auth.models'] },
      ];

      for (const task of tasks) {
        await services.taskService.createTask({
          ...task,
          acceptanceCriteria: [`${task.description} works`],
        });
      }

      // Assert - All tasks created
      const allTasks = await services.taskService.listTasks({});
      expect(allTasks.tasks).toHaveLength(3);

      // Assert - PRD is set
      const state = await services.stateService.getState();
      expect(state?.prd).toEqual(prd);

      // Act - Transition to implement phase
      const implementState = await services.stateService.transitionToPhase('implement');

      // Assert - Phase changed
      expect(implementState.phase).toBe('implement');
    });

    it('should handle heal phase workflow with errors', async () => {
      // Arrange - Initialize to heal phase
      await services.stateService.initializeState('heal');

      // Create and fail a task
      await services.taskService.createTask({
        id: 'broken.task',
        module: 'broken',
        priority: 1,
        description: 'Task that needs healing',
        acceptanceCriteria: ['Should work'],
      });

      await services.taskService.startTask('broken.task');
      await services.taskService.failTask('broken.task', 'Tests failed');

      // Track errors in state
      await services.stateService.addError({
        message: 'Unit tests failed in broken.task',
        code: 'TEST_FAILURE',
      });

      // Assert - Error tracked and task failed
      const stateWithError = await services.stateService.getState();
      expect(stateWithError?.errors).toHaveLength(1);

      const failedTask = await services.taskService.getTask('broken.task');
      expect(failedTask?.status).toBe('failed');

      // Act - Create fix task to address the failure
      await services.taskService.createTask({
        id: 'broken.task.fix',
        module: 'broken',
        priority: 1,
        description: 'Fix for broken task',
        acceptanceCriteria: ['Tests pass'],
      });

      await services.taskService.startTask('broken.task.fix');
      await services.taskService.completeTask('broken.task.fix', '15 minutes');

      // Clear errors after successful fix
      const clearedState = await services.stateService.clearErrors();

      // Assert - Fix task completed, errors cleared
      const fixTask = await services.taskService.getTask('broken.task.fix');
      expect(fixTask?.status).toBe('completed');
      expect(clearedState.errors).toHaveLength(0);
    });

    it('should handle multi-module project workflow', async () => {
      // Arrange - Simulate project with multiple modules
      await services.stateService.initializeState('implement');

      // Create tasks across multiple modules
      const modules = ['auth', 'api', 'ui', 'database'];
      for (let i = 0; i < modules.length; i++) {
        await services.taskService.createTask({
          id: `${modules[i]}.setup`,
          module: modules[i],
          priority: i + 1,
          description: `Setup ${modules[i]} module`,
          acceptanceCriteria: [`${modules[i]} module initialized`],
        });
      }

      // Act - Get tasks by module
      const authTasks = await services.taskService.listTasks({ filter: { module: 'auth' } });
      const apiTasks = await services.taskService.listTasks({ filter: { module: 'api' } });

      // Assert - Correct module filtering
      expect(authTasks.tasks).toHaveLength(1);
      expect(authTasks.tasks[0].module).toBe('auth');
      expect(apiTasks.tasks).toHaveLength(1);
      expect(apiTasks.tasks[0].module).toBe('api');

      // Act - Process tasks in priority order
      const firstTask = await services.taskService.getNextTask();
      expect(firstTask?.id).toBe('auth.setup');

      await services.taskService.startTask('auth.setup');
      await services.taskService.completeTask('auth.setup');

      const secondTask = await services.taskService.getNextTask();
      expect(secondTask?.id).toBe('api.setup');
    });

    it('should handle complete project lifecycle end-to-end', async () => {
      // Phase 1: Clarify
      await services.stateService.initializeState('clarify');
      const prd = {
        title: 'Todo App',
        description: 'Simple todo application',
        requirements: ['Create todo', 'List todos', 'Delete todo'],
      };
      await services.stateService.setPrd(prd);

      // Phase 2: Breakdown
      await services.stateService.transitionToPhase('breakdown');
      const breakdownTasks = [
        { id: 'setup.scaffold', module: 'setup', priority: 1 },
        { id: 'api.create', module: 'api', priority: 2, dependencies: ['setup.scaffold'] },
        { id: 'api.list', module: 'api', priority: 2, dependencies: ['setup.scaffold'] },
        { id: 'ui.components', module: 'ui', priority: 3, dependencies: ['api.create', 'api.list'] },
      ];

      for (const task of breakdownTasks) {
        await services.taskService.createTask({
          ...task,
          description: `Task ${task.id}`,
          acceptanceCriteria: ['Works'],
        });
      }

      // Phase 3: Implement
      await services.stateService.transitionToPhase('implement');

      // Execute tasks in order
      let nextTask = await services.taskService.getNextTask();
      while (nextTask) {
        await services.taskService.startTask(nextTask.id);
        await services.taskService.completeTask(nextTask.id, '10 minutes');
        nextTask = await services.taskService.getNextTask();
      }

      // Verify all tasks completed
      const allTasks = await services.taskService.listTasks({});
      expect(allTasks.tasks.every(t => t.status === 'completed')).toBe(true);

      // Phase 4: Deliver
      const finalState = await services.stateService.transitionToPhase('deliver');
      expect(finalState.phase).toBe('deliver');

      // Final verification
      const completedTasks = await services.taskService.listTasks({
        filter: { status: 'completed' },
      });
      expect(completedTasks.tasks).toHaveLength(breakdownTasks.length);
    });
  });
});
