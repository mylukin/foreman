import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import { registerCircuitBreakerCommand } from '../../src/commands/circuit-breaker';
import { CircuitState } from '../../src/core/circuit-breaker';

describe('Circuit Breaker Command', () => {
  let program: Command;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;
  const testDir = path.join(__dirname, '__test-circuit-breaker__');
  const stateFilePath = path.join(testDir, '.ralph-dev', 'circuit-breaker.json');

  beforeEach(() => {
    program = new Command();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    processExitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => {}) as unknown as typeof process.exit);

    fs.ensureDirSync(path.join(testDir, '.ralph-dev'));
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    processExitSpy.mockRestore();
    vi.clearAllMocks();
    fs.removeSync(testDir);
  });

  describe('status command', () => {
    it('should return default state when no state file exists', async () => {
      registerCircuitBreakerCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'circuit-breaker', 'status', '--json']);

      expect(processExitSpy).toHaveBeenCalledWith(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"state": "CLOSED"')
      );
    });

    it('should return current state from file', async () => {
      fs.writeJsonSync(stateFilePath, {
        state: CircuitState.OPEN,
        failureCount: 5,
        successCount: 0,
        lastFailureTime: Date.now(),
        lastResetTime: null,
      });

      registerCircuitBreakerCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'circuit-breaker', 'status', '--json']);

      expect(processExitSpy).toHaveBeenCalledWith(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"state": "OPEN"')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"failureCount": 5')
      );
    });

    it('should display human-readable output without --json', async () => {
      registerCircuitBreakerCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'circuit-breaker', 'status']);

      expect(processExitSpy).toHaveBeenCalledWith(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Circuit Breaker Status')
      );
    });

    it('should show warning when circuit is OPEN', async () => {
      fs.writeJsonSync(stateFilePath, {
        state: CircuitState.OPEN,
        failureCount: 5,
        successCount: 0,
        lastFailureTime: Date.now(),
        lastResetTime: null,
      });

      registerCircuitBreakerCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'circuit-breaker', 'status']);

      expect(processExitSpy).toHaveBeenCalledWith(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Circuit is OPEN')
      );
    });

    it('should display last failure and reset times when available', async () => {
      const now = Date.now();
      fs.writeJsonSync(stateFilePath, {
        state: CircuitState.CLOSED,
        failureCount: 0,
        successCount: 0,
        lastFailureTime: now - 60000,
        lastResetTime: now,
      });

      registerCircuitBreakerCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'circuit-breaker', 'status']);

      expect(processExitSpy).toHaveBeenCalledWith(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Last Failure')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Last Reset')
      );
    });
  });

  describe('reset command', () => {
    it('should reset circuit to CLOSED state', async () => {
      fs.writeJsonSync(stateFilePath, {
        state: CircuitState.OPEN,
        failureCount: 5,
        successCount: 0,
        lastFailureTime: Date.now(),
        lastResetTime: null,
      });

      registerCircuitBreakerCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'circuit-breaker', 'reset', '--json']);

      expect(processExitSpy).toHaveBeenCalledWith(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"wasReset": true')
      );

      // Verify file was updated
      const savedState = fs.readJsonSync(stateFilePath);
      expect(savedState.state).toBe(CircuitState.CLOSED);
      expect(savedState.failureCount).toBe(0);
    });

    it('should indicate when circuit was already CLOSED', async () => {
      registerCircuitBreakerCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'circuit-breaker', 'reset', '--json']);

      expect(processExitSpy).toHaveBeenCalledWith(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"wasReset": false')
      );
    });

    it('should display human-readable reset message', async () => {
      fs.writeJsonSync(stateFilePath, {
        state: CircuitState.OPEN,
        failureCount: 5,
        successCount: 0,
        lastFailureTime: Date.now(),
        lastResetTime: null,
      });

      registerCircuitBreakerCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'circuit-breaker', 'reset']);

      expect(processExitSpy).toHaveBeenCalledWith(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Circuit breaker reset')
      );
    });
  });

  describe('fail command', () => {
    it('should increment failure count', async () => {
      registerCircuitBreakerCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'circuit-breaker', 'fail', '--json']);

      expect(processExitSpy).toHaveBeenCalledWith(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"failureCount": 1')
      );
    });

    it('should open circuit after reaching threshold', async () => {
      fs.writeJsonSync(stateFilePath, {
        state: CircuitState.CLOSED,
        failureCount: 4,
        successCount: 0,
        lastFailureTime: null,
        lastResetTime: null,
      });

      registerCircuitBreakerCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'circuit-breaker', 'fail', '--json']);

      expect(processExitSpy).toHaveBeenCalledWith(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"isOpen": true')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"state": "OPEN"')
      );
    });

    it('should use custom threshold', async () => {
      fs.writeJsonSync(stateFilePath, {
        state: CircuitState.CLOSED,
        failureCount: 2,
        successCount: 0,
        lastFailureTime: null,
        lastResetTime: null,
      });

      registerCircuitBreakerCommand(program, testDir);
      await program.parseAsync([
        'node',
        'test',
        'circuit-breaker',
        'fail',
        '--threshold',
        '3',
        '--json',
      ]);

      expect(processExitSpy).toHaveBeenCalledWith(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"isOpen": true')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"threshold": 3')
      );
    });

    it('should reopen circuit from HALF_OPEN on failure', async () => {
      fs.writeJsonSync(stateFilePath, {
        state: CircuitState.HALF_OPEN,
        failureCount: 0,
        successCount: 1,
        lastFailureTime: null,
        lastResetTime: null,
      });

      registerCircuitBreakerCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'circuit-breaker', 'fail', '--json']);

      expect(processExitSpy).toHaveBeenCalledWith(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"state": "OPEN"')
      );
    });

    it('should display human-readable failure message', async () => {
      registerCircuitBreakerCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'circuit-breaker', 'fail']);

      expect(processExitSpy).toHaveBeenCalledWith(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failure recorded')
      );
    });

    it('should display circuit OPEN message when threshold reached', async () => {
      fs.writeJsonSync(stateFilePath, {
        state: CircuitState.CLOSED,
        failureCount: 4,
        successCount: 0,
        lastFailureTime: null,
        lastResetTime: null,
      });

      registerCircuitBreakerCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'circuit-breaker', 'fail']);

      expect(processExitSpy).toHaveBeenCalledWith(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Circuit breaker OPEN')
      );
    });
  });

  describe('success command', () => {
    it('should reset failure count on success in CLOSED state', async () => {
      fs.writeJsonSync(stateFilePath, {
        state: CircuitState.CLOSED,
        failureCount: 3,
        successCount: 0,
        lastFailureTime: null,
        lastResetTime: null,
      });

      registerCircuitBreakerCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'circuit-breaker', 'success', '--json']);

      expect(processExitSpy).toHaveBeenCalledWith(0);
      const savedState = fs.readJsonSync(stateFilePath);
      expect(savedState.failureCount).toBe(0);
    });

    it('should increment success count in HALF_OPEN state', async () => {
      fs.writeJsonSync(stateFilePath, {
        state: CircuitState.HALF_OPEN,
        failureCount: 0,
        successCount: 0,
        lastFailureTime: null,
        lastResetTime: null,
      });

      registerCircuitBreakerCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'circuit-breaker', 'success', '--json']);

      expect(processExitSpy).toHaveBeenCalledWith(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"successCount": 1')
      );
    });

    it('should close circuit from HALF_OPEN after success threshold', async () => {
      fs.writeJsonSync(stateFilePath, {
        state: CircuitState.HALF_OPEN,
        failureCount: 0,
        successCount: 1,
        lastFailureTime: null,
        lastResetTime: null,
      });

      registerCircuitBreakerCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'circuit-breaker', 'success', '--json']);

      expect(processExitSpy).toHaveBeenCalledWith(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"state": "CLOSED"')
      );
    });

    it('should use custom success threshold', async () => {
      fs.writeJsonSync(stateFilePath, {
        state: CircuitState.HALF_OPEN,
        failureCount: 0,
        successCount: 2,
        lastFailureTime: null,
        lastResetTime: null,
      });

      registerCircuitBreakerCommand(program, testDir);
      await program.parseAsync([
        'node',
        'test',
        'circuit-breaker',
        'success',
        '--success-threshold',
        '3',
        '--json',
      ]);

      expect(processExitSpy).toHaveBeenCalledWith(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"state": "CLOSED"')
      );
    });

    it('should display human-readable success message', async () => {
      registerCircuitBreakerCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'circuit-breaker', 'success']);

      expect(processExitSpy).toHaveBeenCalledWith(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Success recorded')
      );
    });
  });

  describe('alias', () => {
    it('should support cb alias', async () => {
      registerCircuitBreakerCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'cb', 'status', '--json']);

      expect(processExitSpy).toHaveBeenCalledWith(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"state"')
      );
    });
  });
});
