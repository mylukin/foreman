import { describe, it, expect, beforeEach } from 'vitest';
import { StateService, StateUpdate } from './state-service';
import { State, Phase, StateConfig } from '../domain/state-entity';
import { IStateRepository } from '../repositories/state-repository';
import { ILogger } from '../infrastructure/logger';

/**
 * Mock StateRepository for testing
 */
class MockStateRepository implements IStateRepository {
  private state: State | null = null;

  async get(): Promise<State | null> {
    return this.state;
  }

  async set(stateConfig: Omit<StateConfig, 'updatedAt'>): Promise<void> {
    this.state = State.fromJSON({
      ...stateConfig,
      updatedAt: new Date().toISOString(),
    });
  }

  async update(updates: import('./state-service').StateUpdate): Promise<void> {
    if (!this.state) {
      throw new Error('No state to update');
    }
    if (updates.phase !== undefined) {
      this.state.transitionTo(updates.phase);
    }
    if ('currentTask' in updates) {
      this.state.setCurrentTask(updates.currentTask);
    }
    if (updates.prd !== undefined) {
      this.state.setPrd(updates.prd);
    }
    if (updates.addError !== undefined) {
      this.state.addError(updates.addError);
    }
  }

  async clear(): Promise<void> {
    this.state = null;
  }

  async exists(): Promise<boolean> {
    return this.state !== null;
  }

  // Test helper
  setState(state: State): void {
    this.state = state;
  }
}

/**
 * Mock Logger for testing
 */
class MockLogger implements ILogger {
  logs: Array<{ level: string; message: string; meta?: any }> = [];

  debug(message: string, meta?: any): void {
    this.logs.push({ level: 'debug', message, meta });
  }

  info(message: string, meta?: any): void {
    this.logs.push({ level: 'info', message, meta });
  }

  warn(message: string, meta?: any): void {
    this.logs.push({ level: 'warn', message, meta });
  }

  error(message: string, meta?: any): void {
    this.logs.push({ level: 'error', message, meta });
  }

  clear(): void {
    this.logs = [];
  }
}

