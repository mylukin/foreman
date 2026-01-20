import { describe, it, expect, beforeEach } from 'vitest';
import { State, StateConfig, Phase } from '../../src/domain/state-entity';

describe('State Domain Entity', () => {
  let baseConfig: StateConfig;

  beforeEach(() => {
    baseConfig = {
      phase: 'clarify',
      startedAt: '2026-01-20T10:00:00.000Z',
      updatedAt: '2026-01-20T10:00:00.000Z',
    };
  });

  describe('constructor', () => {
    it('should create state with all fields', () => {
      // Arrange
      const config: StateConfig = {
        phase: 'implement',
        currentTask: 'test.task',
        prd: { title: 'Test PRD' },
        errors: [{ message: 'Error 1' }],
        startedAt: '2026-01-20T10:00:00.000Z',
        updatedAt: '2026-01-20T10:30:00.000Z',
      };

      // Act
      const state = new State(config);

      // Assert
      expect(state.phase).toBe('implement');
      expect(state.currentTask).toBe('test.task');
      expect(state.prd).toEqual({ title: 'Test PRD' });
      expect(state.errors).toEqual([{ message: 'Error 1' }]);
      expect(state.startedAt).toBeInstanceOf(Date);
      expect(state.updatedAt).toBeInstanceOf(Date);
    });

    it('should parse timestamp strings to Date objects', () => {
      // Arrange
      const config: StateConfig = {
        phase: 'clarify',
        startedAt: '2026-01-20T10:00:00.000Z',
        updatedAt: '2026-01-20T10:30:00.000Z',
      };

      // Act
      const state = new State(config);

      // Assert
      expect(state.startedAt.toISOString()).toBe('2026-01-20T10:00:00.000Z');
      expect(state.updatedAt.toISOString()).toBe('2026-01-20T10:30:00.000Z');
    });

    it('should initialize empty errors array if not provided', () => {
      // Arrange
      const config: StateConfig = {
        phase: 'clarify',
        startedAt: '2026-01-20T10:00:00.000Z',
        updatedAt: '2026-01-20T10:00:00.000Z',
      };

      // Act
      const state = new State(config);

      // Assert
      expect(state.errors).toEqual([]);
    });
  });

  describe('canTransitionTo', () => {
    it('should allow clarify → breakdown', () => {
      // Arrange
      const state = new State({ ...baseConfig, phase: 'clarify' });

      // Act
      const result = state.canTransitionTo('breakdown');

      // Assert
      expect(result).toBe(true);
    });

    it('should allow breakdown → implement', () => {
      // Arrange
      const state = new State({ ...baseConfig, phase: 'breakdown' });

      // Act
      const result = state.canTransitionTo('implement');

      // Assert
      expect(result).toBe(true);
    });

    it('should allow implement → heal', () => {
      // Arrange
      const state = new State({ ...baseConfig, phase: 'implement' });

      // Act
      const result = state.canTransitionTo('heal');

      // Assert
      expect(result).toBe(true);
    });

    it('should allow implement → deliver', () => {
      // Arrange
      const state = new State({ ...baseConfig, phase: 'implement' });

      // Act
      const result = state.canTransitionTo('deliver');

      // Assert
      expect(result).toBe(true);
    });

    it('should allow heal → implement (retry after healing)', () => {
      // Arrange
      const state = new State({ ...baseConfig, phase: 'heal' });

      // Act
      const result = state.canTransitionTo('implement');

      // Assert
      expect(result).toBe(true);
    });

    it('should allow heal → deliver (skip to delivery)', () => {
      // Arrange
      const state = new State({ ...baseConfig, phase: 'heal' });

      // Act
      const result = state.canTransitionTo('deliver');

      // Assert
      expect(result).toBe(true);
    });

    it('should allow deliver → complete', () => {
      // Arrange
      const state = new State({ ...baseConfig, phase: 'deliver' });

      // Act
      const result = state.canTransitionTo('complete');

      // Assert
      expect(result).toBe(true);
    });

    it('should NOT allow clarify → implement (skipping breakdown)', () => {
      // Arrange
      const state = new State({ ...baseConfig, phase: 'clarify' });

      // Act
      const result = state.canTransitionTo('implement');

      // Assert
      expect(result).toBe(false);
    });

    it('should NOT allow breakdown → deliver (skipping implement)', () => {
      // Arrange
      const state = new State({ ...baseConfig, phase: 'breakdown' });

      // Act
      const result = state.canTransitionTo('deliver');

      // Assert
      expect(result).toBe(false);
    });

    it('should NOT allow backward transition (deliver → implement)', () => {
      // Arrange
      const state = new State({ ...baseConfig, phase: 'deliver' });

      // Act
      const result = state.canTransitionTo('implement');

      // Assert
      expect(result).toBe(false);
    });

    it('should NOT allow transition from complete phase', () => {
      // Arrange
      const state = new State({ ...baseConfig, phase: 'complete' });

      // Act & Assert
      expect(state.canTransitionTo('clarify')).toBe(false);
      expect(state.canTransitionTo('implement')).toBe(false);
      expect(state.canTransitionTo('deliver')).toBe(false);
    });
  });

  describe('transitionTo', () => {
    it('should transition from clarify to breakdown', () => {
      // Arrange
      const state = new State({ ...baseConfig, phase: 'clarify' });

      // Act
      state.transitionTo('breakdown');

      // Assert
      expect(state.phase).toBe('breakdown');
    });

    it('should update timestamp on transition', () => {
      // Arrange
      const state = new State({ ...baseConfig, phase: 'clarify' });
      const originalTimestamp = state.updatedAt.toISOString();

      // Act
      state.transitionTo('breakdown');

      // Assert
      expect(state.updatedAt.toISOString()).not.toBe(originalTimestamp);
    });

    it('should throw error on invalid transition', () => {
      // Arrange
      const state = new State({ ...baseConfig, phase: 'clarify' });

      // Act & Assert
      expect(() => state.transitionTo('implement')).toThrow(
        'Invalid phase transition: clarify → implement. Allowed transitions from clarify: breakdown'
      );
    });

    it('should throw error on backward transition', () => {
      // Arrange
      const state = new State({ ...baseConfig, phase: 'deliver' });

      // Act & Assert
      expect(() => state.transitionTo('implement')).toThrow(
        'Invalid phase transition: deliver → implement'
      );
    });

    it('should throw error when transitioning from complete', () => {
      // Arrange
      const state = new State({ ...baseConfig, phase: 'complete' });

      // Act & Assert
      expect(() => state.transitionTo('clarify')).toThrow(
        'Invalid phase transition: complete → clarify. Allowed transitions from complete: none'
      );
    });
  });

  describe('setCurrentTask', () => {
    it('should set current task', () => {
      // Arrange
      const state = new State({ ...baseConfig });

      // Act
      state.setCurrentTask('test.task');

      // Assert
      expect(state.currentTask).toBe('test.task');
    });

    it('should clear current task when undefined', () => {
      // Arrange
      const state = new State({ ...baseConfig, currentTask: 'old.task' });

      // Act
      state.setCurrentTask(undefined);

      // Assert
      expect(state.currentTask).toBeUndefined();
    });

    it('should update timestamp', () => {
      // Arrange
      const state = new State({ ...baseConfig });
      const originalTimestamp = state.updatedAt.toISOString();

      // Act
      state.setCurrentTask('test.task');

      // Assert
      expect(state.updatedAt.toISOString()).not.toBe(originalTimestamp);
    });
  });

  describe('setPrd', () => {
    it('should set PRD', () => {
      // Arrange
      const state = new State({ ...baseConfig });
      const prd = {
        title: 'Test PRD',
        userStories: ['story1', 'story2'],
      };

      // Act
      state.setPrd(prd);

      // Assert
      expect(state.prd).toEqual(prd);
    });

    it('should update timestamp', () => {
      // Arrange
      const state = new State({ ...baseConfig });
      const originalTimestamp = state.updatedAt.toISOString();

      // Act
      state.setPrd({ title: 'Test' });

      // Assert
      expect(state.updatedAt.toISOString()).not.toBe(originalTimestamp);
    });
  });

  describe('addError', () => {
    it('should add error to errors array', () => {
      // Arrange
      const state = new State({ ...baseConfig });
      const error = { message: 'Test error', code: 'TEST' };

      // Act
      state.addError(error);

      // Assert
      expect(state.errors).toContainEqual(error);
    });

    it('should append to existing errors', () => {
      // Arrange
      const state = new State({
        ...baseConfig,
        errors: [{ message: 'Error 1' }],
      });

      // Act
      state.addError({ message: 'Error 2' });

      // Assert
      expect(state.errors).toHaveLength(2);
      expect(state.errors[0]).toEqual({ message: 'Error 1' });
      expect(state.errors[1]).toEqual({ message: 'Error 2' });
    });

    it('should update timestamp', () => {
      // Arrange
      const state = new State({ ...baseConfig });
      const originalTimestamp = state.updatedAt.toISOString();

      // Act
      state.addError({ message: 'Error' });

      // Assert
      expect(state.updatedAt.toISOString()).not.toBe(originalTimestamp);
    });
  });

  describe('clearErrors', () => {
    it('should clear all errors', () => {
      // Arrange
      const state = new State({
        ...baseConfig,
        errors: [{ message: 'Error 1' }, { message: 'Error 2' }],
      });

      // Act
      state.clearErrors();

      // Assert
      expect(state.errors).toEqual([]);
    });

    it('should update timestamp', () => {
      // Arrange
      const state = new State({
        ...baseConfig,
        errors: [{ message: 'Error' }],
      });
      const originalTimestamp = state.updatedAt.toISOString();

      // Act
      state.clearErrors();

      // Assert
      expect(state.updatedAt.toISOString()).not.toBe(originalTimestamp);
    });
  });

  describe('isComplete', () => {
    it('should return true when phase is complete', () => {
      // Arrange
      const state = new State({ ...baseConfig, phase: 'complete' });

      // Act
      const result = state.isComplete();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for other phases', () => {
      // Arrange
      const phases: Phase[] = ['clarify', 'breakdown', 'implement', 'heal', 'deliver'];

      // Act & Assert
      phases.forEach((phase) => {
        const state = new State({ ...baseConfig, phase });
        expect(state.isComplete()).toBe(false);
      });
    });
  });

  describe('isHealing', () => {
    it('should return true when phase is heal', () => {
      // Arrange
      const state = new State({ ...baseConfig, phase: 'heal' });

      // Act
      const result = state.isHealing();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for other phases', () => {
      // Arrange
      const phases: Phase[] = ['clarify', 'breakdown', 'implement', 'deliver', 'complete'];

      // Act & Assert
      phases.forEach((phase) => {
        const state = new State({ ...baseConfig, phase });
        expect(state.isHealing()).toBe(false);
      });
    });
  });

  describe('isImplementing', () => {
    it('should return true when phase is implement', () => {
      // Arrange
      const state = new State({ ...baseConfig, phase: 'implement' });

      // Act
      const result = state.isImplementing();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for other phases', () => {
      // Arrange
      const phases: Phase[] = ['clarify', 'breakdown', 'heal', 'deliver', 'complete'];

      // Act & Assert
      phases.forEach((phase) => {
        const state = new State({ ...baseConfig, phase });
        expect(state.isImplementing()).toBe(false);
      });
    });
  });

  describe('hasErrors', () => {
    it('should return true when errors exist', () => {
      // Arrange
      const state = new State({
        ...baseConfig,
        errors: [{ message: 'Error' }],
      });

      // Act
      const result = state.hasErrors();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when no errors', () => {
      // Arrange
      const state = new State({ ...baseConfig, errors: [] });

      // Act
      const result = state.hasErrors();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getPhaseIndex', () => {
    it('should return correct index for each phase', () => {
      // Act & Assert
      expect(new State({ ...baseConfig, phase: 'clarify' }).getPhaseIndex()).toBe(0);
      expect(new State({ ...baseConfig, phase: 'breakdown' }).getPhaseIndex()).toBe(1);
      expect(new State({ ...baseConfig, phase: 'implement' }).getPhaseIndex()).toBe(2);
      expect(new State({ ...baseConfig, phase: 'heal' }).getPhaseIndex()).toBe(3);
      expect(new State({ ...baseConfig, phase: 'deliver' }).getPhaseIndex()).toBe(4);
      expect(new State({ ...baseConfig, phase: 'complete' }).getPhaseIndex()).toBe(5);
    });
  });

  describe('getProgressPercentage', () => {
    it('should return 0% for clarify phase', () => {
      // Arrange
      const state = new State({ ...baseConfig, phase: 'clarify' });

      // Act
      const result = state.getProgressPercentage();

      // Assert
      expect(result).toBe(0);
    });

    it('should return 20% for breakdown phase', () => {
      // Arrange
      const state = new State({ ...baseConfig, phase: 'breakdown' });

      // Act
      const result = state.getProgressPercentage();

      // Assert
      expect(result).toBe(20);
    });

    it('should return 40% for implement phase', () => {
      // Arrange
      const state = new State({ ...baseConfig, phase: 'implement' });

      // Act
      const result = state.getProgressPercentage();

      // Assert
      expect(result).toBe(40);
    });

    it('should return 60% for heal phase', () => {
      // Arrange
      const state = new State({ ...baseConfig, phase: 'heal' });

      // Act
      const result = state.getProgressPercentage();

      // Assert
      expect(result).toBe(60);
    });

    it('should return 80% for deliver phase', () => {
      // Arrange
      const state = new State({ ...baseConfig, phase: 'deliver' });

      // Act
      const result = state.getProgressPercentage();

      // Assert
      expect(result).toBe(80);
    });

    it('should return 100% for complete phase', () => {
      // Arrange
      const state = new State({ ...baseConfig, phase: 'complete' });

      // Act
      const result = state.getProgressPercentage();

      // Assert
      expect(result).toBe(100);
    });
  });

  describe('getNextAllowedPhases', () => {
    it('should return [breakdown] for clarify', () => {
      // Arrange
      const state = new State({ ...baseConfig, phase: 'clarify' });

      // Act
      const result = state.getNextAllowedPhases();

      // Assert
      expect(result).toEqual(['breakdown']);
    });

    it('should return [heal, deliver] for implement', () => {
      // Arrange
      const state = new State({ ...baseConfig, phase: 'implement' });

      // Act
      const result = state.getNextAllowedPhases();

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toContain('heal');
      expect(result).toContain('deliver');
    });

    it('should return [] for complete', () => {
      // Arrange
      const state = new State({ ...baseConfig, phase: 'complete' });

      // Act
      const result = state.getNextAllowedPhases();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('toJSON', () => {
    it('should serialize all fields to plain object', () => {
      // Arrange
      const config: StateConfig = {
        phase: 'implement',
        currentTask: 'test.task',
        prd: { title: 'Test' },
        errors: [{ message: 'Error' }],
        startedAt: '2026-01-20T10:00:00.000Z',
        updatedAt: '2026-01-20T10:30:00.000Z',
      };
      const state = new State(config);

      // Act
      const result = state.toJSON();

      // Assert
      expect(result).toEqual(config);
    });

    it('should convert Date objects to ISO strings', () => {
      // Arrange
      const state = State.createNew();

      // Act
      const result = state.toJSON();

      // Assert
      expect(typeof result.startedAt).toBe('string');
      expect(typeof result.updatedAt).toBe('string');
      expect(result.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should return copy of errors array', () => {
      // Arrange
      const state = new State({
        ...baseConfig,
        errors: [{ message: 'Error' }],
      });

      // Act
      const result = state.toJSON();
      result.errors!.push({ message: 'Modified' });

      // Assert - original state should not be modified
      expect(state.errors).toHaveLength(1);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('fromJSON', () => {
    it('should create State from plain object', () => {
      // Arrange
      const config: StateConfig = {
        phase: 'implement',
        currentTask: 'test.task',
        startedAt: '2026-01-20T10:00:00.000Z',
        updatedAt: '2026-01-20T10:30:00.000Z',
      };

      // Act
      const state = State.fromJSON(config);

      // Assert
      expect(state).toBeInstanceOf(State);
      expect(state.phase).toBe('implement');
      expect(state.currentTask).toBe('test.task');
    });

    it('should round-trip through toJSON and fromJSON', () => {
      // Arrange
      const state1 = State.createNew();
      state1.transitionTo('breakdown');
      state1.setCurrentTask('test.task');
      state1.setPrd({ title: 'Test' });

      // Act
      const json = state1.toJSON();
      const state2 = State.fromJSON(json);

      // Assert
      expect(state2.phase).toBe('breakdown');
      expect(state2.currentTask).toBe('test.task');
      expect(state2.prd).toEqual({ title: 'Test' });
    });
  });

  describe('createNew', () => {
    it('should create state in clarify phase', () => {
      // Act
      const state = State.createNew();

      // Assert
      expect(state.phase).toBe('clarify');
    });

    it('should initialize with current timestamps', () => {
      // Arrange
      const before = new Date();

      // Act
      const state = State.createNew();

      // Assert
      const after = new Date();
      expect(state.startedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(state.startedAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(state.updatedAt.getTime()).toBe(state.startedAt.getTime());
    });
  });

  describe('workflow integration', () => {
    it('should support full workflow: clarify → breakdown → implement → deliver → complete', () => {
      // Arrange
      const state = State.createNew();

      // Act & Assert - clarify
      expect(state.phase).toBe('clarify');
      expect(state.getProgressPercentage()).toBe(0);

      // Act & Assert - breakdown
      state.transitionTo('breakdown');
      expect(state.phase).toBe('breakdown');
      expect(state.getProgressPercentage()).toBe(20);

      // Act & Assert - implement
      state.transitionTo('implement');
      expect(state.phase).toBe('implement');
      expect(state.getProgressPercentage()).toBe(40);

      // Act & Assert - deliver
      state.transitionTo('deliver');
      expect(state.phase).toBe('deliver');
      expect(state.getProgressPercentage()).toBe(80);

      // Act & Assert - complete
      state.transitionTo('complete');
      expect(state.phase).toBe('complete');
      expect(state.getProgressPercentage()).toBe(100);
      expect(state.isComplete()).toBe(true);
    });

    it('should support healing workflow: implement → heal → implement → deliver', () => {
      // Arrange
      const state = State.createNew();
      state.transitionTo('breakdown');
      state.transitionTo('implement');

      // Act & Assert - heal
      state.transitionTo('heal');
      expect(state.phase).toBe('heal');
      expect(state.isHealing()).toBe(true);

      // Act & Assert - back to implement
      state.transitionTo('implement');
      expect(state.phase).toBe('implement');

      // Act & Assert - deliver
      state.transitionTo('deliver');
      expect(state.phase).toBe('deliver');
    });
  });
});
