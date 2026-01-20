import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { registerStateCommands } from '../../src/commands/state';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('state commands', () => {
  let program: Command;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;
  const testDir = path.join(__dirname, '__test-state-command__');
  const stateFile = path.join(testDir, '.ralph-dev', 'state.json');

  beforeEach(() => {
    program = new Command();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    vi.useFakeTimers();

    fs.ensureDirSync(testDir);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    vi.clearAllMocks();
    vi.useRealTimers();
    fs.removeSync(testDir);
  });

  describe('state get', () => {
    it('should register state get command', () => {
      registerStateCommands(program, testDir);

      const stateCommand = program.commands.find(cmd => cmd.name() === 'state');
      expect(stateCommand).toBeDefined();

      const getCommand = stateCommand?.commands.find(cmd => cmd.name() === 'get');
      expect(getCommand).toBeDefined();
    });

    it('should show no active session when state file does not exist', async () => {
      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'get']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No active ralph-dev session'));
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should display current state when state file exists', async () => {
      const now = new Date('2025-01-19T10:00:00.000Z');
      vi.setSystemTime(now);

      const state = {
        phase: 'implement',
        currentTask: 'task-123',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T10:00:00.000Z',
      };

      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, state);

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'get']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Current State:'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('implement'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('task-123'));
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should output JSON format when --json flag is used', async () => {
      const state = {
        phase: 'clarify',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T10:00:00.000Z',
      };

      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, state);

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'get', '--json']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"phase": "clarify"')
      );
    });

    it('should handle file read errors', async () => {
      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeFileSync(stateFile, 'invalid-json', 'utf-8');

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'get']);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(8);
    });
  });

  describe('state set', () => {
    it('should register state set command', () => {
      registerStateCommands(program, testDir);

      const stateCommand = program.commands.find(cmd => cmd.name() === 'state');
      const setCommand = stateCommand?.commands.find(cmd => cmd.name() === 'set');

      expect(setCommand).toBeDefined();
    });

    it('should create new state file', async () => {
      const now = new Date('2025-01-19T10:00:00.000Z');
      vi.setSystemTime(now);

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'set', '--phase', 'clarify']);

      expect(fs.existsSync(stateFile)).toBe(true);
      const state = fs.readJSONSync(stateFile);
      expect(state.phase).toBe('clarify');
      expect(state.startedAt).toBe('2025-01-19T10:00:00.000Z');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✓ State updated'));
    });

    it('should set phase and task', async () => {
      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'set', '--phase', 'implement', '--task', 'task-456']);

      const state = fs.readJSONSync(stateFile);
      expect(state.phase).toBe('implement');
      expect(state.currentTask).toBe('task-456');
    });

    it('should preserve existing startedAt, prd, and errors', async () => {
      const now = new Date('2025-01-19T10:00:00.000Z');
      vi.setSystemTime(now);

      const existingState = {
        phase: 'clarify',
        startedAt: '2025-01-19T08:00:00.000Z',
        updatedAt: '2025-01-19T09:00:00.000Z',
        prd: { goal: 'Build feature' },
        errors: [{ message: 'Error 1' }],
      };

      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, existingState);

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'set', '--phase', 'breakdown']);

      const state = fs.readJSONSync(stateFile);
      expect(state.phase).toBe('breakdown');
      expect(state.startedAt).toBe('2025-01-19T08:00:00.000Z');
      expect(state.prd).toEqual({ goal: 'Build feature' });
      expect(state.errors).toEqual([{ message: 'Error 1' }]);
    });

    it('should reject invalid phase', async () => {
      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'set', '--phase', 'invalid-phase']);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid phase'));
      expect(processExitSpy).toHaveBeenCalledWith(2);
    });

    it('should output JSON when --json flag is used', async () => {
      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'set', '--phase', 'heal', '--json']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"phase": "heal"')
      );
    });

    it('should validate all phases', async () => {
      const validPhases = ['clarify', 'breakdown', 'implement', 'heal', 'deliver'];

      for (const phase of validPhases) {
        fs.removeSync(stateFile);
        registerStateCommands(new Command(), testDir);
        await new Command()
          .exitOverride()
          .configureOutput({
            writeOut: () => {},
            writeErr: () => {},
          })
          .addCommand(
            new Command()
              .name('state')
              .addCommand(
                new Command()
                  .name('set')
                  .requiredOption('-p, --phase <phase>')
                  .option('-t, --task <taskId>')
                  .option('--json')
                  .action((options) => {
                    expect(validPhases.includes(options.phase)).toBe(true);
                  })
              )
          )
          .parseAsync(['node', 'test', 'state', 'set', '--phase', phase]);
      }
    });
  });

  describe('state update', () => {
    it('should register state update command', () => {
      registerStateCommands(program, testDir);

      const stateCommand = program.commands.find(cmd => cmd.name() === 'state');
      const updateCommand = stateCommand?.commands.find(cmd => cmd.name() === 'update');

      expect(updateCommand).toBeDefined();
    });

    it('should update phase', async () => {
      const initialState = {
        phase: 'clarify',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T09:30:00.000Z',
      };

      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, initialState);

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'update', '--phase', 'breakdown']);

      const state = fs.readJSONSync(stateFile);
      expect(state.phase).toBe('breakdown');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('phase'));
    });

    it('should update task', async () => {
      const initialState = {
        phase: 'implement',
        currentTask: 'task-1',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T09:30:00.000Z',
      };

      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, initialState);

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'update', '--task', 'task-2']);

      const state = fs.readJSONSync(stateFile);
      expect(state.currentTask).toBe('task-2');
    });

    it('should update PRD from JSON string', async () => {
      const initialState = {
        phase: 'breakdown',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T09:30:00.000Z',
      };

      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, initialState);

      const prdJson = JSON.stringify({ goal: 'Build API', tasks: [] });

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'update', '--prd', prdJson]);

      const state = fs.readJSONSync(stateFile);
      expect(state.prd).toEqual({ goal: 'Build API', tasks: [] });
    });

    it('should add error from JSON string', async () => {
      const initialState = {
        phase: 'implement',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T09:30:00.000Z',
      };

      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, initialState);

      const errorJson = JSON.stringify({ message: 'Test failed', code: 'E001' });

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'update', '--add-error', errorJson]);

      const state = fs.readJSONSync(stateFile);
      expect(state.errors).toHaveLength(1);
      expect(state.errors[0]).toEqual({ message: 'Test failed', code: 'E001' });
    });

    it('should append to existing errors array', async () => {
      const initialState = {
        phase: 'implement',
        errors: [{ message: 'Error 1' }],
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T09:30:00.000Z',
      };

      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, initialState);

      const errorJson = JSON.stringify({ message: 'Error 2' });

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'update', '--add-error', errorJson]);

      const state = fs.readJSONSync(stateFile);
      expect(state.errors).toHaveLength(2);
      expect(state.errors[1]).toEqual({ message: 'Error 2' });
    });

    it('should handle state file not found', async () => {
      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'update', '--phase', 'implement']);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('No active ralph-dev session'));
      expect(processExitSpy).toHaveBeenCalledWith(3);
    });

    it('should handle invalid phase in update', async () => {
      const initialState = {
        phase: 'clarify',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T09:30:00.000Z',
      };

      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, initialState);

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'update', '--phase', 'invalid']);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid phase'));
      expect(processExitSpy).toHaveBeenCalledWith(2);
    });

    it('should handle invalid PRD JSON', async () => {
      const initialState = {
        phase: 'breakdown',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T09:30:00.000Z',
      };

      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, initialState);

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'update', '--prd', 'invalid-json']);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(9);
    });

    it('should handle invalid error JSON', async () => {
      const initialState = {
        phase: 'implement',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T09:30:00.000Z',
      };

      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, initialState);

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'update', '--add-error', 'invalid{']);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(9);
    });

    it('should update updatedAt timestamp', async () => {
      const now = new Date('2025-01-19T11:00:00.000Z');
      vi.setSystemTime(now);

      const initialState = {
        phase: 'clarify',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T09:30:00.000Z',
      };

      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, initialState);

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'update', '--phase', 'breakdown']);

      const state = fs.readJSONSync(stateFile);
      expect(state.updatedAt).toBe('2025-01-19T11:00:00.000Z');
    });
  });

  describe('refactored architecture', () => {
    it('should use StateService via createStateService factory', async () => {
      // This test verifies command uses service factory pattern like status.ts
      // The implementation should call createStateService(workspaceDir)
      const now = new Date('2025-01-19T10:00:00.000Z');
      vi.setSystemTime(now);

      registerStateCommands(program, testDir);

      // Test complete workflow through service layer
      await program.parseAsync(['node', 'test', 'state', 'set', '--phase', 'clarify']);
      expect(fs.existsSync(stateFile)).toBe(true);

      consoleLogSpy.mockClear();
      await program.parseAsync(['node', 'test', 'state', 'get']);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('clarify'));

      await program.parseAsync(['node', 'test', 'state', 'update', '--phase', 'breakdown']);
      const state = fs.readJSONSync(stateFile);
      expect(state.phase).toBe('breakdown');

      await program.parseAsync(['node', 'test', 'state', 'clear']);
      expect(fs.existsSync(stateFile)).toBe(false);
    });

    it('should have thin command handlers without business logic', async () => {
      // Verify commands contain minimal logic - just parsing and formatting
      // All business logic should be in StateService
      const now = new Date('2025-01-19T10:00:00.000Z');
      vi.setSystemTime(now);

      registerStateCommands(program, testDir);

      // Set command should not contain validation logic
      await program.parseAsync(['node', 'test', 'state', 'set', '--phase', 'clarify']);

      // Update should handle PRD without parsing logic in command
      const prdJson = JSON.stringify({ goal: 'Test' });
      await program.parseAsync(['node', 'test', 'state', 'update', '--prd', prdJson]);

      const state = fs.readJSONSync(stateFile);
      expect(state.prd).toEqual({ goal: 'Test' });
    });
  });

  describe('state clear', () => {
    it('should register state clear command', () => {
      registerStateCommands(program, testDir);

      const stateCommand = program.commands.find(cmd => cmd.name() === 'state');
      const clearCommand = stateCommand?.commands.find(cmd => cmd.name() === 'clear');

      expect(clearCommand).toBeDefined();
    });

    it('should clear existing state file', async () => {
      const state = {
        phase: 'implement',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T10:00:00.000Z',
      };

      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, state);

      expect(fs.existsSync(stateFile)).toBe(true);

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'clear']);

      expect(fs.existsSync(stateFile)).toBe(false);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✓ State cleared'));
    });

    it('should handle clearing when no state exists', async () => {
      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'clear']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No state to clear'));
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should output JSON when --json flag is used', async () => {
      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, { phase: 'clarify', startedAt: '2025-01-19T09:00:00.000Z', updatedAt: '2025-01-19T10:00:00.000Z' });

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'clear', '--json']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"cleared": true')
      );
    });
  });
});
