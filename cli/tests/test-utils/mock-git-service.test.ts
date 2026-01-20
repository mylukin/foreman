import { describe, it, expect, beforeEach } from 'vitest';
import { MockGitService } from '../../src/test-utils/mock-git-service';

describe('MockGitService', () => {
  let mockGit: MockGitService;

  beforeEach(() => {
    mockGit = new MockGitService();
  });

  describe('stash', () => {
    it('should track stash calls', async () => {
      // Act
      await mockGit.stash('WIP: feature');

      // Assert
      expect(mockGit.stashCalls).toHaveLength(1);
      expect(mockGit.stashCalls[0].message).toBe('WIP: feature');
    });

    it('should return default stash response', async () => {
      // Act
      const result = await mockGit.stash();

      // Assert
      expect(result).toBe('Saved working directory and index state');
    });

    it('should return custom stash response', async () => {
      // Arrange
      mockGit.stashResponse = 'Custom stash response';

      // Act
      const result = await mockGit.stash();

      // Assert
      expect(result).toBe('Custom stash response');
    });

    it('should throw error when configured', async () => {
      // Arrange
      mockGit.shouldThrowOnStash = true;

      // Act & Assert
      await expect(mockGit.stash()).rejects.toThrow('git stash failed');
    });

    it('should track stash calls without message', async () => {
      // Act
      await mockGit.stash();

      // Assert
      expect(mockGit.stashCalls).toHaveLength(1);
      expect(mockGit.stashCalls[0].message).toBeUndefined();
    });
  });

  describe('unstash', () => {
    it('should track unstash calls', async () => {
      // Act
      await mockGit.unstash();

      // Assert
      expect(mockGit.unstashCalls).toBe(1);
    });

    it('should return default unstash response', async () => {
      // Act
      const result = await mockGit.unstash();

      // Assert
      expect(result).toContain('On branch main');
    });

    it('should throw error when configured', async () => {
      // Arrange
      mockGit.shouldThrowOnUnstash = true;

      // Act & Assert
      await expect(mockGit.unstash()).rejects.toThrow('git stash pop failed');
    });

    it('should increment counter on multiple calls', async () => {
      // Act
      await mockGit.unstash();
      await mockGit.unstash();

      // Assert
      expect(mockGit.unstashCalls).toBe(2);
    });
  });

  describe('commit', () => {
    it('should track commit calls', async () => {
      // Act
      await mockGit.commit('feat: add new feature');

      // Assert
      expect(mockGit.commitCalls).toHaveLength(1);
      expect(mockGit.commitCalls[0].message).toBe('feat: add new feature');
    });

    it('should return default commit response', async () => {
      // Act
      const result = await mockGit.commit('test commit');

      // Assert
      expect(result).toBe('[main abc123] Test commit');
    });

    it('should throw error when configured', async () => {
      // Arrange
      mockGit.shouldThrowOnCommit = true;

      // Act & Assert
      await expect(mockGit.commit('test')).rejects.toThrow('git commit failed');
    });

    it('should track multiple commits', async () => {
      // Act
      await mockGit.commit('first commit');
      await mockGit.commit('second commit');

      // Assert
      expect(mockGit.commitCalls).toHaveLength(2);
      expect(mockGit.commitCalls[0].message).toBe('first commit');
      expect(mockGit.commitCalls[1].message).toBe('second commit');
    });
  });

  describe('push', () => {
    it('should track push calls with defaults', async () => {
      // Act
      await mockGit.push();

      // Assert
      expect(mockGit.pushCalls).toHaveLength(1);
      expect(mockGit.pushCalls[0].remote).toBeUndefined();
      expect(mockGit.pushCalls[0].branch).toBeUndefined();
    });

    it('should track push calls with remote and branch', async () => {
      // Act
      await mockGit.push('origin', 'main');

      // Assert
      expect(mockGit.pushCalls).toHaveLength(1);
      expect(mockGit.pushCalls[0].remote).toBe('origin');
      expect(mockGit.pushCalls[0].branch).toBe('main');
    });

    it('should return default push response', async () => {
      // Act
      const result = await mockGit.push();

      // Assert
      expect(result).toContain('github.com:test/repo.git');
    });

    it('should throw error when configured', async () => {
      // Arrange
      mockGit.shouldThrowOnPush = true;

      // Act & Assert
      await expect(mockGit.push()).rejects.toThrow('git push failed');
    });
  });

  describe('status', () => {
    it('should track status calls', async () => {
      // Act
      await mockGit.status();

      // Assert
      expect(mockGit.statusCalls).toBe(1);
    });

    it('should return default status response', async () => {
      // Act
      const result = await mockGit.status();

      // Assert
      expect(result).toContain('On branch main');
      expect(result).toContain('nothing to commit');
    });

    it('should throw error when configured', async () => {
      // Arrange
      mockGit.shouldThrowOnStatus = true;

      // Act & Assert
      await expect(mockGit.status()).rejects.toThrow('git status failed');
    });
  });

  describe('diff', () => {
    it('should track diff calls without options', async () => {
      // Act
      await mockGit.diff();

      // Assert
      expect(mockGit.diffCalls).toHaveLength(1);
      expect(mockGit.diffCalls[0].options).toBeUndefined();
    });

    it('should track diff calls with options', async () => {
      // Act
      await mockGit.diff('--staged');

      // Assert
      expect(mockGit.diffCalls).toHaveLength(1);
      expect(mockGit.diffCalls[0].options).toBe('--staged');
    });

    it('should return default diff response', async () => {
      // Act
      const result = await mockGit.diff();

      // Assert
      expect(result).toBe('');
    });

    it('should return custom diff response', async () => {
      // Arrange
      mockGit.diffResponse = 'diff --git a/file.txt b/file.txt\n...';

      // Act
      const result = await mockGit.diff();

      // Assert
      expect(result).toContain('diff --git');
    });

    it('should throw error when configured', async () => {
      // Arrange
      mockGit.shouldThrowOnDiff = true;

      // Act & Assert
      await expect(mockGit.diff()).rejects.toThrow('git diff failed');
    });
  });

  describe('log', () => {
    it('should track log calls without count', async () => {
      // Act
      await mockGit.log();

      // Assert
      expect(mockGit.logCalls).toHaveLength(1);
      expect(mockGit.logCalls[0].count).toBeUndefined();
    });

    it('should track log calls with count', async () => {
      // Act
      await mockGit.log(5);

      // Assert
      expect(mockGit.logCalls).toHaveLength(1);
      expect(mockGit.logCalls[0].count).toBe(5);
    });

    it('should return default log response', async () => {
      // Act
      const result = await mockGit.log();

      // Assert
      expect(result).toContain('commit abc123');
      expect(result).toContain('Initial commit');
    });

    it('should throw error when configured', async () => {
      // Arrange
      mockGit.shouldThrowOnLog = true;

      // Act & Assert
      await expect(mockGit.log()).rejects.toThrow('git log failed');
    });
  });

  describe('helper methods', () => {
    describe('reset', () => {
      it('should clear all call tracking', async () => {
        // Arrange
        await mockGit.stash();
        await mockGit.commit('test');
        await mockGit.push();

        // Act
        mockGit.reset();

        // Assert
        expect(mockGit.stashCalls).toHaveLength(0);
        expect(mockGit.commitCalls).toHaveLength(0);
        expect(mockGit.pushCalls).toHaveLength(0);
      });

      it('should reset error flags', () => {
        // Arrange
        mockGit.shouldThrowOnStash = true;
        mockGit.shouldThrowOnCommit = true;

        // Act
        mockGit.reset();

        // Assert
        expect(mockGit.shouldThrowOnStash).toBe(false);
        expect(mockGit.shouldThrowOnCommit).toBe(false);
      });

      it('should restore default responses', () => {
        // Arrange
        mockGit.stashResponse = 'custom';
        mockGit.commitResponse = 'custom';

        // Act
        mockGit.reset();

        // Assert
        expect(mockGit.stashResponse).toBe('Saved working directory and index state');
        expect(mockGit.commitResponse).toBe('[main abc123] Test commit');
      });
    });

    describe('getLastXCall methods', () => {
      it('should get last stash call', async () => {
        // Act
        await mockGit.stash('first');
        await mockGit.stash('second');

        // Assert
        expect(mockGit.getLastStashCall()?.message).toBe('second');
      });

      it('should get last commit call', async () => {
        // Act
        await mockGit.commit('first');
        await mockGit.commit('second');

        // Assert
        expect(mockGit.getLastCommitCall()?.message).toBe('second');
      });

      it('should get last push call', async () => {
        // Act
        await mockGit.push('origin', 'main');
        await mockGit.push('upstream', 'develop');

        // Assert
        const lastPush = mockGit.getLastPushCall();
        expect(lastPush?.remote).toBe('upstream');
        expect(lastPush?.branch).toBe('develop');
      });

      it('should return undefined when no calls', () => {
        // Assert
        expect(mockGit.getLastStashCall()).toBeUndefined();
        expect(mockGit.getLastCommitCall()).toBeUndefined();
        expect(mockGit.getLastPushCall()).toBeUndefined();
      });
    });

    describe('wasXCalled methods', () => {
      it('should detect stash was called', async () => {
        // Assert before
        expect(mockGit.wasStashCalled()).toBe(false);

        // Act
        await mockGit.stash();

        // Assert after
        expect(mockGit.wasStashCalled()).toBe(true);
      });

      it('should detect commit was called', async () => {
        // Assert before
        expect(mockGit.wasCommitCalled()).toBe(false);

        // Act
        await mockGit.commit('test');

        // Assert after
        expect(mockGit.wasCommitCalled()).toBe(true);
      });

      it('should detect push was called', async () => {
        // Assert before
        expect(mockGit.wasPushCalled()).toBe(false);

        // Act
        await mockGit.push();

        // Assert after
        expect(mockGit.wasPushCalled()).toBe(true);
      });

      it('should detect all operations', async () => {
        // Act
        await mockGit.stash();
        await mockGit.unstash();
        await mockGit.commit('test');
        await mockGit.push();
        await mockGit.status();
        await mockGit.diff();
        await mockGit.log();

        // Assert
        expect(mockGit.wasStashCalled()).toBe(true);
        expect(mockGit.wasUnstashCalled()).toBe(true);
        expect(mockGit.wasCommitCalled()).toBe(true);
        expect(mockGit.wasPushCalled()).toBe(true);
        expect(mockGit.wasStatusCalled()).toBe(true);
        expect(mockGit.wasDiffCalled()).toBe(true);
        expect(mockGit.wasLogCalled()).toBe(true);
      });
    });
  });

  describe('error codes', () => {
    it('should set correct error code for stash', async () => {
      // Arrange
      mockGit.shouldThrowOnStash = true;

      // Act & Assert
      try {
        await mockGit.stash();
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.code).toBe('EGITSTASH');
      }
    });

    it('should set correct error code for commit', async () => {
      // Arrange
      mockGit.shouldThrowOnCommit = true;

      // Act & Assert
      try {
        await mockGit.commit('test');
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.code).toBe('EGITCOMMIT');
      }
    });

    it('should set correct error code for push', async () => {
      // Arrange
      mockGit.shouldThrowOnPush = true;

      // Act & Assert
      try {
        await mockGit.push();
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.code).toBe('EGITPUSH');
      }
    });
  });
});
