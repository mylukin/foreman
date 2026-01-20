import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SagaExecutor, SagaStep, Phase2Saga, Phase3Saga, Phase5Saga, SagaFactory } from '../../src/core/saga-manager';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('SagaExecutor', () => {
  const testDir = path.join(__dirname, '../../test-fixtures/saga');

  beforeEach(() => {
    fs.ensureDirSync(testDir);
  });

  afterEach(() => {
    fs.removeSync(testDir);
  });

  describe('execute', () => {
    it('should execute all steps successfully', async () => {
      const executionOrder: string[] = [];

      const steps: SagaStep[] = [
        {
          name: 'step1',
          description: 'First step',
          execute: async () => {
            executionOrder.push('execute-step1');
          },
          compensate: async () => {
            executionOrder.push('compensate-step1');
          },
        },
        {
          name: 'step2',
          description: 'Second step',
          execute: async () => {
            executionOrder.push('execute-step2');
          },
          compensate: async () => {
            executionOrder.push('compensate-step2');
          },
        },
      ];

      const executor = new SagaExecutor(testDir);
      const result = await executor.execute(steps);

      expect(result.success).toBe(true);
      expect(result.rollbackPerformed).toBe(false);
      expect(executionOrder).toEqual(['execute-step1', 'execute-step2']);
    });

    it('should rollback on failure', async () => {
      const executionOrder: string[] = [];

      const steps: SagaStep[] = [
        {
          name: 'step1',
          description: 'First step (succeeds)',
          execute: async () => {
            executionOrder.push('execute-step1');
          },
          compensate: async () => {
            executionOrder.push('compensate-step1');
          },
        },
        {
          name: 'step2',
          description: 'Second step (fails)',
          execute: async () => {
            executionOrder.push('execute-step2');
            throw new Error('Step 2 failed');
          },
          compensate: async () => {
            executionOrder.push('compensate-step2');
          },
        },
        {
          name: 'step3',
          description: 'Third step (should not execute)',
          execute: async () => {
            executionOrder.push('execute-step3');
          },
          compensate: async () => {
            executionOrder.push('compensate-step3');
          },
        },
      ];

      const executor = new SagaExecutor(testDir);
      const result = await executor.execute(steps);

      expect(result.success).toBe(false);
      expect(result.rollbackPerformed).toBe(true);
      expect(result.failedStep).toBe('step2');
      // Should execute step1, step2, then compensate step1 (reverse order)
      expect(executionOrder).toEqual(['execute-step1', 'execute-step2', 'compensate-step1']);
    });

    it('should handle compensate failures gracefully', async () => {
      const executionOrder: string[] = [];

      const steps: SagaStep[] = [
        {
          name: 'step1',
          description: 'First step',
          execute: async () => {
            executionOrder.push('execute-step1');
          },
          compensate: async () => {
            executionOrder.push('compensate-step1');
            throw new Error('Compensate failed');
          },
        },
        {
          name: 'step2',
          description: 'Second step (fails)',
          execute: async () => {
            executionOrder.push('execute-step2');
            throw new Error('Execute failed');
          },
          compensate: async () => {
            executionOrder.push('compensate-step2');
          },
        },
      ];

      const executor = new SagaExecutor(testDir);
      const result = await executor.execute(steps);

      expect(result.success).toBe(false);
      expect(result.rollbackPerformed).toBe(true);
      expect(result.rollbackSuccessful).toBe(false);
      expect(executionOrder).toContain('compensate-step1');
    });

    it('should log saga execution to file', async () => {
      const steps: SagaStep[] = [
        {
          name: 'test-step',
          description: 'Test step',
          execute: async () => {},
          compensate: async () => {},
        },
      ];

      const executor = new SagaExecutor(testDir);
      await executor.execute(steps);

      const logPath = path.join(testDir, '.ralph-dev', 'saga.log');
      expect(fs.existsSync(logPath)).toBe(true);

      const logContent = fs.readFileSync(logPath, 'utf-8');
      // Log is in JSON format, check for event types
      expect(logContent).toContain('saga_started');
      expect(logContent).toContain('test-step');
      expect(logContent).toContain('saga_completed');
    });
  });

  describe('rollback', () => {
    it('should rollback in reverse order', async () => {
      const rollbackOrder: string[] = [];

      const steps: SagaStep[] = [
        {
          name: 'step1',
          description: 'Step 1',
          execute: async () => {},
          compensate: async () => {
            rollbackOrder.push('step1');
          },
        },
        {
          name: 'step2',
          description: 'Step 2',
          execute: async () => {},
          compensate: async () => {
            rollbackOrder.push('step2');
          },
        },
        {
          name: 'step3',
          description: 'Step 3',
          execute: async () => {},
          compensate: async () => {
            rollbackOrder.push('step3');
          },
        },
      ];

      // Execute first two steps manually
      const executor = new SagaExecutor(testDir);
      await steps[0].execute();
      (executor as any).completedSteps.push(steps[0]);
      await steps[1].execute();
      (executor as any).completedSteps.push(steps[1]);

      // Trigger rollback
      await executor.rollback();

      // Should compensate in reverse order: step2, step1
      expect(rollbackOrder).toEqual(['step2', 'step1']);
    });

    it('should return true when no steps to rollback', async () => {
      const executor = new SagaExecutor(testDir);
      const success = await executor.rollback();
      expect(success).toBe(true);
    });
  });

  describe('recover', () => {
    it('should detect no incomplete sagas when log does not exist', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await SagaExecutor.recover(testDir);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No saga recovery needed'));
      consoleLogSpy.mockRestore();
    });

    it('should detect incomplete saga from previous session', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Create incomplete saga log
      const logPath = path.join(testDir, '.ralph-dev', 'saga.log');
      fs.ensureDirSync(path.dirname(logPath));

      const sagaStartEvent = {
        timestamp: new Date().toISOString(),
        event: 'saga_started',
        data: { stepCount: 3 },
      };
      fs.writeFileSync(logPath, JSON.stringify(sagaStartEvent) + '\n', 'utf-8');

      await SagaExecutor.recover(testDir);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Found incomplete saga'));
      consoleLogSpy.mockRestore();
    });

    it('should detect no incomplete sagas when saga completed', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Create complete saga log
      const logPath = path.join(testDir, '.ralph-dev', 'saga.log');
      fs.ensureDirSync(path.dirname(logPath));

      const events = [
        {
          timestamp: new Date().toISOString(),
          event: 'saga_started',
          data: { stepCount: 2 },
        },
        {
          timestamp: new Date().toISOString(),
          event: 'saga_completed',
          data: { completedSteps: ['step1', 'step2'] },
        },
      ];

      fs.writeFileSync(logPath, events.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf-8');

      await SagaExecutor.recover(testDir);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No incomplete sagas found'));
      consoleLogSpy.mockRestore();
    });
  });
});

