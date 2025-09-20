import prompts from 'prompts';
import chalk from 'chalk';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { logger } from '../utils/logger.js';

export interface SetupWizardOptions {
  force?: boolean;
  skip?: boolean;
}

export interface SetupResult {
  completed: boolean;
  skipped: boolean;
  configPath?: string;
}

export class SetupWizard {
  private configPath: string;

  constructor() {
    this.configPath = path.join(os.homedir(), '.space-config.yaml');
  }

  /**
   * Check if setup is needed (config file doesn't exist or force is true)
   */
  public isSetupNeeded(options: SetupWizardOptions = {}): boolean {
    if (options.force) return true;
    if (options.skip) return false;

    // Check for local config.yaml file (what the wizard creates)
    // We only check for local config, not CLI package defaults
    const localConfigPaths = [
      path.join(process.cwd(), 'config.yaml'),
      path.join(os.homedir(), '.workspace-config.yaml'),
    ];

    return !localConfigPaths.some((configPath) => fs.existsSync(configPath));
  }

  /**
   * Run the setup wizard
   */
  public async run(options: SetupWizardOptions = {}): Promise<SetupResult> {
    if (options.skip) {
      logger.info(
        chalk.yellow(
          '⚠️  Setup skipped. You can run "space setup" later to configure your workspace.',
        ),
      );
      return { completed: false, skipped: true };
    }

    console.log(chalk.blue.bold('🚀 Welcome to space-cli Setup Wizard!'));
    console.log(
      chalk.gray('This will help you configure your workspace for multi-repository development.\n'),
    );

    // Check if config already exists
    if (fs.existsSync(this.configPath) && !options.force) {
      const { overwrite } = await prompts({
        type: 'confirm',
        name: 'overwrite',
        message: 'Configuration file already exists. Overwrite?',
        initial: false,
      });

      if (!overwrite) {
        logger.info(chalk.yellow('Setup cancelled. Existing configuration preserved.'));
        return { completed: false, skipped: true };
      }
    }

    try {
      const config = await this.collectConfiguration();
      await this.writeConfiguration(config);

      console.log(chalk.green.bold('✅ Setup completed successfully!'));
      console.log(chalk.gray(`Configuration saved to: ${this.configPath}`));
      console.log(chalk.blue('\nYou can now use commands like:'));
      console.log(chalk.cyan('  space init <repo-name> <issue-id> <branch-name>'));
      console.log(chalk.cyan('  space list'));
      console.log(chalk.cyan('  space doctor\n'));

      return { completed: true, skipped: false, configPath: this.configPath };
    } catch (error) {
      if (error instanceof Error && error.message === 'cancelled') {
        logger.info(chalk.yellow('Setup cancelled by user.'));
        return { completed: false, skipped: true };
      }
      throw error;
    }
  }

  /**
   * Collect configuration through interactive prompts
   */
  private async collectConfiguration(): Promise<any> {
    // Basic workspace configuration
    const basicConfig = await prompts([
      {
        type: 'text',
        name: 'srcDir',
        message: 'Where would you like to store your repositories?',
        initial: '~/src',
        format: (val: string) => val.replace(/^~/, process.env.HOME || '~'),
      },
      {
        type: 'text',
        name: 'workspaceBase',
        message: 'What should be the workspace directory name?',
        initial: 'workspaces',
      },
      {
        type: 'text',
        name: 'envFilesDir',
        message: 'Where are your environment files stored?',
        initial: './env-files',
      },
    ]);

    if (!basicConfig.srcDir) throw new Error('cancelled');

    // Ask about adding initial projects
    const { addProjects } = await prompts({
      type: 'confirm',
      name: 'addProjects',
      message: 'Would you like to add some initial projects now?',
      initial: true,
    });

    const projects: Record<string, any> = {};

    if (addProjects) {
      let addMore = true;
      while (addMore) {
        const project = await this.collectProjectConfiguration();
        if (project) {
          projects[project.key] = {
            name: project.name,
            repo: project.repo,
            ...(project.sampleRepo && { sample_repo: project.sampleRepo }),
            ...(project.envFile && { env_file: project.envFile }),
            ...(project.postInit && { post_init: project.postInit }),
          };

          const { continueAdding } = await prompts({
            type: 'confirm',
            name: 'continueAdding',
            message: 'Add another project?',
            initial: false,
          });

          addMore = continueAdding;
        } else {
          addMore = false;
        }
      }
    }

    return {
      projects,
      global: {
        src_dir: basicConfig.srcDir,
        workspace_base: basicConfig.workspaceBase,
        env_files_dir: basicConfig.envFilesDir,
      },
    };
  }

  /**
   * Collect configuration for a single project
   */
  private async collectProjectConfiguration(): Promise<any | null> {
    const projectData = await prompts([
      {
        type: 'text',
        name: 'key',
        message: 'Project key (short identifier):',
        validate: (val: string) => {
          if (!val.trim()) return 'Project key is required';
          if (!/^[a-z0-9-]+$/.test(val))
            return 'Project key should contain only lowercase letters, numbers, and hyphens';
          return true;
        },
      },
      {
        type: 'text',
        name: 'name',
        message: 'Project display name:',
        validate: (val: string) => (val.trim() ? true : 'Project name is required'),
      },
      {
        type: 'text',
        name: 'repo',
        message: 'Main repository URL:',
        validate: (val: string) => {
          if (!val.trim()) return 'Repository URL is required';
          if (!val.includes('github.com'))
            return 'Currently only GitHub repositories are supported';
          return true;
        },
      },
      {
        type: 'text',
        name: 'sampleRepo',
        message: 'Sample/demo repository URL (optional):',
        initial: '',
      },
      {
        type: 'text',
        name: 'envFile',
        message: 'Environment file name (optional):',
        initial: '',
      },
      {
        type: 'text',
        name: 'postInit',
        message: 'Post-initialization command (optional):',
        initial: '',
      },
    ]);

    if (!projectData.key) return null;

    return projectData;
  }

  /**
   * Write configuration to YAML file
   */
  private async writeConfiguration(config: any): Promise<void> {
    const yaml = await import('js-yaml');

    // Ensure the directory exists
    await fs.ensureDir(path.dirname(this.configPath));

    // Generate YAML content
    const yamlContent = yaml.dump(config, {
      indent: 2,
      lineWidth: -1,
      quotingType: '"',
      forceQuotes: false,
    });

    // Add header comment
    const header = `# space-cli configuration
# Generated by setup wizard on ${new Date().toISOString()}
# 
# This file configures your workspace projects and global settings.
# You can edit this file manually or run 'space setup --force' to reconfigure.

`;

    await fs.writeFile(this.configPath, header + yamlContent, 'utf8');
  }

  /**
   * Show a preview of what the setup will create
   */
  public async showPreview(): Promise<void> {
    console.log(chalk.blue.bold('📋 Setup Preview'));
    console.log(chalk.gray('The setup wizard will:'));
    console.log(chalk.yellow('  • Create a config.yaml file'));
    console.log(chalk.yellow('  • Configure workspace directories'));
    console.log(chalk.yellow('  • Set up project definitions'));
    console.log(chalk.yellow('  • Enable multi-repository workflows\n'));

    console.log(chalk.gray('After setup, you can:'));
    console.log(
      chalk.cyan('  • Create development workspaces with: space init <project> <issue> <branch>'),
    );
    console.log(chalk.cyan('  • List available projects with: space list'));
    console.log(chalk.cyan('  • Check system health with: space doctor'));
    console.log(chalk.cyan('  • Reconfigure anytime with: space setup --force\n'));
  }
}
