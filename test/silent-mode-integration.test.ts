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
    testDir = path.join(os.tmpdir(), `silent-mode-test-${Date.now()}`);
    await fs.ensureDir(testDir);

    manager = new DummyRepoManager(testDir);

    // Create dummy SDK and sample repositories
    sdkRepoPath = await manager.createDummyRepo({
      name: 'test-sdk',
      type: 'sdk',
      branches: ['main'],
      hasRemote: true,
    });

    sampleRepoPath = await manager.createDummyRepo({
      name: 'test-samples',
      type: 'sample',
      branches: ['main'],
      hasRemote: true,
    });
  });

  afterEach(async () => {
    await manager.cleanupAll();
    if (fs.existsSync(testDir)) {
      await fs.remove(testDir);
    }
  });

  test('should run init command with --silent flag without prompts', async () => {
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

    // Run init command with --silent flag
    const { stdout, stderr } = await execa(
      'npx',
      [
        'tsx',
        'src/bin/workspace.ts',
        'init',
        'test',
        'feature_silent-test',
        '--silent',
        '--config',
        configPath,
        '--dry-run',
      ],
      { cwd: process.cwd() },
    );

    // Should complete without prompts
    expect(stdout).toContain('workspace feature_silent-test');
    expect(stderr).not.toContain('?'); // No prompts should appear

    // Should show silent mode indication
    expect(stdout.includes('ANALYSIS MODE') || stdout.includes('DRY RUN')).toBe(true);
  });

  test('should run submit command with --silent flag without prompts', async () => {
    const workspaceDir = path.join(testDir, 'workspace', 'test-submit');
    const sdkPath = path.join(workspaceDir, 'sdk');
    await fs.ensureDir(sdkPath);

    // Initialize a git repository in the SDK path
    await execa('git', ['init'], { cwd: sdkPath });
    await execa('git', ['config', 'user.name', 'Test User'], { cwd: sdkPath });
    await execa('git', ['config', 'user.email', 'test@example.com'], { cwd: sdkPath });

    // Create a test file
    await fs.writeFile(path.join(sdkPath, 'test.txt'), 'test content');

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
  workspace_base: "${path.dirname(workspaceDir)}"
`;
    await fs.writeFile(configPath, configContent);

    // Run submit command with --silent flag
    const { stdout, stderr } = await execa(
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
        '--dry-run', // Use dry run to avoid actual commits
      ],
      {
        cwd: process.cwd(),
        stdio: 'pipe',
      },
    );

    // Should complete without prompts
    expect(stderr).not.toContain('?'); // No prompts should appear
    expect(stdout.includes('DRY RUN') || stdout.includes('would')).toBe(true);
  });

  test('should handle init with --silent flag and existing workspace', async () => {
    const workspaceDir = path.join(testDir, 'workspace');
    const existingWorkspaceDir = path.join(workspaceDir, 'test-existing');
    await fs.ensureDir(existingWorkspaceDir);
    await fs.writeFile(path.join(existingWorkspaceDir, 'existing.txt'), 'existing content');

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

    // Run init command with --silent flag on existing workspace
    const { stdout, stderr } = await execa(
      'npx',
      [
        'tsx',
        'src/bin/workspace.ts',
        'init',
        'test',
        'test-existing',
        '--silent',
        '--config',
        configPath,
        '--dry-run',
      ],
      {
        cwd: process.cwd(),
        stdio: 'pipe',
      },
    );

    // Should handle existing workspace without prompts
    expect(stderr).not.toContain('?'); // No prompts should appear
    expect(stdout.includes('workspace test-existing') || stdout.includes('DRY RUN')).toBe(true);

    // Should show warning about overwriting in silent mode
    expect(stdout.includes('⚠️') || stderr.includes('warning')).toBe(true);
  });

  test('should validate silent mode preserves fire-and-forget behavior', async () => {
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

    // Run init command with --silent flag
    const start = Date.now();
    const { stdout } = await execa(
      'npx',
      [
        'tsx',
        'src/bin/workspace.ts',
        'init',
        'test',
        'feature_fire-and-forget',
        '--silent',
        '--config',
        configPath,
        '--dry-run',
      ],
      {
        cwd: process.cwd(),
        stdio: 'pipe',
        timeout: 10000, // Should complete quickly without waiting for input
      },
    );
    const duration = Date.now() - start;

    // Should complete quickly (under 10 seconds) without waiting for input
    expect(duration).toBeLessThan(10000);
    expect(stdout.includes('workspace feature_fire-and-forget') || stdout.includes('DRY RUN')).toBe(
      true,
    );
  });
});
