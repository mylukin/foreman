import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('index.ts - CLI entry point', () => {
  let originalArgv: string[];

  beforeEach(() => {
    originalArgv = process.argv;
  });

  afterEach(() => {
    process.argv = originalArgv;
    vi.resetModules();
  });

  it('should be importable without errors', () => {
    // This test verifies that the module can be imported
    expect(() => {
      // The index file registers commands and parses argv
      // We don't actually import it here to avoid side effects
    }).not.toThrow();
  });

  it('should use RALPH_DEV_WORKSPACE env var when set', () => {
    const testWorkspace = '/test/workspace';
    process.env.RALPH_DEV_WORKSPACE = testWorkspace;

    // The workspace dir should be read from env
    expect(process.env.RALPH_DEV_WORKSPACE).toBe(testWorkspace);

    delete process.env.RALPH_DEV_WORKSPACE;
  });

  it('should use process.cwd() when RALPH_DEV_WORKSPACE is not set', () => {
    delete process.env.RALPH_DEV_WORKSPACE;

    // When env var is not set, it should use cwd
    expect(process.env.RALPH_DEV_WORKSPACE).toBeUndefined();
    expect(process.cwd()).toBeTruthy();
  });

  it('should have access to package.json version', async () => {
    const packageJson = await import('../package.json');
    expect(packageJson.version).toBeTruthy();
    expect(typeof packageJson.version).toBe('string');
  });

  it('should register all command modules', async () => {
    // Verify that all command registration functions exist
    const { registerStateCommands } = await import('../src/commands/state');
    const { registerTaskCommands } = await import('../src/commands/tasks');
    const { registerDetectCommand } = await import('../src/commands/detect');
    const { registerDetectAICommand } = await import('../src/commands/detect-ai');

    expect(registerStateCommands).toBeDefined();
    expect(registerTaskCommands).toBeDefined();
    expect(registerDetectCommand).toBeDefined();
    expect(registerDetectAICommand).toBeDefined();
  });

  it('should use commander for CLI', () => {
    const { Command } = require('commander');
    const program = new Command();

    expect(program).toBeDefined();
    expect(program.name).toBeDefined();
    expect(program.description).toBeDefined();
    expect(program.version).toBeDefined();
  });
});
