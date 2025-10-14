import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextDataFetcher } from '../src/services/contextData.js';

// Mock global fetch
global.fetch = vi.fn();

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

describe('ContextDataFetcher - Parallel Processing', () => {
  let contextFetcher: ContextDataFetcher;

  beforeEach(() => {
    contextFetcher = new ContextDataFetcher();
    vi.clearAllMocks();
    delete process.env.GITHUB_TOKEN;
  });

  it('should return mock data for dry-run mode without API calls', async () => {
    const result = await contextFetcher.fetchGitHubData([1234, 5678], 'test', 'repo', true);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1234);
    expect(result[0].title).toContain('Issue #1234');
    expect(result[1].id).toBe(5678);
    expect(result[1].title).toContain('Issue #5678');

    // No API calls should be made in dry-run mode
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should work in unauthenticated mode and return empty array for non-existent issues', async () => {
    delete process.env.GITHUB_TOKEN;

    // In unauthenticated mode, should return empty array if no valid issues found
    const result = await contextFetcher.fetchGitHubData([1234], 'test', 'repo', false);
    expect(result).toEqual([]);
  });

  it('should return empty array when no issue IDs provided', async () => {
    const result = await contextFetcher.fetchGitHubData([], 'test', 'repo', false);
    expect(result).toEqual([]);
  });

  it('should use parallel structure for multiple issues in dry-run', async () => {
    // Test parallel structure with dry-run data
    const startTime = Date.now();
    const result = await contextFetcher.fetchGitHubData([1, 2, 3, 4, 5], 'test', 'repo', true);
    const endTime = Date.now();

    expect(result).toHaveLength(5);
    expect(result.map((r) => r.id)).toEqual([1, 2, 3, 4, 5]);

    // Should complete quickly since it's all mock data
    expect(endTime - startTime).toBeLessThan(100);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should fetch issues in parallel using GitHub API', async () => {
    process.env.GITHUB_TOKEN = 'test-token';
    const mockFetch = vi.mocked(global.fetch);

    const mockIssue = {
      number: 1234,
      title: 'Test Issue',
      body: 'Test body',
      state: 'open',
      html_url: 'https://github.com/test/repo/issues/1234',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      labels: [],
      assignees: [],
    };

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockIssue,
    } as Response);

    const result = await contextFetcher.fetchGitHubData([1234], 'test', 'repo', false);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1234);
    expect(result[0].title).toBe('Test Issue');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/test/repo/issues/1234',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    );
  });

  it('should handle single issue processing correctly', async () => {
    process.env.GITHUB_TOKEN = 'test-token';
    const mockFetch = vi.mocked(global.fetch);

    const mockIssue = {
      number: 999,
      title: 'Single Issue Test',
      body: 'Single issue body',
      state: 'open',
      html_url: 'https://github.com/test/repo/issues/999',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      labels: [{ name: 'bug' }],
      assignees: [{ login: 'developer' }],
    };

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockIssue,
    } as Response);

    const result = await contextFetcher.fetchGitHubData([999], 'test', 'repo', false);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(999);
    expect(result[0].title).toBe('Single Issue Test');
    expect(result[0].labels).toContain('bug');
    expect(result[0].assignees).toContain('developer');
  });
});
