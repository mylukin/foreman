import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LanguageDetector } from '../../src/language/detector';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('LanguageDetector', () => {
  const testDir = path.join(__dirname, '../../test-projects');

  beforeEach(() => {
    fs.ensureDirSync(testDir);
  });

  afterEach(() => {
    fs.removeSync(testDir);
  });

  describe('TypeScript/JavaScript detection', () => {
    it('should detect TypeScript project with all features', () => {
      const projectDir = path.join(testDir, 'ts-project');
      fs.ensureDirSync(projectDir);

      const packageJson = {
        name: 'test-app',
        scripts: {
          test: 'vitest',
          build: 'tsc',
          lint: 'eslint .',
        },
        dependencies: {
          react: '^18.0.0',
        },
        devDependencies: {
          typescript: '^5.0.0',
          vitest: '^1.0.0',
          eslint: '^8.0.0',
        },
      };

      fs.writeJSONSync(path.join(projectDir, 'package.json'), packageJson);
      fs.writeFileSync(path.join(projectDir, 'tsconfig.json'), '{}');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('typescript');
      expect(config.framework).toBe('react');
      expect(config.testFramework).toBe('vitest');
      expect(config.verifyCommands).toContain('npx tsc --noEmit');
      expect(config.verifyCommands).toContain('npm run lint');
      expect(config.verifyCommands).toContain('npm test');
      expect(config.verifyCommands).toContain('npm run build');
    });

    it('should detect JavaScript project without TypeScript', () => {
      const projectDir = path.join(testDir, 'js-project');
      fs.ensureDirSync(projectDir);

      const packageJson = {
        name: 'test-app',
        scripts: {
          test: 'jest',
        },
        devDependencies: {
          jest: '^29.0.0',
        },
      };

      fs.writeJSONSync(path.join(projectDir, 'package.json'), packageJson);

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('javascript');
      expect(config.testFramework).toBe('jest');
      expect(config.verifyCommands).toContain('npm test');
    });

    it('should detect Next.js framework', () => {
      const projectDir = path.join(testDir, 'next-project');
      fs.ensureDirSync(projectDir);

      const packageJson = {
        name: 'next-app',
        dependencies: {
          next: '^14.0.0',
          react: '^18.0.0',
        },
      };

      fs.writeJSONSync(path.join(projectDir, 'package.json'), packageJson);
      fs.writeFileSync(path.join(projectDir, 'tsconfig.json'), '{}');
      fs.writeFileSync(path.join(projectDir, 'next.config.js'), '');

      const config = LanguageDetector.detect(projectDir);

      expect(config.framework).toBe('next');
      expect(config.buildTool).toBe('next');
    });

    it('should detect Vite build tool', () => {
      const projectDir = path.join(testDir, 'vite-project');
      fs.ensureDirSync(projectDir);

      const packageJson = {
        name: 'vite-app',
        dependencies: {
          vue: '^3.0.0',
        },
        devDependencies: {
          vite: '^5.0.0',
        },
      };

      fs.writeJSONSync(path.join(projectDir, 'package.json'), packageJson);
      fs.writeFileSync(path.join(projectDir, 'vite.config.ts'), '');

      const config = LanguageDetector.detect(projectDir);

      expect(config.framework).toBe('vue');
      expect(config.buildTool).toBe('vite');
    });
  });

  describe('Python detection', () => {
    it('should detect Python project with pytest', () => {
      const projectDir = path.join(testDir, 'python-project');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'requirements.txt'), 'pytest==7.0.0');
      fs.writeFileSync(path.join(projectDir, 'pytest.ini'), '[pytest]');
      fs.writeFileSync(path.join(projectDir, '.flake8'), '[flake8]');
      fs.writeFileSync(path.join(projectDir, 'mypy.ini'), '[mypy]');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('python');
      expect(config.testFramework).toBe('pytest');
      expect(config.verifyCommands).toContain('mypy .');
      expect(config.verifyCommands).toContain('flake8');
      expect(config.verifyCommands).toContain('pytest');
    });

    it('should detect Python with pyproject.toml', () => {
      const projectDir = path.join(testDir, 'python-modern');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'pyproject.toml'), '[tool.poetry]');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('python');
      expect(config.verifyCommands).toContain('pytest');
    });

    it('should fallback to unittest if pytest not found', () => {
      const projectDir = path.join(testDir, 'python-basic');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'setup.py'), '');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('python');
      expect(config.verifyCommands).toContain('python -m unittest discover');
    });
  });

  describe('Go detection', () => {
    it('should detect Go project', () => {
      const projectDir = path.join(testDir, 'go-project');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'go.mod'), 'module test');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('go');
      expect(config.testFramework).toBe('go test');
      expect(config.buildTool).toBe('go');
      expect(config.verifyCommands).toContain('go fmt ./...');
      expect(config.verifyCommands).toContain('go vet ./...');
      expect(config.verifyCommands).toContain('go test ./...');
      expect(config.verifyCommands).toContain('go build ./...');
    });
  });

  describe('Rust detection', () => {
    it('should detect Rust project', () => {
      const projectDir = path.join(testDir, 'rust-project');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'Cargo.toml'), '[package]');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('rust');
      expect(config.testFramework).toBe('cargo test');
      expect(config.buildTool).toBe('cargo');
      expect(config.verifyCommands).toContain('cargo fmt -- --check');
      expect(config.verifyCommands).toContain('cargo clippy -- -D warnings');
      expect(config.verifyCommands).toContain('cargo test');
      expect(config.verifyCommands).toContain('cargo build');
    });
  });

  describe('Java detection', () => {
    it('should detect Maven project', () => {
      const projectDir = path.join(testDir, 'maven-project');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'pom.xml'), '<project></project>');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('java');
      expect(config.buildTool).toBe('maven');
      expect(config.verifyCommands).toContain('mvn test');
      expect(config.verifyCommands).toContain('mvn package');
    });

    it('should detect Gradle project', () => {
      const projectDir = path.join(testDir, 'gradle-project');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'build.gradle'), '');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('java');
      expect(config.buildTool).toBe('gradle');
      expect(config.verifyCommands).toContain('./gradlew test');
      expect(config.verifyCommands).toContain('./gradlew build');
    });
  });

  describe('Kotlin detection', () => {
    it('should detect Kotlin project with Gradle wrapper', () => {
      const projectDir = path.join(testDir, 'kotlin-project-wrapper');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'build.gradle.kts'), 'plugins { kotlin("jvm") }');
      fs.writeFileSync(path.join(projectDir, 'gradlew'), '#!/bin/bash');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('kotlin');
      expect(config.buildTool).toBe('gradle');
      expect(config.verifyCommands).toContain('./gradlew test');
      expect(config.verifyCommands).toContain('./gradlew build');
    });

    it('should detect Kotlin project without Gradle wrapper', () => {
      const projectDir = path.join(testDir, 'kotlin-project-no-wrapper');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'build.gradle.kts'), 'plugins { kotlin("jvm") }');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('kotlin');
      expect(config.buildTool).toBe('gradle');
      expect(config.verifyCommands).toContain('gradle test');
      expect(config.verifyCommands).toContain('gradle build');
    });
  });

  describe('Scala detection', () => {
    it('should detect Scala project with sbt', () => {
      const projectDir = path.join(testDir, 'scala-project');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'build.sbt'), 'name := "test"');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('scala');
      expect(config.testFramework).toBe('scalatest');
      expect(config.buildTool).toBe('sbt');
      expect(config.verifyCommands).toContain('sbt test');
      expect(config.verifyCommands).toContain('sbt compile');
    });
  });

  describe('C++ detection', () => {
    it('should detect C++ project with CMake', () => {
      const projectDir = path.join(testDir, 'cpp-cmake-project');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.0)');
      fs.writeFileSync(path.join(projectDir, 'main.cpp'), '// cpp file');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('cpp');
      expect(config.buildTool).toBe('cmake');
      expect(config.verifyCommands).toContain('cmake -B build');
      expect(config.verifyCommands).toContain('cmake --build build');
      expect(config.verifyCommands).toContain('ctest --test-dir build');
    });

    it('should detect C++ project with Makefile', () => {
      const projectDir = path.join(testDir, 'cpp-make-project');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'Makefile'), 'all:\n\tg++ main.cpp');
      fs.writeFileSync(path.join(projectDir, 'main.cpp'), '// cpp file');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('cpp');
      expect(config.buildTool).toBe('make');
      expect(config.verifyCommands).toContain('make');
      expect(config.verifyCommands).toContain('make test');
    });
  });

  describe('PHP detection', () => {
    it('should detect PHP project with composer.json', () => {
      const projectDir = path.join(testDir, 'php-project');
      fs.ensureDirSync(projectDir);

      const composerJson = {
        name: 'test/php-app',
        require: {
          php: '^8.0',
        },
      };

      fs.writeJSONSync(path.join(projectDir, 'composer.json'), composerJson);

      // Create phpunit.xml to trigger phpunit verification
      fs.writeFileSync(path.join(projectDir, 'phpunit.xml'), '<phpunit></phpunit>');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('php');
      expect(config.testFramework).toBe('phpunit');
      expect(config.verifyCommands).toContain('./vendor/bin/phpunit');
    });

    it('should detect Laravel framework', () => {
      const projectDir = path.join(testDir, 'laravel-project');
      fs.ensureDirSync(projectDir);

      const composerJson = {
        name: 'test/laravel-app',
        require: {
          php: '^8.0',
          'laravel/framework': '^10.0',
        },
      };

      fs.writeJSONSync(path.join(projectDir, 'composer.json'), composerJson);

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('php');
      expect(config.framework).toBe('laravel');
      expect(config.testFramework).toBe('phpunit');
    });
  });

  describe('Unknown project', () => {
    it('should return unknown for unrecognized project', () => {
      const projectDir = path.join(testDir, 'unknown-project');
      fs.ensureDirSync(projectDir);

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('unknown');
      expect(config.verifyCommands).toEqual([]);
    });
  });
});
