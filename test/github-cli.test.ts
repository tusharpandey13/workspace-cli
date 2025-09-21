import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GitHubCliService, gitHubCliService } from '../src/services/gitHubCli.js';
import * as secureExecution from '../src/utils/secureExecution.js';

// Mock the secure execution module
vi.mock('../src/utils/secureExecution.js', () => ({
  executeGhCommand: vi.fn(),
}));

// Mock the logger
vi.mock('../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    verbose: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    step: vi.fn(),
    command: vi.fn(),
  },
}));

describe('GitHubCliService', () => {
  let service: GitHubCliService;
  const mockExecuteGhCommand = vi.mocked(secureExecution.executeGhCommand);

  beforeEach(() => {
    service = new GitHubCliService();
    service.clearCache(); // Clear cache before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkStatus', () => {
    it('should return not installed when gh --version fails', async () => {
      mockExecuteGhCommand.mockResolvedValueOnce({
        stdout: '',
        stderr: 'command not found: gh',
        exitCode: 127,
      });

      const status = await service.checkStatus();

      expect(status.isInstalled).toBe(false);
      expect(status.isAuthenticated).toBe(false);
      expect(status.error).toBe('GitHub CLI is not installed or not available in PATH');
    });

    it('should return installed but not authenticated when gh auth status fails', async () => {
      // Mock successful version check
      mockExecuteGhCommand
        .mockResolvedValueOnce({
          stdout: 'gh version 2.40.1',
          stderr: '',
          exitCode: 0,
        })
        // Mock failed auth status
        .mockResolvedValueOnce({
          stdout: '',
          stderr: 'You are not logged into any GitHub hosts. Run gh auth login to authenticate.',
          exitCode: 1,
        });

      const status = await service.checkStatus();

      expect(status.isInstalled).toBe(true);
      expect(status.isAuthenticated).toBe(false);
      expect(status.error).toBe(
        'GitHub CLI is not authenticated. Run "gh auth login" to authenticate.',
      );
    });

    it('should return fully authenticated status', async () => {
      // Mock successful version check
      mockExecuteGhCommand
        .mockResolvedValueOnce({
          stdout: 'gh version 2.40.1',
          stderr: '',
          exitCode: 0,
        })
        // Mock successful auth status
        .mockResolvedValueOnce({
          stdout: '',
          stderr:
            'github.com\n  ✓ Logged in to github.com as testuser (oauth_token)\n  ✓ Git operations protocol: https\n  ✓ Token: gho_****\n',
          exitCode: 0,
        });

      const status = await service.checkStatus();

      expect(status.isInstalled).toBe(true);
      expect(status.isAuthenticated).toBe(true);
      expect(status.hostname).toBe('github.com');
      expect(status.account).toBe('testuser');
      expect(status.error).toBeUndefined();
    });

    it('should handle version command exception', async () => {
      mockExecuteGhCommand.mockRejectedValueOnce(new Error('Command execution failed'));

      const status = await service.checkStatus();

      expect(status.isInstalled).toBe(false);
      expect(status.isAuthenticated).toBe(false);
      expect(status.error).toContain('GitHub CLI check failed');
    });

    it('should cache results and return cached data on subsequent calls', async () => {
      // Mock successful status check
      mockExecuteGhCommand
        .mockResolvedValueOnce({
          stdout: 'gh version 2.40.1',
          stderr: '',
          exitCode: 0,
        })
        .mockResolvedValueOnce({
          stdout: '',
          stderr: 'github.com\n  ✓ Logged in to github.com as testuser\n',
          exitCode: 0,
        });

      // First call should make actual checks
      const status1 = await service.checkStatus();
      expect(mockExecuteGhCommand).toHaveBeenCalledTimes(2);

      // Second call should use cached result
      const status2 = await service.checkStatus();
      expect(mockExecuteGhCommand).toHaveBeenCalledTimes(2); // No additional calls
      expect(status2).toEqual(status1);
    });

    it('should force refresh when requested', async () => {
      // Mock first successful check
      mockExecuteGhCommand
        .mockResolvedValueOnce({
          stdout: 'gh version 2.40.1',
          stderr: '',
          exitCode: 0,
        })
        .mockResolvedValueOnce({
          stdout: '',
          stderr: 'github.com\n  ✓ Logged in to github.com as testuser\n',
          exitCode: 0,
        })
        // Mock second check with different result
        .mockResolvedValueOnce({
          stdout: 'gh version 2.40.1',
          stderr: '',
          exitCode: 0,
        })
        .mockResolvedValueOnce({
          stdout: '',
          stderr: 'You are not logged in',
          exitCode: 1,
        });

      // First call
      await service.checkStatus();
      expect(mockExecuteGhCommand).toHaveBeenCalledTimes(2);

      // Force refresh should make new checks
      await service.checkStatus(true);
      expect(mockExecuteGhCommand).toHaveBeenCalledTimes(4);
    });
  });

  describe('ensureAvailable', () => {
    it('should throw error when GitHub CLI is not installed', async () => {
      mockExecuteGhCommand.mockResolvedValueOnce({
        stdout: '',
        stderr: 'command not found: gh',
        exitCode: 127,
      });

      await expect(service.ensureAvailable()).rejects.toThrow(
        'GitHub CLI is required but not installed',
      );
    });

    it('should throw error when GitHub CLI is not authenticated', async () => {
      mockExecuteGhCommand
        .mockResolvedValueOnce({
          stdout: 'gh version 2.40.1',
          stderr: '',
          exitCode: 0,
        })
        .mockResolvedValueOnce({
          stdout: '',
          stderr: 'You are not logged in',
          exitCode: 1,
        });

      await expect(service.ensureAvailable()).rejects.toThrow(
        'GitHub CLI is not authenticated. Please run "gh auth login"',
      );
    });

    it('should not throw when GitHub CLI is properly set up', async () => {
      mockExecuteGhCommand
        .mockResolvedValueOnce({
          stdout: 'gh version 2.40.1',
          stderr: '',
          exitCode: 0,
        })
        .mockResolvedValueOnce({
          stdout: '',
          stderr: 'github.com\n  ✓ Logged in to github.com as testuser\n',
          exitCode: 0,
        });

      await expect(service.ensureAvailable()).resolves.not.toThrow();
    });
  });

  describe('getInstallationGuidance', () => {
    it('should return installation guidance', () => {
      const guidance = service.getInstallationGuidance();
      expect(guidance).toBeInstanceOf(Array);
      expect(guidance.length).toBeGreaterThan(5);
      expect(guidance[0]).toContain('GitHub CLI Setup Required');
      expect(guidance.some((line) => line.includes('brew install gh'))).toBe(true);
    });
  });

  describe('getAuthenticationGuidance', () => {
    it('should return authentication guidance', () => {
      const guidance = service.getAuthenticationGuidance();
      expect(guidance).toBeInstanceOf(Array);
      expect(guidance.length).toBeGreaterThan(5);
      expect(guidance[0]).toContain('GitHub CLI Authentication Required');
      expect(guidance.some((line) => line.includes('gh auth login'))).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('should clear the cached status', async () => {
      // Mock initial status check
      mockExecuteGhCommand
        .mockResolvedValueOnce({
          stdout: 'gh version 2.40.1',
          stderr: '',
          exitCode: 0,
        })
        .mockResolvedValueOnce({
          stdout: '',
          stderr: 'github.com\n  ✓ Logged in to github.com as testuser\n',
          exitCode: 0,
        })
        // Mock second check after cache clear
        .mockResolvedValueOnce({
          stdout: 'gh version 2.40.1',
          stderr: '',
          exitCode: 0,
        })
        .mockResolvedValueOnce({
          stdout: '',
          stderr: 'github.com\n  ✓ Logged in to github.com as testuser\n',
          exitCode: 0,
        });

      // First call should cache result
      await service.checkStatus();
      expect(mockExecuteGhCommand).toHaveBeenCalledTimes(2);

      // Clear cache
      service.clearCache();

      // Next call should make fresh checks
      await service.checkStatus();
      expect(mockExecuteGhCommand).toHaveBeenCalledTimes(4);
    });
  });
});

describe('gitHubCliService singleton', () => {
  it('should export a singleton instance', () => {
    expect(gitHubCliService).toBeInstanceOf(GitHubCliService);
  });
});
