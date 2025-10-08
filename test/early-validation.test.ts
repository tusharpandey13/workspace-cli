import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateGitHubIdsExistence } from '../src/utils/validation.js';

// Mock executeGhCommand instead of execa directly
vi.mock('../src/utils/secureExecution.js', () => ({
  executeGhCommand: vi.fn(),
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
    const { executeGhCommand } = await import('../src/utils/secureExecution.js');

    await validateGitHubIdsExistence([], 'auth0', 'nextjs-auth0');

    expect(executeGhCommand).not.toHaveBeenCalled();
  });

  it('should validate single issue ID successfully', async () => {
    const { executeGhCommand } = await import('../src/utils/secureExecution.js');
    const mockedExecuteGhCommand = vi.mocked(executeGhCommand);

    mockedExecuteGhCommand.mockResolvedValue({
      exitCode: 0,
      stdout: '123',
      stderr: '',
    });

    await validateGitHubIdsExistence([123], 'auth0', 'nextjs-auth0');

    expect(mockedExecuteGhCommand).toHaveBeenCalledWith(
      ['api', 'repos/auth0/nextjs-auth0/issues/123', '--jq', '.number'],
      { timeout: 10000 },
    );
  });

  it('should validate multiple issue IDs successfully', async () => {
    const { executeGhCommand } = await import('../src/utils/secureExecution.js');
    const mockedExecuteGhCommand = vi.mocked(executeGhCommand);

    mockedExecuteGhCommand
      .mockResolvedValueOnce({ exitCode: 0, stdout: '123', stderr: '' })
      .mockResolvedValueOnce({ exitCode: 0, stdout: '456', stderr: '' });

    await validateGitHubIdsExistence([123, 456], 'auth0', 'nextjs-auth0');

    expect(mockedExecuteGhCommand).toHaveBeenCalledTimes(2);
  });

  it('should throw error for non-existent issue (404)', async () => {
    const { executeGhCommand } = await import('../src/utils/secureExecution.js');
    const mockedExecuteGhCommand = vi.mocked(executeGhCommand);

    mockedExecuteGhCommand.mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: 'Not Found',
    });

    await expect(validateGitHubIdsExistence([999], 'auth0', 'nextjs-auth0')).rejects.toThrow(
      '❌ Issue #999 not found in auth0/nextjs-auth0',
    );
  });

  it('should throw error for unauthorized access (401)', async () => {
    const { executeGhCommand } = await import('../src/utils/secureExecution.js');
    const mockedExecuteGhCommand = vi.mocked(executeGhCommand);

    mockedExecuteGhCommand.mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: 'Unauthorized',
    });

    await expect(validateGitHubIdsExistence([123], 'auth0', 'nextjs-auth0')).rejects.toThrow(
      '❌ Access denied to auth0/nextjs-auth0',
    );
  });

  it('should throw error for missing GitHub CLI', async () => {
    const { executeGhCommand } = await import('../src/utils/secureExecution.js');
    const mockedExecuteGhCommand = vi.mocked(executeGhCommand);

    mockedExecuteGhCommand.mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: 'gh: command not found',
    });

    await expect(validateGitHubIdsExistence([123], 'auth0', 'nextjs-auth0')).rejects.toThrow(
      '❌ GitHub CLI is not installed',
    );
  });

  it('should throw error for ID mismatch', async () => {
    const { executeGhCommand } = await import('../src/utils/secureExecution.js');
    const mockedExecuteGhCommand = vi.mocked(executeGhCommand);

    mockedExecuteGhCommand.mockResolvedValue({
      exitCode: 0,
      stdout: '456', // Different ID than requested
      stderr: '',
    });

    await expect(validateGitHubIdsExistence([123], 'auth0', 'nextjs-auth0')).rejects.toThrow(
      'Issue ID mismatch: expected 123, got 456',
    );
  });

  it('should throw error for non-zero exit code', async () => {
    const { executeGhCommand } = await import('../src/utils/secureExecution.js');
    const mockedExecuteGhCommand = vi.mocked(executeGhCommand);

    mockedExecuteGhCommand.mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: 'Failed to fetch',
    });

    await expect(validateGitHubIdsExistence([123], 'auth0', 'nextjs-auth0')).rejects.toThrow(
      '❌ Failed to validate issue #123: Failed to fetch',
    );
  });
});
