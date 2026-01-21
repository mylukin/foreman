#!/usr/bin/env node

import { Command } from 'commander';
import { registerStateCommands } from './commands/state';
import { registerTaskCommands } from './commands/tasks';
import { registerStatusCommand } from './commands/status';
import { registerDetectCommand } from './commands/detect';
import { registerDetectAICommand } from './commands/detect-ai';
import { registerInitCommand } from './commands/init';
import { registerCircuitBreakerCommand } from './commands/circuit-breaker';
import { registerUpdateCommand } from './commands/update';
import { createAutoUpdateService } from './services/auto-update.service';
import { version, name } from '../package.json';

const program = new Command();

// Get workspace directory (default to current directory)
const workspaceDir = process.env.RALPH_DEV_WORKSPACE || process.cwd();

program
  .name('ralph-dev')
  .description('CLI tool for Ralph-dev - efficient operations for AI agents')
  .version(version);

// Register command groups
registerStateCommands(program, workspaceDir);
registerTaskCommands(program, workspaceDir);
registerStatusCommand(program, workspaceDir);
registerDetectCommand(program, workspaceDir);
registerDetectAICommand(program, workspaceDir);
registerInitCommand(program, workspaceDir);
registerCircuitBreakerCommand(program, workspaceDir);
registerUpdateCommand(program);

// Auto-update check (non-blocking, runs in background)
// Skip if NO_UPDATE_NOTIFIER is set or in CI environment
const shouldCheckUpdate = !process.env.NO_UPDATE_NOTIFIER && !process.env.CI;

if (shouldCheckUpdate) {
  const updateService = createAutoUpdateService(name, version, {
    autoUpdate: false, // Don't auto-update, just show notification
  });

  // Show update notification (non-blocking)
  updateService.notify();
}

// Parse command line arguments
program.parse(process.argv);
