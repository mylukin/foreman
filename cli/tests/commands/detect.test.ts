import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { registerDetectCommand } from '../../src/commands/detect';
import { IDetectionService } from '../../src/services/detection-service';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as serviceFactory from '../../src/commands/service-factory';

// Mock service factory
vi.mock('../../src/commands/service-factory');

describe('detect command (refactored with DetectionService)', () => {
  let program: Command;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;
  let mockDetectionService: IDetectionService;
  const testDir = path.join(__dirname, '__test-detect-command__');

  beforeEach(() => {
    program = new Command();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

    fs.ensureDirSync(testDir);

    // Create mock detection service
    mockDetectionService = {
      detect: vi.fn(),
      detectAndSave: vi.fn(),
    };

    // Mock service factory to return our mock service
    vi.mocked(serviceFactory.createDetectionService).mockReturnValue(mockDetectionService);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    vi.clearAllMocks();
    fs.removeSync(testDir);
  });

  describe('command registration', () => {
    it('should register detect command', () => {
      registerDetectCommand(program, testDir);

      const detectCommand = program.commands.find(cmd => cmd.name() === 'detect');
      expect(detectCommand).toBeDefined();
    });

    it('should have correct description', () => {
      registerDetectCommand(program, testDir);

      const detectCommand = program.commands.find(cmd => cmd.name() === 'detect');
      expect(detectCommand?.description()).toBe('Detect project language and configuration');
    });

    it('should have --json option', () => {
      registerDetectCommand(program, testDir);

      const detectCommand = program.commands.find(cmd => cmd.name() === 'detect');
      const options = detectCommand?.options;
      const jsonOption = options?.find(opt => opt.flags === '--json');

      expect(jsonOption).toBeDefined();
      expect(jsonOption?.description).toBe('Output as JSON');
    });

    it('should have --save option', () => {
      registerDetectCommand(program, testDir);

      const detectCommand = program.commands.find(cmd => cmd.name() === 'detect');
      const options = detectCommand?.options;
      const saveOption = options?.find(opt => opt.flags === '--save');

      expect(saveOption).toBeDefined();
      expect(saveOption?.description).toBe('Save to index metadata');
    });
  });

  describe('command execution - thin layer using DetectionService', () => {
    it('should call DetectionService.detect when --save is not used', async () => {
      const mockLanguageConfig = {
        language: 'typescript',
        framework: 'node',
        testFramework: 'vitest',
        buildTool: 'npm',
        verifyCommands: ['npm test', 'npm run build'],
      };

      vi.mocked(mockDetectionService.detect).mockReturnValue(mockLanguageConfig);

      registerDetectCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect']);

      expect(serviceFactory.createDetectionService).toHaveBeenCalledWith(testDir);
      expect(mockDetectionService.detect).toHaveBeenCalled();
      expect(mockDetectionService.detectAndSave).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Project Configuration:'));
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should call DetectionService.detectAndSave when --save is used', async () => {
      const mockResult = {
        languageConfig: {
          language: 'typescript',
          framework: 'node',
          testFramework: 'vitest',
          buildTool: 'npm',
          verifyCommands: ['npm test'],
        },
        saved: true,
      };

      vi.mocked(mockDetectionService.detectAndSave).mockReturnValue(mockResult);

      registerDetectCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect', '--save']);

      expect(serviceFactory.createDetectionService).toHaveBeenCalledWith(testDir);
      expect(mockDetectionService.detectAndSave).toHaveBeenCalled();
      expect(mockDetectionService.detect).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✓ Saved to index metadata'));
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should output JSON format when --json flag is used', async () => {
      const mockLanguageConfig = {
        language: 'typescript',
        framework: 'node',
        testFramework: 'vitest',
        buildTool: 'npm',
        verifyCommands: ['npm test'],
      };

      vi.mocked(mockDetectionService.detect).mockReturnValue(mockLanguageConfig);

      registerDetectCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect', '--json']);

      expect(mockDetectionService.detect).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"success": true')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"language": "typescript"')
      );
    });

    it('should output JSON with saved:true when --json and --save flags are used', async () => {
      const mockResult = {
        languageConfig: {
          language: 'python',
          framework: 'django',
          testFramework: 'pytest',
          buildTool: 'pip',
          verifyCommands: ['pytest'],
        },
        saved: true,
      };

      vi.mocked(mockDetectionService.detectAndSave).mockReturnValue(mockResult);

      registerDetectCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect', '--json', '--save']);

      expect(mockDetectionService.detectAndSave).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"saved": true')
      );
    });

    it('should display all language config fields in human-readable format', async () => {
      const mockLanguageConfig = {
        language: 'javascript',
        framework: 'react',
        testFramework: 'jest',
        buildTool: 'webpack',
        verifyCommands: ['npm test', 'npm run build'],
      };

      vi.mocked(mockDetectionService.detect).mockReturnValue(mockLanguageConfig);

      registerDetectCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Project Configuration:'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('javascript'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Framework:'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('react'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Test Framework:'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('jest'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Build Tool:'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('webpack'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Verification Commands:'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('npm test'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('npm run build'));
    });

    it('should handle detection service throwing error', async () => {
      vi.mocked(mockDetectionService.detect).mockImplementation(() => {
        throw new Error('Detection failed');
      });

      registerDetectCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect']);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(8); // FILE_SYSTEM_ERROR
    });

    it('should show saved:false when detectAndSave fails to save', async () => {
      const mockResult = {
        languageConfig: {
          language: 'typescript',
          framework: 'node',
          testFramework: 'vitest',
          buildTool: 'npm',
          verifyCommands: [],
        },
        saved: false, // Service returns false when save fails
      };

      vi.mocked(mockDetectionService.detectAndSave).mockReturnValue(mockResult);

      registerDetectCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect', '--save']);

      expect(mockDetectionService.detectAndSave).toHaveBeenCalled();
      // Should NOT show the "✓ Saved to index metadata" message
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('✓ Saved'));
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });
});
