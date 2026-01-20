import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import { FileSystemIndexRepository } from '../repositories/index-repository.service';
import { FileSystemService } from '../infrastructure/file-system.service';

/**
 * AI-powered language detection command
 * Invokes detect-language skill for autonomous detection
 */
export function registerDetectAICommand(program: Command, workspaceDir: string): void {
  program
    .command('detect-ai')
    .description('AI-powered autonomous language and framework detection')
    .option('--json', 'Output as JSON')
    .option('--save', 'Save to index metadata')
    .action(async (options) => {
      console.log(chalk.bold('🔍 AI Language Detection'));
      console.log(chalk.gray('Using detect-language skill for autonomous analysis...\n'));

      // Instructions for the user (since we're in CLI, we show what skill does)
      console.log(chalk.yellow('⚠️  This command requires Claude Code skill integration.'));
      console.log(chalk.gray('To use this feature:\n'));
      console.log('1. In Claude Code, invoke the detect-language skill:');
      console.log(chalk.cyan('   /detect-language'));
      console.log('\n2. The skill will:');
      console.log('   - Scan project structure');
      console.log('   - Detect language, framework, build tools');
      console.log('   - Return JSON configuration');
      console.log('\n3. Save the result:');
      console.log(chalk.cyan(`   ralph-dev detect-ai-save '<json-result>'`));

      console.log(chalk.bold('\n📋 Detection Process:'));
      console.log('   Phase 1: Project scan (find config files)');
      console.log('   Phase 2: Analyze evidence (read configs)');
      console.log('   Phase 3: Infer verification commands');
      console.log('   Phase 4: Return structured JSON');

      console.log(chalk.bold('\n🎯 Expected Output Format:'));
      const exampleOutput = {
        language: 'typescript',
        confidence: 0.95,
        evidence: [
          'package.json exists',
          'tsconfig.json exists',
          '47 .ts files found'
        ],
        framework: 'react',
        buildTool: 'vite',
        packageManager: 'pnpm',
        testFramework: 'vitest',
        verifyCommands: [
          'npx tsc --noEmit',
          'pnpm run lint',
          'pnpm test',
          'pnpm run build'
        ]
      };
      console.log(chalk.gray(JSON.stringify(exampleOutput, null, 2)));

      console.log(chalk.bold('\n💡 Tip:'));
      console.log('For manual detection (template-based), use:');
      console.log(chalk.cyan('   ralph-dev detect'));
    });

  // Helper command to save AI detection result
  program
    .command('detect-ai-save <result>')
    .description('Save AI detection result to index metadata')
    .action(async (result) => {
      try {
        const languageConfig = JSON.parse(result);

        // Validate required fields
        if (!languageConfig.language || !languageConfig.verifyCommands) {
          console.error(chalk.red('❌ Invalid detection result format'));
          console.error(chalk.gray('Required fields: language, verifyCommands'));
          process.exit(1);
        }

        // Save to index using FileSystemIndexRepository
        const tasksDir = path.join(workspaceDir, '.ralph-dev', 'tasks');
        const fileSystem = new FileSystemService();
        const indexRepository = new FileSystemIndexRepository(fileSystem, tasksDir);
        await indexRepository.updateMetadata({ languageConfig });

        console.log(chalk.green('✅ Language configuration saved to index metadata'));
        console.log(chalk.bold('\nDetected Configuration:'));
        console.log(`Language: ${chalk.cyan(languageConfig.language)}`);
        if (languageConfig.framework) {
          console.log(`Framework: ${chalk.green(languageConfig.framework)}`);
        }
        if (languageConfig.confidence) {
          console.log(`Confidence: ${chalk.yellow((languageConfig.confidence * 100).toFixed(0) + '%')}`);
        }
        console.log(chalk.bold('\nVerification Commands:'));
        languageConfig.verifyCommands.forEach((cmd: string) => {
          console.log(`  ${chalk.gray('$')} ${cmd}`);
        });

        if (languageConfig.evidence) {
          console.log(chalk.bold('\nEvidence:'));
          languageConfig.evidence.forEach((ev: string) => {
            console.log(`  • ${ev}`);
          });
        }
      } catch (error) {
        console.error(chalk.red('❌ Failed to parse detection result'));
        console.error(chalk.gray('Expected JSON string with language configuration'));
        if (error instanceof Error) {
          console.error(chalk.red(error.message));
        }
        process.exit(1);
      }
    });
}
