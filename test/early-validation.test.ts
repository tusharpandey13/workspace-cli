import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateGitHubIdsExistence } from '../src/utils/validation.js';

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn(),
}));

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should skip validation when no issue IDs provided', async () => {
    const { execa } = await import('execa');

    await validateGitHubIdsExistence([], 'auth0', 'nextjs-auth0');

    expect(execa).not.toHaveBeenCalled();
  });

  it('should validate single issue ID successfully', async () => {
    const { execa } = await import('execa');
    const mockedExeca = vi.mocked(execa);

    mockedExeca.mockResolvedValue({
      exitCode: 0,
      stdout: '123',
    } as any);

    await validateGitHubIdsExistence([123], 'auth0', 'nextjs-auth0');

    expect(mockedExeca).toHaveBeenCalledWith(
      'gh',
      ['api', 'repos/auth0/nextjs-auth0/issues/123', '--jq', '.number'],
      { stdio: 'pipe' },
    );
  });

  it('should validate multiple issue IDs successfully', async () => {
    const { execa } = await import('execa');
    const mockedExeca = vi.mocked(execa);

    mockedExeca
      .mockResolvedValueOnce({ exitCode: 0, stdout: '123' } as any)
      .mockResolvedValueOnce({ exitCode: 0, stdout: '456' } as any);

    await validateGitHubIdsExistence([123, 456], 'auth0', 'nextjs-auth0');

    expect(mockedExeca).toHaveBeenCalledTimes(2);
  });

  it('should throw error for non-existent issue (404)', async () => {
    const { execa } = await import('execa');
    const mockedExeca = vi.mocked(execa);

    const error = new Error('API error');
    (error as any).stderr = 'Not Found';
    mockedExeca.mockRejectedValue(error);

    await expect(validateGitHubIdsExistence([999], 'auth0', 'nextjs-auth0')).rejects.toThrow(
      '❌ Issue #999 not found in auth0/nextjs-auth0',
    );
  });

  it('should throw error for unauthorized access (401)', async () => {
    const { execa } = await import('execa');
    const mockedExeca = vi.mocked(execa);

    const error = new Error('API error');
    (error as any).stderr = 'Unauthorized';
    mockedExeca.mockRejectedValue(error);

    await expect(validateGitHubIdsExistence([123], 'auth0', 'nextjs-auth0')).rejects.toThrow(
      '❌ Access denied to auth0/nextjs-auth0',
    );
  });

  it('should throw error for missing GitHub CLI', async () => {
    const { execa } = await import('execa');
    const mockedExeca = vi.mocked(execa);

    const error = new Error('API error');
    (error as any).stderr = 'gh: command not found';
    mockedExeca.mockRejectedValue(error);

    await expect(validateGitHubIdsExistence([123], 'auth0', 'nextjs-auth0')).rejects.toThrow(
      '❌ GitHub CLI is not installed',
    );
  });

  it('should throw error for ID mismatch', async () => {
    const { execa } = await import('execa');
    const mockedExeca = vi.mocked(execa);

    mockedExeca.mockResolvedValue({
      exitCode: 0,
      stdout: '456', // Different ID than requested
    } as any);

    await expect(validateGitHubIdsExistence([123], 'auth0', 'nextjs-auth0')).rejects.toThrow(
      'Issue ID mismatch: expected 123, got 456',
    );
  });

  it('should throw error for non-zero exit code', async () => {
    const { execa } = await import('execa');
    const mockedExeca = vi.mocked(execa);

    mockedExeca.mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: 'Failed to fetch',
    } as any);

    await expect(validateGitHubIdsExistence([123], 'auth0', 'nextjs-auth0')).rejects.toThrow(
      'Failed to fetch issue #123',
    );
  });
});
