import { describe, it, expect, beforeEach } from 'vitest';
import { getWorkflowTemplates, getWorkflowTemplatesWithChoice } from '../src/utils/workflow.js';
import type { ProjectConfig } from '../src/types/index.js';

describe('Conditional Template Copying', () => {
  let mockProject: ProjectConfig;

  beforeEach(() => {
    mockProject = {
      key: 'test-project',
      name: 'Test Project',
      repo: 'https://github.com/test/repo.git',
    };
  });

  describe('getWorkflowTemplates', () => {
    it('should return minimal templates when no GitHub context is available', () => {
      const templates = getWorkflowTemplates(mockProject, false);

      expect(templates).toEqual([
        'review-changes.prompt.md',
        'PR_DESCRIPTION_TEMPLATE.md',
        'PR_REVIEW_INSTRUCTIONS.md',
      ]);
    });

    it('should return full templates when GitHub context is available', () => {
      const templates = getWorkflowTemplates(mockProject, true);

      expect(templates).toEqual([
        'analysis.prompt.md',
        'fix-and-test.prompt.md',
        'review-changes.prompt.md',
        'PR_DESCRIPTION_TEMPLATE.md',
        'PR_REVIEW_INSTRUCTIONS.md',
        'enhanced-analysis.prompt.md',
      ]);
    });

    it('should return sample app templates when project has sample repo and GitHub context', () => {
      const projectWithSample: ProjectConfig = {
        ...mockProject,
        sample_repo: 'https://github.com/test/sample.git',
      };

      const templates = getWorkflowTemplates(projectWithSample, true);

      expect(templates).toEqual([
        'analysis-with-sample.prompt.md',
        'fix-and-test.prompt.md',
        'review-changes.prompt.md',
        'PR_DESCRIPTION_TEMPLATE.md',
        'PR_REVIEW_INSTRUCTIONS.md',
        'enhanced-analysis.prompt.md',
      ]);
    });

    it('should return minimal templates even for sample projects when no GitHub context', () => {
      const projectWithSample: ProjectConfig = {
        ...mockProject,
        sample_repo: 'https://github.com/test/sample.git',
      };

      const templates = getWorkflowTemplates(projectWithSample, false);

      expect(templates).toEqual([
        'review-changes.prompt.md',
        'PR_DESCRIPTION_TEMPLATE.md',
        'PR_REVIEW_INSTRUCTIONS.md',
      ]);
    });

    it('should default to full templates when hasGitHubContext parameter is not provided', () => {
      const templates = getWorkflowTemplates(mockProject);

      expect(templates).toEqual([
        'analysis.prompt.md',
        'fix-and-test.prompt.md',
        'review-changes.prompt.md',
        'PR_DESCRIPTION_TEMPLATE.md',
        'PR_REVIEW_INSTRUCTIONS.md',
        'enhanced-analysis.prompt.md',
      ]);
    });
  });

  describe('getWorkflowTemplatesWithChoice', () => {
    it('should return minimal templates when no GitHub context is available', () => {
      const templates = getWorkflowTemplatesWithChoice(mockProject, false);

      expect(templates).toEqual([
        'review-changes.prompt.md',
        'PR_DESCRIPTION_TEMPLATE.md',
        'PR_REVIEW_INSTRUCTIONS.md',
      ]);
    });

    it('should return full templates when GitHub context is available', () => {
      const templates = getWorkflowTemplatesWithChoice(mockProject, true);

      expect(templates).toEqual([
        'analysis.prompt.md',
        'fix-and-test.prompt.md',
        'review-changes.prompt.md',
        'PR_DESCRIPTION_TEMPLATE.md',
        'PR_REVIEW_INSTRUCTIONS.md',
        'enhanced-analysis.prompt.md',
      ]);
    });
  });
});
