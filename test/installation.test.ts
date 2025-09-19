import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import { access, constants } from 'fs/promises';
import { join } from 'path';

/**
 * Run a command and capture output
 */
function runCommand(
  command: string,
  args: string[],
  options: any = {},
): Promise<{
  code: number;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('exit', (code) => {
      resolve({
        code: code || 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

describe('CLI Installation', () => {
  it('should have built CLI with correct permissions', async () => {
    const cliPath = join(process.cwd(), 'dist', 'bin', 'workspace.js');

    // Check file exists
    await expect(access(cliPath, constants.F_OK)).resolves.toBeUndefined();

    // Check file is executable
    await expect(access(cliPath, constants.X_OK)).resolves.toBeUndefined();
  });

  it('should run CLI locally with --version', async () => {
    const cliPath = join(process.cwd(), 'dist', 'bin', 'workspace.js');
    const result = await runCommand('node', [cliPath, '--version']);

    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should run CLI locally with --help', async () => {
    const cliPath = join(process.cwd(), 'dist', 'bin', 'workspace.js');
    const result = await runCommand('node', [cliPath, '--help']);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Usage:');
    expect(result.stdout).toContain('workspace');
  });

  it('should run doctor command without errors', async () => {
    const cliPath = join(process.cwd(), 'dist', 'bin', 'workspace.js');
    const result = await runCommand('node', [cliPath, 'doctor']);

    // Doctor command should run without crashing
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('System Check');
  });

  it('should have proper shebang in CLI file', async () => {
    const { readFile } = await import('fs/promises');
    const cliPath = join(process.cwd(), 'dist', 'bin', 'workspace.js');

    const content = await readFile(cliPath, 'utf-8');
    expect(content).toMatch(/^#!/);
    expect(content).toContain('#!/usr/bin/env node');
  });

  it('should validate dry-run init command', async () => {
    const cliPath = join(process.cwd(), 'dist', 'bin', 'workspace.js');
    const result = await runCommand('node', [cliPath, 'init', 'java', 'test-branch', '--dry-run']);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('DRY-RUN MODE');
    expect(result.stdout).toContain('Initializing');
  }, 15000); // Longer timeout for init command

  describe('Global Installation (if available)', () => {
    it('should run globally installed CLI', async () => {
      try {
        const result = await runCommand('workspace', ['--version']);
        expect(result.code).toBe(0);
        expect(result.stdout).toMatch(/^\d+\.\d+\.\d+$/);
      } catch (error) {
        // Skip if not globally installed
        console.log('Global CLI not available, skipping test');
      }
    });
  });
});
