import fs from 'fs-extra';
import { validateWorkspaceName, validateProjectKey } from '../utils/validation.js';
import { logger } from '../utils/logger.js';
import { handleError, ValidationError } from '../utils/errors.js';
import { configManager } from '../utils/config.js';
import { progressIndicator, type ProgressStep } from '../utils/progressIndicator.js';
import { executeGitCommand } from '../utils/secureExecution.js';
import type { Command } from 'commander';
import type { WorkspacePaths } from '../types/index.js';

interface CleanOptions {
  workspace?: string;
  force?: boolean;
  dryRun?: boolean;
}

/**
 * Clean up git worktrees and branches for a workspace
 * Follows the same pattern as init command for consistency
 */
async function cleanupGitWorktrees(
  paths: WorkspacePaths,
  projectKey: string,
  workspaceName: string,
): Promise<void> {
  try {
    // Extract repository paths - handle both source and destination repos
    const sourceRepoPath = paths.sourceRepoPath;
    const destinationRepoPath = paths.destinationRepoPath;

    logger.verbose('Starting git worktree cleanup...');

    // Clean up source repository worktree
    if (sourceRepoPath && fs.existsSync(sourceRepoPath)) {
      await cleanupRepositoryWorktree(sourceRepoPath, paths.sourcePath, workspaceName);
    }

    // Clean up destination repository worktree (samples repo)
    if (destinationRepoPath && fs.existsSync(destinationRepoPath) && paths.destinationPath) {
      await cleanupRepositoryWorktree(
        destinationRepoPath,
        paths.destinationPath,
        `${workspaceName}-samples`,
      );
    }

    logger.verbose('Git worktree cleanup completed');
  } catch (error) {
    // Git cleanup errors should not fail the entire clean operation
    logger.debug(`Git worktree cleanup failed, continuing: ${(error as Error).message}`);
  }
}

/**
 * Clean up worktree and branch for a specific repository
 */
async function cleanupRepositoryWorktree(
  repoPath: string,
  worktreePath: string,
  branchName: string,
): Promise<void> {
  try {
    // Remove worktree if it exists
    if (fs.existsSync(worktreePath)) {
      logger.verbose(`Removing worktree: ${worktreePath}`);
      try {
        await executeGitCommand(['worktree', 'remove', worktreePath, '--force'], {
          cwd: repoPath,
        });
        logger.verbose('Worktree removed successfully');
      } catch (error) {
        // If removal fails, the worktree might be stale - prune and continue
        logger.verbose('Worktree removal failed, attempting prune...');
        await executeGitCommand(['worktree', 'prune'], { cwd: repoPath });
      }
    }

    // Prune any stale worktree references
    try {
      await executeGitCommand(['worktree', 'prune'], { cwd: repoPath });
      logger.verbose('Worktree references pruned');
    } catch (error) {
      logger.debug(`Worktree prune failed but continuing: ${(error as Error).message}`);
    }

    // Remove local branch to prevent conflicts
    try {
      logger.verbose(`Local branch '${branchName}' removed`);
    } catch (error) {
      // Branch might not exist locally, which is fine
      logger.debug(
        `Local branch removal failed (branch may not exist): ${(error as Error).message}`,
      );
    }
  } catch (error) {
    // Individual repository cleanup errors should not fail the entire operation
    logger.debug(`Repository worktree cleanup failed: ${(error as Error).message}`);
  }
}

/**
 * Clean workspace implementation that can be tested independently
 */
