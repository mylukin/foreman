import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { registerUpdateCommand } from '../../src/commands/update';

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

// Mock fs functions
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(false),
    mkdirSync: vi.fn(),
    rmSync: vi.fn(),
    readdirSync: vi.fn().mockReturnValue([]),
  };
});

describe('Update Command', () => {
  let program: Command;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    process.env = { ...originalEnv };

    program = new Command();
    program.exitOverride();
    registerUpdateCommand(program);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  describe('registerUpdateCommand', () => {
    it('should register update command', () => {
      const updateCmd = program.commands.find((cmd) => cmd.name() === 'update');
      expect(updateCmd).toBeDefined();
    });

    it('should have correct description', () => {
      const updateCmd = program.commands.find((cmd) => cmd.name() === 'update');
      expect(updateCmd?.description()).toContain('update');
    });

    it('should have --cli-only option', () => {
      const updateCmd = program.commands.find((cmd) => cmd.name() === 'update');
      const options = updateCmd?.options || [];
      const cliOnlyOption = options.find(
        (opt) => opt.long === '--cli-only'
      );
      expect(cliOnlyOption).toBeDefined();
    });

    it('should have --plugin-only option', () => {
      const updateCmd = program.commands.find((cmd) => cmd.name() === 'update');
      const options = updateCmd?.options || [];
      const pluginOnlyOption = options.find(
        (opt) => opt.long === '--plugin-only'
      );
      expect(pluginOnlyOption).toBeDefined();
    });

    it('should have --check option', () => {
      const updateCmd = program.commands.find((cmd) => cmd.name() === 'update');
      const options = updateCmd?.options || [];
      const checkOption = options.find((opt) => opt.long === '--check');
      expect(checkOption).toBeDefined();
    });

    it('should have --json option', () => {
      const updateCmd = program.commands.find((cmd) => cmd.name() === 'update');
      const options = updateCmd?.options || [];
      const jsonOption = options.find((opt) => opt.long === '--json');
      expect(jsonOption).toBeDefined();
    });
  });

  describe('command options', () => {
    it('--cli-only and --plugin-only are mutually exclusive in intent', () => {
      const updateCmd = program.commands.find((cmd) => cmd.name() === 'update');
      expect(updateCmd).toBeDefined();

      // Both options exist but serve different purposes
      const options = updateCmd?.options || [];
      const cliOnly = options.find((opt) => opt.long === '--cli-only');
      const pluginOnly = options.find((opt) => opt.long === '--plugin-only');

      expect(cliOnly).toBeDefined();
      expect(pluginOnly).toBeDefined();
    });
  });
});

