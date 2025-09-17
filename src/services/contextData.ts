import { execa } from 'execa';
import { logger } from '../utils/logger.js';
import type { GitHubIssueData, UrlContent } from '../types/index.js';

/**
 * Enhanced context data fetcher for GitHub and external URL content
 * Implements Phase 1 requirements from the improvement plan
 */
export class ContextDataFetcher {
  private cache = new Map<string, any>();
  private readonly maxCacheAge = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch comprehensive GitHub data including linked issues, comments, and file changes
   */
  async fetchGitHubData(
    issueIds: number[],
    githubOrg: string,
    repoName: string,
    isDryRun: boolean,
  ): Promise<GitHubIssueData[]> {
    const githubData: GitHubIssueData[] = [];

    for (const issueId of issueIds) {
      try {
        logger.verbose(`🔍 Fetching comprehensive data for #${issueId}...`);

        // Fetch basic issue/PR data
        const basicData = await this.fetchBasicGitHubItem(issueId, githubOrg, repoName, isDryRun);
        const extracted = this.extractBasicContent(basicData);

        // Enhance with comprehensive context
        await this.enhanceWithComments(extracted, githubOrg, repoName, isDryRun);
        await this.enhanceWithLinkedIssues(extracted, githubOrg, repoName, isDryRun);
        await this.enhanceWithFileChanges(extracted, githubOrg, repoName, isDryRun);
        await this.enhanceWithAdditionalUrls(extracted, isDryRun);

        githubData.push(extracted);
      } catch (error) {
        logger.warn(`Error processing GitHub ID "${issueId}": ${(error as Error).message}`);
      }
    }

    return githubData;
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
   * Extract URLs from text content
   */
  extractUrlsFromText(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s)\]]+/g;
    const matches = text.match(urlRegex) || [];

    // Filter for relevant URLs (documentation, Stack Overflow, GitHub, etc.)
    return matches.filter((url) => {
      const domain = new URL(url).hostname.toLowerCase();
      return (
        domain.includes('github.com') ||
        domain.includes('auth0.com') ||
        domain.includes('stackoverflow.com') ||
        domain.includes('docs.') ||
        domain.includes('developer.') ||
        domain.includes('api.') ||
        domain.includes('npmjs.com') ||
        domain.includes('pypi.org') ||
        domain.includes('maven.org') ||
        domain.includes('crates.io') ||
        domain.includes('packagist.org')
      );
    });
  }

  /**
   * Fetch basic GitHub issue/PR data
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
      const apiUrl = `repos/${githubOrg}/${repoName}/issues/${issueId}`;
      logger.verbose(`🐛 Making GitHub API call: gh api ${apiUrl}`);
      const result = await execa('gh', ['api', apiUrl], { stdio: 'pipe' });
      const data = JSON.parse(result.stdout);

      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
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
   * Enhance with comments data
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

      const result = await execa(
        'gh',
        ['api', `repos/${githubOrg}/${repoName}/issues/${extracted.id}/comments`],
        { stdio: 'pipe' },
      );
      const comments = JSON.parse(result.stdout);

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
   * Enhance with file changes (for PRs)
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

      const result = await execa(
        'gh',
        ['api', `repos/${githubOrg}/${repoName}/pulls/${extracted.id}/files`],
        { stdio: 'pipe' },
      );
      const files = JSON.parse(result.stdout);

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
      logger.warn(`Failed to fetch URL content from ${url}: ${(error as Error).message}`);
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
