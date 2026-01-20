import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CLIError,
  createError,
  handleError,
  Errors,
} from '../../src/core/error-handler';
import { ExitCode } from '../../src/core/exit-codes';

describe('createError', () => {
  it('should create a basic error with code and message', () => {
    const error = createError('ERROR_CODE', 'Error message');

    expect(error).toEqual({
      code: 'ERROR_CODE',
      message: 'Error message',
      details: undefined,
      recoverable: false,
      suggestedAction: undefined,
    });
  });

  it('should create error with all options', () => {
    const error = createError('ERROR_CODE', 'Error message', {
      details: { field: 'value' },
      recoverable: true,
      suggestedAction: 'Try again',
    });

    expect(error).toEqual({
      code: 'ERROR_CODE',
      message: 'Error message',
      details: { field: 'value' },
      recoverable: true,
      suggestedAction: 'Try again',
    });
  });

  it('should default recoverable to false', () => {
    const error = createError('ERROR_CODE', 'Error message', {
      details: { field: 'value' },
    });

    expect(error.recoverable).toBe(false);
  });

  it('should handle empty options object', () => {
    const error = createError('ERROR_CODE', 'Error message', {});

    expect(error.details).toBeUndefined();
    expect(error.recoverable).toBe(false);
    expect(error.suggestedAction).toBeUndefined();
  });

  it('should handle recoverable explicitly set to false', () => {
    const error = createError('ERROR_CODE', 'Error message', {
      recoverable: false,
    });

    expect(error.recoverable).toBe(false);
  });
});

describe('handleError', () => {
  let consoleErrorSpy: any;
  let processExitSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    vi.useFakeTimers();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    vi.useRealTimers();
  });

  describe('JSON mode', () => {
    it('should output error as JSON and exit with correct code', () => {
      const now = new Date('2025-01-19T10:00:00.000Z');
      vi.setSystemTime(now);

      const error: CLIError = {
        code: 'TASK_NOT_FOUND',
        message: 'Task not found',
        recoverable: false,
      };

      handleError(error, true);

      const expectedOutput = JSON.stringify({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Task not found',
          details: undefined,
          recoverable: false,
          suggestedAction: undefined,
        },
        timestamp: '2025-01-19T10:00:00.000Z',
      }, null, 2);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expectedOutput);
      expect(processExitSpy).toHaveBeenCalledWith(ExitCode.NOT_FOUND);
    });

    it('should include details and suggested action in JSON output', () => {
      const error: CLIError = {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: { field: 'taskId', reason: 'empty' },
        recoverable: false,
        suggestedAction: 'Provide a valid task ID',
      };

      handleError(error, true);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('"code": "VALIDATION_ERROR"')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('"field": "taskId"')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Provide a valid task ID')
      );
    });
  });

  describe('Human-readable mode', () => {
    it('should output basic error message and exit', () => {
      const error: CLIError = {
        code: 'ERROR_CODE',
        message: 'Something went wrong',
        recoverable: false,
      };

      handleError(error, false);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error [ERROR_CODE]: Something went wrong')
      );
      expect(processExitSpy).toHaveBeenCalledWith(ExitCode.GENERAL_ERROR);
    });

    it('should output error with details', () => {
      const error: CLIError = {
        code: 'ERROR_CODE',
        message: 'Something went wrong',
        details: { field: 'value', reason: 'invalid' },
        recoverable: false,
      };

      handleError(error, false);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error [ERROR_CODE]: Something went wrong')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Details:')
      );
    });

    it('should output error with suggested action', () => {
      const error: CLIError = {
        code: 'ERROR_CODE',
        message: 'Something went wrong',
        recoverable: false,
        suggestedAction: 'Try running with --verbose flag',
      };

      handleError(error, false);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error [ERROR_CODE]: Something went wrong')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Suggestion: Try running with --verbose flag')
      );
    });

    it('should output error with both details and suggested action', () => {
      const error: CLIError = {
        code: 'ERROR_CODE',
        message: 'Something went wrong',
        details: { reason: 'invalid input' },
        recoverable: false,
        suggestedAction: 'Check your input format',
      };

      handleError(error, false);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error [ERROR_CODE]: Something went wrong')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Details:')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Suggestion: Check your input format')
      );
    });
  });

  describe('Exit codes', () => {
    it('should exit with NOT_FOUND code for task not found', () => {
      const error: CLIError = {
        code: 'TASK_NOT_FOUND',
        message: 'Task not found',
        recoverable: false,
      };

      handleError(error, true);

      expect(processExitSpy).toHaveBeenCalledWith(ExitCode.NOT_FOUND);
    });

    it('should exit with PARSE_ERROR code for invalid JSON', () => {
      const error: CLIError = {
        code: 'INVALID_JSON',
        message: 'Invalid JSON',
        recoverable: false,
      };

      handleError(error, true);

      expect(processExitSpy).toHaveBeenCalledWith(ExitCode.PARSE_ERROR);
    });

    it('should exit with GENERAL_ERROR for unknown error codes', () => {
      const error: CLIError = {
        code: 'UNKNOWN_ERROR',
        message: 'Unknown error',
        recoverable: false,
      };

      handleError(error, true);

      expect(processExitSpy).toHaveBeenCalledWith(ExitCode.GENERAL_ERROR);
    });
  });
});

