import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateGitHubIdsExistence } from '../src/utils/validation.js';

// Mock logger
vi.mock('../src/utils/logger.js', () => ({
  logger: {
    verbose: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    step: vi.fn(),
    command: vi.fn(),
  },
}));

describe('validateGitHubIdsExistence', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    vi.clearAllMocks();
    originalEnv = { ...process.env };
    process.env.GITHUB_TOKEN = 'test-token';
    global.fetch = vi.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should skip validation when no issue IDs provided', async () => {
    await validateGitHubIdsExistence([], 'auth0', 'nextjs-auth0');

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should validate single issue ID successfully', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ number: 123, title: 'Test Issue', state: 'open' }),
    });

    await validateGitHubIdsExistence([123], 'auth0', 'nextjs-auth0');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/auth0/nextjs-auth0/issues/123',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    );
  });

  it('should validate multiple issue IDs successfully', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ number: 123, title: 'Test Issue 1', state: 'open' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ number: 456, title: 'Test Issue 2', state: 'open' }),
      });

    await validateGitHubIdsExistence([123, 456], 'auth0', 'nextjs-auth0');

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should throw error for non-existent issue (404)', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Not Found' }),
    });

    await expect(validateGitHubIdsExistence([999], 'auth0', 'nextjs-auth0')).rejects.toThrow(
      '❌ Issue #999 not found in auth0/nextjs-auth0',
    );
  });

  it('should throw error for unauthorized access (401)', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    });

    await expect(validateGitHubIdsExistence([123], 'auth0', 'nextjs-auth0')).rejects.toThrow(
      '❌ Access denied to auth0/nextjs-auth0',
    );
  });

  it('should work in unauthenticated mode but may fail for non-existent issues', async () => {
    delete process.env.GITHUB_TOKEN;

    // In unauthenticated mode, should attempt validation but may fail due to rate limits or missing issues
    // This tests that the client allows unauthenticated attempts rather than throwing auth errors
    await expect(validateGitHubIdsExistence([123], 'auth0', 'nextjs-auth0')).rejects.toThrow(
      /Failed to validate issue #123/,
    );
  });

  it('should throw error for ID mismatch', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ number: 456, title: 'Test Issue', state: 'open' }), // Different ID
    });

    await expect(validateGitHubIdsExistence([123], 'auth0', 'nextjs-auth0')).rejects.toThrow(
      'Issue ID mismatch: expected 123, got 456',
    );
  });

  it('should throw error for network/fetch failure', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    await expect(validateGitHubIdsExistence([123], 'auth0', 'nextjs-auth0')).rejects.toThrow(
      '❌ GitHub API request failed for issue #123',
    );
  });
});
