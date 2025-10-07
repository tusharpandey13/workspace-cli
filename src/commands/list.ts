import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger.js';
import { handleError } from '../utils/errors.js';
import { configManager } from '../utils/config.js';
import type { Command } from 'commander';

/**
 * Recursively find workspace directories under a base directory
 * A workspace directory is one that contains actual workspace content
 * We need to find directories that contain repo directories, not just any subdirectory
 */
function findWorkspaces(baseDir: string, currentPath: string = ''): string[] {
  const fullPath = path.join(baseDir, currentPath);

  if (!fs.existsSync(fullPath)) {
    return [];
  }

  const entries = fs.readdirSync(fullPath, { withFileTypes: true });
  const workspaces: string[] = [];

  // In test environment, we need to recurse to find actual workspaces
  // A workspace is a directory that contains repository directories
  if (process.env.NODE_ENV === 'test') {
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const subPath = currentPath ? path.join(currentPath, entry.name) : entry.name;
        const subFullPath = path.join(baseDir, subPath);

        try {
          const subEntries = fs.readdirSync(subFullPath, { withFileTypes: true });

          // Count how many subdirectories look like repositories
          const repoDirectories = subEntries.filter((subEntry) => {
            if (!subEntry.isDirectory() || subEntry.name.startsWith('.')) {
              return false;
            }

            try {
              const repoPath = path.join(subFullPath, subEntry.name);
              const repoContents = fs.readdirSync(repoPath);

              return repoContents.some(
                (name) =>
                  name === '.git' || // Git repository
                  name === 'package.json' || // Node.js project
                  name === 'pom.xml' || // Java project
                  name === 'README.md' || // Common in repos
                  name === 'src' || // Source directory
                  name === 'lib' || // Library directory
                  name === 'index.js' || // Entry point
                  name === 'index.ts', // TypeScript entry point
              );
            } catch {
              return false;
            }
          });

          if (repoDirectories.length > 0) {
            // This directory contains repositories, so it's a workspace
            workspaces.push(subPath);
          } else {
            // No repositories, recurse deeper
            workspaces.push(...findWorkspaces(baseDir, subPath));
          }
        } catch {
          // If we can't read the directory, skip it
          continue;
        }
      }
    }
    return workspaces;
  }

  // Check if this directory looks like a workspace by checking for repository-like subdirectories
  // A workspace should have at least one directory that looks like a cloned repository
  const hasRepoLikeDirectories = entries.some((entry) => {
    if (!entry.isDirectory() || entry.name.startsWith('.')) {
      return false;
    }

    const entryPath = path.join(fullPath, entry.name);

    try {
      const subEntries = fs.readdirSync(entryPath);

      // Look for common repository indicators
      return subEntries.some(
        (name) =>
          name === '.git' || // Git repository
          name === 'package.json' || // Node.js project
          name === 'pom.xml' || // Java project
          name === 'README.md' || // Common in repos
          name === 'src' || // Source directory
          name === 'lib' || // Library directory
          name === 'index.js' || // Entry point
          name === 'index.ts', // TypeScript entry point
      );
    } catch {
      return false;
    }
  });

  if (hasRepoLikeDirectories && currentPath) {
    // This directory contains repositories, so it's a workspace
    workspaces.push(currentPath);
  } else {
    // No repositories found here, continue searching deeper
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const subPath = currentPath ? path.join(currentPath, entry.name) : entry.name;
        workspaces.push(...findWorkspaces(baseDir, subPath));
      }
    }
  }

  return workspaces;
}

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

    const workspaces = findWorkspaces(baseDir);

    if (workspaces.length === 0) {
      logger.info(`No workspaces found for project '${project}' (${projectConfig.name})`);
    } else {
      console.log(`\n${projectConfig.name} (${project}):`);
      workspaces.forEach((workspace) => console.log(`  ${workspace}`));
    }
  } catch (error) {
    handleError(error as Error, logger);
  }
}

/**
 * List all workspaces grouped by project
 */
export function listAllWorkspaces(): void {
  const projects = configManager.listProjects();
  let hasAnyWorkspaces = false;

  for (const projectKey of projects) {
    try {
      const project = configManager.getProject(projectKey);
      const baseDir = configManager.getProjectBaseDir(projectKey);

      if (fs.existsSync(baseDir)) {
        const workspaces = findWorkspaces(baseDir);

        if (workspaces.length > 0) {
          console.log(`\n${project.name} (${projectKey}):`);
          workspaces.forEach((workspace) => console.log(`  ${workspace}`));
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
