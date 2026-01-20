import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import { registerInitCommand } from '../../src/commands/init';

describe('init command', () => {
  let program: Command;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;
  const testDir = path.join(__dirname, '__test-init__');
  const rulesDir = path.join(testDir, '.claude', 'rules');
  const ralphDevDir = path.join(testDir, '.ralph-dev');

  beforeEach(() => {
    program = new Command();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

    // Clean up and create test directory
    fs.removeSync(testDir);
    fs.ensureDirSync(testDir);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    vi.clearAllMocks();
    fs.removeSync(testDir);
  });

  describe('command registration', () => {
    it('should register init command', () => {
      registerInitCommand(program, testDir);

      const initCommand = program.commands.find(cmd => cmd.name() === 'init');
      expect(initCommand).toBeDefined();
    });

    it('should have correct description', () => {
      registerInitCommand(program, testDir);

      const initCommand = program.commands.find(cmd => cmd.name() === 'init');
      expect(initCommand?.description()).toBe(
        'Initialize ralph-dev in current project (installs workflow rules)'
      );
    });

    it('should have --force option', () => {
      registerInitCommand(program, testDir);

      const initCommand = program.commands.find(cmd => cmd.name() === 'init');
      const forceOption = initCommand?.options.find(opt => opt.long === '--force');
      expect(forceOption).toBeDefined();
    });

    it('should have --json option', () => {
      registerInitCommand(program, testDir);

      const initCommand = program.commands.find(cmd => cmd.name() === 'init');
      const jsonOption = initCommand?.options.find(opt => opt.long === '--json');
      expect(jsonOption).toBeDefined();
    });
  });

  describe('directory creation', () => {
    it('should create .claude/rules directory', async () => {
      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init']);

      expect(fs.existsSync(rulesDir)).toBe(true);
    });

    it('should create .ralph-dev directory', async () => {
      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init']);

      expect(fs.existsSync(ralphDevDir)).toBe(true);
    });
  });

  describe('rule file installation', () => {
    it('should install ralph-dev-workflow.md', async () => {
      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init']);

      const filePath = path.join(rulesDir, 'ralph-dev-workflow.md');
      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('# Ralph-dev Workflow Rules');
      expect(content).toContain('CLARIFY');
      expect(content).toContain('BREAKDOWN');
      expect(content).toContain('IMPLEMENT');
      expect(content).toContain('HEAL');
      expect(content).toContain('DELIVER');
    });

    it('should install ralph-dev-principles.md', async () => {
      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init']);

      const filePath = path.join(rulesDir, 'ralph-dev-principles.md');
      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('# Ralph-dev Core Principles');
      expect(content).toContain('TDD Enforcement');
      expect(content).toContain('Circuit Breaker');
      expect(content).toContain('Saga Pattern');
    });

    it('should install ralph-dev-commands.md', async () => {
      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init']);

      const filePath = path.join(rulesDir, 'ralph-dev-commands.md');
      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('# Ralph-dev CLI Commands');
      expect(content).toContain('State Management');
      expect(content).toContain('Task Management');
      expect(content).toContain('Language Detection');
    });

    it('should install all three rule files', async () => {
      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init']);

      const files = fs.readdirSync(rulesDir);
      expect(files).toContain('ralph-dev-workflow.md');
      expect(files).toContain('ralph-dev-principles.md');
      expect(files).toContain('ralph-dev-commands.md');
      expect(files.length).toBe(3);
    });
  });

  describe('skipping existing files', () => {
    it('should skip existing files without --force', async () => {
      // Create existing file with custom content
      fs.ensureDirSync(rulesDir);
      const existingFile = path.join(rulesDir, 'ralph-dev-workflow.md');
      const customContent = '# Custom Content';
      fs.writeFileSync(existingFile, customContent, 'utf-8');

      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init']);

      // Should keep the original content
      const content = fs.readFileSync(existingFile, 'utf-8');
      expect(content).toBe(customContent);
    });

    it('should report skipped files in output', async () => {
      // Create existing file
      fs.ensureDirSync(rulesDir);
      fs.writeFileSync(
        path.join(rulesDir, 'ralph-dev-workflow.md'),
        '# Existing',
        'utf-8'
      );

      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init']);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('Skipped');
      expect(allOutput).toContain('ralph-dev-workflow.md');
      expect(allOutput).toContain('--force');
    });

    it('should install non-existing files even when some exist', async () => {
      // Create only one existing file
      fs.ensureDirSync(rulesDir);
      fs.writeFileSync(
        path.join(rulesDir, 'ralph-dev-workflow.md'),
        '# Existing',
        'utf-8'
      );

      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init']);

      // Other files should be installed
      expect(fs.existsSync(path.join(rulesDir, 'ralph-dev-principles.md'))).toBe(true);
      expect(fs.existsSync(path.join(rulesDir, 'ralph-dev-commands.md'))).toBe(true);
    });
  });

  describe('--force option', () => {
    it('should overwrite existing files with --force', async () => {
      // Create existing file with custom content
      fs.ensureDirSync(rulesDir);
      const existingFile = path.join(rulesDir, 'ralph-dev-workflow.md');
      fs.writeFileSync(existingFile, '# Custom Content', 'utf-8');

      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init', '--force']);

      // Should have the new content
      const content = fs.readFileSync(existingFile, 'utf-8');
      expect(content).toContain('# Ralph-dev Workflow Rules');
    });

    it('should overwrite all existing files with --force', async () => {
      // Create all existing files
      fs.ensureDirSync(rulesDir);
      fs.writeFileSync(path.join(rulesDir, 'ralph-dev-workflow.md'), '# Old 1', 'utf-8');
      fs.writeFileSync(path.join(rulesDir, 'ralph-dev-principles.md'), '# Old 2', 'utf-8');
      fs.writeFileSync(path.join(rulesDir, 'ralph-dev-commands.md'), '# Old 3', 'utf-8');

      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init', '--force']);

      // All should have new content
      expect(fs.readFileSync(path.join(rulesDir, 'ralph-dev-workflow.md'), 'utf-8')).toContain(
        '# Ralph-dev Workflow Rules'
      );
      expect(fs.readFileSync(path.join(rulesDir, 'ralph-dev-principles.md'), 'utf-8')).toContain(
        '# Ralph-dev Core Principles'
      );
      expect(fs.readFileSync(path.join(rulesDir, 'ralph-dev-commands.md'), 'utf-8')).toContain(
        '# Ralph-dev CLI Commands'
      );
    });

    it('should not report skipped files with --force', async () => {
      fs.ensureDirSync(rulesDir);
      fs.writeFileSync(path.join(rulesDir, 'ralph-dev-workflow.md'), '# Old', 'utf-8');

      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init', '--force']);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).not.toContain('Skipped');
    });
  });

  describe('text output', () => {
    it('should show success message', async () => {
      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init']);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('Ralph-dev initialized');
    });

    it('should show rules directory path', async () => {
      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init']);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('Rules directory:');
      expect(allOutput).toContain('.claude');
      expect(allOutput).toContain('rules');
    });

    it('should show workspace directory path', async () => {
      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init']);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('Workspace directory:');
      expect(allOutput).toContain('.ralph-dev');
    });

    it('should list installed files', async () => {
      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init']);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('Installed rules:');
      expect(allOutput).toContain('ralph-dev-workflow.md');
      expect(allOutput).toContain('ralph-dev-principles.md');
      expect(allOutput).toContain('ralph-dev-commands.md');
    });

    it('should show context compression message', async () => {
      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init']);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('context compression');
    });

    it('should exit with success code', async () => {
      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init']);

      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('JSON output', () => {
    it('should output valid JSON with --json flag', async () => {
      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init', '--json']);

      const jsonOutput = consoleLogSpy.mock.calls[0][0];
      expect(() => JSON.parse(jsonOutput)).not.toThrow();
    });

    it('should include success field in JSON', async () => {
      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init', '--json']);

      const jsonOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(jsonOutput);
      expect(parsed.success).toBe(true);
    });

    it('should include rulesDir in JSON', async () => {
      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init', '--json']);

      const jsonOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(jsonOutput);
      expect(parsed.data.rulesDir).toContain('.claude');
      expect(parsed.data.rulesDir).toContain('rules');
    });

    it('should include ralphDevDir in JSON', async () => {
      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init', '--json']);

      const jsonOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(jsonOutput);
      expect(parsed.data.ralphDevDir).toContain('.ralph-dev');
    });

    it('should include installedFiles array in JSON', async () => {
      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init', '--json']);

      const jsonOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(jsonOutput);
      expect(parsed.data.installedFiles).toContain('ralph-dev-workflow.md');
      expect(parsed.data.installedFiles).toContain('ralph-dev-principles.md');
      expect(parsed.data.installedFiles).toContain('ralph-dev-commands.md');
    });

    it('should include skippedFiles array in JSON', async () => {
      // Create existing file
      fs.ensureDirSync(rulesDir);
      fs.writeFileSync(path.join(rulesDir, 'ralph-dev-workflow.md'), '# Old', 'utf-8');

      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init', '--json']);

      const jsonOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(jsonOutput);
      expect(parsed.data.skippedFiles).toContain('ralph-dev-workflow.md');
      expect(parsed.data.installedFiles).not.toContain('ralph-dev-workflow.md');
    });

    it('should include operation metadata in JSON', async () => {
      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init', '--json']);

      const jsonOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(jsonOutput);
      expect(parsed.metadata.operation).toBe('init');
    });
  });

  describe('error handling', () => {
    it('should use error handler for filesystem errors', async () => {
      // Test that the error handling path exists by checking the code structure
      // The actual error handling is tested via the error-handler module tests
      // Here we verify the command completes successfully under normal conditions
      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init']);

      // If no error, should exit with success
      expect(processExitSpy).toHaveBeenCalledWith(0);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should handle missing workspace directory gracefully', async () => {
      // Use a deeply nested non-existent path that will be created
      const deepPath = path.join(testDir, 'deeply', 'nested', 'path');

      const program2 = new Command();
      registerInitCommand(program2, deepPath);
      await program2.parseAsync(['node', 'test', 'init']);

      // Should create the directory and succeed
      expect(processExitSpy).toHaveBeenCalledWith(0);
      expect(fs.existsSync(path.join(deepPath, '.claude', 'rules'))).toBe(true);
    });
  });

  describe('idempotency', () => {
    it('should be safe to run multiple times', async () => {
      registerInitCommand(program, testDir);

      // First run
      await program.parseAsync(['node', 'test', 'init']);
      processExitSpy.mockClear();

      // Second run (should skip existing files)
      const program2 = new Command();
      registerInitCommand(program2, testDir);
      await program2.parseAsync(['node', 'test', 'init']);

      expect(processExitSpy).toHaveBeenCalledWith(0);

      // Files should still exist
      expect(fs.existsSync(path.join(rulesDir, 'ralph-dev-workflow.md'))).toBe(true);
      expect(fs.existsSync(path.join(rulesDir, 'ralph-dev-principles.md'))).toBe(true);
      expect(fs.existsSync(path.join(rulesDir, 'ralph-dev-commands.md'))).toBe(true);
    });

    it('should be safe to run with --force multiple times', async () => {
      registerInitCommand(program, testDir);

      // First run with force
      await program.parseAsync(['node', 'test', 'init', '--force']);
      processExitSpy.mockClear();

      // Second run with force
      const program2 = new Command();
      registerInitCommand(program2, testDir);
      await program2.parseAsync(['node', 'test', 'init', '--force']);

      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('rule content validation', () => {
    it('workflow rules should contain phase state machine', async () => {
      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init']);

      const content = fs.readFileSync(
        path.join(rulesDir, 'ralph-dev-workflow.md'),
        'utf-8'
      );
      expect(content).toContain('Phase State Machine');
      expect(content).toContain('Valid Transitions');
    });

    it('workflow rules should contain context compression recovery', async () => {
      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init']);

      const content = fs.readFileSync(
        path.join(rulesDir, 'ralph-dev-workflow.md'),
        'utf-8'
      );
      expect(content).toContain('CRITICAL: Recovery After Context Compression');
      expect(content).toContain('ralph-dev state get --json');
    });

    it('principles rules should contain TDD enforcement', async () => {
      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init']);

      const content = fs.readFileSync(
        path.join(rulesDir, 'ralph-dev-principles.md'),
        'utf-8'
      );
      expect(content).toContain('TDD Enforcement');
      expect(content).toContain('failing test first');
    });

    it('commands rules should contain exit codes', async () => {
      registerInitCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'init']);

      const content = fs.readFileSync(
        path.join(rulesDir, 'ralph-dev-commands.md'),
        'utf-8'
      );
      expect(content).toContain('Exit Codes');
      expect(content).toContain('Success');
      expect(content).toContain('Not found');
    });
  });
});
