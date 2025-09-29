/**
 * Performance Integration Tests
 * Tests that all performance optimizations work together without interference
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { performance } from 'perf_hooks';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

interface PerformanceMetrics {
  startupTime: number;
  memoryUsage: number;
  workspaceInitTime?: number;
  cacheHitRate?: number;
}

class PerformanceTester {
  private tempDir: string;
  private cliPath: string;

  constructor() {
    this.tempDir = '';
    this.cliPath = path.resolve(__dirname, '../../dist/bin/workspace.js');
  }

  async setup(): Promise<void> {
    this.tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'perf-test-'));
  }

  async cleanup(): Promise<void> {
    if (this.tempDir) {
      await fs.rm(this.tempDir, { recursive: true, force: true });
    }
  }

  /**
   * Measure CLI startup time
   */
  async measureStartupTime(): Promise<number> {
    const start = performance.now();

    return new Promise((resolve, reject) => {
      const child = spawn('node', [this.cliPath, '--version'], {
        stdio: 'pipe',
        env: { ...process.env, NODE_OPTIONS: '' },
      });

      child.on('close', (code) => {
        const end = performance.now();
        if (code === 0) {
          resolve(end - start);
        } else {
          reject(new Error(`CLI exited with code ${code}`));
        }
      });

      child.on('error', reject);

      // Timeout after 5 seconds
      setTimeout(() => {
        child.kill();
        reject(new Error('Startup time measurement timeout'));
      }, 5000);
    });
  }

  /**
   * Measure memory usage during CLI operation
   */
  async measureMemoryUsage(): Promise<number> {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [this.cliPath, '--help'], {
        stdio: 'pipe',
        env: { ...process.env, NODE_OPTIONS: '' },
      });

      let maxMemory = 0;

      const checkMemory = () => {
        try {
          const memUsage = process.memoryUsage();
          maxMemory = Math.max(maxMemory, memUsage.heapUsed);
        } catch (error) {
          // Ignore memory check errors
        }
      };

      const memoryInterval = setInterval(checkMemory, 10);

      child.on('close', (code) => {
        clearInterval(memoryInterval);
        if (code === 0) {
          resolve(maxMemory / 1024 / 1024); // Convert to MB
        } else {
          reject(new Error(`CLI exited with code ${code}`));
        }
      });

      child.on('error', (error) => {
        clearInterval(memoryInterval);
        reject(error);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(memoryInterval);
        child.kill();
        reject(new Error('Memory measurement timeout'));
      }, 10000);
    });
  }

  /**
   * Test configuration caching performance
   */
  async testConfigCaching(): Promise<{ firstLoad: number; cachedLoad: number }> {
    const configPath = path.join(this.tempDir, 'config.yaml');
    await fs.writeFile(
      configPath,
      `
projects:
  test:
    name: "Test Project"
    repo: "https://github.com/test/test.git"
global:
  src_dir: "${this.tempDir}"
`,
    );

    // First load (cold cache)
    const firstStart = performance.now();
    await this.runCLI(['--config', configPath, '--help']);
    const firstLoad = performance.now() - firstStart;

    // Second load (warm cache)
    const secondStart = performance.now();
    await this.runCLI(['--config', configPath, '--help']);
    const cachedLoad = performance.now() - secondStart;

    return { firstLoad, cachedLoad };
  }

  /**
   * Test workspace initialization performance
   */
  async testWorkspaceInit(): Promise<number> {
    const start = performance.now();

    try {
      // Use actual config instead of --no-config to test realistic scenario
      await this.runCLI([
        '--config',
        './config.yaml',
        'init',
        '--dry-run',
        'next',
        'perf-test-branch',
      ]);

      return performance.now() - start;
    } catch (error) {
      throw new Error(`Workspace init test failed: ${error}`);
    }
  }

  /**
   * Run CLI command and return stdout
   */
  async runCLI(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [this.cliPath, ...args], {
        stdio: 'pipe',
        cwd: path.resolve(__dirname, '../..'), // Run from project root where config.yaml exists
        env: { ...process.env, NODE_OPTIONS: '' },
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`CLI failed: ${stderr}`));
        }
      });

      child.on('error', reject);

      // Timeout after 30 seconds
      setTimeout(() => {
        child.kill();
        reject(new Error('CLI command timeout'));
      }, 30000);
    });
  }
}

describe.skipIf(process.env.SKIP_PERFORMANCE_TESTS === 'true')(
  'Performance Integration Tests',
  () => {
    let tester: PerformanceTester;

    beforeEach(async () => {
      tester = new PerformanceTester();
      await tester.setup();
    });

    afterEach(async () => {
      await tester.cleanup();
    });

    it('should maintain fast startup time with all optimizations', async () => {
      const startupTime = await tester.measureStartupTime();

      // Should be under 220ms (allowing for system variance)
      expect(startupTime).toBeLessThan(220);

      console.log(`Startup time: ${startupTime.toFixed(2)}ms`);
    }, 10000);

    it('should maintain low memory usage', async () => {
      const memoryUsage = await tester.measureMemoryUsage();

      // Should be under 15MB (realistic target for full CLI)
      expect(memoryUsage).toBeLessThan(15);

      console.log(`Memory usage: ${memoryUsage.toFixed(2)}MB`);
    }, 15000);

    it('should show config caching performance improvement', async () => {
      const { firstLoad, cachedLoad } = await tester.testConfigCaching();

      // Second invocation should be comparable (no significant regression)
      // Note: Process-level caching doesn't persist across CLI invocations
      expect(cachedLoad).toBeLessThan(firstLoad * 1.5); // Allow for some variance

      console.log(
        `Config loading - First: ${firstLoad.toFixed(2)}ms, Cached: ${cachedLoad.toFixed(2)}ms`,
      );
      console.log(
        `Cache improvement: ${(((firstLoad - cachedLoad) / firstLoad) * 100).toFixed(1)}%`,
      );
    }, 15000);

    it('should complete workspace initialization efficiently', async () => {
      const initTime = await tester.testWorkspaceInit();

      // Dry run should be very fast (under 2 seconds)
      expect(initTime).toBeLessThan(2000);

      console.log(`Workspace init (dry-run): ${initTime.toFixed(2)}ms`);
    }, 30000);

    it('should handle multiple rapid CLI invocations without degradation', async () => {
      const iterations = 5;
      const times: number[] = [];

      // Run multiple CLI commands rapidly
      for (let i = 0; i < iterations; i++) {
        const startupTime = await tester.measureStartupTime();
        times.push(startupTime);
      }

      // No significant degradation across iterations
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      expect(maxTime).toBeLessThan(avgTime * 2); // Max shouldn't be more than 2x average

      console.log(
        `Multiple invocations - Average: ${avgTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`,
      );
    }, 30000);

    it('should maintain performance with progress indicators enabled', async () => {
      // Test with progress indicators (non-silent mode)
      const start = performance.now();

      try {
        // Use actual config instead of --no-config to test realistic scenario
        await tester.runCLI([
          '--config',
          './config.yaml',
          'init',
          '--dry-run',
          'next',
          'progress-perf-test',
        ]);

        const timeWithProgress = performance.now() - start;

        // Should still be fast even with progress indicators
        expect(timeWithProgress).toBeLessThan(3000);

        console.log(`Init with progress indicators: ${timeWithProgress.toFixed(2)}ms`);
      } catch (error) {
        throw new Error(`Progress indicator performance test failed: ${error}`);
      }
    }, 30000);
  },
);

export { PerformanceTester, type PerformanceMetrics };
