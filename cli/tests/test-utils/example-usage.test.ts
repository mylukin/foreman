/**
 * Example usage of test-utils mock factories
 *
 * This file demonstrates real-world usage patterns for the mock factories
 * in integration-style tests.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  MockFileSystem,
  MockGitService,
  MockLogger,
  testTasks,
  testStates,
  testLanguageConfigs,
  testTaskFileContent,
} from '../../src/test-utils/index';

/**
 * Example: Testing a service that coordinates multiple infrastructure dependencies
 */
describe('Example: Task Workflow Service', () => {
  let mockFs: MockFileSystem;
  let mockGit: MockGitService;
  let mockLogger: MockLogger;

  beforeEach(() => {
    // Arrange - Set up fresh mocks for each test
    mockFs = new MockFileSystem();
    mockGit = new MockGitService();
    mockLogger = new MockLogger();
  });

  afterEach(() => {
    // Cleanup - Reset mocks after each test
    mockFs.reset();
    mockGit.reset();
    mockLogger.reset();
  });

  it('should complete full task workflow', async () => {
    // Arrange - Set up initial state
    const task = testTasks.basicPending;
    const taskPath = `/tasks/${task.module}/${task.id}.md`;

    // Act 1 - Create task file
    await mockFs.writeFile(taskPath, testTaskFileContent);
    mockLogger.info('Task file created', { taskId: task.id });

    // Assert 1 - Verify file was created
    expect(mockFs.hasFile(taskPath)).toBe(true);
    expect(mockLogger.wasInfoCalledWith('Task file created')).toBe(true);

    // Act 2 - Start working on task (stash changes)
    await mockGit.stash('WIP: Starting task ' + task.id);
    mockLogger.debug('Changes stashed', { taskId: task.id });

    // Assert 2 - Verify git stash was called
    expect(mockGit.wasStashCalled()).toBe(true);
    expect(mockGit.getLastStashCall()?.message).toContain(task.id);

    // Act 3 - Complete task and commit
    await mockGit.commit(`feat: Complete ${task.id}`);
    mockLogger.info('Task completed and committed', { taskId: task.id });

    // Assert 3 - Verify commit was made
    expect(mockGit.wasCommitCalled()).toBe(true);
    expect(mockGit.getLastCommitCall()?.message).toContain(task.id);

    // Act 4 - Push changes
    await mockGit.push('origin', 'main');
    mockLogger.info('Changes pushed to remote');

    // Assert 4 - Verify push was called
    expect(mockGit.wasPushCalled()).toBe(true);
    expect(mockGit.getLastPushCall()?.remote).toBe('origin');
    expect(mockGit.getLastPushCall()?.branch).toBe('main');

    // Final assertions - Verify complete workflow
    const logCounts = mockLogger.getLogCounts();
    expect(logCounts.info).toBe(3);
    expect(logCounts.debug).toBe(1);
  });

  it('should handle task failure with proper rollback', async () => {
    // Arrange - Set up task and simulate commit failure
    const task = testTasks.basicPending;
    mockGit.shouldThrowOnCommit = true;

    // Act - Try to complete task
    await mockFs.writeFile(`/tasks/${task.module}/${task.id}.md`, testTaskFileContent);
    mockLogger.info('Task file created');

    let commitError: Error | undefined;
    try {
      await mockGit.commit('feat: Complete task');
    } catch (error: any) {
      commitError = error;
      mockLogger.error('Commit failed', error);
    }

    // Assert - Verify error handling
    expect(commitError).toBeDefined();
    expect(mockLogger.wasErrorCalled()).toBe(true);
    expect(mockGit.wasCommitCalled()).toBe(true);
    expect(mockGit.wasPushCalled()).toBe(false); // Push should not be called after commit failure
  });
});

/**
 * Example: Testing language detection with different configurations
 */
describe('Example: Language Configuration Service', () => {
  let mockFs: MockFileSystem;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockFs = new MockFileSystem();
    mockLogger = new MockLogger();
  });

  it('should detect TypeScript project', async () => {
    // Arrange - Create TypeScript project files
    await mockFs.writeFile('/package.json', JSON.stringify({
      name: 'test-project',
      dependencies: {
        'typescript': '^5.0.0',
        'react': '^18.0.0',
      },
    }));
    await mockFs.writeFile('/tsconfig.json', JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
      },
    }));

    // Act - Detect language
    const hasPackageJson = await mockFs.exists('/package.json');
    const hasTsConfig = await mockFs.exists('/tsconfig.json');
    const config = hasPackageJson && hasTsConfig ? testLanguageConfigs.typescript : null;

    mockLogger.info('Language detected', { language: config?.language });

    // Assert
    expect(config).not.toBeNull();
    expect(config?.language).toBe('typescript');
    expect(config?.framework).toBe('react');
    expect(config?.verifyCommands).toContain('tsc --noEmit');
    expect(mockLogger.wasInfoCalledWith('Language detected')).toBe(true);
  });

  it('should detect Python project', async () => {
    // Arrange - Create Python project files
    await mockFs.writeFile('/requirements.txt', 'django==4.2.0\npytest==7.4.0');
    await mockFs.writeFile('/manage.py', '#!/usr/bin/env python\n# Django management script');

    // Act - Detect language
    const hasRequirements = await mockFs.exists('/requirements.txt');
    const config = hasRequirements ? testLanguageConfigs.python : null;

    mockLogger.info('Language detected', { language: config?.language });

    // Assert
    expect(config).not.toBeNull();
    expect(config?.language).toBe('python');
    expect(config?.framework).toBe('django');
    expect(config?.testFramework).toBe('pytest');
  });
});

/**
 * Example: Testing state transitions
 */