describe('Phase2Saga', () => {
  const testDir = path.join(__dirname, '../../test-fixtures/phase2-saga');

  beforeEach(() => {
    fs.ensureDirSync(testDir);
  });

  afterEach(() => {
    fs.removeSync(testDir);
  });

  it('should create valid saga steps', () => {
    const saga = new Phase2Saga(testDir);
    const steps = saga.createSagaSteps();

    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0]).toHaveProperty('name');
    expect(steps[0]).toHaveProperty('description');
    expect(steps[0]).toHaveProperty('execute');
    expect(steps[0]).toHaveProperty('compensate');
  });

  it('should execute and compensate initialize step', async () => {
    const saga = new Phase2Saga(testDir);
    const steps = saga.createSagaSteps();
    const initStep = steps.find(s => s.name === 'initialize_tasks_directory');

    expect(initStep).toBeDefined();

    const tasksDir = path.join(testDir, '.ralph-dev', 'tasks');

    // Execute - should create directory
    await initStep!.execute();
    expect(fs.existsSync(tasksDir)).toBe(true);

    // Compensate - should remove directory
    await initStep!.compensate();
    expect(fs.existsSync(tasksDir)).toBe(false);
  });

  it('should create task index with proper structure', async () => {
    const saga = new Phase2Saga(testDir);
    const steps = saga.createSagaSteps();
    const indexStep = steps.find(s => s.name === 'create_task_index');

    expect(indexStep).toBeDefined();

    const tasksDir = path.join(testDir, '.ralph-dev', 'tasks');
    const indexPath = path.join(tasksDir, 'index.json');

    fs.ensureDirSync(tasksDir);

    // Execute - should create index.json
    await indexStep!.execute();
    expect(fs.existsSync(indexPath)).toBe(true);

    const index = fs.readJSONSync(indexPath);
    expect(index).toHaveProperty('version', '1.0.0');
    expect(index).toHaveProperty('tasks');
    expect(index.tasks).toEqual({});
    expect(index).toHaveProperty('createdAt');
    expect(index.createdAt).toBeTruthy();

    // Compensate - should remove index
    await indexStep!.compensate();
    expect(fs.existsSync(indexPath)).toBe(false);
  });

  it('should add ralph-dev entries to gitignore', async () => {
    const saga = new Phase2Saga(testDir);
    const steps = saga.createSagaSteps();
    const gitignoreStep = steps.find(s => s.name === 'verify_gitignore');

    expect(gitignoreStep).toBeDefined();

    const gitignorePath = path.join(testDir, '.gitignore');

    // Execute - should add entries to .gitignore
    await gitignoreStep!.execute();

    expect(fs.existsSync(gitignorePath)).toBe(true);
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    expect(content).toContain('.ralph-dev/state.json');
    expect(content).toContain('.ralph-dev/saga.log');
    expect(content).toContain('!.ralph-dev/prd.md');
    expect(content).toContain('!.ralph-dev/tasks/');
  });

  it('should not duplicate gitignore entries if already present', async () => {
    const saga = new Phase2Saga(testDir);
    const steps = saga.createSagaSteps();
    const gitignoreStep = steps.find(s => s.name === 'verify_gitignore');

    const gitignorePath = path.join(testDir, '.gitignore');

    // Pre-populate .gitignore with ralph-dev entries
    fs.writeFileSync(
      gitignorePath,
      '# Ralph-dev temporary files\n.ralph-dev/state.json\n.ralph-dev/progress.log\n',
      'utf-8'
    );

    const beforeContent = fs.readFileSync(gitignorePath, 'utf-8');

    // Execute - should not duplicate entries
    await gitignoreStep!.execute();

    const afterContent = fs.readFileSync(gitignorePath, 'utf-8');
    expect(afterContent).toBe(beforeContent); // No changes
  });

  it('should create backup of existing tasks', async () => {
    const saga = new Phase2Saga(testDir);
    const steps = saga.createSagaSteps();
    const backupStep = steps.find(s => s.name === 'backup_existing_state');

    expect(backupStep).toBeDefined();

    // Create existing tasks directory
    const tasksDir = path.join(testDir, '.ralph-dev', 'tasks');
    fs.ensureDirSync(tasksDir);
    fs.writeFileSync(path.join(tasksDir, 'test.md'), 'test content', 'utf-8');

    // Execute backup
    await backupStep!.execute();

    // Verify backup was created
    const backupDir = path.join(testDir, '.ralph-dev', 'backups');
    expect(fs.existsSync(backupDir)).toBe(true);

    const backups = fs.readdirSync(backupDir);
    expect(backups.length).toBeGreaterThan(0);
    expect(backups[0]).toContain('before-breakdown');
  });
});

