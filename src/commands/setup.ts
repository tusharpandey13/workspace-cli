import { Command } from 'commander';
import chalk from 'chalk';
import { SetupWizard, SetupWizardOptions } from '../services/setupWizard.js';
import { logger } from '../utils/logger.js';

interface SetupCommandOptions {
  force?: boolean;
  skip?: boolean;
  preview?: boolean;
}

export const setupCommand = new Command()
  .name('setup')
  .description('Setup wizard to configure your space')
  .option('-f, --force', 'Force setup even if configuration exists')
  .option('-s, --skip', 'Skip setup entirely')
  .option('-p, --preview', 'Show what setup will do without running it')
  .action(async (options: SetupCommandOptions) => {
    try {
      const wizard = new SetupWizard();

      // Show preview if requested
      if (options.preview) {
        await wizard.showPreview();
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
