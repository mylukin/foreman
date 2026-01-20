import { describe, it, expect, beforeEach } from 'vitest';
import * as path from 'path';
import { FileSystemStateRepository } from '../../src/repositories/state-repository.service';
import { State, StateUpdate } from '../../src/repositories/state-repository';
import { MockFileSystem } from '../../src/test-utils/mock-file-system';

describe('FileSystemStateRepository', () => {
  let repository: FileSystemStateRepository;
  let mockFileSystem: MockFileSystem;
  const workspaceDir = '/test/workspace';
  const stateFile = path.join(workspaceDir, '.ralph-dev', 'state.json');

  beforeEach(() => {
    mockFileSystem = new MockFileSystem();
    repository = new FileSystemStateRepository(mockFileSystem, workspaceDir);
  });

  describe('get', () => {
    it('should return null when state file does not exist', async () => {
      // Arrange - no state file

      // Act
      const result = await repository.get();

      // Assert
      expect(result).toBeNull();
    });

    it('should return state when file exists', async () => {
      // Arrange
      const stateData = {
        phase: 'implement',
        currentTask: 'test.task',
        startedAt: '2026-01-20T00:00:00.000Z',
        updatedAt: '2026-01-20T00:10:00.000Z',
      };
      mockFileSystem.setFile(stateFile, JSON.stringify(stateData, null, 2));

      // Act
      const result = await repository.get();

      // Assert
      expect(result).toBeDefined();
      expect(result?.phase).toBe('implement');
      expect(result?.currentTask).toBe('test.task');
    });

    it('should parse state with PRD', async () => {
      // Arrange
      const stateData = {
        phase: 'breakdown',
        prd: {
          title: 'Test PRD',
          requirements: ['req1', 'req2'],
        },
        startedAt: '2026-01-20T00:00:00.000Z',
        updatedAt: '2026-01-20T00:10:00.000Z',
      };
      mockFileSystem.setFile(stateFile, JSON.stringify(stateData, null, 2));

      // Act
      const result = await repository.get();

      // Assert
      expect(result?.prd).toEqual({
        title: 'Test PRD',
        requirements: ['req1', 'req2'],
      });
    });

    it('should parse state with errors', async () => {
      // Arrange
      const stateData = {
        phase: 'heal',
        errors: [
          { message: 'Error 1', code: 'ERR1' },
          { message: 'Error 2', code: 'ERR2' },
        ],
        startedAt: '2026-01-20T00:00:00.000Z',
        updatedAt: '2026-01-20T00:10:00.000Z',
      };
      mockFileSystem.setFile(stateFile, JSON.stringify(stateData, null, 2));

      // Act
      const result = await repository.get();

      // Assert
      expect(result?.errors).toHaveLength(2);
    });
  });

  describe('set', () => {
    it('should create state file with all fields', async () => {
      // Arrange
      const stateInput = {
        phase: 'clarify' as const,
        currentTask: 'test.task',
        startedAt: '2026-01-20T00:00:00.000Z',
      };

      // Act
      await repository.set(stateInput);

      // Assert
      const content = mockFileSystem.getFile(stateFile) as string;
      const savedState = JSON.parse(content);
      expect(savedState.phase).toBe('clarify');
      expect(savedState.currentTask).toBe('test.task');
      expect(savedState.startedAt).toBe('2026-01-20T00:00:00.000Z');
      expect(savedState.updatedAt).toBeDefined();
    });

    it('should create directory if it does not exist', async () => {
      // Arrange
      const stateInput = {
        phase: 'implement' as const,
        startedAt: '2026-01-20T00:00:00.000Z',
      };

      // Act
      await repository.set(stateInput);

      // Assert
      expect(mockFileSystem.hasDirectory(path.join(workspaceDir, '.ralph-dev'))).toBe(true);
    });

    it('should set state with PRD', async () => {
      // Arrange
      const stateInput = {
        phase: 'breakdown' as const,
        prd: {
          title: 'Test PRD',
          userStories: ['story1', 'story2'],
        },
        startedAt: '2026-01-20T00:00:00.000Z',
      };

      // Act
      await repository.set(stateInput);

      // Assert
      const content = mockFileSystem.getFile(stateFile) as string;
      const savedState = JSON.parse(content);
      expect(savedState.prd).toEqual({
        title: 'Test PRD',
        userStories: ['story1', 'story2'],
      });
    });

    it('should set state with errors', async () => {
      // Arrange
      const stateInput = {
        phase: 'heal' as const,
        errors: [{ message: 'Test error', code: 'TEST' }],
        startedAt: '2026-01-20T00:00:00.000Z',
      };

      // Act
      await repository.set(stateInput);

      // Assert
      const content = mockFileSystem.getFile(stateFile) as string;
      const savedState = JSON.parse(content);
      expect(savedState.errors).toHaveLength(1);
      expect(savedState.errors[0]).toEqual({
        message: 'Test error',
        code: 'TEST',
      });
    });

    it('should format JSON with 2-space indentation', async () => {
      // Arrange
      const stateInput = {
        phase: 'implement' as const,
        startedAt: '2026-01-20T00:00:00.000Z',
      };

      // Act
      await repository.set(stateInput);

      // Assert
      const content = mockFileSystem.getFile(stateFile) as string;
      expect(content).toContain('\n  "phase"');
      expect(content).toContain('\n  "startedAt"');
    });
  });

  describe('update', () => {
    beforeEach(async () => {
      // Create initial state
      await repository.set({
        phase: 'implement',
        currentTask: 'original.task',
        startedAt: '2026-01-20T00:00:00.000Z',
      });
    });

    it('should update phase', async () => {
      // Arrange
      const updates: StateUpdate = {
        phase: 'deliver',
      };

      // Act
      await repository.update(updates);

      // Assert
      const state = await repository.get();
      expect(state?.phase).toBe('deliver');
      expect(state?.currentTask).toBe('original.task'); // unchanged
    });

    it('should update current task', async () => {
      // Arrange
      const updates: StateUpdate = {
        currentTask: 'new.task',
      };

      // Act
      await repository.update(updates);

      // Assert
      const state = await repository.get();
      expect(state?.currentTask).toBe('new.task');
      expect(state?.phase).toBe('implement'); // unchanged
    });

    it('should update PRD', async () => {
      // Arrange
      const updates: StateUpdate = {
        prd: {
          title: 'Updated PRD',
          version: 2,
        },
      };

      // Act
      await repository.update(updates);

      // Assert
      const state = await repository.get();
      expect(state?.prd).toEqual({
        title: 'Updated PRD',
        version: 2,
      });
    });

    it('should add error to existing errors', async () => {
      // Arrange
      await repository.update({
        addError: { message: 'Error 1', code: 'ERR1' },
      });

      // Act
      await repository.update({
        addError: { message: 'Error 2', code: 'ERR2' },
      });

      // Assert
      const state = await repository.get();
      expect(state?.errors).toHaveLength(2);
      expect(state?.errors?.[0]).toEqual({ message: 'Error 1', code: 'ERR1' });
      expect(state?.errors?.[1]).toEqual({ message: 'Error 2', code: 'ERR2' });
    });

    it('should initialize errors array if not present', async () => {
      // Arrange - state has no errors initially
      const updates: StateUpdate = {
        addError: { message: 'First error', code: 'ERR1' },
      };

      // Act
      await repository.update(updates);

      // Assert
      const state = await repository.get();
      expect(state?.errors).toHaveLength(1);
      expect(state?.errors?.[0]).toEqual({
        message: 'First error',
        code: 'ERR1',
      });
    });

    it('should update multiple fields at once', async () => {
      // Arrange
      const updates: StateUpdate = {
        phase: 'heal',
        currentTask: 'new.task',
        prd: { updated: true },
      };

      // Act
      await repository.update(updates);

      // Assert
      const state = await repository.get();
      expect(state?.phase).toBe('heal');
      expect(state?.currentTask).toBe('new.task');
      expect(state?.prd).toEqual({ updated: true });
    });

    it('should update timestamp on every update', async () => {
      // Arrange
      const stateBefore = await repository.get();
      const timestampBefore = stateBefore?.updatedAt;

      // Wait a tick to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Act
      await repository.update({ phase: 'deliver' });

      // Assert
      const stateAfter = await repository.get();
      expect(stateAfter?.updatedAt).not.toBe(timestampBefore);
    });

    it('should throw error when updating non-existent state', async () => {
      // Arrange
      await repository.clear();
      const updates: StateUpdate = {
        phase: 'deliver',
      };

      // Act & Assert
      await expect(repository.update(updates)).rejects.toThrow(
        'State not found. Use set() to initialize state.'
      );
    });
  });

  describe('clear', () => {
    it('should delete state file when it exists', async () => {
      // Arrange
      await repository.set({
        phase: 'implement',
        startedAt: '2026-01-20T00:00:00.000Z',
      });
      expect(mockFileSystem.hasFile(stateFile)).toBe(true);

      // Act
      await repository.clear();

      // Assert
      expect(mockFileSystem.hasFile(stateFile)).toBe(false);
    });

    it('should not throw error when clearing non-existent state', async () => {
      // Arrange - no state file

      // Act & Assert
      await expect(repository.clear()).resolves.toBeUndefined();
    });

    it('should make get return null after clear', async () => {
      // Arrange
      await repository.set({
        phase: 'implement',
        startedAt: '2026-01-20T00:00:00.000Z',
      });

      // Act
      await repository.clear();

      // Assert
      const state = await repository.get();
      expect(state).toBeNull();
    });
  });

  describe('exists', () => {
    it('should return false when state does not exist', async () => {
      // Arrange - no state file

      // Act
      const result = await repository.exists();

      // Assert
      expect(result).toBe(false);
    });

    it('should return true when state exists', async () => {
      // Arrange
      await repository.set({
        phase: 'implement',
        startedAt: '2026-01-20T00:00:00.000Z',
      });

      // Act
      const result = await repository.exists();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false after clear', async () => {
      // Arrange
      await repository.set({
        phase: 'implement',
        startedAt: '2026-01-20T00:00:00.000Z',
      });

      // Act
      await repository.clear();

      // Assert
      const result = await repository.exists();
      expect(result).toBe(false);
    });
  });
});