describe('Phase3Saga', () => {
  const testDir = path.join(__dirname, '../../test-fixtures/phase3-saga');

  beforeEach(() => {
    fs.ensureDirSync(testDir);
    // Create required directories
    fs.ensureDirSync(path.join(testDir, '.ralph-dev', 'tasks'));
  });

  afterEach(() => {
    fs.removeSync(testDir);
  });

  it('should create valid saga steps', () => {
    const saga = new Phase3Saga(testDir);
    const steps = saga.createSagaSteps();

    expect(steps.length).toBeGreaterThan(0);
    expect(steps.every(s => s.name && s.execute && s.compensate)).toBe(true);
  });

  it('should backup and restore state', async () => {
    const saga = new Phase3Saga(testDir);
    const steps = saga.createSagaSteps();
    const backupStep = steps.find(s => s.name === 'backup_task_states');

    expect(backupStep).toBeDefined();

    // Create some test data
    const tasksDir = path.join(testDir, '.ralph-dev', 'tasks');
    const testFile = path.join(tasksDir, 'test-task.md');
    fs.writeFileSync(testFile, 'test content', 'utf-8');

    // Create index.json which is what the backup step actually backs up
    const indexPath = path.join(tasksDir, 'index.json');
    const testIndex = {
      version: '1.0.0',
      tasks: { 'test-task': { status: 'pending' } },
    };
    fs.writeJSONSync(indexPath, testIndex, { spaces: 2 });

    // Execute backup
    await backupStep!.execute();

    const backupDir = path.join(testDir, '.ralph-dev', 'backups');
    expect(fs.existsSync(backupDir)).toBe(true);

    // Modify the index
    const modifiedIndex = { version: '1.0.0', tasks: { 'test-task': { status: 'completed' } } };
    fs.writeJSONSync(indexPath, modifiedIndex, { spaces: 2 });

    // Compensate (restore)
    await backupStep!.compensate();

    // Should be restored to original
    const restoredIndex = fs.readJSONSync(indexPath);
    expect(restoredIndex.tasks['test-task'].status).toBe('pending');
  });
});

