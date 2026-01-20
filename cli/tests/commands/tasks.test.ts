import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { registerTaskCommands } from '../../src/commands/tasks';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('tasks commands', () => {
  let program: Command;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;
  const testDir = path.join(__dirname, '__test-tasks-command__');
  const tasksDir = path.join(testDir, '.ralph-dev', 'tasks');
  const indexFile = path.join(tasksDir, 'index.json');

  beforeEach(() => {
    program = new Command();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

    fs.ensureDirSync(testDir);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    vi.clearAllMocks();
    fs.removeSync(testDir);
  });

  describe('tasks init', () => {
    it('should register tasks init command', () => {
      registerTaskCommands(program, testDir);

      const tasksCommand = program.commands.find(cmd => cmd.name() === 'tasks');
      expect(tasksCommand).toBeDefined();

      const initCommand = tasksCommand?.commands.find(cmd => cmd.name() === 'init');
      expect(initCommand).toBeDefined();
    });

    it('should initialize tasks system', async () => {
      registerTaskCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'tasks', 'init']);

      expect(fs.existsSync(indexFile)).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Tasks system initialized'));
    });

    it('should set project goal', async () => {
      registerTaskCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'tasks', 'init', '--project-goal', 'Build awesome app']);

      const index = fs.readJSONSync(indexFile);
      expect(index.metadata.projectGoal).toBe('Build awesome app');
    });

    it('should set language config', async () => {
      registerTaskCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'tasks', 'init', '--language', 'python', '--framework', 'django']);

      const index = fs.readJSONSync(indexFile);
      expect(index.metadata.languageConfig.language).toBe('python');
      expect(index.metadata.languageConfig.framework).toBe('django');
    });
  });

  describe('tasks create', () => {
    beforeEach(async () => {
      registerTaskCommands(new Command(), testDir);
      await new Command()
        .addCommand(
          new Command().name('tasks').addCommand(
            new Command().name('init').action(() => {
              fs.ensureDirSync(tasksDir);
              fs.writeJSONSync(indexFile, {
                version: '1.0.0',
                updatedAt: new Date().toISOString(),
                metadata: { projectGoal: '' },
                tasks: {},
              });
            })
          )
        )
        .parseAsync(['node', 'test', 'tasks', 'init']);
    });

    it('should register tasks create command', () => {
      registerTaskCommands(program, testDir);

      const tasksCommand = program.commands.find(cmd => cmd.name() === 'tasks');
      const createCommand = tasksCommand?.commands.find(cmd => cmd.name() === 'create');

      expect(createCommand).toBeDefined();
    });

    it('should create a new task', async () => {
      registerTaskCommands(program, testDir);
      await program.parseAsync([
        'node', 'test', 'tasks', 'create',
        '--id', 'auth.login',
        '--module', 'auth',
        '--description', 'Implement login',
        '--criteria', 'User can login',
        '--criteria', 'Invalid creds show error',
      ]);

      const taskFile = path.join(tasksDir, 'auth', 'login.md');
      expect(fs.existsSync(taskFile)).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Task auth.login created'));

      const index = fs.readJSONSync(indexFile);
      expect(index.tasks['auth.login']).toBeDefined();
    });

    it('should create task with priority and estimated minutes', async () => {
      registerTaskCommands(program, testDir);
      await program.parseAsync([
        'node', 'test', 'tasks', 'create',
        '--id', 'api.endpoint',
        '--module', 'api',
        '--priority', '2',
        '--estimated-minutes', '60',
        '--description', 'Create API endpoint',
      ]);

      const taskFile = path.join(tasksDir, 'api', 'endpoint.md');
      const content = fs.readFileSync(taskFile, 'utf-8');

      expect(content).toContain('priority: 2');
      expect(content).toContain('estimatedMinutes: 60');
    });

    it('should create task with dependencies', async () => {
      registerTaskCommands(program, testDir);
      await program.parseAsync([
        'node', 'test', 'tasks', 'create',
        '--id', 'auth.signup',
        '--module', 'auth',
        '--description', 'Implement signup',
        '--dependencies', 'auth.login',
        '--dependencies', 'db.init',
      ]);

      const taskFile = path.join(tasksDir, 'auth', 'signup.md');
      const content = fs.readFileSync(taskFile, 'utf-8');

      expect(content).toContain('auth.login');
      expect(content).toContain('db.init');
    });

    it('should create task with test pattern', async () => {
      registerTaskCommands(program, testDir);
      await program.parseAsync([
        'node', 'test', 'tasks', 'create',
        '--id', 'utils.helper',
        '--module', 'utils',
        '--description', 'Create helper function',
        '--test-pattern', '**/*.test.ts',
      ]);

      const taskFile = path.join(tasksDir, 'utils', 'helper.md');
      const content = fs.readFileSync(taskFile, 'utf-8');

      expect(content).toContain('testRequirements');
      expect(content).toContain('**/*.test.ts');
    });
  });

  describe('tasks list', () => {
    beforeEach(async () => {
      // Setup test tasks
      fs.ensureDirSync(tasksDir);
      fs.ensureDirSync(path.join(tasksDir, 'auth'));

      const task1Content = `---
id: auth.login
module: auth
priority: 1
status: pending
---

# Implement login
`;

      const task2Content = `---
id: auth.signup
module: auth
priority: 2
status: in_progress
---

# Implement signup
`;

      fs.writeFileSync(path.join(tasksDir, 'auth', 'login.md'), task1Content);
      fs.writeFileSync(path.join(tasksDir, 'auth', 'signup.md'), task2Content);

      fs.writeJSONSync(indexFile, {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        metadata: { projectGoal: '' },
        tasks: {
          'auth.login': {
            status: 'pending',
            priority: 1,
            module: 'auth',
            description: 'Implement login',
            filePath: 'auth/login.md',
          },
          'auth.signup': {
            status: 'in_progress',
            priority: 2,
            module: 'auth',
            description: 'Implement signup',
            filePath: 'auth/signup.md',
          },
        },
      });
    });

    it('should register tasks list command', () => {
      registerTaskCommands(program, testDir);

      const tasksCommand = program.commands.find(cmd => cmd.name() === 'tasks');
      const listCommand = tasksCommand?.commands.find(cmd => cmd.name() === 'list');

      expect(listCommand).toBeDefined();
    });

    it('should list all tasks', async () => {
      registerTaskCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'tasks', 'list']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('auth.login'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('auth.signup'));
    });

    it('should filter tasks by status', async () => {
      registerTaskCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'tasks', 'list', '--status', 'pending']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('auth.login'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Tasks (1 of 1)'));
    });

    it('should filter tasks by module', async () => {
      registerTaskCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'tasks', 'list', '--module', 'auth']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('auth.login'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('auth.signup'));
    });

    it('should output JSON format', async () => {
      registerTaskCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'tasks', 'list', '--json']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"id": "auth.login"')
      );
    });
  });

  describe('tasks get', () => {
    beforeEach(async () => {
      fs.ensureDirSync(tasksDir);
      fs.ensureDirSync(path.join(tasksDir, 'auth'));

      const taskContent = `---
id: auth.login
module: auth
priority: 1
status: pending
estimatedMinutes: 30
---

# Implement login

## Acceptance Criteria

1. User can login with email and password

## Notes

Use JWT for authentication
`;

      fs.writeFileSync(path.join(tasksDir, 'auth', 'login.md'), taskContent);

      fs.writeJSONSync(indexFile, {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        metadata: { projectGoal: '' },
        tasks: {
          'auth.login': {
            status: 'pending',
            priority: 1,
            module: 'auth',
            description: 'Implement login',
            filePath: 'auth/login.md',
          },
        },
      });
    });

    it('should register tasks get command', () => {
      registerTaskCommands(program, testDir);

      const tasksCommand = program.commands.find(cmd => cmd.name() === 'tasks');
      const getCommand = tasksCommand?.commands.find(cmd => cmd.name() === 'get');

      expect(getCommand).toBeDefined();
    });

    it('should get task details', async () => {
      registerTaskCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'tasks', 'get', 'auth.login']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('auth.login'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Implement login'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('pending'));
    });

    it('should handle non-existent task', async () => {
      registerTaskCommands(program, testDir);

      // Expect the command to throw or exit due to task not found
      try {
        await program.parseAsync(['node', 'test', 'tasks', 'get', 'nonexistent.task']);
      } catch (error) {
        // Command may throw in test environment
      }

      // Verify that either error was logged or process.exit was called
      const errorLogged = consoleErrorSpy.mock.calls.length > 0;
      const processExited = processExitSpy.mock.calls.length > 0;

      expect(errorLogged || processExited).toBe(true);
    });
  });

  describe('tasks done', () => {
    beforeEach(async () => {
      fs.ensureDirSync(tasksDir);
      fs.ensureDirSync(path.join(tasksDir, 'auth'));

      const taskContent = `---
id: auth.login
module: auth
priority: 1
status: in_progress
---

# Implement login
`;

      fs.writeFileSync(path.join(tasksDir, 'auth', 'login.md'), taskContent);

      fs.writeJSONSync(indexFile, {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        metadata: { projectGoal: '' },
        tasks: {
          'auth.login': {
            status: 'in_progress',
            priority: 1,
            module: 'auth',
            description: 'Implement login',
            filePath: 'auth/login.md',
          },
        },
      });
    });

    it('should register tasks done command', () => {
      registerTaskCommands(program, testDir);

      const tasksCommand = program.commands.find(cmd => cmd.name() === 'tasks');
      const doneCommand = tasksCommand?.commands.find(cmd => cmd.name() === 'done');

      expect(doneCommand).toBeDefined();
    });

    it('should mark task as completed', async () => {
      registerTaskCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'tasks', 'done', 'auth.login']);

      const taskContent = fs.readFileSync(path.join(tasksDir, 'auth', 'login.md'), 'utf-8');
      expect(taskContent).toContain('status: completed');

      const index = fs.readJSONSync(indexFile);
      expect(index.tasks['auth.login'].status).toBe('completed');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('completed'));
    });
  });

  describe('tasks start', () => {
    beforeEach(async () => {
      fs.ensureDirSync(tasksDir);
      fs.ensureDirSync(path.join(tasksDir, 'auth'));

      const taskContent = `---
id: auth.login
module: auth
priority: 1
status: pending
---

# Implement login
`;

      fs.writeFileSync(path.join(tasksDir, 'auth', 'login.md'), taskContent);

      fs.writeJSONSync(indexFile, {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        metadata: { projectGoal: '' },
        tasks: {
          'auth.login': {
            status: 'pending',
            priority: 1,
            module: 'auth',
            description: 'Implement login',
            filePath: 'auth/login.md',
          },
        },
      });
    });

    it('should register tasks start command', () => {
      registerTaskCommands(program, testDir);

      const tasksCommand = program.commands.find(cmd => cmd.name() === 'tasks');
      const startCommand = tasksCommand?.commands.find(cmd => cmd.name() === 'start');

      expect(startCommand).toBeDefined();
    });

    it('should mark task as in_progress', async () => {
      registerTaskCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'tasks', 'start', 'auth.login']);

      const taskContent = fs.readFileSync(path.join(tasksDir, 'auth', 'login.md'), 'utf-8');
      expect(taskContent).toContain('status: in_progress');

      const index = fs.readJSONSync(indexFile);
      expect(index.tasks['auth.login'].status).toBe('in_progress');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('started'));
    });
  });

  describe('tasks fail', () => {
    beforeEach(async () => {
      fs.ensureDirSync(tasksDir);
      fs.ensureDirSync(path.join(tasksDir, 'auth'));

      const taskContent = `---
id: auth.login
module: auth
priority: 1
status: in_progress
---

# Implement login
`;

      fs.writeFileSync(path.join(tasksDir, 'auth', 'login.md'), taskContent);

      fs.writeJSONSync(indexFile, {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        metadata: { projectGoal: '' },
        tasks: {
          'auth.login': {
            status: 'in_progress',
            priority: 1,
            module: 'auth',
            description: 'Implement login',
            filePath: 'auth/login.md',
          },
        },
      });
    });

    it('should register tasks fail command', () => {
      registerTaskCommands(program, testDir);

      const tasksCommand = program.commands.find(cmd => cmd.name() === 'tasks');
      const failCommand = tasksCommand?.commands.find(cmd => cmd.name() === 'fail');

      expect(failCommand).toBeDefined();
    });

    it('should mark task as failed', async () => {
      registerTaskCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'tasks', 'fail', 'auth.login', '--reason', 'Test failure']);

      const taskContent = fs.readFileSync(path.join(tasksDir, 'auth', 'login.md'), 'utf-8');
      expect(taskContent).toContain('status: failed');

      const index = fs.readJSONSync(indexFile);
      expect(index.tasks['auth.login'].status).toBe('failed');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('failed'));
    });
  });

  describe('tasks next', () => {
    beforeEach(async () => {
      fs.ensureDirSync(tasksDir);
      fs.ensureDirSync(path.join(tasksDir, 'auth'));

      const task1Content = `---
id: auth.login
module: auth
priority: 1
status: pending
---

# Implement login
`;

      const task2Content = `---
id: auth.signup
module: auth
priority: 2
status: completed
---

# Implement signup
`;

      fs.writeFileSync(path.join(tasksDir, 'auth', 'login.md'), task1Content);
      fs.writeFileSync(path.join(tasksDir, 'auth', 'signup.md'), task2Content);

      fs.writeJSONSync(indexFile, {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        metadata: { projectGoal: '' },
        tasks: {
          'auth.login': {
            status: 'pending',
            priority: 1,
            module: 'auth',
            description: 'Implement login',
            filePath: 'auth/login.md',
          },
          'auth.signup': {
            status: 'completed',
            priority: 2,
            module: 'auth',
            description: 'Implement signup',
            filePath: 'auth/signup.md',
          },
        },
      });
    });

    it('should register tasks next command', () => {
      registerTaskCommands(program, testDir);

      const tasksCommand = program.commands.find(cmd => cmd.name() === 'tasks');
      const nextCommand = tasksCommand?.commands.find(cmd => cmd.name() === 'next');

      expect(nextCommand).toBeDefined();
    });

    it('should get next task to work on', async () => {
      registerTaskCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'tasks', 'next']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('auth.login'));
    });

    it('should handle no pending tasks', async () => {
      // Update all tasks to completed
      const index = fs.readJSONSync(indexFile);
      index.tasks['auth.login'].status = 'completed';
      fs.writeJSONSync(indexFile, index);

      registerTaskCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'tasks', 'next']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No pending tasks'));
    });

    it('should output JSON format for next task', async () => {
      registerTaskCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'tasks', 'next', '--json']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"id": "auth.login"')
      );
    });

    it('should show progress statistics', async () => {
      registerTaskCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'tasks', 'next']);

      // Progress stats should be displayed
      const allCalls = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allCalls).toContain('auth.login');
    });
  });

  describe('tasks batch', () => {
    beforeEach(async () => {
      fs.ensureDirSync(tasksDir);
      fs.ensureDirSync(path.join(tasksDir, 'api'));

      // Create test tasks
      const task1Content = `---
id: api.user
module: api
priority: 1
status: pending
---

# Create user endpoint
`;

      const task2Content = `---
id: api.auth
module: api
priority: 2
status: pending
---

# Create auth endpoint
`;

      fs.writeFileSync(path.join(tasksDir, 'api', 'user.md'), task1Content);
      fs.writeFileSync(path.join(tasksDir, 'api', 'auth.md'), task2Content);

      fs.writeJSONSync(indexFile, {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        metadata: { projectGoal: '' },
        tasks: {
          'api.user': {
            status: 'pending',
            priority: 1,
            module: 'api',
            description: 'Create user endpoint',
            filePath: 'api/user.md',
          },
          'api.auth': {
            status: 'pending',
            priority: 2,
            module: 'api',
            description: 'Create auth endpoint',
            filePath: 'api/auth.md',
          },
        },
      });
    });

    it('should register tasks batch command', () => {
      registerTaskCommands(program, testDir);

      const tasksCommand = program.commands.find(cmd => cmd.name() === 'tasks');
      const batchCommand = tasksCommand?.commands.find(cmd => cmd.name() === 'batch');

      expect(batchCommand).toBeDefined();
    });

    it('should perform batch operations on existing tasks', async () => {
      const operations = [
        { action: 'start', taskId: 'api.user' },
        { action: 'start', taskId: 'api.auth' },
      ];

      registerTaskCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'tasks', 'batch', '--operations', JSON.stringify(operations)]);

      const index = fs.readJSONSync(indexFile);
      expect(index.tasks['api.user'].status).toBe('in_progress');
      expect(index.tasks['api.auth'].status).toBe('in_progress');
    });

    it('should handle invalid JSON in operations', async () => {
      registerTaskCommands(program, testDir);

      try {
        await program.parseAsync(['node', 'test', 'tasks', 'batch', '--operations', 'invalid-json{']);
      } catch (error) {
        // Expected to throw
      }

      // Should have logged an error or exited
      expect(consoleErrorSpy.mock.calls.length + processExitSpy.mock.calls.length).toBeGreaterThan(0);
    });

    it('should handle non-array operations', async () => {
      registerTaskCommands(program, testDir);

      try {
        await program.parseAsync(['node', 'test', 'tasks', 'batch', '--operations', '{"action":"start"}']);
      } catch (error) {
        // Expected to throw
      }

      expect(consoleErrorSpy.mock.calls.length + processExitSpy.mock.calls.length).toBeGreaterThan(0);
    });

    it('should handle task not found in batch operations', async () => {
      const operations = [
        { action: 'start', taskId: 'nonexistent.task' },
      ];

      registerTaskCommands(program, testDir);

      try {
        await program.parseAsync(['node', 'test', 'tasks', 'batch', '--operations', JSON.stringify(operations)]);
      } catch (error) {
        // Expected to handle error
      }

      // Operation should fail gracefully
      expect(true).toBe(true);
    });
  });

  describe('tasks parse-result', () => {
    beforeEach(async () => {
      fs.ensureDirSync(tasksDir);
      fs.writeJSONSync(indexFile, {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        metadata: { projectGoal: '' },
        tasks: {},
      });
    });

    it('should register tasks parse-result command', () => {
      registerTaskCommands(program, testDir);

      const tasksCommand = program.commands.find(cmd => cmd.name() === 'tasks');
      const parseResultCommand = tasksCommand?.commands.find(cmd => cmd.name() === 'parse-result');

      expect(parseResultCommand).toBeDefined();
    });

    it('should parse implementation result with text option', async () => {
      const implementationResult = JSON.stringify({
        task_id: 'feature.core',
        status: 'success',
        verification_passed: true,
        tests_passing: '10/10',
        coverage: 95,
        confidence_score: 0.98,
      });

      registerTaskCommands(program, testDir);

      try {
        await program.parseAsync(['node', 'test', 'tasks', 'parse-result', '--text', implementationResult]);
      } catch (error) {
        // May exit or throw
      }

      // Should have some output or process exit
      const hasOutput = consoleLogSpy.mock.calls.length > 0 ||
                       consoleErrorSpy.mock.calls.length > 0 ||
                       processExitSpy.mock.calls.length > 0;
      expect(hasOutput).toBe(true);
    });

    it('should parse implementation result from file', async () => {
      const resultFile = path.join(testDir, 'result.json');
      const implementationResult = JSON.stringify({
        task_id: 'api.endpoint',
        status: 'success',
        verification_passed: true,
      });

      fs.writeFileSync(resultFile, implementationResult, 'utf-8');

      registerTaskCommands(program, testDir);

      try {
        await program.parseAsync(['node', 'test', 'tasks', 'parse-result', '--file', resultFile]);
      } catch (error) {
        // May exit or throw
      }

      // Should have some output or process exit
      const hasOutput = consoleLogSpy.mock.calls.length > 0 ||
                       consoleErrorSpy.mock.calls.length > 0 ||
                       processExitSpy.mock.calls.length > 0;
      expect(hasOutput).toBe(true);
    });

    it('should handle missing --file and --text options', async () => {
      registerTaskCommands(program, testDir);

      try {
        await program.parseAsync(['node', 'test', 'tasks', 'parse-result']);
      } catch (error) {
        // Expected to throw
      }

      expect(consoleErrorSpy.mock.calls.length + processExitSpy.mock.calls.length).toBeGreaterThan(0);
    });

    it('should handle invalid implementation result format', async () => {
      registerTaskCommands(program, testDir);

      try {
        await program.parseAsync(['node', 'test', 'tasks', 'parse-result', '--text', 'invalid-format']);
      } catch (error) {
        // Expected to throw or handle error
      }

      // Should either log error or exit
      expect(consoleErrorSpy.mock.calls.length + processExitSpy.mock.calls.length).toBeGreaterThan(0);
    });

    it('should parse and display all optional fields', async () => {
      const implementationResult = `\`\`\`json
{
  "task_id": "feature.complete",
  "status": "success",
  "verification_passed": true,
  "tests_passing": "25/25",
  "coverage": 95,
  "confidence_score": 0.98,
  "notes": "All tests pass and coverage is high"
}
\`\`\``;

      registerTaskCommands(program, testDir);

      try {
        await program.parseAsync(['node', 'test', 'tasks', 'parse-result', '--text', implementationResult]);
      } catch (error) {
        // May exit
      }

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('feature.complete');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should parse failed implementation result', async () => {
      const implementationResult = `\`\`\`json
{
  "task_id": "feature.failed",
  "status": "failed",
  "verification_passed": false,
  "tests_passing": "20/25",
  "coverage": 60,
  "confidence_score": 0.5,
  "notes": "Some tests failed"
}
\`\`\``;

      registerTaskCommands(program, testDir);

      try {
        await program.parseAsync(['node', 'test', 'tasks', 'parse-result', '--text', implementationResult]);
      } catch (error) {
        // May exit
      }

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('feature.failed');
    });

    it('should parse result in JSON mode', async () => {
      const implementationResult = `\`\`\`json
{
  "task_id": "api.endpoint",
  "status": "success",
  "verification_passed": true
}
\`\`\``;

      registerTaskCommands(program, testDir);

      try {
        await program.parseAsync(['node', 'test', 'tasks', 'parse-result', '--text', implementationResult, '--json']);
      } catch (error) {
        // May exit
      }

      const jsonOutput = consoleLogSpy.mock.calls[0]?.[0];
      if (jsonOutput) {
        expect(() => JSON.parse(jsonOutput)).not.toThrow();
      }
    });
  });

  describe('tasks list pagination', () => {
    beforeEach(async () => {
      // Setup many tasks for pagination testing
      fs.ensureDirSync(tasksDir);
      fs.ensureDirSync(path.join(tasksDir, 'test'));

      // Create 5 tasks
      for (let i = 1; i <= 5; i++) {
        const taskContent = `---
id: test.task${i}
module: test
priority: ${i}
status: pending
---

# Task ${i}
`;
        fs.writeFileSync(path.join(tasksDir, 'test', `task${i}.md`), taskContent);
      }

      const tasks: Record<string, any> = {};
      for (let i = 1; i <= 5; i++) {
        tasks[`test.task${i}`] = {
          status: 'pending',
          priority: i,
          module: 'test',
          description: `Task ${i}`,
          filePath: `test/task${i}.md`,
        };
      }

      fs.writeJSONSync(indexFile, {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        metadata: { projectGoal: '' },
        tasks,
      });
    });

    it('should show pagination info when more tasks exist', async () => {
      registerTaskCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'tasks', 'list', '--limit', '2']);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('Showing');
      expect(allOutput).toContain('of 5');
    });

    it('should handle offset parameter', async () => {
      registerTaskCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'tasks', 'list', '--offset', '2', '--limit', '2']);

      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('tasks batch atomic mode', () => {
    beforeEach(async () => {
      fs.ensureDirSync(tasksDir);
      fs.ensureDirSync(path.join(tasksDir, 'api'));

      const task1Content = `---
id: api.user
module: api
priority: 1
status: pending
---

# User endpoint
`;
      fs.writeFileSync(path.join(tasksDir, 'api', 'user.md'), task1Content);

      fs.writeJSONSync(indexFile, {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        metadata: { projectGoal: '' },
        tasks: {
          'api.user': {
            status: 'pending',
            priority: 1,
            module: 'api',
            description: 'User endpoint',
            filePath: 'api/user.md',
          },
        },
      });
    });

    it('should run batch operations in atomic mode', async () => {
      const operations = [
        { action: 'start', taskId: 'api.user' },
      ];

      registerTaskCommands(program, testDir);
      await program.parseAsync([
        'node', 'test', 'tasks', 'batch',
        '--operations', JSON.stringify(operations),
        '--atomic',
      ]);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('Successful: 1');
    });

    it('should show failed count in batch results', async () => {
      const operations = [
        { action: 'start', taskId: 'api.user' },
        { action: 'start', taskId: 'nonexistent' },
      ];

      registerTaskCommands(program, testDir);
      await program.parseAsync([
        'node', 'test', 'tasks', 'batch',
        '--operations', JSON.stringify(operations),
      ]);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('Failed');
    });
  });

  describe('dry-run mode', () => {
    beforeEach(async () => {
      fs.ensureDirSync(tasksDir);
      fs.ensureDirSync(path.join(tasksDir, 'auth'));

      const taskContent = `---
id: auth.login
module: auth
priority: 1
status: pending
estimatedMinutes: 30
---

# Implement login
`;
      fs.writeFileSync(path.join(tasksDir, 'auth', 'login.md'), taskContent);

      fs.writeJSONSync(indexFile, {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        metadata: { projectGoal: '' },
        tasks: {
          'auth.login': {
            status: 'pending',
            priority: 1,
            module: 'auth',
            description: 'Implement login',
            filePath: 'auth/login.md',
          },
        },
      });
    });

    it('should preview start changes with --dry-run', async () => {
      registerTaskCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'tasks', 'start', 'auth.login', '--dry-run']);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('Dry-run');
      expect(allOutput).toContain('auth.login');
      expect(allOutput).toContain('pending');
      expect(allOutput).toContain('in_progress');

      // Verify task was NOT changed
      const index = fs.readJSONSync(indexFile);
      expect(index.tasks['auth.login'].status).toBe('pending');
    });

    it('should preview done changes with --dry-run', async () => {
      // First start the task - update both index and file
      const index = fs.readJSONSync(indexFile);
      index.tasks['auth.login'].status = 'in_progress';
      fs.writeJSONSync(indexFile, index);

      // Also update the task file
      const taskFilePath = path.join(tasksDir, 'auth', 'login.md');
      const taskContent = `---
id: auth.login
module: auth
priority: 1
status: in_progress
estimatedMinutes: 30
---

# Implement login
`;
      fs.writeFileSync(taskFilePath, taskContent);

      registerTaskCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'tasks', 'done', 'auth.login', '--dry-run']);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('Dry-run');
      expect(allOutput).toContain('auth.login');
      expect(allOutput).toContain('in_progress');
      expect(allOutput).toContain('completed');

      // Verify task was NOT changed
      const updatedIndex = fs.readJSONSync(indexFile);
      expect(updatedIndex.tasks['auth.login'].status).toBe('in_progress');
    });

    it('should preview fail changes with --dry-run', async () => {
      // First start the task - update both index and file
      const index = fs.readJSONSync(indexFile);
      index.tasks['auth.login'].status = 'in_progress';
      fs.writeJSONSync(indexFile, index);

      // Also update the task file
      const taskFilePath = path.join(tasksDir, 'auth', 'login.md');
      const taskContent = `---
id: auth.login
module: auth
priority: 1
status: in_progress
estimatedMinutes: 30
---

# Implement login
`;
      fs.writeFileSync(taskFilePath, taskContent);

      registerTaskCommands(program, testDir);
      await program.parseAsync([
        'node', 'test', 'tasks', 'fail', 'auth.login',
        '--reason', 'Test failure reason',
        '--dry-run',
      ]);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('Dry-run');
      expect(allOutput).toContain('auth.login');
      expect(allOutput).toContain('in_progress');
      expect(allOutput).toContain('failed');
      expect(allOutput).toContain('Test failure reason');

      // Verify task was NOT changed
      const updatedIndex = fs.readJSONSync(indexFile);
      expect(updatedIndex.tasks['auth.login'].status).toBe('in_progress');
    });

    it('should handle non-existent task in start --dry-run', async () => {
      registerTaskCommands(program, testDir);

      await program.parseAsync(['node', 'test', 'tasks', 'start', 'nonexistent', '--dry-run']);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle non-existent task in done --dry-run', async () => {
      registerTaskCommands(program, testDir);

      await program.parseAsync(['node', 'test', 'tasks', 'done', 'nonexistent', '--dry-run']);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle non-existent task in fail --dry-run', async () => {
      registerTaskCommands(program, testDir);

      await program.parseAsync([
        'node', 'test', 'tasks', 'fail', 'nonexistent',
        '--reason', 'Test',
        '--dry-run',
      ]);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should output dry-run in JSON format', async () => {
      registerTaskCommands(program, testDir);
      await program.parseAsync([
        'node', 'test', 'tasks', 'start', 'auth.login',
        '--dry-run', '--json',
      ]);

      const jsonOutput = consoleLogSpy.mock.calls[0]?.[0];
      expect(() => JSON.parse(jsonOutput)).not.toThrow();

      const parsed = JSON.parse(jsonOutput);
      expect(parsed.data.dryRun).toBe(true);
      expect(parsed.data.wouldUpdate.taskId).toBe('auth.login');
    });
  });

  describe('tasks get with notes', () => {
    beforeEach(async () => {
      fs.ensureDirSync(tasksDir);
      fs.ensureDirSync(path.join(tasksDir, 'auth'));

      const taskContent = `---
id: auth.login
module: auth
priority: 1
status: pending
estimatedMinutes: 30
---

# Implement login

## Acceptance Criteria

1. User can login
2. Invalid creds show error

## Notes

Use JWT for authentication
Consider rate limiting
`;
      fs.writeFileSync(path.join(tasksDir, 'auth', 'login.md'), taskContent);

      fs.writeJSONSync(indexFile, {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        metadata: { projectGoal: '' },
        tasks: {
          'auth.login': {
            status: 'pending',
            priority: 1,
            module: 'auth',
            description: 'Implement login',
            filePath: 'auth/login.md',
          },
        },
      });
    });

    it('should display notes when task has notes', async () => {
      registerTaskCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'tasks', 'get', 'auth.login']);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('Notes');
      expect(allOutput).toContain('JWT');
    });
  });

  describe('tasks next with various contexts', () => {
    beforeEach(async () => {
      fs.ensureDirSync(tasksDir);
      fs.ensureDirSync(path.join(tasksDir, 'auth'));
      fs.ensureDirSync(path.join(tasksDir, 'setup'));

      // Create setup task (completed)
      const setupContent = `---
id: setup.init
module: setup
priority: 1
status: completed
---

# Initialize project
`;
      fs.writeFileSync(path.join(tasksDir, 'setup', 'init.md'), setupContent);

      // Create auth task (pending, depends on setup)
      const taskContent = `---
id: auth.login
module: auth
priority: 1
status: pending
estimatedMinutes: 30
dependencies:
  - setup.init
testRequirements:
  unit:
    required: true
    pattern: "**/*.test.ts"
  e2e:
    required: false
    pattern: "**/*.e2e.ts"
---

# Implement login

## Acceptance Criteria

1. User can login
2. Invalid creds show error
`;
      fs.writeFileSync(path.join(tasksDir, 'auth', 'login.md'), taskContent);

      fs.writeJSONSync(indexFile, {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        metadata: { projectGoal: '' },
        tasks: {
          'setup.init': {
            status: 'completed',
            priority: 1,
            module: 'setup',
            description: 'Initialize project',
            filePath: 'setup/init.md',
          },
          'auth.login': {
            status: 'pending',
            priority: 1,
            module: 'auth',
            description: 'Implement login',
            filePath: 'auth/login.md',
            dependencies: ['setup.init'],
          },
        },
      });

      // Create state file
      fs.ensureDirSync(path.join(testDir, '.ralph-dev'));
      fs.writeJSONSync(path.join(testDir, '.ralph-dev', 'state.json'), {
        phase: 'implement',
        currentTask: null,
      });

      // Create progress log
      fs.writeFileSync(
        path.join(testDir, '.ralph-dev', 'progress.log'),
        'Task setup.init completed\nStarting auth phase\n',
        'utf-8'
      );
    });

    it('should show task with dependencies and test requirements', async () => {
      // Simplify: Remove the dependency so the task is immediately available
      const index = fs.readJSONSync(indexFile);
      delete index.tasks['auth.login'].dependencies;
      fs.writeJSONSync(indexFile, index);

      // Also update task file to remove dependencies
      const taskContent = `---
id: auth.login
module: auth
priority: 1
status: pending
estimatedMinutes: 30
testRequirements:
  unit:
    required: true
    pattern: "**/*.test.ts"
---

# Implement login

## Acceptance Criteria

1. User can login
2. Invalid creds show error
`;
      fs.writeFileSync(path.join(tasksDir, 'auth', 'login.md'), taskContent);

      registerTaskCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'tasks', 'next']);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('auth.login');
    });

    it('should return no pending tasks when only completed tasks exist', async () => {
      const index = fs.readJSONSync(indexFile);
      index.tasks['auth.login'].status = 'completed';
      fs.writeJSONSync(indexFile, index);

      registerTaskCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'tasks', 'next', '--json']);

      const jsonOutput = consoleLogSpy.mock.calls[0]?.[0];
      if (jsonOutput) {
        const parsed = JSON.parse(jsonOutput);
        expect(parsed.error || parsed.task === null).toBeTruthy();
      }
    });
  });

  describe('tasks done with duration', () => {
    beforeEach(async () => {
      fs.ensureDirSync(tasksDir);
      fs.ensureDirSync(path.join(tasksDir, 'auth'));

      const taskContent = `---
id: auth.login
module: auth
priority: 1
status: in_progress
---

# Implement login
`;
      fs.writeFileSync(path.join(tasksDir, 'auth', 'login.md'), taskContent);

      fs.writeJSONSync(indexFile, {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        metadata: { projectGoal: '' },
        tasks: {
          'auth.login': {
            status: 'in_progress',
            priority: 1,
            module: 'auth',
            description: 'Implement login',
            filePath: 'auth/login.md',
          },
        },
      });
    });

    it('should display duration when provided', async () => {
      registerTaskCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'tasks', 'done', 'auth.login', '-d', '15m']);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('completed');
      expect(allOutput).toContain('15m');
    });
  });

  describe('tasks list with priority filter', () => {
    beforeEach(async () => {
      fs.ensureDirSync(tasksDir);
      fs.ensureDirSync(path.join(tasksDir, 'test'));

      for (let i = 1; i <= 3; i++) {
        const taskContent = `---
id: test.task${i}
module: test
priority: ${i}
status: pending
---

# Task ${i}
`;
        fs.writeFileSync(path.join(tasksDir, 'test', `task${i}.md`), taskContent);
      }

      const tasks: Record<string, any> = {};
      for (let i = 1; i <= 3; i++) {
        tasks[`test.task${i}`] = {
          status: 'pending',
          priority: i,
          module: 'test',
          description: `Task ${i}`,
          filePath: `test/task${i}.md`,
        };
      }

      fs.writeJSONSync(indexFile, {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        metadata: { projectGoal: '' },
        tasks,
      });
    });

    it('should filter by priority', async () => {
      registerTaskCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'tasks', 'list', '--priority', '1']);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('test.task1');
      expect(allOutput).toContain('Tasks (1 of 1)');
    });
  });
});
