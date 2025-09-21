import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execa } from 'execa';
import {
  executeSecureCommand,
  executeGitCommand,
  executeGhCommand,
} from '../src/utils/secureExecution.js';

// Mock execa
vi.mock('execa');

// Mock logger
vi.mock('../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    verbose: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    step: vi.fn(),
    command: vi.fn(),
  },
}));

// Mock validation
vi.mock('../src/utils/validation.js', () => ({
  validateCommand: vi.fn((command: string) => {
    if (!['git', 'gh', 'sh', 'node', 'npm', 'pnpm', 'yarn'].includes(command)) {
      throw new Error(`Unauthorized command: ${command}`);
    }
  }),
  sanitizeShellArg: vi.fn((arg: string) => {
    if (arg.includes(';') || arg.includes('&')) {
      throw new Error('Shell argument becomes empty after sanitization');
    }
    return arg;
  }),
}));

describe('Secure Command Execution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executeSecureCommand', () => {
    it('should execute valid commands successfully', async () => {
      const mockResult = { stdout: 'success', stderr: '', exitCode: 0 };
      vi.mocked(execa).mockResolvedValue(mockResult as any);

      const result = await executeSecureCommand('git', ['status']);

      expect(result).toEqual({
        stdout: 'success',
        stderr: '',
        exitCode: 0,
      });
      expect(execa).toHaveBeenCalledWith(
        'git',
        ['status'],
        expect.objectContaining({
          shell: false,
          timeout: 30000,
        }),
      );
    });

    it('should handle command execution errors', async () => {
      const mockError = {
        stdout: '',
        stderr: 'command failed',
        exitCode: 1,
        message: 'Git command failed',
      };
      vi.mocked(execa).mockRejectedValue(mockError);

      const result = await executeSecureCommand('git', ['invalid-command']);

      expect(result).toEqual({
        stdout: '',
        stderr: 'command failed',
        exitCode: 1,
      });
    });

    it('should validate commands using allow-list', async () => {
      await expect(executeSecureCommand('rm', ['-rf', '/'])).rejects.toThrow(
        'Unauthorized command',
      );
    });

    it('should sanitize arguments', async () => {
      await expect(executeSecureCommand('git', ['branch;rm -rf /'])).rejects.toThrow(
        'Shell argument becomes empty after sanitization',
      );
    });

    it('should set security options', async () => {
      const mockResult = { stdout: 'success', stderr: '', exitCode: 0 };
      vi.mocked(execa).mockResolvedValue(mockResult as any);

      await executeSecureCommand('git', ['status'], { cwd: '/test' });

      expect(execa).toHaveBeenCalledWith(
        'git',
        ['status'],
        expect.objectContaining({
          shell: false,
          timeout: 30000,
          cwd: '/test',
        }),
      );
    });
  });

  describe('executeGitCommand', () => {
    it('should execute git commands', async () => {
      const mockResult = { stdout: 'git output', stderr: '', exitCode: 0 };
      vi.mocked(execa).mockResolvedValue(mockResult as any);

      const result = await executeGitCommand(['status'], { cwd: '/repo' });

      expect(result.stdout).toBe('git output');
      expect(execa).toHaveBeenCalledWith(
        'git',
        ['status'],
        expect.objectContaining({
          cwd: '/repo',
          shell: false,
        }),
      );
    });
  });

  describe('executeGhCommand', () => {
    it('should execute GitHub CLI commands', async () => {
      const mockResult = { stdout: 'gh output', stderr: '', exitCode: 0 };
      vi.mocked(execa).mockResolvedValue(mockResult as any);

      const result = await executeGhCommand(['--version']);

      expect(result.stdout).toBe('gh output');
      expect(execa).toHaveBeenCalledWith(
        'gh',
        ['--version'],
        expect.objectContaining({
          shell: false,
        }),
      );
    });
  });
});
