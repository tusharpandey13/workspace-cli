import prompts from 'prompts';
import chalk from 'chalk';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { logger } from '../utils/logger.js';
import { GitHubApiClient } from './githubApiClient.js';
import { isNonInteractive } from '../utils/globalOptions.js';

export interface SetupWizardOptions {
  force?: boolean;
  skip?: boolean;
}

export interface NonInteractiveSetupOptions {
  force: boolean;
  srcDir: string;
  workspaceBase: string;
  envFilesDir: string;
  projects: string[];
}

export interface SetupResult {
  completed: boolean;
  skipped: boolean;
  configPath?: string;
}

export class SetupWizard {
  private configPath: string;

  constructor() {
    // Respect SPACE_CONFIG_PATH environment variable for test isolation
    // This allows E2E tests to run without modifying user's real config
    this.configPath =
      process.env.SPACE_CONFIG_PATH || path.join(os.homedir(), '.space-config.yaml');
  }

  /**
   * Check if setup is needed (config file doesn't exist or force is true)
   */
  public isSetupNeeded(options: SetupWizardOptions = {}): boolean {
    if (options.force) return true;
    if (options.skip) return false;

    // Check if the target config file exists
    return !fs.existsSync(this.configPath);
  }

  /**
   * Run the setup wizard
   */
  public async run(options: SetupWizardOptions = {}): Promise<SetupResult> {
    if (options.skip) {
      logger.info(
        chalk.yellow(
          'WARNING: Setup skipped. You can run "space setup" later to configure your space.',
        ),
      );
      return { completed: false, skipped: true };
    }

    console.log(chalk.blue.bold('🚀 Welcome to space-cli Setup Wizard!'));
    console.log(
      chalk.gray('This will help you configure your space for multi-repository development.\n'),
    );

    // Check if config already exists
    if (fs.existsSync(this.configPath) && !options.force) {
      if (isNonInteractive()) {
        logger.info(chalk.yellow('Configuration file already exists. Use --force to overwrite.'));
        return { completed: false, skipped: true };
      }

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
      // Check GitHub token availability first
      await this.checkGitHubToken();

      const config = await this.collectConfiguration();
      await this.writeConfiguration(config);

      console.log(chalk.green.bold('✅ Setup completed successfully!'));
      console.log(chalk.gray(`Configuration saved to: ${this.configPath}`));
      console.log(chalk.blue('\nYou can now use commands like:'));
      console.log(chalk.cyan('  space init <repo-name> <issue-id> <branch-name>'));
      console.log(chalk.cyan('  space list\n'));

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
   * Run setup in non-interactive mode with provided options
   */
  public async runNonInteractive(options: NonInteractiveSetupOptions): Promise<SetupResult> {
    try {
      // Check if config already exists
      if (fs.existsSync(this.configPath) && !options.force) {
        logger.info(chalk.yellow('Configuration file already exists. Use --force to overwrite.'));
        return { completed: false, skipped: true };
      }

      // Parse project specifications
      const projects: Record<string, any> = {};
      for (const projectSpec of options.projects) {
        // Split only on first 3 colons to preserve URLs
        const firstColonIndex = projectSpec.indexOf(':');
        if (firstColonIndex === -1) {
          logger.error(`Invalid project format: ${projectSpec}`);
          logger.info('Expected format: key:name:repo[:sample_repo]');
          return { completed: false, skipped: false };
        }

        const key = projectSpec.substring(0, firstColonIndex);
        const rest = projectSpec.substring(firstColonIndex + 1);

        const secondColonIndex = rest.indexOf(':');
        if (secondColonIndex === -1) {
          logger.error(`Invalid project format: ${projectSpec}`);
          logger.info('Expected format: key:name:repo[:sample_repo]');
          return { completed: false, skipped: false };
        }

        const name = rest.substring(0, secondColonIndex);
        const repoAndSample = rest.substring(secondColonIndex + 1);

        // For repo and sample_repo, we need to be more careful since URLs have colons
        // Look for a pattern that indicates a second URL (likely starting with http)
        const httpIndex = repoAndSample.indexOf('http', 1); // Start search after first char

        let repo: string;
        let sampleRepo: string | undefined;

        if (httpIndex > 0) {
          // Found a second http URL, split there
          repo = repoAndSample.substring(0, httpIndex - 1); // -1 to remove the colon
          sampleRepo = repoAndSample.substring(httpIndex);
        } else {
          // No second URL found, everything is the repo
          repo = repoAndSample;
        }

        projects[key] = {
          name,
          repo,
          ...(sampleRepo && { sample_repo: sampleRepo }),
        };
      }

      // Build configuration
      const config = {
        global: {
          src_dir: options.srcDir.replace(/^~/, process.env.HOME || '~'),
          workspace_base: options.workspaceBase,
          env_files_dir: options.envFilesDir,
        },
        projects,
      };

      // Write configuration
      await this.writeConfiguration(config);

      logger.info(chalk.green.bold('✅ Setup completed successfully!'));
      logger.info(chalk.gray(`Configuration saved to: ${this.configPath}`));

      return { completed: true, skipped: false, configPath: this.configPath };
    } catch (error) {
      logger.error('Setup failed:', error instanceof Error ? error : new Error(String(error)));
      return { completed: false, skipped: false };
    }
  }

  /**
   * Collect configuration through interactive prompts
   */
  private async collectConfiguration(): Promise<any> {
    // Basic space configuration
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
        message: 'What should be the space directory name?',
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
# This file configures your space projects and global settings.
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
    console.log(chalk.yellow('  • Create a ~/.space-config.yaml file'));
    console.log(chalk.yellow('  • Configure space directories'));
    console.log(chalk.yellow('  • Set up project definitions'));
    console.log(chalk.yellow('  • Enable multi-repository workflows\n'));

    console.log(chalk.gray('After setup, you can:'));
    console.log(
      chalk.cyan('  • Create development spaces with: space init <project> <issue> <branch>'),
    );
    console.log(chalk.cyan('  • List available projects with: space list'));
    console.log(chalk.cyan('  • Reconfigure anytime with: space setup --force\n'));
  }

  /**
   * Check GitHub token availability and guide user through setup if needed
   */
  private async checkGitHubToken(): Promise<void> {
    console.log(chalk.blue.bold('\n🔍 Checking GitHub API access...'));

    const hasToken = GitHubApiClient.isTokenAvailable();

    if (!hasToken) {
      console.log(chalk.yellow('\n⚠️  GITHUB_TOKEN environment variable is not set.'));
      console.log(chalk.gray('\nGITHUB_TOKEN is required for:'));
      console.log(chalk.gray('  • Fetching issue and pull request data'));
      console.log(chalk.gray('  • Enhanced workspace context'));
      console.log(chalk.gray('  • Better development workflow\n'));

      console.log(chalk.gray('To set up a GitHub token:'));
      console.log(chalk.gray('  1. Create a personal access token at:'));
      console.log(chalk.cyan('     https://github.com/settings/tokens'));
      console.log(
        chalk.gray(
          '  2. Select scopes: repo (for private repos) or public_repo (for public repos)',
        ),
      );
      console.log(chalk.gray('  3. Set the token as an environment variable:'));
      console.log(chalk.cyan('     export GITHUB_TOKEN=your_token_here'));
      console.log(
        chalk.gray('  4. Add it to your shell profile (~/.bashrc, ~/.zshrc, etc.) to persist\n'),
      );

      const { continueSetup } = await prompts({
        type: 'confirm',
        name: 'continueSetup',
        message: 'Continue setup without GITHUB_TOKEN? (You can set it later)',
        initial: true,
      });

      if (!continueSetup) {
        throw new Error('cancelled');
      }

      console.log(
        chalk.yellow(
          '\n💡 Note: Some workspace-cli features will be limited without GITHUB_TOKEN.\n',
        ),
      );
      return;
    }

    console.log(chalk.green('✅ GITHUB_TOKEN is configured'));

    // Verify token is set - actual API validation happens during first use
    try {
      // Token exists, instantiate client to validate it doesn't throw
      new GitHubApiClient();
      console.log(chalk.gray('   Token validated successfully.'));
    } catch (error) {
      console.log(chalk.yellow('\n⚠️  GITHUB_TOKEN may be invalid or expired.'));
      console.log(
        chalk.gray('   Please verify your token at https://github.com/settings/tokens\n'),
      );

      const { continueSetup } = await prompts({
        type: 'confirm',
        name: 'continueSetup',
        message: 'Continue setup anyway?',
        initial: true,
      });

      if (!continueSetup) {
        throw new Error('cancelled');
      }
    }
  }
}