describe('Phase5Saga', () => {
  const testDir = path.join(__dirname, '../../test-fixtures/phase5-saga');

  beforeEach(() => {
    fs.ensureDirSync(testDir);
    fs.ensureDirSync(path.join(testDir, '.ralph-dev'));
  });

  afterEach(() => {
    fs.removeSync(testDir);
  });

  it('should create valid saga steps', () => {
    const saga = new Phase5Saga(testDir);
    const steps = saga.createSagaSteps();

    expect(steps.length).toBeGreaterThan(0);
  });

  it('should have valid saga steps', async () => {
    const saga = new Phase5Saga(testDir);
    const steps = saga.createSagaSteps();

    expect(steps.length).toBeGreaterThan(0);

    // Check for expected steps
    const branchStep = steps.find(s => s.name === 'create_feature_branch');
    expect(branchStep).toBeDefined();
    expect(branchStep?.execute).toBeInstanceOf(Function);
    expect(branchStep?.compensate).toBeInstanceOf(Function);
  });
});

describe('SagaFactory', () => {
  const testDir = path.join(__dirname, '../../test-fixtures/saga-factory');

  beforeEach(() => {
    fs.ensureDirSync(testDir);
  });

  afterEach(() => {
    fs.removeSync(testDir);
  });

  it('should create Phase2Saga steps', () => {
    const steps = SagaFactory.createForPhase('breakdown', testDir);
    expect(steps.length).toBeGreaterThan(0);
  });

  it('should create Phase3Saga steps', () => {
    const steps = SagaFactory.createForPhase('implement', testDir);
    expect(steps.length).toBeGreaterThan(0);
  });

  it('should create Phase5Saga steps', () => {
    const steps = SagaFactory.createForPhase('deliver', testDir);
    expect(steps.length).toBeGreaterThan(0);
  });

  it('should return empty array for unknown phase', () => {
    const steps = SagaFactory.createForPhase('unknown' as any, testDir);
    expect(steps).toEqual([]);
  });
});

describe('Integration Tests', () => {
  const testDir = path.join(__dirname, '../../test-fixtures/saga-integration');

  beforeEach(() => {
    fs.ensureDirSync(testDir);
  });

  afterEach(() => {
    fs.removeSync(testDir);
  });

  it('should execute full Phase2 saga successfully', async () => {
    const saga = new Phase2Saga(testDir);
    const steps = saga.createSagaSteps();
    const executor = new SagaExecutor(testDir);

    const result = await executor.execute(steps);

    expect(result.success).toBe(true);
    expect(result.rollbackPerformed).toBe(false);
  });

  it('should rollback Phase2 on failure', async () => {
    const saga = new Phase2Saga(testDir);
    const steps = saga.createSagaSteps();

    // Inject a failing step
    steps.push({
      name: 'failing_step',
      description: 'This will fail',
      execute: async () => {
        throw new Error('Intentional failure');
      },
      compensate: async () => {},
    });

    const executor = new SagaExecutor(testDir);
    const result = await executor.execute(steps);

    expect(result.success).toBe(false);
    expect(result.rollbackPerformed).toBe(true);

    // Verify cleanup occurred
    const tasksDir = path.join(testDir, '.ralph-dev', 'tasks');
    expect(fs.existsSync(tasksDir)).toBe(false);
  });
});

