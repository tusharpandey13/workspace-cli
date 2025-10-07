import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { execSync } from 'child_process';
import { DummyRepoManager } from '../src/services/dummyRepoManager.js';

/**
 * Test for post-init error handling and progress bar coordination
 * Verifies the fixes for:
 * 1. Error output corrupting progress bar
 * 2. Incorrect success messages when post-init fails
 * 3. Proper error flow: workspace ready first, then error details
 */
describe('Post-Init Error Handling', () => {
  let testConfigPath: string;
  let testRepoPath: string;
  let dummyRepoManager: DummyRepoManager;
  let cliPath: string;
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for test environment
    tempDir = path.join(
      os.tmpdir(),
      `postinit-error-test-${Date.now()}-${Math.random().toString(36).substring(2)}`,
    );
    await fs.ensureDir(tempDir);

    // Setup dummy repository manager
    dummyRepoManager = new DummyRepoManager(tempDir);

    // Create test SDK repository
    testRepoPath = await dummyRepoManager.createDummyRepo({
      name: 'test',
      type: 'sdk',
    });

    // Create CLI path
    cliPath = path.join(__dirname, '..', 'dist', 'bin', 'workspace.js');

    // Create test configuration
    testConfigPath = path.join(tempDir, 'config.yaml');
    const configContent = `
global:
  src_dir: ${tempDir}
  workspace_base: workspaces

projects:
  test-postinit-success:
    name: Test Project Success
    repo: ${testRepoPath}
    post-init: echo "success"
    
  test-postinit-failure:
    name: Test Project Failure
    repo: ${testRepoPath}
    post-init: exit 1
    
  test-postinit-command-not-found:
    name: Test Project Command Not Found
    repo: ${testRepoPath}
    post-init: nonexistent-command-12345
`;
    await fs.writeFile(testConfigPath, configContent, 'utf8');
  });

  afterEach(async () => {
    // Cleanup
    if (dummyRepoManager) {
      await dummyRepoManager.cleanupAll();
    }
  });

  it('should handle successful post-init command correctly', async () => {
    const result = execSync(
      `node ${cliPath} init test-postinit-success test-branch --config ${testConfigPath}`,
      {
        encoding: 'utf8',
        env: { ...process.env, WORKSPACE_DISABLE_PROGRESS: '1' },
      },
    );

    expect(result).toContain('Workspace ready');
    expect(result).not.toContain('post init failed');
  });

  it('should handle post-init command failure with proper error flow', async () => {
    const result = execSync(
      `node ${cliPath} init test-postinit-failure test-branch --config ${testConfigPath} 2>&1`,
      {
        encoding: 'utf8',
        env: { ...process.env, WORKSPACE_DISABLE_PROGRESS: '1' },
      },
    );

    expect(result).toContain('Workspace initialized, post init failed');
    expect(result).toContain('❌ Post-init command failed:');
    expect(result).toContain('Exit Code: 1');
    expect(result).toContain('The workspace is still ready for development');
  });

  it('should not show "Workspace ready" when post-init fails', async () => {
    const result = execSync(
      `node ${cliPath} init test-postinit-failure test-branch --config ${testConfigPath}`,
      {
        encoding: 'utf8',
        env: { ...process.env, WORKSPACE_DISABLE_PROGRESS: '1' },
      },
    );

    // Should NOT show "Workspace ready" when post-init fails
    expect(result).not.toContain('Workspace ready');
    // Should show the correct failure message instead
    expect(result).toContain('Workspace initialized, post init failed');
  });
});
