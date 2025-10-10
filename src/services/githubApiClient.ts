/**
 * GitHub REST API v3 Client
 * Direct GitHub API integration using native Node.js fetch()
 * Replaces dependency on GitHub CLI (gh)
 */

/**
 * Custom error classes for GitHub API operations
 */
export class GitHubApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown,
  ) {
    super(message);
    this.name = 'GitHubApiError';
  }
}

export class GitHubAuthError extends GitHubApiError {
  constructor(
    message: string = 'GitHub authentication failed. Please set GITHUB_TOKEN environment variable.',
  ) {
    super(message, 401);
    this.name = 'GitHubAuthError';
  }
}

export class GitHubRateLimitError extends GitHubApiError {
  constructor(
    message: string = 'GitHub API rate limit exceeded',
    public resetAt?: Date,
  ) {
    super(message, 429);
    this.name = 'GitHubRateLimitError';
  }
}

export class GitHubNotFoundError extends GitHubApiError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    this.name = 'GitHubNotFoundError';
  }
}

export class GitHubNetworkError extends GitHubApiError {
  constructor(message: string = 'Network error communicating with GitHub API') {
    super(message);
    this.name = 'GitHubNetworkError';
  }
}

/**
 * Type definitions for GitHub API responses
 */
export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  user: {
    login: string;
  };
  created_at: string;
  updated_at: string;
  html_url: string;
  labels: Array<{
    name: string;
    color: string;
  }>;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  user: {
    login: string;
  };
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
  };
  created_at: string;
  updated_at: string;
  html_url: string;
  merged: boolean;
  mergeable: boolean | null;
  labels: Array<{
    name: string;
    color: string;
  }>;
}

export interface GitHubComment {
  id: number;
  body: string;
  user: {
    login: string;
  };
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface GitHubApiClientOptions {
  token?: string;
  baseUrl?: string;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * GitHub API Client
 *
 * Provides methods to interact with GitHub REST API v3
 * Uses native Node.js fetch() for HTTP requests
 * Implements retry logic with exponential backoff
 * Handles rate limiting and authentication
 */
export class GitHubApiClient {
  private readonly token: string;
  private readonly baseUrl: string;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(options: GitHubApiClientOptions = {}) {
    // Get token from options or environment variable
    this.token = options.token || process.env.GITHUB_TOKEN || '';

    // Validate token for private repo access
    if (!this.token) {
      throw new GitHubAuthError(
        'GITHUB_TOKEN environment variable is required. ' +
          'Create a personal access token at https://github.com/settings/tokens',
      );
    }

    this.baseUrl = options.baseUrl || 'https://api.github.com';
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000; // 1 second
  }

  /**
   * Make authenticated request to GitHub API with retry logic
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${this.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    };

    let lastError: Error | null = null;

    // Retry loop with exponential backoff
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers,
        });

        // Handle rate limiting
        if (response.status === 429) {
          const resetTime = response.headers.get('X-RateLimit-Reset');
          const resetAt = resetTime ? new Date(parseInt(resetTime) * 1000) : undefined;
          throw new GitHubRateLimitError(
            `Rate limit exceeded. Reset at ${resetAt?.toISOString() || 'unknown'}`,
            resetAt,
          );
        }

        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {
          throw new GitHubAuthError(
            'GitHub authentication failed. Please check your GITHUB_TOKEN is valid and has required permissions.',
          );
        }

        // Handle not found errors
        if (response.status === 404) {
          throw new GitHubNotFoundError(`Resource not found: ${endpoint}`);
        }

        // Handle other error responses
        if (!response.ok) {
          const errorBody = await response.text();
          throw new GitHubApiError(
            `GitHub API error: ${response.status} ${response.statusText}`,
            response.status,
            errorBody,
          );
        }

        // Parse successful response
        const data = await response.json();
        return data as T;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on authentication or not found errors
        if (error instanceof GitHubAuthError || error instanceof GitHubNotFoundError) {
          throw error;
        }

        // Don't retry on rate limit errors
        if (error instanceof GitHubRateLimitError) {
          throw error;
        }

        // Retry on network errors or server errors (5xx)
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // Max retries exceeded
        throw new GitHubNetworkError(
          `Failed to fetch ${endpoint} after ${this.maxRetries + 1} attempts: ${lastError.message}`,
        );
      }
    }

    // Should never reach here, but TypeScript requires it
    throw lastError || new GitHubNetworkError('Unknown error occurred');
  }

  /**
   * Get a specific issue by number
   */
  async getIssue(owner: string, repo: string, issueNumber: number): Promise<GitHubIssue> {
    return this.request<GitHubIssue>(`/repos/${owner}/${repo}/issues/${issueNumber}`);
  }

  /**
   * Get a specific pull request by number
   */
  async getPullRequest(owner: string, repo: string, prNumber: number): Promise<GitHubPullRequest> {
    return this.request<GitHubPullRequest>(`/repos/${owner}/${repo}/pulls/${prNumber}`);
  }

  /**
   * Get comments for an issue or pull request
   */
  async getComments(owner: string, repo: string, issueNumber: number): Promise<GitHubComment[]> {
    return this.request<GitHubComment[]>(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`);
  }

  /**
   * Check if a pull request exists
   */
  async pullRequestExists(owner: string, repo: string, prNumber: number): Promise<boolean> {
    try {
      await this.getPullRequest(owner, repo, prNumber);
      return true;
    } catch (error) {
      if (error instanceof GitHubNotFoundError) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Check if an issue exists
   */
  async issueExists(owner: string, repo: string, issueNumber: number): Promise<boolean> {
    try {
      await this.getIssue(owner, repo, issueNumber);
      return true;
    } catch (error) {
      if (error instanceof GitHubNotFoundError) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Parse GitHub URL to extract owner and repo
   */
  static parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    // Match various GitHub URL formats:
    // - https://github.com/owner/repo
    // - https://github.com/owner/repo.git
    // - git@github.com:owner/repo.git
    const patterns = [/github\.com[:/]([^/]+)\/([^/.]+)(\.git)?$/, /github\.com\/([^/]+)\/([^/]+)/];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2],
        };
      }
    }

    return null;
  }

  /**
   * Check if GitHub token is available
   */
  static isTokenAvailable(): boolean {
    return !!process.env.GITHUB_TOKEN;
  }

  /**
   * Get helpful error message for missing token
   */
  static getMissingTokenMessage(): string {
    return `
GitHub API access requires a personal access token.

To create a token:
1. Visit https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: 'repo' (for private repos) or 'public_repo' (for public repos only)
4. Copy the token and set it as an environment variable:
   
   export GITHUB_TOKEN=your_token_here

For more information, see: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
`.trim();
  }
}
