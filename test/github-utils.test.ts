import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  extractGitHubRepoInfo,
  fetchPullRequestInfo,
  getCachedPullRequestInfo,
  isGitHubCliAvailable,
} from '../src/utils/githubUtils.js';
import { executeGhCommand } from '../src/utils/secureExecution.js';

// Mock dependencies
vi.mock('../src/utils/secureExecution.js', () => ({
  executeGhCommand: vi.fn(),
}));

vi.mock('../src/utils/logger.js', () => ({
  logger: {
    verbose: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('GitHub Utils', () => {
  const mockExecuteGhCommand = vi.mocked(executeGhCommand);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractGitHubRepoInfo', () => {
    it('should extract org and repo from HTTPS GitHub URL', () => {
      const result = extractGitHubRepoInfo('https://github.com/auth0/nextjs-auth0.git');

      expect(result).toEqual({
        org: 'auth0',
        repo: 'nextjs-auth0',
        isGitHub: true,
      });
    });

    it('should extract org and repo from SSH GitHub URL', () => {
      const result = extractGitHubRepoInfo('git@github.com:auth0/nextjs-auth0.git');

      expect(result).toEqual({
        org: 'auth0',
        repo: 'nextjs-auth0',
        isGitHub: true,
      });
    });

    it('should handle GitHub URLs without .git suffix', () => {
      const result = extractGitHubRepoInfo('https://github.com/auth0/nextjs-auth0');

      expect(result).toEqual({
        org: 'auth0',
        repo: 'nextjs-auth0',
        isGitHub: true,
      });
    });

    it('should handle non-GitHub repositories', () => {
      const result = extractGitHubRepoInfo('https://gitlab.com/myorg/myrepo.git');

      expect(result).toEqual({
        org: 'unknown',
        repo: 'myrepo',
        isGitHub: false,
      });
    });

    it('should handle malformed URLs gracefully', () => {
      const result = extractGitHubRepoInfo('not-a-url');

      expect(result).toEqual({
        org: 'unknown',
        repo: 'not-a-url',
        isGitHub: false,
      });
    });
  });

  describe('isGitHubCliAvailable', () => {
    it('should return true when GitHub CLI is available', async () => {
      mockExecuteGhCommand.mockResolvedValue({
        exitCode: 0,
        stdout: 'gh version 2.40.1',
        stderr: '',
      });

      const result = await isGitHubCliAvailable();
      expect(result).toBe(true);
      expect(mockExecuteGhCommand).toHaveBeenCalledWith(['--version'], {});
    });

    it('should return false when GitHub CLI is not available', async () => {
      mockExecuteGhCommand.mockRejectedValue(new Error('gh not found'));

      const result = await isGitHubCliAvailable();
      expect(result).toBe(false);
    });

    it('should return false when GitHub CLI returns error', async () => {
      mockExecuteGhCommand.mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'command not found',
      });

      const result = await isGitHubCliAvailable();
      expect(result).toBe(false);
    });
  });

  describe('fetchPullRequestInfo', () => {
    it('should fetch PR information successfully', async () => {
      const mockPrData = {
        number: 2344,
        title: 'Fix authentication middleware',
        state: 'open',
        head: {
          ref: 'feature/auth-fix',
          sha: 'abc123def456',
        },
      };

      mockExecuteGhCommand.mockResolvedValue({
        exitCode: 0,
        stdout: JSON.stringify(mockPrData),
        stderr: '',
      });

      const result = await fetchPullRequestInfo(2344, 'auth0', 'nextjs-auth0', false);

      expect(result).toEqual({
        number: 2344,
        branchName: 'feature/auth-fix',
        title: 'Fix authentication middleware',
        state: 'open',
        headSha: 'abc123def456',
      });

      expect(mockExecuteGhCommand).toHaveBeenCalledWith(
        ['api', 'repos/auth0/nextjs-auth0/pulls/2344'],
        {},
      );
    });

    it('should return mock data in dry-run mode', async () => {
      const result = await fetchPullRequestInfo(2344, 'auth0', 'nextjs-auth0', true);

      expect(result).toEqual({
        number: 2344,
        branchName: 'pr-2344',
        title: 'Mock PR #2344 for dry run',
        state: 'open',
        headSha: '1234567890abcdef',
      });

      expect(mockExecuteGhCommand).not.toHaveBeenCalled();
    });

    it('should throw specific error for 404 Not Found', async () => {
      mockExecuteGhCommand.mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'Not Found',
      });

      await expect(fetchPullRequestInfo(999, 'auth0', 'nextjs-auth0', false)).rejects.toThrow(
        'PR #999 not found in auth0/nextjs-auth0. Please verify the PR exists and you have access.',
      );
    });

    it('should throw specific error for 401 Unauthorized', async () => {
      mockExecuteGhCommand.mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'Unauthorized',
      });

      await expect(
        fetchPullRequestInfo(2344, 'private-org', 'private-repo', false),
      ).rejects.toThrow(
        'Access denied to private-org/private-repo. Please check your GitHub CLI authentication.',
      );
    });

    it('should handle missing branch reference', async () => {
      const mockPrDataNoBranch = {
        number: 2344,
        title: 'PR without branch ref',
        state: 'open',
        head: {
          // Missing ref property
          sha: 'abc123def456',
        },
      };

      mockExecuteGhCommand.mockResolvedValue({
        exitCode: 0,
        stdout: JSON.stringify(mockPrDataNoBranch),
        stderr: '',
      });

      await expect(fetchPullRequestInfo(2344, 'auth0', 'nextjs-auth0', false)).rejects.toThrow(
        'Unable to determine branch name for PR #2344',
      );
    });
  });

  describe('getCachedPullRequestInfo', () => {
    it('should fetch and cache PR information on first call', async () => {
      const mockPrData = {
        number: 2344,
        title: 'Fix authentication middleware',
        state: 'open',
        head: {
          ref: 'feature/auth-fix',
          sha: 'abc123def456',
        },
      };

      mockExecuteGhCommand.mockResolvedValue({
        exitCode: 0,
        stdout: JSON.stringify(mockPrData),
        stderr: '',
      });

      const result = await getCachedPullRequestInfo(2344, 'auth0', 'nextjs-auth0', false);

      expect(result.branchName).toBe('feature/auth-fix');
      expect(mockExecuteGhCommand).toHaveBeenCalledTimes(1);
    });

    it('should return cached data on subsequent calls', async () => {
      // Clear any existing cache by using a unique PR number
      const uniquePrId = Math.floor(Math.random() * 10000) + 1000;

      const mockPrData = {
        number: uniquePrId,
        title: 'Cached PR test',
        state: 'open',
        head: {
          ref: 'feature/cached-test',
          sha: 'cached123',
        },
      };

      mockExecuteGhCommand.mockResolvedValue({
        exitCode: 0,
        stdout: JSON.stringify(mockPrData),
        stderr: '',
      });

      // First call - should make API request
      const result1 = await getCachedPullRequestInfo(uniquePrId, 'auth0', 'nextjs-auth0', false);
      expect(mockExecuteGhCommand).toHaveBeenCalledTimes(1);

      // Reset mock to ensure no additional calls
      mockExecuteGhCommand.mockClear();

      // Second call - should use cache
      const result2 = await getCachedPullRequestInfo(uniquePrId, 'auth0', 'nextjs-auth0', false);

      expect(result1).toEqual(result2);
      expect(mockExecuteGhCommand).not.toHaveBeenCalled();
    });
  });
});
