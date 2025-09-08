import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger.js';
import { executeCommand, fileOps } from '../utils/init-helpers.js';
import type { ProjectConfig, WorkspacePaths } from '../types/index.js';
import { SampleAppInfrastructureManager } from './sampleAppInfra.js';
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
 */
async function ensureRepositoryFreshness(repoPath: string, isDryRun: boolean): Promise<void> {
  if (isDryRun) {
    logger.verbose(`[DRY RUN] Would fetch latest changes for ${repoPath}`);
    return;
  }

  try {
    // Fetch latest changes from origin
    await executeCommand(
      'git',
      ['fetch', 'origin'],
      { cwd: repoPath },
      `fetch latest changes from origin for ${repoPath}`,
      isDryRun,
    );

    // Get current branch and check if it's behind origin
    const currentBranch = await executeCommand(
      'git',
      ['branch', '--show-current'],
      { cwd: repoPath },
      'get current branch',
      false,
    );

    const branch = currentBranch.stdout.trim();
    if (branch) {
      try {
        // Check if local branch is behind origin
        const behindCount = await executeCommand(
          'git',
          ['rev-list', '--count', `${branch}..origin/${branch}`],
          { cwd: repoPath },
          'check if branch is behind origin',
          false,
        );

        const commitsBehind = parseInt(behindCount.stdout.trim(), 10);
        if (commitsBehind > 0) {
          logger.warn(`Repository ${repoPath} is ${commitsBehind} commits behind origin/${branch}`);

          // Only update if we're on main/master to avoid conflicts
          if (branch === 'main' || branch === 'master') {
            await executeCommand(
              'git',
              ['pull', 'origin', branch],
              { cwd: repoPath },
              `update ${branch} branch`,
              isDryRun,
            );
            logger.success(`✅ Updated ${branch} branch in ${repoPath}`);
          }
        } else {
          logger.verbose(`✅ Repository ${repoPath} is up to date`);
        }
      } catch {
        // If we can't check, just log and continue
        logger.verbose(`Could not check if ${repoPath} is behind origin`);
      }
    }
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
  const sdkValid = await validateRepository(paths.sdkRepoPath, 'SDK', isDryRun);
  const sampleValid = await validateRepository(paths.sampleRepoPath, 'Sample', isDryRun);

  if (!sdkValid || !sampleValid) {
    throw new Error('Repository validation failed - cannot proceed with worktree setup');
  }

  // Task 6.1 & 6.2: Ensure repositories are fresh before creating worktrees (configurable)
  if (config.repository?.ensure_freshness !== false) {
    logger.verbose('🔄 Ensuring repository freshness...');
    await ensureRepositoryFreshness(paths.sdkRepoPath, isDryRun);
    await ensureRepositoryFreshness(paths.sampleRepoPath, isDryRun);
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

  logger.verbose('🔀 Setting up SDK worktree...');
  await addWorktree(paths.sdkRepoPath, paths.sdkPath, branchName, 'main');

  logger.verbose('🔀 Setting up samples worktree...');
  const defaultBranch = await getDefaultBranch(paths.sampleRepoPath, isDryRun);
  await addWorktree(paths.sampleRepoPath, paths.samplesPath, defaultBranch, defaultBranch);

  // Task 6.4: Set up testing infrastructure for sample apps (enhanced integration)
  if (project.sample_app_path && config.testing?.auto_setup_infrastructure !== false) {
    logger.verbose('🧪 Setting up testing infrastructure for sample app...');
    try {
      const sampleFullPath = paths.samplesPath + '/' + project.sample_app_path;
      const infraManager = new SampleAppInfrastructureManager(sampleFullPath, isDryRun);

      await infraManager.setupTestingInfrastructure();
      await infraManager.setupReportingInfrastructure();

      logger.success(`✅ Testing infrastructure configured for ${project.key} sample app`);
    } catch (error) {
      logger.warn(`Could not set up testing infrastructure: ${error}`);
      // Don't fail the entire operation if infrastructure setup fails
    }
  } else if (project.sample_app_path) {
    logger.verbose('⏭️  Skipping testing infrastructure setup (disabled in config)');
  } else {
    logger.verbose('ℹ️  No sample app path configured - skipping testing infrastructure setup');
  }

  logger.success('✅ Git worktrees ready with fresh repositories and testing infrastructure');
}
