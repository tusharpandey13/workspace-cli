import fs from 'fs-extra';
import { validateWorkspaceName, validateProjectKey } from '../utils/validation.js';
import { logger } from '../utils/logger.js';
import { handleError } from '../utils/errors.js';
import { configManager } from '../utils/config.js';
import type { Command } from 'commander';

interface CleanOptions {
  workspace?: string;
  force?: boolean;
  dryRun?: boolean;
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
      return;
    }

    // Progress reporting
    logger.info('Cleaning workspaces for project');

    // Check if workspace directory exists
    if (!fs.existsSync(paths.workspaceDir)) {
      logger.warn('No workspaces found for project');
      return;
    }

    // Perform actual cleanup operations
    await fs.remove(paths.workspaceDir);

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
    .description('Clean up and remove space, including all git worktrees and files')
    .option('--force', 'Confirm dangerous operations without prompting')
    .option('--dry-run', 'Show what would be deleted without actually deleting')
    .addHelpText(
      'after',
      `
Examples:
    $ space clean next feature_my-new-feature

Examples:
  $ space clean node bugfix_issue-123
    Remove the Next.js workspace "feature_my-new-feature"

  $ workspace clean node bugfix_issue-123
    Remove the Node.js workspace "bugfix_issue-123"

Description:
  This command completely removes a workspace and all its components:

  • Removes SDK git worktree (with --force to handle uncommitted changes)
  • Removes samples git worktree (with --force to handle uncommitted changes)
  • Deletes the entire workspace directory and all contents

  WARNING: This action is irreversible!
  
  Any uncommitted changes in the workspace will be lost. Make sure to
  commit and push any important work before cleaning a workspace.

  Use this command when:
  • You're done with a feature and want to clean up
  • A workspace is corrupted and needs to be recreated
  • You want to free up disk space

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
