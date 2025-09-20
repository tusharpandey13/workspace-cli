#!/usr/bin/env node
import { Command } from 'commander';
import { createRequire } from 'module';
import { loadEnv } from '../utils/env.js';
import { logger, LogLevel } from '../utils/logger.js';
import { validateDependencies } from '../utils/validation.js';
import { handleError } from '../utils/errors.js';
import { configManager } from '../utils/config.js';
import { SetupWizard } from '../services/setupWizard.js';
import { initCommand } from '../commands/init.js';
import { listCommand } from '../commands/list.js';
import { infoCommand } from '../commands/info.js';
import { cleanCommand } from '../commands/clean.js';
import { submitCommand } from '../commands/submit.js';
import { projectsCommand } from '../commands/projects.js';
import { registerDoctorCommand } from '../commands/doctor.js';
import { setupCommand } from '../commands/setup.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

const program = new Command();
program
  .name('space')
  .description('Stack-agnostic workspace CLI tool')
  .version(pkg.version)
  .addHelpText(
    'after',
    `
Global Options:
  The following options can be used with any subcommand:

  -e, --env <path>       Path to custom .workspace.env file
  -c, --config <path>    Path to custom configuration file
  -v, --verbose          Enable verbose logging output
  --debug                Enable debug logging (most detailed)
  --pr <pr_id>           Initialize workspace for specific pull request
  --non-interactive      Skip all user input prompts for automated usage

Examples:
  $ space init next feature/my-branch
    Create a new Next.js workspace

  $ space --pr 123 init react
    Create a React workspace for pull request #123

  $ space list
    Show all existing workspaces

  $ space projects
    Show available projects

  $ space info next feature_my-branch
    Show details for a specific workspace

  $ space submit next feature_my-branch
    Submit workspace changes as a pull request

  $ space clean next feature_my-branch
    Remove a workspace completely

Getting Started:
  1. Run "space setup" to configure your workspace (first time)
  2. Run "space projects" to see available projects
  3. Run "space init <project> <branch-name>" to create a workspace
  4. Develop in the created workspace directories
  5. Run "space submit <project> <workspace>" when ready to submit
  6. Run "space clean <project> <workspace>" when done

For detailed help on any command, use:
  space <command> --help`,
  );

// Global options
program.option('-e, --env <path>', 'Path to .workspace.env file');
program.option('-c, --config <path>', 'Path to configuration file');
program.option('-v, --verbose', 'Enable verbose logging');
program.option('--debug', 'Enable debug logging');
program.option('--pr <pr_id>', 'Open workspace for specific pull request');
program.option('--non-interactive', 'Skip all user input prompts for automated usage');

// Register subcommands
initCommand(program);
listCommand(program);
infoCommand(program);
cleanCommand(program);
submitCommand(program);
projectsCommand(program);
registerDoctorCommand(program);
program.addCommand(setupCommand);

program.hook('preAction', async (thisCommand) => {
  try {
    const opts = thisCommand.opts();

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
      const wizard = new SetupWizard();
      if (wizard.isSetupNeeded()) {
        logger.info('🚀 Welcome to space-cli! It looks like this is your first time.');
        logger.info("Let's set up your workspace configuration.\n");

        const result = await wizard.run();
        if (!result.completed && !result.skipped) {
          logger.info('Setup is required to use space-cli commands.');
          logger.info('Run "space setup" when you\'re ready to configure your workspace.');
          process.exit(0);
        }

        if (result.completed) {
          logger.info('✅ Setup completed! Continuing with your command...\n');
        }
      }
    } else if (commandName === 'setup' && commandOptions.preview) {
      // For setup command with preview, skip the first-run check
      // The preview will be handled by the setup command itself
    }

    // Load configuration
    await configManager.loadConfig(opts.config);

    // Load environment
    loadEnv(opts.env);

    // Validate dependencies
    await validateDependencies();
  } catch (error) {
    handleError(error as Error, logger);
  }
});

program.parse();
