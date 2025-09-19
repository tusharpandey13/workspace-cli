import fs from 'fs-extra';
import { validateWorkspaceName, validateProjectKey } from '../utils/validation.js';
import { logger } from '../utils/logger.js';
import { handleError, FileSystemError } from '../utils/errors.js';
import { configManager } from '../utils/config.js';
import type { Command } from 'commander';

export function infoCommand(program: Command): void {
  program
    .command('info <project> <workspace>')
    .description('Display detailed workspace status, paths, and configuration')
    .addHelpText(
      'after',
      `
Examples:
  $ space info next feature_my-new-feature
    Show details for the Next.js workspace "feature_my-new-feature"

  $ space info node bugfix_issue-123
    Show details for the Node.js workspace "bugfix_issue-123"

Description:
  This command provides comprehensive information about a specific workspace,
  including:
  
  • Project configuration and paths
  • Workspace directory structure
  • Git worktree status (SDK and samples)
  • Environment file availability
  • Sample application paths

  The workspace status indicators show:
  ✅ Ready - Component is properly set up
  ❌ Missing - Component needs to be initialized or has been removed

  This is useful for debugging workspace issues or verifying that
  initialization completed successfully.

Related commands:
  space list        List all workspaces
  space init        Create a new workspace
  space clean       Remove a workspace`,
    )
    .action((project: string, workspace: string) => {
      try {
        const validatedProject = validateProjectKey(project);
        const validatedWorkspace = validateWorkspaceName(workspace);

        const projectConfig = configManager.validateProject(validatedProject);
        const paths = configManager.getWorkspacePaths(validatedProject, validatedWorkspace);

        if (!fs.existsSync(paths.workspaceDir)) {
          throw new FileSystemError(
            `Workspace '${validatedWorkspace}' not found for project '${validatedProject}' at ${paths.workspaceDir}`,
          );
        }

        logger.info(`Project: ${projectConfig.name} (${validatedProject})`);
        logger.info(`Workspace: ${paths.workspaceDir}`);
        logger.info(`Source Path: ${paths.sourcePath}`);
        logger.info(`Destination Path: ${paths.destinationPath || 'N/A'}`);

        // Show status of worktrees
        const sourceExists = fs.existsSync(paths.sourcePath);
        const destinationExists = fs.existsSync(paths.destinationPath || '');

        console.log('');
        logger.info('Worktree Status:');
        console.log(`  Source: ${sourceExists ? '✅ Ready' : '❌ Missing'}`);
        console.log(`  Destination: ${destinationExists ? '✅ Ready' : '❌ Missing'}`);

        // Show environment file status
        const envFilePath = configManager.getEnvFilePath(validatedProject);
        if (envFilePath) {
          const envExists = fs.existsSync(envFilePath);
          console.log(
            `  Environment: ${envExists ? '✅ Available' : '❌ Missing'} (${envFilePath})`,
          );
        }
      } catch (error) {
        handleError(error as Error, logger);
      }
    });
}
