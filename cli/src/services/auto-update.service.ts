import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import updateNotifier, { type UpdateInfo } from 'update-notifier';
import chalk from 'chalk';
import { ILogger } from '../infrastructure/logger';

export interface AutoUpdateOptions {
  /** Package name to check */
  packageName: string;
  /** Current version */
  currentVersion: string;
  /** Whether to auto-update (default: true) */
  autoUpdate?: boolean;
  /** Update check interval in milliseconds (default: 1 day) */
  checkInterval?: number;
  /** Logger instance */
  logger?: ILogger;
  /** GitHub repository (org/repo format) for plugin update */
  githubRepo?: string;
  /** Whether to also update plugin cache (default: true) */
  updatePluginCache?: boolean;
}

export interface UpdateCheckResult {
  /** Whether an update is available */
  updateAvailable: boolean;
  /** Current version */
  currentVersion: string;
  /** Latest version (if available) */
  latestVersion?: string;
  /** Update type (major, minor, patch, etc.) */
  updateType?: string;
  /** Whether auto-update was performed */
  autoUpdated: boolean;
  /** Whether plugin cache was updated */
  pluginUpdated?: boolean;
  /** Error message if update failed */
  error?: string;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export class AutoUpdateService {
  private readonly packageName: string;
  private readonly currentVersion: string;
  private readonly autoUpdate: boolean;
  private readonly checkInterval: number;
  private readonly logger?: ILogger;
  private readonly githubRepo: string;
  private readonly updatePluginCache: boolean;

  constructor(options: AutoUpdateOptions) {
    this.packageName = options.packageName;
    this.currentVersion = options.currentVersion;
    this.autoUpdate = options.autoUpdate ?? true;
    this.checkInterval = options.checkInterval ?? ONE_DAY_MS;
    this.logger = options.logger;
    this.githubRepo = options.githubRepo ?? 'mylukin/ralph-dev';
    this.updatePluginCache = options.updatePluginCache ?? true;
  }

  /**
   * Check for updates and optionally auto-update
   * This runs in the background to not block CLI startup
   */
  async checkAndUpdate(): Promise<UpdateCheckResult> {
    const result: UpdateCheckResult = {
      updateAvailable: false,
      currentVersion: this.currentVersion,
      autoUpdated: false,
    };

    try {
      // Create update notifier instance
      const notifier = updateNotifier({
        pkg: {
          name: this.packageName,
          version: this.currentVersion,
        },
        updateCheckInterval: this.checkInterval,
      });

      // Wait for the update check to complete
      const update = await this.fetchUpdateInfo(notifier);

      if (!update) {
        return result;
      }

      result.updateAvailable = true;
      result.latestVersion = update.latest;
      result.updateType = update.type;

      // Log update availability
      this.logUpdateAvailable(update);

      // Perform auto-update if enabled
      if (this.autoUpdate && !this.isCI()) {
        const updateSuccess = await this.performUpdate();
        result.autoUpdated = updateSuccess;

        if (updateSuccess) {
          this.logUpdateSuccess(update.latest);

          // Update plugin cache after successful CLI update
          if (this.updatePluginCache) {
            const pluginSuccess = await this.performPluginUpdate(update.latest);
            result.pluginUpdated = pluginSuccess;
          }
        }
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      this.logger?.debug?.(`Update check failed: ${result.error}`);
    }

    return result;
  }

  /**
   * Fetch update info from the notifier
   */
  private fetchUpdateInfo(
    notifier: ReturnType<typeof updateNotifier>
  ): Promise<UpdateInfo | undefined> {
    return new Promise((resolve) => {
      // Check if update info is already cached
      if (notifier.update) {
        resolve(notifier.update);
        return;
      }

      // Wait for background check (with timeout)
      const timeout = setTimeout(() => {
        resolve(notifier.update);
      }, 5000);

      // Check periodically for update info
      const interval = setInterval(() => {
        if (notifier.update) {
          clearInterval(interval);
          clearTimeout(timeout);
          resolve(notifier.update);
        }
      }, 100);
    });
  }

  /**
   * Perform the actual update using npm
   */
  private async performUpdate(): Promise<boolean> {
    try {
      console.log(
        chalk.cyan(`\n🔄 Auto-updating ${this.packageName}...\n`)
      );

      // Use npm to install globally
      execSync(`npm install -g ${this.packageName}@latest`, {
        stdio: 'inherit',
        timeout: 60000, // 60 second timeout
      });

      return true;
    } catch (error) {
      // Try with npx if npm fails
      try {
        execSync(`npx npm install -g ${this.packageName}@latest`, {
          stdio: 'inherit',
          timeout: 60000,
        });
        return true;
      } catch {
        this.logUpdateFailed(error);
        return false;
      }
    }
  }

  /**
   * Update the Claude Code plugin installations
   * - Updates cache: Downloads release tarball from GitHub and extracts to ~/.claude/plugins/cache/
   * - Updates marketplace: Runs git pull in ~/.claude/plugins/marketplaces/ if it's a git repo
   */
  private async performPluginUpdate(version: string): Promise<boolean> {
    let cacheUpdated = false;
    let marketplaceUpdated = false;

    // Update marketplace directory (git pull)
    marketplaceUpdated = await this.updateMarketplaceDirectory();

    // Update cache directory (download tarball)
    cacheUpdated = await this.updateCacheDirectory(version);

    return cacheUpdated || marketplaceUpdated;
  }

  /**
   * Update marketplace directory via git pull
   */
  private async updateMarketplaceDirectory(): Promise<boolean> {
    try {
      const marketplaceDir = join(
        homedir(),
        '.claude',
        'plugins',
        'marketplaces',
        this.packageName
      );

      // Check if directory exists and is a git repo
      if (
        !existsSync(marketplaceDir) ||
        !existsSync(join(marketplaceDir, '.git'))
      ) {
        return false;
      }

      console.log(chalk.cyan('📦 Updating marketplace plugin...\n'));

      // Run git pull
      execSync('git pull --ff-only', {
        cwd: marketplaceDir,
        timeout: 30000,
        stdio: 'pipe',
      });

      console.log(chalk.green('✅ Marketplace plugin updated!\n'));
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger?.debug?.(`Marketplace update failed: ${errorMessage}`);
      console.log(
        chalk.dim(`Marketplace update skipped: ${errorMessage}\n`)
      );
      return false;
    }
  }

  /**
   * Update cache directory by downloading release tarball
   */
  private async updateCacheDirectory(version: string): Promise<boolean> {
    try {
      const pluginCacheBase = join(
        homedir(),
        '.claude',
        'plugins',
        'cache',
        this.packageName,
        this.packageName
      );

      // Check if plugin cache directory exists
      if (!existsSync(join(homedir(), '.claude', 'plugins', 'cache'))) {
        this.logger?.debug?.(
          'Plugin cache directory not found, skipping cache update'
        );
        return false;
      }

      const targetDir = join(pluginCacheBase, version);

      // Skip if version already exists
      if (existsSync(targetDir)) {
        console.log(
          chalk.dim(`Plugin cache v${version} already exists, skipping.\n`)
        );
        return true;
      }

      console.log(chalk.cyan(`📦 Updating plugin cache to v${version}...\n`));

      // Create temp directory for download
      const tempDir = join(pluginCacheBase, `.tmp-${version}-${Date.now()}`);
      mkdirSync(tempDir, { recursive: true });

      try {
        // Download tarball from GitHub
        const tarballUrl = `https://github.com/${this.githubRepo}/archive/refs/tags/cli-v${version}.tar.gz`;
        const tarballPath = join(tempDir, 'release.tar.gz');

        // Download using curl
        execSync(`curl -fsSL -o "${tarballPath}" "${tarballUrl}"`, {
          timeout: 60000,
          stdio: 'pipe',
        });

        // Extract tarball
        execSync(`tar -xzf "${tarballPath}" -C "${tempDir}"`, {
          timeout: 30000,
          stdio: 'pipe',
        });

        // Find extracted directory (ralph-dev-cli-v{version})
        const extractedDirName = `ralph-dev-cli-v${version}`;
        const extractedDir = join(tempDir, extractedDirName);

        if (!existsSync(extractedDir)) {
          throw new Error(`Extracted directory not found: ${extractedDirName}`);
        }

        // Ensure parent directory exists
        mkdirSync(pluginCacheBase, { recursive: true });

        // Move extracted contents to target directory
        execSync(`mv "${extractedDir}" "${targetDir}"`, {
          timeout: 10000,
          stdio: 'pipe',
        });

        // Clean up old versions (keep last 3)
        this.cleanupOldVersions(pluginCacheBase, version);

        console.log(chalk.green(`✅ Plugin cache updated to v${version}!\n`));
        return true;
      } finally {
        // Clean up temp directory
        if (existsSync(tempDir)) {
          rmSync(tempDir, { recursive: true, force: true });
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.log(
        chalk.yellow(`⚠️  Plugin cache update failed: ${errorMessage}\n`)
      );
      console.log(
        chalk.dim(
          'The CLI was updated successfully. Plugin cache will be updated on next Claude Code session.\n'
        )
      );
      return false;
    }
  }

  /**
   * Clean up old plugin cache versions, keeping the most recent ones
   */
  private cleanupOldVersions(
    cacheDir: string,
    currentVersion: string,
    keepCount: number = 3
  ): void {
    try {
      if (!existsSync(cacheDir)) return;

      const versions = readdirSync(cacheDir)
        .filter((name) => !name.startsWith('.') && name !== currentVersion)
        .sort((a, b) => {
          // Sort by semantic version (descending)
          const aParts = a.split('.').map(Number);
          const bParts = b.split('.').map(Number);
          for (let i = 0; i < 3; i++) {
            if ((bParts[i] || 0) !== (aParts[i] || 0)) {
              return (bParts[i] || 0) - (aParts[i] || 0);
            }
          }
          return 0;
        });

      // Remove old versions beyond keepCount (excluding current version)
      const toRemove = versions.slice(keepCount - 1);
      for (const version of toRemove) {
        const versionDir = join(cacheDir, version);
        rmSync(versionDir, { recursive: true, force: true });
        this.logger?.debug?.(`Removed old plugin cache: ${version}`);
      }
    } catch (error) {
      // Non-critical, just log
      this.logger?.debug?.(
        `Failed to cleanup old versions: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Show notification without auto-updating (for when auto-update is disabled)
   */
  notify(): void {
    const notifier = updateNotifier({
      pkg: {
        name: this.packageName,
        version: this.currentVersion,
      },
      updateCheckInterval: this.checkInterval,
    });

    notifier.notify({
      isGlobal: true,
      message: `Update available ${chalk.dim('{currentVersion}')} → ${chalk.green('{latestVersion}')}
Run ${chalk.cyan(`npm install -g ${this.packageName}`)} to update`,
    });
  }

  /**
   * Check if running in CI environment
   */
  private isCI(): boolean {
    return !!(
      process.env.CI ||
      process.env.CONTINUOUS_INTEGRATION ||
      process.env.BUILD_NUMBER ||
      process.env.GITHUB_ACTIONS
    );
  }

  /**
   * Log update availability
   */
  private logUpdateAvailable(update: UpdateInfo): void {
    const message = [
      '',
      chalk.yellow('╭────────────────────────────────────────────────────╮'),
      chalk.yellow('│                                                    │'),
      chalk.yellow('│  ') +
        chalk.white.bold('Update available!') +
        chalk.yellow('                               │'),
      chalk.yellow('│  ') +
        chalk.dim(this.currentVersion) +
        chalk.white(' → ') +
        chalk.green.bold(update.latest) +
        chalk.yellow('                               '.slice((this.currentVersion + update.latest).length)) +
        chalk.yellow('│'),
      chalk.yellow('│                                                    │'),
      chalk.yellow('╰────────────────────────────────────────────────────╯'),
      '',
    ].join('\n');

    console.log(message);
  }

  /**
   * Log successful update
   */
  private logUpdateSuccess(version: string): void {
    console.log(
      chalk.green(`\n✅ Successfully updated to v${version}!\n`)
    );
    console.log(
      chalk.dim('Please restart the CLI to use the new version.\n')
    );
  }

  /**
   * Log update failure
   */
  private logUpdateFailed(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(
      chalk.yellow(`\n⚠️  Auto-update failed: ${errorMessage}`)
    );
    console.log(
      chalk.dim(`Run ${chalk.cyan(`npm install -g ${this.packageName}`)} to update manually.\n`)
    );
  }
}

/**
 * Create auto-update service with default options
 */
export function createAutoUpdateService(
  packageName: string,
  currentVersion: string,
  options?: Partial<Omit<AutoUpdateOptions, 'packageName' | 'currentVersion'>>
): AutoUpdateService {
  return new AutoUpdateService({
    packageName,
    currentVersion,
    ...options,
  });
}
