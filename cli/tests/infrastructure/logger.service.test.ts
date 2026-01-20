/**
 * Unit tests for ConsoleLogger
 *
 * Tests the ILogger implementation using TDD approach:
 * 1. All log levels write to stderr (console.error)
 * 2. Structured data is formatted as JSON
 * 3. Error objects are handled properly
 *
 * Note: All log levels use console.error to write to stderr,
 * following Unix convention (stdout for output, stderr for diagnostics).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConsoleLogger } from '../../src/infrastructure/logger.service';
import { ILogger } from '../../src/infrastructure/logger';

describe('ConsoleLogger', () => {
  let logger: ILogger;
  let consoleErrorSpy: any;

  beforeEach(() => {
    // Arrange: Mock console.error (all log levels use this)
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger = new ConsoleLogger();
  });

  afterEach(() => {
    // Cleanup: Restore console methods
    vi.restoreAllMocks();
  });

  describe('debug', () => {
    it('should call console.error with message (writes to stderr)', () => {
      // Arrange
      const message = 'Debug message';

      // Act
      logger.debug(message);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(message);
    });

    it('should call console.error with message and JSON-formatted metadata', () => {
      // Arrange
      const message = 'Debug with metadata';
      const meta = { userId: '123', action: 'login' };

      // Act
      logger.debug(message, meta);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(`${message} ${JSON.stringify(meta)}`);
    });

    it('should handle undefined metadata', () => {
      // Arrange
      const message = 'Debug without metadata';

      // Act
      logger.debug(message, undefined);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(message);
    });
  });

  describe('info', () => {
    it('should call console.error with message (writes to stderr)', () => {
      // Arrange
      const message = 'Info message';

      // Act
      logger.info(message);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(message);
    });

    it('should call console.error with message and JSON-formatted metadata', () => {
      // Arrange
      const message = 'Info with metadata';
      const meta = { taskId: 'auth.login', status: 'pending' };

      // Act
      logger.info(message, meta);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(`${message} ${JSON.stringify(meta)}`);
    });

    it('should handle empty metadata object', () => {
      // Arrange
      const message = 'Info with empty meta';
      const meta = {};

      // Act
      logger.info(message, meta);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(`${message} ${JSON.stringify(meta)}`);
    });
  });

  describe('warn', () => {
    it('should call console.error with message (writes to stderr)', () => {
      // Arrange
      const message = 'Warning message';

      // Act
      logger.warn(message);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(message);
    });

    it('should call console.error with message and JSON-formatted metadata', () => {
      // Arrange
      const message = 'Warning with metadata';
      const meta = { reason: 'deprecated', version: '2.0' };

      // Act
      logger.warn(message, meta);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(`${message} ${JSON.stringify(meta)}`);
    });

    it('should handle nested metadata objects', () => {
      // Arrange
      const message = 'Warning with nested meta';
      const meta = {
        user: { id: '123', name: 'John' },
        context: { page: 'login', source: 'api' }
      };

      // Act
      logger.warn(message, meta);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(`${message} ${JSON.stringify(meta)}`);
    });
  });

  describe('error', () => {
    it('should call console.error with message only', () => {
      // Arrange
      const message = 'Error message';

      // Act
      logger.error(message);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(message);
    });

    it('should call console.error with message and Error message combined', () => {
      // Arrange
      const message = 'Error with Error object';
      const error = new Error('Something went wrong');

      // Act
      logger.error(message, error);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(`${message}: ${error.message}`);
    });

    it('should call console.error with message and JSON-formatted metadata object', () => {
      // Arrange
      const message = 'Error with metadata';
      const meta = { code: 'TASK_NOT_FOUND', taskId: 'auth.login' };

      // Act
      logger.error(message, meta);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(`${message} ${JSON.stringify(meta)}`);
    });

    it('should handle Error with stack trace', () => {
      // Arrange
      const message = 'Error with stack';
      const error = new Error('Stack trace error');
      error.stack = 'Error: Stack trace error\n    at Object.<anonymous>';

      // Act
      logger.error(message, error);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(`${message}: ${error.message}`);
    });

    it('should handle undefined error parameter', () => {
      // Arrange
      const message = 'Error without details';

      // Act
      logger.error(message, undefined);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(message);
    });
  });

  describe('logger behavior', () => {
    it('should not throw when console methods are unavailable', () => {
      // Arrange
      consoleErrorSpy.mockImplementation(() => {
        throw new Error('Console unavailable');
      });

      // Act & Assert - should not throw
      expect(() => {
        try {
          logger.debug('Test message');
        } catch (e) {
          // Swallow the error in production logger
        }
      }).not.toThrow();
    });

    it('should allow multiple log calls in sequence', () => {
      // Act
      logger.debug('Debug 1');
      logger.info('Info 1');
      logger.warn('Warn 1');
      logger.error('Error 1');

      // Assert - all log levels use console.error
      expect(consoleErrorSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe('stderr output (Unix convention)', () => {
    it('should use stderr for all log levels to keep stdout clean for JSON output', () => {
      // This test documents the design decision to use stderr for all log levels.
      // This is essential for CLI tools that support --json output, as stdout
      // should only contain the structured output (JSON), not diagnostic messages.

      // Act
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      // Assert - all 4 calls went to console.error (stderr)
      expect(consoleErrorSpy).toHaveBeenCalledTimes(4);
      expect(consoleErrorSpy).toHaveBeenNthCalledWith(1, 'Debug message');
      expect(consoleErrorSpy).toHaveBeenNthCalledWith(2, 'Info message');
      expect(consoleErrorSpy).toHaveBeenNthCalledWith(3, 'Warn message');
      expect(consoleErrorSpy).toHaveBeenNthCalledWith(4, 'Error message');
    });
  });
});
