/**
 * Async Operation Coordinator for parallel execution of independent operations
 * Implements Phase 4 of the async optimization plan
 */

import { logger } from './logger.js';

export interface AsyncOperation<T = any> {
  id: string;
  description: string;
  priority: 'critical' | 'normal' | 'background';
  dependencies?: string[];
  retries?: number;
  timeout?: number;
  execute: () => Promise<T>;
  onError?: (error: Error) => Promise<boolean>; // Return true to continue with dependents
}

export interface OperationResult<T = any> {
  id: string;
  success: boolean;
  result?: T;
  error?: Error;
  executionTime: number;
  gracefulFailure?: boolean;
}

/**
 * Coordinates parallel execution of async operations with dependency awareness
 */
export class AsyncOperationCoordinator {
  private operations = new Map<string, AsyncOperation>();
  private results = new Map<string, OperationResult>();
  private running = new Set<string>();

  /**
   * Add an operation to be executed
   */
  addOperation<T>(operation: AsyncOperation<T>): void {
    this.operations.set(operation.id, operation);
  }

  /**
   * Execute all operations respecting dependencies and priorities
   */
  async executeAll(): Promise<Map<string, OperationResult>> {
    const toExecute = Array.from(this.operations.values());

    // Sort by priority: critical -> normal -> background
    const priorityOrder = { critical: 0, normal: 1, background: 2 };
    toExecute.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Execute operations in batches based on dependencies
    while (toExecute.length > 0) {
      const readyToExecute = toExecute.filter(
        (op) => !op.dependencies || op.dependencies.every((dep) => this.results.has(dep)),
      );

      if (readyToExecute.length === 0) {
        throw new Error('Circular dependency detected or missing dependency');
      }

      // Execute ready operations in parallel
      await Promise.all(readyToExecute.map((op) => this.executeOperation(op)));

      // Remove executed operations
      readyToExecute.forEach((op) => {
        const index = toExecute.indexOf(op);
        if (index >= 0) toExecute.splice(index, 1);
      });
    }

    return this.results;
  }

  /**
   * Execute operations in parallel where possible, respecting priority
   */
  async executeInParallel(operationIds: string[]): Promise<OperationResult[]> {
    const operations = operationIds
      .map((id) => this.operations.get(id))
      .filter((op): op is AsyncOperation => op !== undefined);

    if (operations.length === 0) {
      return [];
    }

    // Group by priority
    const critical = operations.filter((op) => op.priority === 'critical');
    const normal = operations.filter((op) => op.priority === 'normal');
    const background = operations.filter((op) => op.priority === 'background');

    const results: OperationResult[] = [];

    // Execute critical operations first
    if (critical.length > 0) {
      const criticalResults = await Promise.all(critical.map((op) => this.executeOperation(op)));
      results.push(...criticalResults);
    }

    // Execute normal and background in parallel
    if (normal.length > 0 || background.length > 0) {
      const parallelResults = await Promise.all([
        ...normal.map((op) => this.executeOperation(op)),
        ...background.map((op) => this.executeOperation(op)),
      ]);
      results.push(...parallelResults);
    }

    return results;
  }

  /**
   * Execute a single operation with error handling and timing
   */
  private async executeOperation(operation: AsyncOperation): Promise<OperationResult> {
    if (this.running.has(operation.id)) {
      throw new Error(`Operation ${operation.id} is already running`);
    }

    this.running.add(operation.id);
    const overallStartTime = performance.now();
    let retryCount = 0;
    const maxRetries = operation.retries || 0;

    while (retryCount <= maxRetries) {
      try {
        const retryText = retryCount > 0 ? ` (retry ${retryCount}/${maxRetries})` : '';
        logger.verbose(
          `⚡ Starting ${operation.priority} operation: ${operation.description}${retryText}`,
        );

        // Apply timeout if specified
        let resultPromise = operation.execute();
        if (operation.timeout) {
          resultPromise = Promise.race([
            resultPromise,
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error(`Operation timeout after ${operation.timeout}ms`)),
                operation.timeout,
              ),
            ),
          ]);
        }

        const result = await resultPromise;
        const executionTime = performance.now() - overallStartTime;

        const operationResult: OperationResult = {
          id: operation.id,
          success: true,
          result,
          executionTime,
        };

        this.results.set(operation.id, operationResult);
        logger.verbose(`✅ Completed ${operation.id} in ${executionTime.toFixed(2)}ms`);

        return operationResult;
      } catch (error) {
        const err = error as Error;
        retryCount++;

        if (retryCount > maxRetries) {
          // Final failure - check if operation has error handler
          if (operation.onError) {
            try {
              const shouldContinue = await operation.onError(err);
              if (shouldContinue) {
                logger.verbose(
                  `⚠️ Operation ${operation.id} failed but continuing with dependents`,
                );
                // Return a special success result that indicates graceful failure
                const operationResult: OperationResult = {
                  id: operation.id,
                  success: true,
                  result: undefined,
                  executionTime: performance.now() - overallStartTime,
                  gracefulFailure: true,
                };
                this.results.set(operation.id, operationResult);
                return operationResult;
              }
            } catch (handlerError) {
              logger.verbose(`Error handler for ${operation.id} also failed: ${handlerError}`);
            }
          }

          const executionTime = performance.now() - overallStartTime;
          const operationResult: OperationResult = {
            id: operation.id,
            success: false,
            error: err,
            executionTime,
          };

          this.results.set(operation.id, operationResult);
          logger.verbose(
            `❌ Failed ${operation.id} in ${executionTime.toFixed(2)}ms: ${err.message}`,
          );

          // For critical operations, rethrow the error
          if (operation.priority === 'critical') {
            throw error;
          }

          return operationResult;
        }

        // Will retry
        if (maxRetries > 0) {
          logger.verbose(
            `🔄 Retrying ${operation.id} (${retryCount}/${maxRetries}): ${err.message}`,
          );
          // Exponential backoff: 100ms, 200ms, 400ms, etc.
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount - 1) * 100));
        }
      }
    }

    // Should never reach here due to the while loop logic above
    throw new Error('Unexpected execution path in executeOperation');
  }

  /**
   * Get result for a specific operation
   */
  getResult(operationId: string): OperationResult | undefined {
    return this.results.get(operationId);
  }

  /**
   * Check if all operations completed successfully
   */
  allSuccessful(): boolean {
    return Array.from(this.results.values()).every((result) => result.success);
  }

  /**
   * Get all failed operations
   */
  getFailures(): OperationResult[] {
    return Array.from(this.results.values()).filter((result) => !result.success);
  }

  /**
   * Get total execution time for all operations
   */
  getTotalExecutionTime(): number {
    return Array.from(this.results.values()).reduce(
      (total, result) => total + result.executionTime,
      0,
    );
  }

  /**
   * Clear all operations and results
   */
  clear(): void {
    this.operations.clear();
    this.results.clear();
    this.running.clear();
  }
}

/**
 * Create a singleton coordinator instance for the init flow
 */
export const initCoordinator = new AsyncOperationCoordinator();
