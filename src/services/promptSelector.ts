import { logger } from '../utils/logger.js';
import type {
  GitHubIssueData,
  WorkflowType,
  WorkflowsConfig,
  PromptSelectionResult,
} from '../types/index.js';

/**
 * Intelligent prompt selection service for workflow-based template generation
 * Implements Phase 2 requirements from the improvement plan
 */
export class PromptSelector {
  private workflowConfigs: WorkflowsConfig;

  constructor(workflowConfigs: WorkflowsConfig = {}) {
    this.workflowConfigs = workflowConfigs;
  }

  /**
   * Update workflow configurations
   */
  updateWorkflowConfigs(configs: WorkflowsConfig): void {
    this.workflowConfigs = configs;
  }

  /**
   * Select appropriate prompts based on GitHub data and branch context
   */
  selectPrompts(
    githubData: GitHubIssueData[],
    branchName: string,
    _projectKey?: string,
  ): PromptSelectionResult {
    const workflowType = this.detectWorkflowType(githubData, branchName);
    const selectedPrompts = this.getPromptsForWorkflow(workflowType);
    const detectionReason = this.buildDetectionReason(workflowType, githubData, branchName);

    logger.info(`Detected workflow: ${workflowType}`);
    logger.debug(`Selected prompts: ${selectedPrompts.join(', ')}`);
    logger.debug(`Detection reason: ${detectionReason}`);

    return {
      workflowType,
      selectedPrompts,
      detectionReason,
    };
  }

  /**
   * Detect workflow type based on GitHub issue data and branch naming patterns
   */
  private detectWorkflowType(githubData: GitHubIssueData[], branchName: string): WorkflowType {
    // Check branch naming patterns first (more explicit)
    const branchWorkflow = this.detectWorkflowFromBranch(branchName);
    if (branchWorkflow) {
      return branchWorkflow;
    }

    // Check GitHub issue labels and content if available
    if (githubData && githubData.length > 0) {
      const githubWorkflow = this.detectWorkflowFromGitHub(githubData);
      if (githubWorkflow) {
        return githubWorkflow;
      }
      // If we have GitHub data but can't determine workflow, default to feature-development
      return 'feature-development';
    }

    // No GitHub data and no clear branch pattern
    // Check if branch suggests exploration, otherwise default to feature-development
    if (this.isBranchExploration(branchName)) {
      return 'exploration';
    }

    // Final fallback
    return 'feature-development';
  }

  /**
   * Detect workflow from branch naming patterns
   */
  private detectWorkflowFromBranch(branchName: string): WorkflowType | null {
    const lowerBranch = branchName.toLowerCase();

    // Issue/bug fix patterns
    if (
      lowerBranch.includes('fix/') ||
      lowerBranch.includes('bugfix/') ||
      lowerBranch.includes('hotfix/') ||
      lowerBranch.includes('patch/')
    ) {
      return 'issue-fix';
    }

    // Feature development patterns
    if (
      lowerBranch.includes('feature/') ||
      lowerBranch.includes('feat/') ||
      lowerBranch.includes('add/') ||
      lowerBranch.includes('implement/')
    ) {
      return 'feature-development';
    }

    // Maintenance patterns
    if (
      lowerBranch.includes('chore/') ||
      lowerBranch.includes('deps/') ||
      lowerBranch.includes('refactor/') ||
      lowerBranch.includes('update/') ||
      lowerBranch.includes('maintenance/')
    ) {
      return 'maintenance';
    }

    // Exploration patterns
    if (
      lowerBranch.includes('explore/') ||
      lowerBranch.includes('spike/') ||
      lowerBranch.includes('investigation/') ||
      lowerBranch.includes('research/')
    ) {
      return 'exploration';
    }

    return null;
  }

