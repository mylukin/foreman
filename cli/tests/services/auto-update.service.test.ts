import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AutoUpdateService, createAutoUpdateService } from '../../src/services/auto-update.service';

// Mock update-notifier
vi.mock('update-notifier', () => ({
  default: () => ({
    update: null,
    notify: vi.fn(),
  }),
}));

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

describe('AutoUpdateService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should create service with required options', () => {
      const service = new AutoUpdateService({
        packageName: 'test-package',
        currentVersion: '1.0.0',
      });

      expect(service).toBeInstanceOf(AutoUpdateService);
    });

    it('should use default values for optional parameters', () => {
      const service = new AutoUpdateService({
        packageName: 'test-package',
        currentVersion: '1.0.0',
      });

      // Service should be created without throwing
      expect(service).toBeDefined();
    });
  });

  describe('checkAndUpdate', () => {
    it('should return no update when notifier has no update info', async () => {
      const service = new AutoUpdateService({
        packageName: 'test-package',
        currentVersion: '1.0.0',
      });

      const result = await service.checkAndUpdate();

      expect(result.updateAvailable).toBe(false);
      expect(result.currentVersion).toBe('1.0.0');
      expect(result.autoUpdated).toBe(false);
    });

    it('should skip auto-update in CI environment', async () => {
      process.env.CI = 'true';

      const service = new AutoUpdateService({
        packageName: 'test-package',
        currentVersion: '1.0.0',
        autoUpdate: true,
      });

      const result = await service.checkAndUpdate();

      // Should not attempt auto-update in CI
      expect(result.autoUpdated).toBe(false);
    });

    it('should skip auto-update when GITHUB_ACTIONS is set', async () => {
      process.env.GITHUB_ACTIONS = 'true';

      const service = new AutoUpdateService({
        packageName: 'test-package',
        currentVersion: '1.0.0',
        autoUpdate: true,
      });

      const result = await service.checkAndUpdate();

      expect(result.autoUpdated).toBe(false);
    });
  });

  describe('notify', () => {
    it('should call notify without throwing', () => {
      const service = new AutoUpdateService({
        packageName: 'test-package',
        currentVersion: '1.0.0',
      });

      // notify() internally creates a new notifier instance, so we just verify it doesn't throw
      expect(() => service.notify()).not.toThrow();
    });
  });

  describe('createAutoUpdateService', () => {
    it('should create service with package name and version', () => {
      const service = createAutoUpdateService('test-package', '1.0.0');

      expect(service).toBeInstanceOf(AutoUpdateService);
    });

    it('should create service with custom options', () => {
      const service = createAutoUpdateService('test-package', '1.0.0', {
        autoUpdate: false,
        checkInterval: 1000,
      });

      expect(service).toBeInstanceOf(AutoUpdateService);
    });
  });
});

describe('AutoUpdateService integration', () => {
  describe('isCI detection', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      process.env = {};
    });

    afterEach(() => {
      vi.restoreAllMocks();
      process.env = originalEnv;
    });

    it.each([
      ['CI', 'true'],
      ['CONTINUOUS_INTEGRATION', 'true'],
      ['BUILD_NUMBER', '123'],
      ['GITHUB_ACTIONS', 'true'],
    ])('should detect CI when %s is set', async (envVar, value) => {
      process.env[envVar] = value;

      const service = new AutoUpdateService({
        packageName: 'test-package',
        currentVersion: '1.0.0',
        autoUpdate: true,
      });

      // The service should not attempt auto-update in CI
      const result = await service.checkAndUpdate();
      expect(result.autoUpdated).toBe(false);
    });
  });
});
