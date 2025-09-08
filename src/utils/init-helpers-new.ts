import fs from 'fs-extra';
import { execa } from 'execa';
import { validateBranchName, validateGitHubIds } from '../utils/validation.js';
import { logger } from '../utils/logger.js';
import { FileSystemError } from '../utils/errors.js';
import type { GitHubIssueData } from '../types/index.js';

/**
 * Parse command arguments to extract GitHub IDs and branch name
 */
function parseInitArguments(args: string[]): { issueIds: number[]; branchName: string } {
  let issueIds: string[] = [];
  let branchName: string;

  if (args.length === 1) {
    issueIds = [];
    branchName = args[0];
  } else {
    issueIds = args.slice(0, -1);
    branchName = args[args.length - 1];
  }

  // Validate inputs
  const validatedBranchName = validateBranchName(branchName);
  const validatedIssueIds = validateGitHubIds(issueIds);

  return { issueIds: validatedIssueIds, branchName: validatedBranchName };
}

/**
 * Execute command with proper logging and error handling
 */
async function executeCommand(
  command: string,
  args: string[],
  execOptions: Record<string, any>,
  description: string,
  isDryRun: boolean,
): Promise<any> {
  logger.command(command, args, execOptions.cwd);

  if (isDryRun) {
    logger.verbose(`[DRY-RUN] Would execute: ${description}`);
    return { stdout: 'dry-run-output' };
  }

  try {
    return await execa(command, args, execOptions);
  } catch (error) {
    throw new Error(`Failed to ${description}: ${(error as Error).message}`);
  }
}

/**
 * File operation wrappers with logging and error handling
 */
const fileOps = {
  async writeFile(
    filePath: string,
    content: string,
    description: string,
    isDryRun: boolean,
  ): Promise<void> {
    logger.verbose(`[WRITE] ${filePath}`);
    if (isDryRun) {
      logger.verbose(`[DRY-RUN] Would write: ${description}`);
      return;
    }
    try {
      return await fs.writeFile(filePath, content);
    } catch (error) {
      throw new FileSystemError(
        `Failed to write ${description}: ${(error as Error).message}`,
        error as Error,
      );
    }
  },

  async copyFile(src: string, dest: string, description: string, isDryRun: boolean): Promise<void> {
    logger.verbose(`[COPY] ${src} -> ${dest}`);
    if (isDryRun) {
      logger.verbose(`[DRY-RUN] Would copy: ${description}`);
      return;
    }
    try {
      return await fs.copy(src, dest);
    } catch (error) {
      throw new FileSystemError(
        `Failed to copy ${description}: ${(error as Error).message}`,
        error as Error,
      );
    }
  },

  async removeFile(filePath: string, description: string, isDryRun: boolean): Promise<void> {
    logger.verbose(`[REMOVE] ${filePath}`);
    if (isDryRun) {
      logger.verbose(`[DRY-RUN] Would remove: ${description}`);
      return;
    }
    try {
      return await fs.remove(filePath);
    } catch (error) {
      throw new FileSystemError(
        `Failed to remove ${description}: ${(error as Error).message}`,
        error as Error,
      );
    }
  },

  async ensureDir(dirPath: string, description: string, isDryRun: boolean): Promise<void> {
    logger.verbose(`[MKDIR] ${dirPath}`);
    if (isDryRun) {
      logger.verbose(`[DRY-RUN] Would create directory: ${description}`);
      return;
    }
    try {
      return await fs.ensureDir(dirPath);
    } catch (error) {
      throw new FileSystemError(
        `Failed to create ${description}: ${(error as Error).message}`,
        error as Error,
      );
    }
  },
};

/**
 * Create descriptive test file name from GitHub data
 */
function createTestFileName(githubData: GitHubIssueData[]): string {
  if (githubData.length === 0) {
    return 'workspace-test';
  }

  const firstItem = githubData[0];
  const title = firstItem.title || `${firstItem.type}-${firstItem.id}`;

  const slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join('-')
    .replace(/-+/g, '-')
    .replace(/(^-+)|(-+$)/g, '');

  return slug || `issue-${firstItem.id}`;
}

export { parseInitArguments, executeCommand, createTestFileName, fileOps };
