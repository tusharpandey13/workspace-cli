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
    'PR_REVIEW_INSTRUCTIONS.md',
    'enhanced-analysis.prompt.md',
  ];
}

/**
 * Get template set for workflows with sample app reproduction
 */
function getSampleAppTemplates(): string[] {
  return [
    'analysis-with-sample.prompt.md',
    'fix-and-test.prompt.md',
    'review-changes.prompt.md',
    'PR_DESCRIPTION_TEMPLATE.md',
    'PR_REVIEW_INSTRUCTIONS.md',
    'enhanced-analysis.prompt.md',
  ];
}

/**
 * Check if project has sample app configured
 */
export function hasSampleApp(project: ProjectConfig): boolean {
  return !!(project.sample_repo && project.sample_repo.trim());
}

/**
 * Get template list based on project configuration
 */
export function getWorkflowTemplates(project?: ProjectConfig): string[] {
  if (project && hasSampleApp(project)) {
    return getSampleAppTemplates();
  }
  return getDefaultTemplates();
}

/**
 * Get template list based on project configuration and user choice
 */
export function getWorkflowTemplatesWithChoice(project?: ProjectConfig): string[] {
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
- Enhanced analysis: \`enhanced-analysis.prompt.md\`
- Implementation: \`fix-and-test.prompt.md\`
- Review changes: \`review-changes.prompt.md\`
- PR review guide: \`PR_REVIEW_INSTRUCTIONS.md\``;
}
