import fs from 'fs-extra';
import { validateWorkspaceName, validateProjectKey } from '../utils/validation.js';
import { logger } from '../utils/logger.js';
import { handleError, FileSystemError } from '../utils/errors.js';
import { configManager } from '../utils/config.js';
import type { Command } from 'commander';

export function infoCommand(program: Command): void {
  program
    .command('info <project> <workspace>')
    .description('Display detailed space status, paths, and configuration')
    .addHelpText(
      'after',
      `
Examples:
  $ space info next feature_my-new-feature
    Show details for the Next.js space "feature_my-new-feature"

  $ space info node bugfix_issue-123
    Show details for the Node.js space "bugfix_issue-123"

Description:
  This command provides comprehensive information about a specific space,
  including:
  
  • Project configuration and paths
  • Space directory structure
  • Git worktree status (SDK and samples)
  • Environment file availability
  • Sample application paths

  The workspace status indicators show:
  OK: Ready - Component is properly set up
  MISSING: Missing - Component needs to be initialized or has been removed

  This is useful for debugging space issues or verifying that
  initialization completed successfully.

Related commands:
  space list        List all spaces
  space init        Create a new space
  space clean       Remove a space`,
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
        console.log(`  Source: ${sourceExists ? 'OK: Ready' : 'MISSING: Missing'}`);
        console.log(`  Destination: ${destinationExists ? 'OK: Ready' : 'MISSING: Missing'}`);

        // Show environment file status
        const envFilePath = configManager.getEnvFilePath(validatedProject);
        if (envFilePath) {
          const envExists = fs.existsSync(envFilePath);
          console.log(
            `  Environment: ${envExists ? 'OK: Available' : 'MISSING: Missing'} (${envFilePath})`,
          );
        }
      } catch (error) {
        handleError(error as Error, logger);
      }
    });
}
