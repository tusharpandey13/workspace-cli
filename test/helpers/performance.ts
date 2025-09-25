import { performance } from 'perf_hooks';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  startupTime: number;
  memoryUsage: number;
  cacheHitRate?: number;
  operationTime: number;
  timestamp: string;
}

/**
 * Performance benchmark result
 */
export interface BenchmarkResult {
  baseline: PerformanceMetrics;
  optimized: PerformanceMetrics;
  improvement: {
    startupTimeImprovement: number;
    memoryUsageChange: number;
    operationTimeImprovement: number;
  };
}

/**
 * Utility class for performance benchmarking
 */
export class PerformanceBenchmark {
  private testDir: string;
  private cliPath: string;

  constructor() {
    this.testDir = '';
    this.cliPath = path.resolve(process.cwd(), 'dist', 'bin', 'workspace.js');
  }

  /**
   * Setup test environment for performance testing
   */
  async setupTestEnvironment(): Promise<string> {
    this.testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'perf-test-'));

    // Create minimal test config
    const testConfig = {
      projects: {
        'test-project': {
          name: 'Test Project',
          repo: 'https://github.com/user/test-repo.git',
        },
      },
      global: {
        src_dir: this.testDir,
        workspace_base: 'workspaces',
      },
    };

    const yaml = await import('js-yaml');
    const configPath = path.join(this.testDir, 'config.yaml');
    await fs.writeFile(configPath, yaml.dump(testConfig));

    return configPath;
  }

  /**
   * Cleanup test environment
   */
  async cleanupTestEnvironment(): Promise<void> {
    if (this.testDir && (await fs.pathExists(this.testDir))) {
      await fs.remove(this.testDir);
    }
  }

  /**
   * Measure CLI startup time
   */
  async measureStartupTime(configPath: string, iterations: number = 5): Promise<number> {
    const startupTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();

      try {
        // Measure time to load CLI and show help (no actual operation)
        execSync(`node "${this.cliPath}" --help`, {
          env: { ...process.env, NODE_OPTIONS: '' },
          cwd: path.dirname(configPath),
          stdio: 'pipe',
          timeout: 5000,
        });
      } catch (error) {
        // Help command exits with code 0, but execSync might throw on help output
        // This is expected behavior
      }

      const end = performance.now();
      startupTimes.push(end - start);
    }

    // Return average startup time
    return startupTimes.reduce((sum, time) => sum + time, 0) / startupTimes.length;
  }

  /**
   * Measure memory usage during operation
   */
  async measureMemoryUsage(): Promise<number> {
    const memUsage = process.memoryUsage();
    return memUsage.heapUsed / 1024 / 1024; // Convert to MB
  }

  /**
   * Measure operation execution time
   */
  async measureOperationTime(operation: () => Promise<void>): Promise<number> {
    const start = performance.now();
    await operation();
    const end = performance.now();
    return end - start;
  }

  /**
   * Run comprehensive performance benchmark
   */
  async runBenchmark(
    baselineOperation: () => Promise<void>,
    optimizedOperation: () => Promise<void>,
    testName: string,
  ): Promise<BenchmarkResult> {
    const configPath = await this.setupTestEnvironment();

    try {
      // Measure baseline
      const baselineStartTime = await this.measureStartupTime(configPath);
      const baselineMemStart = await this.measureMemoryUsage();
      const baselineOpTime = await this.measureOperationTime(baselineOperation);
      const baselineMemEnd = await this.measureMemoryUsage();

      const baseline: PerformanceMetrics = {
        startupTime: baselineStartTime,
        memoryUsage: baselineMemEnd - baselineMemStart,
        operationTime: baselineOpTime,
        timestamp: new Date().toISOString(),
      };

      // Small delay to ensure clean measurement
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Measure optimized version
      const optimizedStartTime = await this.measureStartupTime(configPath);
      const optimizedMemStart = await this.measureMemoryUsage();
      const optimizedOpTime = await this.measureOperationTime(optimizedOperation);
      const optimizedMemEnd = await this.measureMemoryUsage();

      const optimized: PerformanceMetrics = {
        startupTime: optimizedStartTime,
        memoryUsage: optimizedMemEnd - optimizedMemStart,
        operationTime: optimizedOpTime,
        timestamp: new Date().toISOString(),
      };

      // Calculate improvements
      const improvement = {
        startupTimeImprovement:
          ((baseline.startupTime - optimized.startupTime) / baseline.startupTime) * 100,
        memoryUsageChange:
          ((optimized.memoryUsage - baseline.memoryUsage) / baseline.memoryUsage) * 100,
        operationTimeImprovement:
          ((baseline.operationTime - optimized.operationTime) / baseline.operationTime) * 100,
      };

      const result: BenchmarkResult = {
        baseline,
        optimized,
        improvement,
      };

      // Log results
      console.log(`\n📊 Performance Benchmark: ${testName}`);
      console.log(
        `   Startup Time: ${baseline.startupTime.toFixed(2)}ms → ${optimized.startupTime.toFixed(2)}ms (${improvement.startupTimeImprovement.toFixed(1)}% improvement)`,
      );
      console.log(
        `   Memory Usage: ${baseline.memoryUsage.toFixed(2)}MB → ${optimized.memoryUsage.toFixed(2)}MB (${improvement.memoryUsageChange.toFixed(1)}% change)`,
      );
      console.log(
        `   Operation Time: ${baseline.operationTime.toFixed(2)}ms → ${optimized.operationTime.toFixed(2)}ms (${improvement.operationTimeImprovement.toFixed(1)}% improvement)`,
      );

      return result;
    } finally {
      await this.cleanupTestEnvironment();
    }
  }

  /**
   * Create automated performance regression detection
   */
  async createPerformanceReport(results: BenchmarkResult[], outputPath: string): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: results.length,
        averageStartupImprovement:
          results.reduce((sum, r) => sum + r.improvement.startupTimeImprovement, 0) /
          results.length,
        averageMemoryChange:
          results.reduce((sum, r) => sum + r.improvement.memoryUsageChange, 0) / results.length,
        averageOperationImprovement:
          results.reduce((sum, r) => sum + r.improvement.operationTimeImprovement, 0) /
          results.length,
      },
      results,
    };

    await fs.writeJSON(outputPath, report, { spaces: 2 });
  }

  /**
   * Validate performance targets
   */
  validatePerformanceTargets(result: BenchmarkResult): {
    startupTarget: boolean;
    memoryTarget: boolean;
    overallPass: boolean;
  } {
    // Target: 75% startup improvement (200ms → 50ms)
    const startupTarget = result.improvement.startupTimeImprovement >= 70; // Allow 5% tolerance

    // Target: Memory usage increase ≤ 5%
    const memoryTarget = result.improvement.memoryUsageChange <= 5;

    return {
      startupTarget,
      memoryTarget,
      overallPass: startupTarget && memoryTarget,
    };
  }
}

/**
 * Helper function for quick performance measurement
 */
export async function quickPerformanceMeasurement(
  operation: () => Promise<void>,
  name: string = 'Operation',
): Promise<{ time: number; memory: number }> {
  const benchmark = new PerformanceBenchmark();

  const memStart = await benchmark.measureMemoryUsage();
  const time = await benchmark.measureOperationTime(operation);
  const memEnd = await benchmark.measureMemoryUsage();

  const result = {
    time,
    memory: memEnd - memStart,
  };

  console.log(`⚡ ${name}: ${time.toFixed(2)}ms (Memory: ${result.memory.toFixed(2)}MB)`);

  return result;
}
