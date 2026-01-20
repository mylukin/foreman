import { describe, it, expect, beforeEach } from 'vitest';
import { MockLogger } from '../../src/test-utils/mock-logger';

describe('MockLogger', () => {
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockLogger = new MockLogger();
  });

  describe('debug', () => {
    it('should track debug calls', () => {
      // Act
      mockLogger.debug('Debug message');

      // Assert
      expect(mockLogger.debugCalls).toHaveLength(1);
      expect(mockLogger.debugCalls[0].message).toBe('Debug message');
    });

    it('should track debug calls with metadata', () => {
      // Arrange
      const meta = { userId: '123', action: 'login' };

      // Act
      mockLogger.debug('User action', meta);

      // Assert
      expect(mockLogger.debugCalls).toHaveLength(1);
      expect(mockLogger.debugCalls[0].message).toBe('User action');
      expect(mockLogger.debugCalls[0].meta).toEqual(meta);
    });

    it('should track multiple debug calls', () => {
      // Act
      mockLogger.debug('First');
      mockLogger.debug('Second');

      // Assert
      expect(mockLogger.debugCalls).toHaveLength(2);
      expect(mockLogger.debugCalls[0].message).toBe('First');
      expect(mockLogger.debugCalls[1].message).toBe('Second');
    });
  });

  describe('info', () => {
    it('should track info calls', () => {
      // Act
      mockLogger.info('Info message');

      // Assert
      expect(mockLogger.infoCalls).toHaveLength(1);
      expect(mockLogger.infoCalls[0].message).toBe('Info message');
    });

    it('should track info calls with metadata', () => {
      // Arrange
      const meta = { requestId: 'abc-123' };

      // Act
      mockLogger.info('Request processed', meta);

      // Assert
      expect(mockLogger.infoCalls).toHaveLength(1);
      expect(mockLogger.infoCalls[0].message).toBe('Request processed');
      expect(mockLogger.infoCalls[0].meta).toEqual(meta);
    });
  });

  describe('warn', () => {
    it('should track warn calls', () => {
      // Act
      mockLogger.warn('Warning message');

      // Assert
      expect(mockLogger.warnCalls).toHaveLength(1);
      expect(mockLogger.warnCalls[0].message).toBe('Warning message');
    });

    it('should track warn calls with metadata', () => {
      // Arrange
      const meta = { threshold: 0.9, current: 0.95 };

      // Act
      mockLogger.warn('Memory usage high', meta);

      // Assert
      expect(mockLogger.warnCalls).toHaveLength(1);
      expect(mockLogger.warnCalls[0].message).toBe('Memory usage high');
      expect(mockLogger.warnCalls[0].meta).toEqual(meta);
    });
  });

  describe('error', () => {
    it('should track error calls', () => {
      // Act
      mockLogger.error('Error message');

      // Assert
      expect(mockLogger.errorCalls).toHaveLength(1);
      expect(mockLogger.errorCalls[0].message).toBe('Error message');
    });

    it('should track error calls with Error object', () => {
      // Arrange
      const error = new Error('Something went wrong');

      // Act
      mockLogger.error('Operation failed', error);

      // Assert
      expect(mockLogger.errorCalls).toHaveLength(1);
      expect(mockLogger.errorCalls[0].message).toBe('Operation failed');
      expect(mockLogger.errorCalls[0].error).toBe(error);
    });

    it('should track error calls with metadata', () => {
      // Arrange
      const meta = { code: 'ERR_TIMEOUT', retries: 3 };

      // Act
      mockLogger.error('Request timeout', meta);

      // Assert
      expect(mockLogger.errorCalls).toHaveLength(1);
      expect(mockLogger.errorCalls[0].message).toBe('Request timeout');
      expect(mockLogger.errorCalls[0].error).toEqual(meta);
    });
  });

  describe('helper methods', () => {
    describe('reset', () => {
      it('should clear all call tracking', () => {
        // Arrange
        mockLogger.debug('debug');
        mockLogger.info('info');
        mockLogger.warn('warn');
        mockLogger.error('error');

        // Act
        mockLogger.reset();

        // Assert
        expect(mockLogger.debugCalls).toHaveLength(0);
        expect(mockLogger.infoCalls).toHaveLength(0);
        expect(mockLogger.warnCalls).toHaveLength(0);
        expect(mockLogger.errorCalls).toHaveLength(0);
      });
    });

    describe('getLastX methods', () => {
      it('should get last debug call', () => {
        // Act
        mockLogger.debug('first');
        mockLogger.debug('second');

        // Assert
        expect(mockLogger.getLastDebug()?.message).toBe('second');
      });

      it('should get last info call', () => {
        // Act
        mockLogger.info('first');
        mockLogger.info('second');

        // Assert
        expect(mockLogger.getLastInfo()?.message).toBe('second');
      });

      it('should get last warn call', () => {
        // Act
        mockLogger.warn('first');
        mockLogger.warn('second');

        // Assert
        expect(mockLogger.getLastWarn()?.message).toBe('second');
      });

      it('should get last error call', () => {
        // Act
        mockLogger.error('first');
        mockLogger.error('second');

        // Assert
        expect(mockLogger.getLastError()?.message).toBe('second');
      });

      it('should return undefined when no calls', () => {
        // Assert
        expect(mockLogger.getLastDebug()).toBeUndefined();
        expect(mockLogger.getLastInfo()).toBeUndefined();
        expect(mockLogger.getLastWarn()).toBeUndefined();
        expect(mockLogger.getLastError()).toBeUndefined();
      });
    });

    describe('wasXCalledWith methods', () => {
      it('should detect debug with specific message', () => {
        // Act
        mockLogger.debug('specific message');
        mockLogger.debug('another message');

        // Assert
        expect(mockLogger.wasDebugCalledWith('specific message')).toBe(true);
        expect(mockLogger.wasDebugCalledWith('not called')).toBe(false);
      });

      it('should detect info with specific message', () => {
        // Act
        mockLogger.info('specific message');

        // Assert
        expect(mockLogger.wasInfoCalledWith('specific message')).toBe(true);
        expect(mockLogger.wasInfoCalledWith('not called')).toBe(false);
      });

      it('should detect warn with specific message', () => {
        // Act
        mockLogger.warn('specific message');

        // Assert
        expect(mockLogger.wasWarnCalledWith('specific message')).toBe(true);
        expect(mockLogger.wasWarnCalledWith('not called')).toBe(false);
      });

      it('should detect error with specific message', () => {
        // Act
        mockLogger.error('specific message');

        // Assert
        expect(mockLogger.wasErrorCalledWith('specific message')).toBe(true);
        expect(mockLogger.wasErrorCalledWith('not called')).toBe(false);
      });
    });

    describe('wasXCalled methods', () => {
      it('should detect debug was called', () => {
        // Assert before
        expect(mockLogger.wasDebugCalled()).toBe(false);

        // Act
        mockLogger.debug('test');

        // Assert after
        expect(mockLogger.wasDebugCalled()).toBe(true);
      });

      it('should detect info was called', () => {
        // Assert before
        expect(mockLogger.wasInfoCalled()).toBe(false);

        // Act
        mockLogger.info('test');

        // Assert after
        expect(mockLogger.wasInfoCalled()).toBe(true);
      });

      it('should detect warn was called', () => {
        // Assert before
        expect(mockLogger.wasWarnCalled()).toBe(false);

        // Act
        mockLogger.warn('test');

        // Assert after
        expect(mockLogger.wasWarnCalled()).toBe(true);
      });

      it('should detect error was called', () => {
        // Assert before
        expect(mockLogger.wasErrorCalled()).toBe(false);

        // Act
        mockLogger.error('test');

        // Assert after
        expect(mockLogger.wasErrorCalled()).toBe(true);
      });
    });

    describe('getAllLogs', () => {
      it('should return all logs with levels', () => {
        // Act
        mockLogger.debug('debug msg');
        mockLogger.info('info msg');
        mockLogger.warn('warn msg');
        mockLogger.error('error msg');

        // Assert
        const logs = mockLogger.getAllLogs();
        expect(logs).toHaveLength(4);
        expect(logs[0]).toEqual({ level: 'debug', message: 'debug msg', meta: undefined });
        expect(logs[1]).toEqual({ level: 'info', message: 'info msg', meta: undefined });
        expect(logs[2]).toEqual({ level: 'warn', message: 'warn msg', meta: undefined });
        expect(logs[3]).toEqual({ level: 'error', message: 'error msg', meta: undefined });
      });

      it('should include metadata in logs', () => {
        // Arrange
        const meta = { key: 'value' };

        // Act
        mockLogger.info('test', meta);

        // Assert
        const logs = mockLogger.getAllLogs();
        expect(logs[0].meta).toEqual(meta);
      });
    });

    describe('getLogCounts', () => {
      it('should return counts for all log levels', () => {
        // Act
        mockLogger.debug('1');
        mockLogger.debug('2');
        mockLogger.info('1');
        mockLogger.warn('1');
        mockLogger.warn('2');
        mockLogger.warn('3');

        // Assert
        const counts = mockLogger.getLogCounts();
        expect(counts).toEqual({
          debug: 2,
          info: 1,
          warn: 3,
          error: 0,
        });
      });

      it('should return zeros when no logs', () => {
        // Assert
        const counts = mockLogger.getLogCounts();
        expect(counts).toEqual({
          debug: 0,
          info: 0,
          warn: 0,
          error: 0,
        });
      });
    });

    describe('hasLogs', () => {
      it('should return false when no logs', () => {
        // Assert
        expect(mockLogger.hasLogs()).toBe(false);
      });

      it('should return true when has debug logs', () => {
        // Act
        mockLogger.debug('test');

        // Assert
        expect(mockLogger.hasLogs()).toBe(true);
      });

      it('should return true when has any type of logs', () => {
        // Act
        mockLogger.error('test');

        // Assert
        expect(mockLogger.hasLogs()).toBe(true);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should track mixed logging sequence', () => {
      // Act
      mockLogger.info('Starting operation');
      mockLogger.debug('Detail 1', { step: 1 });
      mockLogger.debug('Detail 2', { step: 2 });
      mockLogger.warn('Potential issue detected');
      mockLogger.error('Operation failed', new Error('Timeout'));

      // Assert
      expect(mockLogger.infoCalls).toHaveLength(1);
      expect(mockLogger.debugCalls).toHaveLength(2);
      expect(mockLogger.warnCalls).toHaveLength(1);
      expect(mockLogger.errorCalls).toHaveLength(1);
      expect(mockLogger.getAllLogs()).toHaveLength(5);
    });

    it('should support test cleanup pattern', () => {
      // Act - First test
      mockLogger.info('test 1');
      expect(mockLogger.wasInfoCalled()).toBe(true);

      // Cleanup
      mockLogger.reset();

      // Act - Second test
      expect(mockLogger.wasInfoCalled()).toBe(false);
      mockLogger.info('test 2');
      expect(mockLogger.infoCalls).toHaveLength(1);
    });
  });
});
