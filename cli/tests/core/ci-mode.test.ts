import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CIConfigLoader, CIModeManager, CIConfig, printCIBanner, printCIReport } from '../../src/core/ci-mode';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('CIConfigLoader', () => {
  const testDir = path.join(__dirname, '../../test-fixtures/ci-config');
  const configPath = path.join(testDir, '.ralph-dev', 'ci-config.yml');

  beforeEach(() => {
    fs.ensureDirSync(path.dirname(configPath));
    // Clear environment variables
    delete process.env.RALPH_DEV_CI_MODE;
    delete process.env.RALPH_DEV_AUTO_APPROVE;
    delete process.env.SLACK_WEBHOOK_URL;
    delete process.env.GIT_AUTHOR_NAME;
    delete process.env.GIT_AUTHOR_EMAIL;
  });

  afterEach(() => {
    fs.removeSync(testDir);
  });

  describe('load', () => {
    it('should load config from file', () => {
      const configContent = `ci_mode:
  enabled: true
  auto_approve_breakdown: true
  clarify_answers:
    project_type: "Web app"
    tech_stack: "TypeScript"
  limits:
    max_tasks: 100
    max_total_time: "2h"
  notifications:
    slack_webhook: "https://hooks.slack.com/test"
    on_success: true
    on_failure: true`;

      fs.writeFileSync(configPath, configContent, 'utf-8');

      const config = CIConfigLoader.load(testDir);

      expect(config.enabled).toBe(true);
      expect(config.auto_approve_breakdown).toBe(true);
      expect(config.clarify_answers?.project_type).toBe('Web app');
      expect(config.limits?.max_tasks).toBe(100);
      expect(config.notifications?.slack_webhook).toBe('https://hooks.slack.com/test');
    });

    it('should return default config when no file exists', () => {
      const config = CIConfigLoader.load(testDir);

      expect(config.enabled).toBe(false);
      expect(config.auto_approve_breakdown).toBe(false);
    });

    it('should override with environment variables', () => {
      process.env.RALPH_DEV_CI_MODE = 'true';
      process.env.RALPH_DEV_AUTO_APPROVE = 'true';
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/env';

      const config = CIConfigLoader.load(testDir);

      expect(config.enabled).toBe(true);
      expect(config.auto_approve_breakdown).toBe(true);
      expect(config.notifications?.slack_webhook).toBe('https://hooks.slack.com/env');
    });

    it('should merge file and environment config', () => {
      const configContent = `ci_mode:
  enabled: false
  limits:
    max_tasks: 50`;

      fs.writeFileSync(configPath, configContent, 'utf-8');
      process.env.RALPH_DEV_CI_MODE = 'true';

      const config = CIConfigLoader.load(testDir);

      expect(config.enabled).toBe(true); // Override from env
      expect(config.limits?.max_tasks).toBe(50); // From file
    });

    it('should handle git author/email from env', () => {
      process.env.GIT_AUTHOR_NAME = 'CI Bot';
      process.env.GIT_AUTHOR_EMAIL = '[email protected]';

      const config = CIConfigLoader.load(testDir);

      expect(config.git?.author).toBe('CI Bot <[email protected]>');
    });

    it('should handle invalid YAML gracefully', () => {
      fs.writeFileSync(configPath, 'invalid: yaml: content:', 'utf-8');

      // Should not throw, just use defaults
      const config = CIConfigLoader.load(testDir);
      expect(config.enabled).toBe(false);
    });
  });

  describe('validate', () => {
    it('should validate valid config', () => {
      const config: CIConfig = {
        enabled: true,
        auto_approve_breakdown: true,
        clarify_answers: {
          project_type: 'Web app',
        },
        limits: {
          max_tasks: 100,
        },
      };

      const result = CIConfigLoader.validate(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing clarify_answers', () => {
      const config: CIConfig = {
        enabled: true,
        auto_approve_breakdown: true,
      };

      const result = CIConfigLoader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('clarify_answers');
    });

    it('should detect invalid max_tasks', () => {
      const config: CIConfig = {
        enabled: true,
        auto_approve_breakdown: true,
        clarify_answers: { type: 'test' },
        limits: {
          max_tasks: 0,
        },
      };

      const result = CIConfigLoader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('max_tasks');
    });
  });

  describe('createTemplate', () => {
    it('should create template file', () => {
      CIConfigLoader.createTemplate(testDir);

      expect(fs.existsSync(configPath)).toBe(true);

      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).toContain('ci_mode:');
      expect(content).toContain('enabled: true');
      expect(content).toContain('clarify_answers:');
    });
  });
});

