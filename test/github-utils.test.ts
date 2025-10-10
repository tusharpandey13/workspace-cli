import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  extractGitHubRepoInfo,
  fetchPullRequestInfo,
  getCachedPullRequestInfo,
  isGitHubApiAvailable,
} from '../src/utils/githubUtils.js';

// Don't mock GitHubApiClient - we'll mock fetch instead which is what it uses

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
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    vi.clearAllMocks();
    originalEnv = { ...process.env };
    // Mock fetch globally
    global.fetch = vi.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
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

  describe('isGitHubApiAvailable', () => {
    it('should return true when GITHUB_TOKEN is set', () => {
      process.env.GITHUB_TOKEN = 'test-token';

      const result = isGitHubApiAvailable();
      expect(result).toBe(true);
    });

    it('should return false when GITHUB_TOKEN is not set', () => {
      delete process.env.GITHUB_TOKEN;

      const result = isGitHubApiAvailable();
      expect(result).toBe(false);
    });

    it('should return false when GITHUB_TOKEN is empty', () => {
      process.env.GITHUB_TOKEN = '';

      const result = isGitHubApiAvailable();
      expect(result).toBe(false);
    });
  });

  describe('fetchPullRequestInfo', () => {
    beforeEach(() => {
      process.env.GITHUB_TOKEN = 'test-token';
    });

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

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockPrData,
      });

      const result = await fetchPullRequestInfo(2344, 'auth0', 'nextjs-auth0', false);

      expect(result).toEqual({
        number: 2344,
        branchName: 'feature/auth-fix',
        title: 'Fix authentication middleware',
        state: 'open',
        headSha: 'abc123def456',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/auth0/nextjs-auth0/pulls/2344',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
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

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should throw specific error for 404 Not Found', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not Found' }),
      });

      await expect(fetchPullRequestInfo(999, 'auth0', 'nextjs-auth0', false)).rejects.toThrow(
        'PR #999 not found in auth0/nextjs-auth0. Please verify the PR exists and you have access.',
      );
    });

    it('should throw specific error for 401 Unauthorized', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' }),
      });

      await expect(
        fetchPullRequestInfo(2344, 'private-org', 'private-repo', false),
      ).rejects.toThrow(
        'Access denied to private-org/private-repo. Please ensure GITHUB_TOKEN is set with appropriate permissions.',
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

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockPrDataNoBranch,
      });

      await expect(fetchPullRequestInfo(2344, 'auth0', 'nextjs-auth0', false)).rejects.toThrow(
        'Unable to determine branch name for PR #2344',
      );
    });
  });

  describe('getCachedPullRequestInfo', () => {
    beforeEach(() => {
      process.env.GITHUB_TOKEN = 'test-token';
    });

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

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockPrData,
      });

      const result = await getCachedPullRequestInfo(2344, 'auth0', 'nextjs-auth0', false);

      expect(result.branchName).toBe('feature/auth-fix');
      expect(global.fetch).toHaveBeenCalledTimes(1);
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

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockPrData,
      });

      // First call - should make API request
      const result1 = await getCachedPullRequestInfo(uniquePrId, 'auth0', 'nextjs-auth0', false);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Reset mock to ensure no additional calls
      vi.clearAllMocks();

      // Second call - should use cache
      const result2 = await getCachedPullRequestInfo(uniquePrId, 'auth0', 'nextjs-auth0', false);

      expect(result1).toEqual(result2);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
