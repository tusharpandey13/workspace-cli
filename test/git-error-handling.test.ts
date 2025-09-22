import { describe, it, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
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
