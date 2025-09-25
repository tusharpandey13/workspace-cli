import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ParallelGitOperations, type GitOperation } from '../src/utils/parallelGit.js';
import { executeGitCommand } from '../src/utils/secureExecution.js';

// Mock dependencies
vi.mock('fs-extra');
vi.mock('../src/utils/secureExecution.js');
vi.mock('../src/utils/logger.js', () => ({
  logger: {
    verbose: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockExecuteGitCommand = vi.mocked(executeGitCommand);

describe('ParallelGitOperations', () => {
  let parallelGit: ParallelGitOperations;

  beforeEach(() => {
    parallelGit = new ParallelGitOperations(4);
    vi.clearAllMocks();
    // Reset environment variable
    delete process.env.SEQUENTIAL_GIT_OPS;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ParallelGitOperations Constructor', () => {
    it('should initialize with default concurrency', () => {
      const instance = new ParallelGitOperations();
      expect(instance).toBeInstanceOf(ParallelGitOperations);
    });

    it('should initialize with custom concurrency', () => {
      const instance = new ParallelGitOperations(8);
      expect(instance).toBeInstanceOf(ParallelGitOperations);
    });

    it('should respect SEQUENTIAL_GIT_OPS environment variable', () => {
      process.env.SEQUENTIAL_GIT_OPS = 'true';
      const instance = new ParallelGitOperations();
      expect(instance).toBeInstanceOf(ParallelGitOperations);
    });
  });

  describe('executeParallel', () => {
    it('should execute multiple operations in parallel successfully', async () => {
      const operations: GitOperation[] = [
        {
          id: 'op1',
          type: 'clone',
          repoPath: '/repo1',
          description: 'Operation 1',
          execute: vi.fn().mockResolvedValue('result1'),
        },
        {
          id: 'op2',
          type: 'validate',
          repoPath: '/repo2',
          description: 'Operation 2',
          execute: vi.fn().mockResolvedValue('result2'),
        },
      ];

      const results = await parallelGit.executeParallel(operations);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].result).toBe('result1');
      expect(results[1].success).toBe(true);
      expect(results[1].result).toBe('result2');
      expect(operations[0].execute).toHaveBeenCalled();
      expect(operations[1].execute).toHaveBeenCalled();
    });

    it('should handle partial operation failures with error aggregation', async () => {
      const operations: GitOperation[] = [
        {
          id: 'success-op',
          type: 'clone',
          repoPath: '/repo1',
          description: 'Success Operation',
          execute: vi.fn().mockResolvedValue('success'),
        },
        {
          id: 'fail-op',
          type: 'validate',
          repoPath: '/repo2',
          description: 'Fail Operation',
          execute: vi.fn().mockRejectedValue(new Error('Operation failed')),
        },
      ];

      await expect(parallelGit.executeParallel(operations)).rejects.toThrow(
        'Parallel git operations failed: Operation failed',
      );
    });

    it('should execute operations sequentially when SEQUENTIAL_GIT_OPS is true', async () => {
      process.env.SEQUENTIAL_GIT_OPS = 'true';
      const parallelGitSequential = new ParallelGitOperations();

      const operations: GitOperation[] = [
        {
          id: 'op1',
          type: 'clone',
          repoPath: '/repo1',
          description: 'Operation 1',
          execute: vi.fn().mockResolvedValue('result1'),
        },
        {
          id: 'op2',
          type: 'validate',
          repoPath: '/repo2',
          description: 'Operation 2',
          execute: vi.fn().mockResolvedValue('result2'),
        },
      ];

      const results = await parallelGitSequential.executeParallel(operations);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should handle empty operations array', async () => {
      const results = await parallelGit.executeParallel([]);
      expect(results).toHaveLength(0);
    });

    it('should handle single operation', async () => {
      const operations: GitOperation[] = [
        {
          id: 'single-op',
          type: 'freshness',
          repoPath: '/repo',
          description: 'Single Operation',
          execute: vi.fn().mockResolvedValue('single result'),
        },
      ];

      const results = await parallelGit.executeParallel(operations);
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].result).toBe('single result');
    });

    it('should measure operation duration', async () => {
      const operations: GitOperation[] = [
        {
          id: 'timed-op',
          type: 'branch',
          repoPath: '/repo',
          description: 'Timed Operation',
          execute: vi
            .fn()
            .mockImplementation(
              () => new Promise((resolve) => setTimeout(() => resolve('done'), 10)),
            ),
        },
      ];

      const results = await parallelGit.executeParallel(operations);
      expect(results[0].duration).toBeGreaterThan(5);
      expect(results[0].duration).toBeLessThan(100);
    });
  });

  describe('executeBatches', () => {
    it('should execute multiple batches in sequence', async () => {
      const batch1Operations: GitOperation[] = [
        {
          id: 'batch1-op1',
          type: 'clone',
          repoPath: '/repo1',
          description: 'Batch 1 Operation 1',
          execute: vi.fn().mockResolvedValue('b1-result1'),
        },
      ];

      const batch2Operations: GitOperation[] = [
        {
          id: 'batch2-op1',
          type: 'validate',
          repoPath: '/repo2',
          description: 'Batch 2 Operation 1',
          execute: vi.fn().mockResolvedValue('b2-result1'),
        },
      ];

      const batches = [
        { name: 'Batch 1', operations: batch1Operations, maxConcurrency: 2 },
        { name: 'Batch 2', operations: batch2Operations, maxConcurrency: 2 },
      ];

      const results = await parallelGit.executeBatches(batches);

      expect(results).toHaveLength(2);
      expect(results[0].batchName).toBe('Batch 1');
      expect(results[0].successCount).toBe(1);
      expect(results[1].batchName).toBe('Batch 2');
      expect(results[1].successCount).toBe(1);
    });

    it('should stop execution if a batch fails', async () => {
      const batch1Operations: GitOperation[] = [
        {
          id: 'fail-op',
          type: 'worktree',
          repoPath: '/repo',
          description: 'Failing Operation',
          execute: vi.fn().mockRejectedValue(new Error('Batch failure')),
        },
      ];

      const batch2Operations: GitOperation[] = [
        {
          id: 'never-executed',
          type: 'validate',
          repoPath: '/repo2',
          description: 'Never Executed',
          execute: vi.fn().mockResolvedValue('result'),
        },
      ];

      const batches = [
        { name: 'Failing Batch', operations: batch1Operations, maxConcurrency: 1 },
        { name: 'Never Executed', operations: batch2Operations, maxConcurrency: 1 },
      ];

      await expect(parallelGit.executeBatches(batches)).rejects.toThrow('Batch failure');
      expect(batch2Operations[0].execute).not.toHaveBeenCalled();
    });

    it('should handle empty batches array', async () => {
      const results = await parallelGit.executeBatches([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('validateRepositoryIntegrity', () => {
    beforeEach(() => {
      mockExecuteGitCommand.mockResolvedValue({
        exitCode: 0,
        stdout: 'clean status',
        stderr: '',
      });
    });

    it('should validate repository integrity successfully', async () => {
      const result = await parallelGit.validateRepositoryIntegrity('/valid/repo');
      expect(result).toBe(true);
      expect(mockExecuteGitCommand).toHaveBeenCalledWith(['status', '--porcelain'], {
        cwd: '/valid/repo',
      });
      expect(mockExecuteGitCommand).toHaveBeenCalledWith(['branch', '-a'], { cwd: '/valid/repo' });
    });

    it('should return false for repository with status command failure', async () => {
      mockExecuteGitCommand.mockResolvedValueOnce({
        exitCode: 1,
        stdout: '',
        stderr: 'fatal: not a git repository',
      });

      const result = await parallelGit.validateRepositoryIntegrity('/invalid/repo');
      expect(result).toBe(false);
    });

    it('should return false for repository with branch command failure', async () => {
      mockExecuteGitCommand
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: '',
          stderr: '',
        })
        .mockResolvedValueOnce({
          exitCode: 1,
          stdout: '',
          stderr: 'fatal: corrupt database',
        });

      const result = await parallelGit.validateRepositoryIntegrity('/corrupt/repo');
      expect(result).toBe(false);
    });

    it('should handle command execution exceptions', async () => {
      mockExecuteGitCommand.mockRejectedValue(new Error('Command execution failed'));

      const result = await parallelGit.validateRepositoryIntegrity('/error/repo');
      expect(result).toBe(false);
    });
  });

  describe('calculatePerformanceStats', () => {
    it('should calculate performance statistics correctly', () => {
      const results = [
        { id: '1', success: true, duration: 100 },
        { id: '2', success: true, duration: 200 },
        { id: '3', success: false, duration: 150, error: new Error('failed') },
      ];

      const stats = parallelGit.calculatePerformanceStats(results);

      expect(stats.totalDuration).toBe(450);
      expect(stats.averageDuration).toBe(150);
      expect(stats.successRate).toBe(66.67);
      expect(stats.operationCount).toBe(3);
    });

    it('should handle empty results array', () => {
      const stats = parallelGit.calculatePerformanceStats([]);

      expect(stats.totalDuration).toBe(0);
      expect(stats.averageDuration).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.operationCount).toBe(0);
    });

    it('should handle all successful operations', () => {
      const results = [
        { id: '1', success: true, duration: 100 },
        { id: '2', success: true, duration: 200 },
      ];

      const stats = parallelGit.calculatePerformanceStats(results);
      expect(stats.successRate).toBe(100);
    });

    it('should handle all failed operations', () => {
      const results = [
        { id: '1', success: false, duration: 100, error: new Error('failed') },
        { id: '2', success: false, duration: 200, error: new Error('failed') },
      ];

      const stats = parallelGit.calculatePerformanceStats(results);
      expect(stats.successRate).toBe(0);
    });
  });

  describe('Performance and Concurrency Tests', () => {
    it('should execute operations concurrently for better performance', async () => {
      const delayMs = 50;
      let concurrentExecutions = 0;
      let maxConcurrent = 0;

      const operations: GitOperation[] = Array.from({ length: 4 }, (_, i) => ({
        id: `concurrent-op-${i}`,
        type: 'clone',
        repoPath: `/repo${i}`,
        description: `Concurrent Operation ${i}`,
        execute: vi.fn().mockImplementation(async () => {
          concurrentExecutions++;
          maxConcurrent = Math.max(maxConcurrent, concurrentExecutions);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          concurrentExecutions--;
          return `result-${i}`;
        }),
      }));

      const startTime = Date.now();
      const results = await parallelGit.executeParallel(operations);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete in less time than sequential execution would take
      expect(totalTime).toBeLessThan(delayMs * operations.length);
      // Should have executed multiple operations concurrently
      expect(maxConcurrent).toBeGreaterThan(1);
      expect(results).toHaveLength(4);
      results.forEach((result) => expect(result.success).toBe(true));
    });

    it('should respect concurrency limits', async () => {
      const maxConcurrency = 2;
      const limitedParallelGit = new ParallelGitOperations(maxConcurrency);
      let currentConcurrent = 0;
      let maxObservedConcurrent = 0;

      const operations: GitOperation[] = Array.from({ length: 6 }, (_, i) => ({
        id: `limited-op-${i}`,
        type: 'validate',
        repoPath: `/repo${i}`,
        description: `Limited Operation ${i}`,
        execute: vi.fn().mockImplementation(async () => {
          currentConcurrent++;
          maxObservedConcurrent = Math.max(maxObservedConcurrent, currentConcurrent);
          await new Promise((resolve) => setTimeout(resolve, 10));
          currentConcurrent--;
          return `result-${i}`;
        }),
      }));

      await limitedParallelGit.executeParallel(operations);

      // Should not exceed concurrency limit
      expect(maxObservedConcurrent).toBeLessThanOrEqual(maxConcurrency);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle mixed success and failure operations', async () => {
      const operations: GitOperation[] = [
        {
          id: 'success-1',
          type: 'clone',
          repoPath: '/repo1',
          description: 'Success 1',
          execute: vi.fn().mockResolvedValue('success1'),
        },
        {
          id: 'failure-1',
          type: 'validate',
          repoPath: '/repo2',
          description: 'Failure 1',
          execute: vi.fn().mockRejectedValue(new Error('Error 1')),
        },
        {
          id: 'success-2',
          type: 'freshness',
          repoPath: '/repo3',
          description: 'Success 2',
          execute: vi.fn().mockResolvedValue('success2'),
        },
        {
          id: 'failure-2',
          type: 'worktree',
          repoPath: '/repo4',
          description: 'Failure 2',
          execute: vi.fn().mockRejectedValue(new Error('Error 2')),
        },
      ];

      await expect(parallelGit.executeParallel(operations)).rejects.toThrow(
        'Parallel git operations failed: Error 1; Error 2',
      );
    });

    it('should handle operations that throw non-Error objects', async () => {
      const operations: GitOperation[] = [
        {
          id: 'string-error-1',
          type: 'branch',
          repoPath: '/repo1',
          description: 'String Error 1',
          execute: vi.fn().mockRejectedValue('String error message 1'),
        },
        {
          id: 'string-error-2',
          type: 'branch',
          repoPath: '/repo2',
          description: 'String Error 2',
          execute: vi.fn().mockRejectedValue('String error message 2'),
        },
      ];

      await expect(parallelGit.executeParallel(operations)).rejects.toThrow(
        'Parallel git operations failed',
      );
    });

    it('should handle operations with undefined results', async () => {
      const operations: GitOperation[] = [
        {
          id: 'undefined-result',
          type: 'validate',
          repoPath: '/repo',
          description: 'Undefined Result',
          execute: vi.fn().mockResolvedValue(undefined),
        },
      ];

      const results = await parallelGit.executeParallel(operations);
      expect(results[0].success).toBe(true);
      expect(results[0].result).toBeUndefined();
    });
  });

  describe('Integration with Git Operations', () => {
    it('should work with realistic git operation scenarios', async () => {
      // Mock successful git commands for realistic testing
      mockExecuteGitCommand
        .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // git clone
        .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // git status
        .mockResolvedValueOnce({ exitCode: 0, stdout: 'branch list', stderr: '' }); // git branch

      const operations: GitOperation[] = [
        {
          id: 'clone-main',
          type: 'clone',
          repoPath: '/workspace/main-repo',
          description: 'Clone main repository',
          execute: async () => {
            const result = await executeGitCommand(
              ['clone', 'https://github.com/user/main.git', '/workspace/main-repo'],
              {},
            );
            if (result.exitCode !== 0) throw new Error(`Clone failed: ${result.stderr}`);
            return 'cloned successfully';
          },
        },
        {
          id: 'validate-integrity',
          type: 'validate',
          repoPath: '/workspace/main-repo',
          description: 'Validate repository integrity',
          execute: async () => {
            return parallelGit.validateRepositoryIntegrity('/workspace/main-repo');
          },
        },
      ];

      const results = await parallelGit.executeParallel(operations);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[1].result).toBe(true);
    });
  });
});
