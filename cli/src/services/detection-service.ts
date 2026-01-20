/**
 * DetectionService - Business logic for language detection
 *
 * Extracts language detection operations from CLI commands into testable service layer.
 * Uses dependency injection for detector, index manager, and logger.
 */

import { LanguageConfig } from '../language/detector';
import { TaskIndex } from '../core/index-manager';
import { ILogger } from '../infrastructure/logger';

/**
 * ILanguageDetector interface for dependency injection
 */
export interface ILanguageDetector {
  detect(projectPath: string): LanguageConfig;
}

/**
 * IIndexManager interface for dependency injection
 */
export interface IIndexManager {
  readIndex(): TaskIndex;
  writeIndex(index: TaskIndex): void;
  updateMetadata(metadata: Partial<TaskIndex['metadata']>): void;
}

/**
 * Result of detection operation
 */
export interface DetectionResult {
  languageConfig: LanguageConfig;
  saved: boolean;
}

/**
 * IDetectionService interface for dependency injection
 */
export interface IDetectionService {
  /**
   * Detect project language and configuration
   */
  detect(): LanguageConfig;

  /**
   * Detect and save to index metadata
   */
  detectAndSave(): DetectionResult;
}

/**
 * DetectionService implementation
 */
export class DetectionService implements IDetectionService {
  constructor(
    private languageDetector: ILanguageDetector,
    private indexManager: IIndexManager,
    private logger: ILogger,
    private workspaceDir: string
  ) {}

  detect(): LanguageConfig {
    this.logger.info('Detecting project language configuration', { workspaceDir: this.workspaceDir });

    const languageConfig = this.languageDetector.detect(this.workspaceDir);

    this.logger.info('Language detected', {
      language: languageConfig.language,
      framework: languageConfig.framework,
      testFramework: languageConfig.testFramework,
      buildTool: languageConfig.buildTool,
    });

    return languageConfig;
  }

  detectAndSave(): DetectionResult {
    const languageConfig = this.detect();

    this.logger.info('Saving language configuration to index');

    try {
      this.indexManager.updateMetadata({ languageConfig });
      this.logger.info('Language configuration saved to index');

      return {
        languageConfig,
        saved: true,
      };
    } catch (error) {
      this.logger.error('Failed to save language configuration', { error });

      return {
        languageConfig,
        saved: false,
      };
    }
  }
}
