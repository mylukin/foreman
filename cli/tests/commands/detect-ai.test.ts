import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { registerDetectAICommand } from '../../src/commands/detect-ai';
import { IndexManager } from '../../src/core/index-manager';
import * as fs from 'fs-extra';
import * as path from 'path';

// Mock modules
vi.mock('../../src/core/index-manager');

describe('detect-ai commands', () => {
  let program: Command;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;
  const testDir = path.join(__dirname, '__test-detect-ai-command__');

  beforeEach(() => {
    program = new Command();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

    fs.ensureDirSync(testDir);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    vi.clearAllMocks();
    fs.removeSync(testDir);
  });

  describe('detect-ai command', () => {
    it('should register detect-ai command', () => {
      registerDetectAICommand(program, testDir);

      const detectAICommand = program.commands.find(cmd => cmd.name() === 'detect-ai');
      expect(detectAICommand).toBeDefined();
    });

    it('should have correct description', () => {
      registerDetectAICommand(program, testDir);

      const detectAICommand = program.commands.find(cmd => cmd.name() === 'detect-ai');
      expect(detectAICommand?.description()).toBe('AI-powered autonomous language and framework detection');
    });

    it('should have --json option', () => {
      registerDetectAICommand(program, testDir);

      const detectAICommand = program.commands.find(cmd => cmd.name() === 'detect-ai');
      const options = detectAICommand?.options;
      const jsonOption = options?.find(opt => opt.flags === '--json');

      expect(jsonOption).toBeDefined();
    });

    it('should have --save option', () => {
      registerDetectAICommand(program, testDir);

      const detectAICommand = program.commands.find(cmd => cmd.name() === 'detect-ai');
      const options = detectAICommand?.options;
      const saveOption = options?.find(opt => opt.flags === '--save');

      expect(saveOption).toBeDefined();
    });

    it('should display help instructions when executed', async () => {
      registerDetectAICommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect-ai']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('🔍 AI Language Detection'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('detect-language skill'));
    });

    it('should display Claude Code skill integration instructions', async () => {
      registerDetectAICommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect-ai']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('requires Claude Code skill'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('/detect-language'));
    });

    it('should display detection process phases', async () => {
      registerDetectAICommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect-ai']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Phase 1: Project scan'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Phase 2: Analyze evidence'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Phase 3: Infer verification'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Phase 4: Return structured JSON'));
    });

    it('should display expected output format', async () => {
      registerDetectAICommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect-ai']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Expected Output Format'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('typescript'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('confidence'));
    });

    it('should display tip for manual detection', async () => {
      registerDetectAICommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect-ai']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('ralph-dev detect'));
    });
  });

  describe('detect-ai-save command', () => {
    it('should register detect-ai-save command', () => {
      registerDetectAICommand(program, testDir);

      const saveCommand = program.commands.find(cmd => cmd.name() === 'detect-ai-save');
      expect(saveCommand).toBeDefined();
    });

    it('should have correct description', () => {
      registerDetectAICommand(program, testDir);

      const saveCommand = program.commands.find(cmd => cmd.name() === 'detect-ai-save');
      expect(saveCommand?.description()).toBe('Save AI detection result to index metadata');
    });

    it('should save valid detection result', async () => {
      const validResult = {
        language: 'typescript',
        confidence: 0.95,
        framework: 'react',
        buildTool: 'vite',
        testFramework: 'vitest',
        verifyCommands: ['npm test', 'npm run build'],
        evidence: ['tsconfig.json exists', '50 .ts files found'],
      };

      const mockUpdateMetadata = vi.fn();
      vi.mocked(IndexManager).mockImplementation(() => ({
        updateMetadata: mockUpdateMetadata,
      } as any));

      registerDetectAICommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect-ai-save', JSON.stringify(validResult)]);

      expect(mockUpdateMetadata).toHaveBeenCalledWith({ languageConfig: validResult });
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Language configuration saved'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('typescript'));
    });

    it('should display all fields from detection result', async () => {
      const validResult = {
        language: 'python',
        confidence: 0.88,
        framework: 'django',
        verifyCommands: ['pytest', 'python manage.py check'],
        evidence: ['manage.py exists', 'requirements.txt exists'],
      };

      const mockUpdateMetadata = vi.fn();
      vi.mocked(IndexManager).mockImplementation(() => ({
        updateMetadata: mockUpdateMetadata,
      } as any));

      registerDetectAICommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect-ai-save', JSON.stringify(validResult)]);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Language:'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('python'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Framework:'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('django'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Confidence:'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('88%'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Evidence:'));
    });

    it('should display verification commands', async () => {
      const validResult = {
        language: 'go',
        verifyCommands: ['go test ./...', 'go build', 'go vet ./...'],
      };

      const mockUpdateMetadata = vi.fn();
      vi.mocked(IndexManager).mockImplementation(() => ({
        updateMetadata: mockUpdateMetadata,
      } as any));

      registerDetectAICommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect-ai-save', JSON.stringify(validResult)]);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Verification Commands:'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('go test ./...'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('go build'));
    });

    it('should handle missing required field - language', async () => {
      const invalidResult = {
        verifyCommands: ['npm test'],
      };

      registerDetectAICommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect-ai-save', JSON.stringify(invalidResult)]);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('❌ Invalid detection result format'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Required fields: language, verifyCommands'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle missing required field - verifyCommands', async () => {
      const invalidResult = {
        language: 'typescript',
      };

      registerDetectAICommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect-ai-save', JSON.stringify(invalidResult)]);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('❌ Invalid detection result format'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle invalid JSON', async () => {
      registerDetectAICommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect-ai-save', 'invalid-json{']);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('❌ Failed to parse detection result'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Expected JSON string'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle empty string', async () => {
      registerDetectAICommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect-ai-save', '']);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('❌ Failed to parse detection result'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle IndexManager error', async () => {
      const validResult = {
        language: 'rust',
        verifyCommands: ['cargo test', 'cargo build'],
      };

      vi.mocked(IndexManager).mockImplementation(() => {
        throw new Error('Failed to update metadata');
      });

      registerDetectAICommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect-ai-save', JSON.stringify(validResult)]);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('❌ Failed to parse detection result'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should not display framework if not present', async () => {
      const validResult = {
        language: 'javascript',
        verifyCommands: ['npm test'],
      };

      const mockUpdateMetadata = vi.fn();
      vi.mocked(IndexManager).mockImplementation(() => ({
        updateMetadata: mockUpdateMetadata,
      } as any));

      registerDetectAICommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect-ai-save', JSON.stringify(validResult)]);

      // Check that Framework is not mentioned
      const frameworkCalls = consoleLogSpy.mock.calls.filter((call: any) =>
        call[0]?.toString().includes('Framework:')
      );
      expect(frameworkCalls.length).toBe(0);
    });

    it('should not display evidence if not present', async () => {
      const validResult = {
        language: 'java',
        verifyCommands: ['mvn test'],
      };

      const mockUpdateMetadata = vi.fn();
      vi.mocked(IndexManager).mockImplementation(() => ({
        updateMetadata: mockUpdateMetadata,
      } as any));

      registerDetectAICommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect-ai-save', JSON.stringify(validResult)]);

      // Check that Evidence is not mentioned
      const evidenceCalls = consoleLogSpy.mock.calls.filter((call: any) =>
        call[0]?.toString().includes('Evidence:')
      );
      expect(evidenceCalls.length).toBe(0);
    });
  });
});
