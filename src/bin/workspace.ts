#!/usr/bin/env node
import { Command } from 'commander';
import { createRequire } from 'module';
import fs from 'fs-extra';
import { loadEnv } from '../utils/env.js';
import { logger, LogLevel } from '../utils/logger.js';
import { validateDependencies } from '../utils/validation.js';
import { handleError } from '../utils/errors.js';
import { configManager } from '../utils/config.js';
import { SetupWizard } from '../services/setupWizard.js';
import prompts from 'prompts';
import { listCommand } from '../commands/list.js';
import { initCommand } from '../commands/init.js';
import { infoCommand } from '../commands/info.js';
import { cleanCommand } from '../commands/clean.js';
import { projectsCommand } from '../commands/projects.js';
import { setupCommand } from '../commands/setup.js';
import { buildHelpText } from '../utils/help.js';
import { setGlobalOptions } from '../utils/globalOptions.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

/**
 * Execute the list command logic
 */
async function executeListCommand(): Promise<void> {
  try {
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
            hasAnyWorkspaces = true;
            console.log(`\n${project.name} (${projectKey}):`);
            dirs.forEach((dir) => console.log(`  ${dir}`));
          }
        }
      } catch (error) {
        // Continue to next project if this one fails
        continue;
      }
    }

    if (!hasAnyWorkspaces) {
      logger.info('No workspaces found for any project.');
      console.log('\nTo create a workspace, use:');
      console.log('  space init <project> <branch-name>');
      console.log('\nTo see available projects, use:');
      console.log('  space projects');
    }
  } catch (error) {
    handleError(error as Error, logger);
  }
}

/**
 * Execute the projects command logic
 */
async function executeProjectsCommand(): Promise<void> {
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
      console.log(`    Repo: ${project.repo}`);
      console.log(`    Samples: ${project.sample_repo || 'N/A'}`);
      if (project.github_org) {
        console.log(`    GitHub Org: ${project.github_org}`);
      }
      console.log('');
    }

    console.log('Usage:');
    console.log(`  space init <project> [github-ids...] <branch-name>`);
    console.log(`  space init ${projects[0]} 123 456 feature/my-branch`);
  } catch (error) {
    handleError(error as Error, logger);
  }
}

/**
 * Execute interactive init workflow
 */
async function executeInteractiveInit(): Promise<void> {
  try {
    const projects = configManager.listProjects();

    if (projects.length === 0) {
      console.log('No projects configured. Run "space setup" to add projects first.');
      return;
    }

    console.log("🚀 Let's create a new workspace!\n");

    // Interactive prompts for init
    const initResponse = await prompts([
      {
        type: 'select',
        name: 'project',
        message: 'Select a project:',
        choices: projects.map((key) => {
          const project = configManager.getProject(key);
          return {
            title: `${key} → ${project.name}`,
            value: key,
            description: project.repo,
          };
        }),
      },
      {
        type: 'text',
        name: 'branchName',
        message: 'Enter branch name:',
        initial: 'feature/new-feature',
        validate: (val: string) => (val.trim() ? true : 'Branch name is required'),
      },
      {
        type: 'text',
        name: 'githubIds',
        message: 'GitHub issue IDs (optional, space-separated):',
        initial: '',
      },
    ]);

    if (!initResponse.project) {
      console.log('Init cancelled.');
      return;
    }

    // Build command arguments
    const args = [initResponse.project];

    // Add GitHub IDs if provided
    if (initResponse.githubIds.trim()) {
      const ids = initResponse.githubIds.trim().split(/\s+/);
      args.push(...ids);
    }

    args.push(initResponse.branchName);

    // Execute the init command programmatically
    console.log(`\n⚡ Executing: space init ${args.join(' ')}\n`);

    // Import and execute the init command logic
    const { initCommand } = await import('../commands/init.js');
    const initCommandInstance = new Command();
    initCommand(initCommandInstance);

    // Parse and execute with the constructed arguments
    await initCommandInstance.parseAsync(['node', 'space', 'init', ...args], { from: 'user' });
  } catch (error) {
    handleError(error as Error, logger);
  }
}

/**
 * Execute the setup command logic
 */
async function executeSetupCommand(): Promise<void> {
  const { SetupWizard } = await import('../services/setupWizard.js');
  const wizard = new SetupWizard();

  // Check if setup is needed
  if (!wizard.isSetupNeeded({})) {
    logger.info('Configuration already exists. Use --force to reconfigure.');
    return;
  }

  // Run the setup wizard
  const result = await wizard.run({});

  if (result.completed) {
    logger.info('Setup completed! You can now use space-cli commands.');
  } else if (result.skipped) {
    logger.info('Setup was skipped. Run "space setup" when you\'re ready.');
  }
}

/**
 * Show compact project list
 */
async function showCompactProjects(): Promise<void> {
  try {
    if (!configManager.isLoaded()) {
      console.log('No configuration loaded. Run "space setup" to configure projects.');
      return;
    }

    const projects = configManager.listProjects();

    if (projects.length === 0) {
      console.log('No projects configured. Run "space setup" to add projects first.');
      return;
    }

    console.log('\n📚 Available projects:');
    for (const projectKey of projects) {
      const project = configManager.getProject(projectKey);
      console.log(`  ${projectKey} → ${project.name}`);
    }
    console.log('');
  } catch (error) {
    logger.error('Failed to load projects:', error as Error);
  }
}

/**
 * Show interactive menu for configured users
 */
