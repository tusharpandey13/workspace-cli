import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { DummyRepoManager } from '../src/services/dummyRepoManager.js';
import { setupWorktrees } from '../src/services/gitWorktrees.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { execa } from 'execa';
import type { ProjectConfig, WorkspacePaths } from '../src/types/index.js';

describe('Worktree and Clean Operations Integration', () => {
  let manager: DummyRepoManager;
  let testDir: string;
  let sdkRepoPath: string;
  let sampleRepoPath: string;
  let workspaceDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `worktree-test-${Date.now()}`);
    await fs.ensureDir(testDir);

    manager = new DummyRepoManager(testDir);

    // Create dummy SDK and sample repositories
    sdkRepoPath = await manager.createDummyRepo({
      name: 'test-sdk',
      type: 'sdk',
      branches: ['main', 'develop'],
      hasRemote: true,
    });

    sampleRepoPath = await manager.createDummyRepo({
      name: 'test-samples',
      type: 'sample',
      branches: ['main'],
      hasRemote: true,
    });

    workspaceDir = path.join(testDir, 'workspace');
    await fs.ensureDir(workspaceDir);
  });

  afterEach(async () => {
    await manager.cleanupAll();
    if (fs.existsSync(testDir)) {
      await fs.remove(testDir);
    }
  });

  const createMockProjectConfig = (): ProjectConfig => ({
    key: 'test',
    name: 'Test Project',
    sdk_repo: sdkRepoPath,
    sample_repo: sampleRepoPath,
    github_org: 'test-org',
    sample_app_path: 'sample-app',
  });

  const createMockWorkspacePaths = (workspaceName: string): WorkspacePaths => ({
    srcDir: testDir,
    baseDir: workspaceDir,
    workspaceDir: path.join(workspaceDir, workspaceName),
    sdkPath: path.join(workspaceDir, workspaceName, 'sdk'),
    samplesPath: path.join(workspaceDir, workspaceName, 'samples'),
    sampleAppPath: path.join(workspaceDir, workspaceName, 'samples', 'sample-app'),
    sdkRepoPath,
    sampleRepoPath,
  });

  test('should successfully set up worktrees with valid repositories', async () => {
    const project = createMockProjectConfig();
    const paths = createMockWorkspacePaths('test-workspace');
    const branchName = 'feature/test-branch';

    await setupWorktrees(project, paths, branchName, false);

    // Verify SDK worktree was created
    expect(fs.existsSync(paths.sdkPath)).toBe(true);
    expect(fs.existsSync(path.join(paths.sdkPath, '.git'))).toBe(true);

    // Verify samples worktree was created
    expect(fs.existsSync(paths.samplesPath)).toBe(true);
    expect(fs.existsSync(path.join(paths.samplesPath, '.git'))).toBe(true);

    // Verify branch was created in SDK worktree
    const { stdout: branchOutput } = await execa('git', ['branch'], { cwd: paths.sdkPath });
    expect(branchOutput).toContain(branchName);
  });

  test('should handle existing worktree directories gracefully', async () => {
    const project = createMockProjectConfig();
    const paths = createMockWorkspacePaths('test-existing');
    const branchName = 'feature/existing-test';

    // Create pre-existing directories
    await fs.ensureDir(paths.sdkPath);
    await fs.ensureDir(paths.samplesPath);
    await fs.writeFile(path.join(paths.sdkPath, 'dummy.txt'), 'existing content');

    // Should not fail due to existing directories
    await setupWorktrees(project, paths, branchName, false);

    // Verify worktrees were set up despite existing directories
    expect(fs.existsSync(path.join(paths.sdkPath, '.git'))).toBe(true);
    expect(fs.existsSync(path.join(paths.samplesPath, '.git'))).toBe(true);
  });

  test('should handle repository without remote origin', async () => {
    // Create a repository without remote origin
    const localRepoPath = await manager.createDummyRepo({
      name: 'test-local-only',
      type: 'sdk',
      hasRemote: false,
    });

    const project: ProjectConfig = {
      key: 'test-local',
      name: 'Test Local Project',
      sdk_repo: localRepoPath,
      sample_repo: sampleRepoPath,
      github_org: 'test-org',
    };

    const paths = createMockWorkspacePaths('test-local');
    const branchName = 'feature/local-test';

    // Should handle the lack of remote gracefully
    await setupWorktrees(project, paths, branchName, false);

    expect(fs.existsSync(paths.sdkPath)).toBe(true);
    expect(fs.existsSync(path.join(paths.sdkPath, '.git'))).toBe(true);
  });

  test('should fail gracefully with invalid repository paths', async () => {
    const project: ProjectConfig = {
      key: 'test-invalid',
      name: 'Test Invalid Project',
      sdk_repo: '/nonexistent/path',
      sample_repo: '/another/nonexistent/path',
      github_org: 'test-org',
    };

    // Use invalid paths in the WorkspacePaths as well
    const paths: WorkspacePaths = {
      srcDir: testDir,
      baseDir: workspaceDir,
      workspaceDir: path.join(workspaceDir, 'test-invalid'),
      sdkPath: path.join(workspaceDir, 'test-invalid', 'sdk'),
      samplesPath: path.join(workspaceDir, 'test-invalid', 'samples'),
      sampleAppPath: path.join(workspaceDir, 'test-invalid', 'samples', 'app'),
      sdkRepoPath: '/nonexistent/path', // This is what gets validated
      sampleRepoPath: '/another/nonexistent/path', // This is what gets validated
    };

    const branchName = 'feature/invalid-test';

    await expect(setupWorktrees(project, paths, branchName, false)).rejects.toThrow(
      'Repository validation failed',
    );
  });

  test('should handle worktree cleanup correctly', async () => {
    const project = createMockProjectConfig();
    const paths = createMockWorkspacePaths('test-cleanup');
    const branchName = 'feature/cleanup-test';

    // First, set up worktrees
    await setupWorktrees(project, paths, branchName, false);

    // Verify they exist
    expect(fs.existsSync(paths.sdkPath)).toBe(true);
    expect(fs.existsSync(paths.samplesPath)).toBe(true);

    // Simulate clean command behavior
    try {
      await execa('git', ['worktree', 'remove', paths.sdkPath, '--force'], { cwd: sdkRepoPath });
    } catch (error) {
      // This should succeed, but if it fails, log the error for debugging
      console.error('SDK worktree removal failed:', error);
    }

    try {
      await execa('git', ['worktree', 'remove', paths.samplesPath, '--force'], {
        cwd: sampleRepoPath,
      });
    } catch (error) {
      // This should succeed, but if it fails, log the error for debugging
      console.error('Samples worktree removal failed:', error);
    }

    // Remove workspace directory
    await fs.remove(paths.workspaceDir);

    // Verify cleanup
    expect(fs.existsSync(paths.workspaceDir)).toBe(false);
  });

  test('should handle branch name with special characters', async () => {
    const project = createMockProjectConfig();
    const paths = createMockWorkspacePaths('test-special-chars');
    const branchName = 'feature/test-with-special_chars-123';

    await setupWorktrees(project, paths, branchName, false);

    expect(fs.existsSync(paths.sdkPath)).toBe(true);
    expect(fs.existsSync(paths.samplesPath)).toBe(true);

    // Verify branch name is correctly created
    const { stdout: branchOutput } = await execa('git', ['branch'], { cwd: paths.sdkPath });
    expect(branchOutput).toContain(branchName);
  });

  test('should handle corrupted repository gracefully', async () => {
    // Create a corrupted repository
    const corruptedRepoPath = await manager.createDummyRepo({
      name: 'test-corrupted',
      type: 'sdk',
      hasRemote: false,
    });

    // Corrupt the repository by completely removing the .git directory
    await fs.remove(path.join(corruptedRepoPath, '.git'));

    const project: ProjectConfig = {
      key: 'test-corrupted',
      name: 'Test Corrupted Project',
      sdk_repo: corruptedRepoPath,
      sample_repo: sampleRepoPath,
      github_org: 'test-org',
    };

    const paths: WorkspacePaths = {
      srcDir: testDir,
      baseDir: workspaceDir,
      workspaceDir: path.join(workspaceDir, 'test-corrupted'),
      sdkPath: path.join(workspaceDir, 'test-corrupted', 'sdk'),
      samplesPath: path.join(workspaceDir, 'test-corrupted', 'samples'),
      sampleAppPath: path.join(workspaceDir, 'test-corrupted', 'samples', 'app'),
      sdkRepoPath: corruptedRepoPath, // Point to the corrupted repo
      sampleRepoPath,
    };

    const branchName = 'feature/corrupted-test';

    // Should detect the corrupted repository and fail
    await expect(setupWorktrees(project, paths, branchName, false)).rejects.toThrow();
  });

  test('should handle worktree prune operations', async () => {
    const project = createMockProjectConfig();
    const paths = createMockWorkspacePaths('test-prune');
    const branchName = 'feature/prune-test';

    // Set up worktrees
    await setupWorktrees(project, paths, branchName, false);

    // Create a stale worktree by removing the directory but not the git worktree entry
    await fs.remove(paths.sdkPath);

    // Should handle stale worktree gracefully when setting up again
    const newPaths = createMockWorkspacePaths('test-prune-new');
    await setupWorktrees(project, newPaths, 'feature/prune-test-2', false);

    expect(fs.existsSync(newPaths.sdkPath)).toBe(true);
    expect(fs.existsSync(newPaths.samplesPath)).toBe(true);
  });
});
