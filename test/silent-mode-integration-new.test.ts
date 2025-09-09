import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import { DummyRepoManager } from '../src/services/dummyRepoManager.js';

describe('Silent Mode Integration', () => {
  let testDir: string;
  let manager: DummyRepoManager;
  let sdkRepoPath: string;
  let sampleRepoPath: string;

  beforeEach(async () => {
    testDir = path.join(
      '/var/folders/xq/y6vqzwxn3x3d5dmj56npjwp00000gp/T',
      `silent-mode-test-${Date.now()}`,
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

  test('should run init command with --silent flag without hanging', async () => {
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

    // Run init command with --silent and --dry-run flags and a 3 second timeout
    const start = Date.now();
    try {
      const { stdout, stderr, exitCode } = await execa(
        'npx',
        [
          'tsx',
          'src/bin/workspace.ts',
          'init',
          'test',
          'feature_silent-test',
          '--silent',
          '--dry-run',
          '--config',
          configPath,
        ],
        {
          cwd: process.cwd(),
          timeout: 3000, // Should complete quickly without hanging for user input
        },
      );
      const duration = Date.now() - start;

      // Should complete quickly without hanging
      expect(duration).toBeLessThan(3000);
      // Should not have an error exit code
      expect(exitCode).toBe(0);
      // Should show some indication of workspace processing
      expect(stdout.includes('test') || stdout.includes('DRY RUN')).toBe(true);
      // Should not show prompts in stderr
      expect(stderr).not.toContain('?'); // No prompts should appear
    } catch (error: any) {
      const duration = Date.now() - start;
      // If it times out, that means it was hanging waiting for input (failure)
      if (error.timedOut) {
        expect.fail(`Command hung waiting for input after ${duration}ms - silent mode failed`);
      }
      // Any other error should be thrown for investigation
      throw error;
    }
  }, 5000);

  test('should run submit command with --silent flag without hanging', async () => {
    const workspaceDir = path.join(testDir, 'workspace', 'test-submit');
    const sdkPath = path.join(workspaceDir, 'sdk');
    await fs.ensureDir(sdkPath);

    // Create a dummy file to submit
    await fs.writeFile(path.join(sdkPath, 'test.txt'), 'test content');

    // Create config
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

    // Run submit command with --silent flag and a 3 second timeout
    const start = Date.now();
    try {
      await execa(
        'npx',
        [
          'tsx',
          'src/bin/workspace.ts',
          'submit',
          'test',
          'test-submit',
          '--silent',
          '--config',
          configPath,
        ],
        {
          cwd: process.cwd(),
          timeout: 3000, // Should complete quickly without hanging for user input
        },
      );
      const duration = Date.now() - start;

      // Should complete quickly without hanging
      expect(duration).toBeLessThan(3000);
    } catch (error: any) {
      const duration = Date.now() - start;
      // If it times out, that means it was hanging waiting for input (failure)
      if (error.timedOut) {
        expect.fail(`Command hung waiting for input after ${duration}ms - silent mode failed`);
      }
      // For submit, we might get other errors due to git state, but timeouts indicate hanging on prompts
      if (error.exitCode && !error.timedOut) {
        // This is expected - submit might fail for other reasons, but it shouldn't hang
        expect(duration).toBeLessThan(3000);
      } else {
        throw error;
      }
    }
  }, 5000);

  test('should validate --silent prevents user input prompts', async () => {
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

    // Test that the command completes within time limit (no user input blocking)
    const start = Date.now();
    try {
      const { stdout } = await execa(
        'npx',
        [
          'tsx',
          'src/bin/workspace.ts',
          'init',
          'test',
          'feature_fire-and-forget',
          '--silent',
          '--dry-run',
          '--config',
          configPath,
        ],
        {
          cwd: process.cwd(),
          timeout: 3000,
        },
      );
      const duration = Date.now() - start;

      // Fire-and-forget: should complete quickly without user intervention
      expect(duration).toBeLessThan(3000);
      expect(stdout.includes('test') || stdout.includes('DRY RUN')).toBe(true);
    } catch (error: any) {
      if (error.timedOut) {
        expect.fail('Fire-and-forget mode failed - command waited for user input');
      }
      throw error;
    }
  }, 5000);
});
