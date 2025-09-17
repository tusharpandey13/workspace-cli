/**
 * Universal template selection utilities - simplified for MVP
 */

/**
 * Universal template selection utilities - simplified for MVP
 */

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
 * Get template list (universal for all workflows)
 */
export function getWorkflowTemplates(): string[] {
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
