import path from 'path';
import { execa } from 'execa';
import { logger } from './logger.js';

/**
 * Allowed Git hosting providers for security
 */
const ALLOWED_GIT_HOSTS = [
  'github.com',
  'gitlab.com',
  'bitbucket.org',
  'git.sr.ht', // SourceHut
  'codeberg.org',
];

/**
 * Allowed commands for secure execution
 */
const ALLOWED_COMMANDS = ['git', 'gh', 'sh', 'node', 'npm', 'pnpm', 'yarn'];

function hasControlCharacters(input: string): boolean {
  // Check for control characters using code points to avoid linter errors
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if ((code >= 0 && code <= 31) || (code >= 127 && code <= 159)) {
      return true;
    }
  }
  return false;
}

export function validateBranchName(branchName: string | null | undefined): string {
  if (!branchName || typeof branchName !== 'string' || branchName.trim() === '') {
    throw new Error('Branch name is required');
  }

  const trimmed = branchName.trim();

  // Enhanced security patterns - block all shell metacharacters
  const dangerousPatterns = [
    /^--/, // starts with --
    /\.\./, // contains ../
    /[;&|`$(){}[\]\\<>?*~]/, // shell metacharacters
    /^[-.]/, // starts with dash or dot (git issues)
    /\/$/, // ends with slash
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      throw new Error(`Branch name contains unsafe characters or patterns: ${branchName}`);
    }
  }

  // Check for control characters
  if (hasControlCharacters(trimmed)) {
    throw new Error(`Branch name contains control characters: ${branchName}`);
  }

  // Only allow safe characters for branch names
  const SAFE_BRANCH_PATTERN = /^[a-zA-Z0-9_/-]+$/;
  if (!SAFE_BRANCH_PATTERN.test(trimmed)) {
    throw new Error(
      `Branch name contains invalid characters. Only alphanumeric, underscore, dash, and forward slash are allowed: ${branchName}`,
    );
  }

  // Limit length (Git limit is 250, we use 100 for safety)
  if (trimmed.length > 100) {
    throw new Error(`Branch name too long (max 100 characters): ${branchName}`);
  }

  return trimmed;
}

/**
 * Validates repository URL or local path with appropriate security checks
 */
export function validateRepositoryPath(input: string): string {
  if (!input || typeof input !== 'string' || input.trim() === '') {
    throw new Error('Repository path is required');
  }

  const trimmed = input.trim();

  // Check if it's a URL or a local path
  try {
    new URL(trimmed); // Just check if it's a valid URL format
    // It's a URL - use URL validation
    return validateGitUrl(trimmed);
  } catch {
    // It's a local path - use path validation
    return validateLocalRepositoryPath(trimmed);
  }
}

/**
 * Validates local repository paths for security
 */
export function validateLocalRepositoryPath(path: string): string {
  if (!path || typeof path !== 'string' || path.trim() === '') {
    throw new Error('Repository path is required');
  }

  const trimmed = path.trim();

  // Check for dangerous path traversal patterns
  if (trimmed.includes('..') || trimmed.includes(';') || trimmed.includes('|')) {
    throw new Error(`Repository path contains dangerous patterns: ${trimmed}`);
  }

  // Must be absolute path for security
  if (!trimmed.startsWith('/')) {
    throw new Error(`Repository path must be absolute: ${trimmed}`);
  }

  // Check for control characters
  if (hasControlCharacters(trimmed)) {
    throw new Error(`Repository path contains control characters: ${trimmed}`);
  }

  return trimmed;
}

/**
 * Validates Git repository URLs with security checks
 */
export function validateGitUrl(url: string): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    throw new Error('Repository URL is required');
  }

  const trimmed = url.trim();

  // Check for dangerous patterns in the raw URL before parsing
  if (trimmed.includes('..') || trimmed.includes(';')) {
    throw new Error(`Repository URL contains dangerous path patterns: ${trimmed}`);
  }

  try {
    const parsed = new URL(trimmed);

    // Only allow specific protocols
    if (!['https:', 'git:', 'ssh:'].includes(parsed.protocol)) {
      throw new Error(
        `Unsupported protocol: ${parsed.protocol}. Only https:, git:, and ssh: are allowed`,
      );
    }

    // For security, only allow known Git hosting providers
    if (parsed.protocol === 'https:' && !ALLOWED_GIT_HOSTS.includes(parsed.hostname)) {
      throw new Error(
        `Unsupported Git host: ${parsed.hostname}. Allowed hosts: ${ALLOWED_GIT_HOSTS.join(', ')}`,
      );
    }

    return trimmed;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Invalid repository URL format: ${trimmed}`);
    }
    throw error;
  }
}

/**
 * Sanitizes command arguments for safe shell execution
 */
export function sanitizeShellArg(arg: string): string {
  if (typeof arg !== 'string') {
    throw new Error('Shell argument must be a string');
  }

  // Check for dangerous patterns first
  const dangerousPatterns = [
    ';',
    '&',
    '|',
    '`',
    '$',
    '(',
    ')',
    '{',
    '}',
    '[',
    ']',
    '\\',
    '<',
    '>',
    '?',
    '*',
    '~',
  ];

  for (const pattern of dangerousPatterns) {
    if (arg.includes(pattern)) {
      throw new Error('Shell argument becomes empty after sanitization');
    }
  }

  // Check for control characters
  if (hasControlCharacters(arg)) {
    throw new Error('Shell argument becomes empty after sanitization');
  }

  return arg.trim();
}

