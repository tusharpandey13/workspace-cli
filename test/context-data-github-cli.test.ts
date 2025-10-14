import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ContextDataFetcher } from '../src/services/contextData.js';

// Mock dependencies
vi.mock('../src/utils/logger.js', () => ({
  logger: {
    verbose: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    step: vi.fn(),
    command: vi.fn(),
  },
}));

// Mock execa for curl commands (non-GitHub URL fetching)
vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: '<html><title>Test</title>Test content</html>' }),
}));

/**
 * Helper function to mock fetch responses
 */
function mockFetchResponse(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? 'Not Found' : status === 401 ? 'Unauthorized' : 'OK',
    headers: new Headers(headers),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response);
}

describe('ContextDataFetcher - GitHub API Integration', () => {
  let contextFetcher: ContextDataFetcher;
  const originalEnv = process.env.GITHUB_TOKEN;
  const originalFetch = global.fetch;

  beforeEach(() => {
    contextFetcher = new ContextDataFetcher();
    vi.clearAllMocks();
    // Set a mock token for tests
    process.env.GITHUB_TOKEN = 'ghp_test_token_1234567890';
  });

  afterEach(() => {
    // Restore original environment
    if (originalEnv) {
      process.env.GITHUB_TOKEN = originalEnv;
    } else {
      delete process.env.GITHUB_TOKEN;
    }
    global.fetch = originalFetch;
  });

  describe('GitHub API Authentication', () => {
    it('should work in unauthenticated mode for public repos', async () => {
      delete process.env.GITHUB_TOKEN;

      // Mock a 404 response which is expected for non-existent issue in unauthenticated mode
      global.fetch = vi
        .fn()
        .mockImplementation(() => mockFetchResponse({ message: 'Not Found' }, 404));

      await expect(
        contextFetcher.fetchGitHubData([1234], 'testorg', 'testrepo', false),
      ).rejects.toThrow('Issue #1234 not found in testorg/testrepo');
    });

    it('should throw error when GitHub API returns 401', async () => {
      global.fetch = vi
        .fn()
        .mockImplementation(() => mockFetchResponse({ message: 'Bad credentials' }, 401));

      await expect(
        contextFetcher.fetchGitHubData([1234], 'testorg', 'testrepo', false),
      ).rejects.toThrow('Access denied to testorg/testrepo');
    });

    it('should successfully fetch GitHub issue data when authenticated', async () => {
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('/issues/1234/comments')) {
          return mockFetchResponse([]);
        }
        return mockFetchResponse({
          number: 1234,
          title: 'Test Issue',
          body: 'Test body',
          state: 'open',
          html_url: 'https://github.com/testorg/testrepo/issues/1234',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          labels: [],
          assignees: [],
          milestone: null,
          user: { login: 'testuser' },
        });
      });

      const result = await contextFetcher.fetchGitHubData([1234], 'testorg', 'testrepo', false);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1234);
      expect(result[0].title).toBe('Test Issue');
    });

    it('should provide specific error message for 404 responses', async () => {
      global.fetch = vi
        .fn()
        .mockImplementation(() => mockFetchResponse({ message: 'Not Found' }, 404));

      await expect(
        contextFetcher.fetchGitHubData([1234], 'testorg', 'testrepo', false),
      ).rejects.toThrow(
        'Issue #1234 not found in testorg/testrepo. Please verify the issue exists and you have access to the repository.',
      );
    });

    it('should provide specific error message for auth errors', async () => {
      global.fetch = vi
        .fn()
        .mockImplementation(() => mockFetchResponse({ message: 'Bad credentials' }, 401));

      await expect(
        contextFetcher.fetchGitHubData([1234], 'testorg', 'testrepo', false),
      ).rejects.toThrow('Access denied to testorg/testrepo. Please check your GITHUB_TOKEN');
    });

    it('should skip API calls in dry run mode', async () => {
      // Set up a spy on fetch
      const fetchSpy = vi.spyOn(global, 'fetch');

      const result = await contextFetcher.fetchGitHubData([1234], 'testorg', 'testrepo', true);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1234);
      expect(result[0].title).toContain('Fix authentication middleware');
      // Should not call fetch in dry run mode
      expect(fetchSpy).not.toHaveBeenCalled();

      fetchSpy.mockRestore();
    });

    it('should handle multiple issues with mixed results', async () => {
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes('/issues/1234')) {
          if (url.includes('/comments')) {
            return mockFetchResponse([]);
          }
          return mockFetchResponse({
            number: 1234,
            title: 'Test Issue 1',
            body: 'Test body 1',
            state: 'open',
            html_url: 'https://github.com/testorg/testrepo/issues/1234',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            labels: [],
            assignees: [],
            milestone: null,
            user: { login: 'testuser' },
          });
        }
        // Second issue fails with 404
        return mockFetchResponse({ message: 'Not Found' }, 404);
      });

      const { logger } = await import('../src/utils/logger.js');

      const result = await contextFetcher.fetchGitHubData(
        [1234, 5678],
        'testorg',
        'testrepo',
        false,
      );

      // Should return only the successful issue
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1234);

      // Should log warning for the failed issue
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Error processing GitHub ID "5678"'),
      );
    });
  });
});
