import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger.js';
import { executeGitCommand } from '../utils/secureExecution.js';
import { validateBranchName, validateRepositoryPath } from '../utils/validation.js';
import { fileOps } from '../utils/init-helpers.js';
import type { ProjectConfig, WorkspacePaths } from '../types/index.js';
import { ConfigManager } from '../utils/config.js';

/**
 * Ensure repository exists locally by cloning if necessary
 */
async function ensureRepositoryExists(
  repoPath: string,
  repoUrl: string,
  repoName: string,
  isDryRun: boolean,
): Promise<void> {
  if (isDryRun) {
    logger.verbose(`[DRY RUN] Would ensure repository exists at ${repoPath}`);
    return;
  }

  // Validate URL before using it
  validateRepositoryPath(repoUrl);

  // If repository already exists, we're good
  if (fs.existsSync(repoPath)) {
    const gitDir = path.join(repoPath, '.git');
    if (fs.existsSync(gitDir)) {
      logger.verbose(`✅ Repository ${repoName} already exists at ${repoPath}`);
      return;
    }
  }

  // Repository doesn't exist, clone it
  logger.info(`📥 Repository ${repoName} not found locally, cloning from ${repoUrl}...`);

  // Ensure parent directory exists
  const parentDir = path.dirname(repoPath);
  await fileOps.ensureDir(parentDir, `parent directory for ${repoName}`, isDryRun);

  try {
    const result = await executeGitCommand(['clone', repoUrl, repoPath], {});

    if (result.exitCode !== 0) {
      throw new Error(`Git clone failed: ${result.stderr}`);
    }

    logger.success(`✅ Successfully cloned ${repoName} to ${repoPath}`);
  } catch (error) {
    throw new Error(
      `Failed to clone repository ${repoName} from ${repoUrl}: ${(error as Error).message}`,
    );
  }
}

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
      const result = await executeGitCommand(['remote', 'get-url', 'origin'], { cwd: repoPath });

      if (result.exitCode !== 0) {
        throw new Error(`Git remote command failed: ${result.stderr}`);
      }
    } catch {
      logger.warn(`Repository ${repoName} does not have an 'origin' remote`);
      // Continue anyway - might be a local-only repo
    }

    // Check if repository is in a clean state (no pending worktree operations)
    try {
      const result = await executeGitCommand(['worktree', 'list'], { cwd: repoPath });

      if (result.exitCode !== 0) {
        throw new Error(`Git worktree command failed: ${result.stderr}`);
      }
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
    const result = await executeGitCommand(['fetch', 'origin', '--prune'], { cwd: repoPath });

    if (result.exitCode !== 0) {
      throw new Error(`Git fetch failed: ${result.stderr}`);
    }

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
    const result = await executeGitCommand(['symbolic-ref', 'refs/remotes/origin/HEAD'], {
      cwd: repoPath,
    });

    if (result.exitCode === 0) {
      const defaultRef = result.stdout.trim();
      const branchName = defaultRef.replace('refs/remotes/origin/', '');
      return branchName;
    }

    throw new Error('Failed to get default branch');
  } catch {
    // Fallback: check if main or master exists locally
    try {
      const result = await executeGitCommand(
        ['show-ref', '--verify', '--quiet', 'refs/heads/main'],
        { cwd: repoPath },
      );

      if (result.exitCode === 0) {
        return 'main';
      }

      throw new Error('Main branch not found');
    } catch {
      try {
        const result = await executeGitCommand(
          ['show-ref', '--verify', '--quiet', 'refs/heads/master'],
          { cwd: repoPath },
        );

        if (result.exitCode === 0) {
          return 'master';
        }

        throw new Error('Master branch not found');
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

  // Ensure repositories exist locally (clone if necessary)
  logger.verbose('📥 Ensuring repositories exist locally...');
  await ensureRepositoryExists(paths.sourceRepoPath, project.repo, 'Main Repository', isDryRun);
  if (paths.destinationRepoPath && project.sample_repo) {
    await ensureRepositoryExists(
      paths.destinationRepoPath,
      project.sample_repo,
      'Sample Repository',
      isDryRun,
    );
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
    if (isDryRun) {
      logger.verbose(
        `[DRY RUN] Would create worktree at ${worktreePath} for branch ${targetBranch}`,
      );
      return;
    }

    if (!isDryRun && fs.existsSync(worktreePath)) {
      await fileOps.removeFile(worktreePath, `stale worktree directory: ${worktreePath}`, isDryRun);
    }

    try {
      const result = await executeGitCommand(['worktree', 'prune'], { cwd: repoDir });

      if (result.exitCode !== 0) {
        logger.debug(`Worktree prune failed but continuing: ${result.stderr}`);
      }
    } catch {
      // Ignore prune failures
    }

    // Validate branch name before using it
    validateBranchName(targetBranch);

    // Check if branch already exists locally
    const checkBranchResult = await executeGitCommand(
      ['show-ref', '--verify', '--quiet', `refs/heads/${targetBranch}`],
      { cwd: repoDir },
    );

    const branchExists = checkBranchResult.exitCode === 0;

    if (branchExists) {
      logger.verbose(`⚠️  Branch ${targetBranch} already exists locally`);

      // Try to add existing branch to worktree
      try {
        const result = await executeGitCommand(['worktree', 'add', worktreePath, targetBranch], {
          cwd: repoDir,
        });

        if (result.exitCode !== 0) {
          throw new Error(`Failed to add existing branch to worktree: ${result.stderr}`);
        }

        logger.verbose(`✅ Added existing branch ${targetBranch} to worktree`);
        return;
      } catch (error) {
        // If that fails, try force adding
        logger.verbose(`Retrying with force flag...`);

        try {
          const result = await executeGitCommand(
            ['worktree', 'add', '-f', worktreePath, targetBranch],
            { cwd: repoDir },
          );

          if (result.exitCode !== 0) {
            throw new Error(
              `Cannot add branch ${targetBranch} to worktree. The branch exists but may be checked out elsewhere. ` +
                `Please delete the existing branch or use a different branch name.\n` +
                `Error: ${result.stderr}`,
            );
          }

          logger.verbose(`✅ Force added existing branch ${targetBranch} to worktree`);
          return;
        } catch (forceError) {
          throw new Error(
            `Cannot add branch ${targetBranch} to worktree. The branch exists but cannot be used. ` +
              `Please manually delete the existing branch with: git branch -D ${targetBranch}\n` +
              `Error: ${(forceError as Error).message}`,
          );
        }
      }
    }

    // Branch doesn't exist, create new branch from base branch
    try {
      const result = await executeGitCommand(
        ['worktree', 'add', worktreePath, '-b', targetBranch, `origin/${baseBranch}`],
        { cwd: repoDir },
      );

      if (result.exitCode !== 0) {
        throw new Error(`Failed to create new worktree branch: ${result.stderr}`);
      }

      logger.verbose(`✅ Created new branch ${targetBranch} and added to worktree`);
    } catch (error) {
      throw new Error(
        `Failed to create worktree for branch ${targetBranch}. ` +
          `This may indicate repository issues or insufficient permissions.\n` +
          `Error: ${(error as Error).message}`,
      );
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