describe('CIModeManager', () => {
  const testDir = path.join(__dirname, '../../test-fixtures/ci-manager');

  beforeEach(() => {
    fs.ensureDirSync(testDir);
  });

  afterEach(() => {
    fs.removeSync(testDir);
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      const config: CIConfig = {
        enabled: true,
        auto_approve_breakdown: true,
        limits: {
          max_total_time: '30m',
        },
      };

      const manager = new CIModeManager(testDir, config);

      expect(manager.isEnabled()).toBe(true);
      expect(manager.shouldAutoApproveBreakdown()).toBe(true);
    });

    it('should parse timeout correctly', () => {
      const config: CIConfig = {
        enabled: true,
        auto_approve_breakdown: false,
        limits: {
          max_total_time: '5s',
        },
      };

      const manager = new CIModeManager(testDir, config);
      const timeout = manager.checkTimeout();

      expect(timeout.remaining).toBeGreaterThan(0);
      expect(timeout.remaining).toBeLessThanOrEqual(5);
    });
  });

  describe('getClarifyAnswers', () => {
    it('should return clarify answers filtering undefined', () => {
      const config: CIConfig = {
        enabled: true,
        auto_approve_breakdown: true,
        clarify_answers: {
          project_type: 'Web app',
          tech_stack: undefined,
          scale: 'Production',
        },
      };

      const manager = new CIModeManager(testDir, config);
      const answers = manager.getClarifyAnswers();

      expect(answers).toEqual({
        project_type: 'Web app',
        scale: 'Production',
      });
    });

    it('should return undefined when no answers', () => {
      const config: CIConfig = {
        enabled: true,
        auto_approve_breakdown: true,
      };

      const manager = new CIModeManager(testDir, config);
      const answers = manager.getClarifyAnswers();

      expect(answers).toBeUndefined();
    });
  });

  describe('checkTimeout', () => {
    it('should check if timeout exceeded', async () => {
      const config: CIConfig = {
        enabled: true,
        auto_approve_breakdown: true,
        limits: {
          max_total_time: '1s', // Use supported format (s, m, h)
        },
      };

      const manager = new CIModeManager(testDir, config);

      // Initially not exceeded
      let check = manager.checkTimeout();
      expect(check.exceeded).toBe(false);

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      check = manager.checkTimeout();
      expect(check.exceeded).toBe(true);
    });
  });

  describe('checkResourceQuota', () => {
    it('should check tasks quota', () => {
      const config: CIConfig = {
        enabled: true,
        auto_approve_breakdown: true,
        limits: {
          max_tasks: 10,
        },
      };

      const manager = new CIModeManager(testDir, config);

      // Initially not exceeded
      let check = manager.checkResourceQuota('tasks');
      expect(check.exceeded).toBe(false);
      expect(check.current).toBe(0);
      expect(check.limit).toBe(10);

      // Record usage
      manager.recordResourceUsage('tasks', 5);
      check = manager.checkResourceQuota('tasks');
      expect(check.current).toBe(5);

      // Exceed quota
      manager.recordResourceUsage('tasks', 6);
      check = manager.checkResourceQuota('tasks');
      expect(check.exceeded).toBe(true);
      expect(check.current).toBe(11);
    });

    it('should check healing quota', () => {
      const config: CIConfig = {
        enabled: true,
        auto_approve_breakdown: true,
        limits: {
          max_healing_attempts_per_session: 5,
        },
      };

      const manager = new CIModeManager(testDir, config);

      manager.recordResourceUsage('healing', 3);
      let check = manager.checkResourceQuota('healing');
      expect(check.current).toBe(3);
      expect(check.exceeded).toBe(false);

      manager.recordResourceUsage('healing', 3);
      check = manager.checkResourceQuota('healing');
      expect(check.exceeded).toBe(true);
    });
  });

  describe('getFinalReport', () => {
    it('should generate final report', () => {
      const config: CIConfig = {
        enabled: true,
        auto_approve_breakdown: true,
        limits: {
          max_tasks: 100,
        },
      };

      const manager = new CIModeManager(testDir, config);
      manager.recordResourceUsage('tasks', 50);
      manager.recordResourceUsage('healing', 5);

      const report = manager.getFinalReport();

      expect(report.success).toBe(true);
      expect(report.resourcesUsed.tasksCreated).toBe(50);
      expect(report.resourcesUsed.healingAttempts).toBe(5);
      expect(report.config.autoApprove).toBe(true);
      expect(report.config.limits?.max_tasks).toBe(100);
    });
  });

  describe('configureGit', () => {
    it('should configure git from config', () => {
      const config: CIConfig = {
        enabled: true,
        auto_approve_breakdown: true,
        git: {
          author: 'CI Bot <[email protected]>',
          committer: 'CI System <[email protected]>',
        },
      };

      const manager = new CIModeManager(testDir, config);
      manager.configureGit();

      expect(process.env.GIT_AUTHOR_NAME).toBe('CI Bot');
      expect(process.env.GIT_AUTHOR_EMAIL).toBe('[email protected]');
      expect(process.env.GIT_COMMITTER_NAME).toBe('CI System');
      expect(process.env.GIT_COMMITTER_EMAIL).toBe('[email protected]');

      // Cleanup
      delete process.env.GIT_AUTHOR_NAME;
      delete process.env.GIT_AUTHOR_EMAIL;
      delete process.env.GIT_COMMITTER_NAME;
      delete process.env.GIT_COMMITTER_EMAIL;
    });

    it('should handle missing git config', () => {
      const config: CIConfig = {
        enabled: true,
        auto_approve_breakdown: true,
      };

      const manager = new CIModeManager(testDir, config);

      // Should not throw
      expect(() => manager.configureGit()).not.toThrow();
    });
  });
});

describe('printCIBanner', () => {
  it('should print banner without errors', () => {
    const config: CIConfig = {
      enabled: true,
      auto_approve_breakdown: true,
      limits: {
        max_tasks: 100,
        max_total_time: '2h',
      },
      notifications: {
        slack_webhook: 'https://test.com',
      },
    };

    // Should not throw
    expect(() => printCIBanner(config)).not.toThrow();
  });
});

describe('printCIReport', () => {
  it('should print report without errors', () => {
    const report = {
      success: true,
      duration: 3600,
      resourcesUsed: {
        tasksCreated: 50,
        healingAttempts: 5,
      },
      notificationsSent: 2,
      config: {
        autoApprove: true,
        limits: {
          max_tasks: 100,
        },
      },
    };

    // Should not throw
    expect(() => printCIReport(report)).not.toThrow();
  });
});
