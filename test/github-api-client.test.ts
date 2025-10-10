import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  GitHubApiClient,
  GitHubAuthError,
  GitHubRateLimitError,
  GitHubNotFoundError,
  GitHubNetworkError,
  type GitHubIssue,
  type GitHubPullRequest,
  type GitHubComment,
} from '../src/services/githubApiClient.js';

describe('GitHubApiClient', () => {
  const originalEnv = process.env;
  const mockToken = 'ghp_test_token_1234567890';

  beforeEach(() => {
    // Reset environment
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.GITHUB_TOKEN = mockToken;

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should use token from options', () => {
      const client = new GitHubApiClient({ token: 'custom_token' });
      expect(client).toBeInstanceOf(GitHubApiClient);
    });

    it('should use token from GITHUB_TOKEN environment variable', () => {
      process.env.GITHUB_TOKEN = mockToken;
      const client = new GitHubApiClient();
      expect(client).toBeInstanceOf(GitHubApiClient);
    });

    it('should throw GitHubAuthError when no token is available', () => {
      delete process.env.GITHUB_TOKEN;
      expect(() => new GitHubApiClient()).toThrow(GitHubAuthError);
      expect(() => new GitHubApiClient()).toThrow('GITHUB_TOKEN environment variable is required');
    });

    it('should use default baseUrl', () => {
      const client = new GitHubApiClient({ token: mockToken });
      expect(client).toBeDefined();
    });

    it('should allow custom baseUrl', () => {
      const client = new GitHubApiClient({
        token: mockToken,
        baseUrl: 'https://api.github.enterprise.com',
      });
      expect(client).toBeDefined();
    });
  });

  describe('getIssue', () => {
    it('should fetch issue successfully', async () => {
      const mockIssue: GitHubIssue = {
        number: 123,
        title: 'Test Issue',
        body: 'Issue description',
        state: 'open',
        user: { login: 'testuser' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        html_url: 'https://github.com/owner/repo/issues/123',
        labels: [{ name: 'bug', color: 'red' }],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockIssue,
        headers: new Headers(),
      });

      const client = new GitHubApiClient({ token: mockToken });
      const issue = await client.getIssue('owner', 'repo', 123);

      expect(issue).toEqual(mockIssue);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/issues/123',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          }),
        }),
      );
    });

    it('should throw GitHubNotFoundError for 404 response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => '{"message":"Not Found"}',
        headers: new Headers(),
      });

      const client = new GitHubApiClient({ token: mockToken });
      await expect(client.getIssue('owner', 'repo', 999)).rejects.toThrow(GitHubNotFoundError);
    });
  });

  describe('getPullRequest', () => {
    it('should fetch pull request successfully', async () => {
      const mockPR: GitHubPullRequest = {
        number: 456,
        title: 'Test PR',
        body: 'PR description',
        state: 'open',
        user: { login: 'testuser' },
        head: { ref: 'feature-branch', sha: 'abc123' },
        base: { ref: 'main' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        html_url: 'https://github.com/owner/repo/pull/456',
        merged: false,
        mergeable: true,
        labels: [],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockPR,
        headers: new Headers(),
      });

      const client = new GitHubApiClient({ token: mockToken });
      const pr = await client.getPullRequest('owner', 'repo', 456);

      expect(pr).toEqual(mockPR);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/pulls/456',
        expect.any(Object),
      );
    });
  });

  describe('getComments', () => {
    it('should fetch comments successfully', async () => {
      const mockComments: GitHubComment[] = [
        {
          id: 1,
          body: 'First comment',
          user: { login: 'user1' },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          html_url: 'https://github.com/owner/repo/issues/123#issuecomment-1',
        },
        {
          id: 2,
          body: 'Second comment',
          user: { login: 'user2' },
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          html_url: 'https://github.com/owner/repo/issues/123#issuecomment-2',
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockComments,
        headers: new Headers(),
      });

      const client = new GitHubApiClient({ token: mockToken });
      const comments = await client.getComments('owner', 'repo', 123);

      expect(comments).toEqual(mockComments);
      expect(comments).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('should throw GitHubAuthError for 401 response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => '{"message":"Bad credentials"}',
        headers: new Headers(),
      });

      const client = new GitHubApiClient({ token: mockToken });
      await expect(client.getIssue('owner', 'repo', 123)).rejects.toThrow(GitHubAuthError);
    });

    it('should throw GitHubAuthError for 403 response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => '{"message":"Forbidden"}',
        headers: new Headers(),
      });

      const client = new GitHubApiClient({ token: mockToken });
      await expect(client.getIssue('owner', 'repo', 123)).rejects.toThrow(GitHubAuthError);
    });

    it('should throw GitHubRateLimitError for 429 response', async () => {
      const headers = new Headers();
      headers.set('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 3600));

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => '{"message":"API rate limit exceeded"}',
        headers,
      });

      const client = new GitHubApiClient({ token: mockToken });
      await expect(client.getIssue('owner', 'repo', 123)).rejects.toThrow(GitHubRateLimitError);
    });

    it('should retry on network errors', async () => {
      // First two calls fail, third succeeds
      global.fetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ number: 123, title: 'Test' }),
          headers: new Headers(),
        });

      const client = new GitHubApiClient({ token: mockToken, retryDelay: 10 });
      const issue = await client.getIssue('owner', 'repo', 123);

      expect(issue).toBeDefined();
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should throw GitHubNetworkError after max retries', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const client = new GitHubApiClient({ token: mockToken, maxRetries: 2, retryDelay: 10 });
      await expect(client.getIssue('owner', 'repo', 123)).rejects.toThrow(GitHubNetworkError);

      // Should attempt: initial + 2 retries = 3 total
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('pullRequestExists', () => {
    it('should return true when PR exists', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ number: 123 }),
        headers: new Headers(),
      });

      const client = new GitHubApiClient({ token: mockToken });
      const exists = await client.pullRequestExists('owner', 'repo', 123);

      expect(exists).toBe(true);
    });

    it('should return false when PR does not exist', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => '{"message":"Not Found"}',
        headers: new Headers(),
      });

      const client = new GitHubApiClient({ token: mockToken });
      const exists = await client.pullRequestExists('owner', 'repo', 999);

      expect(exists).toBe(false);
    });

    it('should throw error for non-404 errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => '{"message":"Server error"}',
        headers: new Headers(),
      });

      const client = new GitHubApiClient({ token: mockToken });
      await expect(client.pullRequestExists('owner', 'repo', 123)).rejects.toThrow();
    });
  });

  describe('issueExists', () => {
    it('should return true when issue exists', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ number: 456 }),
        headers: new Headers(),
      });

      const client = new GitHubApiClient({ token: mockToken });
      const exists = await client.issueExists('owner', 'repo', 456);

      expect(exists).toBe(true);
    });

    it('should return false when issue does not exist', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => '{"message":"Not Found"}',
        headers: new Headers(),
      });

      const client = new GitHubApiClient({ token: mockToken });
      const exists = await client.issueExists('owner', 'repo', 999);

      expect(exists).toBe(false);
    });
  });

  describe('parseGitHubUrl', () => {
    it('should parse HTTPS URL', () => {
      const result = GitHubApiClient.parseGitHubUrl('https://github.com/owner/repo');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should parse HTTPS URL with .git', () => {
      const result = GitHubApiClient.parseGitHubUrl('https://github.com/owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should parse SSH URL', () => {
      const result = GitHubApiClient.parseGitHubUrl('git@github.com:owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should return null for invalid URL', () => {
      const result = GitHubApiClient.parseGitHubUrl('not-a-github-url');
      expect(result).toBeNull();
    });

    it('should return null for non-GitHub URL', () => {
      const result = GitHubApiClient.parseGitHubUrl('https://gitlab.com/owner/repo');
      expect(result).toBeNull();
    });
  });

  describe('isTokenAvailable', () => {
    it('should return true when token is set', () => {
      process.env.GITHUB_TOKEN = mockToken;
      expect(GitHubApiClient.isTokenAvailable()).toBe(true);
    });

    it('should return false when token is not set', () => {
      delete process.env.GITHUB_TOKEN;
      expect(GitHubApiClient.isTokenAvailable()).toBe(false);
    });
  });

  describe('getMissingTokenMessage', () => {
    it('should return helpful message', () => {
      const message = GitHubApiClient.getMissingTokenMessage();
      expect(message).toContain('GITHUB_TOKEN');
      expect(message).toContain('https://github.com/settings/tokens');
      expect(message).toContain('export GITHUB_TOKEN=');
    });
  });
});
