import { describe, it, expect, beforeEach } from 'vitest';
import {
  DetectionService,
  ILanguageDetector,
} from '../../src/services/detection-service';
import { LanguageConfig } from '../../src/language/detector';
import { IIndexRepository, TaskIndex, MetadataUpdate } from '../../src/repositories/index-repository';
import { ILogger } from '../../src/infrastructure/logger';

/**
 * Mock LanguageDetector for testing
 */
class MockLanguageDetector implements ILanguageDetector {
  private mockConfig: LanguageConfig = {
    language: 'typescript',
    framework: 'react',
    testFramework: 'vitest',
    buildTool: 'vite',
    verifyCommands: ['npx tsc --noEmit', 'npm test', 'npm run build'],
  };

  detect(_projectPath: string): LanguageConfig {
    return this.mockConfig;
  }

  setMockConfig(config: LanguageConfig): void {
    this.mockConfig = config;
  }
}

/**
 * Mock IndexRepository for testing (async interface)
 */
class MockIndexRepository implements IIndexRepository {
  private index: TaskIndex = {
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    metadata: {
      projectGoal: 'Test project',
    },
    tasks: {},
  };

  async read(): Promise<TaskIndex> {
    return this.index;
  }

  async write(index: TaskIndex): Promise<void> {
    this.index = { ...index, updatedAt: new Date().toISOString() };
  }

  async upsertTask(_taskId: string, _entry: any): Promise<void> {
    // Not needed for detection service tests
  }

  async updateTaskStatus(_taskId: string, _status: string): Promise<void> {
    // Not needed for detection service tests
  }

  getTaskFilePath(_taskId: string): string | null {
    return null;
  }

  async getNextTask(): Promise<string | null> {
    return null;
  }

  async updateMetadata(metadata: MetadataUpdate): Promise<void> {
    this.index.metadata = { ...this.index.metadata, ...metadata };
    this.index.updatedAt = new Date().toISOString();
  }

  async hasTask(_taskId: string): Promise<boolean> {
    return false;
  }

  async getAllTaskIds(): Promise<string[]> {
    return [];
  }

  async getTasksByStatus(_status: string): Promise<string[]> {
    return [];
  }

  // Test helper
  getMetadata(): TaskIndex['metadata'] {
    return this.index.metadata;
  }
}

/**
 * Mock Logger for testing
 */
class MockLogger implements ILogger {
  logs: Array<{ level: string; message: string; meta?: any }> = [];

  debug(message: string, meta?: any): void {
    this.logs.push({ level: 'debug', message, meta });
  }

  info(message: string, meta?: any): void {
    this.logs.push({ level: 'info', message, meta });
  }

  warn(message: string, meta?: any): void {
    this.logs.push({ level: 'warn', message, meta });
  }

  error(message: string, meta?: any): void {
    this.logs.push({ level: 'error', message, meta });
  }

  clear(): void {
    this.logs = [];
  }
}

