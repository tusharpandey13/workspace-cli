import { executeGhCommand } from '../utils/secureExecution.js';
import { logger } from '../utils/logger.js';

export interface GitHubCliStatus {
  isInstalled: boolean;
  isAuthenticated: boolean;
  hostname?: string;
  account?: string;
  error?: string;
}

/**
 * Service for managing GitHub CLI availability and authentication
 */
export class GitHubCliService {
  private cachedStatus?: GitHubCliStatus;
  private cacheExpiry?: number;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if GitHub CLI is installed and authenticated
   */
  async checkStatus(forceRefresh = false): Promise<GitHubCliStatus> {
    // Return cached result if still valid
    if (!forceRefresh && this.cachedStatus && this.cacheExpiry && Date.now() < this.cacheExpiry) {
      return this.cachedStatus;
    }

    const status: GitHubCliStatus = {
      isInstalled: false,
      isAuthenticated: false,
    };

    try {
      // First check if gh is installed by checking version
      logger.debug('Checking GitHub CLI installation...');
      const versionResult = await executeGhCommand(['--version'], { timeout: 5000 });

      if (versionResult.exitCode !== 0) {
        status.error = 'GitHub CLI is not installed or not available in PATH';
        this.cacheResult(status);
        return status;
      }

      status.isInstalled = true;
      logger.debug('GitHub CLI is installed');

      // Now check authentication status
      logger.debug('Checking GitHub CLI authentication...');
      const authResult = await executeGhCommand(['auth', 'status'], { timeout: 10000 });

      if (authResult.exitCode === 0) {
        status.isAuthenticated = true;

        // Parse auth status output to extract hostname and account
        const output = authResult.stderr; // gh auth status outputs to stderr
        const hostMatch = output.match(/github\.com/);
        if (hostMatch) {
          status.hostname = 'github.com';
        }

        const accountMatch = output.match(/Logged in to github\.com as ([^\s]+)/);
        if (accountMatch) {
          status.account = accountMatch[1];
        }

        logger.debug(`GitHub CLI authenticated as ${status.account || 'unknown'}`);
      } else {
        status.error = 'GitHub CLI is not authenticated. Run "gh auth login" to authenticate.';
        logger.debug('GitHub CLI is not authenticated');
      }
    } catch (error) {
      status.error = `GitHub CLI check failed: ${(error as Error).message}`;
      logger.debug(`GitHub CLI check failed: ${(error as Error).message}`);
    }

    this.cacheResult(status);
    return status;
  }

  /**
   * Ensure GitHub CLI is available and authenticated
   * Throws an error if not available or authenticated
   */
  async ensureAvailable(): Promise<void> {
    const status = await this.checkStatus();

    if (!status.isInstalled) {
      throw new Error(
        'GitHub CLI is required but not installed. Please install it from https://cli.github.com/ and run "gh auth login" to authenticate.',
      );
    }

    if (!status.isAuthenticated) {
      throw new Error(
        'GitHub CLI is not authenticated. Please run "gh auth login" to authenticate with GitHub.',
      );
    }
  }

  /**
   * Get user-friendly installation guidance
   */
  getInstallationGuidance(): string[] {
    const guidance = [
      '📋 GitHub CLI Setup Required:',
      '',
      '1. Install GitHub CLI:',
      '   • macOS: brew install gh',
      '   • Ubuntu/Debian: see https://github.com/cli/cli/blob/trunk/docs/install_linux.md',
      '   • Windows: see https://cli.github.com/',
      '',
      '2. Authenticate with GitHub:',
      '   gh auth login',
      '',
      '3. Verify setup:',
      '   gh auth status',
      '',
      '💡 GitHub CLI enables workspace-cli to fetch issue/PR data for better context.',
    ];
    return guidance;
  }

  /**
   * Get authentication guidance for when GitHub CLI is installed but not authenticated
   */
  getAuthenticationGuidance(): string[] {
    const guidance = [
      '🔐 GitHub CLI Authentication Required:',
      '',
      '1. Authenticate with GitHub:',
      '   gh auth login',
      '',
      '2. Follow the prompts to:',
      '   • Choose GitHub.com (not Enterprise)',
      '   • Select HTTPS or SSH protocol',
      '   • Authenticate via web browser or token',
      '',
      '3. Verify authentication:',
      '   gh auth status',
      '',
      '💡 Authentication enables workspace-cli to access GitHub issues and PRs.',
    ];
    return guidance;
  }

  /**
   * Cache the status result
   */
  private cacheResult(status: GitHubCliStatus): void {
    this.cachedStatus = status;
    this.cacheExpiry = Date.now() + this.CACHE_DURATION;
  }

  /**
   * Clear the cached status (useful for testing)
   */
  clearCache(): void {
    delete this.cachedStatus;
    delete this.cacheExpiry;
  }
}

// Export a singleton instance
export const gitHubCliService = new GitHubCliService();
