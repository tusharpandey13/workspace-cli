import fs from 'fs-extra';
import { logger } from '../utils/logger.js';
import { executeGit, fileOps } from '../utils/init-helpers.js';
import type { ProjectConfig, WorkspacePaths } from '../types/index.js';

/**
 * Get the default branch for a repository (remains identical to logic in init.ts)
 */
export async function getDefaultBranch(repoPath: string, isDryRun: boolean): Promise<string> {
  if (isDryRun) {
    return 'main'; // Default for dry run
  }

  try {
    // Try to get the default branch from remote
    const result = await executeGit(
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
      await executeGit(
        ['show-ref', '--verify', '--quiet', 'refs/heads/main'],
        { cwd: repoPath },
        'check main branch',
        false,
      );
      return 'main';
    } catch {
      try {
        await executeGit(
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
  const addWorktree = async (
    repoDir: string,
    worktreePath: string,
    targetBranch: string,
  ): Promise<void> => {
    if (!isDryRun && fs.existsSync(worktreePath)) {
      await fileOps.removeFile(worktreePath, `stale worktree directory: ${worktreePath}`, isDryRun);
    }

    try {
      await executeGit(
        ['worktree', 'prune'],
        { cwd: repoDir },
        `prune worktrees in ${repoDir}`,
        isDryRun,
      );
    } catch {
      // Ignore prune failures
    }

    try {
      await executeGit(
        ['worktree', 'add', worktreePath, '-b', targetBranch, 'main'],
        { cwd: repoDir },
        `create new worktree with branch ${targetBranch}`,
        isDryRun,
      );
    } catch {
      try {
        await executeGit(
          ['worktree', 'add', worktreePath, targetBranch],
          { cwd: repoDir },
          `add existing branch ${targetBranch} to worktree`,
          isDryRun,
        );
      } catch {
        await executeGit(
          ['worktree', 'add', '-f', worktreePath, targetBranch],
          { cwd: repoDir },
          `force add branch ${targetBranch} to worktree`,
          isDryRun,
        );
      }
    }
  };

  logger.verbose('🔀 Setting up SDK worktree...');
  await addWorktree(paths.sdkRepoPath, paths.sdkPath, branchName);

  logger.verbose('🔀 Setting up samples worktree...');
  const defaultBranch = await getDefaultBranch(paths.sampleRepoPath, isDryRun);
  await addWorktree(paths.sampleRepoPath, paths.samplesPath, defaultBranch);

  logger.success('Git worktrees ready');
}
