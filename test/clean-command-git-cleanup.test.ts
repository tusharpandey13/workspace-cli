import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import { cleanWorkspace } from '../src/commands/clean.js';
import { configManager } from '../src/utils/config.js';
import { executeGitCommand } from '../src/utils/secureExecution.js';
import { logger } from '../src/utils/logger.js';

// Mock dependencies
vi.mock('fs-extra');
vi.mock('../src/utils/secureExecution.js');
vi.mock('../src/utils/config.js');
vi.mock('../src/utils/logger.js');

const mockFs = vi.mocked(fs);
const mockExecuteGitCommand = vi.mocked(executeGitCommand);
const mockConfigManager = vi.mocked(configManager);
const mockLogger = vi.mocked(logger);

describe('clean command with git worktree cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock logger methods
    mockLogger.isVerbose.mockReturnValue(false);
    mockLogger.info = vi.fn();
    mockLogger.verbose = vi.fn();
    mockLogger.debug = vi.fn();
    mockLogger.success = vi.fn();

    // Mock configManager
    const mockProject = {
      key: 'test-project',
      name: 'Test Project',
      repo: 'https://github.com/test/repo.git',
    };
    mockConfigManager.validateProject.mockReturnValue(mockProject);
    mockConfigManager.getWorkspacePaths.mockReturnValue({
      srcDir: '/test/src',
      baseDir: '/test',
      workspaceDir: '/test/workspace/dir',
      sourceRepoPath: '/test/source/repo',
      sourcePath: '/test/workspace/dir/source',
      destinationRepoPath: '/test/destination/repo',
      destinationPath: '/test/workspace/dir/destination',
    });
    mockConfigManager.getProject.mockReturnValue(mockProject);

    // Mock fs operations
    mockFs.existsSync.mockReturnValue(true);
    mockFs.remove.mockResolvedValue(undefined);

    // Mock git commands to succeed by default
    mockExecuteGitCommand.mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should perform complete cleanup including git worktrees', async () => {
    await cleanWorkspace('test-project', {
      workspace: 'test-workspace',
      force: true,
    });

    // Verify git cleanup commands were called
    expect(mockExecuteGitCommand).toHaveBeenCalledWith(
      ['worktree', 'remove', '/test/workspace/dir/source', '--force'],
      { cwd: '/test/source/repo' },
    );

    expect(mockExecuteGitCommand).toHaveBeenCalledWith(
      ['worktree', 'remove', '/test/workspace/dir/destination', '--force'],
      { cwd: '/test/destination/repo' },
    );

    expect(mockExecuteGitCommand).toHaveBeenCalledWith(['worktree', 'prune'], {
      cwd: '/test/source/repo',
    });

    expect(mockExecuteGitCommand).toHaveBeenCalledWith(['worktree', 'prune'], {
      cwd: '/test/destination/repo',
    });

    expect(mockExecuteGitCommand).toHaveBeenCalledWith(['branch', '-D', 'test-workspace'], {
      cwd: '/test/source/repo',
    });

    expect(mockExecuteGitCommand).toHaveBeenCalledWith(['branch', '-D', 'test-workspace-samples'], {
      cwd: '/test/destination/repo',
    });

    // Verify directory cleanup
    expect(mockFs.remove).toHaveBeenCalledWith('/test/workspace/dir');

    // Verify success message
    expect(mockLogger.success).toHaveBeenCalledWith('Workspace cleaned successfully');
  });

  it('should handle git worktree removal failures gracefully', async () => {
    // Mock worktree remove to fail, but prune to succeed
    mockExecuteGitCommand
      .mockRejectedValueOnce(new Error('worktree remove failed'))
      .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }); // prune succeeds

    await cleanWorkspace('test-project', {
      workspace: 'test-workspace',
      force: true,
    });

    // Should still complete the cleanup
    expect(mockFs.remove).toHaveBeenCalledWith('/test/workspace/dir');
    expect(mockLogger.success).toHaveBeenCalledWith('Workspace cleaned successfully');
  });

  it('should continue cleanup even if git operations fail completely', async () => {
    // Mock all git commands to fail
    mockExecuteGitCommand.mockRejectedValue(new Error('git command failed'));

    await cleanWorkspace('test-project', {
      workspace: 'test-workspace',
      force: true,
    });

    // Directory cleanup should still happen
    expect(mockFs.remove).toHaveBeenCalledWith('/test/workspace/dir');
    expect(mockLogger.success).toHaveBeenCalledWith('Workspace cleaned successfully');
  });

  it('should handle missing repository paths gracefully', async () => {
    // Mock workspace paths without destination repository paths
    mockConfigManager.getWorkspacePaths.mockReturnValue({
      srcDir: '/test/src',
      baseDir: '/test',
      workspaceDir: '/test/workspace/dir',
      sourceRepoPath: '/test/source/repo',
      sourcePath: '/test/workspace/dir/source',
      destinationRepoPath: undefined,
      destinationPath: undefined,
    });

    await cleanWorkspace('test-project', {
      workspace: 'test-workspace',
      force: true,
    });

    // Only source repo git commands should be called
    expect(mockExecuteGitCommand).toHaveBeenCalledWith(
      ['worktree', 'remove', '/test/workspace/dir/source', '--force'],
      { cwd: '/test/source/repo' },
    );

    // Directory cleanup should still happen
    expect(mockFs.remove).toHaveBeenCalledWith('/test/workspace/dir');
    expect(mockLogger.success).toHaveBeenCalledWith('Workspace cleaned successfully');
  });

  it('should require --force flag for cleanup', async () => {
    await expect(
      cleanWorkspace('test-project', {
        workspace: 'test-workspace',
        force: false,
      }),
    ).rejects.toThrow();

    // No cleanup should have occurred
    expect(mockFs.remove).not.toHaveBeenCalled();
    expect(mockExecuteGitCommand).not.toHaveBeenCalled();
  });

  it('should handle dry run mode correctly', async () => {
    await cleanWorkspace('test-project', {
      workspace: 'test-workspace',
      dryRun: true,
    });

    // No actual operations should be performed
    expect(mockFs.remove).not.toHaveBeenCalled();
    expect(mockExecuteGitCommand).not.toHaveBeenCalled();

    // Should show what would be deleted
    expect(mockLogger.info).toHaveBeenCalledWith('DRY RUN MODE: Showing what would be deleted');
  });
});
