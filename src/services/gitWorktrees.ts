import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger.js';
import { executeCommand, fileOps } from '../utils/init-helpers.js';
import type { ProjectConfig, WorkspacePaths } from '../types/index.js';
import { ConfigManager } from '../utils/config.js';

/**
 * Validate that repository exists and is in a good state for worktree creation
 */
async function validateRepository(
  repoPath: string,
  repoName: string,
  isDryRun: boolean,
): Promise<boolean> {
  if (isDryRun) {
    logger.verbose(`[DRY RUN] Would validate repository ${repoPath}`);
    return true;
  }

  try {
    // Check if directory exists and is a git repository
    if (!fs.existsSync(repoPath)) {
      logger.error(`Repository directory does not exist: ${repoPath}`);
      return false;
    }

    const gitDir = path.join(repoPath, '.git');
    if (!fs.existsSync(gitDir)) {
      logger.error(`Directory is not a git repository: ${repoPath}`);
      return false;
    }

    // Check if repository has a remote origin
    try {
      await executeCommand(
        'git',
        ['remote', 'get-url', 'origin'],
        { cwd: repoPath },
        'check origin remote',
        false,
      );
    } catch {
      logger.warn(`Repository ${repoName} does not have an 'origin' remote`);
      // Continue anyway - might be a local-only repo
    }

    // Check if repository is in a clean state (no pending worktree operations)
    try {
      await executeCommand(
        'git',
        ['worktree', 'list'],
        { cwd: repoPath },
        'check existing worktrees',
        false,
      );
    } catch {
      // Worktree command might not be available in older git versions
      logger.verbose(`Could not check worktree status for ${repoName}`);
    }

    logger.verbose(`✅ Repository ${repoName} validation passed`);
    return true;
  } catch (error) {
    logger.error(`Repository validation failed for ${repoName}: ${error}`);
    return false;
  }
}

/**
 * Ensure repository is fresh by fetching latest changes from origin
 * Note: Local branch state doesn't matter since worktrees are created from origin refs
 */
async function ensureRepositoryFreshness(repoPath: string, isDryRun: boolean): Promise<void> {
  if (isDryRun) {
    logger.verbose(`[DRY RUN] Would fetch latest changes for ${repoPath}`);
    return;
  }

  try {
    // Always fetch latest changes from origin to ensure fresh worktree creation
    await executeCommand(
      'git',
      ['fetch', 'origin', '--prune'],
      { cwd: repoPath },
      `fetch latest changes from origin for ${repoPath}`,
      isDryRun,
    );

    logger.verbose(
      `✅ Fetched latest changes for ${repoPath} (worktrees will use fresh origin refs)`,
    );

    // Note: We don't update local branches since worktrees are created directly from origin refs
    // This avoids merge conflicts and ensures worktrees always have the latest code
  } catch (error) {
    logger.warn(`Could not fetch latest changes for ${repoPath}: ${error}`);
  }
}

/**
 * Get the default branch for a repository (remains identical to logic in init.ts)
 */
export async function getDefaultBranch(repoPath: string, isDryRun: boolean): Promise<string> {
  if (isDryRun) {
    return 'main'; // Default for dry run
  }

  try {
    // Try to get the default branch from remote
    const result = await executeCommand(
      'git',
      ['symbolic-ref', 'refs/remotes/origin/HEAD'],
      { cwd: repoPath },
      'get default branch',
      false,
    );
    const defaultRef = result.stdout.trim();
    const branchName = defaultRef.replace('refs/remotes/origin/', '');
    return branchName;
  } catch {
    // Fallback: check if main or master exists locally
    try {
      await executeCommand(
        'git',
        ['show-ref', '--verify', '--quiet', 'refs/heads/main'],
        { cwd: repoPath },
        'check main branch',
        false,
      );
      return 'main';
    } catch {
      try {
        await executeCommand(
          'git',
          ['show-ref', '--verify', '--quiet', 'refs/heads/master'],
          { cwd: repoPath },
          'check master branch',
          false,
        );
        return 'master';
      } catch {
        return 'main'; // Final fallback
      }
    }
  }
}

