import fs from 'fs-extra';
import { runGit } from '../utils/git.js';
import { validateWorkspaceName, validateProjectKey } from '../utils/validation.js';
import { logger } from '../utils/logger.js';
import { handleError, GitError, FileSystemError } from '../utils/errors.js';
import { configManager } from '../utils/config.js';
import type { Command } from 'commander';

export function cleanCommand(program: Command): void {
  program
    .command('clean <project> <workspace>')
    .description('Clean up and remove workspace, including all git worktrees and files')
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

  ⚠️  WARNING: This action is irreversible!
  
  Any uncommitted changes in the workspace will be lost. Make sure to
  commit and push any important work before cleaning a workspace.

  Use this command when:
  • You're done with a feature and want to clean up
  • A workspace is corrupted and needs to be recreated
  • You want to free up disk space

Related commands:
  space list        List all workspaces
  space info        Check workspace status before cleaning
  space submit      Commit and push changes before cleaning`,
    )
    .action(async (project: string, workspace: string) => {
      try {
        const validatedProject = validateProjectKey(project);
        const validatedWorkspace = validateWorkspaceName(workspace);

        const projectConfig = configManager.validateProject(validatedProject);
        const paths = configManager.getWorkspacePaths(validatedProject, validatedWorkspace);

        logger.info(`Cleaning ${projectConfig.name} workspace: ${validatedWorkspace}`);

        if (fs.existsSync(paths.sourcePath)) {
          try {
            logger.verbose('Removing source worktree...');
            await runGit(['worktree', 'remove', paths.sourcePath, '--force'], {
              cwd: paths.sourceRepoPath,
            });
            logger.success('Source worktree removed');
          } catch (err) {
            throw new GitError(
              `Failed to remove source worktree: ${(err as Error).message}`,
              err as Error,
            );
          }
        }

        if (paths.destinationPath && fs.existsSync(paths.destinationPath)) {
          try {
            logger.verbose('Removing destination worktree...');
            await runGit(['worktree', 'remove', paths.destinationPath, '--force'], {
              cwd: paths.destinationRepoPath!,
            });
            logger.success('Destination worktree removed');
          } catch (err) {
            throw new GitError(
              `Failed to remove samples worktree: ${(err as Error).message}`,
              err as Error,
            );
          }
        }

        try {
          logger.verbose('Removing workspace directory...');
          await fs.remove(paths.workspaceDir);
          logger.success('Workspace cleaned successfully');
        } catch (err) {
          throw new FileSystemError(
            `Failed to remove workspace directory: ${(err as Error).message}`,
            err as Error,
          );
        }
      } catch (error) {
        handleError(error as Error, logger);
      }
    });
}
