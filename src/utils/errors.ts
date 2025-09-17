import process from 'process';
import type { Logger } from './logger.js';

/**
 * Custom error classes for better error handling
 */
export class WorkspaceError extends Error {
  public readonly code: string;
  public readonly originalError: Error | null;

  constructor(
    message: string,
    code: string = 'WORKSPACE_ERROR',
    originalError: Error | null = null,
  ) {
    super(message);
    this.name = 'WorkspaceError';
    this.code = code;
    this.originalError = originalError;
  }
}

export class ValidationError extends WorkspaceError {
  constructor(message: string, originalError: Error | null = null) {
    super(message, 'VALIDATION_ERROR', originalError);
    this.name = 'ValidationError';
  }
}

export class GitError extends WorkspaceError {
  constructor(message: string, originalError: Error | null = null) {
    super(message, 'GIT_ERROR', originalError);
    this.name = 'GitError';
  }
}

export class DependencyError extends WorkspaceError {
  constructor(message: string, originalError: Error | null = null) {
    super(message, 'DEPENDENCY_ERROR', originalError);
    this.name = 'DependencyError';
  }
}

export class FileSystemError extends WorkspaceError {
  constructor(message: string, originalError: Error | null = null) {
    super(message, 'FILESYSTEM_ERROR', originalError);
    this.name = 'FileSystemError';
  }
}

/**
 * Enhanced error handler with user-friendly messages
 */
export function handleError(error: Error, logger: Logger): void {
  if (error instanceof ValidationError) {
    logger.error(`Validation Error: ${error.message}`);
    process.exit(1);
  } else if (error instanceof GitError) {
    logger.error(`Git Error: ${error.message}`);
    logger.error('Please check that git is installed and you have proper permissions.');
    process.exit(1);
  } else if (error instanceof DependencyError) {
    logger.error(`Dependency Error: ${error.message}`);
    logger.error('Please ensure all required dependencies are installed.');
    process.exit(1);
  } else if (error instanceof FileSystemError) {
    logger.error(`File System Error: ${error.message}`);
    process.exit(1);
  } else if (error instanceof WorkspaceError) {
    logger.error(`Workspace Error: ${error.message}`);
    process.exit(1);
  } else {
    logger.error(`Unexpected Error: ${error.message}`, error);
    process.exit(1);
  }
}