describe('DetectionService', () => {
  let detector: MockLanguageDetector;
  let indexRepository: MockIndexRepository;
  let logger: MockLogger;
  let service: DetectionService;
  const workspaceDir = '/test/workspace';

  beforeEach(() => {
    detector = new MockLanguageDetector();
    indexRepository = new MockIndexRepository();
    logger = new MockLogger();
    service = new DetectionService(detector, indexRepository, logger, workspaceDir);
  });

  describe('detect', () => {
    it('should detect TypeScript project configuration', () => {
      // Arrange
      const expectedConfig: LanguageConfig = {
        language: 'typescript',
        framework: 'react',
        testFramework: 'vitest',
        buildTool: 'vite',
        verifyCommands: ['npx tsc --noEmit', 'npm test', 'npm run build'],
      };
      detector.setMockConfig(expectedConfig);

      // Act
      const result = service.detect();

      // Assert
      expect(result).toEqual(expectedConfig);
      expect(result.language).toBe('typescript');
      expect(result.framework).toBe('react');
      expect(result.testFramework).toBe('vitest');
      expect(result.buildTool).toBe('vite');
      expect(result.verifyCommands).toHaveLength(3);
    });

    it('should detect Python project configuration', () => {
      // Arrange
      const expectedConfig: LanguageConfig = {
        language: 'python',
        testFramework: 'pytest',
        verifyCommands: ['mypy .', 'flake8', 'pytest'],
      };
      detector.setMockConfig(expectedConfig);

      // Act
      const result = service.detect();

      // Assert
      expect(result.language).toBe('python');
      expect(result.testFramework).toBe('pytest');
      expect(result.framework).toBeUndefined();
      expect(result.buildTool).toBeUndefined();
      expect(result.verifyCommands).toHaveLength(3);
    });

    it('should detect Go project configuration', () => {
      // Arrange
      const expectedConfig: LanguageConfig = {
        language: 'go',
        testFramework: 'go test',
        buildTool: 'go',
        verifyCommands: ['go fmt ./...', 'go vet ./...', 'go test ./...', 'go build ./...'],
      };
      detector.setMockConfig(expectedConfig);

      // Act
      const result = service.detect();

      // Assert
      expect(result.language).toBe('go');
      expect(result.testFramework).toBe('go test');
      expect(result.buildTool).toBe('go');
      expect(result.verifyCommands).toHaveLength(4);
    });

    it('should detect Rust project configuration', () => {
      // Arrange
      const expectedConfig: LanguageConfig = {
        language: 'rust',
        testFramework: 'cargo test',
        buildTool: 'cargo',
        verifyCommands: ['cargo fmt -- --check', 'cargo clippy -- -D warnings', 'cargo test', 'cargo build'],
      };
      detector.setMockConfig(expectedConfig);

      // Act
      const result = service.detect();

      // Assert
      expect(result.language).toBe('rust');
      expect(result.testFramework).toBe('cargo test');
      expect(result.buildTool).toBe('cargo');
    });

    it('should detect unknown project', () => {
      // Arrange
      const expectedConfig: LanguageConfig = {
        language: 'unknown',
        verifyCommands: [],
      };
      detector.setMockConfig(expectedConfig);

      // Act
      const result = service.detect();

      // Assert
      expect(result.language).toBe('unknown');
      expect(result.verifyCommands).toHaveLength(0);
    });

    it('should log detection process', () => {
      // Act
      service.detect();

      // Assert
      expect(logger.logs.some((l) => l.level === 'info' && l.message.includes('Detecting'))).toBe(true);
      expect(logger.logs.some((l) => l.level === 'info' && l.message.includes('detected'))).toBe(true);
    });

    it('should log workspace directory', () => {
      // Act
      service.detect();

      // Assert
      const logEntry = logger.logs.find((l) => l.message.includes('Detecting'));
      expect(logEntry?.meta?.workspaceDir).toBe(workspaceDir);
    });

    it('should log detected language details', () => {
      // Arrange
      detector.setMockConfig({
        language: 'typescript',
        framework: 'next',
        testFramework: 'jest',
        buildTool: 'webpack',
        verifyCommands: [],
      });

      // Act
      service.detect();

      // Assert
      const logEntry = logger.logs.find((l) => l.message.includes('Language detected'));
      expect(logEntry?.meta?.language).toBe('typescript');
      expect(logEntry?.meta?.framework).toBe('next');
      expect(logEntry?.meta?.testFramework).toBe('jest');
      expect(logEntry?.meta?.buildTool).toBe('webpack');
    });
  });

  describe('detectAndSave', () => {
    it('should detect and save language configuration', async () => {
      // Arrange
      const expectedConfig: LanguageConfig = {
        language: 'typescript',
        framework: 'react',
        testFramework: 'vitest',
        verifyCommands: ['npm test'],
      };
      detector.setMockConfig(expectedConfig);

      // Act
      const result = await service.detectAndSave();

      // Assert
      expect(result.languageConfig).toEqual(expectedConfig);
      expect(result.saved).toBe(true);
    });

    it('should save configuration to index metadata', async () => {
      // Arrange
      const expectedConfig: LanguageConfig = {
        language: 'python',
        testFramework: 'pytest',
        verifyCommands: ['pytest'],
      };
      detector.setMockConfig(expectedConfig);

      // Act
      await service.detectAndSave();

      // Assert
      const metadata = indexRepository.getMetadata();
      expect(metadata.languageConfig).toEqual(expectedConfig);
    });

    it('should preserve existing metadata when saving', async () => {
      // Arrange
      await indexRepository.updateMetadata({ projectGoal: 'Build awesome app' });
      const expectedConfig: LanguageConfig = {
        language: 'go',
        testFramework: 'go test',
        verifyCommands: ['go test ./...'],
      };
      detector.setMockConfig(expectedConfig);

      // Act
      await service.detectAndSave();

      // Assert
      const metadata = indexRepository.getMetadata();
      expect(metadata.projectGoal).toBe('Build awesome app');
      expect(metadata.languageConfig).toEqual(expectedConfig);
    });

    it('should return saved: true on successful save', async () => {
      // Act
      const result = await service.detectAndSave();

      // Assert
      expect(result.saved).toBe(true);
    });

    it('should return saved: false when save fails', async () => {
      // Arrange
      const failingIndexRepository: IIndexRepository = {
        read: async () => indexRepository.read(),
        write: async (index) => indexRepository.write(index),
        upsertTask: async () => {},
        updateTaskStatus: async () => {},
        getTaskFilePath: () => null,
        getNextTask: async () => null,
        updateMetadata: async () => {
          throw new Error('Save failed');
        },
        hasTask: async () => false,
        getAllTaskIds: async () => [],
        getTasksByStatus: async () => [],
      };
      const failingService = new DetectionService(
        detector,
        failingIndexRepository,
        logger,
        workspaceDir
      );

      // Act
      const result = await failingService.detectAndSave();

      // Assert
      expect(result.saved).toBe(false);
      expect(result.languageConfig).toBeDefined();
    });

    it('should still return languageConfig when save fails', async () => {
      // Arrange
      const expectedConfig: LanguageConfig = {
        language: 'rust',
        testFramework: 'cargo test',
        verifyCommands: ['cargo test'],
      };
      detector.setMockConfig(expectedConfig);

      const failingIndexRepository: IIndexRepository = {
        read: async () => indexRepository.read(),
        write: async (index) => indexRepository.write(index),
        upsertTask: async () => {},
        updateTaskStatus: async () => {},
        getTaskFilePath: () => null,
        getNextTask: async () => null,
        updateMetadata: async () => {
          throw new Error('Save failed');
        },
        hasTask: async () => false,
        getAllTaskIds: async () => [],
        getTasksByStatus: async () => [],
      };
      const failingService = new DetectionService(
        detector,
        failingIndexRepository,
        logger,
        workspaceDir
      );

      // Act
      const result = await failingService.detectAndSave();

      // Assert
      expect(result.languageConfig).toEqual(expectedConfig);
      expect(result.saved).toBe(false);
    });

    it('should log save operation', async () => {
      // Act
      await service.detectAndSave();

      // Assert
      expect(logger.logs.some((l) => l.level === 'info' && l.message.includes('Saving'))).toBe(true);
      expect(logger.logs.some((l) => l.level === 'info' && l.message.includes('saved to index'))).toBe(
        true
      );
    });

    it('should log error when save fails', async () => {
      // Arrange
      const failingIndexRepository: IIndexRepository = {
        read: async () => indexRepository.read(),
        write: async (index) => indexRepository.write(index),
        upsertTask: async () => {},
        updateTaskStatus: async () => {},
        getTaskFilePath: () => null,
        getNextTask: async () => null,
        updateMetadata: async () => {
          throw new Error('Disk full');
        },
        hasTask: async () => false,
        getAllTaskIds: async () => [],
        getTasksByStatus: async () => [],
      };
      const failingService = new DetectionService(
        detector,
        failingIndexRepository,
        logger,
        workspaceDir
      );

      // Act
      await failingService.detectAndSave();

      // Assert
      expect(logger.logs.some((l) => l.level === 'error' && l.message.includes('Failed to save'))).toBe(
        true
      );
    });

    it('should detect multiple times independently', async () => {
      // Arrange
      const config1: LanguageConfig = {
        language: 'typescript',
        verifyCommands: [],
      };
      const config2: LanguageConfig = {
        language: 'python',
        verifyCommands: [],
      };

      // Act 1
      detector.setMockConfig(config1);
      const result1 = await service.detectAndSave();

      // Act 2
      detector.setMockConfig(config2);
      const result2 = await service.detectAndSave();

      // Assert
      expect(result1.languageConfig.language).toBe('typescript');
      expect(result2.languageConfig.language).toBe('python');

      const metadata = indexRepository.getMetadata();
      expect(metadata.languageConfig?.language).toBe('python'); // Latest config
    });
  });

  describe('edge cases', () => {
    it('should handle empty verify commands', () => {
      // Arrange
      detector.setMockConfig({
        language: 'unknown',
        verifyCommands: [],
      });

      // Act
      const result = service.detect();

      // Assert
      expect(result.verifyCommands).toHaveLength(0);
    });

    it('should handle configuration without optional fields', () => {
      // Arrange
      detector.setMockConfig({
        language: 'javascript',
        verifyCommands: ['npm test'],
      });

      // Act
      const result = service.detect();

      // Assert
      expect(result.language).toBe('javascript');
      expect(result.framework).toBeUndefined();
      expect(result.testFramework).toBeUndefined();
      expect(result.buildTool).toBeUndefined();
      expect(result.verifyCommands).toHaveLength(1);
    });

    it('should handle configuration with all fields', () => {
      // Arrange
      detector.setMockConfig({
        language: 'typescript',
        framework: 'next',
        testFramework: 'jest',
        buildTool: 'webpack',
        verifyCommands: ['npm run type-check', 'npm test', 'npm run build'],
      });

      // Act
      const result = service.detect();

      // Assert
      expect(result.language).toBe('typescript');
      expect(result.framework).toBe('next');
      expect(result.testFramework).toBe('jest');
      expect(result.buildTool).toBe('webpack');
      expect(result.verifyCommands).toHaveLength(3);
    });
  });
});
