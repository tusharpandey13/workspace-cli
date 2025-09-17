import { describe, it, expect } from 'vitest';
import { getWorkflowTemplates, getWorkflowNextSteps } from '../src/utils/workflow.js';

describe('Universal Workflow System', () => {
  describe('getWorkflowTemplates', () => {
    it('should return all universal templates', () => {
      const templates = getWorkflowTemplates();

      expect(templates).toContain('analysis.prompt.md');
      expect(templates).toContain('fix-and-test.prompt.md');
      expect(templates).toContain('review-changes.prompt.md');
      expect(templates).toContain('PR_DESCRIPTION_TEMPLATE.md');
      expect(templates).toHaveLength(4);
    });

    it('should always return the same templates regardless of parameters', () => {
      const templates1 = getWorkflowTemplates();
      const templates2 = getWorkflowTemplates();

      expect(templates1).toEqual(templates2);
    });
  });

  describe('getWorkflowNextSteps', () => {
    it('should return universal next steps', () => {
      const steps = getWorkflowNextSteps();

      expect(steps).toEqual([
        '1. Review the analysis.prompt.md for comprehensive issue understanding',
        '2. Use fix-and-test.prompt.md to implement and validate changes',
        '3. Apply review-changes.prompt.md for final code review',
        '4. Complete PR_DESCRIPTION_TEMPLATE.md for submission',
      ]);
    });

    it('should always return the same steps', () => {
      const steps1 = getWorkflowNextSteps();
      const steps2 = getWorkflowNextSteps();

      expect(steps1).toEqual(steps2);
    });
  });
});
