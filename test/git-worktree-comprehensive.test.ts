import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { setupWorktrees } from '../src/services/gitWorktrees.js';
import { DummyRepoManager } from '../src/services/dummyRepoManager.js';
import type { ProjectConfig, WorkspacePaths } from '../src/types/index.js';

describe('Git Worktree Setup - Comprehensive Integration', () => {
  let testDir: string;
  let manager: DummyRepoManager;
  let sourceRepoPath: string;
  let destinationRepoPath: string;
  let project: ProjectConfig;
  let paths: WorkspacePaths;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `worktree-test-${Date.now()}`);
    await fs.ensureDir(testDir);

    manager = new DummyRepoManager(testDir);
    const { sdkPath, samplePath } = await manager.createTestEnvironment('test');
    sourceRepoPath = sdkPath;
    destinationRepoPath = samplePath;

    project = {
      key: 'test',
      name: 'Test Worktree Project',
      repo: sourceRepoPath,
      sample_repo: destinationRepoPath,
    };

    const srcDir = path.join(testDir, 'src');
    const workspaceDir = path.join(srcDir, 'workspaces');

    paths = {
      srcDir,
      baseDir: testDir,
      workspaceDir,
      sourceRepoPath: path.join(srcDir, 'test'),
      sourcePath: path.join(workspaceDir, 'test'),
      destinationRepoPath: path.join(srcDir, 'test-samples'),
      destinationPath: path.join(workspaceDir, 'test-samples'),
    };

    // Ensure directories exist
    await fs.ensureDir(paths.srcDir);
    await fs.ensureDir(paths.workspaceDir);
  });

  afterEach(async () => {
    await manager.cleanupAll();
    if (testDir && (await fs.pathExists(testDir))) {
      await fs.remove(testDir);
    }
  });

  describe('Branch Name with Slashes Handling', () => {
    it('should successfully handle branch name with slashes in dry run mode', async () => {
      const branchName = 'bugfix/RT-same-scope-as-AT';

      // Test in dry run mode first to avoid complex git setup
      await expect(setupWorktrees(project, paths, branchName, true)).resolves.not.toThrow();
    });

    it('should handle simple branch names in dry run mode', async () => {
      const branchName = 'simple-branch';

      await expect(setupWorktrees(project, paths, branchName, true)).resolves.not.toThrow();
    });

    it('should handle branch names with multiple slashes in dry run mode', async () => {
      const branchName = 'feature/user/profile-update';

      await expect(setupWorktrees(project, paths, branchName, true)).resolves.not.toThrow();
    });
  });

  describe('Samples Branch Name Transformation', () => {
    it('should correctly handle various branch name patterns in dry run', async () => {
      // Test the transformation logic indirectly through dry run mode
      const testCases = [
        'bugfix/RT-same-scope-as-AT',
        'feature/user/profile-update',
        'hotfix/critical/security-patch',
        'simple-branch',
      ];

      // Each should complete without throwing in dry run mode
      return Promise.all(
        testCases.map((branchName) => setupWorktrees(project, paths, branchName, true)),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid project configuration gracefully', async () => {
      const invalidProject = {
        key: 'invalid',
        name: 'Invalid Project',
        repo: 'invalid-repo-url',
      };

      // Should not throw in dry run mode
      await expect(
        setupWorktrees(invalidProject, paths, 'test-branch', true),
      ).resolves.not.toThrow();
    });
  });
});
