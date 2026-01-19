#!/usr/bin/env node

import { Command } from 'commander';
import { registerStateCommands } from './commands/state';
import { registerTaskCommands } from './commands/tasks';
import { registerDetectCommand } from './commands/detect';
import { registerDetectAICommand } from './commands/detect-ai';
import { version } from '../package.json';

const program = new Command();

// Get workspace directory (default to current directory)
const workspaceDir = process.env.FOREMAN_WORKSPACE || process.cwd();

program
  .name('ralph-dev')
  .description('CLI tool for Foreman - efficient operations for AI agents')
  .version(version);

// Register command groups
registerStateCommands(program, workspaceDir);
registerTaskCommands(program, workspaceDir);
registerDetectCommand(program, workspaceDir);
registerDetectAICommand(program, workspaceDir);

// Parse command line arguments
program.parse(process.argv);