describe('Errors', () => {
  describe('taskNotFound', () => {
    it('should create task not found error with task ID', () => {
      const error = Errors.taskNotFound('task-123');

      expect(error.code).toBe('TASK_NOT_FOUND');
      expect(error.message).toBe('Task "task-123" does not exist');
      expect(error.recoverable).toBe(false);
      expect(error.suggestedAction).toBe('Use "ralph-dev tasks list" to see available tasks');
    });
  });

  describe('stateNotFound', () => {
    it('should create state not found error', () => {
      const error = Errors.stateNotFound();

      expect(error.code).toBe('STATE_NOT_FOUND');
      expect(error.message).toBe('No active ralph-dev session');
      expect(error.recoverable).toBe(false);
      expect(error.suggestedAction).toBe('Start a new session with /ralph-dev command');
    });
  });

  describe('invalidInput', () => {
    it('should create invalid input error with custom message', () => {
      const error = Errors.invalidInput('Task ID cannot be empty');

      expect(error.code).toBe('INVALID_INPUT');
      expect(error.message).toBe('Task ID cannot be empty');
      expect(error.recoverable).toBe(false);
      expect(error.suggestedAction).toBeUndefined();
    });
  });

  describe('invalidJson', () => {
    it('should create invalid JSON error with details', () => {
      const details = { line: 5, column: 10 };
      const error = Errors.invalidJson(details);

      expect(error.code).toBe('INVALID_JSON');
      expect(error.message).toBe('Failed to parse JSON input');
      expect(error.details).toEqual(details);
      expect(error.recoverable).toBe(false);
      expect(error.suggestedAction).toBe('Ensure JSON is properly formatted');
    });
  });

  describe('dependencyNotMet', () => {
    it('should create dependency not met error', () => {
      const error = Errors.dependencyNotMet('task-3', ['task-1', 'task-2']);

      expect(error.code).toBe('DEPENDENCY_NOT_MET');
      expect(error.message).toBe('Task "task-3" has unsatisfied dependencies');
      expect(error.details).toEqual({ missingDeps: ['task-1', 'task-2'] });
      expect(error.recoverable).toBe(true);
      expect(error.suggestedAction).toBe('Complete dependencies first: task-1, task-2');
    });

    it('should handle single missing dependency', () => {
      const error = Errors.dependencyNotMet('task-2', ['task-1']);

      expect(error.suggestedAction).toBe('Complete dependencies first: task-1');
    });

    it('should handle empty dependencies array', () => {
      const error = Errors.dependencyNotMet('task-2', []);

      expect(error.suggestedAction).toBe('Complete dependencies first: ');
    });
  });

  describe('alreadyExists', () => {
    it('should create already exists error', () => {
      const error = Errors.alreadyExists('Task', 'task-123');

      expect(error.code).toBe('ALREADY_EXISTS');
      expect(error.message).toBe('Task "task-123" already exists');
      expect(error.recoverable).toBe(false);
      expect(error.suggestedAction).toBeUndefined();
    });

    it('should handle different resource types', () => {
      const error = Errors.alreadyExists('State', 'state-1');

      expect(error.message).toBe('State "state-1" already exists');
    });
  });

  describe('invalidState', () => {
    it('should create invalid state error with custom message', () => {
      const error = Errors.invalidState('Cannot transition from pending to completed');

      expect(error.code).toBe('INVALID_STATE');
      expect(error.message).toBe('Cannot transition from pending to completed');
      expect(error.recoverable).toBe(false);
      expect(error.suggestedAction).toBeUndefined();
    });
  });

  describe('fileSystemError', () => {
    it('should create file system error without details', () => {
      const error = Errors.fileSystemError('Failed to write file');

      expect(error.code).toBe('FILE_SYSTEM_ERROR');
      expect(error.message).toBe('Failed to write file');
      expect(error.details).toBeUndefined();
      expect(error.recoverable).toBe(false);
      expect(error.suggestedAction).toBeUndefined();
    });

    it('should create file system error with details', () => {
      const details = { path: '/tmp/file.txt', errno: -2 };
      const error = Errors.fileSystemError('Failed to write file', details);

      expect(error.code).toBe('FILE_SYSTEM_ERROR');
      expect(error.message).toBe('Failed to write file');
      expect(error.details).toEqual(details);
      expect(error.recoverable).toBe(false);
    });
  });

  describe('validationError', () => {
    it('should create validation error without details', () => {
      const error = Errors.validationError('Task ID is required');

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Task ID is required');
      expect(error.details).toBeUndefined();
      expect(error.recoverable).toBe(false);
      expect(error.suggestedAction).toBe('Check input parameters and try again');
    });

    it('should create validation error with details', () => {
      const details = { field: 'taskId', reason: 'empty' };
      const error = Errors.validationError('Task ID is required', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('parsingError', () => {
    it('should create parsing error without details', () => {
      const error = Errors.parsingError('Failed to parse YAML frontmatter');

      expect(error.code).toBe('PARSING_ERROR');
      expect(error.message).toBe('Failed to parse YAML frontmatter');
      expect(error.details).toBeUndefined();
      expect(error.recoverable).toBe(false);
      expect(error.suggestedAction).toBe('Verify the input format is correct');
    });

    it('should create parsing error with details', () => {
      const details = { line: 5, column: 10 };
      const error = Errors.parsingError('Failed to parse YAML frontmatter', details);

      expect(error.details).toEqual(details);
    });
  });
});
