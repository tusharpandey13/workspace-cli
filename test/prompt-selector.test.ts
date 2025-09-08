import { describe, it, expect, beforeEach } from 'vitest';
import { PromptSelector } from '../src/services/promptSelector.js';
import type { GitHubIssueData, WorkflowsConfig } from '../src/types/index.js';

// Helper function to create mock GitHub issue data
function createMockGitHubIssue(overrides: Partial<GitHubIssueData> = {}): GitHubIssueData {
  return {
    id: 123,
    title: 'Test issue',
    body: 'Test body',
    state: 'open',
    type: 'issue',
    url: 'https://github.com/auth0/test/issues/123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    labels: [],
    assignees: [],
    comments: [],
    linkedIssues: [],
    fileChanges: [],
    additionalContext: [],
    ...overrides,
  };
}

describe('PromptSelector', () => {
  let promptSelector: PromptSelector;
  const mockWorkflowConfig: WorkflowsConfig = {
    'issue-fix': {
      prompts: ['analysis.prompt.md', 'fix-and-test.prompt.md', 'review-changes.prompt.md'],
      description: 'Bug fixes and hotfixes',
    },
    'feature-development': {
      prompts: ['analysis.prompt.md', 'feature-analysis.prompt.md', 'tests.prompt.md'],
      description: 'New feature development',
    },
    maintenance: {
      prompts: ['analysis.prompt.md', 'maintenance-analysis.prompt.md'],
      description: 'Maintenance tasks',
    },
    exploration: {
      prompts: ['exploration-analysis.prompt.md', 'universal-analysis.prompt.md'],
      description: 'Research and investigation',
    },
  };

  beforeEach(() => {
    promptSelector = new PromptSelector(mockWorkflowConfig);
  });

  describe('workflow detection from branch names', () => {
    it('should detect issue-fix workflow from branch names', () => {
      const testCases = [
        'fix/auth-redirect-bug',
        'bugfix/session-timeout',
        'hotfix/critical-login-error',
        'patch/security-vulnerability',
      ];

      testCases.forEach((branchName) => {
        const result = promptSelector.selectPrompts([], branchName);
        expect(result.workflowType).toBe('issue-fix');
        expect(result.selectedPrompts).toEqual(mockWorkflowConfig['issue-fix'].prompts);
        expect(result.detectionReason).toContain(branchName);
      });
    });

    it('should detect feature-development workflow from branch names', () => {
      const testCases = [
        'feature/oauth-integration',
        'feat/new-dashboard',
        'add/user-preferences',
        'implement/advanced-search',
      ];

      testCases.forEach((branchName) => {
        const result = promptSelector.selectPrompts([], branchName);
        expect(result.workflowType).toBe('feature-development');
        expect(result.selectedPrompts).toEqual(mockWorkflowConfig['feature-development'].prompts);
      });
    });

    it('should detect maintenance workflow from branch names', () => {
      const testCases = [
        'chore/update-dependencies',
        'deps/bump-react-version',
        'refactor/auth-service',
        'update/eslint-config',
        'maintenance/cleanup-tests',
      ];

      testCases.forEach((branchName) => {
        const result = promptSelector.selectPrompts([], branchName);
        expect(result.workflowType).toBe('maintenance');
        expect(result.selectedPrompts).toEqual(mockWorkflowConfig.maintenance.prompts);
      });
    });

    it('should detect exploration workflow from branch names', () => {
      const testCases = [
        'explore/new-auth-flow',
        'spike/performance-analysis',
        'investigation/memory-leak',
        'research/alternative-solutions',
      ];

      testCases.forEach((branchName) => {
        const result = promptSelector.selectPrompts([], branchName);
        expect(result.workflowType).toBe('exploration');
        expect(result.selectedPrompts).toEqual(mockWorkflowConfig.exploration.prompts);
      });
    });
  });

  describe('workflow detection from GitHub data', () => {
    it('should detect issue-fix workflow from GitHub labels', () => {
      const githubData: GitHubIssueData[] = [
        createMockGitHubIssue({
          id: 123,
          title: 'Login fails after session timeout',
          body: 'Users cannot log in after their session expires',
          labels: ['bug', 'critical'],
        }),
      ];

      const result = promptSelector.selectPrompts(githubData, 'main');
      expect(result.workflowType).toBe('issue-fix');
      expect(result.detectionReason).toContain('bug, critical');
    });

    it('should detect feature-development workflow from GitHub labels', () => {
      const githubData: GitHubIssueData[] = [
        createMockGitHubIssue({
          id: 456,
          title: 'Add new OAuth provider support',
          body: 'Implement support for additional OAuth providers',
          labels: ['enhancement', 'feature'],
        }),
      ];

      const result = promptSelector.selectPrompts(githubData, 'main');
      expect(result.workflowType).toBe('feature-development');
    });

    it('should detect maintenance workflow from GitHub content', () => {
      const githubData: GitHubIssueData[] = [
        createMockGitHubIssue({
          id: 789,
          title: 'Update dependencies',
          body: 'Update all dependencies to latest stable versions',
          labels: ['maintenance', 'dependencies'],
        }),
      ];

      const result = promptSelector.selectPrompts(githubData, 'main');
      expect(result.workflowType).toBe('maintenance');
    });
  });

  describe('fallback scenarios', () => {
    it('should default to feature-development when no GitHub data and neutral branch name', () => {
      const result = promptSelector.selectPrompts([], 'main');
      expect(result.workflowType).toBe('feature-development');
      expect(result.detectionReason).toContain('default workflow selection');
    });

    it('should prioritize branch name over unclear GitHub data', () => {
      const githubData: GitHubIssueData[] = [
        createMockGitHubIssue({
          id: 999,
          title: 'General question',
          body: 'Need some help understanding the flow',
          labels: [],
        }),
      ];

      const result = promptSelector.selectPrompts(githubData, 'fix/urgent-bug');
      expect(result.workflowType).toBe('issue-fix');
      expect(result.detectionReason).toContain('branch name pattern');
    });

    it('should use default prompts when workflow config is missing', () => {
      const emptyPromptSelector = new PromptSelector({});
      const result = emptyPromptSelector.selectPrompts([], 'feature/new-thing');
      expect(result.workflowType).toBe('feature-development');
      expect(result.selectedPrompts).toEqual([
        'analysis.prompt.md',
        'feature-analysis.prompt.md',
        'tests.prompt.md',
        'review-changes.prompt.md',
      ]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty GitHub data arrays', () => {
      const result = promptSelector.selectPrompts([], 'feature/test');
      expect(result.workflowType).toBe('feature-development');
    });

    it('should handle GitHub data with empty labels', () => {
      const githubData: GitHubIssueData[] = [
        createMockGitHubIssue({
          id: 111,
          title: 'Test issue',
          body: 'Test body',
          labels: [],
        }),
      ];

      const result = promptSelector.selectPrompts(githubData, 'main');
      expect(result.workflowType).toBe('feature-development'); // Should default when no clear indicators
    });

    it('should handle case-insensitive branch name matching', () => {
      const result = promptSelector.selectPrompts([], 'FIX/URGENT-BUG');
      expect(result.workflowType).toBe('issue-fix');
    });

    it('should handle missing title or body in GitHub data', () => {
      const githubData: GitHubIssueData[] = [
        createMockGitHubIssue({
          id: 222,
          title: '',
          body: '',
          labels: ['bug'],
        }),
      ];

      const result = promptSelector.selectPrompts(githubData, 'main');
      expect(result.workflowType).toBe('issue-fix');
    });
  });
});
