/**
 * Update Command - Manually update ralph-dev CLI and plugin cache
 *
 * Provides manual control over CLI and plugin updates.
 */

import { Command } from 'commander';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createInterface } from 'readline';
import chalk from 'chalk';
import { ExitCode } from '../core/exit-codes';
import { handleError, Errors } from '../core/error-handler';
import { successResponse, outputResponse } from '../core/response-wrapper';
import { version as currentVersion } from '../../package.json';

interface UpdateResult {
  cli: {
    updated: boolean;
    previousVersion: string;
    newVersion?: string;
    error?: string;
  };
  plugin: {
    marketplaceUpdated: boolean;
    cacheUpdated: boolean;
    cacheVersion?: string;
    error?: string;
  };
}

const GITHUB_REPO = 'mylukin/ralph-dev';
const PACKAGE_NAME = 'ralph-dev';

/**
 * Prompt user for confirmation
 */
function askConfirmation(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(question, (answer) => {
      rl.close();
      const normalized = answer.toLowerCase().trim();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}

/**
 * Get the latest version from npm registry
 */
function getLatestVersion(): string | null {
  try {
    const result = execSync(`npm view ${PACKAGE_NAME} version`, {
      encoding: 'utf-8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trim();
  } catch {
    return null;
  }
}

/**
 * Update CLI via npm
 */
function updateCLI(): { success: boolean; newVersion?: string; error?: string } {
  try {
    console.log(chalk.cyan('\n🔄 Updating CLI via npm...\n'));

    execSync(`npm install -g ${PACKAGE_NAME}@latest`, {
      stdio: 'inherit',
      timeout: 120000,
    });

    // Get new version
    const newVersion = getLatestVersion();
    return { success: true, newVersion: newVersion || undefined };
  } catch (error) {
    // Try with npx
    try {
      execSync(`npx npm install -g ${PACKAGE_NAME}@latest`, {
        stdio: 'inherit',
        timeout: 120000,
      });
      const newVersion = getLatestVersion();
      return { success: true, newVersion: newVersion || undefined };
    } catch (npxError) {
      return {
        success: false,
        error: npxError instanceof Error ? npxError.message : String(npxError),
      };
    }
  }
}

/**
 * Update marketplace directory via git pull
 */
function updateMarketplace(): { success: boolean; error?: string } {
  try {
    const marketplaceDir = join(
      homedir(),
      '.claude',
      'plugins',
      'marketplaces',
      PACKAGE_NAME
    );

    if (!existsSync(marketplaceDir) || !existsSync(join(marketplaceDir, '.git'))) {
      return { success: false, error: 'Marketplace directory not found or not a git repo' };
    }

    console.log(chalk.cyan('📦 Updating marketplace plugin via git pull...\n'));

    execSync('git pull --ff-only', {
      cwd: marketplaceDir,
      timeout: 30000,
      stdio: 'inherit',
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Update plugin cache by downloading release tarball
 */
function updateCache(version: string): { success: boolean; error?: string } {
  try {
    const pluginCacheBase = join(
      homedir(),
      '.claude',
      'plugins',
      'cache',
      PACKAGE_NAME,
      PACKAGE_NAME
    );

    if (!existsSync(join(homedir(), '.claude', 'plugins', 'cache'))) {
      return { success: false, error: 'Plugin cache directory not found' };
    }

    const targetDir = join(pluginCacheBase, version);

    if (existsSync(targetDir)) {
      console.log(chalk.dim(`Plugin cache v${version} already exists.\n`));
      return { success: true };
    }

    console.log(chalk.cyan(`📦 Downloading plugin cache v${version}...\n`));

    const tempDir = join(pluginCacheBase, `.tmp-${version}-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });

    try {
      const tarballUrl = `https://github.com/${GITHUB_REPO}/archive/refs/tags/cli-v${version}.tar.gz`;
      const tarballPath = join(tempDir, 'release.tar.gz');

      // Download
      execSync(`curl -fsSL -o "${tarballPath}" "${tarballUrl}"`, {
        timeout: 60000,
        stdio: 'pipe',
      });

      // Extract
      execSync(`tar -xzf "${tarballPath}" -C "${tempDir}"`, {
        timeout: 30000,
        stdio: 'pipe',
      });

      const extractedDirName = `ralph-dev-cli-v${version}`;
      const extractedDir = join(tempDir, extractedDirName);

      if (!existsSync(extractedDir)) {
        throw new Error(`Extracted directory not found: ${extractedDirName}`);
      }

      mkdirSync(pluginCacheBase, { recursive: true });
      execSync(`mv "${extractedDir}" "${targetDir}"`, {
        timeout: 10000,
        stdio: 'pipe',
      });

      // Clean up old versions (keep last 3)
      cleanupOldVersions(pluginCacheBase, version);

      return { success: true };
    } finally {
      if (existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Clean up old plugin cache versions
 */
function cleanupOldVersions(cacheDir: string, currentVer: string, keepCount = 3): void {
  try {
    if (!existsSync(cacheDir)) return;

    const versions = readdirSync(cacheDir)
      .filter((name) => !name.startsWith('.') && name !== currentVer)
      .sort((a, b) => {
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);
        for (let i = 0; i < 3; i++) {
          if ((bParts[i] || 0) !== (aParts[i] || 0)) {
            return (bParts[i] || 0) - (aParts[i] || 0);
          }
        }
        return 0;
      });

    const toRemove = versions.slice(keepCount - 1);
    for (const ver of toRemove) {
      const versionDir = join(cacheDir, ver);
      rmSync(versionDir, { recursive: true, force: true });
    }
  } catch {
    // Non-critical, ignore
  }
}

export function registerUpdateCommand(program: Command): void {
  program
    .command('update')
    .description('Manually update ralph-dev CLI and plugin cache')
    .option('--cli-only', 'Only update CLI, skip plugin cache')
    .option('--plugin-only', 'Only update plugin cache, skip CLI')
    .option('--check', 'Check for updates without installing')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const result: UpdateResult = {
          cli: {
            updated: false,
            previousVersion: currentVersion,
          },
          plugin: {
            marketplaceUpdated: false,
            cacheUpdated: false,
          },
        };

        // Check mode - just check for updates
        if (options.check) {
          const latestVersion = getLatestVersion();

          if (!latestVersion) {
            if (options.json) {
              const errorResponse = successResponse(
                { error: 'Failed to check for updates' },
                { operation: 'update-check' }
              );
              outputResponse(errorResponse, true);
            } else {
              console.log(chalk.yellow('Failed to check for updates'));
            }
            process.exit(ExitCode.GENERAL_ERROR);
          }

          const hasUpdate = latestVersion !== currentVersion;

          if (options.json) {
            const checkResponse = successResponse(
              {
                currentVersion,
                latestVersion,
                updateAvailable: hasUpdate,
              },
              { operation: 'update-check' }
            );
            outputResponse(checkResponse, true);
          } else {
            if (hasUpdate) {
              console.log(
                chalk.yellow(`\nUpdate available: ${currentVersion} → ${latestVersion}`)
              );
              console.log(chalk.dim(`Run 'ralph-dev update' to install\n`));
            } else {
              console.log(chalk.green(`\n✓ You're on the latest version (${currentVersion})\n`));
            }
          }
          process.exit(ExitCode.SUCCESS);
        }

        // Check for updates first
        const latestVersion = getLatestVersion();
        const hasUpdate = latestVersion ? latestVersion !== currentVersion : true; // Assume update if can't check
        const versionKnown = latestVersion !== null;

        if (!hasUpdate && !options.pluginOnly) {
          console.log(chalk.green(`\n✓ CLI is already at the latest version (${currentVersion})\n`));
        }

        // Ask for confirmation if there's an update (skip in JSON mode or CI)
        if (hasUpdate && !options.pluginOnly && !options.json && !process.env.CI) {
          if (versionKnown) {
            console.log(chalk.yellow(`\n📦 Update available: ${currentVersion} → ${latestVersion}\n`));
          } else {
            console.log(chalk.yellow(`\n📦 Checking for updates...\n`));
          }
          const confirmed = await askConfirmation('Do you want to update? (y/N): ');
          if (!confirmed) {
            console.log(chalk.dim('\nUpdate cancelled.\n'));
            process.exit(ExitCode.SUCCESS);
          }
        }

        // Update CLI
        if (!options.pluginOnly && hasUpdate) {
          const cliResult = updateCLI();
          result.cli.updated = cliResult.success;
          result.cli.newVersion = cliResult.newVersion;
          result.cli.error = cliResult.error;

          if (cliResult.success) {
            console.log(chalk.green(`\n✓ CLI updated to v${cliResult.newVersion}\n`));
          } else {
            console.log(chalk.yellow(`\n⚠️ CLI update failed: ${cliResult.error}\n`));
          }
        }

        // Update plugin cache
        if (!options.cliOnly) {
          // Get target version for plugin cache
          const targetVersion = result.cli.newVersion || getLatestVersion() || currentVersion;
          result.plugin.cacheVersion = targetVersion;

          // Update marketplace
          const marketplaceResult = updateMarketplace();
          result.plugin.marketplaceUpdated = marketplaceResult.success;
          if (marketplaceResult.success) {
            console.log(chalk.green('✓ Marketplace plugin updated\n'));
          } else if (marketplaceResult.error !== 'Marketplace directory not found or not a git repo') {
            console.log(chalk.dim(`Marketplace: ${marketplaceResult.error}\n`));
          }

          // Update cache
          const cacheResult = updateCache(targetVersion);
          result.plugin.cacheUpdated = cacheResult.success;
          if (cacheResult.success) {
            console.log(chalk.green(`✓ Plugin cache updated to v${targetVersion}\n`));
          } else {
            console.log(chalk.yellow(`⚠️ Cache update failed: ${cacheResult.error}\n`));
            result.plugin.error = cacheResult.error;
          }
        }

        const response = successResponse(result, { operation: 'update' });

        if (options.json) {
          outputResponse(response, true);
        } else {
          console.log(chalk.dim('Please restart the CLI to use the new version.\n'));
        }

        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        handleError(Errors.fileSystemError('Update failed', error), options.json);
      }
    });
}