describe('StateService', () => {
  let stateRepo: MockStateRepository;
  let logger: MockLogger;
  let service: StateService;

  beforeEach(() => {
    stateRepo = new MockStateRepository();
    logger = new MockLogger();
    service = new StateService(stateRepo, logger);
  });

  describe('getState', () => {
    it('should return null when state does not exist', async () => {
      // Act
      const result = await service.getState();

      // Assert
      expect(result).toBeNull();
    });

    it('should return state when it exists', async () => {
      // Arrange
      const state = State.createNew();
      stateRepo.setState(state);

      // Act
      const result = await service.getState();

      // Assert
      expect(result).toBeDefined();
      expect(result?.phase).toBe('clarify');
    });
  });

  describe('initializeState', () => {
    it('should create new state in clarify phase by default', async () => {
      // Act
      const result = await service.initializeState();

      // Assert
      expect(result).toBeDefined();
      expect(result.phase).toBe('clarify');
      expect(result.startedAt).toBeDefined();
    });

    it('should create new state in specified phase', async () => {
      // Act
      const result = await service.initializeState('implement');

      // Assert
      expect(result.phase).toBe('implement');
    });

    it('should return existing state if already initialized', async () => {
      // Arrange
      const existing = State.createNew();
      stateRepo.setState(existing);

      // Act
      const result = await service.initializeState('breakdown');

      // Assert
      expect(result.phase).toBe('clarify'); // Original phase, not changed
      expect(logger.logs.some((l) => l.level === 'warn' && l.message.includes('already exists'))).toBe(
        true
      );
    });

    it('should log initialization', async () => {
      // Act
      await service.initializeState('breakdown');

      // Assert
      expect(logger.logs).toContainEqual({
        level: 'info',
        message: 'Initializing workflow state',
        meta: { phase: 'breakdown' },
      });
    });
  });

  describe('updateState', () => {
    beforeEach(async () => {
      await service.initializeState();
    });

    it('should update current task', async () => {
      // Arrange
      const updates: StateUpdate = {
        currentTask: 'test.task',
      };

      // Act
      const result = await service.updateState(updates);

      // Assert
      expect(result.currentTask).toBe('test.task');
    });

    it('should update PRD', async () => {
      // Arrange
      const prd = {
        title: 'Test PRD',
        requirements: ['req1', 'req2'],
      };
      const updates: StateUpdate = {
        prd,
      };

      // Act
      const result = await service.updateState(updates);

      // Assert
      expect(result.prd).toEqual(prd);
    });

    it('should throw error when state does not exist', async () => {
      // Arrange
      await service.clearState();
      const updates: StateUpdate = {
        currentTask: 'test.task',
      };

      // Act & Assert
      await expect(service.updateState(updates)).rejects.toThrow(
        'State not found. Initialize state first.'
      );
    });
  });

  describe('transitionToPhase', () => {
    it('should transition from clarify to breakdown', async () => {
      // Arrange
      await service.initializeState('clarify');

      // Act
      const result = await service.transitionToPhase('breakdown');

      // Assert
      expect(result.phase).toBe('breakdown');
    });

    it('should throw error for invalid transition', async () => {
      // Arrange
      await service.initializeState('clarify');

      // Act & Assert
      await expect(service.transitionToPhase('deliver')).rejects.toThrow(
        'Cannot transition from clarify to deliver'
      );
    });

    it('should throw error when state does not exist', async () => {
      // Act & Assert
      await expect(service.transitionToPhase('breakdown')).rejects.toThrow(
        'State not found. Initialize state first.'
      );
    });

    it('should log phase transition', async () => {
      // Arrange
      await service.initializeState('clarify');
      logger.clear();

      // Act
      await service.transitionToPhase('breakdown');

      // Assert
      expect(logger.logs.some((l) => l.level === 'info' && l.message.includes('Transitioning'))).toBe(
        true
      );
      expect(logger.logs.some((l) => l.level === 'info' && l.message.includes('Transitioned'))).toBe(
        true
      );
    });
  });

  describe('setCurrentTask', () => {
    beforeEach(async () => {
      await service.initializeState();
    });

    it('should set current task', async () => {
      // Act
      const result = await service.setCurrentTask('test.task');

      // Assert
      expect(result.currentTask).toBe('test.task');
    });

    it('should clear current task with undefined', async () => {
      // Arrange
      await service.setCurrentTask('test.task');

      // Act
      const result = await service.setCurrentTask(undefined);

      // Assert
      expect(result.currentTask).toBeUndefined();
    });

    it('should throw error when state does not exist', async () => {
      // Arrange
      await service.clearState();

      // Act & Assert
      await expect(service.setCurrentTask('test.task')).rejects.toThrow(
        'State not found. Initialize state first.'
      );
    });
  });

  describe('setPrd', () => {
    beforeEach(async () => {
      await service.initializeState();
    });

    it('should set PRD', async () => {
      // Arrange
      const prd = {
        title: 'Test PRD',
        description: 'Test description',
        userStories: ['Story 1', 'Story 2'],
      };

      // Act
      const result = await service.setPrd(prd);

      // Assert
      expect(result.prd).toEqual(prd);
    });

    it('should throw error when state does not exist', async () => {
      // Arrange
      await service.clearState();

      // Act & Assert
      await expect(service.setPrd({ title: 'Test' })).rejects.toThrow(
        'State not found. Initialize state first.'
      );
    });
  });

  describe('addError', () => {
    beforeEach(async () => {
      await service.initializeState();
    });

    it('should add error to error list', async () => {
      // Arrange
      const error = {
        message: 'Test error',
        code: 'ERR001',
      };

      // Act
      const result = await service.addError(error);

      // Assert
      expect(result.errors).toContainEqual(error);
    });

    it('should add multiple errors', async () => {
      // Arrange
      const error1 = { message: 'Error 1', code: 'ERR1' };
      const error2 = { message: 'Error 2', code: 'ERR2' };

      // Act
      await service.addError(error1);
      const result = await service.addError(error2);

      // Assert
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContainEqual(error1);
      expect(result.errors).toContainEqual(error2);
    });

    it('should throw error when state does not exist', async () => {
      // Arrange
      await service.clearState();

      // Act & Assert
      await expect(service.addError({ message: 'Test' })).rejects.toThrow(
        'State not found. Initialize state first.'
      );
    });
  });

  describe('clearErrors', () => {
    beforeEach(async () => {
      await service.initializeState();
    });

    it('should clear all errors', async () => {
      // Arrange
      await service.addError({ message: 'Error 1' });
      await service.addError({ message: 'Error 2' });

      // Act
      const result = await service.clearErrors();

      // Assert
      expect(result.errors).toHaveLength(0);
    });

    it('should handle clearing when no errors exist', async () => {
      // Act
      const result = await service.clearErrors();

      // Assert
      expect(result.errors).toHaveLength(0);
    });

    it('should throw error when state does not exist', async () => {
      // Arrange
      await service.clearState();

      // Act & Assert
      await expect(service.clearErrors()).rejects.toThrow(
        'State not found. Initialize state first.'
      );
    });
  });

  describe('clearState', () => {
    it('should clear state', async () => {
      // Arrange
      await service.initializeState();

      // Act
      await service.clearState();

      // Assert
      const result = await service.getState();
      expect(result).toBeNull();
    });

    it('should not throw error when clearing non-existent state', async () => {
      // Act & Assert
      await expect(service.clearState()).resolves.not.toThrow();
    });

    it('should log clear operation', async () => {
      // Act
      await service.clearState();

      // Assert
      expect(logger.logs.some((l) => l.level === 'info' && l.message.includes('Clearing'))).toBe(
        true
      );
      expect(logger.logs.some((l) => l.level === 'info' && l.message.includes('cleared'))).toBe(true);
    });
  });

  describe('exists', () => {
    it('should return false when state does not exist', async () => {
      // Act
      const result = await service.exists();

      // Assert
      expect(result).toBe(false);
    });

    it('should return true when state exists', async () => {
      // Arrange
      await service.initializeState();

      // Act
      const result = await service.exists();

      // Assert
      expect(result).toBe(true);
    });
  });
});
