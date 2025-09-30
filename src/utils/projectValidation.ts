/**
 * Common project validation utilities to eliminate code duplication
 */

import { configManager } from './config.js';
import { logger } from './logger.js';

/**
 * Check if any projects are configured
 */
export function validateProjectsExist(): boolean {
  const projects = configManager.listProjects();
  return projects.length > 0;
}

/**
 * Ensure projects are configured, show appropriate message if not
 * @param includeSetupGuidance - Whether to include setup command guidance
 * @returns true if projects exist, false otherwise
 */
export function ensureProjectsConfigured(includeSetupGuidance: boolean = true): boolean {
  const projects = configManager.listProjects();

  if (projects.length === 0) {
    const hasConfigFile = configManager.isLoaded() && !configManager.isNoConfigMode();

    if (includeSetupGuidance) {
      if (hasConfigFile) {
        console.log('Configuration file found, but no projects are configured.');
        console.log('Add projects to your config file, or run "space setup" to reconfigure.');
      } else {
        console.log('No projects configured. Run "space setup" to add projects first.');
      }
    } else {
      if (hasConfigFile) {
        logger.info('Configuration file found, but no projects are configured.');
      } else {
        logger.info('No projects configured.');
      }
    }
    return false;
  }

  return true;
}

/**
 * Get list of projects with validation
 * @param includeSetupGuidance - Whether to include setup command guidance in error
 * @returns Array of project keys, or empty array if validation fails
 */
export function getProjectsWithValidation(includeSetupGuidance: boolean = true): string[] {
  const projects = configManager.listProjects();

  if (projects.length === 0) {
    const hasConfigFile = configManager.isLoaded() && !configManager.isNoConfigMode();

    if (includeSetupGuidance) {
      if (hasConfigFile) {
        console.log('Configuration file found, but no projects are configured.');
        console.log('Add projects to your config file, or run "space setup" to reconfigure.');
      } else {
        console.log('No projects configured. Run "space setup" to add projects first.');
      }
    } else {
      if (hasConfigFile) {
        logger.info('Configuration file found, but no projects are configured.');
      } else {
        logger.info('No projects configured.');
      }
    }
    return [];
  }

  return projects;
}

/**
 * Display projects in a consistent format
 * @param projects - Array of project keys to display
 */
export function displayProjectsList(projects: string[]): void {
  console.log('\nAvailable projects:');

  for (const projectKey of projects) {
    const project = configManager.getProject(projectKey);
    console.log(`  ${projectKey}: ${project.name}`);
    console.log(`    Repo: ${project.repo}`);
    console.log(`    Samples: ${project.sample_repo || 'N/A'}`);
    if (project.github_org) {
      console.log(`    GitHub Org: ${project.github_org}`);
    }
    console.log('');
  }
}