/**
 * Set up git worktrees for SDK and sample repos.
 * Extracted from init.ts to promote reuse & testability.
 */
export async function setupWorktrees(
  project: ProjectConfig,
  paths: WorkspacePaths,
  branchName: string,
  isDryRun: boolean,
): Promise<void> {
  // Load configuration for repository and testing preferences
  const configManager = new ConfigManager();
  let config: any;
  try {
    config = await configManager.loadConfig();
  } catch {
    // Use defaults if config loading fails
    config = {
      repository: { ensure_freshness: true, auto_update_default_branches: true },
      testing: { auto_setup_infrastructure: true },
    };
  }

  // Task 6.5: Validate repository state before proceeding
  logger.verbose('🔍 Validating repository state...');
  const repoValid = await validateRepository(paths.sourceRepoPath, 'Main Repository', isDryRun);
  let sampleValid = true;
  if (paths.destinationRepoPath) {
    sampleValid = await validateRepository(
      paths.destinationRepoPath,
      'Sample Repository',
      isDryRun,
    );
  }

  if (!repoValid || (paths.destinationRepoPath && !sampleValid)) {
    throw new Error('Repository validation failed - cannot proceed with worktree setup');
  }

  // Task 6.1 & 6.2: Ensure repositories are fresh before creating worktrees (configurable)
  if (config.repository?.ensure_freshness !== false) {
    await ensureRepositoryFreshness(paths.sourceRepoPath, isDryRun);
    if (paths.destinationRepoPath) {
      await ensureRepositoryFreshness(paths.destinationRepoPath, isDryRun);
    }
  } else {
    logger.verbose('⏭️  Skipping repository freshness check (disabled in config)');
  }

  const addWorktree = async (
    repoDir: string,
    worktreePath: string,
    targetBranch: string,
    baseBranch: string = 'main',
  ): Promise<void> => {
    if (!isDryRun && fs.existsSync(worktreePath)) {
      await fileOps.removeFile(worktreePath, `stale worktree directory: ${worktreePath}`, isDryRun);
    }

    try {
      await executeCommand(
        'git',
        ['worktree', 'prune'],
        { cwd: repoDir },
        `prune worktrees in ${repoDir}`,
        isDryRun,
      );
    } catch {
      // Ignore prune failures
    }

    // Task 6.1: Always use latest version of base branch for worktree creation
    try {
      await executeCommand(
        'git',
        ['worktree', 'add', worktreePath, '-b', targetBranch, `origin/${baseBranch}`],
        { cwd: repoDir },
        `create new worktree with branch ${targetBranch} from origin/${baseBranch}`,
        isDryRun,
      );
    } catch {
      try {
        await executeCommand(
          'git',
          ['worktree', 'add', worktreePath, targetBranch],
          { cwd: repoDir },
          `add existing branch ${targetBranch} to worktree`,
          isDryRun,
        );
      } catch {
        await executeCommand(
          'git',
          ['worktree', 'add', '-f', worktreePath, targetBranch],
          { cwd: repoDir },
          `force add branch ${targetBranch} to worktree`,
          isDryRun,
        );
      }
    }
  };

  logger.verbose('🔀 Setting up source worktree...');
  const defaultBranch = await getDefaultBranch(paths.sourceRepoPath, isDryRun);
  await addWorktree(paths.sourceRepoPath, paths.sourcePath, branchName, defaultBranch);

  if (paths.destinationRepoPath && paths.destinationPath) {
    logger.verbose('🔀 Setting up destination worktree...');
    const defaultBranch = await getDefaultBranch(paths.destinationRepoPath, isDryRun);
    await addWorktree(
      paths.destinationRepoPath,
      paths.destinationPath,
      defaultBranch,
      defaultBranch,
    );
  }

  // Task 6.4: Remove testing infrastructure setup (no longer JS/TS specific)
  logger.verbose('⏭️  Testing infrastructure setup not needed for stack-agnostic CLI');
}
