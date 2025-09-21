import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { DummyRepoManager } from '../src/services/dummyRepoManager.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { execa } from 'execa';

describe('Silent Mode Integration', () => {
  let manager: DummyRepoManager;
  let testDir: string;
  let sdkRepoPath: string;
  let sampleRepoPath: string;

  beforeEach(async () => {
    // Use both timestamp and random suffix to ensure unique directories
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    testDir = path.join(os.tmpdir(), `silent-mode-test-${uniqueId}`);
    await fs.ensureDir(testDir);

    manager = new DummyRepoManager(testDir);

    // Create dummy SDK and sample repositories
    const { sdkPath, samplePath } = await manager.createTestEnvironment('test');
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
          timeout: 15000, // Allow sufficient time for git operations
        },
      );
      const duration = Date.now() - start;

      // Should complete quickly without hanging indefinitely
      expect(duration).toBeLessThan(15000);
      // Should not have an error exit code
      expect(exitCode).toBe(0);
      // Should show silent mode indication
      expect(stdout).toContain('SILENT MODE');
      // Should not show prompts in stderr (excluding debugger messages)
      const cleanStderr = stderr.replace(/Debugger.*\n?/g, '').replace(/Waiting for.*\n?/g, '');
      expect(cleanStderr).not.toContain('?'); // No prompts should appear
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

    // Test that silent mode prevents interactive prompts
    const result = await execa(
      'npx',
      [
        'tsx',
        'src/bin/workspace.ts',
        'init',
        'test',
        'feature_silent-prompt-test',
        '--silent',
        '--dry-run',
        '--config',
        configPath,
      ],
      {
        cwd: process.cwd(),
        timeout: 10000,
        input: '', // No input provided - should not hang waiting for prompts
      },
    );

    // Should complete without waiting for user input
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('DRY-RUN MODE');
  }, 15000);

  test('should handle init with --silent flag and existing workspace', async () => {
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

    // Create existing workspace directory
    const existingWorkspace = path.join(workspaceDir, 'test-feature_existing');
    await fs.ensureDir(existingWorkspace);
    await fs.writeFile(path.join(existingWorkspace, 'test.txt'), 'existing content');

    // Should handle existing workspace in silent mode
    const result = await execa(
      'npx',
      [
        'tsx',
        'src/bin/workspace.ts',
        'init',
        'test',
        'feature_existing',
        '--silent',
        '--dry-run',
        '--config',
        configPath,
      ],
      {
        cwd: process.cwd(),
        timeout: 10000,
      },
    );

    expect(result.exitCode).toBe(0);
    // Should indicate existing workspace handling in silent mode
    expect(result.stdout.toLowerCase()).toMatch(/existing|dry run|workspace/);
  }, 15000);

  test('should validate silent mode preserves fire-and-forget behavior', async () => {
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

    // Multiple rapid executions should not interfere with each other
    const promises = [
      execa(
        'npx',
        [
          'tsx',
          'src/bin/workspace.ts',
          'init',
          'test',
          'feature_batch1',
          '--silent',
          '--dry-run',
          '--config',
          configPath,
        ],
        { cwd: process.cwd(), timeout: 8000 },
      ),
      execa(
        'npx',
        [
          'tsx',
          'src/bin/workspace.ts',
          'init',
          'test',
          'feature_batch2',
          '--silent',
          '--dry-run',
          '--config',
          configPath,
        ],
        { cwd: process.cwd(), timeout: 8000 },
      ),
    ];

    const results = await Promise.all(promises);

    results.forEach((result) => {
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/DRY RUN|workspace/i);
    });
  }, 20000);

  test('should validate repositories are properly created', async () => {
    // This test validates the test environment setup itself
    expect(fs.existsSync(sdkRepoPath)).toBe(true);
    expect(fs.existsSync(sampleRepoPath)).toBe(true);

    // Verify .git directories exist
    expect(fs.existsSync(path.join(sdkRepoPath, '.git'))).toBe(true);
    expect(fs.existsSync(path.join(sampleRepoPath, '.git'))).toBe(true);

    // Validate git repositories can be queried
    const sdkBranches = await execa('git', ['branch', '--list'], {
      cwd: sdkRepoPath,
      timeout: 5000,
    });
    expect(sdkBranches.stdout).toContain('main');

    const sampleBranches = await execa('git', ['branch', '--list'], {
      cwd: sampleRepoPath,
      timeout: 5000,
    });
    expect(sampleBranches.stdout).toContain('main');
  }, 10000);

  test('should debug init command with maximum verbosity', async () => {
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

    // Test with --verbose flag for debugging purposes
    const result = await execa(
      'npx',
      [
        'tsx',
        'src/bin/workspace.ts',
        'init',
        'test',
        'feature_debug-verbose',
        '--silent',
        '--dry-run',
        '--verbose',
        '--config',
        configPath,
      ],
      {
        cwd: process.cwd(),
        timeout: 12000,
      },
    );

    expect(result.exitCode).toBe(0);
    // Should show verbose output even in silent mode for debugging
    expect(result.stdout.length).toBeGreaterThan(50);
  }, 15000);
});