async function showInteractiveMenu(): Promise<void> {
  // First show available projects compactly
  await showCompactProjects();

  // Show interactive menu
  const response = await prompts({
    type: 'select',
    name: 'action',
    message: 'What would you like to do?',
    choices: [
      { title: '🚀 Create new workspace', value: 'init' },
      { title: '📋 List existing workspaces', value: 'list' },
      { title: '📖 View project details', value: 'projects' },
      { title: '🧹 Clean up workspace', value: 'clean' },
      { title: '⚙️  Settings', value: 'setup' },
      { title: '❓ Help', value: 'help' },
    ],
  });

  if (!response.action) {
    console.log('Goodbye!');
    return;
  }

  console.log(''); // Add some space

  switch (response.action) {
    case 'init': {
      await executeInteractiveInit();
      break;
    }

    case 'list': {
      await executeListCommand();
      break;
    }

    case 'projects': {
      await executeProjectsCommand();
      break;
    }

    case 'clean': {
      console.log(`💡 Tip: Use "space ${response.action} <project> <workspace-name>"`);
      console.log('   Run "space list" to see your available workspaces');
      break;
    }

    case 'setup': {
      await executeSetupCommand();
      break;
    }

    case 'help': {
      // Show help directly instead of spawning a process
      program.help();
      break;
    }
  }
}

const program = new Command();
program
  .name('space')
  .description('Stack-agnostic space CLI tool')
  .version(pkg.version)
  .addHelpText('after', buildHelpText());

// Global options
program.option('-e, --env <path>', 'Path to .space.env file');
program.option('-c, --config <path>', 'Path to configuration file');
program.option('-v, --verbose', 'Enable verbose logging');
program.option('--debug', 'Enable debug logging');
program.option('--pr <pr_id>', 'Open space for specific pull request');
program.option('--non-interactive', 'Skip all user input prompts for automated usage');

// Add default action for when no subcommand is provided
program.action(async (options) => {
  try {
    // Check if config is loaded (should have been loaded in preAction hook)
    if (!configManager.isLoaded()) {
      // Config was not loaded in preAction hook, try to load it
      try {
        await configManager.loadConfig(options.config);
      } catch (error) {
        // Config still doesn't exist
        if (options.nonInteractive) {
          logger.error('Configuration not found and --non-interactive mode is enabled.');
          logger.info('Please run "space setup" first to create your configuration, or');
          logger.info('provide a configuration file path with --config <path>');
          process.exit(1);
        }

        // No config exists - run setup wizard
        const wizard = new SetupWizard();
        logger.info('Welcome to space-cli! It looks like this is your first time.');
        logger.info("Let's set up your space configuration.\n");

        const result = await wizard.run();
        if (!result.completed && !result.skipped) {
          logger.info('Setup is required to use space-cli commands.');
          logger.info('Run "space setup" when you\'re ready to configure your space.');
          process.exit(0);
        }

        if (result.completed) {
          logger.info('Setup completed! You can now use space commands.\n');
          // Load the newly created config
          await configManager.loadConfig(options.config);
        } else {
          process.exit(0);
        }
      }
    }

    // Config should now be loaded, show appropriate interface
    if (options.nonInteractive) {
      // In non-interactive mode, show available commands instead of interactive menu
      logger.info('Available commands:');
      logger.info('  space init <project> [github-ids...] <branch-name>  Create a new workspace');
      logger.info(
        '  space list                                           List existing workspaces',
      );
      logger.info('  space projects                                       Show available projects');
      logger.info('  space info <project> <workspace>                    Show workspace details');
      logger.info('  space clean <project> <workspace>                   Clean workspace');
      logger.info('  space setup                                          Configure space-cli');
      logger.info('\nFor more information on any command, use: space <command> --help');
    } else {
      // Config exists - show interactive menu
      await showInteractiveMenu();
    }
  } catch (error) {
    handleError(error as Error, logger);
  }
});

// Register subcommands
initCommand(program);
listCommand(program);
infoCommand(program);
cleanCommand(program);
projectsCommand(program);
program.addCommand(setupCommand);

program.hook('preAction', async (thisCommand) => {
  try {
    const opts = thisCommand.opts();

    // Store global options for access by commands
    setGlobalOptions({
      env: opts.env,
      config: opts.config,
      verbose: opts.verbose,
      debug: opts.debug,
      pr: opts.pr,
      nonInteractive: opts.nonInteractive,
    });

    // Set logging level based on options
    if (opts.debug) {
      logger.setLevel(LogLevel.DEBUG);
    } else if (opts.verbose) {
      logger.setLevel(LogLevel.VERBOSE);
    }

    // Check if this is the first run and we're not running setup command
    const commandName = thisCommand.name();
    const commandOptions = thisCommand.opts();

    if (commandName !== 'setup') {
      // Try to load config first to see if any config exists (including custom paths)
      try {
        await configManager.loadConfig(opts.config);
      } catch (error) {
        // Config loading failed - this will be handled by individual commands
        // For the main action, it will trigger setup wizard
        // For other commands, they will show appropriate error messages
      }
    } else if (commandName === 'setup' && commandOptions.preview) {
      // For setup command with preview, skip the first-run check
      // The preview will be handled by the setup command itself
      // Still load config for setup command if it exists
      try {
        await configManager.loadConfig(opts.config);
      } catch (error) {
        // Config doesn't exist, which is expected for setup command
      }
    }

    // For setup command without preview, load config if it exists
    if (commandName === 'setup' && !commandOptions.preview) {
      try {
        await configManager.loadConfig(opts.config);
      } catch (error) {
        // Config doesn't exist, which is fine for setup command
      }
    }

    // Load environment
    loadEnv(opts.env);

    // Validate dependencies
    await validateDependencies();
  } catch (error) {
    handleError(error as Error, logger);
  }
});

program.parse();
