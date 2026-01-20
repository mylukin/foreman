import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitService } from '../../src/infrastructure/git-service.service';
import * as childProcess from 'child_process';
import * as retry from '../../src/core/retry';
import { promisify } from 'util';

// Mock child_process.exec
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

describe('GitService', () => {
  let gitService: GitService;
  let execMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    gitService = new GitService();
    execMock = vi.mocked(childProcess.exec);
    execMock.mockClear();
  });

  describe('stash', () => {
    it('should stash changes with default message', async () => {
      // Arrange
      const expectedOutput = 'Saved working directory and index state WIP on main: abc123 commit message';
      execMock.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: expectedOutput, stderr: '' });
      });

      // Act
      const result = await gitService.stash();

      // Assert
      expect(execMock).toHaveBeenCalledWith(
        'git stash',
        expect.any(Function)
      );
      expect(result).toBe(expectedOutput);
    });

    it('should stash changes with custom message', async () => {
      // Arrange
      const message = 'WIP: implementing feature';
      const expectedOutput = 'Saved working directory and index state On main: WIP: implementing feature';
      execMock.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: expectedOutput, stderr: '' });
      });

      // Act
      const result = await gitService.stash(message);

      // Assert
      expect(execMock).toHaveBeenCalledWith(
        `git stash push -m "${message}"`,
        expect.any(Function)
      );
      expect(result).toBe(expectedOutput);
    });

    it('should wrap stash operation with retry', async () => {
      // Arrange
      const withRetrySpy = vi.spyOn(retry, 'withRetry');
      execMock.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: 'stashed', stderr: '' });
      });

      // Act
      await gitService.stash();

      // Assert
      expect(withRetrySpy).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'],
        })
      );

      withRetrySpy.mockRestore();
    });
  });

  describe('unstash', () => {
    it('should pop stashed changes', async () => {
      // Arrange
      const expectedOutput = 'On main: WIP\nChanges applied successfully';
      execMock.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: expectedOutput, stderr: '' });
      });

      // Act
      const result = await gitService.unstash();

      // Assert
      expect(execMock).toHaveBeenCalledWith(
        'git stash pop',
        expect.any(Function)
      );
      expect(result).toBe(expectedOutput);
    });

    it('should wrap unstash operation with retry', async () => {
      // Arrange
      const withRetrySpy = vi.spyOn(retry, 'withRetry');
      execMock.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: 'unstashed', stderr: '' });
      });

      // Act
      await gitService.unstash();

      // Assert
      expect(withRetrySpy).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'],
        })
      );

      withRetrySpy.mockRestore();
    });
  });

  describe('commit', () => {
    it('should commit with message', async () => {
      // Arrange
      const message = 'feat: add new feature';
      const expectedOutput = '[main abc123] feat: add new feature\n 1 file changed, 10 insertions(+)';
      execMock.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: expectedOutput, stderr: '' });
      });

      // Act
      const result = await gitService.commit(message);

      // Assert
      expect(execMock).toHaveBeenCalledWith(
        `git commit -m "${message}"`,
        expect.any(Function)
      );
      expect(result).toBe(expectedOutput);
    });

    it('should handle commit messages with quotes', async () => {
      // Arrange
      const message = 'fix: handle "quoted" values';
      const escapedMessage = message.replace(/"/g, '\\"');
      execMock.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: 'committed', stderr: '' });
      });

      // Act
      await gitService.commit(message);

      // Assert
      expect(execMock).toHaveBeenCalledWith(
        `git commit -m "${escapedMessage}"`,
        expect.any(Function)
      );
    });

    it('should wrap commit operation with retry', async () => {
      // Arrange
      const withRetrySpy = vi.spyOn(retry, 'withRetry');
      execMock.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: 'committed', stderr: '' });
      });

      // Act
      await gitService.commit('test commit');

      // Assert
      expect(withRetrySpy).toHaveBeenCalled();
      withRetrySpy.mockRestore();
    });
  });

  describe('push', () => {
    it('should push to default remote and current branch', async () => {
      // Arrange
      const expectedOutput = 'To github.com:user/repo.git\n   abc123..def456  main -> main';
      execMock.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: expectedOutput, stderr: '' });
      });

      // Act
      const result = await gitService.push();

      // Assert
      expect(execMock).toHaveBeenCalledWith(
        'git push',
        expect.any(Function)
      );
      expect(result).toBe(expectedOutput);
    });

    it('should push to specified remote', async () => {
      // Arrange
      const remote = 'origin';
      execMock.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: 'pushed', stderr: '' });
      });

      // Act
      await gitService.push(remote);

      // Assert
      expect(execMock).toHaveBeenCalledWith(
        `git push ${remote}`,
        expect.any(Function)
      );
    });

    it('should push to specified remote and branch', async () => {
      // Arrange
      const remote = 'origin';
      const branch = 'feature/new-feature';
      execMock.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: 'pushed', stderr: '' });
      });

      // Act
      await gitService.push(remote, branch);

      // Assert
      expect(execMock).toHaveBeenCalledWith(
        `git push ${remote} ${branch}`,
        expect.any(Function)
      );
    });

    it('should wrap push operation with retry', async () => {
      // Arrange
      const withRetrySpy = vi.spyOn(retry, 'withRetry');
      execMock.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: 'pushed', stderr: '' });
      });

      // Act
      await gitService.push();

      // Assert
      expect(withRetrySpy).toHaveBeenCalled();
      withRetrySpy.mockRestore();
    });
  });

  describe('status', () => {
    it('should get git status', async () => {
      // Arrange
      const expectedOutput = 'On branch main\nYour branch is up to date with \'origin/main\'.\n\nnothing to commit, working tree clean';
      execMock.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: expectedOutput, stderr: '' });
      });

      // Act
      const result = await gitService.status();

      // Assert
      expect(execMock).toHaveBeenCalledWith(
        'git status',
        expect.any(Function)
      );
      expect(result).toBe(expectedOutput);
    });

    it('should wrap status operation with retry', async () => {
      // Arrange
      const withRetrySpy = vi.spyOn(retry, 'withRetry');
      execMock.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: 'status output', stderr: '' });
      });

      // Act
      await gitService.status();

      // Assert
      expect(withRetrySpy).toHaveBeenCalled();
      withRetrySpy.mockRestore();
    });
  });

  describe('diff', () => {
    it('should get git diff without options', async () => {
      // Arrange
      const expectedOutput = 'diff --git a/file.txt b/file.txt\nindex abc123..def456 100644\n--- a/file.txt\n+++ b/file.txt\n@@ -1,3 +1,4 @@\n line1\n+line2';
      execMock.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: expectedOutput, stderr: '' });
      });

      // Act
      const result = await gitService.diff();

      // Assert
      expect(execMock).toHaveBeenCalledWith(
        'git diff',
        expect.any(Function)
      );
      expect(result).toBe(expectedOutput);
    });

    it('should get git diff with options', async () => {
      // Arrange
      const options = '--staged';
      execMock.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: 'diff output', stderr: '' });
      });

      // Act
      await gitService.diff(options);

      // Assert
      expect(execMock).toHaveBeenCalledWith(
        `git diff ${options}`,
        expect.any(Function)
      );
    });

    it('should wrap diff operation with retry', async () => {
      // Arrange
      const withRetrySpy = vi.spyOn(retry, 'withRetry');
      execMock.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: 'diff output', stderr: '' });
      });

      // Act
      await gitService.diff();

      // Assert
      expect(withRetrySpy).toHaveBeenCalled();
      withRetrySpy.mockRestore();
    });
  });

  describe('log', () => {
    it('should get git log with default count of 10', async () => {
      // Arrange
      const expectedOutput = 'commit abc123\nAuthor: User <user@example.com>\nDate:   Mon Jan 20 10:00:00 2026\n\n    commit message';
      execMock.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: expectedOutput, stderr: '' });
      });

      // Act
      const result = await gitService.log();

      // Assert
      expect(execMock).toHaveBeenCalledWith(
        'git log -10',
        expect.any(Function)
      );
      expect(result).toBe(expectedOutput);
    });

    it('should get git log with specified count', async () => {
      // Arrange
      const count = 5;
      execMock.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: 'log output', stderr: '' });
      });

      // Act
      await gitService.log(count);

      // Assert
      expect(execMock).toHaveBeenCalledWith(
        `git log -${count}`,
        expect.any(Function)
      );
    });

    it('should wrap log operation with retry', async () => {
      // Arrange
      const withRetrySpy = vi.spyOn(retry, 'withRetry');
      execMock.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: 'log output', stderr: '' });
      });

      // Act
      await gitService.log();

      // Assert
      expect(withRetrySpy).toHaveBeenCalled();
      withRetrySpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should propagate errors from git commands', async () => {
      // Arrange
      const errorMessage = 'fatal: not a git repository';
      execMock.mockImplementation((_cmd, callback: any) => {
        callback(new Error(errorMessage), null);
      });

      // Act & Assert
      await expect(gitService.status()).rejects.toThrow(errorMessage);
    });

    it('should retry on transient errors', async () => {
      // Arrange
      let attemptCount = 0;
      execMock.mockImplementation((_cmd, callback: any) => {
        attemptCount++;
        if (attemptCount < 3) {
          const error: any = new Error('Connection timeout');
          error.code = 'ETIMEDOUT';
          callback(error, null);
        } else {
          callback(null, { stdout: 'success', stderr: '' });
        }
      });

      // Act
      const result = await gitService.status();

      // Assert
      expect(result).toBe('success');
      expect(attemptCount).toBe(3);
    });

    it('should handle stderr output', async () => {
      // Arrange
      const stdoutOutput = 'main branch output';
      const stderrOutput = 'warning: some warning message';
      execMock.mockImplementation((_cmd, callback: any) => {
        callback(null, { stdout: stdoutOutput, stderr: stderrOutput });
      });

      // Act
      const result = await gitService.status();

      // Assert
      // Should return stdout even if stderr has content
      expect(result).toBe(stdoutOutput);
    });
  });
});
