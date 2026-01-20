import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { IIndexRepository } from '../repositories/index-repository';
import { FileSystemIndexRepository } from '../repositories/index-repository.service';
import { FileSystemService } from '../infrastructure/file-system.service';
import { ExitCode } from '../core/exit-codes';
import { handleError, Errors } from '../core/error-handler';
import { successResponse, outputResponse } from '../core/response-wrapper';
import { createTaskService } from './service-factory';
import { Task } from '../domain/task-entity';

/**
 * Helper function to gather context for next task display
 */
async function gatherContext(workspaceDir: string, indexRepository: IIndexRepository, task: Task): Promise<any> {
  const context: any = {};

  // Current directory
  context.currentDirectory = process.cwd();

  // Git information
  try {
    const gitBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
    const gitLog = execSync('git log -1 --pretty=format:"%h|%s|%ar"', { encoding: 'utf-8' }).trim();
    const [hash, message, time] = gitLog.split('|');
    context.git = {
      branch: gitBranch,
      lastCommit: { hash, message, time },
    };
  } catch (error) {
    context.git = { error: 'Not a git repository or no commits' };
  }

  // State context
  const stateFile = path.join(workspaceDir, '.ralph-dev', 'state.json');
  if (fs.existsSync(stateFile)) {
    context.state = fs.readJSONSync(stateFile);
  }

  // Progress statistics
  const index = await indexRepository.read();
  const allTasks = Object.entries(index.tasks);
  const completed = allTasks.filter(([, t]) => t.status === 'completed').length;
  const failed = allTasks.filter(([, t]) => t.status === 'failed').length;
  const inProgress = allTasks.filter(([, t]) => t.status === 'in_progress').length;
  const pending = allTasks.filter(([, t]) => t.status === 'pending').length;
  const total = allTasks.length;

  context.progress = {
    completed,
    failed,
    inProgress,
    pending,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };

  // Recent activity from progress.log
  const progressLog = path.join(workspaceDir, '.ralph-dev', 'progress.log');
  context.recentActivity = [];
  if (fs.existsSync(progressLog)) {
    try {
      const logContent = fs.readFileSync(progressLog, 'utf-8');
      const lines = logContent.trim().split('\n');
      context.recentActivity = lines.slice(-5);
    } catch (error) {
      context.recentActivity = ['Unable to read progress log'];
    }
  }

  // Check task dependencies
  const dependencyStatus: any[] = [];
  if (task.dependencies && task.dependencies.length > 0) {
    task.dependencies.forEach(depId => {
      const depTask = index.tasks[depId];
      if (depTask) {
        dependencyStatus.push({
          id: depId,
          status: depTask.status,
          satisfied: depTask.status === 'completed',
        });
      } else {
        dependencyStatus.push({
          id: depId,
          status: 'unknown',
          satisfied: false,
        });
      }
    });
  }

  context.dependencyStatus = dependencyStatus;

  return context;
}

/**
 * Helper function to format next task output
 */