/**
 * Validates commands against allow-list
 */
export function validateCommand(command: string): void {
  if (!command || typeof command !== 'string') {
    throw new Error('Command must be a non-empty string');
  }

  if (!ALLOWED_COMMANDS.includes(command)) {
    throw new Error(
      `Unauthorized command: ${command}. Allowed commands: ${ALLOWED_COMMANDS.join(', ')}`,
    );
  }
}

/**
 * Validates GitHub issue IDs
 */
export function validateGitHubIds(ids: string[]): number[] {
  if (!Array.isArray(ids)) {
    throw new Error('GitHub IDs must be an array');
  }

  return ids.map((id) => {
    const parsed = parseInt(id, 10);
    if (isNaN(parsed) || parsed <= 0 || parsed >= 1000000) {
      throw new Error(`Invalid GitHub ID: ${id}`);
    }
    return parsed;
  });
}

/**
 * Early validation of GitHub issue IDs existence
 * Validates that issues exist in the target repository before workspace setup
 */
export async function validateGitHubIdsExistence(
  issueIds: number[],
  githubOrg: string,
  repoName: string,
): Promise<void> {
  // Skip validation when no issue IDs provided
  if (issueIds.length === 0) {
    return;
  }

  logger.verbose(`🔍 Validating GitHub issues exist in ${githubOrg}/${repoName}...`);

  // Check each issue ID exists
  for (const issueId of issueIds) {
    try {
      const apiUrl = `repos/${githubOrg}/${repoName}/issues/${issueId}`;
      logger.verbose(`Checking issue #${issueId}...`);

      const result = await execa('gh', ['api', apiUrl, '--jq', '.number'], { stdio: 'pipe' });

      if (result.exitCode !== 0) {
        throw new Error(`Failed to fetch issue #${issueId}`);
      }

      const returnedId = parseInt(result.stdout.trim(), 10);
      if (returnedId !== issueId) {
        throw new Error(`Issue ID mismatch: expected ${issueId}, got ${returnedId}`);
      }

      logger.verbose(`✅ Issue #${issueId} exists`);
    } catch (error) {
      const errorMessage = (error as any).stderr || (error as Error).message;

      if (errorMessage.includes('Not Found') || errorMessage.includes('404')) {
        throw new Error(
          `❌ Issue #${issueId} not found in ${githubOrg}/${repoName}. Please verify the issue exists and you have access to the repository.`,
        );
      }

      if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
        throw new Error(
          `❌ Access denied to ${githubOrg}/${repoName}. Please check your GitHub CLI authentication and repository permissions.`,
        );
      }

      if (
        errorMessage.includes('gh: command not found') ||
        errorMessage.includes('GitHub CLI is not installed')
      ) {
        throw new Error(
          `❌ GitHub CLI is not installed. Please install it from https://cli.github.com/`,
        );
      }

      // Re-throw other errors with context
      throw new Error(`❌ Failed to validate issue #${issueId}: ${errorMessage}`);
    }
  }

  logger.verbose(`✅ All ${issueIds.length} GitHub issues validated successfully`);
}

/**
 * Validates and resolves file paths to prevent traversal attacks
 */
export function validatePath(basePath: string, targetPath: string): string {
  const resolved = path.resolve(basePath, targetPath);
  if (!resolved.startsWith(path.resolve(basePath))) {
    throw new Error(`Path traversal detected: ${targetPath}`);
  }
  return resolved;
}

/**
 * Checks if required external dependencies are available
 */
export async function validateDependencies(): Promise<void> {
  const { configManager } = await import('./config.js');
  const globalConfig = configManager.getGlobal();
  const dependencies = globalConfig.dependencies || ['git', 'gh']; // Default fallback
  const missing: string[] = [];

  for (const dep of dependencies) {
    try {
      const { execa } = await import('execa');
      await execa(dep, ['--version'], { stdio: 'pipe' });
    } catch {
      missing.push(dep);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required dependencies: ${missing.join(', ')}`);
  }
}

/**
 * Validates project key format
 */
export function validateProjectKey(projectKey: string | null | undefined): string {
  if (!projectKey || typeof projectKey !== 'string' || projectKey.trim() === '') {
    throw new Error('Project key is required');
  }

  const trimmed = projectKey.trim();

  // Only allow alphanumeric, hyphens, and underscores
  if (!/^[a-zA-Z0-9-_]+$/.test(trimmed)) {
    throw new Error('Project key contains invalid characters');
  }

  // Check length limit
  if (trimmed.length > 50) {
    throw new Error('Project key contains invalid characters');
  }

  return trimmed;
}

/**
 * Validates workspace name format
 */
export function validateWorkspaceName(name: string | null | undefined): string {
  if (!name || typeof name !== 'string' || name.trim() === '') {
    throw new Error('Workspace name is required');
  }

  const trimmed = name.trim();

  // Replace spaces with hyphens and convert to lowercase
  let sanitized = trimmed.toLowerCase().replace(/\s+/g, '-');

  // Remove any remaining invalid characters (keep only alphanumeric, hyphens, and underscores)
  sanitized = sanitized.replace(/[^a-zA-Z0-9-_]/g, '');

  if (sanitized === '') {
    throw new Error('Workspace name contains no valid characters');
  }

  // Limit length to 50 characters
  if (sanitized.length > 50) {
    sanitized = sanitized.substring(0, 50);
  }

  return sanitized;
}
