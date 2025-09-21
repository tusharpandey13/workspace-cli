import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DummyRepoManager } from '../src/services/dummyRepoManager.js';
import { cleanWorkspace, cleanCommand } from '../src/commands/clean.js';
import { handleError } from '../src/utils/errors.js';
import { logger } from '../src/utils/logger.js';
import { configManager } from '../src/utils/config.js';
import { validateProjectKey, validateWorkspaceName } from '../src/utils/validation.js';
import { Command } from 'commander';
import fs from 'fs-extra';

// Mock all dependencies
vi.mock('../src/utils/errors.js', () => ({
  handleError: vi.fn(),
  ValidationError: class ValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ValidationError';
    }
  },
  WorkspaceError: class WorkspaceError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'WorkspaceError';
    }
  },
  FileSystemError: class FileSystemError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'FileSystemError';
    }
  },
}));
vi.mock('../src/utils/logger.js');
vi.mock('../src/utils/config.js');
vi.mock('../src/utils/validation.js', () => ({
  validateProjectKey: vi.fn(),
  validateWorkspaceName: vi.fn(),
}));
vi.mock('commander');
vi.mock('fs-extra');

describe('Clean Command - Comprehensive', () => {
  let manager: DummyRepoManager;
  let mockCommand: Command;

  // Define shared mock objects
  const mockProjectConfig = {
    name: 'Test Project',
    repo: 'https://github.com/test/test-repo.git',
  };

  const mockWorkspacePaths = {
    workspaceDir: '/test/workspace/dir',
    sourcePath: '/test/workspace/dir/source',
    destinationPath: '/test/workspace/dir/destination',
    sourceRepoPath: '/test/source/repo',
    destinationRepoPath: '/test/destination/repo',
  };

  beforeEach(async () => {
    manager = new DummyRepoManager();
    // DummyRepoManager no longer has setup() method - initialization is automatic

    // Reset all mocks
    vi.clearAllMocks();

    // Setup Command mock
    mockCommand = {
      command: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      argument: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      addHelpText: vi.fn().mockReturnThis(),
      action: vi.fn().mockReturnThis(),
    } as unknown as Command;
    vi.mocked(Command).mockImplementation(() => mockCommand);

    // Setup default successful mocks
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.remove).mockResolvedValue(undefined);

    // Setup configManager mock
    vi.mocked(configManager.validateProject).mockReturnValue(mockProjectConfig);
    vi.mocked(configManager.getWorkspacePaths).mockReturnValue(mockWorkspacePaths);

    // Setup validation mocks
    vi.mocked(validateProjectKey).mockReturnValue('test-project');
    vi.mocked(validateWorkspaceName).mockReturnValue('test-workspace');

    // Setup error handling mock
    vi.mocked(handleError).mockImplementation(() => {});
    vi.mocked(logger.info).mockImplementation(() => {});
    vi.mocked(logger.warn).mockImplementation(() => {});
    vi.mocked(logger.error).mockImplementation(() => {});
    vi.mocked(logger.success).mockImplementation(() => {});
    vi.mocked(logger.verbose).mockImplementation(() => {});
    vi.mocked(logger.isVerbose).mockReturnValue(false);
  });

  afterEach(async () => {
    await manager?.cleanupAll(); // DummyRepoManager uses cleanupAll() instead of cleanup()
  });

  describe('Parameter Validation', () => {
    it('should handle missing project parameter', async () => {
      const options = { force: false, dryRun: false };

      await cleanWorkspace('', options);

      expect(handleError).toHaveBeenCalledWith(expect.any(Error), logger);
      expect(handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Project parameter is required'),
        }),
        logger,
      );
    });

    it('should handle empty project parameter', async () => {
      const options = { force: false, dryRun: false };

      await cleanWorkspace('   ', options);

      expect(handleError).toHaveBeenCalledWith(expect.any(Error), logger);
    });

    it('should validate project parameter type', async () => {
      const options = { force: false, dryRun: false };

      await cleanWorkspace(null as any, options);

      expect(handleError).toHaveBeenCalledWith(expect.any(Error), logger);
    });

    it('should handle invalid options object', async () => {
      await cleanWorkspace('test-project', null as any);

      expect(handleError).toHaveBeenCalledWith(expect.any(Error), logger);
    });
  });

  describe('Workspace Existence Validation', () => {
    it('should handle non-existent workspace directories', async () => {
      // Reset configManager mocks to return valid values for this test
      vi.mocked(configManager.validateProject).mockReturnValue(mockProjectConfig);
      vi.mocked(configManager.getWorkspacePaths).mockReturnValue(mockWorkspacePaths);
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const options = { force: true, dryRun: false };

      await cleanWorkspace('test-project', options);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No workspaces found for project'),
      );
    });

    it('should handle permission denied on workspace access', async () => {
      vi.mocked(fs.existsSync).mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });
      const options = { force: true, dryRun: false };

      await cleanWorkspace('test-project', options);

      expect(handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('EACCES'),
        }),
        logger,
      );
    });

    it('should handle corrupted directory structures', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.remove).mockRejectedValue(new Error('ENOTDIR: not a directory'));
      const options = { force: true, dryRun: false };

      await cleanWorkspace('test-project', options);

      expect(handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('ENOTDIR'),
        }),
        logger,
      );
    });

    it('should handle extremely long path names', async () => {
      const longProjectName = 'a'.repeat(500);
      // Make validation throw an error for extremely long names
      vi.mocked(validateProjectKey).mockImplementation(() => {
        throw new Error('Project name too long');
      });
      const options = { force: false, dryRun: false };

      await cleanWorkspace(longProjectName, options);

      // Should handle gracefully without crashing
      expect(handleError).toHaveBeenCalled();
    });
  });

  describe('Security Validation', () => {
    it('should prevent directory traversal attacks', async () => {
      const maliciousProject = '../../../etc/passwd';
      const options = { force: false, dryRun: false };

      await cleanWorkspace(maliciousProject, options);

      expect(handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Project key contains invalid characters'),
        }),
        logger,
      );
    });

    it('should sanitize project names with special characters', async () => {
      const specialCharsProject = 'test/project:name';
      const options = { force: false, dryRun: false };

      await cleanWorkspace(specialCharsProject, options);

      expect(handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Project key contains invalid characters'),
        }),
        logger,
      );
    });

    it('should prevent deletion of system directories', async () => {
      const systemProject = '/usr/bin/';
      const options = { force: false, dryRun: false };

      await cleanWorkspace(systemProject, options);

      expect(handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Project key contains invalid characters'),
        }),
        logger,
      );
    });

    it('should validate absolute vs relative paths', async () => {
      const absoluteProject = '/absolute/path/project';
      const options = { force: false, dryRun: false };

      await cleanWorkspace(absoluteProject, options);

      expect(handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Project key contains invalid characters'),
        }),
        logger,
      );
    });
  });

  describe('File System Operations', () => {
    it('should handle successful workspace deletion', async () => {
      // Reset mocks for this test to ensure proper configuration
      vi.mocked(configManager.validateProject).mockReturnValue(mockProjectConfig);
      vi.mocked(configManager.getWorkspacePaths).mockReturnValue(mockWorkspacePaths);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.remove).mockResolvedValue(undefined);
      const options = { force: true, dryRun: false };

      await cleanWorkspace('test-project', options);

      expect(fs.remove).toHaveBeenCalled();
      expect(logger.success).toHaveBeenCalledWith(expect.stringContaining('cleaned successfully'));
    });

    it('should handle file system permission errors', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.remove).mockRejectedValue(new Error('EPERM: operation not permitted'));
      const options = { force: true, dryRun: false };

      await cleanWorkspace('test-project', options);

      expect(handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('EPERM'),
        }),
        logger,
      );
    });

    it('should handle disk full scenarios', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.remove).mockRejectedValue(new Error('ENOSPC: no space left on device'));
      const options = { force: true, dryRun: false };

      await cleanWorkspace('test-project', options);

      expect(handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('ENOSPC'),
        }),
        logger,
      );
    });

    it('should handle network file system interruptions', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.remove).mockRejectedValue(new Error('EIO: i/o error'));
      const options = { force: true, dryRun: false };

      await cleanWorkspace('test-project', options);

      expect(handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('EIO'),
        }),
        logger,
      );
    });
  });

  describe('Force Flag Behavior', () => {
    it('should respect force flag for dangerous operations', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.remove).mockResolvedValue(undefined);
      const options = { force: true, dryRun: false };

      await cleanWorkspace('test-project', options);

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Force flag enabled'));
    });

    it('should request confirmation when force flag is not set', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const options = { force: false, dryRun: false };

      await cleanWorkspace('test-project', options);

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Use --force'));
    });

    it('should handle force flag with dry run combination', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const options = { force: true, dryRun: true };

      await cleanWorkspace('test-project', options);

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('DRY RUN'));
      expect(fs.remove).not.toHaveBeenCalled();
    });
  });

  describe('Dry Run Mode', () => {
    it('should not perform actual deletions in dry run mode', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const options = { force: false, dryRun: true };

      await cleanWorkspace('test-project', options);

      expect(fs.remove).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('DRY RUN'));
    });

    it('should report what would be deleted in dry run mode', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const options = { force: false, dryRun: true };

      await cleanWorkspace('test-project', options);

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Would delete'));
    });

    it('should validate permissions in dry run without modification', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const options = { force: false, dryRun: true };

      await cleanWorkspace('test-project', options);

      expect(logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Checking permissions'));
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple clean operations safely', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.remove).mockResolvedValue(undefined);
      const options = { force: true, dryRun: false };

      const promises = [
        cleanWorkspace('test-project-1', options),
        cleanWorkspace('test-project-2', options),
        cleanWorkspace('test-project-3', options),
      ];

      await Promise.all(promises);

      // Should complete all operations without conflicts
      expect(fs.remove).toHaveBeenCalledTimes(3);
    });

    it('should handle race conditions with file system', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.remove)
        .mockRejectedValueOnce(new Error('ENOENT: no such file or directory'))
        .mockResolvedValue(undefined);
      const options = { force: true, dryRun: false };

      await cleanWorkspace('test-project', options);

      expect(handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('ENOENT'),
        }),
        logger,
      );
    });

    it('should handle file locks and busy resources', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.remove).mockRejectedValue(new Error('EBUSY: resource busy or locked'));
      const options = { force: true, dryRun: false };

      await cleanWorkspace('test-project', options);

      expect(handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('EBUSY'),
        }),
        logger,
      );
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from partial deletion failures', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.remove)
        .mockRejectedValueOnce(new Error('Partial failure'))
        .mockResolvedValue(undefined);
      const options = { force: true, dryRun: false };

      await cleanWorkspace('test-project', options);

      expect(handleError).toHaveBeenCalledWith(expect.any(Error), logger);
    });

    it('should handle memory pressure during large cleanups', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.remove).mockRejectedValue(new Error('JavaScript heap out of memory'));
      const options = { force: true, dryRun: false };

      await cleanWorkspace('test-project', options);

      expect(handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('heap out of memory'),
        }),
        logger,
      );
    });

    it('should handle interrupted operations gracefully', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.remove).mockRejectedValue(new Error('EINTR: interrupted system call'));
      const options = { force: true, dryRun: false };

      await cleanWorkspace('test-project', options);

      expect(handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('EINTR'),
        }),
        logger,
      );
    });
  });

  describe('Logging and Reporting', () => {
    it('should provide detailed progress reporting', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.remove).mockResolvedValue(undefined);
      const options = { force: true, dryRun: false };

      await cleanWorkspace('test-project', options);

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Cleaning workspaces'));
    });

    it('should report statistics after completion', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.remove).mockResolvedValue(undefined);
      const options = { force: true, dryRun: false };

      await cleanWorkspace('test-project', options);

      expect(logger.success).toHaveBeenCalledWith(expect.stringContaining('cleaned successfully'));
    });

    it('should provide verbose logging when enabled', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.remove).mockResolvedValue(undefined);
      vi.mocked(logger.isVerbose).mockReturnValue(true); // Enable verbose mode
      const options = { force: true, dryRun: false };

      await cleanWorkspace('test-project', options);

      expect(logger.verbose).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle unicode and special characters in project names', async () => {
      const unicodeProject = 'test-项目-🚀';
      // Make validation throw an error for special characters
      vi.mocked(validateProjectKey).mockImplementation(() => {
        throw new Error('Project name contains invalid characters');
      });
      const options = { force: true, dryRun: false };

      await cleanWorkspace(unicodeProject, options);

      // Should handle gracefully
      expect(handleError).toHaveBeenCalled();
    });

    it('should handle very large workspace directories', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.remove).mockImplementation(async () => {
        // Simulate slow deletion of large directory
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      const options = { force: true, dryRun: false };

      const startTime = Date.now();
      await cleanWorkspace('test-large-project', options);
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThanOrEqual(10);
      expect(logger.success).toHaveBeenCalled();
    });

    it('should handle cleanup during system shutdown', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.remove).mockRejectedValue(new Error('System is shutting down'));
      const options = { force: true, dryRun: false };

      await cleanWorkspace('test-project', options);

      expect(handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('shutting down'),
        }),
        logger,
      );
    });
  });

  describe('Integration with CLI Framework', () => {
    it('should integrate properly with Commander.js', () => {
      // Test command registration by calling cleanCommand with the mock
      cleanCommand(mockCommand);

      // Test command registration
      expect(mockCommand.command).toHaveBeenCalledWith('clean <project> <workspace>');
      expect(mockCommand.description).toHaveBeenCalled();
      expect(mockCommand.action).toHaveBeenCalled();
    });

    it('should handle CLI argument parsing correctly', async () => {
      // This test should pass without calling handleError for valid inputs
      const options = { force: false, dryRun: false };

      await cleanWorkspace('valid-project', options);

      // Should process without argument parsing errors - no error expected
      expect(logger.info).toHaveBeenCalledWith('Use --force flag to confirm dangerous operations');
    });

    it('should respect global CLI options', async () => {
      vi.mocked(logger.isVerbose).mockReturnValue(true); // Enable verbose mode
      const options = { force: true, dryRun: false, verbose: true };

      await cleanWorkspace('test-project', options);

      expect(logger.verbose).toHaveBeenCalled();
    });
  });
});