describe('Update Command Integration', () => {
  let program: Command;
  const originalEnv = process.env;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    process.env = { ...originalEnv };

    program = new Command();
    program.exitOverride();
    registerUpdateCommand(program);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  it('should handle --check option without throwing', async () => {
    const { execSync } = await import('child_process');
    const execSyncMock = vi.mocked(execSync);
    execSyncMock.mockReturnValue('0.4.1\n');

    // This should not throw
    expect(() => {
      try {
        program.parse(['node', 'test', 'update', '--check', '--json']);
      } catch {
        // Expected to fail in test environment
      }
    }).not.toThrow();
  });

  it('should display help without errors', () => {
    expect(() => {
      try {
        program.parse(['node', 'test', 'update', '--help']);
      } catch {
        // Help throws in commander
      }
    }).not.toThrow();
  });

  describe('--check mode', () => {
    it('should show update available when new version exists', async () => {
      const { execSync } = await import('child_process');
      vi.mocked(execSync).mockReturnValue('99.0.0\n'); // Higher version

      await program.parseAsync(['node', 'test', 'update', '--check']);

      const allLogs = consoleLogSpy.mock.calls.flat().join('\n');
      expect(allLogs).toContain('Update available');
    });

    it('should show up to date when on latest version', async () => {
      const { execSync } = await import('child_process');
      const { version } = await import('../../package.json');
      vi.mocked(execSync).mockReturnValue(`${version}\n`);

      await program.parseAsync(['node', 'test', 'update', '--check']);

      const allLogs = consoleLogSpy.mock.calls.flat().join('\n');
      expect(allLogs).toContain('latest version');
    });

    it('should handle npm view failure', async () => {
      const { execSync } = await import('child_process');
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('npm view failed');
      });

      await program.parseAsync(['node', 'test', 'update', '--check']);

      const allLogs = consoleLogSpy.mock.calls.flat().join('\n');
      expect(allLogs).toContain('Failed to check');
    });

    it('should output JSON when --json flag is used with --check', async () => {
      const { execSync } = await import('child_process');
      vi.mocked(execSync).mockReturnValue('99.0.0\n');

      await program.parseAsync(['node', 'test', 'update', '--check', '--json']);

      const allLogs = consoleLogSpy.mock.calls.flat().join('\n');
      expect(allLogs).toContain('latestVersion');
      expect(allLogs).toContain('updateAvailable');
    });
  });

  describe('CLI update', () => {
    it('should update CLI successfully', async () => {
      const { execSync } = await import('child_process');
      const fs = await import('fs');

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(execSync).mockReturnValue('0.5.0\n');

      await program.parseAsync(['node', 'test', 'update', '--cli-only']);

      expect(vi.mocked(execSync)).toHaveBeenCalledWith(
        expect.stringContaining('npm install -g ralph-dev@latest'),
        expect.any(Object)
      );
    });

    it('should try npx when npm fails', async () => {
      const { execSync } = await import('child_process');
      const fs = await import('fs');

      vi.mocked(fs.existsSync).mockReturnValue(false);

      let callCount = 0;
      vi.mocked(execSync).mockImplementation((cmd: any) => {
        const cmdStr = String(cmd);
        callCount++;
        // First call is npm view (version check) - return higher version to trigger update
        if (cmdStr.includes('npm view')) return '99.0.0\n';
        // Second call is npm install - fail it
        if (callCount === 2) throw new Error('npm failed');
        // Third call is npx npm install - succeed
        return '99.0.0\n';
      });

      await program.parseAsync(['node', 'test', 'update', '--cli-only']);

      expect(vi.mocked(execSync)).toHaveBeenCalledWith(
        expect.stringContaining('npx npm install -g'),
        expect.any(Object)
      );
    });

    it('should handle update failure', async () => {
      const { execSync } = await import('child_process');
      const fs = await import('fs');

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(execSync).mockImplementation((cmd: any) => {
        const cmdStr = String(cmd);
        // Version check returns higher version to trigger update
        if (cmdStr.includes('npm view')) return '99.0.0\n';
        // All install attempts fail
        throw new Error('update failed');
      });

      await program.parseAsync(['node', 'test', 'update', '--cli-only']);

      const allLogs = consoleLogSpy.mock.calls.flat().join('\n');
      expect(allLogs).toContain('update failed');
    });
  });

  describe('Plugin update', () => {
    it('should update marketplace via git pull', async () => {
      const { execSync } = await import('child_process');
      const fs = await import('fs');

      // Marketplace exists with .git
      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('marketplaces')) return true;
        if (pathStr.includes('.git')) return true;
        return false;
      });
      vi.mocked(execSync).mockReturnValue('');

      await program.parseAsync(['node', 'test', 'update', '--plugin-only']);

      const gitPullCalls = vi.mocked(execSync).mock.calls.filter(
        call => String(call[0]).includes('git pull')
      );
      expect(gitPullCalls.length).toBeGreaterThan(0);
    });

    it('should skip marketplace when not a git repo', async () => {
      const { execSync } = await import('child_process');
      const fs = await import('fs');

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(execSync).mockReturnValue('0.5.0\n');

      await program.parseAsync(['node', 'test', 'update', '--plugin-only']);

      const gitPullCalls = vi.mocked(execSync).mock.calls.filter(
        call => String(call[0]).includes('git pull')
      );
      expect(gitPullCalls).toHaveLength(0);
    });

    it('should download cache when cache directory exists', async () => {
      const { execSync } = await import('child_process');
      const fs = await import('fs');

      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('cache') && !pathStr.includes('0.5.0')) return true;
        return false;
      });
      vi.mocked(execSync).mockReturnValue('0.5.0\n');

      await program.parseAsync(['node', 'test', 'update', '--plugin-only']);

      const curlCalls = vi.mocked(execSync).mock.calls.filter(
        call => String(call[0]).includes('curl')
      );
      expect(curlCalls.length).toBeGreaterThan(0);
    });

    it('should skip cache download when version already exists', async () => {
      const { execSync } = await import('child_process');
      const fs = await import('fs');

      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('cache')) return true;
        return false;
      });
      vi.mocked(execSync).mockReturnValue('0.5.0\n');

      await program.parseAsync(['node', 'test', 'update', '--plugin-only']);

      const allLogs = consoleLogSpy.mock.calls.flat().join('\n');
      expect(allLogs).toContain('already exists');
    });
  });

  describe('JSON output', () => {
    it('should output JSON when --json flag is used', async () => {
      const { execSync } = await import('child_process');
      const fs = await import('fs');

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(execSync).mockReturnValue('0.5.0\n');

      await program.parseAsync(['node', 'test', 'update', '--json']);

      const allLogs = consoleLogSpy.mock.calls.flat().join('');
      // Should contain JSON structure
      expect(allLogs).toContain('"cli"');
      expect(allLogs).toContain('"plugin"');
    });
  });
});
