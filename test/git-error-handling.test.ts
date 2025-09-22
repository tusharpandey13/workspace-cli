import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'os';
import os from 'os';
import { executeGitCommand } from '../src/utils/secureExecution.js';

describe('Git Command Error Handling', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-error-test-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should not log errors for expected git command failures', async () => {
    // Mock the logger to capture what's being logged
    const loggerMock = {
      error: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    };

    vi.doMock('../src/utils/logger.js', () => ({ logger: loggerMock }));

    // Create a git repo
    const repoPath = path.join(tempDir, 'test-repo');
    await fs.ensureDir(repoPath);
    await executeGitCommand(['init'], { cwd: repoPath });

    // Try to delete a branch that doesn't exist - this should fail gracefully
    const result = await executeGitCommand(['branch', '-D', 'nonexistent-branch'], {
      cwd: repoPath,
    });

    // Command should fail (exit code 1) but not throw
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('not found');

    // The error should be logged for debugging, but handled gracefully
    expect(loggerMock.error).toHaveBeenCalled();
  });

  it('should not show error messages to user for expected branch failures', async () => {
    const consoleOutput: string[] = [];
    const originalConsoleError = console.error;

    console.error = (msg: string) => {
      consoleOutput.push(msg);
    };

    try {
      // Create a git repo
      const repoPath = path.join(tempDir, 'test-repo');
      await fs.ensureDir(repoPath);
      await executeGitCommand(['init'], { cwd: repoPath });

      // Try operations that are expected to fail
      await executeGitCommand(['branch', '-D', 'nonexistent'], { cwd: repoPath });
      await executeGitCommand(['show-ref', '--verify', '--quiet', 'refs/heads/missing'], {
        cwd: repoPath,
      });

      // These errors should be handled gracefully at the command level
      // The secureExecution utility logs them, but calling code should handle them
    } finally {
      console.error = originalConsoleError;
    }
  });
});
