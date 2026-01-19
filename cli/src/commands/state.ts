import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';

interface State {
  phase: 'clarify' | 'breakdown' | 'implement' | 'heal' | 'deliver';
  currentTask?: string;
  prd?: any;
  errors?: any[];
  startedAt: string;
  updatedAt: string;
}

export function registerStateCommands(program: Command, workspaceDir: string): void {
  const stateFile = path.join(workspaceDir, '.ralph-dev', 'state.json');

  const state = program.command('state').description('Manage ralph-dev state');

  // Get current state
  state
    .command('get')
    .description('Get current ralph-dev state')
    .option('--json', 'Output as JSON')
    .action((options) => {
      if (!fs.existsSync(stateFile)) {
        if (options.json) {
          console.log(JSON.stringify({ phase: 'none' }, null, 2));
        } else {
          console.log(chalk.yellow('No active ralph-dev session'));
        }
        return;
      }

      const state: State = fs.readJSONSync(stateFile);

      if (options.json) {
        console.log(JSON.stringify(state, null, 2));
      } else {
        console.log(chalk.bold('Current State:'));
        console.log(`Phase: ${chalk.cyan(state.phase)}`);
        if (state.currentTask) {
          console.log(`Current Task: ${chalk.green(state.currentTask)}`);
        }
        console.log(`Started: ${state.startedAt}`);
        console.log(`Updated: ${state.updatedAt}`);
      }
    });

  // Set state
  state
    .command('set')
    .description('Set ralph-dev state')
    .requiredOption('-p, --phase <phase>', 'Current phase')
    .option('-t, --task <taskId>', 'Current task ID')
    .action((options) => {
      const newState: State = {
        phase: options.phase,
        currentTask: options.task,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (fs.existsSync(stateFile)) {
        const existingState: State = fs.readJSONSync(stateFile);
        newState.startedAt = existingState.startedAt;
        newState.prd = existingState.prd;
        newState.errors = existingState.errors;
      }

      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, newState, { spaces: 2 });

      console.log(chalk.green('✓ State updated'));
    });

  // Update state field
  state
    .command('update')
    .description('Update specific state fields')
    .option('--phase <phase>', 'Update phase')
    .option('--task <taskId>', 'Update current task')
    .option('--prd <prdJson>', 'Update PRD (JSON string)')
    .option('--add-error <errorJson>', 'Add error (JSON string)')
    .action((options) => {
      if (!fs.existsSync(stateFile)) {
        console.error(chalk.red('No active state to update'));
        process.exit(1);
      }

      const state: State = fs.readJSONSync(stateFile);

      if (options.phase) state.phase = options.phase;
      if (options.task) state.currentTask = options.task;
      if (options.prd) state.prd = JSON.parse(options.prd);
      if (options.addError) {
        state.errors = state.errors || [];
        state.errors.push(JSON.parse(options.addError));
      }

      state.updatedAt = new Date().toISOString();

      fs.writeJSONSync(stateFile, state, { spaces: 2 });

      console.log(chalk.green('✓ State updated'));
    });

  // Clear state
  state
    .command('clear')
    .description('Clear ralph-dev state')
    .action(() => {
      if (fs.existsSync(stateFile)) {
        fs.removeSync(stateFile);
        console.log(chalk.green('✓ State cleared'));
      } else {
        console.log(chalk.yellow('No state to clear'));
      }
    });
}
