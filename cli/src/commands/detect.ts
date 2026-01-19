import { Command } from 'commander';
import chalk from 'chalk';
import { LanguageDetector } from '../language/detector';
import { IndexManager } from '../core/index-manager';
import * as path from 'path';

export function registerDetectCommand(program: Command, workspaceDir: string): void {
  program
    .command('detect')
    .description('Detect project language and configuration')
    .option('--json', 'Output as JSON')
    .option('--save', 'Save to index metadata')
    .action((options) => {
      const languageConfig = LanguageDetector.detect(workspaceDir);

      if (options.json) {
        console.log(JSON.stringify(languageConfig, null, 2));
      } else {
        console.log(chalk.bold('Project Configuration:'));
        console.log(`Language: ${chalk.cyan(languageConfig.language)}`);

        if (languageConfig.framework) {
          console.log(`Framework: ${chalk.green(languageConfig.framework)}`);
        }

        if (languageConfig.testFramework) {
          console.log(`Test Framework: ${languageConfig.testFramework}`);
        }

        if (languageConfig.buildTool) {
          console.log(`Build Tool: ${languageConfig.buildTool}`);
        }

        if (languageConfig.verifyCommands.length > 0) {
          console.log(chalk.bold('\nVerification Commands:'));
          languageConfig.verifyCommands.forEach((cmd) => {
            console.log(`  ${chalk.gray('$')} ${cmd}`);
          });
        }
      }

      if (options.save) {
        const tasksDir = path.join(workspaceDir, '.ralph-dev', 'tasks');
        const indexManager = new IndexManager(tasksDir);
        indexManager.updateMetadata({ languageConfig });
        console.log(chalk.green('\n✓ Saved to index metadata'));
      }
    });
}
