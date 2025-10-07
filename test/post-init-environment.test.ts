import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { executeShellCommand } from '../src/utils/secureExecution.js';

describe('Post-Init Environment Handling', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'post-init-env-test-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should prioritize nvm npm over shims when NVM_BIN is available', async () => {
    // Skip this test if NVM_BIN is not available
    if (!process.env.NVM_BIN) {
      console.log('Skipping test: NVM_BIN not available');
      return;
    }

    const result = await executeShellCommand('echo "PATH: $PATH" && which npm', {
      cwd: tempDir,
      stdio: 'pipe',
      timeout: 10000,
    });

    expect(result.exitCode).toBe(0);

    // The npm executable should be from the NVM_BIN directory when npm command is used
    expect(result.stdout).toContain(process.env.NVM_BIN!);
  });

  it('should successfully execute npm --version without hanging', async () => {
    const result = await executeShellCommand('npm --version', {
      cwd: tempDir,
      stdio: 'pipe',
      timeout: 10000,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/); // Version format like "10.9.0"
    expect(result.stderr).toBe('');
  });

  it('should use enhanced PATH when executing npm commands', async () => {
    // Skip this test if NVM_BIN is not available
    if (!process.env.NVM_BIN) {
      console.log('Skipping test: NVM_BIN not available');
      return;
    }

    const result = await executeShellCommand('npm --version && echo "npm command succeeded"', {
      cwd: tempDir,
      stdio: 'pipe',
      timeout: 10000,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('npm command succeeded');
    expect(result.stderr).toBe('');
  });
});
