import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger.js';
import { executeGitCommand } from '../utils/secureExecution.js';
import { validateBranchName, validateRepositoryPath } from '../utils/validation.js';
import { fileOps } from '../utils/init-helpers.js';
import type { ProjectConfig, WorkspacePaths } from '../types/index.js';
import { ConfigManager } from '../utils/config.js';
import { ParallelGitOperations, type GitOperation } from '../utils/parallelGit.js';

/**
 * Create a safe samples branch name from the original branch name
 * Replaces forward slashes with dashes to avoid git reference issues
 */
function createSamplesBranchName(originalBranch: string): string {
  // Replace forward slashes with dashes to create a valid git branch name
  const safeBranchName = originalBranch.replace(/\//g, '-');
  const samplesBranchName = `${safeBranchName}-samples`;

  logger.verbose(`Transforming samples branch name: ${originalBranch} → ${samplesBranchName}`);

  return samplesBranchName;
}

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
 * Uses parallel execution for independent repository operations.
 */
export async function setupWorktrees(
  project: ProjectConfig,
  paths: WorkspacePaths,
  branchName: string,
  isDryRun: boolean,
): Promise<void> {
  // In dry-run mode, skip all actual operations and just log what would happen
  if (isDryRun) {
    logger.info('[DRY RUN] Would set up git worktrees...');
    logger.verbose(`[DRY RUN] Would clone main repository: ${project.repo}`);
    if (project.sample_repo) {
      logger.verbose(`[DRY RUN] Would clone sample repository: ${project.sample_repo}`);
    }
    logger.verbose(`[DRY RUN] Would create worktree for branch: ${branchName}`);
    logger.verbose(`[DRY RUN] Would validate repositories and create workspace structure`);
    return;
  }

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

  // Initialize parallel git operations manager
  const parallelGit = new ParallelGitOperations(4); // Max 4 concurrent operations

  // Phase 1: Parallel Repository Setup (clone, validate, freshness)
  logger.verbose('📦 Setting up repositories in parallel...');
  await executeParallelRepositorySetup(parallelGit, project, paths, config, isDryRun);

  // Phase 2: Parallel Worktree Creation
  logger.verbose('🔀 Creating worktrees in parallel...');
  await executeParallelWorktreeSetup(parallelGit, project, paths, branchName, isDryRun);

  // Validate repository integrity after all operations
  if (!isDryRun) {
    logger.verbose('� Validating repository integrity after parallel operations...');
    const mainRepoValid = await parallelGit.validateRepositoryIntegrity(paths.sourceRepoPath);
    let sampleRepoValid = true;

    if (paths.destinationRepoPath) {
      sampleRepoValid = await parallelGit.validateRepositoryIntegrity(paths.destinationRepoPath);
    }

    if (!mainRepoValid || !sampleRepoValid) {
      throw new Error('Repository integrity validation failed after parallel operations');
    }
  }

  // Task 6.4: Remove testing infrastructure setup (no longer JS/TS specific)
  logger.verbose('⏭️  Testing infrastructure setup not needed for stack-agnostic CLI');
}

/**
 * Execute repository setup operations in parallel (clone, validate, freshness)
 */
async function executeParallelRepositorySetup(
  parallelGit: ParallelGitOperations,
  project: ProjectConfig,
  paths: WorkspacePaths,
  config: any,
  isDryRun: boolean,
): Promise<void> {
  const operations: GitOperation[] = [];

  // Repository cloning operations (can run in parallel)
  operations.push({
    id: 'clone-main-repo',
    type: 'clone',
    repoPath: paths.sourceRepoPath,
    description: `Clone main repository to ${paths.sourceRepoPath}`,
    execute: () =>
      ensureRepositoryExists(paths.sourceRepoPath, project.repo, 'Main Repository', isDryRun),
  });

  if (paths.destinationRepoPath && project.sample_repo) {
    operations.push({
      id: 'clone-sample-repo',
      type: 'clone',
      repoPath: paths.destinationRepoPath,
      description: `Clone sample repository to ${paths.destinationRepoPath}`,
      execute: () =>
        ensureRepositoryExists(
          paths.destinationRepoPath!,
          project.sample_repo!,
          'Sample Repository',
          isDryRun,
        ),
    });
  }

  // Execute repository cloning in parallel
  if (operations.length > 0) {
    await parallelGit.executeParallel(operations);
  }

  // Repository validation and freshness (can run in parallel after cloning)
  const validationOperations: GitOperation[] = [];

  validationOperations.push({
    id: 'validate-main-repo',
    type: 'validate',
    repoPath: paths.sourceRepoPath,
    description: `Validate main repository at ${paths.sourceRepoPath}`,
    execute: async () => {
      const valid = await validateRepository(paths.sourceRepoPath, 'Main Repository', isDryRun);
      if (!valid) {
        throw new Error('Main repository validation failed');
      }
    },
  });

  if (paths.destinationRepoPath) {
    validationOperations.push({
      id: 'validate-sample-repo',
      type: 'validate',
      repoPath: paths.destinationRepoPath,
      description: `Validate sample repository at ${paths.destinationRepoPath}`,
      execute: async () => {
        const valid = await validateRepository(
          paths.destinationRepoPath!,
          'Sample Repository',
          isDryRun,
        );
        if (!valid) {
          throw new Error('Sample repository validation failed');
        }
      },
    });
  }

  // Execute repository validation in parallel
  await parallelGit.executeParallel(validationOperations);

  // Repository freshness operations (can run in parallel after validation)
  if (config.repository?.ensure_freshness !== false) {
    const freshnessOperations: GitOperation[] = [];

    freshnessOperations.push({
      id: 'freshness-main-repo',
      type: 'freshness',
      repoPath: paths.sourceRepoPath,
      description: `Ensure freshness of main repository at ${paths.sourceRepoPath}`,
      execute: () => ensureRepositoryFreshness(paths.sourceRepoPath, isDryRun),
    });

    if (paths.destinationRepoPath) {
      freshnessOperations.push({
        id: 'freshness-sample-repo',
        type: 'freshness',
        repoPath: paths.destinationRepoPath,
        description: `Ensure freshness of sample repository at ${paths.destinationRepoPath}`,
        execute: () => ensureRepositoryFreshness(paths.destinationRepoPath!, isDryRun),
      });
    }

    // Execute repository freshness checks in parallel
    await parallelGit.executeParallel(freshnessOperations);
  } else {
    logger.verbose('⏭️  Skipping repository freshness check (disabled in config)');
  }
}

/**
 * Execute worktree creation operations in parallel
 */
async function executeParallelWorktreeSetup(
  parallelGit: ParallelGitOperations,
  project: ProjectConfig,
  paths: WorkspacePaths,
  branchName: string,
  isDryRun: boolean,
): Promise<void> {
  // Default branch fetching operations (can run in parallel)
  const branchOperations: GitOperation[] = [];
  let mainDefaultBranch = 'main';
  let sampleDefaultBranch = 'main';

  branchOperations.push({
    id: 'branch-main-repo',
    type: 'branch',
    repoPath: paths.sourceRepoPath,
    description: `Get default branch for main repository`,
    execute: async () => {
      mainDefaultBranch = await getDefaultBranch(paths.sourceRepoPath, isDryRun);
      return mainDefaultBranch;
    },
  });

  if (paths.destinationRepoPath) {
    branchOperations.push({
      id: 'branch-sample-repo',
      type: 'branch',
      repoPath: paths.destinationRepoPath,
      description: `Get default branch for sample repository`,
      execute: async () => {
        sampleDefaultBranch = await getDefaultBranch(paths.destinationRepoPath!, isDryRun);
        return sampleDefaultBranch;
      },
    });
  }

  // Execute default branch fetching in parallel
  const branchResults = await parallelGit.executeParallel(branchOperations);

  // Extract default branch results
  const mainBranchResult = branchResults.find((r) => r.id === 'branch-main-repo');
  if (mainBranchResult?.result) {
    mainDefaultBranch = mainBranchResult.result;
  }

  const sampleBranchResult = branchResults.find((r) => r.id === 'branch-sample-repo');
  if (sampleBranchResult?.result) {
    sampleDefaultBranch = sampleBranchResult.result;
  }

  // Worktree creation operations (can run in parallel with different target directories)
  const worktreeOperations: GitOperation[] = [];

  worktreeOperations.push({
    id: 'worktree-main',
    type: 'worktree',
    repoPath: paths.sourceRepoPath,
    description: `Create worktree for main repository`,
    execute: () =>
      addWorktree(paths.sourceRepoPath, paths.sourcePath, branchName, isDryRun, mainDefaultBranch),
  });

  if (paths.destinationRepoPath && paths.destinationPath) {
    const samplesBranchName = createSamplesBranchName(branchName);
    worktreeOperations.push({
      id: 'worktree-sample',
      type: 'worktree',
      repoPath: paths.destinationRepoPath,
      description: `Create worktree for sample repository`,
      execute: () =>
        addWorktree(
          paths.destinationRepoPath!,
          paths.destinationPath!,
          samplesBranchName,
          isDryRun,
          sampleDefaultBranch,
        ),
    });
  }

  // Execute worktree creation in parallel
  await parallelGit.executeParallel(worktreeOperations);
}

/**
 * Helper function to create a git worktree for a specific branch
 */
async function addWorktree(
  repoDir: string,
  worktreePath: string,
  targetBranch: string,
  isDryRun: boolean,
  baseBranch: string = 'main',
): Promise<void> {
  if (isDryRun) {
    logger.verbose(`[DRY RUN] Would create worktree at ${worktreePath} for branch ${targetBranch}`);
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
  const checkLocalBranchResult = await executeGitCommand(
    ['show-ref', '--verify', '--quiet', `refs/heads/${targetBranch}`],
    { cwd: repoDir },
  );

  const localBranchExists = checkLocalBranchResult.exitCode === 0;

  // Check if branch exists on remote
  const checkRemoteBranchResult = await executeGitCommand(
    ['show-ref', '--verify', '--quiet', `refs/remotes/origin/${targetBranch}`],
    { cwd: repoDir },
  );

  const remoteBranchExists = checkRemoteBranchResult.exitCode === 0;

  if (localBranchExists) {
    logger.verbose(`⚠️  Branch ${targetBranch} already exists locally`);

    // Check if branch is already used by another worktree
    try {
      const worktreeListResult = await executeGitCommand(['worktree', 'list', '--porcelain'], {
        cwd: repoDir,
      });

      if (worktreeListResult.exitCode === 0) {
        const lines = worktreeListResult.stdout.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('branch ') && line.includes(`refs/heads/${targetBranch}`)) {
            // Found the worktree using this branch
            const worktreeLine = lines[i - 2]; // worktree path is 2 lines before branch line
            const existingPath = worktreeLine.replace('worktree ', '');

            logger.verbose(`Branch ${targetBranch} is used by worktree at: ${existingPath}`);

            // If the existing worktree is prunable (directory doesn't exist), prune it
            if (!fs.existsSync(existingPath)) {
              logger.verbose(`Pruning stale worktree: ${existingPath}`);
              try {
                await executeGitCommand(['worktree', 'prune'], { cwd: repoDir });
                logger.verbose(`✅ Pruned stale worktrees`);
              } catch {
                // Ignore prune failures
              }
              break; // Exit the loop and continue with worktree creation
            } else {
              throw new Error(
                `Branch ${targetBranch} is already used by worktree at ${existingPath}. ` +
                  `Please remove the existing worktree first or use a different branch name.`,
              );
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).message.includes('already used by worktree')) {
        throw error; // Re-throw our custom error
      }
      // If worktree list failed, continue with normal flow
      logger.debug(`Worktree list failed: ${error}`);
    }

    // Try to add existing local branch to worktree
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
  } else if (remoteBranchExists) {
    // Branch exists on remote but not locally - create local tracking branch
    logger.verbose(`📥 Branch ${targetBranch} exists on remote, creating local tracking branch`);
    try {
      const result = await executeGitCommand(
        ['worktree', 'add', worktreePath, '-b', targetBranch, `origin/${targetBranch}`],
        { cwd: repoDir },
      );

      if (result.exitCode !== 0) {
        throw new Error(`Failed to create tracking branch worktree: ${result.stderr}`);
      }

      logger.verbose(`✅ Created local tracking branch ${targetBranch} and added to worktree`);
      return;
    } catch (error) {
      throw new Error(
        `Failed to create worktree from remote branch ${targetBranch}. ` +
          `Error: ${(error as Error).message}`,
      );
    }
  }

  // Branch doesn't exist locally or remotely - create new branch from base branch
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
}
