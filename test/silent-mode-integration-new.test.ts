import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { DummyRepoManager } from '../src/services/dummyRepoManager.js';

describe('Silent Mode Integration', () => {
  let testDir: string;
  let manager: DummyRepoManager;
  let sdkRepoPath: string;
  let sampleRepoPath: string;

  beforeEach(async () => {
    // Use both timestamp and random suffix to ensure unique directories
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    testDir = path.join(os.tmpdir(), `silent-mode-test-${uniqueId}`);

    manager = new DummyRepoManager(testDir);
    const { sdkPath, samplePath } = await manager.createTestEnvironment('test');
    sdkRepoPath = sdkPath;
    sampleRepoPath = samplePath;
  });

  afterEach(async () => {
    await manager.cleanupAll();
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
    repo: "${sdkRepoPath}"
    sample_repo: "${sampleRepoPath}"
    github_org: "test-org"
    sample_app_path: "sample-app"

global:
  src_dir: "${testDir}"
  workspace_base: "${workspaceDir}"
`;
    await fs.writeFile(configPath, configContent);

    // Run init command with --silent and --dry-run flags
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
          timeout: 15000, // Allow sufficient time for git operations and dependency checks
        },
      );
      const duration = Date.now() - start;

      // Should complete quickly without hanging
      expect(duration).toBeLessThan(15000);
      // Should not have an error exit code
      expect(exitCode).toBe(0);
      // Should show some indication of workspace processing
      expect(stdout.includes('workspace created') || stdout.includes('DRY RUN')).toBe(true);
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
  }, 20000);

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
    repo: "${sdkRepoPath}"
    sample_repo: "${sampleRepoPath}"
    github_org: "test-org"
    sample_app_path: "sample-app"

global:
  src_dir: "${testDir}"
  workspace_base: "${workspaceDir}"
`;
    await fs.writeFile(configPath, configContent);

    // Run submit command with --silent flag
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
          timeout: 15000, // Allow sufficient time for git operations and dependency checks
        },
      );
      const duration = Date.now() - start;

      // Should complete quickly without hanging
      expect(duration).toBeLessThan(15000);
    } catch (error: any) {
      const duration = Date.now() - start;
      // If it times out, that means it was hanging waiting for input (failure)
      if (error.timedOut) {
        expect.fail(`Command hung waiting for input after ${duration}ms - silent mode failed`);
      }
      // For submit, we might get other errors due to git state, but timeouts indicate hanging on prompts
      if (error.exitCode && !error.timedOut) {
        // This is expected - submit might fail for other reasons, but it shouldn't hang
        expect(duration).toBeLessThan(15000);
      } else {
        throw error;
      }
    }
  }, 20000);

  test('should validate --silent prevents user input prompts', async () => {
    const workspaceDir = path.join(testDir, 'workspace');
    await fs.ensureDir(workspaceDir);

    const configPath = path.join(testDir, 'config.yaml');
    const configContent = `
projects:
  test:
    name: "Test Project"
    repo: "${sdkRepoPath}"
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
          timeout: 15000,
        },
      );
      const duration = Date.now() - start;

      // Fire-and-forget: should complete quickly without user intervention
      expect(duration).toBeLessThan(15000);
      expect(stdout.includes('workspace created') || stdout.includes('DRY RUN')).toBe(true);
    } catch (error: any) {
      if (error.timedOut) {
        expect.fail('Fire-and-forget mode failed - command waited for user input');
      }
      throw error;
    }
  }, 20000);
});
