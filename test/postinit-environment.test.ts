import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { executeShellCommand } from '../src/utils/secureExecution.js';

describe('Post-init Environment Inheritance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should inherit PATH environment variable for shell commands', async () => {
    // Test that PATH is properly inherited when executing shell commands
    const result = await executeShellCommand('echo $PATH');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('/bin'); // Basic sanity check
    expect(result.stderr).toBe('');
  });

  it('should have node executable available in PATH', async () => {
    // Test that node is available when running shell commands
    const result = await executeShellCommand('which node');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('node');
    expect(result.stderr).toBe('');
  });

  it('should detect missing executables and provide helpful error messages', async () => {
    // Test the enhanced error handling for missing executables
    const result = await executeShellCommand('pnpm --version');

    // This should either succeed (if pnpm is available) or provide a helpful error
    if (result.exitCode !== 0) {
      // If pnpm fails, the error should be helpful
      expect(result.stderr).toBeTruthy();
    } else {
      // If pnpm succeeds, it should return version info
      expect(result.stdout).toMatch(/^\d+\.\d+\.\d+/);
    }
  });

  it('should provide enhanced error context for environment issues', async () => {
    // Test that environment inheritance issues are properly detected
    const result = await executeShellCommand('nonexistent-command-12345');

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toBeTruthy();
  });
});
