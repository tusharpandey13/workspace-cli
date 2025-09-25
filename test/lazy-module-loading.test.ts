import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { Command } from 'commander';
import { CommandLoader } from '../src/utils/lazyLoader.js';
import { PerformanceBenchmark, quickPerformanceMeasurement } from './helpers/performance.js';

describe('Lazy Module Loading System', () => {
  let tempDir: string;
  let commandLoader: CommandLoader;
  let benchmark: PerformanceBenchmark;
  let mockProgram: Command;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lazy-loading-test-'));
    commandLoader = new CommandLoader();
    benchmark = new PerformanceBenchmark();
    mockProgram = new Command('test');

    // Clear command loader cache
    commandLoader.clearCache();
  });

  afterEach(async () => {
    if (tempDir && (await fs.pathExists(tempDir))) {
      await fs.remove(tempDir);
    }
  });

  describe('Command Metadata Management', () => {
    it('should provide command metadata without loading implementations', () => {
      const metadata = commandLoader.getCommandMetadata();

      expect(metadata).toBeDefined();
      expect(Array.isArray(metadata)).toBe(true);
      expect(metadata.length).toBeGreaterThan(0);

      // Check that metadata has required properties
      metadata.forEach((cmd) => {
        expect(cmd.name).toBeDefined();
        expect(cmd.description).toBeDefined();
        expect(cmd.modulePath).toBeDefined();
        expect(cmd.registrationFunction).toBeDefined();
      });
    });

    it('should include all supported commands in metadata', () => {
      const metadata = commandLoader.getCommandMetadata();
      const commandNames = metadata.map((cmd) => cmd.name);

      const expectedCommands = ['list', 'init', 'info', 'clean', 'projects', 'setup'];
      expectedCommands.forEach((expectedCmd) => {
        expect(commandNames).toContain(expectedCmd);
      });
    });

    it('should provide command aliases where defined', () => {
      const metadata = commandLoader.getCommandMetadata();

      const listCmd = metadata.find((cmd) => cmd.name === 'list');
      expect(listCmd?.aliases).toEqual(['ls']);

      const initCmd = metadata.find((cmd) => cmd.name === 'init');
      expect(initCmd?.aliases).toEqual(['new', 'create']);
    });
  });

  describe('Dynamic Command Loading and Registration', () => {
    it('should successfully register a command with the program', async () => {
      const result = await quickPerformanceMeasurement(async () => {
        const success = await commandLoader.loadAndRegisterCommand(mockProgram, 'info');
        expect(success).toBe(true);
      }, 'Load and register info command');

      expect(result.time).toBeLessThan(200); // Should complete in <200ms

      // Check that command was added to program
      const commands = mockProgram.commands;
      const infoCommand = commands.find((cmd) => cmd.name() === 'info');
      expect(infoCommand).toBeDefined();
    });

    it('should return false for non-existent commands', async () => {
      const success = await commandLoader.loadAndRegisterCommand(
        mockProgram,
        'nonexistent-command',
      );
      expect(success).toBe(false);
    });

    it('should cache loaded modules to prevent repeated loading', async () => {
      // First load
      const firstResult = await quickPerformanceMeasurement(async () => {
        await commandLoader.loadAndRegisterCommand(mockProgram, 'list');
      }, 'First command load');

      // Second load should be much faster (cached)
      const secondProgram = new Command('test2');
      const secondResult = await quickPerformanceMeasurement(async () => {
        await commandLoader.loadAndRegisterCommand(secondProgram, 'list');
      }, 'Second command load (cached)');

      expect(secondResult.time).toBeLessThan(firstResult.time * 0.8); // At least 20% faster
    });

    it('should handle command loading by alias', async () => {
      const success = await commandLoader.loadAndRegisterCommand(mockProgram, 'ls'); // alias for list
      expect(success).toBe(true);

      const commands = mockProgram.commands;
      const listCommand = commands.find((cmd) => cmd.name() === 'list');
      expect(listCommand).toBeDefined();
    });
  });

  describe('Cache Management', () => {
    it('should provide cache statistics', () => {
      const initialStats = commandLoader.getCacheStats();
      expect(initialStats.size).toBe(0);
      expect(initialStats.modules).toEqual([]);
    });

    it('should update cache statistics after loading commands', async () => {
      await commandLoader.loadAndRegisterCommand(mockProgram, 'info');

      const stats = commandLoader.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.modules.length).toBe(1);
    });

    it('should clear cache successfully', async () => {
      // Load a command to populate cache
      await commandLoader.loadAndRegisterCommand(mockProgram, 'clean');

      let stats = commandLoader.getCacheStats();
      expect(stats.size).toBe(1);

      // Clear cache
      commandLoader.clearCache();

      stats = commandLoader.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.modules).toEqual([]);
    });

    it('should reload modules after cache clear', async () => {
      // Load command first time
      await commandLoader.loadAndRegisterCommand(mockProgram, 'projects');

      // Clear cache
      commandLoader.clearCache();

      // Load again - should work without errors
      const newProgram = new Command('test-new');
      const success = await commandLoader.loadAndRegisterCommand(newProgram, 'projects');
      expect(success).toBe(true);
    });
  });

  describe('Bulk Command Loading', () => {
    it('should load all commands efficiently', async () => {
      const result = await quickPerformanceMeasurement(async () => {
        await commandLoader.loadAllCommands(mockProgram);
      }, 'Load all commands');

      expect(result.time).toBeLessThan(1000); // Should complete in <1 second

      // Check that all commands were registered
      const metadata = commandLoader.getCommandMetadata();
      const registeredCommands = mockProgram.commands.map((cmd) => cmd.name());

      metadata.forEach((cmdMeta) => {
        expect(registeredCommands).toContain(cmdMeta.name);
      });
    });

    it('should not reload cached commands during bulk loading', async () => {
      // Pre-load one command
      await commandLoader.loadAndRegisterCommand(mockProgram, 'init');

      const cacheStatsBefore = commandLoader.getCacheStats();

      // Load all commands
      await commandLoader.loadAllCommands(mockProgram);

      const cacheStatsAfter = commandLoader.getCacheStats();

      // Cache should have grown but init module should still be there
      expect(cacheStatsAfter.size).toBeGreaterThan(cacheStatsBefore.size);
    });
  });

  describe('Performance Benchmarking', () => {
    it('should demonstrate reasonable loading performance', async () => {
      const commandNames = ['list', 'init', 'info', 'clean'];
      const loadingTimes: number[] = [];

      for (const cmdName of commandNames) {
        const program = new Command(`test-${cmdName}`);
        const result = await quickPerformanceMeasurement(async () => {
          await commandLoader.loadAndRegisterCommand(program, cmdName);
        }, `Loading ${cmdName} command`);

        loadingTimes.push(result.time);
      }

      const averageLoadTime =
        loadingTimes.reduce((sum, time) => sum + time, 0) / loadingTimes.length;
      console.log(`⚡ Average command loading time: ${averageLoadTime.toFixed(2)}ms`);

      // Each command should load reasonably quickly
      expect(averageLoadTime).toBeLessThan(100); // Average < 100ms per command
    });

    it('should measure memory footprint of command loading', async () => {
      const baselineMemory = await benchmark.measureMemoryUsage();

      // Load several commands
      await commandLoader.loadAndRegisterCommand(mockProgram, 'list');
      await commandLoader.loadAndRegisterCommand(mockProgram, 'init');
      await commandLoader.loadAndRegisterCommand(mockProgram, 'info');

      const afterLoadingMemory = await benchmark.measureMemoryUsage();
      const memoryUsed = afterLoadingMemory - baselineMemory;

      console.log(`📊 Memory used by lazy-loaded commands: ${memoryUsed.toFixed(2)}MB`);

      // Should use reasonable amount of memory
      expect(memoryUsed).toBeLessThan(15); // Less than 15MB for several commands
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle module import failures gracefully', async () => {
      // Create a command loader with a non-existent module path to test error handling
      const testLoader = new (class extends CommandLoader {
        getCommandMetadata() {
          return [
            {
              name: 'fake',
              description: 'Fake command for testing',
              modulePath: './non-existent-module.js',
              registrationFunction: 'fakeCommand',
            },
          ];
        }
      })();

      const success = await testLoader.loadAndRegisterCommand(mockProgram, 'fake');
      expect(success).toBe(false);
    });

    it('should not crash on invalid command registration', async () => {
      // This test assumes that if there's an issue with module structure,
      // it should fail gracefully rather than throwing
      expect(async () => {
        await commandLoader.loadAndRegisterCommand(mockProgram, 'setup');
      }).not.toThrow();
    });
  });

  describe('Command-Specific Loading Tests', () => {
    it('should load list command correctly', async () => {
      const success = await commandLoader.loadAndRegisterCommand(mockProgram, 'list');
      expect(success).toBe(true);

      const commands = mockProgram.commands;
      const listCommand = commands.find((cmd) => cmd.name() === 'list');
      expect(listCommand).toBeDefined();
      expect(listCommand?.description()).toContain('space');
    });

    it('should load init command correctly', async () => {
      const success = await commandLoader.loadAndRegisterCommand(mockProgram, 'init');
      expect(success).toBe(true);

      const commands = mockProgram.commands;
      const initCommand = commands.find((cmd) => cmd.name() === 'init');
      expect(initCommand).toBeDefined();
    });

    it('should load info command correctly', async () => {
      const success = await commandLoader.loadAndRegisterCommand(mockProgram, 'info');
      expect(success).toBe(true);

      const commands = mockProgram.commands;
      const infoCommand = commands.find((cmd) => cmd.name() === 'info');
      expect(infoCommand).toBeDefined();
    });

    it('should load clean command correctly', async () => {
      const success = await commandLoader.loadAndRegisterCommand(mockProgram, 'clean');
      expect(success).toBe(true);

      const commands = mockProgram.commands;
      const cleanCommand = commands.find((cmd) => cmd.name() === 'clean');
      expect(cleanCommand).toBeDefined();
    });

    it('should load projects command correctly', async () => {
      const success = await commandLoader.loadAndRegisterCommand(mockProgram, 'projects');
      expect(success).toBe(true);

      const commands = mockProgram.commands;
      const projectsCommand = commands.find((cmd) => cmd.name() === 'projects');
      expect(projectsCommand).toBeDefined();
    });
  });

  describe('Concurrent Loading Safety', () => {
    it('should handle concurrent command loading safely', async () => {
      // Load multiple commands concurrently
      const promises = ['list', 'init', 'info', 'clean'].map((cmd) => {
        const program = new Command(`test-${cmd}`);
        return commandLoader.loadAndRegisterCommand(program, cmd);
      });

      const results = await Promise.all(promises);

      // All commands should load successfully
      results.forEach((success) => {
        expect(success).toBe(true);
      });
    });

    it('should maintain cache integrity under concurrent access', async () => {
      // Load same command concurrently to different programs
      const promises = Array.from({ length: 5 }, (_, i) => {
        const program = new Command(`test-concurrent-${i}`);
        return commandLoader.loadAndRegisterCommand(program, 'info');
      });

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((success) => {
        expect(success).toBe(true);
      });

      // Cache should contain only one entry for the info module
      const stats = commandLoader.getCacheStats();
      expect(stats.size).toBe(1);
    });
  });

  describe('Integration with Performance Targets', () => {
    it('should meet lazy loading performance targets', async () => {
      const targets = {
        loadingLatency: 100, // <100ms per command loading
        memoryPerCommand: 5, // <5MB per command
        cacheHitRatio: 2, // Cache hit should be 2x faster
      };

      // Test loading latency
      const result = await quickPerformanceMeasurement(async () => {
        await commandLoader.loadAndRegisterCommand(mockProgram, 'list');
      }, 'Command loading latency');

      expect(result.time).toBeLessThan(targets.loadingLatency);

      // Test cache performance
      const newProgram = new Command('cache-test');
      const cacheResult = await quickPerformanceMeasurement(async () => {
        await commandLoader.loadAndRegisterCommand(newProgram, 'list');
      }, 'Cached command loading');

      expect(cacheResult.time).toBeLessThan(result.time / targets.cacheHitRatio);

      console.log(`✅ Lazy Loading Performance Validation:`);
      console.log(
        `   Loading Latency: ${result.time.toFixed(2)}ms (target: <${targets.loadingLatency}ms)`,
      );
      console.log(
        `   Cache Performance: ${cacheResult.time.toFixed(2)}ms (${(result.time / cacheResult.time).toFixed(1)}x faster)`,
      );
    });
  });
});
