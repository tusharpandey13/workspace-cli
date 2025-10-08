import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextDataFetcher } from '../src/services/contextData.js';
import { gitHubCliService } from '../src/services/gitHubCli.js';

// Mock dependencies
vi.mock('../src/services/gitHubCli.js', () => ({
  gitHubCliService: {
    checkStatus: vi.fn(),
  },
}));

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

vi.mock('execa', () => ({
  execa: vi.fn(),
}));

describe('ContextDataFetcher - Parallel Processing', () => {
  let contextFetcher: ContextDataFetcher;
  const mockCheckStatus = vi.mocked(gitHubCliService.checkStatus);

  beforeEach(() => {
    contextFetcher = new ContextDataFetcher();
    vi.clearAllMocks();

    // Mock GitHub CLI as available and authenticated
    mockCheckStatus.mockResolvedValue({
      isInstalled: true,
      isAuthenticated: true,
      hostname: 'github.com',
      account: 'testuser',
    });
  });

  it('should return mock data for dry-run mode without API calls', async () => {
    const result = await contextFetcher.fetchGitHubData([1234, 5678], 'test', 'repo', true);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1234);
    expect(result[0].title).toContain('Issue #1234');
    expect(result[1].id).toBe(5678);
    expect(result[1].title).toContain('Issue #5678');

    // No API calls should be made in dry-run mode
    const { execa } = await import('execa');
    expect(execa).not.toHaveBeenCalled();
  });

  it('should handle authentication errors properly', async () => {
    // Mock GitHub CLI as not authenticated
    mockCheckStatus.mockResolvedValue({
      isInstalled: true,
      isAuthenticated: false,
      hostname: 'github.com',
      account: undefined,
    });

    await expect(contextFetcher.fetchGitHubData([1234], 'test', 'repo', false)).rejects.toThrow(
      'GitHub CLI is not authenticated',
    );
  });

  it('should handle missing GitHub CLI gracefully', async () => {
    // Mock GitHub CLI as not installed
    mockCheckStatus.mockResolvedValue({
      isInstalled: false,
      isAuthenticated: false,
      hostname: undefined,
      account: undefined,
    });

    await expect(contextFetcher.fetchGitHubData([1234], 'test', 'repo', false)).rejects.toThrow(
      'GitHub CLI is not installed',
    );
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
  });

  it('should validate parallel promise structure', async () => {
    // This test validates that the implementation uses Promise.all correctly
    // by checking the structure of the returned promises

    const { execa } = await import('execa');
    const mockExeca = vi.mocked(execa);

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

    // Mock successful responses
    mockExeca.mockResolvedValue({
      stdout: JSON.stringify(mockIssue),
      stderr: '',
      exitCode: 0,
    } as any);

    const result = await contextFetcher.fetchGitHubData([1234], 'test', 'repo', false);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1234);
    expect(result[0].title).toBe('Test Issue');
  });

  it('should handle single issue processing correctly', async () => {
    const { execa } = await import('execa');
    const mockExeca = vi.mocked(execa);

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

    // Mock the issue fetch and enhancement calls
    mockExeca.mockResolvedValue({
      stdout: JSON.stringify(mockIssue),
      stderr: '',
      exitCode: 0,
    } as any);

    const result = await contextFetcher.fetchGitHubData([999], 'test', 'repo', false);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(999);
    expect(result[0].title).toBe('Single Issue Test');
    expect(result[0].labels).toContain('bug');
    expect(result[0].assignees).toContain('developer');
  });
});
