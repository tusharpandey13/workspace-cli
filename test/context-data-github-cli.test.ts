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

describe('ContextDataFetcher - GitHub CLI Integration', () => {
  let contextFetcher: ContextDataFetcher;
  const mockCheckStatus = vi.mocked(gitHubCliService.checkStatus);

  beforeEach(() => {
    contextFetcher = new ContextDataFetcher();
    vi.clearAllMocks();
  });

  describe('GitHub CLI Availability Checking', () => {
    it('should throw error when GitHub CLI is not installed', async () => {
      mockCheckStatus.mockResolvedValue({
        isInstalled: false,
        isAuthenticated: false,
        error: 'GitHub CLI is not installed',
      });

      await expect(
        contextFetcher.fetchGitHubData([1234], 'testorg', 'testrepo', false),
      ).rejects.toThrow('GitHub CLI is not installed');

      expect(mockCheckStatus).toHaveBeenCalledTimes(1);
    });

    it('should throw error when GitHub CLI is not authenticated', async () => {
      mockCheckStatus.mockResolvedValue({
        isInstalled: true,
        isAuthenticated: false,
        error: 'GitHub CLI is not authenticated',
      });

      await expect(
        contextFetcher.fetchGitHubData([1234], 'testorg', 'testrepo', false),
      ).rejects.toThrow('GitHub CLI is not authenticated');

      expect(mockCheckStatus).toHaveBeenCalledTimes(1);
    });

    it('should proceed when GitHub CLI is properly configured', async () => {
      mockCheckStatus.mockResolvedValue({
        isInstalled: true,
        isAuthenticated: true,
        hostname: 'github.com',
        account: 'testuser',
      });

      // Mock execa for successful API call
      const { execa } = await import('execa');
      vi.mocked(execa).mockResolvedValue({
        stdout: JSON.stringify({
          number: 1234,
          title: 'Test Issue',
          body: 'Test body',
          state: 'open',
          html_url: 'https://github.com/testorg/testrepo/issues/1234',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          labels: [],
          assignees: [],
        }),
        stderr: '',
        exitCode: 0,
      } as any);

      const result = await contextFetcher.fetchGitHubData([1234], 'testorg', 'testrepo', false);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1234);
      expect(result[0].title).toBe('Test Issue');
      expect(mockCheckStatus).toHaveBeenCalledTimes(1);
    });

    it('should provide specific error message for 404 responses', async () => {
      mockCheckStatus.mockResolvedValue({
        isInstalled: true,
        isAuthenticated: true,
        hostname: 'github.com',
        account: 'testuser',
      });

      // Mock execa for 404 error
      const { execa } = await import('execa');
      const error = new Error('Command failed') as any;
      error.stderr = 'Not Found (HTTP 404)';
      vi.mocked(execa).mockRejectedValue(error);

      await expect(
        contextFetcher.fetchGitHubData([1234], 'testorg', 'testrepo', false),
      ).rejects.toThrow(
        'Issue #1234 not found in testorg/testrepo. Please verify the issue exists and you have access to the repository.',
      );

      expect(mockCheckStatus).toHaveBeenCalledTimes(1);
    });

    it('should provide specific error message for 401 responses', async () => {
      mockCheckStatus.mockResolvedValue({
        isInstalled: true,
        isAuthenticated: true,
        hostname: 'github.com',
        account: 'testuser',
      });

      // Mock execa for 401 error
      const { execa } = await import('execa');
      const error = new Error('Command failed') as any;
      error.stderr = 'Unauthorized (HTTP 401)';
      vi.mocked(execa).mockRejectedValue(error);

      await expect(
        contextFetcher.fetchGitHubData([1234], 'testorg', 'testrepo', false),
      ).rejects.toThrow(
        'Access denied to testorg/testrepo. Please check your GitHub CLI authentication and repository permissions.',
      );

      expect(mockCheckStatus).toHaveBeenCalledTimes(1);
    });

    it('should skip GitHub CLI check in dry run mode', async () => {
      const result = await contextFetcher.fetchGitHubData([1234], 'testorg', 'testrepo', true);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1234);
      expect(result[0].title).toContain('Fix authentication middleware');
      expect(mockCheckStatus).not.toHaveBeenCalled(); // Should not check in dry run
    });

    it('should handle multiple issues with mixed results', async () => {
      mockCheckStatus.mockResolvedValue({
        isInstalled: true,
        isAuthenticated: true,
        hostname: 'github.com',
        account: 'testuser',
      });

      const { execa } = await import('execa');
      vi.mocked(execa)
        // First issue succeeds
        .mockResolvedValueOnce({
          stdout: JSON.stringify({
            number: 1234,
            title: 'Test Issue 1',
            body: 'Test body 1',
            state: 'open',
            html_url: 'https://github.com/testorg/testrepo/issues/1234',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            labels: [],
            assignees: [],
          }),
          stderr: '',
          exitCode: 0,
        } as any)
        // Second issue fails
        .mockRejectedValueOnce(
          Object.assign(new Error('Not Found'), { stderr: 'Not Found (HTTP 404)' }),
        );

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
