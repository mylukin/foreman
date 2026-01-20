import { describe, it, expect } from 'vitest';
import { ExitCode, getExitCodeFromErrorCode } from '../../src/core/exit-codes';

describe('ExitCode enum', () => {
  it('should have SUCCESS as 0', () => {
    expect(ExitCode.SUCCESS).toBe(0);
  });

  it('should have GENERAL_ERROR as 1', () => {
    expect(ExitCode.GENERAL_ERROR).toBe(1);
  });

  it('should have INVALID_INPUT as 2', () => {
    expect(ExitCode.INVALID_INPUT).toBe(2);
  });

  it('should have NOT_FOUND as 3', () => {
    expect(ExitCode.NOT_FOUND).toBe(3);
  });

  it('should have DEPENDENCY_NOT_MET as 4', () => {
    expect(ExitCode.DEPENDENCY_NOT_MET).toBe(4);
  });

  it('should have PERMISSION_DENIED as 5', () => {
    expect(ExitCode.PERMISSION_DENIED).toBe(5);
  });

  it('should have ALREADY_EXISTS as 6', () => {
    expect(ExitCode.ALREADY_EXISTS).toBe(6);
  });

  it('should have INVALID_STATE as 7', () => {
    expect(ExitCode.INVALID_STATE).toBe(7);
  });

  it('should have FILE_SYSTEM_ERROR as 8', () => {
    expect(ExitCode.FILE_SYSTEM_ERROR).toBe(8);
  });

  it('should have PARSE_ERROR as 9', () => {
    expect(ExitCode.PARSE_ERROR).toBe(9);
  });

  it('should have all unique values', () => {
    const values = Object.values(ExitCode).filter(v => typeof v === 'number');
    const uniqueValues = new Set(values);
    expect(values.length).toBe(uniqueValues.size);
  });
});

describe('getExitCodeFromErrorCode', () => {
  describe('mapped error codes', () => {
    it('should map TASK_NOT_FOUND to NOT_FOUND', () => {
      expect(getExitCodeFromErrorCode('TASK_NOT_FOUND')).toBe(ExitCode.NOT_FOUND);
    });

    it('should map STATE_NOT_FOUND to NOT_FOUND', () => {
      expect(getExitCodeFromErrorCode('STATE_NOT_FOUND')).toBe(ExitCode.NOT_FOUND);
    });

    it('should map FILE_NOT_FOUND to NOT_FOUND', () => {
      expect(getExitCodeFromErrorCode('FILE_NOT_FOUND')).toBe(ExitCode.NOT_FOUND);
    });

    it('should map INVALID_INPUT to INVALID_INPUT', () => {
      expect(getExitCodeFromErrorCode('INVALID_INPUT')).toBe(ExitCode.INVALID_INPUT);
    });

    it('should map INVALID_JSON to PARSE_ERROR', () => {
      expect(getExitCodeFromErrorCode('INVALID_JSON')).toBe(ExitCode.PARSE_ERROR);
    });

    it('should map DEPENDENCY_NOT_MET to DEPENDENCY_NOT_MET', () => {
      expect(getExitCodeFromErrorCode('DEPENDENCY_NOT_MET')).toBe(ExitCode.DEPENDENCY_NOT_MET);
    });

    it('should map ALREADY_EXISTS to ALREADY_EXISTS', () => {
      expect(getExitCodeFromErrorCode('ALREADY_EXISTS')).toBe(ExitCode.ALREADY_EXISTS);
    });

    it('should map INVALID_STATE to INVALID_STATE', () => {
      expect(getExitCodeFromErrorCode('INVALID_STATE')).toBe(ExitCode.INVALID_STATE);
    });

    it('should map FILE_SYSTEM_ERROR to FILE_SYSTEM_ERROR', () => {
      expect(getExitCodeFromErrorCode('FILE_SYSTEM_ERROR')).toBe(ExitCode.FILE_SYSTEM_ERROR);
    });
  });

  describe('unmapped error codes', () => {
    it('should return GENERAL_ERROR for unknown error code', () => {
      expect(getExitCodeFromErrorCode('UNKNOWN_ERROR')).toBe(ExitCode.GENERAL_ERROR);
    });

    it('should return GENERAL_ERROR for empty string', () => {
      expect(getExitCodeFromErrorCode('')).toBe(ExitCode.GENERAL_ERROR);
    });

    it('should return GENERAL_ERROR for random string', () => {
      expect(getExitCodeFromErrorCode('SOME_RANDOM_CODE')).toBe(ExitCode.GENERAL_ERROR);
    });

    it('should return GENERAL_ERROR for lowercase error code', () => {
      expect(getExitCodeFromErrorCode('task_not_found')).toBe(ExitCode.GENERAL_ERROR);
    });

    it('should return GENERAL_ERROR for partial match', () => {
      expect(getExitCodeFromErrorCode('TASK_NOT')).toBe(ExitCode.GENERAL_ERROR);
    });
  });

  describe('edge cases', () => {
    it('should handle error codes with extra whitespace', () => {
      // The function expects exact matches, so whitespace should not match
      expect(getExitCodeFromErrorCode(' TASK_NOT_FOUND ')).toBe(ExitCode.GENERAL_ERROR);
    });

    it('should be case-sensitive', () => {
      expect(getExitCodeFromErrorCode('Task_Not_Found')).toBe(ExitCode.GENERAL_ERROR);
    });
  });
});
