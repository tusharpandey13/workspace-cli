import { describe, test, expect } from 'vitest';
import { setupWorktrees } from '../src/services/gitWorktrees.js';
import type { ProjectConfig, WorkspacePaths } from '../src/types/index.js';
import path from 'path';
import os from 'os';

describe('Worktree Validation Debug', () => {
  test('should fail with invalid paths - debug version', async () => {
    const testDir = path.join(os.tmpdir(), `debug-test-${Date.now()}`);

    const project: ProjectConfig = {
      key: 'test-debug',
      name: 'Test Debug Project',
      sdk_repo: '/absolutely/nonexistent/path',
      sample_repo: '/another/nonexistent/path',
      github_org: 'test-org',
    };

    const paths: WorkspacePaths = {
      srcDir: testDir,
      baseDir: testDir,
      workspaceDir: path.join(testDir, 'workspace'),
      sdkPath: path.join(testDir, 'workspace', 'sdk'),
      samplesPath: path.join(testDir, 'workspace', 'samples'),
      sampleAppPath: path.join(testDir, 'workspace', 'samples', 'app'),
      sdkRepoPath: '/absolutely/nonexistent/path',
      sampleRepoPath: '/another/nonexistent/path',
    };

    const branchName = 'feature/debug-test';

    console.log('About to call setupWorktrees with invalid paths...');
    console.log('SDK repo path:', paths.sdkRepoPath);
    console.log('Sample repo path:', paths.sampleRepoPath);

    try {
      await setupWorktrees(project, paths, branchName, false);
      console.log('❌ setupWorktrees succeeded when it should have failed!');
      expect.fail('setupWorktrees should have thrown an error');
    } catch (error) {
      console.log('✅ setupWorktrees correctly failed with error:', error);
      expect(error).toBeDefined();
    }
  });
});
