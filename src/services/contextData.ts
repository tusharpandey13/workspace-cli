import { logger } from '../utils/logger.js';
import { GitHubApiClient, GitHubAuthError, GitHubNotFoundError } from './githubApiClient.js';
import type { GitHubIssueData, UrlContent } from '../types/index.js';
import { execa } from 'execa';

/**
 * Enhanced context data fetcher for GitHub and external URL content
 * Uses GitHub REST API v3 directly via GitHubApiClient (no gh CLI dependency)
 */
export class ContextDataFetcher {
  private cache = new Map<string, any>();
  private readonly maxCacheAge = 5 * 60 * 1000; // 5 minutes
  private apiClient: GitHubApiClient | null = null;

  /**
   * Initialize GitHub API client (lazy initialization)
   */
  private getApiClient(): GitHubApiClient {
    if (!this.apiClient) {
      this.apiClient = new GitHubApiClient();
    }
    return this.apiClient;
  }

  /**
   * Fetch comprehensive GitHub data including linked issues, comments, and file changes
   */
  async fetchGitHubData(
    issueIds: number[],
    githubOrg: string,
    repoName: string,
    isDryRun: boolean,
  ): Promise<GitHubIssueData[]> {
    // In dry-run mode, return mock data without making any network calls
    if (isDryRun) {
      logger.verbose(`[DRY RUN] Would fetch GitHub data for issues: ${issueIds.join(', ')}`);
      return issueIds.map((id) => ({
        id,
        title: `Fix authentication middleware - Issue #${id}`,
        body: `Mock issue body for #${id} in dry-run mode`,
        state: 'open',
        type: 'issue' as const,
        url: `https://github.com/${githubOrg}/${repoName}/issues/${id}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        labels: [],
        assignees: [],
        milestone: null,
        comments: [],
        linkedIssues: [],
        fileChanges: [],
        additionalContext: [],
      }));
    }

    // Initialize GitHub API client for any issues requiring API access
    // Client now supports unauthenticated mode for public repos (60/hour limit)
    if (issueIds.length > 0) {
      const client = this.getApiClient();
      const rateLimitInfo = client.getRateLimitInfo();
      logger.verbose(
        `🔗 GitHub API access: ${rateLimitInfo.resource} (${rateLimitInfo.limit}/hour limit)`,
      );
    }

    // Process all issues in parallel for better performance
    const issuePromises = issueIds.map(async (issueId) => {
      try {
        logger.verbose(`🔍 Fetching comprehensive data for #${issueId}...`);

        // Fetch basic issue/PR data
        const basicData = await this.fetchBasicGitHubItem(issueId, githubOrg, repoName, isDryRun);
        const extracted = this.extractBasicContent(basicData);

        // Enhance with comprehensive context in parallel
        await Promise.all([
          this.enhanceWithComments(extracted, githubOrg, repoName, isDryRun),
          this.enhanceWithLinkedIssues(extracted, githubOrg, repoName, isDryRun),
          this.enhanceWithFileChanges(extracted, githubOrg, repoName, isDryRun),
          this.enhanceWithAdditionalUrls(extracted, isDryRun),
        ]);

        return extracted;
      } catch (error) {
        // For critical errors (auth/API access), re-throw
        const errorMessage = (error as Error).message;
        if (
          errorMessage.includes('GitHub API authentication required') ||
          errorMessage.includes('GITHUB_TOKEN') ||
          errorMessage.includes('authentication failed')
        ) {
          throw error;
        }

        // For 404/401 errors with single issue, also re-throw for clear user feedback
        if (
          issueIds.length === 1 &&
          (errorMessage.includes('not found in') || errorMessage.includes('Access denied to'))
        ) {
          throw error;
        }

        // For other errors, log and continue
        logger.warn(`Error processing GitHub ID "${issueId}": ${errorMessage}`);
        return null;
      }
    });

    // Wait for all issues to be processed
    const results = await Promise.all(issuePromises);

    // Filter out null results (failed issues)
    return results.filter((result): result is GitHubIssueData => result !== null);
  }

  /**
   * Fetch and parse additional context URLs found in GitHub content
   */
  async fetchAdditionalContextUrls(urls: string[], isDryRun: boolean): Promise<UrlContent[]> {
    const urlContents: UrlContent[] = [];

    for (const url of urls) {
      try {
        const content = await this.fetchUrlContent(url, isDryRun);
        if (content) {
          urlContents.push(content);
        }
      } catch (error) {
        logger.warn(`Failed to fetch URL ${url}: ${(error as Error).message}`);
      }
    }

    return urlContents;
  }

  /**
   * Trusted domains allowlist for URL fetching
   * Only URLs from these specific domains will be fetched to prevent SSRF attacks
   */
  private static readonly TRUSTED_DOMAINS = new Set([
    // GitHub and related
    'github.com',
    'raw.githubusercontent.com',
    'gist.github.com',

    // Auth0 official
    'auth0.com',
    'auth0-samples.github.io',

    // Package registries
    'npmjs.com',
    'www.npmjs.com',
    'pypi.org',
    'maven.org',
    'search.maven.org',
    'crates.io',
    'packagist.org',

    // Documentation sites (specific, not wildcard)
    'docs.github.com',
    'docs.auth0.com',
    'developer.auth0.com',
    'docs.microsoft.com',
    'docs.google.com',
    'docs.python.org',
    'docs.oracle.com',
    'developer.mozilla.org',

    // Stack Overflow
    'stackoverflow.com',
    'stackexchange.com',
  ]);

  /**
   * Extract URLs from text content and validate against trusted domains
   */
  extractUrlsFromText(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s)\]]+/g;
    const matches = text.match(urlRegex) || [];

    const validUrls: string[] = [];
    const rejectedUrls: string[] = [];

    for (const url of matches) {
      try {
        const domain = new URL(url).hostname.toLowerCase();

        if (ContextDataFetcher.TRUSTED_DOMAINS.has(domain)) {
          validUrls.push(url);
        } else {
          rejectedUrls.push(url);
          logger.debug(`🚫 Rejected untrusted URL: ${url} (domain: ${domain})`);
        }
      } catch (error) {
        logger.debug(`🚫 Rejected malformed URL: ${url}`);
      }
    }

    if (rejectedUrls.length > 0) {
      logger.verbose(`🔒 Security: Blocked ${rejectedUrls.length} untrusted URL(s) for safety`);
    }

    return validUrls;
  }

  /**
   * Fetch basic GitHub issue/PR data using GitHub API client
   */
  private async fetchBasicGitHubItem(
    issueId: number,
    githubOrg: string,
    repoName: string,
    isDryRun: boolean,
  ): Promise<any> {
    const cacheKey = `github:${githubOrg}:${repoName}:${issueId}`;

    if (this.isCacheValid(cacheKey)) {
      logger.verbose(`📋 Using cached data for #${issueId}`);
      return this.cache.get(cacheKey).data;
    }

    if (isDryRun) {
      return this.createMockGitHubData(issueId, 'issue');
    }

    try {
      logger.verbose(`🔍 Fetching data for #${issueId} via GitHub API...`);
      const apiClient = this.getApiClient();

      // Try to fetch as issue first (GitHub API treats PRs as issues for this endpoint)
      const data = await apiClient.getIssue(githubOrg, repoName, issueId);

      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      // Provide more specific error messages for common GitHub API errors
      if (error instanceof GitHubNotFoundError) {
        throw new Error(
          `Issue #${issueId} not found in ${githubOrg}/${repoName}. Please verify the issue exists and you have access to the repository.`,
        );
      }

      if (error instanceof GitHubAuthError) {
        throw new Error(
          `Access denied to ${githubOrg}/${repoName}. Please check your GITHUB_TOKEN has required permissions.`,
        );
      }

      throw new Error(`Failed to fetch GitHub item #${issueId}: ${(error as Error).message}`);
    }
  }

  /**
   * Extract basic content from GitHub data
   */
  private extractBasicContent(data: any): GitHubIssueData {
    return {
      id: data.number,
      title: data.title,
      body: data.body || '',
      state: data.state,
      type: data.pull_request ? 'pull_request' : 'issue',
      url: data.html_url,
      created_at: data.created_at,
      updated_at: data.updated_at,
      labels: data.labels?.map((label: any) => label.name) || [],
      assignees: data.assignees?.map((assignee: any) => assignee.login) || [],
      milestone: data.milestone?.title || null,
      comments: [],
      linkedIssues: [],
      fileChanges: [],
      additionalContext: [],
    };
  }

  /**
   * Enhance with comments data using GitHub API client
   */
  private async enhanceWithComments(
    extracted: GitHubIssueData,
    githubOrg: string,
    repoName: string,
    isDryRun: boolean,
  ): Promise<void> {
    try {
      logger.verbose(`💬 Fetching comments for #${extracted.id}...`);

      if (isDryRun) {
        extracted.comments = [
          {
            author: 'dry-run-user',
            body: 'Mock comment with additional context',
            created_at: '2025-01-01',
            links: [],
          },
        ];
        return;
      }

      const apiClient = this.getApiClient();
      const comments = await apiClient.getComments(githubOrg, repoName, extracted.id);

      extracted.comments = comments.map((comment: any) => ({
        author: comment.user?.login || 'unknown',
        body: comment.body || '',
        created_at: comment.created_at,
        links: this.extractUrlsFromText(comment.body || ''),
      }));
    } catch (error) {
      logger.warn(`Failed to fetch comments for #${extracted.id}: ${(error as Error).message}`);
      extracted.comments = [];
    }
  }

  /**
   * Enhance with linked issues/PRs
   */
  private async enhanceWithLinkedIssues(
    extracted: GitHubIssueData,
    githubOrg: string,
    repoName: string,
    isDryRun: boolean,
  ): Promise<void> {
    try {
      logger.verbose(`🔗 Searching for linked issues for #${extracted.id}...`);

      if (isDryRun) {
        extracted.linkedIssues = [
          { id: 999, title: 'Related mock issue', url: 'https://github.com/mock/repo/issues/999' },
        ];
        return;
      }

      // Search for references to this issue in other issues/PRs
      const allText = `${extracted.body} ${extracted.comments.map((c) => c.body).join(' ')}`;
      const issueRefs = allText.match(/#(\d+)/g) || [];
      const uniqueRefs = [...new Set(issueRefs.map((ref) => parseInt(ref.slice(1))))].filter(
        (id) => id !== extracted.id,
      );

      for (const refId of uniqueRefs.slice(0, 5)) {
        // Limit to 5 linked issues
        try {
          const linkedData = await this.fetchBasicGitHubItem(refId, githubOrg, repoName, false);
          extracted.linkedIssues.push({
            id: linkedData.number,
            title: linkedData.title,
            url: linkedData.html_url,
          });
        } catch (error) {
          // Ignore failed linked issue fetches
        }
      }
    } catch (error) {
      logger.warn(
        `Failed to fetch linked issues for #${extracted.id}: ${(error as Error).message}`,
      );
      extracted.linkedIssues = [];
    }
  }

  /**
   * Enhance with file changes (for PRs) using GitHub API client
   */
  private async enhanceWithFileChanges(
    extracted: GitHubIssueData,
    githubOrg: string,
    repoName: string,
    isDryRun: boolean,
  ): Promise<void> {
    if (extracted.type !== 'pull_request') {
      extracted.fileChanges = [];
      return;
    }

    try {
      logger.verbose(`📁 Fetching file changes for PR #${extracted.id}...`);

      if (isDryRun) {
        extracted.fileChanges = [
          { filename: 'src/auth/session.ts', status: 'modified', additions: 15, deletions: 3 },
          { filename: 'tests/auth.test.ts', status: 'added', additions: 45, deletions: 0 },
        ];
        return;
      }

      const apiClient = this.getApiClient();
      const files = await apiClient.getFileChanges(githubOrg, repoName, extracted.id);

      extracted.fileChanges = files.map((file: any) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
      }));
    } catch (error) {
      logger.warn(
        `Failed to fetch file changes for PR #${extracted.id}: ${(error as Error).message}`,
      );
      extracted.fileChanges = [];
    }
  }

  /**
   * Enhance with additional URL content
   */
  private async enhanceWithAdditionalUrls(
    extracted: GitHubIssueData,
    isDryRun: boolean,
  ): Promise<void> {
    try {
      logger.verbose(`🌐 Fetching additional context URLs for #${extracted.id}...`);

      // Extract URLs from body and comments
      const allText = `${extracted.body} ${extracted.comments.map((c) => c.body).join(' ')}`;
      const urls = this.extractUrlsFromText(allText);

      extracted.additionalContext = await this.fetchAdditionalContextUrls(urls, isDryRun);
    } catch (error) {
      logger.warn(
        `Failed to fetch additional URLs for #${extracted.id}: ${(error as Error).message}`,
      );
      extracted.additionalContext = [];
    }
  }

  /**
   * Fetch content from a URL
   */
  private async fetchUrlContent(url: string, isDryRun: boolean): Promise<UrlContent | null> {
    const cacheKey = `url:${url}`;

    if (this.isCacheValid(cacheKey)) {
      logger.verbose(`📋 Using cached content for ${url}`);
      return this.cache.get(cacheKey).data;
    }

    // Additional security check: Validate domain before fetching
    try {
      const domain = new URL(url).hostname.toLowerCase();
      if (!ContextDataFetcher.TRUSTED_DOMAINS.has(domain)) {
        logger.debug(`🚫 Security: Blocked fetch attempt to untrusted domain: ${domain}`);
        return null;
      }
    } catch (error) {
      logger.debug(`🚫 Security: Blocked fetch attempt to malformed URL: ${url}`);
      return null;
    }

    if (isDryRun) {
      return {
        url,
        title: 'Mock URL Title',
        content: 'Mock content from external URL with relevant context',
        domain: new URL(url).hostname,
      };
    }

    try {
      // Use curl for simple content fetching
      const result = await execa(
        'curl',
        ['-s', '-L', '--max-time', '10', '--user-agent', 'workspace-cli', url],
        { stdio: 'pipe' },
      );
      const html = result.stdout;

      // Extract title and basic content
      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : 'No title';

      // Basic content extraction (remove HTML tags, get first 1000 chars)
      const textContent = html
        .replace(/<script[^>]*>.*?<\/script>/gis, '')
        .replace(/<style[^>]*>.*?<\/style>/gis, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 1000);

      const urlContent: UrlContent = {
        url,
        title,
        content: textContent,
        domain: new URL(url).hostname,
      };

      this.cache.set(cacheKey, { data: urlContent, timestamp: Date.now() });
      return urlContent;
    } catch (error) {
      // More user-friendly warning for URL fetch failures
      logger.verbose(`⚠️  Skipping external URL (unreachable): ${url}`);
      logger.debug(`URL fetch error details: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Check if cache entry is valid
   */
  private isCacheValid(key: string): boolean {
    const entry = this.cache.get(key);
    return entry && Date.now() - entry.timestamp < this.maxCacheAge;
  }

  /**
   * Create mock GitHub data for dry run
   */
  private createMockGitHubData(issueId: number, type: string): any {
    return {
      number: issueId,
      title:
        type === 'pull_request'
          ? 'Add new session refresh mechanism'
          : 'Fix authentication middleware token validation error',
      body: 'Dry run data - this would contain the actual issue/PR body with detailed description and links to relevant documentation',
      state: 'open',
      html_url: `https://github.com/example/repo/${type === 'pull_request' ? 'pull' : 'issues'}/${issueId}`,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      comments_url: `https://api.github.com/repos/example/repo/issues/${issueId}/comments`,
      labels: [{ name: 'bug' }, { name: 'priority:high' }],
      assignees: [{ login: 'developer' }],
      milestone: { title: 'v2.1.0' },
      pull_request: type === 'pull_request' ? {} : undefined,
    };
  }
}
