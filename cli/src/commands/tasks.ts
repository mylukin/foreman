import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { TaskParser, Task } from '../core/task-parser';
import { TaskWriter } from '../core/task-writer';
import { IndexManager } from '../core/index-manager';

export function registerTaskCommands(program: Command, workspaceDir: string): void {
  const tasksDir = path.join(workspaceDir, '.ralph-dev', 'tasks');
  const indexManager = new IndexManager(tasksDir);

  const tasks = program.command('tasks').description('Manage tasks');

  // Initialize tasks system
  tasks
    .command('init')
    .description('Initialize tasks directory and index')
    .option('--project-goal <goal>', 'Project goal description')
    .option('--language <language>', 'Programming language')
    .option('--framework <framework>', 'Framework name')
    .action((options) => {
      const index = indexManager.readIndex();

      if (options.projectGoal) {
        index.metadata.projectGoal = options.projectGoal;
      }

      if (options.language || options.framework) {
        index.metadata.languageConfig = {
          language: options.language || 'typescript',
          framework: options.framework || '',
        };
      }

      indexManager.writeIndex(index);
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
    .action((options) => {
      const task: Task = {
        id: options.id,
        module: options.module,
        priority: parseInt(options.priority),
        status: 'pending',
        estimatedMinutes: parseInt(options.estimatedMinutes),
        description: options.description,
        acceptanceCriteria: options.criteria || [],
        dependencies: options.dependencies || [],
        testRequirements: options.testPattern ? {
          unit: {
            required: true,
            pattern: options.testPattern,
          },
        } : undefined,
        notes: '',
      };

      const filePath = TaskWriter.writeTaskFile(tasksDir, task);
      indexManager.upsertTask(task, filePath);

      console.log(chalk.green(`✅ Task ${options.id} created`));
      console.log(chalk.gray(`   Module: ${options.module}`));
      console.log(chalk.gray(`   Priority: ${options.priority}`));
      console.log(chalk.gray(`   Estimated: ${options.estimatedMinutes} min`));
      console.log(chalk.gray(`   Location: ${filePath}`));
    });

  // List all tasks
  tasks
    .command('list')
    .description('List all tasks')
    .option('-s, --status <status>', 'Filter by status')
    .option('--json', 'Output as JSON')
    .action((options) => {
      const index = indexManager.readIndex();

      let taskList = Object.entries(index.tasks);

      if (options.status) {
        taskList = taskList.filter(([, task]) => task.status === options.status);
      }

      taskList.sort(([, a], [, b]) => a.priority - b.priority);

      if (options.json) {
        console.log(JSON.stringify(taskList.map(([id, task]) => ({ id, ...task })), null, 2));
      } else {
        console.log(chalk.bold('Tasks:'));
        taskList.forEach(([id, task]) => {
          const statusColor =
            task.status === 'completed' ? 'green' :
              task.status === 'in_progress' ? 'yellow' :
                task.status === 'failed' ? 'red' : 'gray';

          console.log(
            `  ${chalk[statusColor](`[${task.status}]`)} ` +
            `${chalk.cyan(id)} (P${task.priority}) - ${task.description}`
          );
        });
      }
    });

  // Get next task
  tasks
    .command('next')
    .description('Get next task to work on with comprehensive context')
    .option('--json', 'Output as JSON')
    .action((options) => {
      const nextTaskId = indexManager.getNextTask();

      if (!nextTaskId) {
        if (options.json) {
          console.log(JSON.stringify({ error: 'No pending tasks' }, null, 2));
        } else {
          console.log(chalk.yellow('No pending tasks'));
        }
        return;
      }

      const filePath = indexManager.getTaskFilePath(nextTaskId);
      if (!filePath) {
        console.error(chalk.red(`Task file not found: ${nextTaskId}`));
        process.exit(1);
      }

      const task = TaskParser.parseTaskFile(filePath);

      // === Gather comprehensive context ===
      const context: any = {};

      // 1. Current directory
      context.currentDirectory = process.cwd();

      // 2. Git information
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

      // 3. State context
      const stateFile = path.join(workspaceDir, '.ralph-dev', 'state.json');
      if (fs.existsSync(stateFile)) {
        context.state = fs.readJSONSync(stateFile);
      }

      // 4. Progress statistics
      const index = indexManager.readIndex();
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

      // 5. Recent activity from progress.log
      const progressLog = path.join(workspaceDir, '.ralph-dev', 'progress.log');
      context.recentActivity = [];
      if (fs.existsSync(progressLog)) {
        try {
          const logContent = fs.readFileSync(progressLog, 'utf-8');
          const lines = logContent.trim().split('\n');
          context.recentActivity = lines.slice(-5); // Last 5 entries
        } catch (error) {
          context.recentActivity = ['Unable to read progress log'];
        }
      }

      // 6. Check task dependencies
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

      // === Output ===
      if (options.json) {
        console.log(JSON.stringify({
          task,
          context,
          dependencyStatus,
        }, null, 2));
      } else {
        // Beautiful formatted output
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

        if (dependencyStatus.length > 0) {
          console.log(chalk.bold('├─────────────────────────────────────────────────────────────────┤'));
          console.log(chalk.bold('│ Dependencies:                                                   │'));
          dependencyStatus.forEach(dep => {
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

        if (context.recentActivity.length > 0) {
          console.log(chalk.bold('├─────────────────────────────────────────────────────────────────┤'));
          console.log(chalk.bold('│ 📊 RECENT ACTIVITY (from progress.log)                          │'));
          console.log(chalk.bold('├─────────────────────────────────────────────────────────────────┤'));
          context.recentActivity.forEach((line: string) => {
            console.log(`│ ${chalk.gray(line.slice(0, 63))}`);
          });
        }

        console.log(chalk.bold('└─────────────────────────────────────────────────────────────────┘'));
      }
    });

  // Get specific task
  tasks
    .command('get <taskId>')
    .description('Get task details')
    .option('--json', 'Output as JSON')
    .action((taskId, options) => {
      const filePath = indexManager.getTaskFilePath(taskId);

      if (!filePath) {
        console.error(chalk.red(`Task not found: ${taskId}`));
        process.exit(1);
      }

      const task = TaskParser.parseTaskFile(filePath);

      if (options.json) {
        console.log(JSON.stringify(task, null, 2));
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
    });

  // Update task status
  tasks
    .command('done <taskId>')
    .description('Mark task as completed')
    .option('-d, --duration <duration>', 'Task duration (e.g., "4m 32s")')
    .action((taskId, options) => {
      const filePath = indexManager.getTaskFilePath(taskId);

      if (!filePath) {
        console.error(chalk.red(`Task not found: ${taskId}`));
        process.exit(1);
      }

      TaskWriter.updateTaskStatus(filePath, 'completed');
      indexManager.updateTaskStatus(taskId, 'completed');

      if (options.duration) {
        TaskWriter.appendNotes(filePath, `Completed in ${options.duration}`);
      }

      console.log(chalk.green(`✓ Task ${taskId} marked as completed`));
    });

  // Mark task as failed
  tasks
    .command('fail <taskId>')
    .description('Mark task as failed')
    .requiredOption('-r, --reason <reason>', 'Failure reason')
    .action((taskId, options) => {
      const filePath = indexManager.getTaskFilePath(taskId);

      if (!filePath) {
        console.error(chalk.red(`Task not found: ${taskId}`));
        process.exit(1);
      }

      TaskWriter.updateTaskStatus(filePath, 'failed');
      indexManager.updateTaskStatus(taskId, 'failed');
      TaskWriter.appendNotes(filePath, `Failed: ${options.reason}`);

      console.log(chalk.red(`✗ Task ${taskId} marked as failed`));
    });

  // Mark task as in progress
  tasks
    .command('start <taskId>')
    .description('Mark task as in progress')
    .action((taskId) => {
      const filePath = indexManager.getTaskFilePath(taskId);

      if (!filePath) {
        console.error(chalk.red(`Task not found: ${taskId}`));
        process.exit(1);
      }

      TaskWriter.updateTaskStatus(filePath, 'in_progress');
      indexManager.updateTaskStatus(taskId, 'in_progress');

      console.log(chalk.yellow(`→ Task ${taskId} started`));
    });
}
