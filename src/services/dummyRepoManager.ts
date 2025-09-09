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

    // Remove existing repo if it exists
    if (await fs.pathExists(repoPath)) {
      await fs.remove(repoPath);
    }

    // Create repo directory
    await fs.ensureDir(repoPath);

    logger.verbose(`Creating dummy ${config.type} repository: ${config.name}`);

    try {
      // Initialize git repository
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

      // Initial commit
      await executeCommand('git', ['add', '.'], { cwd: repoPath }, 'stage initial files', false);
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

      logger.success(`✅ Created dummy ${config.type} repository: ${repoPath}`);
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
      // Create typical SDK structure
      const packageJson = {
        name: '@auth0/test-sdk',
        version: '1.0.0',
        description: 'Test SDK for workspace CLI testing',
        main: 'src/index.ts',
        scripts: {
          build: 'tsc',
          test: 'vitest',
        },
        devDependencies: {
          typescript: '^5.0.0',
          vitest: '^1.0.0',
        },
      };

      await fs.writeFile(path.join(repoPath, 'package.json'), JSON.stringify(packageJson, null, 2));

      // Create src directory structure
      await fs.ensureDir(path.join(repoPath, 'src'));
      await fs.writeFile(
        path.join(repoPath, 'src/index.ts'),
        `export * from './auth-client';\nexport * from './types';`,
      );
      await fs.writeFile(
        path.join(repoPath, 'src/auth-client.ts'),
        `export class AuthClient {\n  constructor() {}\n}`,
      );
      await fs.writeFile(
        path.join(repoPath, 'src/types.ts'),
        `export interface AuthConfig {\n  domain: string;\n}`,
      );

      // Create README
      await fs.writeFile(
        path.join(repoPath, 'README.md'),
        '# Test SDK\n\nA test SDK for workspace CLI testing.',
      );
    } else {
      // Create typical sample app structure
      const packageJson = {
        name: 'test-sample-app',
        version: '1.0.0',
        description: 'Test sample app for workspace CLI testing',
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
        },
        dependencies: {
          next: '^14.0.0',
          react: '^18.0.0',
          '@auth0/nextjs-auth0': '^3.0.0',
        },
      };

      await fs.writeFile(path.join(repoPath, 'package.json'), JSON.stringify(packageJson, null, 2));

      // Create pages directory
      await fs.ensureDir(path.join(repoPath, 'pages'));
      await fs.writeFile(
        path.join(repoPath, 'pages/index.js'),
        `export default function Home() {\n  return <div>Home Page</div>;\n}`,
      );

      // Create API routes
      await fs.ensureDir(path.join(repoPath, 'pages/api/auth'));
      await fs.writeFile(
        path.join(repoPath, 'pages/api/auth/[...auth0].js'),
        `import { handleAuth } from '@auth0/nextjs-auth0';\n\nexport default handleAuth();`,
      );

      // Create README
      await fs.writeFile(
        path.join(repoPath, 'README.md'),
        '# Test Sample App\n\nA test sample app for workspace CLI testing.',
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
      await fs.remove(repoPath);
      this.repos.delete(name);
      logger.verbose(`Cleaned up dummy repository: ${name}`);
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

    // Remove the entire temp directory if it exists
    if (await fs.pathExists(this.tempDir)) {
      await fs.remove(this.tempDir);
      logger.verbose(`Removed temp directory: ${this.tempDir}`);
    }

    this.repos.clear();
  }

  /**
   * Create a complete test environment with SDK and sample repositories
   */
  async createTestEnvironment(): Promise<{ sdkPath: string; samplePath: string }> {
    const sdkPath = await this.createDummyRepo({
      name: 'test-sdk',
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