function formatNextTaskOutput(task: Task, context: any): void {
  console.log(chalk.bold('┌─────────────────────────────────────────────────────────────────┐'));
  console.log(chalk.bold('│ 📍 CONTEXT                                                      │'));
  console.log(chalk.bold('├─────────────────────────────────────────────────────────────────┤'));
  console.log(`│ ${chalk.gray('Current Directory:')} ${chalk.cyan(context.currentDirectory.slice(-50))}`);

  if (context.git.branch) {
    console.log(`│ ${chalk.gray('Git Branch:')} ${chalk.green(context.git.branch)}`);
    console.log(`│ ${chalk.gray('Last Commit:')} ${chalk.yellow(context.git.lastCommit.hash)} "${context.git.lastCommit.message.slice(0, 35)}" ${chalk.gray(context.git.lastCommit.time)}`);
  }

  if (context.state) {
    console.log(`│ ${chalk.gray('Phase:')} ${chalk.magenta(context.state.phase)} ${chalk.gray('(Phase 3/5)')}`);
  }

  console.log(`│ ${chalk.gray('Progress:')} ${chalk.green(context.progress.completed)}/${context.progress.total} tasks completed (${context.progress.percentage}%)`);
  if (context.progress.failed > 0) {
    console.log(`│ ${chalk.gray('Failed:')} ${chalk.red(context.progress.failed)} tasks`);
  }
  if (context.progress.inProgress > 0) {
    console.log(`│ ${chalk.gray('In Progress:')} ${chalk.yellow(context.progress.inProgress)} tasks`);
  }

  console.log(chalk.bold('├─────────────────────────────────────────────────────────────────┤'));
  console.log(chalk.bold('│ 📝 NEXT TASK                                                    │'));
  console.log(chalk.bold('├─────────────────────────────────────────────────────────────────┤'));
  console.log(`│ ${chalk.gray('ID:')} ${chalk.cyan(task.id)}`);
  console.log(`│ ${chalk.gray('Module:')} ${chalk.blue(task.module)}`);
  console.log(`│ ${chalk.gray('Priority:')} P${task.priority}`);
  console.log(`│ ${chalk.gray('Estimated:')} ${task.estimatedMinutes} min`);
  console.log(`│ ${chalk.gray('Status:')} ${chalk.yellow(task.status)}`);
  console.log(chalk.bold('├─────────────────────────────────────────────────────────────────┤'));
  console.log(chalk.bold('│ Description:                                                    │'));
  console.log(`│ ${task.description}`);

  console.log(chalk.bold('├─────────────────────────────────────────────────────────────────┤'));
  console.log(chalk.bold('│ Acceptance Criteria:                                            │'));
  task.acceptanceCriteria.forEach((criterion, index) => {
    console.log(`│ ${chalk.green(`${index + 1}.`)} ${criterion.slice(0, 58)}`);
  });

  if (context.dependencyStatus && context.dependencyStatus.length > 0) {
    console.log(chalk.bold('├─────────────────────────────────────────────────────────────────┤'));
    console.log(chalk.bold('│ Dependencies:                                                   │'));
    context.dependencyStatus.forEach((dep: any) => {
      const icon = dep.satisfied ? '✅' : '❌';
      const statusColor = dep.satisfied ? 'green' : 'red';
      console.log(`│ ${icon} ${dep.id} (${chalk[statusColor](dep.status)})`);
    });
  }

  if (task.testRequirements) {
    console.log(chalk.bold('├─────────────────────────────────────────────────────────────────┤'));
    console.log(chalk.bold('│ Test Requirements:                                              │'));
    if (task.testRequirements.unit) {
      console.log(`│ ${chalk.gray('Unit:')} ${task.testRequirements.unit.pattern} ${task.testRequirements.unit.required ? chalk.red('(required)') : chalk.gray('(optional)')}`);
    }
    if (task.testRequirements.e2e) {
      console.log(`│ ${chalk.gray('E2E:')} ${task.testRequirements.e2e.pattern} ${task.testRequirements.e2e.required ? chalk.red('(required)') : chalk.gray('(optional)')}`);
    }
  }

  if (context.recentActivity && context.recentActivity.length > 0) {
    console.log(chalk.bold('├─────────────────────────────────────────────────────────────────┤'));
    console.log(chalk.bold('│ 📊 RECENT ACTIVITY (from progress.log)                          │'));
    console.log(chalk.bold('├─────────────────────────────────────────────────────────────────┤'));
    context.recentActivity.forEach((line: string) => {
      console.log(`│ ${chalk.gray(line.slice(0, 63))}`);
    });
  }

  console.log(chalk.bold('└─────────────────────────────────────────────────────────────────┘'));
}

