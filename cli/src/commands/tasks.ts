import { Command } from 'commander';
import * as path from 'path';
import chalk from 'chalk';
import { ExitCode } from '../core/exit-codes';
import { handleError, Errors } from '../core/error-handler';
import { successResponse, outputResponse } from '../core/response-wrapper';
import { createTaskService, createContextService } from './service-factory';
import { Task } from '../domain/task-entity';
import { FileSystemIndexRepository } from '../repositories/index-repository.service';
import { FileSystemService } from '../infrastructure/file-system.service';


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
    if (context.git.recentCommits && context.git.recentCommits.length > 0) {
      console.log(`│ ${chalk.gray('Recent Commits:')}`);
      context.git.recentCommits.forEach((commit: any, index: number) => {
        const prefix = index === 0 ? '  └─' : '    ';
        console.log(`│ ${prefix} ${chalk.yellow(commit.hash)} "${commit.message.slice(0, 35)}" ${chalk.gray(commit.time)}`);
      });
    }
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
  const taskService = createTaskService(workspaceDir);
  const contextService = createContextService(workspaceDir);

  // IndexRepository is used only for tasks init command (metadata updates)
  const fileSystem = new FileSystemService();
  const indexRepository = new FileSystemIndexRepository(fileSystem, tasksDir);

  const tasks = program.command('tasks').description('Manage tasks');

  // Initialize tasks system
  tasks
    .command('init')
    .description('Initialize tasks directory and index')
    .option('--project-goal <goal>', 'Project goal description')
    .option('--language <language>', 'Programming language')
    .option('--framework <framework>', 'Framework name')
    .option('--json', 'Output as JSON')
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

      const response = successResponse({
        initialized: true,
        location: `${tasksDir}/index.json`,
        metadata: index.metadata,
      });

      outputResponse(response, options.json, (data) => {
        console.log(chalk.green('✅ Tasks system initialized'));
        console.log(chalk.gray(`   Location: ${data.location}`));
      });

      process.exit(ExitCode.SUCCESS);
    });

  // Create a new task
  tasks
    .command('create [taskId]')
    .description('Create a new task (ID can be positional or --id)')
    .option('--id <id>', 'Task ID (e.g., auth.signup.ui)')
    .requiredOption('--module <module>', 'Module name (e.g., auth)')
    .option('--priority <priority>', 'Priority (default: 1)', '1')
    .option('--estimated-minutes <minutes>', 'Estimated minutes (default: 30)', '30')
    .requiredOption('--description <desc>', 'Task description')
    .option('--criteria <criteria...>', 'Acceptance criteria (can specify multiple)')
    .option('--dependencies <deps...>', 'Task dependencies')
    .option('--test-pattern <pattern>', 'Test file pattern')
    .option('--json', 'Output as JSON')
    .action(async (taskId, options) => {
      // Resolve task ID: positional argument takes precedence over --id option
      const resolvedId = taskId || options.id;
      if (!resolvedId) {
        handleError(Errors.invalidInput('Task ID is required. Provide as positional argument or use --id'), options.json);
        return;
      }

      try {
        // Call service to create task
        const task = await taskService.createTask({
          id: resolvedId,
          module: options.module,
          priority: parseInt(options.priority),
          estimatedMinutes: parseInt(options.estimatedMinutes),
          description: options.description,
          acceptanceCriteria: options.criteria,
          dependencies: options.dependencies,
          testPattern: options.testPattern,
        });

        const response = successResponse({
          taskId: task.id,
          module: task.module,
          priority: task.priority,
          estimatedMinutes: task.estimatedMinutes,
          status: task.status,
        });

        outputResponse(response, options.json, (data) => {
          console.log(chalk.green(`✅ Task ${data.taskId} created`));
          console.log(chalk.gray(`   Module: ${data.module}`));
          console.log(chalk.gray(`   Priority: ${data.priority}`));
          console.log(chalk.gray(`   Estimated: ${data.estimatedMinutes} min`));
        });

        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        handleError(error as any, options.json);
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
          // Return proper response structure with success: true, task: null
          // Exit code SUCCESS since "no pending tasks" is a valid state, not an error
          const response = successResponse({ task: null, message: 'No pending tasks available' });
          outputResponse(response, options.json, () => {
            console.log(chalk.yellow('No pending tasks'));
          });
          process.exit(ExitCode.SUCCESS);
          return;
        }

        // Gather context using ContextService
        const context = await contextService.gatherTaskContext(task);

        // Format output
        if (options.json) {
          console.log(JSON.stringify({ task: task.toJSON(), context }, null, 2));
        } else {
          formatNextTaskOutput(task, context);
        }
        process.exit(ExitCode.SUCCESS);
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

        process.exit(ExitCode.SUCCESS);
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
          const content = await fileSystem.readFile(options.file, 'utf-8');
          agentOutput = typeof content === 'string' ? content : content.toString('utf-8');
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
