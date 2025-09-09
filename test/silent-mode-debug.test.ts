import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import { DummyRepoManager } from '../src/services/dummyRepoManager.js';

describe('Silent Mode Debug', () => {
  let testDir: string;
  let manager: DummyRepoManager;
  let sdkRepoPath: string;
  let sampleRepoPath: string;

  beforeEach(async () => {
    testDir = path.join(
      '/var/folders/xq/y6vqzwxn3x3d5dmj56npjwp00000gp/T',
      `silent-debug-test-${Date.now()}`,
    );
    await fs.ensureDir(testDir);

    manager = new DummyRepoManager();
    const { sdkPath, samplePath } = await manager.createTestEnvironment();
    sdkRepoPath = sdkPath;
    sampleRepoPath = samplePath;
  });

  afterEach(async () => {
    await manager.cleanupAll();
    if (fs.existsSync(testDir)) {
      await fs.remove(testDir);
    }
  });

  test('should validate repositories are properly created', async () => {
    // Check that paths exist
    expect(fs.existsSync(sdkRepoPath)).toBe(true);
    expect(fs.existsSync(sampleRepoPath)).toBe(true);

    // Check that they are git repositories
    expect(fs.existsSync(path.join(sdkRepoPath, '.git'))).toBe(true);
    expect(fs.existsSync(path.join(sampleRepoPath, '.git'))).toBe(true);

    console.log('SDK repo path:', sdkRepoPath);
    console.log('Sample repo path:', sampleRepoPath);
  });

  test('should create valid config and test simple command', async () => {
    const workspaceDir = path.join(testDir, 'workspace');
    await fs.ensureDir(workspaceDir);

    // Create a basic config file
    const configPath = path.join(testDir, 'config.yaml');
    const configContent = `
projects:
  test:
    name: "Test Project"
    sdk_repo: "${sdkRepoPath}"
    sample_repo: "${sampleRepoPath}"
    github_org: "test-org"
    sample_app_path: "sample-app"

global:
  src_dir: "${testDir}"
  workspace_base: "${workspaceDir}"
`;
    await fs.writeFile(configPath, configContent);

    // Test that the config is valid by running projects command
    const { stdout } = await execa(
      'npx',
      ['tsx', 'src/bin/workspace.ts', 'projects', '--config', configPath],
      {
        cwd: process.cwd(),
        timeout: 5000,
      },
    );

    console.log('Projects output:', stdout);
    expect(stdout).toContain('test');
  });

  test('should debug init command with maximum verbosity', async () => {
    const workspaceDir = path.join(testDir, 'workspace');
    await fs.ensureDir(workspaceDir);

    const configPath = path.join(testDir, 'config.yaml');
    const configContent = `
projects:
  test:
    name: "Test Project"
    sdk_repo: "${sdkRepoPath}"
    sample_repo: "${sampleRepoPath}"
    github_org: "test-org"
    sample_app_path: "sample-app"

global:
  src_dir: "${testDir}"
  workspace_base: "${workspaceDir}"
`;
    await fs.writeFile(configPath, configContent);

    // Use environment variables to enable maximum debugging and set timeout
    const start = Date.now();
    try {
      const { stdout, stderr, exitCode } = await execa(
        'npx',
        [
          'tsx',
          'src/bin/workspace.ts',
          'init',
          'test',
          'feature_debug-test',
          '--silent',
          '--dry-run',
          '--verbose',
          '--config',
          configPath,
        ],
        {
          cwd: process.cwd(),
          timeout: 10000, // 10 seconds should be enough for dry-run
          env: { ...process.env, DEBUG: '*' },
        },
      );
      const duration = Date.now() - start;

      console.log('Command completed in:', duration, 'ms');
      console.log('Exit code:', exitCode);
      console.log('STDOUT:', stdout);
      console.log('STDERR:', stderr);

      expect(exitCode).toBe(0);
      expect(duration).toBeLessThan(10000);
    } catch (error: any) {
      const duration = Date.now() - start;
      console.log('Command failed after:', duration, 'ms');
      if (error.timedOut) {
        console.log('Command timed out - likely hanging on input');
      }
      console.log('Error:', error.message);
      console.log('STDOUT:', error.stdout);
      console.log('STDERR:', error.stderr);
      throw error;
    }
  }, 15000);
});
