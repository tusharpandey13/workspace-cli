import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { PerformanceBenchmark, quickPerformanceMeasurement } from '../helpers/performance.js';

describe.skipIf(process.env.SKIP_PERFORMANCE_TESTS === 'true')(
  'Performance Benchmarking Infrastructure',
  () => {
    let tempDir: string;
    let benchmark: PerformanceBenchmark;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'perf-infra-test-'));
      benchmark = new PerformanceBenchmark();
    });

    afterEach(async () => {
      if (tempDir && (await fs.pathExists(tempDir))) {
        await fs.remove(tempDir);
      }
    });

    describe('Test Environment Setup', () => {
      it('should create and cleanup test environment', async () => {
        const configPath = await benchmark.setupTestEnvironment();

        expect(await fs.pathExists(configPath)).toBe(true);
        expect(path.basename(configPath)).toBe('config.yaml');

        // Verify config content
        const yaml = await import('js-yaml');
        const configContent = await fs.readFile(configPath, 'utf8');
        const config = yaml.load(configContent) as any;

        expect(config.projects).toBeDefined();
        expect(config.projects['test-project']).toBeDefined();
        expect(config.global).toBeDefined();

        // Cleanup should work
        await benchmark.cleanupTestEnvironment();
      });
    });

    describe('Performance Measurement', () => {
      it('should measure operation time correctly', async () => {
        const testOperation = async (): Promise<void> => {
          // Simulate work with a small delay
          await new Promise((resolve) => setTimeout(resolve, 50));
        };

        const operationTime = await benchmark.measureOperationTime(testOperation);

        expect(operationTime).toBeGreaterThan(40); // Should be at least 40ms
        expect(operationTime).toBeLessThan(100); // Should not be too long
      });

      it('should measure memory usage', async () => {
        const memoryUsage = await benchmark.measureMemoryUsage();

        expect(typeof memoryUsage).toBe('number');
        expect(memoryUsage).toBeGreaterThan(0);
      });

      it('should handle quick performance measurement utility', async () => {
        const testOperation = async (): Promise<void> => {
          // Create some objects to use memory
          const testArray = Array.from({ length: 1000 }, (_, i) => ({ id: i, data: 'test' }));
          await new Promise((resolve) => setTimeout(resolve, 10));
          // Use the array to prevent optimization
          expect(testArray.length).toBe(1000);
        };

        const result = await quickPerformanceMeasurement(testOperation, 'Test Operation');

        expect(result.time).toBeGreaterThan(5);
        expect(typeof result.memory).toBe('number');
      });
    });

    describe('Performance Target Validation', () => {
      it('should validate performance targets correctly', () => {
        const mockResult = {
          baseline: {
            startupTime: 200,
            memoryUsage: 10,
            operationTime: 100,
            timestamp: new Date().toISOString(),
          },
          optimized: {
            startupTime: 50,
            memoryUsage: 10.2,
            operationTime: 60,
            timestamp: new Date().toISOString(),
          },
          improvement: {
            startupTimeImprovement: 75, // 75% improvement
            memoryUsageChange: 2, // 2% increase
            operationTimeImprovement: 40, // 40% improvement
          },
        };

        const validation = benchmark.validatePerformanceTargets(mockResult);

        expect(validation.startupTarget).toBe(true); // 75% >= 70%
        expect(validation.memoryTarget).toBe(true); // 2% <= 5%
        expect(validation.overallPass).toBe(true);
      });

      it('should fail validation when targets not met', () => {
        const mockResult = {
          baseline: {
            startupTime: 200,
            memoryUsage: 10,
            operationTime: 100,
            timestamp: new Date().toISOString(),
          },
          optimized: {
            startupTime: 150,
            memoryUsage: 12,
            operationTime: 80,
            timestamp: new Date().toISOString(),
          },
          improvement: {
            startupTimeImprovement: 25, // Only 25% improvement (target: 70%)
            memoryUsageChange: 20, // 20% increase (target: ≤5%)
            operationTimeImprovement: 20,
          },
        };

        const validation = benchmark.validatePerformanceTargets(mockResult);

        expect(validation.startupTarget).toBe(false); // 25% < 70%
        expect(validation.memoryTarget).toBe(false); // 20% > 5%
        expect(validation.overallPass).toBe(false);
      });
    });

    describe('Performance Report Generation', () => {
      it('should create performance reports', async () => {
        const mockResults = [
          {
            baseline: {
              startupTime: 200,
              memoryUsage: 10,
              operationTime: 100,
              timestamp: new Date().toISOString(),
            },
            optimized: {
              startupTime: 50,
              memoryUsage: 10.5,
              operationTime: 60,
              timestamp: new Date().toISOString(),
            },
            improvement: {
              startupTimeImprovement: 75,
              memoryUsageChange: 5,
              operationTimeImprovement: 40,
            },
          },
        ];

        const reportPath = path.join(tempDir, 'performance-report.json');
        await benchmark.createPerformanceReport(mockResults, reportPath);

        expect(await fs.pathExists(reportPath)).toBe(true);

        const report = await fs.readJSON(reportPath);
        expect(report.timestamp).toBeDefined();
        expect(report.summary.totalTests).toBe(1);
        expect(report.summary.averageStartupImprovement).toBe(75);
        expect(report.results).toHaveLength(1);
      });
    });
  },
);
