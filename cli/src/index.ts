#!/usr/bin/env node

import { Command } from 'commander';
import { registerStateCommands } from './commands/state';
import { registerTaskCommands } from './commands/tasks';
import { registerStatusCommand } from './commands/status';
import { registerDetectCommand } from './commands/detect';
import { registerDetectAICommand } from './commands/detect-ai';
import { registerInitCommand } from './commands/init';
import { version } from '../package.json';

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

// Parse command line arguments
program.parse(process.argv);
