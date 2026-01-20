import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CLI_SCHEMA_VERSION,
  CLIResponse,
  successResponse,
  errorResponse,
  outputResponse,
} from '../../src/core/response-wrapper';

describe('CLI_SCHEMA_VERSION', () => {
  it('should be defined as 1.0.0', () => {
    expect(CLI_SCHEMA_VERSION).toBe('1.0.0');
  });
});

describe('successResponse', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create a success response with data', () => {
    const now = new Date('2025-01-19T10:00:00.000Z');
    vi.setSystemTime(now);

    const data = { id: '123', name: 'test' };
    const response = successResponse(data);

    expect(response).toEqual({
      schemaVersion: CLI_SCHEMA_VERSION,
      success: true,
      data,
      timestamp: '2025-01-19T10:00:00.000Z',
      metadata: undefined,
    });
  });

  it('should create a success response with metadata', () => {
    const now = new Date('2025-01-19T10:00:00.000Z');
    vi.setSystemTime(now);

    const data = { id: '123', name: 'test' };
    const metadata = { command: 'test-command', executionTime: 150 };
    const response = successResponse(data, metadata);

    expect(response).toEqual({
      schemaVersion: CLI_SCHEMA_VERSION,
      success: true,
      data,
      timestamp: '2025-01-19T10:00:00.000Z',
      metadata,
    });
  });

  it('should handle null data', () => {
    const response = successResponse(null);
    expect(response.success).toBe(true);
    expect(response.data).toBeNull();
  });

  it('should handle undefined data', () => {
    const response = successResponse(undefined);
    expect(response.success).toBe(true);
    expect(response.data).toBeUndefined();
  });

  it('should handle array data', () => {
    const data = [1, 2, 3];
    const response = successResponse(data);
    expect(response.success).toBe(true);
    expect(response.data).toEqual(data);
  });

  it('should handle string data', () => {
    const data = 'success message';
    const response = successResponse(data);
    expect(response.success).toBe(true);
    expect(response.data).toBe(data);
  });
});

describe('errorResponse', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create a basic error response', () => {
    const now = new Date('2025-01-19T10:00:00.000Z');
    vi.setSystemTime(now);

    const response = errorResponse('ERROR_CODE', 'Error message');

    expect(response).toEqual({
      schemaVersion: CLI_SCHEMA_VERSION,
      success: false,
      error: {
        code: 'ERROR_CODE',
        message: 'Error message',
        details: undefined,
        recoverable: false,
        suggestedAction: undefined,
      },
      timestamp: '2025-01-19T10:00:00.000Z',
      metadata: undefined,
    });
  });

  it('should create error response with all options', () => {
    const now = new Date('2025-01-19T10:00:00.000Z');
    vi.setSystemTime(now);

    const response = errorResponse('ERROR_CODE', 'Error message', {
      details: { field: 'value' },
      recoverable: true,
      suggestedAction: 'Try again',
      metadata: { command: 'test' },
    });

    expect(response).toEqual({
      schemaVersion: CLI_SCHEMA_VERSION,
      success: false,
      error: {
        code: 'ERROR_CODE',
        message: 'Error message',
        details: { field: 'value' },
        recoverable: true,
        suggestedAction: 'Try again',
      },
      timestamp: '2025-01-19T10:00:00.000Z',
      metadata: { command: 'test' },
    });
  });

  it('should default recoverable to false', () => {
    const response = errorResponse('ERROR_CODE', 'Error message', {
      details: { field: 'value' },
    });

    expect(response.error?.recoverable).toBe(false);
  });

  it('should handle recoverable explicitly set to false', () => {
    const response = errorResponse('ERROR_CODE', 'Error message', {
      recoverable: false,
    });

    expect(response.error?.recoverable).toBe(false);
  });

  it('should handle empty options object', () => {
    const response = errorResponse('ERROR_CODE', 'Error message', {});

    expect(response.error?.details).toBeUndefined();
    expect(response.error?.recoverable).toBe(false);
    expect(response.error?.suggestedAction).toBeUndefined();
    expect(response.metadata).toBeUndefined();
  });

  it('should handle partial options', () => {
    const response = errorResponse('ERROR_CODE', 'Error message', {
      suggestedAction: 'Check logs',
    });

    expect(response.error?.details).toBeUndefined();
    expect(response.error?.recoverable).toBe(false);
    expect(response.error?.suggestedAction).toBe('Check logs');
  });
});

describe('outputResponse', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('JSON mode', () => {
    it('should output success response as JSON', () => {
      const response = successResponse({ id: '123' });
      outputResponse(response, true);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify(response, null, 2)
      );
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should output error response as JSON', () => {
      const response = errorResponse('ERROR_CODE', 'Error message');
      outputResponse(response, true);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify(response, null, 2)
      );
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should ignore humanFormatter in JSON mode', () => {
      const response = successResponse({ id: '123' });
      const formatter = vi.fn();
      outputResponse(response, true, formatter);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify(response, null, 2)
      );
      expect(formatter).not.toHaveBeenCalled();
    });
  });

  describe('Human-readable mode - success', () => {
    it('should call humanFormatter for success response', () => {
      const data = { id: '123', name: 'test' };
      const response = successResponse(data);
      const formatter = vi.fn();

      outputResponse(response, false, formatter);

      expect(formatter).toHaveBeenCalledWith(data);
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should not call formatter if no formatter provided', () => {
      const response = successResponse({ id: '123' });
      outputResponse(response, false);

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should not call formatter if no data in response', () => {
      const response: CLIResponse<undefined> = {
        schemaVersion: CLI_SCHEMA_VERSION,
        success: true,
        timestamp: new Date().toISOString(),
      };
      const formatter = vi.fn();

      outputResponse(response, false, formatter);

      expect(formatter).not.toHaveBeenCalled();
    });
  });

  describe('Human-readable mode - error', () => {
    it('should output basic error message', () => {
      const response = errorResponse('ERROR_CODE', 'Something went wrong');
      outputResponse(response, false);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error [ERROR_CODE]: Something went wrong')
      );
    });

    it('should output error with details', () => {
      const response = errorResponse('ERROR_CODE', 'Something went wrong', {
        details: { field: 'value', reason: 'invalid' },
      });
      outputResponse(response, false);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error [ERROR_CODE]: Something went wrong')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Details:')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('"field":"value"')
      );
    });

    it('should output error with suggested action', () => {
      const response = errorResponse('ERROR_CODE', 'Something went wrong', {
        suggestedAction: 'Try running with --verbose flag',
      });
      outputResponse(response, false);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error [ERROR_CODE]: Something went wrong')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Suggestion: Try running with --verbose flag')
      );
    });

    it('should output error with both details and suggested action', () => {
      const response = errorResponse('ERROR_CODE', 'Something went wrong', {
        details: { reason: 'invalid input' },
        suggestedAction: 'Check your input format',
      });
      outputResponse(response, false);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error [ERROR_CODE]: Something went wrong')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Details:')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Suggestion:')
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle response with no error object in human mode', () => {
      const response: CLIResponse = {
        schemaVersion: CLI_SCHEMA_VERSION,
        success: false,
        timestamp: new Date().toISOString(),
      };

      outputResponse(response, false);

      // Should not crash, but also won't output anything
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should handle formatter that throws error', () => {
      const response = successResponse({ id: '123' });
      const formatter = vi.fn(() => {
        throw new Error('Formatter error');
      });

      expect(() => {
        outputResponse(response, false, formatter);
      }).toThrow('Formatter error');
    });
  });
});
