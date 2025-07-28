import { configManager } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { handleError } from '../utils/errors.js';
import type { Command } from 'commander';

export function projectsCommand(program: Command): void {
  program
    .command('projects')
    .description('List all available projects with their configuration details')
    .addHelpText('after', `
Examples:
  $ workspace projects
    Show all configured projects with their repository details

Description:
  This command displays all projects that are available for workspace creation.
  For each project, the following information is shown:

  • Project key and display name
  • SDK repository URL
  • Samples repository URL  
  • GitHub organization

  Project keys are used in other commands like 'init', 'list', 'info', etc.
  to specify which project you want to work with.

  If no projects are configured, this usually indicates that the
  configuration file needs to be set up or updated.

Related commands:
  workspace init        Create a workspace for a project
  workspace list        List workspaces by project`)
    .action(() => {
      try {
        const projects = configManager.listProjects();
        
        if (projects.length === 0) {
          logger.info('No projects configured.');
          return;
        }
        
        console.log('\nAvailable projects:');
        
        for (const projectKey of projects) {
          const project = configManager.getProject(projectKey);
          console.log(`  ${projectKey}: ${project.name}`);
          console.log(`    SDK: ${project.sdk_repo}`);
          console.log(`    Samples: ${project.sample_repo}`);
          console.log(`    GitHub Org: ${project.github_org}`);
          console.log('');
        }
        
        console.log('Usage:');
        console.log(`  workspace init <project> [github-ids...] <branch-name>`);
        console.log(`  workspace init ${projects[0]} 123 456 feature/my-branch`);
      } catch (error) {
        handleError(error as Error, logger);
      }
    });
}
