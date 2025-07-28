import path from 'path';

/**
 * Validates and sanitizes user input for branch names
 */
export function validateBranchName(branchName: string | null | undefined): string {
  if (!branchName || typeof branchName !== 'string' || branchName.trim() === '') {
    throw new Error('Branch name is required');
  }

  const trimmed = branchName.trim();
  
  // Check for dangerous patterns that should cause errors
  const dangerousPatterns = [
    /^--/,           // starts with --
    /\.\./,          // contains ../
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      throw new Error(`Branch name contains invalid patterns: ${branchName}`);
    }
  }
  
  // Sanitize by removing dangerous characters and everything after them
  let sanitized = trimmed;
  
  // For semicolon, truncate everything after it (command injection protection)
  const semicolonIndex = sanitized.indexOf(';');
  if (semicolonIndex !== -1) {
    sanitized = sanitized.substring(0, semicolonIndex);
  }
  
  // For other dangerous characters, just remove them but keep the rest
  sanitized = sanitized.replace(/[<>"|&`$()]/g, '');
  
  // Limit length
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }
  
  return sanitized;
}

/**
 * Validates GitHub issue IDs
 */
export function validateGitHubIds(ids: string[]): number[] {
  if (!Array.isArray(ids)) {
    throw new Error('GitHub IDs must be an array');
  }
  
  return ids.map(id => {
    const parsed = parseInt(id, 10);
    if (isNaN(parsed) || parsed <= 0 || parsed >= 1000000) {
      throw new Error(`Invalid GitHub ID: ${id}`);
    }
    return parsed;
  });
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
  const dependencies = ['git', 'gh', 'pnpm'];
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
  
  // Sanitize by keeping only alphanumeric, hyphens, and underscores
  let sanitized = trimmed.replace(/[^a-zA-Z0-9-_]/g, '');
  
  if (sanitized === '') {
    throw new Error('Workspace name contains no valid characters');
  }
  
  // Limit length to 50 characters
  if (sanitized.length > 50) {
    sanitized = sanitized.substring(0, 50);
  }
  
  return sanitized;
}
