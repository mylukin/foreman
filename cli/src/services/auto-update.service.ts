import { execSync } from 'child_process';
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

  constructor(options: AutoUpdateOptions) {
    this.packageName = options.packageName;
    this.currentVersion = options.currentVersion;
    this.autoUpdate = options.autoUpdate ?? true;
    this.checkInterval = options.checkInterval ?? ONE_DAY_MS;
    this.logger = options.logger;
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
