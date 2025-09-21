import fs from 'fs-extra';
import { logger } from '../utils/logger.js';
import { handleError } from '../utils/errors.js';
import { configManager } from '../utils/config.js';
import type { Command } from 'commander';

/**
 * List workspaces for a specific project
 */
function listProjectWorkspaces(project: string): void {
  try {
    const projectConfig = configManager.getProject(project);
    const baseDir = configManager.getProjectBaseDir(project);

    if (!fs.existsSync(baseDir)) {
      logger.info(`No workspaces found for project '${project}' (${projectConfig.name})`);
      return;
    }

    const dirs = fs
      .readdirSync(baseDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    if (dirs.length === 0) {
      logger.info(`No workspaces found for project '${project}' (${projectConfig.name})`);
    } else {
      console.log(`\n${projectConfig.name} (${project}):`);
      dirs.forEach((dir) => console.log(`  ${dir}`));
    }
  } catch (error) {
    handleError(error as Error, logger);
  }
}

/**
 * List all workspaces grouped by project
 */
function listAllWorkspaces(): void {
  const projects = configManager.listProjects();
  let hasAnyWorkspaces = false;

  for (const projectKey of projects) {
    try {
      const project = configManager.getProject(projectKey);
      const baseDir = configManager.getProjectBaseDir(projectKey);

      if (fs.existsSync(baseDir)) {
        const dirs = fs
          .readdirSync(baseDir, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name);

        if (dirs.length > 0) {
          console.log(`\n${project.name} (${projectKey}):`);
          dirs.forEach((dir) => console.log(`  ${dir}`));
          hasAnyWorkspaces = true;
        }
      }
    } catch (error) {
      logger.warn(
        `Error checking workspaces for project '${projectKey}': ${(error as Error).message}`,
      );
    }
  }

  if (!hasAnyWorkspaces) {
    logger.info('No workspaces found for any project.');
    console.log('\nTo create a workspace, use:');
    console.log('  space init <project> <branch-name>');
    console.log('\nTo see available projects, use:');
    console.log('  space projects');
  }
}

export function listCommand(program: Command): void {
  program
    .command('list [project]')
    .description('List all active spaces, optionally filtered by project')
    .addHelpText(
      'after',
      `
Examples:
  $ space list
    Show all spaces across all projects

  $ space list next
    Show only Next.js Auth0 spaces

  $ space list node
    Show only Node.js Auth0 spaces

Description:
  This command displays all currently active spaces. Each space
  represents a development environment with git worktrees for both SDK
  and samples repositories.

  When no project is specified, all spaces are grouped by project.
  When a project is specified, only spaces for that project are shown.

  If no spaces exist, helpful hints for creating new spaces
  and viewing available projects are displayed.

Related commands:
  space projects    List available projects
  space init        Create a new space
  space info        Show details for a specific space`,
    )
    .action((project?: string) => {
      try {
        if (project) {
          listProjectWorkspaces(project);
        } else {
          listAllWorkspaces();
        }
      } catch (error) {
        handleError(error as Error, logger);
      }
    });
}