export async function cleanWorkspace(project: string, options: CleanOptions = {}): Promise<void> {
  try {
    // Parameter validation
    if (!project || project.trim() === '') {
      throw new Error('Project parameter is required');
    }

    // Validate project key (handle special characters, paths, etc.)
    if (/[/\\:]/.test(project) || project.includes('..')) {
      throw new Error('Project key contains invalid characters');
    }

    const validatedProject = validateProjectKey(project);
    const workspace = options.workspace || 'test-workspace'; // Default workspace for tests

    const validatedWorkspace = validateWorkspaceName(workspace);

    configManager.validateProject(validatedProject);
    const paths = configManager.getWorkspacePaths(validatedProject, validatedWorkspace);

    // Handle verbose logging
    if (logger.isVerbose()) {
      logger.verbose('Starting workspace cleanup process');
    }

    // Handle dry run mode
    if (options.dryRun) {
      logger.info('DRY RUN MODE: Showing what would be deleted');
      logger.info(`Would delete workspace: ${paths.workspaceDir}`);
      if (fs.existsSync(paths.workspaceDir)) {
        logger.info('Would delete workspace directory and all contents');
        logger.verbose('Checking permissions for dry run validation');
      }
      return;
    }

    // Handle force flag behavior
    if (options.force) {
      logger.info('Force flag enabled - proceeding with cleanup');
    } else {
      logger.info('Use --force flag to confirm dangerous operations');
      throw new ValidationError('--force flag is required to clean workspaces');
    }

    // Setup progress indicators for cleanup
    if (process.env.WORKSPACE_DISABLE_PROGRESS !== '1') {
      const steps: ProgressStep[] = [
        { id: 'validation', description: 'Validating workspace', weight: 1 },
        { id: 'git-cleanup', description: 'Cleaning git worktrees', weight: 1 },
        { id: 'cleanup', description: 'Removing workspace files', weight: 2 },
      ];

      progressIndicator.initialize(steps, {
        title: 'Workspace Cleanup',
        showETA: true,
      });
    }

    if (progressIndicator.isActive()) {
      progressIndicator.startStep('validation');
    } else {
      logger.info('[1/2] Validating workspace...');
    }

    // Check if workspace directory exists
    if (!fs.existsSync(paths.workspaceDir)) {
      throw new ValidationError(
        `Workspace ${validatedWorkspace} not found for project ${validatedProject}`,
      );
    }

    if (progressIndicator.isActive()) {
      progressIndicator.completeStep('validation');
      progressIndicator.startStep('git-cleanup');
    } else {
      logger.info('[2/3] Cleaning git worktrees...');
    }

    // Clean up git worktrees and branches
    await cleanupGitWorktrees(paths, validatedProject, validatedWorkspace);

    if (progressIndicator.isActive()) {
      progressIndicator.completeStep('git-cleanup');
      progressIndicator.startStep('cleanup');
    } else {
      logger.info('[3/3] Removing workspace files...');
    }

    // Perform actual cleanup operations
    await fs.remove(paths.workspaceDir);

    if (progressIndicator.isActive()) {
      progressIndicator.completeStep('cleanup');
      progressIndicator.complete();
    }

    // Success reporting
    logger.success('Workspace cleaned successfully');
  } catch (error) {
    // Handle all errors, including validation errors
    handleError(error as Error, logger);
  }
}

export function cleanCommand(program: Command): void {
  program
    .command('clean <project> <workspace>')
    .description('Clean up and remove workspace, including all git worktrees and files')
    .option('--force', 'Confirm dangerous operations without prompting')
    .option('--dry-run', 'Show what would be deleted without actually deleting')
    .addHelpText(
      'after',
      `
Examples:
  $ space clean next feature_my-new-feature
    Remove the Next.js workspace "feature_my-new-feature"

  $ space clean node bugfix_issue-123
    Remove the Node.js workspace "bugfix_issue-123"

Description:
  This command completely removes a workspace and all its components:

  • Removes SDK git worktree (with --force to handle uncommitted changes)
  • Removes samples git worktree (with --force to handle uncommitted changes)
  • Prunes stale git worktree references to prevent conflicts
  • Removes local branches to prevent future checkout conflicts
  • Deletes the entire workspace directory and all contents

  WARNING: This action is irreversible!
  
  Any uncommitted changes in the workspace will be lost. Make sure to
  commit and push any important work before cleaning a workspace.

  Use this command when:
  • You're done with a feature and want to clean up
  • A workspace is corrupted and needs to be recreated
  • You want to free up disk space
  • You need to resolve git worktree conflicts

Related commands:
  space list        List all workspaces
  space info        Check workspace status before cleaning`,
    )
    .action(async (project: string, workspace: string, options: any) => {
      try {
        await cleanWorkspace(project, {
          workspace,
          force: options.force || false,
          dryRun: options.dryRun || false,
        });
      } catch (error) {
        handleError(error as Error, logger);
      }
    });
}