describe('Edge Cases and Error Handling', () => {
  const testDir = path.join(__dirname, '../../test-fixtures/saga-edge-cases');

  beforeEach(() => {
    fs.ensureDirSync(testDir);
  });

  afterEach(() => {
    fs.removeSync(testDir);
  });

  it('should handle non-Error object thrown during execution', async () => {
    const steps: SagaStep[] = [
      {
        name: 'string-throw-step',
        description: 'Throws a string',
        execute: async () => {
          throw 'String error instead of Error object';
        },
        compensate: async () => {},
      },
    ];

    const executor = new SagaExecutor(testDir);
    const result = await executor.execute(steps);

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('String error instead of Error object');
  });

  it('should handle non-Error object thrown during compensation', async () => {
    const steps: SagaStep[] = [
      {
        name: 'step1',
        description: 'First step',
        execute: async () => {},
        compensate: async () => {
          throw 'String compensation error';
        },
      },
      {
        name: 'failing-step',
        description: 'This fails',
        execute: async () => {
          throw new Error('Execute error');
        },
        compensate: async () => {},
      },
    ];

    const executor = new SagaExecutor(testDir);
    const result = await executor.execute(steps);

    expect(result.success).toBe(false);
    expect(result.rollbackSuccessful).toBe(false);
  });

  it('should identify correct failed step when first step fails', async () => {
    const steps: SagaStep[] = [
      {
        name: 'first-failing-step',
        description: 'First step that fails',
        execute: async () => {
          throw new Error('First step failed');
        },
        compensate: async () => {},
      },
      {
        name: 'step2',
        description: 'Second step',
        execute: async () => {},
        compensate: async () => {},
      },
    ];

    const executor = new SagaExecutor(testDir);
    const result = await executor.execute(steps);

    expect(result.success).toBe(false);
    expect(result.failedStep).toBe('first-failing-step');
    expect(result.completedSteps).toEqual([]);
  });

  it('should handle empty steps array', async () => {
    const executor = new SagaExecutor(testDir);
    const result = await executor.execute([]);

    expect(result.success).toBe(true);
    expect(result.completedSteps).toEqual([]);
    expect(result.rollbackPerformed).toBe(false);
  });

  it('should track multiple completed steps correctly', async () => {
    const steps: SagaStep[] = [
      {
        name: 'step1',
        description: 'First',
        execute: async () => {},
        compensate: async () => {},
      },
      {
        name: 'step2',
        description: 'Second',
        execute: async () => {},
        compensate: async () => {},
      },
      {
        name: 'step3',
        description: 'Third',
        execute: async () => {},
        compensate: async () => {},
      },
    ];

    const executor = new SagaExecutor(testDir);
    const result = await executor.execute(steps);

    expect(result.success).toBe(true);
    expect(result.completedSteps).toEqual(['step1', 'step2', 'step3']);
  });
});

describe('Phase2Saga Edge Cases', () => {
  const testDir = path.join(__dirname, '../../test-fixtures/phase2-edge');

  beforeEach(() => {
    fs.ensureDirSync(testDir);
  });

  afterEach(() => {
    fs.removeSync(testDir);
  });

  it('should handle backup when tasks directory does not exist', async () => {
    const saga = new Phase2Saga(testDir);
    const steps = saga.createSagaSteps();
    const backupStep = steps.find(s => s.name === 'backup_existing_state');

    // Ensure tasks directory does NOT exist
    const tasksDir = path.join(testDir, '.ralph-dev', 'tasks');
    expect(fs.existsSync(tasksDir)).toBe(false);

    // Execute backup - should handle gracefully
    await backupStep!.execute();

    // Backup should not fail, but may not create backup if nothing to backup
    expect(true).toBe(true); // Step completed without error
  });

  it('should handle index compensation when file does not exist', async () => {
    const saga = new Phase2Saga(testDir);
    const steps = saga.createSagaSteps();
    const indexStep = steps.find(s => s.name === 'create_task_index');

    const indexPath = path.join(testDir, '.ralph-dev', 'tasks', 'index.json');

    // Don't create the file, just run compensate
    await indexStep!.compensate();

    // Should handle gracefully without error
    expect(fs.existsSync(indexPath)).toBe(false);
  });

  it('should handle directory compensation when directory does not exist', async () => {
    const saga = new Phase2Saga(testDir);
    const steps = saga.createSagaSteps();
    const initStep = steps.find(s => s.name === 'initialize_tasks_directory');

    const tasksDir = path.join(testDir, '.ralph-dev', 'tasks');

    // Don't create the directory, just run compensate
    await initStep!.compensate();

    // Should handle gracefully without error
    expect(fs.existsSync(tasksDir)).toBe(false);
  });
});