  /**
   * Detect workflow from GitHub issue data (labels, titles, content)
   */
  private detectWorkflowFromGitHub(githubData: GitHubIssueData[]): WorkflowType | null {
    const allLabels = githubData.flatMap((issue) => issue.labels || []);
    const allTitles = githubData
      .map((issue) => issue.title || '')
      .join(' ')
      .toLowerCase();
    const allBodies = githubData
      .map((issue) => issue.body || '')
      .join(' ')
      .toLowerCase();
    const combinedText = `${allTitles} ${allBodies}`;

    // Check labels first (most explicit)
    const labelText = allLabels.join(' ').toLowerCase();

    // Bug/fix detection
    if (
      labelText.includes('bug') ||
      labelText.includes('fix') ||
      labelText.includes('hotfix') ||
      labelText.includes('critical') ||
      labelText.includes('urgent')
    ) {
      return 'issue-fix';
    }

    // Maintenance detection
    if (
      labelText.includes('maintenance') ||
      labelText.includes('deps') ||
      labelText.includes('chore') ||
      labelText.includes('dependency') ||
      labelText.includes('cleanup') ||
      labelText.includes('refactor')
    ) {
      return 'maintenance';
    }

    // Feature detection
    if (
      labelText.includes('enhancement') ||
      labelText.includes('feature') ||
      labelText.includes('improvement') ||
      labelText.includes('new')
    ) {
      return 'feature-development';
    }

    // Exploration detection
    if (
      labelText.includes('investigation') ||
      labelText.includes('research') ||
      labelText.includes('exploration') ||
      labelText.includes('question')
    ) {
      return 'exploration';
    }

    // Check content if labels don't provide clear indication
    if (
      combinedText.includes('broken') ||
      combinedText.includes('not working') ||
      combinedText.includes('error') ||
      combinedText.includes('fails')
    ) {
      return 'issue-fix';
    }

    if (
      combinedText.includes('add') ||
      combinedText.includes('implement') ||
      combinedText.includes('new feature')
    ) {
      return 'feature-development';
    }

    return null;
  }

  /**
   * Check if branch name suggests exploration work
   */
  private isBranchExploration(branchName: string): boolean {
    const lowerBranch = branchName.toLowerCase();
    return (
      lowerBranch.includes('explore') ||
      lowerBranch.includes('spike') ||
      lowerBranch.includes('investigation') ||
      lowerBranch.includes('research') ||
      lowerBranch.includes('test')
    );
  }

  /**
   * Get prompts for a specific workflow type
   */
  private getPromptsForWorkflow(workflowType: WorkflowType): string[] {
    const workflowConfig = this.workflowConfigs[workflowType];

    if (workflowConfig && workflowConfig.prompts) {
      return workflowConfig.prompts;
    }

    // Fallback defaults if configuration is missing
    return this.getDefaultPromptsForWorkflow(workflowType);
  }

  /**
   * Default prompt sets for each workflow type
   */
  private getDefaultPromptsForWorkflow(workflowType: WorkflowType): string[] {
    const defaultPrompts = {
      'issue-fix': ['analysis.prompt.md', 'fix-and-test.prompt.md', 'review-changes.prompt.md'],
      'feature-development': [
        'analysis.prompt.md',
        'feature-analysis.prompt.md',
        'tests.prompt.md',
        'review-changes.prompt.md',
      ],
      maintenance: [
        'analysis.prompt.md',
        'maintenance-analysis.prompt.md',
        'tests.prompt.md',
        'review-changes.prompt.md',
      ],
      exploration: ['exploration-analysis.prompt.md', 'universal-analysis.prompt.md'],
    };

    return defaultPrompts[workflowType] || defaultPrompts['feature-development'];
  }

  /**
   * Build human-readable detection reason
   */
  private buildDetectionReason(
    workflowType: WorkflowType,
    githubData: GitHubIssueData[],
    branchName: string,
  ): string {
    const reasons: string[] = [];

    // Branch name reasoning
    const branchDetection = this.detectWorkflowFromBranch(branchName);
    if (branchDetection === workflowType) {
      reasons.push(`branch name pattern: '${branchName}'`);
    }

    // GitHub data reasoning
    if (githubData && githubData.length > 0) {
      const githubDetection = this.detectWorkflowFromGitHub(githubData);
      if (githubDetection === workflowType) {
        const labels = githubData.flatMap((issue) => issue.labels || []);
        if (labels.length > 0) {
          reasons.push(`GitHub labels: ${labels.join(', ')}`);
        } else {
          reasons.push('GitHub issue content analysis');
        }
      }
    } else if (workflowType === 'exploration') {
      reasons.push('no GitHub issue context provided');
    }

    // Fallback reasoning
    if (reasons.length === 0) {
      reasons.push('default workflow selection');
    }

    return `Detected based on: ${reasons.join('; ')}`;
  }
}