describe('Example: State Management Service', () => {
  let mockFs: MockFileSystem;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockFs = new MockFileSystem();
    mockLogger = new MockLogger();
  });

  it('should transition through all phases', async () => {
    // Act & Assert - Phase 1: Clarify
    const clarifyState = testStates.clarify;
    await mockFs.writeFile('/state.json', JSON.stringify(clarifyState));
    mockLogger.info('Phase transition', { from: null, to: 'clarify' });

    expect(clarifyState.phase).toBe('clarify');
    expect(mockLogger.wasInfoCalled()).toBe(true);

    // Act & Assert - Phase 2: Breakdown
    const breakdownState = testStates.breakdown;
    await mockFs.writeFile('/state.json', JSON.stringify(breakdownState));
    mockLogger.info('Phase transition', { from: 'clarify', to: 'breakdown' });

    expect(breakdownState.phase).toBe('breakdown');
    expect(breakdownState.prd).toBeDefined();

    // Act & Assert - Phase 3: Implement
    const implementState = testStates.implement;
    await mockFs.writeFile('/state.json', JSON.stringify(implementState));
    mockLogger.info('Phase transition', { from: 'breakdown', to: 'implement' });

    expect(implementState.phase).toBe('implement');
    expect(implementState.currentTask).toBe('auth.login.ui');

    // Act & Assert - Phase 4: Heal (if errors)
    const healState = testStates.heal;
    await mockFs.writeFile('/state.json', JSON.stringify(healState));
    mockLogger.warn('Entering heal phase', { errors: healState.errors?.length });

    expect(healState.phase).toBe('heal');
    expect(healState.errors).toHaveLength(2);

    // Act & Assert - Phase 5: Deliver
    const deliverState = testStates.deliver;
    await mockFs.writeFile('/state.json', JSON.stringify(deliverState));
    mockLogger.info('Phase transition', { from: 'heal', to: 'deliver' });

    expect(deliverState.phase).toBe('deliver');

    // Final assertions
    const logCounts = mockLogger.getLogCounts();
    expect(logCounts.info).toBeGreaterThan(0);
    expect(logCounts.warn).toBeGreaterThan(0);
  });
});

/**
 * Example: Testing complex file operations
 */
describe('Example: File System Operations', () => {
  let mockFs: MockFileSystem;

  beforeEach(() => {
    mockFs = new MockFileSystem();
  });

  it('should create nested project structure', async () => {
    // Arrange - Define project structure
    const files = [
      '/src/components/Auth/Login.tsx',
      '/src/components/Auth/Signup.tsx',
      '/src/services/api.ts',
      '/src/utils/validation.ts',
      '/tests/components/Login.test.tsx',
      '/tests/services/api.test.ts',
    ];

    // Act - Create all files
    for (const file of files) {
      await mockFs.writeFile(file, `// ${file}`);
    }

    // Assert - Verify structure
    expect(mockFs.getAllFiles()).toHaveLength(6);
    expect(mockFs.hasDirectory('/src')).toBe(true);
    expect(mockFs.hasDirectory('/src/components')).toBe(true);
    expect(mockFs.hasDirectory('/src/components/Auth')).toBe(true);

    // Assert - Verify directory listing
    const srcFiles = await mockFs.readdir('/src');
    expect(srcFiles).toContain('components');
    expect(srcFiles).toContain('services');
    expect(srcFiles).toContain('utils');

    const authFiles = await mockFs.readdir('/src/components/Auth');
    expect(authFiles).toEqual(['Login.tsx', 'Signup.tsx']);
  });

  it('should clean up project structure', async () => {
    // Arrange - Create files
    await mockFs.writeFile('/build/output.js', 'content');
    await mockFs.writeFile('/build/output.js.map', 'content');
    await mockFs.writeFile('/dist/bundle.js', 'content');

    // Act - Clean up build artifacts
    await mockFs.remove('/build');
    await mockFs.remove('/dist');

    // Assert - Verify cleanup
    expect(await mockFs.exists('/build')).toBe(false);
    expect(await mockFs.exists('/dist')).toBe(false);
    expect(mockFs.getAllFiles()).toHaveLength(0);
  });
});

/**
 * Example: Testing with pre-configured test data
 */
describe('Example: Using Test Fixtures', () => {
  it('should use task fixtures', () => {
    // Use different task states
    expect(testTasks.basicPending.status).toBe('pending');
    expect(testTasks.inProgress.status).toBe('in_progress');
    expect(testTasks.completed.status).toBe('completed');
    expect(testTasks.blocked.status).toBe('blocked');
    expect(testTasks.failed.status).toBe('failed');

    // Use high priority task
    expect(testTasks.highPriority.priority).toBe(5);
    expect(testTasks.highPriority.estimatedMinutes).toBe(60);
  });

  it('should use state fixtures', () => {
    // Verify each phase has correct structure
    expect(testStates.clarify.phase).toBe('clarify');
    expect(testStates.breakdown.phase).toBe('breakdown');
    expect(testStates.breakdown.prd).toBeDefined();
    expect(testStates.implement.currentTask).toBeDefined();
    expect(testStates.heal.errors).toBeDefined();
    expect(testStates.deliver.phase).toBe('deliver');
  });

  it('should use language config fixtures', () => {
    // Verify TypeScript config
    expect(testLanguageConfigs.typescript.language).toBe('typescript');
    expect(testLanguageConfigs.typescript.verifyCommands).toContain('tsc --noEmit');

    // Verify Go config
    expect(testLanguageConfigs.go.language).toBe('go');
    expect(testLanguageConfigs.go.verifyCommands).toContain('go vet ./...');

    // Verify Rust config
    expect(testLanguageConfigs.rust.language).toBe('rust');
    expect(testLanguageConfigs.rust.verifyCommands).toContain('cargo clippy');
  });
});
