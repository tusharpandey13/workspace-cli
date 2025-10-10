import { logger } from './logger.js';
import { executeGhCommand } from './secureExecution.js';

/**
 * GitHub repository information extracted from URL
 */
export interface GitHubRepoInfo {
  org: string;
  repo: string;
  isGitHub: boolean;
}

/**
 * PR branch information from GitHub API
 */
export interface PullRequestInfo {
  number: number;
  branchName: string;
  title: string;
  state: string;
  headSha: string;
}

/**
 * Cache for GitHub repository information to avoid repeated parsing
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SessionCache<T> {
  private cache = new Map<string, CacheEntry<T>>();

  set(key: string, data: T, ttlMs: number = 300000): void {
    // 5 min default TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  size(): number {
    // Clean expired entries
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
    return this.cache.size;
  }
}

const repoInfoCache = new SessionCache<GitHubRepoInfo>();

/**
 * Cache management utilities for debugging and maintenance
 */
export const cacheUtils = {
  clearAllCaches: () => {
    repoInfoCache.clear();
    prInfoCache.clear();
  },

  getCacheStats: () => ({
    repoInfoCache: repoInfoCache.size(),
    prInfoCache: prInfoCache.size(),
  }),

  invalidateRepo: (repoUrl: string) => {
    // Clear repo info for specific URL
    const keys = [repoUrl];
    keys.forEach((key) => repoInfoCache.get(key)); // This will clean expired entries
  },

  invalidatePR: (githubOrg: string, repoName: string, prId?: number) => {
    if (prId) {
      const cacheKey = `${githubOrg}/${repoName}/pr/${prId}`;
      prInfoCache.get(cacheKey); // This will clean expired entries
    }
  },
};

/**
 * Extract GitHub organization and repository name from a repository URL with caching
 * Handles both HTTPS and SSH formats
 *
 * @param repoUrl - Repository URL (e.g., https://github.com/org/repo.git)
 * @returns GitHub repo info with org, repo, and isGitHub flag
 */
export function extractGitHubRepoInfo(repoUrl: string): GitHubRepoInfo {
  // Check cache first
  const cached = repoInfoCache.get(repoUrl);
  if (cached) {
    return cached;
  }

  if (!repoUrl.includes('github.com')) {
    // Extract repo name from path for non-GitHub URLs
    const segments = repoUrl.split('/');
    const repoWithGit = segments[segments.length - 1];
    const repoName = repoWithGit?.replace(/\.git$/, '') || 'unknown';

    const result = {
      org: 'unknown',
      repo: repoName,
      isGitHub: false,
    };

    // Cache the result
    repoInfoCache.set(repoUrl, result);
    return result;
  }

  // Handle both HTTPS and SSH formats
  // HTTPS: https://github.com/org/repo.git
  // SSH: git@github.com:org/repo.git
  const httpsMatch = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)\.git/);
  if (httpsMatch) {
    const result = {
      org: httpsMatch[1],
      repo: httpsMatch[2],
      isGitHub: true,
    };

    // Cache the result
    repoInfoCache.set(repoUrl, result);
    return result;
  }

  // Handle GitHub URLs without .git suffix
  const noGitMatch = repoUrl.match(/github\.com[/:]([^/]+)\/([^/]+)$/);
  if (noGitMatch) {
    const result = {
      org: noGitMatch[1],
      repo: noGitMatch[2],
      isGitHub: true,
    };

    // Cache the result
    repoInfoCache.set(repoUrl, result);
    return result;
  }

  // Fallback: extract repo name from path
  const segments = repoUrl.split('/');
  const repoWithGit = segments[segments.length - 1];
  const repoName = repoWithGit?.replace(/\.git$/, '') || 'unknown';

  const result = {
    org: 'unknown',
    repo: repoName,
    isGitHub: repoUrl.includes('github.com'),
  };

  // Cache the result
  repoInfoCache.set(repoUrl, result);
  return result;
}

/**
 * Fetch PR information using GitHub API instead of cloning
 * This replaces the expensive git clone + checkout operation
 *
 * @param prId - Pull request number
 * @param githubOrg - GitHub organization
 * @param repoName - Repository name
 * @param isDryRun - Whether this is a dry run
 * @returns Promise resolving to PR information
 */
export async function fetchPullRequestInfo(
  prId: number,
  githubOrg: string,
  repoName: string,
  isDryRun: boolean,
): Promise<PullRequestInfo> {
  if (isDryRun) {
    logger.verbose(`[DRY RUN] Would fetch PR #${prId} from ${githubOrg}/${repoName}`);
    return {
      number: prId,
      branchName: `pr-${prId}`,
      title: `Mock PR #${prId} for dry run`,
      state: 'open',
      headSha: '1234567890abcdef',
    };
  }

  try {
    logger.verbose(`🔍 Fetching PR #${prId} metadata from GitHub API...`);

    // Use GitHub CLI to get PR information
    const result = await executeGhCommand(
      ['api', `repos/${githubOrg}/${repoName}/pulls/${prId}`],
      {},
    );

    if (result.exitCode !== 0) {
      throw new Error(`GitHub API call failed: ${result.stderr}`);
    }

    const prData = JSON.parse(result.stdout);

    // Extract branch name from head reference
    const branchName = prData.head?.ref;
    if (!branchName) {
      throw new Error(`Unable to determine branch name for PR #${prId}`);
    }

    const prInfo: PullRequestInfo = {
      number: prData.number,
      branchName,
      title: prData.title,
      state: prData.state,
      headSha: prData.head?.sha || 'unknown',
    };

    logger.verbose(`✅ PR #${prId} branch identified: ${branchName}`);
    return prInfo;
  } catch (error) {
    const errorMessage = (error as Error).message;

    // Provide specific error messages for common issues
    if (errorMessage.includes('Not Found') || errorMessage.includes('404')) {
      throw new Error(
        `PR #${prId} not found in ${githubOrg}/${repoName}. Please verify the PR exists and you have access.`,
      );
    }

    if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
      throw new Error(
        `Access denied to ${githubOrg}/${repoName}. Please check your GitHub CLI authentication.`,
      );
    }

    throw new Error(`Failed to fetch PR #${prId}: ${errorMessage}`);
  }
}

/**
 * Check if GitHub CLI is available and authenticated
 * Used to determine if we can use API-based PR identification
 *
 * @returns Promise resolving to availability status
 */
export async function isGitHubCliAvailable(): Promise<boolean> {
  try {
    const result = await executeGhCommand(['--version'], {});
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Cache for PR information to avoid repeated API calls within a session
 */
const prInfoCache = new SessionCache<PullRequestInfo>();
const PR_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get PR information with caching to avoid repeated API calls
 *
 * @param prId - Pull request number
 * @param githubOrg - GitHub organization
 * @param repoName - Repository name
 * @param isDryRun - Whether this is a dry run
 * @returns Promise resolving to cached or fresh PR information
 */
export async function getCachedPullRequestInfo(
  prId: number,
  githubOrg: string,
  repoName: string,
  isDryRun: boolean,
): Promise<PullRequestInfo> {
  const cacheKey = `${githubOrg}/${repoName}/pr/${prId}`;
  const cached = prInfoCache.get(cacheKey);

  // Return cached data if valid
  if (cached) {
    logger.verbose(`📋 Using cached PR #${prId} information`);
    return cached;
  }

  // Fetch fresh data
  const prInfo = await fetchPullRequestInfo(prId, githubOrg, repoName, isDryRun);

  // Cache the result with the current PR_CACHE_TTL
  prInfoCache.set(cacheKey, prInfo, PR_CACHE_TTL);

  return prInfo;
}
