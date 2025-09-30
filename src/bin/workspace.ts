#!/usr/bin/env node
import { Command } from 'commander';
import { createRequire } from 'module';
import fs from 'fs-extra';
import { loadEnv } from '../utils/env.js';
import { logger, LogLevel } from '../utils/logger.js';
import { validateDependencies } from '../utils/validation.js';
import { handleError } from '../utils/errors.js';
import { configManager } from '../utils/config.js';
import prompts from 'prompts';
import { buildHelpText } from '../utils/help.js';
import { setGlobalOptions } from '../utils/globalOptions.js';
import { commandLoader } from '../utils/lazyLoader.js';
import { getProjectsWithValidation, displayProjectsList } from '../utils/projectValidation.js';
import { createSetupWizard, handleSetupResult, checkSetupNeeded } from '../utils/setupHelpers.js';

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
    const projects = getProjectsWithValidation(false);

    if (projects.length === 0) {
      return;
    }

    displayProjectsList(projects);

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
    // Import the init command setup
    const { initCommand } = await import('../commands/init.js');

    // Create a temporary command to set up the init subcommand
    const tempProgram = new Command();
    initCommand(tempProgram);

    // Find the init subcommand
    const initCmd = tempProgram.commands.find((cmd) => cmd.name() === 'init');
    if (!initCmd) {
      throw new Error('Init command not found');
    }

    // Parse empty arguments to trigger interactive mode
    await initCmd.parseAsync([], { from: 'user' });
  } catch (error) {
    handleError(error as Error, logger);
  }
}

/**
 * Execute the setup command logic
 */
async function executeSetupCommand(options: { force?: boolean } = {}): Promise<void> {
  const wizard = createSetupWizard();

  // Check if setup is needed, but allow force override for interactive mode
  checkSetupNeeded(wizard, options.force);

  // Run the setup wizard with force option
  const result = await wizard.run({ force: options.force || false });

  handleSetupResult(result);
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

    const projects = getProjectsWithValidation(true);

    if (projects.length === 0) {
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
      await executeSetupCommand({ force: true });
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
program.option('--no-config', 'Run without loading any configuration files (testing mode)');

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
        const wizard = createSetupWizard();
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

// Setup lazy command loading to improve startup time
async function setupLazyCommands() {
  // Get the command name being executed
  const args = process.argv.slice(2);
  const commandName = args.find((arg) => !arg.startsWith('-'));

  // Default to 'help' or load all if no specific command
  if (!commandName || ['--help', '-h', 'help'].includes(commandName)) {
    // Load all commands for help display
    await commandLoader.loadAllCommands(program);
  } else {
    // Load only the specific command being executed
    const loaded = await commandLoader.loadAndRegisterCommand(program, commandName);
    if (!loaded) {
      // Fallback: load all commands if specific one failed
      logger.debug(`Failed to load specific command '${commandName}', loading all commands`);
      await commandLoader.loadAllCommands(program);
    }
  }
}

// Store the lazy loading promise to be awaited later
const lazyCommandsPromise = setupLazyCommands();

program.hook('preAction', async (thisCommand) => {
  try {
    const opts = thisCommand.opts();

    // Handle --no-config flag for testing mode
    if (opts.noConfig) {
      configManager.enableNoConfigMode();
      setGlobalOptions({
        env: opts.env,
        config: opts.config,
        verbose: opts.verbose,
        debug: opts.debug,
        pr: opts.pr,
        nonInteractive: opts.nonInteractive,
        noConfig: true,
      });

      // Set logging level based on options
      if (opts.debug) {
        logger.setLevel(LogLevel.DEBUG);
      } else if (opts.verbose) {
        logger.setLevel(LogLevel.VERBOSE);
      }

      return; // Skip normal config loading
    }

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

// Ensure lazy commands are loaded before parsing
(async () => {
  await lazyCommandsPromise;
  program.parse();
})();