describe('Phase3Saga Edge Cases', () => {
  const testDir = path.join(__dirname, '../../test-fixtures/phase3-edge');

  beforeEach(() => {
    fs.ensureDirSync(testDir);
    fs.ensureDirSync(path.join(testDir, '.ralph-dev', 'tasks'));
    fs.ensureDirSync(path.join(testDir, '.ralph-dev', 'backups'));
  });

  afterEach(() => {
    fs.removeSync(testDir);
  });

  it('should handle git stash compensation when not in git repo', async () => {
    const saga = new Phase3Saga(testDir);
    const steps = saga.createSagaSteps();
    const stashStep = steps.find(s => s.name === 'create_git_stash');

    // Should not throw when not in git repo
    await stashStep!.execute();
    await stashStep!.compensate();

    expect(true).toBe(true); // Completed without error
  });

  it('should handle task state backup when index does not exist', async () => {
    const saga = new Phase3Saga(testDir);
    const steps = saga.createSagaSteps();
    const backupStep = steps.find(s => s.name === 'backup_task_states');

    // Ensure index does NOT exist
    const indexPath = path.join(testDir, '.ralph-dev', 'tasks', 'index.json');
    if (fs.existsSync(indexPath)) {
      fs.removeSync(indexPath);
    }

    // Execute backup - should handle gracefully
    await backupStep!.execute();

    expect(true).toBe(true); // Step completed without error
  });

  it('should handle task state compensation when backup does not exist', async () => {
    const saga = new Phase3Saga(testDir);
    const steps = saga.createSagaSteps();
    const backupStep = steps.find(s => s.name === 'backup_task_states');

    // Run compensate without having run execute
    await backupStep!.compensate();

    expect(true).toBe(true); // Completed without error
  });
});

describe('Phase5Saga Edge Cases', () => {
  const testDir = path.join(__dirname, '../../test-fixtures/phase5-edge');

  beforeEach(() => {
    fs.ensureDirSync(testDir);
    fs.ensureDirSync(path.join(testDir, '.ralph-dev'));
  });

  afterEach(() => {
    fs.removeSync(testDir);
  });

  it('should handle feature branch creation when not in git repo', async () => {
    const saga = new Phase5Saga(testDir);
    const steps = saga.createSagaSteps();
    const branchStep = steps.find(s => s.name === 'create_feature_branch');

    // Should not throw when not in git repo
    await branchStep!.execute();

    expect(true).toBe(true); // Completed without error
  });

  it('should handle feature branch compensation when not created', async () => {
    const saga = new Phase5Saga(testDir);
    const steps = saga.createSagaSteps();
    const branchStep = steps.find(s => s.name === 'create_feature_branch');

    // Run compensate without having created a branch
    await branchStep!.compensate();

    expect(true).toBe(true); // Completed without error
  });

  it('should handle git commit step existence', async () => {
    const saga = new Phase5Saga(testDir);
    const steps = saga.createSagaSteps();
    const commitStep = steps.find(s => s.name === 'create_git_commit');

    // Verify the step has the expected structure
    expect(commitStep).toBeDefined();
    expect(commitStep?.execute).toBeInstanceOf(Function);
    expect(commitStep?.compensate).toBeInstanceOf(Function);
  });

  it('should handle git commit compensation when no commit was made', async () => {
    const saga = new Phase5Saga(testDir);
    const steps = saga.createSagaSteps();
    const commitStep = steps.find(s => s.name === 'create_git_commit');

    // Run compensate without having made a commit
    await commitStep!.compensate();

    expect(true).toBe(true); // Completed without error
  });
});

describe('SagaExecutor Recovery Edge Cases', () => {
  const testDir = path.join(__dirname, '../../test-fixtures/saga-recovery-edge');

  beforeEach(() => {
    fs.ensureDirSync(testDir);
  });

  afterEach(() => {
    fs.removeSync(testDir);
  });

  it('should handle recovery when saga completed with rollback', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Create saga log that ended with rollback_completed
    const logPath = path.join(testDir, '.ralph-dev', 'saga.log');
    fs.ensureDirSync(path.dirname(logPath));

    const events = [
      {
        timestamp: new Date().toISOString(),
        event: 'saga_started',
        data: { stepCount: 2 },
      },
      {
        timestamp: new Date().toISOString(),
        event: 'step_failed',
        data: { step: 'step1' },
      },
      {
        timestamp: new Date().toISOString(),
        event: 'rollback_completed',
        data: { success: true },
      },
    ];

    fs.writeFileSync(logPath, events.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf-8');

    await SagaExecutor.recover(testDir);

    // Should detect no incomplete sagas (rollback was completed)
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No incomplete sagas found'));
    consoleLogSpy.mockRestore();
  });
});
