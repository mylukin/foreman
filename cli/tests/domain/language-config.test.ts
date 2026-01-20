import { describe, it, expect } from 'vitest';
import { LanguageConfig, LanguageConfigData } from '../../src/domain/language-config';

describe('LanguageConfig Domain Model', () => {
  describe('constructor', () => {
    it('should create config with all fields', () => {
      // Arrange
      const data: LanguageConfigData = {
        language: 'TypeScript',
        framework: 'Next.js',
        testFramework: 'Vitest',
        buildTool: 'npm',
        verifyCommands: ['npm test', 'npm run build'],
      };

      // Act
      const config = new LanguageConfig(data);

      // Assert
      expect(config.language).toBe('typescript'); // Normalized to lowercase
      expect(config.framework).toBe('Next.js');
      expect(config.testFramework).toBe('Vitest');
      expect(config.buildTool).toBe('npm');
      expect(config.getVerifyCommands()).toEqual(['npm test', 'npm run build']);
    });

    it('should normalize language to lowercase', () => {
      // Arrange
      const data: LanguageConfigData = {
        language: 'Python',
      };

      // Act
      const config = new LanguageConfig(data);

      // Assert
      expect(config.language).toBe('python');
    });

    it('should trim language whitespace', () => {
      // Arrange
      const data: LanguageConfigData = {
        language: '  TypeScript  ',
      };

      // Act
      const config = new LanguageConfig(data);

      // Assert
      expect(config.language).toBe('typescript');
    });

    it('should throw error when language is empty', () => {
      // Arrange
      const data: LanguageConfigData = {
        language: '',
      };

      // Act & Assert
      expect(() => new LanguageConfig(data)).toThrow('Language is required');
    });

    it('should throw error when language is only whitespace', () => {
      // Arrange
      const data: LanguageConfigData = {
        language: '   ',
      };

      // Act & Assert
      expect(() => new LanguageConfig(data)).toThrow('Language is required');
    });

    it('should derive verify commands when not provided', () => {
      // Arrange
      const data: LanguageConfigData = {
        language: 'typescript',
      };

      // Act
      const config = new LanguageConfig(data);

      // Assert
      const commands = config.getVerifyCommands();
      expect(commands.length).toBeGreaterThan(0);
      expect(commands).toContain('npx tsc --noEmit');
    });
  });

  describe('getVerifyCommands', () => {
    it('should return copy of verify commands array', () => {
      // Arrange
      const config = new LanguageConfig({
        language: 'typescript',
        verifyCommands: ['npm test'],
      });

      // Act
      const commands1 = config.getVerifyCommands();
      commands1.push('modified');
      const commands2 = config.getVerifyCommands();

      // Assert
      expect(commands2).toEqual(['npm test']); // Original unchanged
    });

    it('should return TypeScript verification commands', () => {
      // Arrange
      const config = new LanguageConfig({ language: 'typescript' });

      // Act
      const commands = config.getVerifyCommands();

      // Assert
      expect(commands).toContain('npx tsc --noEmit');
      expect(commands).toContain('npm test');
      expect(commands).toContain('npm run build');
    });

    it('should return Python verification commands', () => {
      // Arrange
      const config = new LanguageConfig({ language: 'python' });

      // Act
      const commands = config.getVerifyCommands();

      // Assert
      expect(commands.some((cmd) => cmd.includes('pytest'))).toBe(true);
    });

    it('should return Go verification commands', () => {
      // Arrange
      const config = new LanguageConfig({ language: 'go' });

      // Act
      const commands = config.getVerifyCommands();

      // Assert
      expect(commands).toContain('go vet ./...');
      expect(commands).toContain('go test ./...');
      expect(commands).toContain('go build ./...');
    });

    it('should return Rust verification commands', () => {
      // Arrange
      const config = new LanguageConfig({ language: 'rust' });

      // Act
      const commands = config.getVerifyCommands();

      // Assert
      expect(commands).toContain('cargo check');
      expect(commands).toContain('cargo test');
      expect(commands).toContain('cargo build');
    });
  });

  describe('isJavaScriptBased', () => {
    it('should return true for JavaScript', () => {
      // Arrange
      const config = new LanguageConfig({ language: 'javascript' });

      // Act & Assert
      expect(config.isJavaScriptBased()).toBe(true);
    });

    it('should return true for TypeScript', () => {
      // Arrange
      const config = new LanguageConfig({ language: 'typescript' });

      // Act & Assert
      expect(config.isJavaScriptBased()).toBe(true);
    });

    it('should return false for other languages', () => {
      // Arrange
      const configs = [
        new LanguageConfig({ language: 'python' }),
        new LanguageConfig({ language: 'go' }),
        new LanguageConfig({ language: 'rust' }),
      ];

      // Act & Assert
      configs.forEach((config) => {
        expect(config.isJavaScriptBased()).toBe(false);
      });
    });
  });

  describe('isPython', () => {
    it('should return true for Python', () => {
      // Arrange
      const config = new LanguageConfig({ language: 'python' });

      // Act & Assert
      expect(config.isPython()).toBe(true);
    });

    it('should return false for other languages', () => {
      // Arrange
      const config = new LanguageConfig({ language: 'typescript' });

      // Act & Assert
      expect(config.isPython()).toBe(false);
    });
  });

  describe('isCompiled', () => {
    it('should return true for compiled languages', () => {
      // Arrange
      const languages = ['typescript', 'go', 'rust', 'java', 'kotlin', 'scala', 'c++', 'c'];

      // Act & Assert
      languages.forEach((lang) => {
        const config = new LanguageConfig({ language: lang });
        expect(config.isCompiled()).toBe(true);
      });
    });

    it('should return false for interpreted languages', () => {
      // Arrange
      const languages = ['javascript', 'python', 'ruby'];

      // Act & Assert
      languages.forEach((lang) => {
        const config = new LanguageConfig({ language: lang });
        expect(config.isCompiled()).toBe(false);
      });
    });
  });

  describe('hasTestFramework', () => {
    it('should return true when test framework is configured', () => {
      // Arrange
      const config = new LanguageConfig({
        language: 'typescript',
        testFramework: 'Vitest',
      });

      // Act & Assert
      expect(config.hasTestFramework()).toBe(true);
    });

    it('should return false when test framework is not configured', () => {
      // Arrange
      const config = new LanguageConfig({ language: 'typescript' });

      // Act & Assert
      expect(config.hasTestFramework()).toBe(false);
    });
  });

  describe('hasBuildTool', () => {
    it('should return true when build tool is configured', () => {
      // Arrange
      const config = new LanguageConfig({
        language: 'java',
        buildTool: 'maven',
      });

      // Act & Assert
      expect(config.hasBuildTool()).toBe(true);
    });

    it('should return false when build tool is not configured', () => {
      // Arrange
      const config = new LanguageConfig({ language: 'java' });

      // Act & Assert
      expect(config.hasBuildTool()).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should serialize to plain object', () => {
      // Arrange
      const data: LanguageConfigData = {
        language: 'typescript',
        framework: 'Next.js',
        testFramework: 'Vitest',
        buildTool: 'npm',
      };
      const config = new LanguageConfig(data);

      // Act
      const result = config.toJSON();

      // Assert
      expect(result.language).toBe('typescript');
      expect(result.framework).toBe('Next.js');
      expect(result.testFramework).toBe('Vitest');
      expect(result.buildTool).toBe('npm');
      expect(result.verifyCommands).toBeDefined();
    });
  });

  describe('fromJSON', () => {
    it('should create from plain object', () => {
      // Arrange
      const data: LanguageConfigData = {
        language: 'python',
        testFramework: 'pytest',
      };

      // Act
      const config = LanguageConfig.fromJSON(data);

      // Assert
      expect(config).toBeInstanceOf(LanguageConfig);
      expect(config.language).toBe('python');
      expect(config.testFramework).toBe('pytest');
    });

    it('should round-trip through toJSON and fromJSON', () => {
      // Arrange
      const config1 = new LanguageConfig({
        language: 'typescript',
        framework: 'React',
      });

      // Act
      const json = config1.toJSON();
      const config2 = LanguageConfig.fromJSON(json);

      // Assert
      expect(config2.language).toBe(config1.language);
      expect(config2.framework).toBe(config1.framework);
      expect(config2.getVerifyCommands()).toEqual(config1.getVerifyCommands());
    });
  });

  describe('createUnknown', () => {
    it('should create unknown language config', () => {
      // Act
      const config = LanguageConfig.createUnknown();

      // Assert
      expect(config.language).toBe('unknown');
      expect(config.getVerifyCommands()).toEqual([]);
    });
  });
});
