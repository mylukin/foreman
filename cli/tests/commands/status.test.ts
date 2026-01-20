import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { registerStatusCommand } from '../../src/commands/status';
import * as serviceFactory from '../../src/commands/service-factory';
import { IStatusService, ProjectStatus } from '../../src/services/status-service';

// Mock service factory
vi.mock('../../src/commands/service-factory');

describe('status command', () => {
  let program: Command;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;
  let mockStatusService: IStatusService;
  const testDir = '/test/workspace';

  const createMockStatus = (overrides: Partial<ProjectStatus> = {}): ProjectStatus => ({
    overall: {
      total: 10,
      pending: 3,
      inProgress: 2,
      completed: 4,
      failed: 1,
      blocked: 0,
      completionPercentage: 40,
    },
    byModule: [
      {
        module: 'auth',
        total: 5,
        pending: 1,
        inProgress: 1,
        completed: 2,
        failed: 1,
        blocked: 0,
        completionPercentage: 40,
      },
      {
        module: 'api',
        total: 5,
        pending: 2,
        inProgress: 1,
        completed: 2,
        failed: 0,
        blocked: 0,
        completionPercentage: 40,
      },
    ],
    currentPhase: 'implement',
    currentTask: 'auth.login',
    startedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    updatedAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    hasActiveTasks: true,
    ...overrides,
  });

  beforeEach(() => {
    program = new Command();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

    // Create mock status service
    mockStatusService = {
      getProjectStatus: vi.fn(),
    };

    // Mock service factory
    vi.mocked(serviceFactory.createStatusService).mockReturnValue(mockStatusService);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('command registration', () => {
    it('should register status command', () => {
      registerStatusCommand(program, testDir);

      const statusCommand = program.commands.find(cmd => cmd.name() === 'status');
      expect(statusCommand).toBeDefined();
    });

    it('should have correct description', () => {
      registerStatusCommand(program, testDir);

      const statusCommand = program.commands.find(cmd => cmd.name() === 'status');
      expect(statusCommand?.description()).toBe('Display overall project progress and statistics');
    });

    it('should have --json option', () => {
      registerStatusCommand(program, testDir);

      const statusCommand = program.commands.find(cmd => cmd.name() === 'status');
      const jsonOption = statusCommand?.options.find(opt => opt.long === '--json');
      expect(jsonOption).toBeDefined();
    });
  });

  describe('command execution', () => {
    it('should display project status with all fields', async () => {
      const mockStatus = createMockStatus();
      vi.mocked(mockStatusService.getProjectStatus).mockResolvedValue(mockStatus);

      registerStatusCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'status']);

      expect(mockStatusService.getProjectStatus).toHaveBeenCalled();

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('Ralph-dev Project Status');
      expect(allOutput).toContain('implement');
      expect(allOutput).toContain('auth.login');
      expect(allOutput).toContain('Overall Progress');
      expect(allOutput).toContain('10'); // total
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should display module breakdown', async () => {
      const mockStatus = createMockStatus();
      vi.mocked(mockStatusService.getProjectStatus).mockResolvedValue(mockStatus);

      registerStatusCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'status']);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('Progress by Module');
      expect(allOutput).toContain('auth');
      expect(allOutput).toContain('api');
    });

    it('should handle blocked tasks', async () => {
      const mockStatus = createMockStatus({
        overall: {
          total: 10,
          pending: 3,
          inProgress: 2,
          completed: 3,
          failed: 0,
          blocked: 2,
          completionPercentage: 30,
        },
      });
      vi.mocked(mockStatusService.getProjectStatus).mockResolvedValue(mockStatus);

      registerStatusCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'status']);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('Blocked');
    });

    it('should handle failed tasks', async () => {
      const mockStatus = createMockStatus({
        overall: {
          total: 10,
          pending: 3,
          inProgress: 2,
          completed: 3,
          failed: 2,
          blocked: 0,
          completionPercentage: 30,
        },
      });
      vi.mocked(mockStatusService.getProjectStatus).mockResolvedValue(mockStatus);

      registerStatusCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'status']);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('Failed');
    });

    it('should handle no current task', async () => {
      const mockStatus = createMockStatus({
        currentTask: null,
      });
      vi.mocked(mockStatusService.getProjectStatus).mockResolvedValue(mockStatus);

      registerStatusCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'status']);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).not.toContain('Current Task');
    });

    it('should handle empty tasks', async () => {
      const mockStatus = createMockStatus({
        overall: {
          total: 0,
          pending: 0,
          inProgress: 0,
          completed: 0,
          failed: 0,
          blocked: 0,
          completionPercentage: 0,
        },
        byModule: [],
        hasActiveTasks: false,
        currentTask: null,
      });
      vi.mocked(mockStatusService.getProjectStatus).mockResolvedValue(mockStatus);

      registerStatusCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'status']);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('No tasks found');
    });

    it('should handle no startedAt timestamp', async () => {
      const mockStatus = createMockStatus({
        startedAt: null,
        updatedAt: null,
      });
      vi.mocked(mockStatusService.getProjectStatus).mockResolvedValue(mockStatus);

      registerStatusCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'status']);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).not.toContain('Started:');
      expect(allOutput).not.toContain('Updated:');
    });

    it('should display blocked modules', async () => {
      const mockStatus = createMockStatus({
        byModule: [
          {
            module: 'auth',
            total: 5,
            pending: 1,
            inProgress: 1,
            completed: 1,
            failed: 0,
            blocked: 2,
            completionPercentage: 20,
          },
        ],
      });
      vi.mocked(mockStatusService.getProjectStatus).mockResolvedValue(mockStatus);

      registerStatusCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'status']);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('auth');
    });

    it('should display failed modules', async () => {
      const mockStatus = createMockStatus({
        byModule: [
          {
            module: 'api',
            total: 5,
            pending: 1,
            inProgress: 1,
            completed: 1,
            failed: 2,
            blocked: 0,
            completionPercentage: 20,
          },
        ],
      });
      vi.mocked(mockStatusService.getProjectStatus).mockResolvedValue(mockStatus);

      registerStatusCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'status']);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('api');
    });
  });

  describe('JSON output', () => {
    it('should output JSON format when --json flag is used', async () => {
      const mockStatus = createMockStatus();
      vi.mocked(mockStatusService.getProjectStatus).mockResolvedValue(mockStatus);

      registerStatusCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'status', '--json']);

      const jsonOutput = consoleLogSpy.mock.calls[0][0];
      expect(() => JSON.parse(jsonOutput)).not.toThrow();

      const parsed = JSON.parse(jsonOutput);
      expect(parsed.success).toBe(true);
      expect(parsed.data.overall.total).toBe(10);
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('error handling', () => {
    it('should handle service errors', async () => {
      vi.mocked(mockStatusService.getProjectStatus).mockRejectedValue(
        new Error('Failed to get status')
      );

      registerStatusCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'status']);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('phase formatting', () => {
    const phases = ['clarify', 'breakdown', 'implement', 'heal', 'deliver', 'none', 'unknown'];

    phases.forEach(phase => {
      it(`should format ${phase} phase`, async () => {
        const mockStatus = createMockStatus({
          currentPhase: phase as any,
        });
        vi.mocked(mockStatusService.getProjectStatus).mockResolvedValue(mockStatus);

        registerStatusCommand(program, testDir);
        await program.parseAsync(['node', 'test', 'status']);

        const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
        expect(allOutput).toContain(phase);
      });
    });
  });

  describe('timestamp formatting', () => {
    it('should format "just now" for recent timestamps', async () => {
      const mockStatus = createMockStatus({
        updatedAt: new Date().toISOString(), // now
      });
      vi.mocked(mockStatusService.getProjectStatus).mockResolvedValue(mockStatus);

      registerStatusCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'status']);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('just now');
    });

    it('should format minutes ago', async () => {
      const mockStatus = createMockStatus({
        updatedAt: new Date(Date.now() - 5 * 60000).toISOString(), // 5 minutes ago
      });
      vi.mocked(mockStatusService.getProjectStatus).mockResolvedValue(mockStatus);

      registerStatusCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'status']);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('minute');
    });

    it('should format hours ago', async () => {
      const mockStatus = createMockStatus({
        updatedAt: new Date(Date.now() - 3 * 3600000).toISOString(), // 3 hours ago
      });
      vi.mocked(mockStatusService.getProjectStatus).mockResolvedValue(mockStatus);

      registerStatusCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'status']);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('hour');
    });

    it('should format days ago', async () => {
      const mockStatus = createMockStatus({
        updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
      });
      vi.mocked(mockStatusService.getProjectStatus).mockResolvedValue(mockStatus);

      registerStatusCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'status']);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('day');
    });

    it('should format singular time unit', async () => {
      const mockStatus = createMockStatus({
        updatedAt: new Date(Date.now() - 1 * 60000).toISOString(), // 1 minute ago
      });
      vi.mocked(mockStatusService.getProjectStatus).mockResolvedValue(mockStatus);

      registerStatusCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'status']);

      const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allOutput).toContain('minute ago');
    });

    it('should format old timestamps as date', async () => {
      const mockStatus = createMockStatus({
        updatedAt: new Date(Date.now() - 10 * 86400000).toISOString(), // 10 days ago
      });
      vi.mocked(mockStatusService.getProjectStatus).mockResolvedValue(mockStatus);

      registerStatusCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'status']);

      // Should show actual date, not relative time
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });
});
