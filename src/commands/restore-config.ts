import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import prompts from 'prompts';
import chalk from 'chalk';
import type { Command } from 'commander';
import { logger } from '../utils/logger.js';
import { handleError, FileSystemError } from '../utils/errors.js';
import { isNonInteractive } from '../utils/globalOptions.js';

interface RestoreConfigOptions {
  force?: boolean;
  dryRun?: boolean;
}

/**
 * Get the path to the default config.yaml file in the CLI installation
 */
function getDefaultConfigPath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Navigate from src/commands/ to project root where config.yaml is located
  const projectRoot = path.resolve(__dirname, '..', '..');
  return path.join(projectRoot, 'config.yaml');
}

/**
 * Get the target config path in user's home directory
 */
function getUserConfigPath(): string {
  return path.join(os.homedir(), '.space-config.yaml');
}

/**
 * Create a backup of existing config file
 */
async function createConfigBackup(configPath: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${configPath}.backup-${timestamp}`;

  await fs.copy(configPath, backupPath);
  return backupPath;
}

/**
 * Validate that the default config file exists and is readable
 */
async function validateDefaultConfig(defaultConfigPath: string): Promise<void> {
  if (!(await fs.pathExists(defaultConfigPath))) {
    throw new FileSystemError(`Default config file not found at: ${defaultConfigPath}`);
  }

  try {
    await fs.access(defaultConfigPath, fs.constants.R_OK);
  } catch (error) {
    throw new FileSystemError(
      `Cannot read default config file: ${(error as Error).message}`,
      error as Error,
    );
  }

  // Validate it's valid YAML by attempting to parse it
  try {
    const yaml = await import('js-yaml');
    const configContent = await fs.readFile(defaultConfigPath, 'utf8');
    yaml.load(configContent);
  } catch (error) {
    throw new FileSystemError(
      `Default config file contains invalid YAML: ${(error as Error).message}`,
      error as Error,
    );
  }
}

/**
 * Restore the default configuration file
 */
async function restoreConfig(options: RestoreConfigOptions = {}): Promise<void> {
  const { force = false, dryRun = false } = options;

  const defaultConfigPath = getDefaultConfigPath();
  const userConfigPath = getUserConfigPath();

  logger.verbose(`Default config path: ${defaultConfigPath}`);
  logger.verbose(`User config path: ${userConfigPath}`);

  // Validate default config exists and is valid
  await validateDefaultConfig(defaultConfigPath);

  const configExists = await fs.pathExists(userConfigPath);

  if (dryRun) {
    console.log(chalk.blue('🔍 Dry run mode - showing what would be done:'));
    console.log(`  Source: ${defaultConfigPath}`);
    console.log(`  Target: ${userConfigPath}`);

    if (configExists) {
      console.log(chalk.yellow('  • Existing config would be backed up'));
      console.log(chalk.yellow('  • Default config would overwrite existing config'));
    } else {
      console.log(chalk.green('  • Default config would be copied (no existing config)'));
    }
    return;
  }

  let backupPath: string | undefined;

  // Handle existing config file
  if (configExists) {
    if (!force) {
      if (isNonInteractive()) {
        console.log(chalk.yellow('Configuration restore cancelled. Existing config preserved.'));
        return;
      }

      const { shouldOverwrite, shouldBackup } = await prompts([
        {
          type: 'confirm',
          name: 'shouldOverwrite',
          message: 'Configuration file already exists. Overwrite with default config?',
          initial: false,
        },
        {
          type: (prev) => (prev ? 'confirm' : null),
          name: 'shouldBackup',
          message: 'Create a backup of the existing configuration?',
          initial: true,
        },
      ]);

      if (!shouldOverwrite) {
        console.log(chalk.yellow('Configuration restore cancelled. Existing config preserved.'));
        return;
      }

      if (shouldBackup) {
        try {
          backupPath = await createConfigBackup(userConfigPath);
          console.log(chalk.green(`✅ Backup created: ${backupPath}`));
        } catch (error) {
          throw new FileSystemError(
            `Failed to create backup: ${(error as Error).message}`,
            error as Error,
          );
        }
      }
    } else if (force) {
      // In force mode, always create backup unless it's a dry run
      try {
        backupPath = await createConfigBackup(userConfigPath);
        logger.verbose(`Backup created in force mode: ${backupPath}`);
      } catch (error) {
        logger.warn(`Failed to create backup in force mode: ${(error as Error).message}`);
      }
    }
  }

  // Copy default config to user location
  try {
    // Ensure the target directory exists
    await fs.ensureDir(path.dirname(userConfigPath));

    // Copy the default config
    await fs.copy(defaultConfigPath, userConfigPath);

    console.log(chalk.green('✅ Default configuration restored successfully!'));
    console.log(chalk.gray(`Configuration file: ${userConfigPath}`));

    if (backupPath) {
      console.log(chalk.gray(`Previous config backed up to: ${backupPath}`));
    }

    console.log(chalk.blue('\nYou can now use space-cli commands like:'));
    console.log(chalk.cyan('  space projects    # List available projects'));
    console.log(chalk.cyan('  space init <project> <branch>    # Create a workspace'));
  } catch (error) {
    throw new FileSystemError(
      `Failed to restore configuration: ${(error as Error).message}`,
      error as Error,
    );
  }
}

/**
 * Register the restore-config command
 */
export function restoreConfigCommand(program: Command): void {
  program
    .command('restore-config')
    .description('Restore the default configuration file to your home directory')
    .option('--force', 'Overwrite existing configuration without confirmation')
    .option('--dry-run', 'Show what would be done without executing')
    .addHelpText(
      'after',
      `
Examples:
  $ space restore-config
    Restore default config with confirmation prompts

  $ space restore-config --force
    Restore default config without confirmation (creates backup)

  $ space restore-config --dry-run
    Preview what would be done without making changes

Description:
  This command restores the default configuration file to your home directory.
  It's useful when your configuration file gets deleted or corrupted and you
  want to start with the default settings.

  The command will:
  • Copy the default config.yaml from the CLI installation
  • Place it at ~/.space-config.yaml in your home directory
  • Offer to backup any existing configuration before overwriting
  • Validate that the default configuration is valid before copying

  By default, the command will ask for confirmation before overwriting an
  existing configuration file. Use --force to skip confirmation prompts.

Safety features:
  • Validates default config file exists and is valid YAML
  • Creates timestamped backups of existing configurations
  • Requires confirmation before overwriting (unless --force is used)

Related commands:
  space setup       Interactive configuration wizard
  space projects    List configured projects`,
    )
    .action(async (options: RestoreConfigOptions) => {
      try {
        await restoreConfig(options);
      } catch (error) {
        handleError(error as Error, logger);
      }
    });
}
