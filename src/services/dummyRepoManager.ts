import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { logger } from '../utils/logger.js';
import { executeCommand } from '../utils/init-helpers.js';

export interface DummyRepoConfig {
  name: string;
  type: 'sdk' | 'sample';
  branches?: string[];
  files?: Array<{ path: string; content: string }>;
  hasRemote?: boolean;
  commitHistory?: Array<{ message: string; files?: string[] }>;
}

/**
 * Manages temporary repositories for testing worktree and clean operations
 * without affecting real repositories
 */
export class DummyRepoManager {
  private tempDir: string;
  private repos: Map<string, string> = new Map();

  constructor(baseDir?: string) {
    this.tempDir = baseDir || path.join(os.tmpdir(), 'workspace-cli-test-repos');
  }

  /**
   * Create a dummy repository for testing
   */
  async createDummyRepo(config: DummyRepoConfig): Promise<string> {
    const repoPath = path.join(this.tempDir, config.name);

    // Ensure base directory exists
    await fs.ensureDir(this.tempDir);

    // Remove existing repo if it exists with extra safety measures
    if (await fs.pathExists(repoPath)) {
      await this.forceRemoveDirectory(repoPath);
    }

    // Create repo directory fresh
    await fs.ensureDir(repoPath);

    // Add a small delay to ensure file system operations complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    logger.verbose(`Creating dummy ${config.type} repository: ${config.name}`);

    try {
      // Initialize git repository with extra safety checks
      const gitDir = path.join(repoPath, '.git');
      if (await fs.pathExists(gitDir)) {
        await this.forceRemoveDirectory(gitDir);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      await executeCommand('git', ['init'], { cwd: repoPath }, 'initialize git repo', false);

      // Configure git user for commits
      await executeCommand(
        'git',
        ['config', 'user.name', 'Test User'],
        { cwd: repoPath },
        'set git user name',
        false,
      );
      await executeCommand(
        'git',
        ['config', 'user.email', 'test@example.com'],
        { cwd: repoPath },
        'set git user email',
        false,
      );

      // Disable GPG signing for tests to avoid terminal size issues
      await executeCommand(
        'git',
        ['config', 'commit.gpgsign', 'false'],
        { cwd: repoPath },
        'disable gpg signing',
        false,
      );
      await executeCommand(
        'git',
        ['config', 'tag.gpgsign', 'false'],
        { cwd: repoPath },
        'disable gpg tag signing',
        false,
      );

      // Create default files based on repository type
      await this.createDefaultFiles(repoPath, config.type);

      // Create additional files if specified
      if (config.files) {
        for (const file of config.files) {
          const filePath = path.join(repoPath, file.path);
          await fs.ensureDir(path.dirname(filePath));
          await fs.writeFile(filePath, file.content);
        }
      }

      // Verify git repository was properly initialized before proceeding
      const gitDirPath = path.join(repoPath, '.git');
      if (!(await fs.pathExists(gitDirPath))) {
        throw new Error('Git repository was not properly initialized - .git directory missing');
      }

      // Initial commit with verification
      await executeCommand('git', ['add', '.'], { cwd: repoPath }, 'stage initial files', false);

      // Verify there are files to commit
      const statusResult = await executeCommand(
        'git',
        ['status', '--porcelain'],
        { cwd: repoPath },
        'check git status',
        false,
      );

      if (statusResult.stdout.trim() === '') {
        // No files to commit, create a minimal file
        await fs.writeFile(path.join(repoPath, 'README.md'), '# Test Repository\n');
        await executeCommand('git', ['add', 'README.md'], { cwd: repoPath }, 'add README', false);
      }

      await executeCommand(
        'git',
        ['commit', '-m', 'Initial commit'],
        { cwd: repoPath },
        'create initial commit',
        false,
      );

      // Create branches if specified
      if (config.branches && config.branches.length > 0) {
        // Get the current branch name (could be 'main' or 'master')
        const currentBranchResult = await executeCommand(
          'git',
          ['branch', '--show-current'],
          { cwd: repoPath },
          'get current branch name',
          false,
        );
        const defaultBranch = currentBranchResult.stdout.trim();

        for (const branch of config.branches) {
          await executeCommand(
            'git',
            ['checkout', '-b', branch],
            { cwd: repoPath },
            `create branch ${branch}`,
            false,
          );

          // Create a file specific to this branch
          const branchFile = `${branch.replace(/\//g, '_')}-file.txt`;
          await fs.writeFile(path.join(repoPath, branchFile), `Content for ${branch} branch`);
          await executeCommand(
            'git',
            ['add', branchFile],
            { cwd: repoPath },
            `add ${branchFile}`,
            false,
          );
          await executeCommand(
            'git',
            ['commit', '-m', `Add ${branchFile} for ${branch}`],
            { cwd: repoPath },
            `commit ${branchFile}`,
            false,
          );
        }

        // Return to the original default branch
        await executeCommand(
          'git',
          ['checkout', defaultBranch],
          { cwd: repoPath },
          `return to ${defaultBranch} branch`,
          false,
        );
      }
      if (config.commitHistory) {
        for (const commit of config.commitHistory) {
          if (commit.files) {
            for (const file of commit.files) {
              const filePath = path.join(repoPath, file);
              await fs.writeFile(filePath, `Updated content: ${Date.now()}`);
            }
          } else {
            // Create a generic change file
            const changeFile = path.join(repoPath, `change-${Date.now()}.txt`);
            await fs.writeFile(changeFile, `Change at ${new Date().toISOString()}`);
          }

          await executeCommand('git', ['add', '.'], { cwd: repoPath }, 'stage changes', false);
          await executeCommand(
            'git',
            ['commit', '-m', commit.message],
            { cwd: repoPath },
            'create commit',
            false,
          );
        }
      }

      // Add remote origin if specified
      if (config.hasRemote) {
        // Create a bare repository to simulate remote
        const bareRepoPath = path.join(this.tempDir, `${config.name}-bare.git`);
        await fs.ensureDir(bareRepoPath);
        await executeCommand(
          'git',
          ['init', '--bare'],
          { cwd: bareRepoPath },
          'create bare remote repo',
          false,
        );

        // Add remote origin
        await executeCommand(
          'git',
          ['remote', 'add', 'origin', bareRepoPath],
          { cwd: repoPath },
          'add remote origin',
          false,
        );

        // Push to remote
        await executeCommand(
          'git',
          ['push', '-u', 'origin', 'main'],
          { cwd: repoPath },
          'push to remote',
          false,
        );
      }

      // Store repo path for cleanup
      this.repos.set(config.name, repoPath);

      logger.success(`Created dummy ${config.type} repository: ${repoPath}`);
      return repoPath;
    } catch (error) {
      logger.error(`Failed to create dummy repository ${config.name}: ${error}`);
      throw error;
    }
  }

  /**
   * Create default files based on repository type
   */
  private async createDefaultFiles(repoPath: string, type: 'sdk' | 'sample'): Promise<void> {
    if (type === 'sdk') {
      // Create typical SDK structure - maintaining TypeScript for test compatibility
      const packageJson = {
        name: '@example/test-sdk',
        version: '1.0.0',
        description: 'Test SDK for workspace CLI testing',
        main: 'src/index.ts',
        scripts: {
          build: 'tsc',
          test: 'jest',
          lint: 'eslint src/**/*.ts',
        },
        devDependencies: {
          typescript: '^4.9.0',
          jest: '^29.0.0',
          eslint: '^8.0.0',
        },
      };

      await fs.writeFile(path.join(repoPath, 'package.json'), JSON.stringify(packageJson, null, 2));

      // Create src directory structure - keeping .ts extension for test compatibility
      await fs.ensureDir(path.join(repoPath, 'src'));
      await fs.writeFile(
        path.join(repoPath, 'src/index.ts'),
        `// Main SDK entry point\nexport class TestSDK {\n  version = '1.0.0';\n  \n  constructor(config: any) {\n    this.config = config;\n  }\n  \n  async initialize(): Promise<void> {\n    console.log('SDK initialized');\n  }\n}\n\nexport default TestSDK;\n`,
      );
      await fs.writeFile(
        path.join(repoPath, 'src/client.ts'),
        `// SDK client implementation\nexport class Client {\n  constructor(private config: any) {}\n  \n  async connect(): Promise<boolean> {\n    return true;\n  }\n}\n`,
      );
      await fs.writeFile(
        path.join(repoPath, 'src/utils.ts'),
        `// SDK utility functions\nexport function validateConfig(config: any): boolean {\n  return config && typeof config === 'object';\n}\n`,
      );

      // Create README
      await fs.writeFile(
        path.join(repoPath, 'README.md'),
        '# Test SDK\n\nA generic SDK for testing workspace CLI functionality.',
      );
    } else {
      // Create sample app structure - maintaining pages structure for test compatibility
      const packageJson = {
        name: 'test-sample-app',
        version: '1.0.0',
        description: 'Test sample app for workspace CLI testing',
        scripts: {
          start: 'node pages/index.js',
          build: 'echo "Building sample application"',
          test: 'echo "Running sample tests"',
          dev: 'nodemon pages/index.js',
        },
        dependencies: {
          'example-lib': '^1.0.0',
          express: '^4.18.0',
        },
      };

      await fs.writeFile(path.join(repoPath, 'package.json'), JSON.stringify(packageJson, null, 2));

      // Create pages directory structure (for test compatibility)
      await fs.ensureDir(path.join(repoPath, 'pages'));
      await fs.writeFile(
        path.join(repoPath, 'pages/index.js'),
        `// Sample application main page\nconst express = require('express');\nconst app = express();\n\napp.get('/', (req, res) => {\n  res.send('Hello from sample app!');\n});\n\nconst port = process.env.PORT || 3000;\napp.listen(port, () => {\n  console.log(\`Sample app listening on port \${port}\`);\n});\n`,
      );

      // Create API directory structure (for test compatibility)
      await fs.ensureDir(path.join(repoPath, 'pages/api/auth'));
      await fs.writeFile(
        path.join(repoPath, 'pages/api/auth/[...auth0].js'),
        `// Generic authentication handler\nmodule.exports = (req, res) => {\n  // Generic auth handling logic\n  res.status(200).json({ message: 'Auth endpoint' });\n};\n`,
      );

      // Create example configuration
      await fs.writeFile(
        path.join(repoPath, 'config.example.js'),
        `// Example configuration file\nmodule.exports = {\n  app: {\n    name: 'Sample App',\n    port: 3000\n  },\n  auth: {\n    provider: 'generic-auth'\n  }\n};\n`,
      );

      // Create README
      await fs.writeFile(
        path.join(repoPath, 'README.md'),
        '# Test Sample App\n\nA generic sample app for testing workspace CLI functionality.',
      );
    }
  }

  /**
   * Get the path to a created dummy repository
   */
  getRepoPath(name: string): string | undefined {
    return this.repos.get(name);
  }

  /**
   * List all created dummy repositories
   */
  listRepos(): string[] {
    return Array.from(this.repos.keys());
  }

  /**
   * Clean up a specific dummy repository
   */
  async cleanupRepo(name: string): Promise<void> {
    const repoPath = this.repos.get(name);
    if (repoPath && (await fs.pathExists(repoPath))) {
      try {
        // First try to remove git locks if they exist
        const gitPath = path.join(repoPath, '.git');
        if (await fs.pathExists(gitPath)) {
          const configLock = path.join(gitPath, 'config.lock');
          const indexLock = path.join(gitPath, 'index.lock');

          if (await fs.pathExists(configLock)) {
            await fs.remove(configLock);
          }
          if (await fs.pathExists(indexLock)) {
            await fs.remove(indexLock);
          }
        }

        // Use force removal for stubborn directories
        await this.forceRemoveDirectory(repoPath);
        this.repos.delete(name);
        logger.verbose(`Cleaned up dummy repository: ${name}`);
      } catch (error) {
        logger.verbose(`Warning: Could not completely clean up repository ${name}: ${error}`);
        // Still remove from tracking even if cleanup fails
        this.repos.delete(name);
      }
    }
  }

  /**
   * Force remove directory with retries for stubborn files
   */
  private async forceRemoveDirectory(dirPath: string, maxRetries = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Special handling for .git directories on macOS
        if (path.basename(dirPath) === '.git' || dirPath.includes('.git')) {
          try {
            await executeCommand(
              'chmod',
              ['-R', '755', dirPath],
              {},
              'make git directory writable',
              false,
            );
          } catch (chmodError) {
            // Ignore chmod errors, continue with removal
          }
        }

        await fs.remove(dirPath);
        return; // Success
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }

        // Wait a bit before retrying
        await new Promise((resolve) => setTimeout(resolve, 100 * attempt));

        // Try to make files writable on macOS/Unix systems
        try {
          await executeCommand(
            'chmod',
            ['-R', '755', dirPath],
            {},
            'make directory writable',
            false,
          );
        } catch (chmodError) {
          // Ignore chmod errors, try removal anyway
        }
      }
    }
  }

  /**
   * Clean up all dummy repositories
   */
  async cleanupAll(): Promise<void> {
    logger.verbose('Cleaning up all dummy repositories...');

    // Clean up individual repos
    const repoNames = Array.from(this.repos.keys());
    for (const name of repoNames) {
      await this.cleanupRepo(name);
    }

    // Remove the entire temp directory if it exists and force it
    if (await fs.pathExists(this.tempDir)) {
      try {
        await this.forceRemoveDirectory(this.tempDir);
        logger.verbose(`Removed temp directory: ${this.tempDir}`);
      } catch (error) {
        logger.verbose(`Warning: Could not completely remove temp directory: ${error}`);
      }
    }

    this.repos.clear();
  }

  /**
   * Create a complete test environment with SDK and sample repositories
   * @param projectName - The project name to use (defaults to 'test' for silent mode compatibility)
   */
  async createTestEnvironment(
    projectName = 'test-sdk',
  ): Promise<{ sdkPath: string; samplePath: string }> {
    const sdkPath = await this.createDummyRepo({
      name: projectName,
      type: 'sdk',
      branches: ['main', 'develop', 'feature/test-branch'],
      hasRemote: true,
      commitHistory: [
        { message: 'Add new feature', files: ['src/new-feature.ts'] },
        { message: 'Fix bug in auth client', files: ['src/auth-client.ts'] },
      ],
    });

    const samplePath = await this.createDummyRepo({
      name: 'test-samples',
      type: 'sample',
      branches: ['main'],
      hasRemote: true,
      commitHistory: [{ message: 'Update sample app', files: ['pages/index.js'] }],
    });

    return { sdkPath, samplePath };
  }

  /**
   * Simulate repository issues for testing error handling
   */
  async createCorruptedRepo(name: string): Promise<string> {
    const repoPath = path.join(this.tempDir, name);

    // Create a directory that looks like a repo but isn't properly initialized
    await fs.ensureDir(repoPath);
    await fs.writeFile(path.join(repoPath, 'README.md'), 'This is not a proper git repo');

    // Create a fake .git directory with no content
    await fs.ensureDir(path.join(repoPath, '.git'));

    this.repos.set(name, repoPath);
    logger.verbose(`Created corrupted repository for testing: ${repoPath}`);

    return repoPath;
  }
}
