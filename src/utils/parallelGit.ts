import pLimit from 'p-limit';
import { logger } from '../utils/logger.js';
import { executeGitCommand } from '../utils/secureExecution.js';

/**
 * Represents a single git operation that can be executed independently
 */
export interface GitOperation {
  id: string;
  type: 'clone' | 'validate' | 'freshness' | 'branch' | 'worktree';
  repoPath: string;
  description: string;
  execute: () => Promise<any>;
}

/**
 * Result of a single git operation execution
 */
export interface OperationResult {
  id: string;
  success: boolean;
  result?: any;
  error?: Error;
  duration: number;
}

/**
 * Batch of git operations that can be executed together
 */
export interface GitOperationBatch {
  name: string;
  operations: GitOperation[];
  maxConcurrency: number;
}

/**
 * Results of executing a batch of operations
 */
export interface BatchResults {
  batchName: string;
  totalOperations: number;
  successCount: number;
  failureCount: number;
  results: OperationResult[];
  totalDuration: number;
}

/**
 * Parallel Git Operations Manager
 * Coordinates concurrent git operations while maintaining safety and integrity
 */
export class ParallelGitOperations {
  private readonly limit: ReturnType<typeof pLimit>;
  private readonly enableParallel: boolean;

  constructor(maxConcurrency: number = 4) {
    this.limit = pLimit(maxConcurrency);
    // Allow disabling parallel operations via environment variable
    this.enableParallel = process.env.SEQUENTIAL_GIT_OPS !== 'true';

    if (!this.enableParallel) {
      logger.verbose('🔄 Parallel git operations disabled via SEQUENTIAL_GIT_OPS=true');
    }
  }

  /**
   * Execute multiple independent git operations in parallel
   */
  async executeParallel(operations: GitOperation[]): Promise<OperationResult[]> {
    if (!this.enableParallel || operations.length <= 1) {
      return this.executeSequential(operations);
    }

    logger.verbose(`🚀 Executing ${operations.length} git operations in parallel...`);
    const startTime = Date.now();

    // Use p-limit to manage concurrency
    const results = await this.limit.map(operations, (operation) =>
      this.executeOperation(operation),
    );
    const totalDuration = Date.now() - startTime;

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    logger.verbose(
      `🎯 Parallel execution completed: ${successCount} success, ${failureCount} failed (${totalDuration}ms)`,
    );

    // If any operations failed, aggregate and throw errors
    if (failureCount > 0) {
      const errors = results.filter((r) => !r.success).map((r) => r.error!);
      throw new Error(`Parallel git operations failed: ${errors.map((e) => e.message).join('; ')}`);
    }

    return results;
  }

  /**
   * Execute a single operation and return the result
   */
  private async executeOperation(operation: GitOperation): Promise<OperationResult> {
    const operationStartTime = Date.now();

    try {
      logger.verbose(`  ▶️ Starting: ${operation.description}`);
      const result = await operation.execute();
      const duration = Date.now() - operationStartTime;

      logger.verbose(`  ✅ Completed: ${operation.description} (${duration}ms)`);

      return {
        id: operation.id,
        success: true,
        result,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - operationStartTime;

      // Handle both Error objects and other thrown values
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.verbose(`  ❌ Failed: ${operation.description} (${duration}ms): ${errorMessage}`);

      return {
        id: operation.id,
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        duration,
      };
    }
  }

  /**
   * Execute operations sequentially as fallback
   */
  private async executeSequential(operations: GitOperation[]): Promise<OperationResult[]> {
    logger.verbose(`🔄 Executing ${operations.length} git operations sequentially...`);
    const results: OperationResult[] = [];

    for (const operation of operations) {
      const startTime = Date.now();

      try {
        logger.verbose(`  ▶️ Starting: ${operation.description}`);
        const result = await operation.execute();
        const duration = Date.now() - startTime;

        logger.verbose(`  ✅ Completed: ${operation.description} (${duration}ms)`);

        results.push({
          id: operation.id,
          success: true,
          result,
          duration,
        });
      } catch (error) {
        const duration = Date.now() - startTime;

        logger.verbose(
          `  ❌ Failed: ${operation.description} (${duration}ms): ${(error as Error).message}`,
        );

        results.push({
          id: operation.id,
          success: false,
          error: error as Error,
          duration,
        });

        // In sequential mode, stop on first error
        throw error;
      }
    }

    return results;
  }

  /**
   * Execute multiple batches of operations in dependency order
   */
  async executeBatches(batches: GitOperationBatch[]): Promise<BatchResults[]> {
    logger.verbose(`📋 Executing ${batches.length} operation batches...`);
    const allResults: BatchResults[] = [];

    for (const batch of batches) {
      const batchStartTime = Date.now();

      try {
        const results = await this.executeParallel(batch.operations);
        const batchDuration = Date.now() - batchStartTime;

        const batchResults: BatchResults = {
          batchName: batch.name,
          totalOperations: batch.operations.length,
          successCount: results.filter((r) => r.success).length,
          failureCount: results.filter((r) => !r.success).length,
          results,
          totalDuration: batchDuration,
        };

        allResults.push(batchResults);
        logger.verbose(`  ✅ Batch "${batch.name}" completed successfully (${batchDuration}ms)`);
      } catch (error) {
        const batchDuration = Date.now() - batchStartTime;
        logger.error(
          `  ❌ Batch "${batch.name}" failed (${batchDuration}ms): ${(error as Error).message}`,
        );
        throw error;
      }
    }

    return allResults;
  }

  /**
   * Validate repository integrity after operations
   */
  async validateRepositoryIntegrity(repoPath: string): Promise<boolean> {
    try {
      // Check if git repository is in a valid state
      const statusResult = await executeGitCommand(['status', '--porcelain'], { cwd: repoPath });

      if (statusResult.exitCode !== 0) {
        logger.error(`Repository integrity check failed for ${repoPath}: ${statusResult.stderr}`);
        return false;
      }

      // Check if we can list branches (validates git database)
      const branchResult = await executeGitCommand(['branch', '-a'], { cwd: repoPath });

      if (branchResult.exitCode !== 0) {
        logger.error(`Branch listing failed for ${repoPath}: ${branchResult.stderr}`);
        return false;
      }

      logger.verbose(`✅ Repository integrity validated: ${repoPath}`);
      return true;
    } catch (error) {
      logger.error(
        `Repository integrity validation error for ${repoPath}: ${(error as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Get performance statistics for completed operations
   */
  calculatePerformanceStats(results: OperationResult[]): {
    totalDuration: number;
    averageDuration: number;
    successRate: number;
    operationCount: number;
  } {
    if (results.length === 0) {
      return { totalDuration: 0, averageDuration: 0, successRate: 0, operationCount: 0 };
    }

    const totalDuration = results.reduce((sum, result) => sum + result.duration, 0);
    const averageDuration = totalDuration / results.length;
    const successCount = results.filter((r) => r.success).length;
    const successRate = (successCount / results.length) * 100;

    return {
      totalDuration,
      averageDuration: Math.round(averageDuration),
      successRate: Math.round(successRate * 100) / 100,
      operationCount: results.length,
    };
  }
}
