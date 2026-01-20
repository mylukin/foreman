/**
 * Tests for refactored tasks commands using TaskService
 *
 * Testing acceptance criteria:
 * 1. Reduce tasks.ts to ≤50 lines per command handler
 * 2. Remove all business logic (move to TaskService)
 * 3. Remove all direct file system access
 * 4. Use dependency injection (factory function)
 * 5. Keep only: parse args, call service, format output
 * 6. Update tests to use real service + mock repositories
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { registerTaskCommands } from '../../src/commands/tasks';
import * as path from 'path';
import * as fs from 'fs-extra';

describe('Refactored tasks commands (integration with real service)', () => {
  let program: Command;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;
  const testDir = path.join(__dirname, '__test-refactored-tasks-integration__');
  const tasksDir = path.join(testDir, '.ralph-dev', 'tasks');
  const indexFile = path.join(tasksDir, 'index.json');

  beforeEach(() => {
    program = new Command();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

    // Create test directory
    fs.ensureDirSync(tasksDir);
    fs.writeJSONSync(indexFile, {
      version: '1.0.0',
      updatedAt: new Date().toISOString(),
      metadata: { projectGoal: '' },
      tasks: {},
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    vi.clearAllMocks();
    fs.removeSync(testDir);
  });

  describe('AC1 & AC4: Thin command handlers using service factory', () => {
    it('should register all task commands', () => {
      registerTaskCommands(program, testDir);

      const tasksCommand = program.commands.find(cmd => cmd.name() === 'tasks');
      expect(tasksCommand).toBeDefined();

      const commandNames = tasksCommand?.commands.map(c => c.name()) || [];
      expect(commandNames).toContain('create');
      expect(commandNames).toContain('list');
      expect(commandNames).toContain('get');
      expect(commandNames).toContain('start');
      expect(commandNames).toContain('done');
      expect(commandNames).toContain('fail');
      expect(commandNames).toContain('next');
      expect(commandNames).toContain('batch');
    });
  });

  describe('AC2 & AC3: Commands delegate to service (no file operations)', () => {
    it('create command should work via service', async () => {
      registerTaskCommands(program, testDir);

      await program.parseAsync([
        'node', 'test', 'tasks', 'create',
        '--id', 'test.task',
        '--module', 'test',
        '--description', 'Test task',
        '--criteria', 'Criterion 1',
      ]);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ Task test.task created')
      );
    });

    it('list command should work via service', async () => {
      registerTaskCommands(program, testDir);

      // Create a task first
      await program.parseAsync([
        'node', 'test', 'tasks', 'create',
        '--id', 'task1',
        '--module', 'test',
        '--description', 'Task 1',
      ]);

      consoleLogSpy.mockClear();

      await program.parseAsync(['node', 'test', 'tasks', 'list']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tasks (1 of 1)')
      );
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('start command should work via service', async () => {
      registerTaskCommands(program, testDir);

      // Create a task first
      await program.parseAsync([
        'node', 'test', 'tasks', 'create',
        '--id', 'task1',
        '--module', 'test',
        '--description', 'Task 1',
      ]);

      consoleLogSpy.mockClear();

      await program.parseAsync(['node', 'test', 'tasks', 'start', 'task1']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('→ Task task1 started')
      );
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('done command should work via service', async () => {
      registerTaskCommands(program, testDir);

      // Create and start a task
      await program.parseAsync([
        'node', 'test', 'tasks', 'create',
        '--id', 'task1',
        '--module', 'test',
        '--description', 'Task 1',
      ]);
      await program.parseAsync(['node', 'test', 'tasks', 'start', 'task1']);

      consoleLogSpy.mockClear();

      await program.parseAsync(['node', 'test', 'tasks', 'done', 'task1', '-d', '30m']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✓ Task task1 marked as completed')
      );
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('fail command should work via service', async () => {
      registerTaskCommands(program, testDir);

      // Create and start a task
      await program.parseAsync([
        'node', 'test', 'tasks', 'create',
        '--id', 'task1',
        '--module', 'test',
        '--description', 'Task 1',
      ]);
      await program.parseAsync(['node', 'test', 'tasks', 'start', 'task1']);

      consoleLogSpy.mockClear();

      await program.parseAsync([
        'node', 'test', 'tasks', 'fail', 'task1',
        '--reason', 'Test failure',
      ]);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✗ Task task1 marked as failed')
      );
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('AC5: Commands only format output', () => {
    it('list command should format results correctly', async () => {
      registerTaskCommands(program, testDir);

      // Create multiple tasks
      await program.parseAsync([
        'node', 'test', 'tasks', 'create',
        '--id', 'task1',
        '--module', 'module1',
        '--priority', '1',
        '--description', 'Task 1',
      ]);

      await program.parseAsync([
        'node', 'test', 'tasks', 'create',
        '--id', 'task2',
        '--module', 'module1',
        '--priority', '2',
        '--description', 'Task 2',
      ]);

      consoleLogSpy.mockClear();

      await program.parseAsync(['node', 'test', 'tasks', 'list']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tasks (2 of 2)')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('task1')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('task2')
      );
    });

    it('list command should support JSON output', async () => {
      registerTaskCommands(program, testDir);

      await program.parseAsync([
        'node', 'test', 'tasks', 'create',
        '--id', 'task1',
        '--module', 'test',
        '--description', 'Task 1',
      ]);

      consoleLogSpy.mockClear();

      await program.parseAsync(['node', 'test', 'tasks', 'list', '--json']);

      const jsonOutput = consoleLogSpy.mock.calls[0][0];
      expect(() => JSON.parse(jsonOutput)).not.toThrow();
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('AC6: Real service with mock repositories (unit test)', () => {
    it('should create TaskService with mock repositories', async () => {
      const { TaskService } = await import('../../src/services/task-service');
      const { MockTaskRepository, MockStateRepository, MockLogger } = await import('../../src/test-utils');

      const mockTaskRepo = new MockTaskRepository();
      const mockStateRepo = new MockStateRepository();
      const mockLogger = new MockLogger();

      const taskService = new TaskService(
        mockTaskRepo,
        mockStateRepo,
        mockLogger
      );

      vi.spyOn(mockTaskRepo, 'findById').mockResolvedValue(null);
      vi.spyOn(mockTaskRepo, 'save').mockResolvedValue(undefined);

      const task = await taskService.createTask({
        id: 'test.task',
        module: 'test',
        description: 'Test task',
      });

      expect(task.id).toBe('test.task');
      expect(mockTaskRepo.save).toHaveBeenCalled();
      expect(mockLogger.wasInfoCalledWith('Creating task: test.task')).toBe(true);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle task not found error', async () => {
      registerTaskCommands(program, testDir);

      await program.parseAsync(['node', 'test', 'tasks', 'start', 'nonexistent']);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalled(); // Error exit code
      expect(processExitSpy).not.toHaveBeenCalledWith(0); // Should not succeed
    });

    it('should handle duplicate task creation', async () => {
      registerTaskCommands(program, testDir);

      await program.parseAsync([
        'node', 'test', 'tasks', 'create',
        '--id', 'duplicate.task',
        '--module', 'test',
        '--description', 'First task',
      ]);

      consoleLogSpy.mockClear();
      consoleErrorSpy.mockClear();
      processExitSpy.mockClear();

      await program.parseAsync([
        'node', 'test', 'tasks', 'create',
        '--id', 'duplicate.task',
        '--module', 'test',
        '--description', 'Duplicate task',
      ]);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).not.toHaveBeenCalledWith(0);
    });
  });

  describe('Batch operations', () => {
    it('should execute batch operations via service', async () => {
      registerTaskCommands(program, testDir);

      // Create tasks first
      await program.parseAsync([
        'node', 'test', 'tasks', 'create',
        '--id', 'task1',
        '--module', 'test',
        '--description', 'Task 1',
      ]);

      await program.parseAsync([
        'node', 'test', 'tasks', 'create',
        '--id', 'task2',
        '--module', 'test',
        '--description', 'Task 2',
      ]);

      consoleLogSpy.mockClear();

      const operations = JSON.stringify([
        { action: 'start', taskId: 'task1' },
        { action: 'start', taskId: 'task2' },
      ]);

      await program.parseAsync([
        'node', 'test', 'tasks', 'batch',
        '--operations', operations,
      ]);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Batch Operations Result')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Successful: 2')
      );
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('tasks next - refactored to use service', () => {
    it('should get next task via TaskService.getNextTask()', async () => {
      registerTaskCommands(program, testDir);

      // Create a pending task
      await program.parseAsync([
        'node', 'test', 'tasks', 'create',
        '--id', 'next.task',
        '--module', 'test',
        '--description', 'Next task',
        '--priority', '1',
      ]);

      consoleLogSpy.mockClear();

      await program.parseAsync(['node', 'test', 'tasks', 'next']);

      // Should show the task
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('next.task')
      );
    });

    it('should handle no pending tasks via service', async () => {
      registerTaskCommands(program, testDir);

      // No tasks created

      await program.parseAsync(['node', 'test', 'tasks', 'next']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No pending tasks')
      );
    });

    it('should return next task in JSON format', async () => {
      registerTaskCommands(program, testDir);

      await program.parseAsync([
        'node', 'test', 'tasks', 'create',
        '--id', 'next.task',
        '--module', 'test',
        '--description', 'Next task',
      ]);

      consoleLogSpy.mockClear();

      await program.parseAsync(['node', 'test', 'tasks', 'next', '--json']);

      const output = consoleLogSpy.mock.calls[0]?.[0];
      expect(() => JSON.parse(output)).not.toThrow();
      const parsed = JSON.parse(output);
      expect(parsed.task?.id).toBe('next.task');
    });
  });

  describe('tasks get - refactored to use service', () => {
    it('should get task via TaskService.getTask()', async () => {
      registerTaskCommands(program, testDir);

      await program.parseAsync([
        'node', 'test', 'tasks', 'create',
        '--id', 'get.task',
        '--module', 'test',
        '--description', 'Get task test',
      ]);

      consoleLogSpy.mockClear();

      await program.parseAsync(['node', 'test', 'tasks', 'get', 'get.task']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('get.task')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Get task test')
      );
    });

    it('should handle task not found via service', async () => {
      registerTaskCommands(program, testDir);

      await program.parseAsync(['node', 'test', 'tasks', 'get', 'nonexistent']);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalled();
    });

    it('should return task in JSON format', async () => {
      registerTaskCommands(program, testDir);

      await program.parseAsync([
        'node', 'test', 'tasks', 'create',
        '--id', 'json.task',
        '--module', 'test',
        '--description', 'JSON test',
      ]);

      consoleLogSpy.mockClear();

      await program.parseAsync(['node', 'test', 'tasks', 'get', 'json.task', '--json']);

      const output = consoleLogSpy.mock.calls[0]?.[0];
      expect(() => JSON.parse(output)).not.toThrow();
      const parsed = JSON.parse(output);
      expect(parsed.id).toBe('json.task');
    });
  });
});
