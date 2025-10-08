/**
 * Universal template selection utilities with sample app support
 */

import type { ProjectConfig } from '../types/index.js';

/**
 * Get universal template set for all workflows
 */
function getDefaultTemplates(): string[] {
  return [
    'analysis.prompt.md',
    'fix-and-test.prompt.md',
    'review-changes.prompt.md',
    'PR_DESCRIPTION_TEMPLATE.md',
  ];
}

/**
 * Get template set for workflows with sample app reproduction
 */
function getSampleAppTemplates(): string[] {
  return [
    'analysis.prompt.md',
    'fix-and-test.prompt.md',
    'review-changes.prompt.md',
    'PR_DESCRIPTION_TEMPLATE.md',
  ];
}

/**
 * Check if project has sample app configured
 */
export function hasSampleApp(project: ProjectConfig): boolean {
  return !!(project.sample_repo && project.sample_repo.trim());
}

/**
 * Get minimal template set for when no GitHub context is available
 */
function getMinimalTemplates(): string[] {
  return ['review-changes.prompt.md', 'PR_DESCRIPTION_TEMPLATE.md'];
}

/**
 * Get template list based on project configuration
 */
export function getWorkflowTemplates(
  project?: ProjectConfig,
  hasGitHubContext: boolean = true,
): string[] {
  // If no GitHub context, return minimal template set
  if (!hasGitHubContext) {
    return getMinimalTemplates();
  }

  if (project && hasSampleApp(project)) {
    return getSampleAppTemplates();
  }
  return getDefaultTemplates();
}

/**
 * Get template list based on project configuration and user choice
 */
export function getWorkflowTemplatesWithChoice(
  project?: ProjectConfig,
  hasGitHubContext: boolean = true,
): string[] {
  // If no GitHub context, return minimal template set
  if (!hasGitHubContext) {
    return getMinimalTemplates();
  }

  if (project && hasSampleApp(project)) {
    return getSampleAppTemplates();
  }
  return getDefaultTemplates();
}

/**
 * Get universal next step recommendations
 */
export function getWorkflowNextSteps(): string {
  return `**Next recommended prompt:**

- Issue analysis: \`analysis.prompt.md\`
- Implementation: \`fix-and-test.prompt.md\`
- Review changes: \`review-changes.prompt.md\``;
}
