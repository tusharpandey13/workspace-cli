import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { logger } from '../utils/logger.js';
import { handleError } from '../utils/errors.js';
import { executeCommand } from '../utils/init-helpers.js';
import { ConfigManager } from '../utils/config.js';
import { Command } from 'commander';

interface DoctorCheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  fix?: string;
}

/**
 * Check if a command exists in PATH
 */
async function checkCommand(command: string, versionFlag = '--version'): Promise<boolean> {
  try {
    await executeCommand(command, [versionFlag], {}, `check ${command}`, false);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Git is installed and configured
 */
async function checkGit(): Promise<DoctorCheckResult> {
  const hasGit = await checkCommand('git');
  if (!hasGit) {
    return {
      name: 'Git',
      status: 'fail',
      message: 'Git is not installed',
      fix: 'Install Git: https://git-scm.com/downloads',
    };
  }

  // Check git config
  try {
    const userName = await executeCommand(
      'git',
      ['config', 'user.name'],
      {},
      'check git user.name',
      false,
    );
    const userEmail = await executeCommand(
      'git',
      ['config', 'user.email'],
      {},
      'check git user.email',
      false,
    );

    if (!userName.stdout.trim() || !userEmail.stdout.trim()) {
      return {
        name: 'Git Configuration',
        status: 'warn',
        message: 'Git user.name or user.email not configured',
        fix: 'Configure Git: git config --global user.name "Your Name" && git config --global user.email "your@email.com"',
      };
    }
  } catch {
    return {
      name: 'Git Configuration',
      status: 'warn',
      message: 'Could not verify git configuration',
      fix: 'Configure Git: git config --global user.name "Your Name" && git config --global user.email "your@email.com"',
    };
  }

  return {
    name: 'Git',
    status: 'pass',
    message: 'Git is installed and configured',
  };
}

/**
 * Check if GitHub CLI is installed
 */
async function checkGitHubCli(): Promise<DoctorCheckResult> {
  const hasGh = await checkCommand('gh');
  if (!hasGh) {
    return {
      name: 'GitHub CLI',
      status: 'warn',
      message: 'GitHub CLI (gh) is not installed - PR functionality will be limited',
      fix: 'Install GitHub CLI: https://cli.github.com/',
    };
  }

  // Check if authenticated
  try {
    await executeCommand('gh', ['auth', 'status'], {}, 'check gh auth', false);
    return {
      name: 'GitHub CLI',
      status: 'pass',
      message: 'GitHub CLI is installed and authenticated',
    };
  } catch {
    return {
      name: 'GitHub CLI',
      status: 'warn',
      message: 'GitHub CLI is installed but not authenticated',
      fix: 'Authenticate GitHub CLI: gh auth login',
    };
  }
}

/**
 * Check Node.js and npm versions
 */
async function checkNodeNpm(): Promise<DoctorCheckResult> {
  const hasNode = await checkCommand('node');
  const hasNpm = await checkCommand('npm');

  if (!hasNode || !hasNpm) {
    return {
      name: 'Node.js/npm',
      status: 'fail',
      message: 'Node.js or npm is not installed',
      fix: 'Install Node.js: https://nodejs.org/',
    };
  }

  try {
    const nodeVersion = await executeCommand(
      'node',
      ['--version'],
      {},
      'check node version',
      false,
    );
    const npmVersion = await executeCommand('npm', ['--version'], {}, 'check npm version', false);

    return {
      name: 'Node.js/npm',
      status: 'pass',
      message: `Node.js ${nodeVersion.stdout.trim()}, npm ${npmVersion.stdout.trim()}`,
    };
  } catch {
    return {
      name: 'Node.js/npm',
      status: 'warn',
      message: 'Could not determine Node.js/npm versions',
    };
  }
}

/**
 * Check workspace root directory configuration
 */
async function checkWorkspaceRoot(): Promise<DoctorCheckResult> {
  try {
    const configManager = new ConfigManager();
    const config = await configManager.loadConfig();

    if (!config.global?.src_dir) {
      return {
        name: 'Workspace Root',
        status: 'warn',
        message: 'Workspace root directory not configured',
        fix: 'Set workspace root: workspace doctor --setup-workspace-root',
      };
    }

    const rootDir = path.resolve(config.global.src_dir);

    if (!fs.existsSync(rootDir)) {
      return {
        name: 'Workspace Root',
        status: 'warn',
        message: `Workspace root directory does not exist: ${rootDir}`,
        fix: `Create directory or update config: mkdir -p "${rootDir}"`,
      };
    }

    // Check if directory is writable
    try {
      const testFile = path.join(rootDir, '.workspace-test');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
    } catch {
      return {
        name: 'Workspace Root',
        status: 'fail',
        message: `Workspace root directory is not writable: ${rootDir}`,
        fix: `Fix permissions: chmod 755 "${rootDir}"`,
      };
    }

    return {
      name: 'Workspace Root',
      status: 'pass',
      message: `Workspace root configured and accessible: ${rootDir}`,
    };
  } catch {
    return {
      name: 'Workspace Root',
      status: 'fail',
      message: 'Could not load workspace configuration',
      fix: 'Initialize user configuration: workspace doctor --init-config',
    };
  }
}

/**
 * Check user configuration file
 */
async function checkUserConfig(): Promise<DoctorCheckResult> {
  const userConfigPath = path.join(os.homedir(), '.workspace-config.yaml');

  if (!fs.existsSync(userConfigPath)) {
    return {
      name: 'User Configuration',
      status: 'warn',
      message: 'User configuration file does not exist',
      fix: 'Initialize user configuration: workspace doctor --init-config',
    };
  }

  try {
    const configManager = new ConfigManager();
    await configManager.loadConfig();

    return {
      name: 'User Configuration',
      status: 'pass',
      message: `User configuration loaded from ${userConfigPath}`,
    };
  } catch (error) {
    return {
      name: 'User Configuration',
      status: 'fail',
      message: `Invalid user configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
      fix: 'Reinitialize user configuration: workspace doctor --init-config',
    };
  }
}

/**
 * Initialize user configuration from default template
 */
async function initUserConfig(): Promise<void> {
  const userConfigPath = path.join(os.homedir(), '.workspace-config.yaml');
  const configManager = new ConfigManager();

  // Get the default config from the CLI package
  const defaultConfigPath = path.join(configManager.getCliRoot(), 'config.yaml');

  if (!fs.existsSync(defaultConfigPath)) {
    throw new Error('Default configuration template not found in CLI package');
  }

  logger.info('📝 Creating user configuration...');
  await fs.copy(defaultConfigPath, userConfigPath);

  logger.success(`✅ User configuration created: ${userConfigPath}`);
  logger.info('💡 You can now customize your configuration by editing this file');
}

/**
 * Set up workspace root directory
 */
async function setupWorkspaceRoot(rootDir?: string): Promise<void> {
  const configManager = new ConfigManager();
  const userConfigPath = path.join(os.homedir(), '.workspace-config.yaml');

  if (!rootDir) {
    const defaultRoot = path.join(os.homedir(), 'workspaces');
    rootDir = defaultRoot;
    logger.info(`Using default workspace root: ${rootDir}`);
  }

  const resolvedRoot = path.resolve(rootDir);

  // Create directory if it doesn't exist
  if (!fs.existsSync(resolvedRoot)) {
    logger.info(`📁 Creating workspace root directory: ${resolvedRoot}`);
    await fs.ensureDir(resolvedRoot);
  }

  // Update user configuration
  if (fs.existsSync(userConfigPath)) {
    const config = await configManager.loadConfig();
    config.global = config.global || {};
    config.global.src_dir = resolvedRoot;

    // Write back to user config (assuming it's YAML)
    const yaml = await import('js-yaml');
    const yamlContent = yaml.dump(config, { indent: 2, lineWidth: 120 });
    await fs.writeFile(userConfigPath, yamlContent);

    logger.success(`✅ Workspace root configured: ${resolvedRoot}`);
  } else {
    logger.warn('User configuration not found. Run: workspace doctor --init-config first');
  }
}

/**
 * Run all diagnostic checks
 */
async function runDiagnostics(): Promise<DoctorCheckResult[]> {
  const checks = [
    checkNodeNpm(),
    checkGit(),
    checkGitHubCli(),
    checkUserConfig(),
    checkWorkspaceRoot(),
  ];

  return Promise.all(checks);
}

/**
 * Main doctor command function
 */
export async function doctorCommand(options: {
  initConfig?: boolean;
  setupWorkspaceRoot?: boolean;
  workspaceRoot?: string;
}) {
  try {
    if (options.initConfig) {
      await initUserConfig();
      return;
    }

    if (options.setupWorkspaceRoot) {
      await setupWorkspaceRoot(options.workspaceRoot);
      return;
    }

    logger.info('🩺 Running workspace diagnostic checks...\n');

    const results = await runDiagnostics();

    let hasFailures = false;
    let hasWarnings = false;

    results.forEach((result) => {
      const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
      logger.info(`${icon} ${result.name}: ${result.message}`);

      if (result.fix && result.status !== 'pass') {
        logger.info(`   💡 Fix: ${result.fix}`);
      }

      if (result.status === 'fail') hasFailures = true;
      if (result.status === 'warn') hasWarnings = true;
    });

    logger.info('');

    if (hasFailures) {
      logger.warn('❌ Some critical issues found. Please address the failures above.');
    } else if (hasWarnings) {
      logger.warn('⚠️  Some optional components could be improved. See suggestions above.');
    } else {
      logger.success('🎉 All checks passed! Your workspace CLI is ready to use.');
    }

    logger.info('\n📚 Quick setup commands:');
    logger.info('  workspace doctor --init-config          Initialize user configuration');
    logger.info('  workspace doctor --setup-workspace-root Setup workspace directory');
    logger.info('  gh auth login                          Authenticate GitHub CLI');
  } catch (error) {
    handleError(error as Error, logger);
  }
}

/**
 * Register the doctor command with Commander
 */
export function registerDoctorCommand(program: Command): void {
  program
    .command('doctor')
    .description('Check system dependencies and setup workspace CLI')
    .option('--init-config', 'Initialize user configuration file')
    .option('--setup-workspace-root', 'Setup workspace root directory')
    .option('--workspace-root <path>', 'Specify custom workspace root directory')
    .addHelpText(
      'after',
      `
Examples:
  $ workspace doctor
    Run all diagnostic checks

  $ workspace doctor --init-config
    Create user configuration file from template

  $ workspace doctor --setup-workspace-root
    Setup default workspace root directory

  $ workspace doctor --setup-workspace-root --workspace-root ~/my-workspaces
    Setup custom workspace root directory

Description:
  The doctor command helps you set up and validate your workspace CLI installation.
  It checks for required dependencies, validates configuration, and provides
  actionable fixes for any issues found.

  This command is especially useful when:
  - Setting up the CLI on a new system
  - Troubleshooting workspace creation issues
  - Validating your development environment
`,
    )
    .action(doctorCommand);
}