export function registerTaskCommands(program: Command, workspaceDir: string): void {
  const tasksDir = path.join(workspaceDir, '.ralph-dev', 'tasks');
  const fileSystem = new FileSystemService();
  const indexRepository = new FileSystemIndexRepository(fileSystem, tasksDir);
  const taskService = createTaskService(workspaceDir);

  const tasks = program.command('tasks').description('Manage tasks');

  // Initialize tasks system
  tasks
    .command('init')
    .description('Initialize tasks directory and index')
    .option('--project-goal <goal>', 'Project goal description')
    .option('--language <language>', 'Programming language')
    .option('--framework <framework>', 'Framework name')
    .action(async (options) => {
      const index = await indexRepository.read();

      if (options.projectGoal) {
        index.metadata.projectGoal = options.projectGoal;
      }

      if (options.language || options.framework) {
        index.metadata.languageConfig = {
          language: options.language || 'typescript',
          framework: options.framework || '',
        };
      }

      await indexRepository.write(index);
      console.log(chalk.green('✅ Tasks system initialized'));
      console.log(chalk.gray(`   Location: ${tasksDir}/index.json`));
    });

  // Create a new task
  tasks
    .command('create')
    .description('Create a new task')
    .requiredOption('--id <id>', 'Task ID (e.g., auth.signup.ui)')
    .requiredOption('--module <module>', 'Module name (e.g., auth)')
    .option('--priority <priority>', 'Priority (default: 1)', '1')
    .option('--estimated-minutes <minutes>', 'Estimated minutes (default: 30)', '30')
    .requiredOption('--description <desc>', 'Task description')
    .option('--criteria <criteria...>', 'Acceptance criteria (can specify multiple)')
    .option('--dependencies <deps...>', 'Task dependencies')
    .option('--test-pattern <pattern>', 'Test file pattern')
    .action(async (options) => {
      try {
        // Call service to create task
        const task = await taskService.createTask({
          id: options.id,
          module: options.module,
          priority: parseInt(options.priority),
          estimatedMinutes: parseInt(options.estimatedMinutes),
          description: options.description,
          acceptanceCriteria: options.criteria,
          dependencies: options.dependencies,
          testPattern: options.testPattern,
        });

        // Format output
        console.log(chalk.green(`✅ Task ${task.id} created`));
        console.log(chalk.gray(`   Module: ${task.module}`));
        console.log(chalk.gray(`   Priority: ${task.priority}`));
        console.log(chalk.gray(`   Estimated: ${task.estimatedMinutes} min`));
      } catch (error) {
        handleError(error as any, false);
      }
    });

  // List all tasks
  tasks
    .command('list')
    .description('List all tasks with advanced filtering')
    .option('-s, --status <status>', 'Filter by status (pending|in_progress|completed|failed)')
    .option('-m, --module <module>', 'Filter by module name')
    .option('-p, --priority <priority>', 'Filter by priority level')
    .option('--has-dependencies', 'Only show tasks with dependencies')
    .option('--ready', 'Only show tasks with satisfied dependencies')
    .option('--limit <n>', 'Limit number of results', '100')
    .option('--offset <n>', 'Skip first n results', '0')
    .option('--sort <field>', 'Sort by field (priority|status|estimatedMinutes)', 'priority')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        // Call service with filters
        const result = await taskService.listTasks({
          filter: {
            status: options.status,
            module: options.module,
            priority: options.priority ? parseInt(options.priority) : undefined,
            hasDependencies: options.hasDependencies,
            ready: options.ready,
          },
          limit: parseInt(options.limit),
          offset: parseInt(options.offset),
          sort: options.sort,
        });

        // Format output
        const response = successResponse(result);
        outputResponse(response, options.json, (data) => {
          console.log(chalk.bold(`Tasks (${data.returned} of ${data.total}):`));
          data.tasks.forEach((task: any) => {
            const statusColor =
              task.status === 'completed' ? 'green' :
                task.status === 'in_progress' ? 'yellow' :
                  task.status === 'failed' ? 'red' : 'gray';

            console.log(
              `  ${chalk[statusColor](`[${task.status}]`)} ` +
              `${chalk.cyan(task.id)} (P${task.priority}) - ${task.description}`
            );
          });

          if (data.total > data.returned) {
            console.log(chalk.gray(`\n  Showing ${data.offset + 1}-${data.offset + data.returned} of ${data.total}`));
            console.log(chalk.gray(`  Use --offset and --limit for pagination`));
          }
        });

        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        handleError(Errors.fileSystemError('Failed to list tasks', error), options.json);
      }
    });

  // Get next task
  tasks
    .command('next')
    .description('Get next task to work on with comprehensive context')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        // Call service to get next task
        const task = await taskService.getNextTask();

        if (!task) {
          if (options.json) {
            console.log(JSON.stringify({ error: 'No pending tasks' }, null, 2));
          } else {
            console.log(chalk.yellow('No pending tasks'));
          }
          return;
        }

        // Gather context (keep in command for now - presentation logic)
        const context = await gatherContext(workspaceDir, indexRepository, task);

        // Format output
        if (options.json) {
          console.log(JSON.stringify({ task: task.toJSON(), context }, null, 2));
        } else {
          formatNextTaskOutput(task, context);
        }
      } catch (error) {
        handleError(error as any, options.json);
      }
    });

  // Get specific task
  tasks
    .command('get <taskId>')
    .description('Get task details')
    .option('--json', 'Output as JSON')
    .action(async (taskId, options) => {
      try {
        // Call service to get task
        const task = await taskService.getTask(taskId);

        if (!task) {
          handleError(Errors.taskNotFound(taskId), options.json);
          return;
        }

        // Format output
        if (options.json) {
          console.log(JSON.stringify(task.toJSON(), null, 2));
        } else {
          console.log(chalk.bold(`Task: ${chalk.cyan(task.id)}`));
          console.log(`Module: ${task.module}`);
          console.log(`Priority: ${task.priority}`);
          console.log(`Status: ${task.status}`);
          console.log(`\nDescription: ${task.description}`);

          console.log(chalk.bold('\nAcceptance Criteria:'));
          task.acceptanceCriteria.forEach((criterion, index) => {
            console.log(`  ${index + 1}. ${criterion}`);
          });

          if (task.notes) {
            console.log(chalk.bold('\nNotes:'));
            console.log(task.notes);
          }
        }
      } catch (error) {
        handleError(error as any, options.json);
      }
    });

  // Update task status
  tasks
    .command('done <taskId>')
    .description('Mark task as completed')
    .option('-d, --duration <duration>', 'Task duration (e.g., "4m 32s")')
    .option('--json', 'Output as JSON')
    .option('--dry-run', 'Preview changes without executing')
    .action(async (taskId, options) => {
      try {
        // Dry-run mode
        if (options.dryRun) {
          const task = await taskService.getTask(taskId);
          if (!task) {
            handleError(Errors.taskNotFound(taskId), options.json);
            return;
          }

          const response = successResponse({
            dryRun: true,
            wouldUpdate: {
              taskId,
              currentStatus: task.status,
              newStatus: 'completed',
            },
          });
          outputResponse(response, options.json, (data) => {
            console.log(chalk.cyan('🔍 Dry-run mode (no changes will be made)'));
            console.log(`  Task: ${taskId}`);
            console.log(`  Current status: ${data.wouldUpdate.currentStatus}`);
            console.log(`  New status: ${data.wouldUpdate.newStatus}`);
          });
          process.exit(ExitCode.SUCCESS);
          return;
        }

        // Call service to complete task
        const task = await taskService.completeTask(taskId, options.duration);

        const response = successResponse({
          taskId: task.id,
          status: task.status,
          duration: options.duration,
        });

        outputResponse(response, options.json, (data) => {
          console.log(chalk.green(`✓ Task ${data.taskId} marked as completed`));
          if (data.duration) {
            console.log(`  Duration: ${data.duration}`);
          }
        });

        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        handleError(Errors.fileSystemError('Failed to mark task as done', error), options.json);
      }
    });

  // Mark task as failed
  tasks
    .command('fail <taskId>')
    .description('Mark task as failed')
    .requiredOption('-r, --reason <reason>', 'Failure reason')
    .option('--json', 'Output as JSON')
    .option('--dry-run', 'Preview changes without executing')
    .action(async (taskId, options) => {
      try {
        // Dry-run mode
        if (options.dryRun) {
          const task = await taskService.getTask(taskId);
          if (!task) {
            handleError(Errors.taskNotFound(taskId), options.json);
            return;
          }

          const response = successResponse({
            dryRun: true,
            wouldUpdate: {
              taskId,
              currentStatus: task.status,
              newStatus: 'failed',
              reason: options.reason,
            },
          });
          outputResponse(response, options.json, (data) => {
            console.log(chalk.cyan('🔍 Dry-run mode (no changes will be made)'));
            console.log(`  Task: ${taskId}`);
            console.log(`  Current status: ${data.wouldUpdate.currentStatus}`);
            console.log(`  New status: ${data.wouldUpdate.newStatus}`);
            console.log(`  Reason: ${data.wouldUpdate.reason}`);
          });
          process.exit(ExitCode.SUCCESS);
          return;
        }

        // Call service to fail task
        const task = await taskService.failTask(taskId, options.reason);

        const response = successResponse({
          taskId: task.id,
          status: task.status,
          reason: options.reason,
        });

        outputResponse(response, options.json, (data) => {
          console.log(chalk.red(`✗ Task ${data.taskId} marked as failed`));
          console.log(`  Reason: ${data.reason}`);
        });

        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        handleError(Errors.fileSystemError('Failed to mark task as failed', error), options.json);
      }
    });

  // Mark task as in progress
  tasks
    .command('start <taskId>')
    .description('Mark task as in progress')
    .option('--json', 'Output as JSON')
    .option('--dry-run', 'Preview changes without executing')
    .action(async (taskId, options) => {
      try {
        // Dry-run mode
        if (options.dryRun) {
          const task = await taskService.getTask(taskId);
          if (!task) {
            handleError(Errors.taskNotFound(taskId), options.json);
            return;
          }

          const response = successResponse({
            dryRun: true,
            wouldUpdate: {
              taskId,
              currentStatus: task.status,
              newStatus: 'in_progress',
            },
          });
          outputResponse(response, options.json, (data) => {
            console.log(chalk.cyan('🔍 Dry-run mode (no changes will be made)'));
            console.log(`  Task: ${taskId}`);
            console.log(`  Current status: ${data.wouldUpdate.currentStatus}`);
            console.log(`  New status: ${data.wouldUpdate.newStatus}`);
          });
          process.exit(ExitCode.SUCCESS);
          return;
        }

        // Call service to start task
        const task = await taskService.startTask(taskId);

        const response = successResponse({
          taskId: task.id,
          status: task.status,
        });

        outputResponse(response, options.json, (data) => {
          console.log(chalk.yellow(`→ Task ${data.taskId} started`));
        });

        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        handleError(Errors.fileSystemError('Failed to start task', error), options.json);
      }
    });

  // Batch operations for multiple tasks
  tasks
    .command('batch')
    .description('Perform batch operations on multiple tasks')
    .requiredOption('--operations <json>', 'JSON array of operations')
    .option('--atomic', 'Rollback all on any failure (transactional)')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        // Parse operations
        let operations;
        try {
          operations = JSON.parse(options.operations);
        } catch (error) {
          handleError(Errors.invalidJson(error), options.json);
          return;
        }

        if (!Array.isArray(operations)) {
          handleError(Errors.invalidInput('Operations must be a JSON array'), options.json);
          return;
        }

        // Call service to execute batch
        const results = await taskService.batchOperations(operations, options.atomic || false);

        const allSuccessful = results.every(r => r.success);
        const response = successResponse({
          totalOperations: operations.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          allSuccessful,
          results,
        });

        outputResponse(response, options.json, (data) => {
          console.log(chalk.bold('Batch Operations Result:'));
          console.log(`  Total: ${data.totalOperations}`);
          console.log(`  ${chalk.green(`Successful: ${data.successful}`)}`);
          if (data.failed > 0) {
            console.log(`  ${chalk.red(`Failed: ${data.failed}`)}`);
          }
        });

        process.exit(allSuccessful ? ExitCode.SUCCESS : ExitCode.GENERAL_ERROR);
      } catch (error) {
        handleError(Errors.fileSystemError('Failed to execute batch operations', error), options.json);
      }
    });

  // Parse implementation result from agent output
  tasks
    .command('parse-result')
    .description('Parse structured implementation result from agent output (supports tool calling v2 + YAML fallback)')
    .option('--file <path>', 'Path to file containing agent output')
    .option('--text <text>', 'Direct agent output text')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        // Import structured output parser
        const { StructuredOutputParser } = await import('../core/structured-output');

        // Get agent output from file or text
        let agentOutput: string;
        if (options.file) {
          agentOutput = fs.readFileSync(options.file, 'utf-8');
        } else if (options.text) {
          agentOutput = options.text;
        } else {
          handleError(Errors.validationError('Must provide either --file or --text'), options.json);
          return;
        }

        // Parse using multi-strategy parser
        const result = StructuredOutputParser.parseImplementationResult(agentOutput);

        const response = successResponse(result);
        outputResponse(response, options.json, (data) => {
          console.log(chalk.bold('Implementation Result:'));
          console.log(`  Task: ${data.task_id}`);
          console.log(`  Status: ${data.status === 'success' ? chalk.green(data.status) : chalk.red(data.status)}`);
          console.log(`  Verification: ${data.verification_passed ? chalk.green('✓ Passed') : chalk.red('✗ Failed')}`);
          if (data.tests_passing) {
            console.log(`  Tests: ${data.tests_passing}`);
          }
          if (data.coverage !== undefined) {
            console.log(`  Coverage: ${data.coverage}%`);
          }
          if (data.confidence_score !== undefined) {
            console.log(`  Confidence: ${(data.confidence_score * 100).toFixed(0)}%`);
          }
          if (data.notes) {
            console.log(`  Notes: ${data.notes}`);
          }
        });

        process.exit(ExitCode.SUCCESS);
      } catch (error: any) {
        handleError(Errors.parsingError(`Failed to parse implementation result: ${error.message}`, error), options.json);
      }
    });
}
