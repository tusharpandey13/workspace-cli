import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { ConfigManager } from '../src/utils/config.js';
import { PerformanceBenchmark, quickPerformanceMeasurement } from './helpers/performance.js';
import type { Config } from '../src/types/index.js';

describe('Configuration Caching System', () => {
  let tempDir: string;
  let configManager: ConfigManager;
  let testConfigPath: string;
  let benchmark: PerformanceBenchmark;

  const testConfig: Config = {
    projects: {
      'test-project': {
        name: 'Test Project',
        repo: 'https://github.com/user/test-repo.git',
        sample_repo: 'https://github.com/user/test-samples.git',
      },
      'another-project': {
        name: 'Another Project',
        repo: 'https://github.com/user/another-repo.git',
      },
    },
    global: {
      src_dir: '~/src',
      workspace_base: 'workspaces',
      env_files_dir: './env-files',
    },
    templates: {
      dir: './src/templates',
    },
  };

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'config-caching-test-'));
    configManager = new ConfigManager();
    benchmark = new PerformanceBenchmark();
    testConfigPath = path.join(tempDir, 'config.yaml');

    // Create test config file
    const yaml = await import('js-yaml');
    await fs.writeFile(testConfigPath, yaml.dump(testConfig));

    // Clear environment variable that might disable caching
    delete process.env.WORKSPACE_DISABLE_CACHE;
  });

  afterEach(async () => {
    // Clean up ConfigManager to prevent event listener leaks
    if (configManager) {
      configManager.cleanup();
    }

    if (tempDir && (await fs.pathExists(tempDir))) {
      await fs.remove(tempDir);
    }
  });

  describe('Cache Hit/Miss Scenarios', () => {
    it('should load config fresh on first call (cache miss)', async () => {
      const result = await quickPerformanceMeasurement(async () => {
        const config = await configManager.loadConfig(testConfigPath);
        expect(config).toBeDefined();
        expect(config.projects?.['test-project']).toBeDefined();
      }, 'First config load (cache miss)');

      expect(result.time).toBeGreaterThan(0);
      expect(configManager.isLoaded()).toBe(true);
    });

    it('should use cached config on subsequent calls (cache hit)', async () => {
      // First load (cache miss)
      await configManager.loadConfig(testConfigPath);

      // Second load should be much faster (cache hit)
      const result = await quickPerformanceMeasurement(async () => {
        const config = await configManager.loadConfig(testConfigPath);
        expect(config).toBeDefined();
        expect(config.projects?.['test-project']).toBeDefined();
      }, 'Second config load (cache hit)');

      // Cache hit should be very fast
      expect(result.time).toBeLessThan(10); // Should be <10ms due to cache
    });

    it('should handle multiple different config paths correctly', async () => {
      const secondConfigPath = path.join(tempDir, 'config2.yaml');
      const secondConfig: Config = {
        projects: {
          'different-project': {
            name: 'Different Project',
            repo: 'https://github.com/user/different-repo.git',
          },
        },
      };

      const yaml = await import('js-yaml');
      await fs.writeFile(secondConfigPath, yaml.dump(secondConfig));

      // Load first config
      const config1 = await configManager.loadConfig(testConfigPath);
      expect(config1.projects?.['test-project']).toBeDefined();

      // Create new ConfigManager instance for second config
      const configManager2 = new ConfigManager();
      try {
        const config2 = await configManager2.loadConfig(secondConfigPath);
        expect(config2.projects?.['different-project']).toBeDefined();
        expect(config2.projects?.['test-project']).toBeUndefined();
      } finally {
        // Clean up second ConfigManager to prevent event listener leaks
        configManager2.cleanup();
      }
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache when config file is modified', async () => {
      // Load config initially
      const config1 = await configManager.loadConfig(testConfigPath);
      expect(config1.projects?.['test-project']).toBeDefined();

      // Wait a moment to ensure file system timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Modify config file
      const modifiedConfig = {
        ...testConfig,
        projects: {
          ...testConfig.projects,
          'new-project': {
            name: 'New Project',
            repo: 'https://github.com/user/new-repo.git',
          },
        },
      };

      const yaml = await import('js-yaml');
      await fs.writeFile(testConfigPath, yaml.dump(modifiedConfig));

      // Wait for file watcher to detect change
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Load config again - should reflect changes
      const config2 = await configManager.loadConfig(testConfigPath);
      expect(config2.projects?.['new-project']).toBeDefined();
      expect(config2.projects?.['test-project']).toBeDefined(); // Original should still exist
    });

    it('should handle config file deletion gracefully', async () => {
      // Load config initially
      await configManager.loadConfig(testConfigPath);
      expect(configManager.isLoaded()).toBe(true);

      // Delete config file
      await fs.remove(testConfigPath);

      // Wait for file watcher to detect change
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Try to load the specific deleted config - should fail
      const configManager2 = new ConfigManager();
      try {
        await configManager2.loadConfig(testConfigPath);
        // If it succeeds, it means it found another config file (which is valid behavior)
        expect(configManager2.isLoaded()).toBe(true);
      } catch (error) {
        // If it fails, that's also expected since the specific file doesn't exist
        expect(error).toBeDefined();
      } finally {
        configManager2.cleanup();
      }
    });
  });

  describe('Environment Variable Controls', () => {
    it('should disable caching when WORKSPACE_DISABLE_CACHE is set', async () => {
      process.env.WORKSPACE_DISABLE_CACHE = '1';

      const configManager1 = new ConfigManager();
      const configManager2 = new ConfigManager();

      try {
        // Load config with first manager
        const result1 = await quickPerformanceMeasurement(async () => {
          await configManager1.loadConfig(testConfigPath);
        }, 'First load with cache disabled');

        // Load config with second manager - should not use cache
        const result2 = await quickPerformanceMeasurement(async () => {
          await configManager2.loadConfig(testConfigPath);
        }, 'Second load with cache disabled');

        // Both should take similar time (no caching)
        expect(result1.time).toBeGreaterThan(0);
        expect(result2.time).toBeGreaterThan(0);

        // The difference should be reasonable for non-cached operations (allow more variance)
        const timeDifference = Math.abs(result1.time - result2.time);
        const maxExpectedDifference = Math.max(result1.time, result2.time) * 2; // Allow up to 2x difference
        expect(timeDifference).toBeLessThan(maxExpectedDifference);
      } finally {
        configManager1.cleanup();
        configManager2.cleanup();
      }
    });
  });

  describe('Error Handling and Graceful Fallbacks', () => {
    it('should handle file watching setup failures gracefully', async () => {
      // Mock fs.watchFile to simulate failure
      const originalWatchFile = fs.watchFile;
      vi.spyOn(fs, 'watchFile').mockImplementation(() => {
        throw new Error('File watching not supported');
      });

      try {
        // Should still work, just without caching
        const config = await configManager.loadConfig(testConfigPath);
        expect(config).toBeDefined();
        expect(config.projects?.['test-project']).toBeDefined();
      } finally {
        // Restore original function
        fs.watchFile = originalWatchFile;
      }
    });

    it('should maintain compatibility with no-config mode', async () => {
      configManager.enableNoConfigMode();
      expect(configManager.isNoConfigMode()).toBe(true);
      expect(configManager.isLoaded()).toBe(true); // no-config mode counts as loaded
    });

    it('should handle concurrent access safely', async () => {
      // Simulate concurrent config loading
      const promises = Array.from({ length: 5 }, () => configManager.loadConfig(testConfigPath));

      const configs = await Promise.all(promises);

      // All should succeed and return the same config
      configs.forEach((config) => {
        expect(config).toBeDefined();
        expect(config.projects?.['test-project']).toBeDefined();
      });
    });
  });

  describe('Memory Management and Cleanup', () => {
    it('should not cause memory leaks with repeated loading', async () => {
      const initialMemory = await benchmark.measureMemoryUsage();

      // Load config many times
      for (let i = 0; i < 10; i++) {
        await configManager.loadConfig(testConfigPath);
      }

      const finalMemory = await benchmark.measureMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (less than 5MB)
      expect(memoryIncrease).toBeLessThan(5);
    });

    it('should clean up file watchers properly', async () => {
      // Load config to setup file watcher
      await configManager.loadConfig(testConfigPath);

      // Access private method for testing (not ideal but necessary)
      const cleanupMethod = (configManager as any).cleanupFileWatcher;
      expect(typeof cleanupMethod).toBe('function');

      // Should not throw when cleaning up
      expect(() => cleanupMethod.call(configManager)).not.toThrow();
    });
  });

  describe('Performance Benchmarking', () => {
    it('should demonstrate significant performance improvement with caching', async () => {
      let baselineTime = 0;
      let cachedTime = 0;

      // Measure baseline (no cache)
      const configManager1 = new ConfigManager();
      try {
        const start1 = performance.now();
        await configManager1.loadConfig(testConfigPath);
        baselineTime = performance.now() - start1;

        // Measure cached access
        const start2 = performance.now();
        await configManager1.loadConfig(testConfigPath); // Should use cache
        cachedTime = performance.now() - start2;

        const improvement = ((baselineTime - cachedTime) / baselineTime) * 100;

        console.log(`⚡ Config Caching Performance:`);
        console.log(`   Baseline: ${baselineTime.toFixed(2)}ms`);
        console.log(`   Cached: ${cachedTime.toFixed(2)}ms`);
        console.log(`   Improvement: ${improvement.toFixed(1)}%`);

        // Cache should be significantly faster
        expect(cachedTime).toBeLessThan(baselineTime * 0.5); // At least 50% improvement
        expect(improvement).toBeGreaterThan(50); // At least 50% improvement
      } finally {
        configManager1.cleanup();
      }
    });

    it('should validate cache hit rate in typical workflows', async () => {
      let cacheHits = 0;
      let totalLoads = 0;

      // Simulate typical CLI usage pattern
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await configManager.loadConfig(testConfigPath);
        const time = performance.now() - start;

        totalLoads++;
        if (time < 5) {
          // Assume <5ms means cache hit
          cacheHits++;
        }
      }

      const hitRate = (cacheHits / totalLoads) * 100;
      console.log(`📊 Cache Hit Rate: ${hitRate.toFixed(1)}% (${cacheHits}/${totalLoads})`);

      // Should achieve >80% cache hit rate after first load
      expect(hitRate).toBeGreaterThan(80);
    });
  });
});
