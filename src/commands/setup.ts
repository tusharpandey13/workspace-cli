import { Command } from 'commander';
import chalk from 'chalk';
import { SetupWizard, SetupWizardOptions } from '../services/setupWizard.js';
import { logger } from '../utils/logger.js';
import { isNonInteractive } from '../utils/globalOptions.js';

interface SetupCommandOptions {
  force?: boolean;
  skip?: boolean;
  preview?: boolean;
  srcDir?: string;
  workspaceBase?: string;
  envFilesDir?: string;
  addProject?: string[];
}

export const setupCommand = new Command()
  .name('setup')
  .description('Setup wizard to configure your space')
  .option('-f, --force', 'Force setup even if configuration exists')
  .option('-s, --skip', 'Skip setup entirely')
  .option('-p, --preview', 'Show what setup will do without running it')
  .option('--src-dir <path>', 'Directory to store repositories (e.g., ~/src)')
  .option('--workspace-base <name>', 'Space directory name (e.g., workspaces)')
  .option('--env-files-dir <path>', 'Directory for environment files (e.g., ./env-files)')
  .option(
    '--add-project <project>',
    'Add project in format: key:name:repo[:sample_repo]',
    (value, previous: string[] = []) => [...previous, value],
  )
  .addHelpText(
    'after',
    `
Examples:
  $ space setup --src-dir ~/src --workspace-base workspaces --env-files-dir ./env-files
    Setup with basic configuration non-interactively

  $ space setup --add-project "next:Next.js:https://github.com/nextjs/next.js.git"
    Setup and add a project non-interactively

  $ space setup --src-dir ~/dev --add-project "api:My API:https://github.com/user/api.git:https://github.com/user/api-samples.git"
    Setup with custom source directory and project with samples

  $ space setup --force --non-interactive --src-dir ~/projects
    Force reconfigure existing setup non-interactively

Description:
  The setup command configures your space-cli environment. In interactive mode,
  it guides you through the configuration process. In non-interactive mode
  (--non-interactive global flag), you can provide all configuration via CLI options.
  
  Project format for --add-project: key:name:repo[:sample_repo]
  • key: Short identifier for the project (e.g., 'next', 'api')
  • name: Human-readable name (e.g., 'Next.js Project')  
  • repo: Git repository URL
  • sample_repo: Optional sample repository URL`,
  )
  .action(async (options: SetupCommandOptions) => {
    try {
      const wizard = new SetupWizard();

      // Show preview if requested
      if (options.preview) {
        await wizard.showPreview();
        return;
      }

      // Handle non-interactive mode
      if (isNonInteractive()) {
        const setupOptions: SetupWizardOptions = {};
        if (options.force !== undefined) setupOptions.force = options.force;
        if (options.skip !== undefined) setupOptions.skip = options.skip;

        // Handle skip option first
        if (options.skip) {
          logger.info(chalk.yellow('Setup was skipped. Run "space setup" when you\'re ready.'));
          return;
        }

        // Check if setup is needed (unless forced)
        if (!options.force && !wizard.isSetupNeeded(setupOptions)) {
          logger.info(chalk.green('✅ Configuration already exists. Use --force to reconfigure.'));
          return;
        }

        // In non-interactive mode, we need CLI options for setup
        if (!options.srcDir) {
          logger.error('--src-dir is required in non-interactive mode');
          process.exit(1);
        }

        // Create configuration from CLI options
        const result = await wizard.runNonInteractive({
          force: options.force || false,
          srcDir: options.srcDir,
          workspaceBase: options.workspaceBase || 'workspaces',
          envFilesDir: options.envFilesDir || './env-files',
          projects: options.addProject || [],
        });

        if (result.completed) {
          logger.info(chalk.green('🎉 Setup completed! You can now use space-cli commands.'));
        }
        return;
      }

      // Convert options to wizard options
      const wizardOptions: SetupWizardOptions = {
        ...(options.force !== undefined && { force: options.force }),
        ...(options.skip !== undefined && { skip: options.skip }),
      };

      // Check if setup is needed
      if (!wizard.isSetupNeeded(wizardOptions)) {
        logger.info(chalk.green('✅ Configuration already exists. Use --force to reconfigure.'));
        return;
      }

      // Run the setup wizard
      const result = await wizard.run(wizardOptions);

      if (result.completed) {
        logger.info(chalk.green('🎉 Setup completed! You can now use space-cli commands.'));
      } else if (result.skipped) {
        logger.info(chalk.yellow('Setup was skipped. Run "space setup" when you\'re ready.'));
      }
    } catch (error) {
      logger.error('Setup failed:', error instanceof Error ? error : new Error(String(error)));
      process.exit(1);
    }
  });

export default setupCommand;
