import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { getWorkflowTemplates, getWorkflowTemplatesWithChoice } from '../src/utils/workflow.js';
import type { ProjectConfig } from '../src/types/index.js';

describe('Advanced Template Integration', () => {
  describe('Template Selection with Structured Patterns', () => {
    it('should include structured templates for projects without sample repos', () => {
      const project: ProjectConfig = {
        key: 'test-project',
        name: 'Test Project',
        repo: 'https://github.com/test/test-repo.git',
      };

      const templates = getWorkflowTemplates(project);

      expect(templates).toContain('analysis.prompt.md');
      expect(templates).toContain('PR_DESCRIPTION_TEMPLATE.md');
      expect(templates).toContain('fix-and-test.prompt.md');
      expect(templates).toContain('review-changes.prompt.md');
      expect(templates).not.toContain('enhanced-analysis.prompt.md');
      expect(templates).not.toContain('PR_REVIEW_INSTRUCTIONS.md');
    });

    it('should include structured templates for projects with sample repos', () => {
      const project: ProjectConfig = {
        key: 'test-project',
        name: 'Test Project',
        repo: 'https://github.com/test/test-repo.git',
        sample_repo: 'https://github.com/test/test-samples.git',
      };

      const templates = getWorkflowTemplates(project);

      expect(templates).toContain('analysis.prompt.md');
      expect(templates).toContain('PR_DESCRIPTION_TEMPLATE.md');
      expect(templates).toContain('fix-and-test.prompt.md');
      expect(templates).toContain('review-changes.prompt.md');
      expect(templates).not.toContain('enhanced-analysis.prompt.md');
      expect(templates).not.toContain('PR_REVIEW_INSTRUCTIONS.md');
    });

    it('should include essential templates in workflow choice function', () => {
      const projectWithSample: ProjectConfig = {
        key: 'test-with-sample',
        name: 'Test Project',
        repo: 'https://github.com/test/test-repo.git',
        sample_repo: 'https://github.com/test/test-samples.git',
      };

      const projectWithoutSample: ProjectConfig = {
        key: 'test-without-sample',
        name: 'Test Project',
        repo: 'https://github.com/test/test-repo.git',
      };

      const templatesWithSample = getWorkflowTemplatesWithChoice(projectWithSample);
      const templatesWithoutSample = getWorkflowTemplatesWithChoice(projectWithoutSample);

      // Both should NOT include PR_REVIEW_INSTRUCTIONS.md anymore
      expect(templatesWithSample).not.toContain('PR_REVIEW_INSTRUCTIONS.md');
      expect(templatesWithoutSample).not.toContain('PR_REVIEW_INSTRUCTIONS.md');
      // enhanced-analysis.prompt.md should not be included in either
      expect(templatesWithSample).not.toContain('enhanced-analysis.prompt.md');
      expect(templatesWithoutSample).not.toContain('enhanced-analysis.prompt.md');
    });
  });

  describe('Template Content Validation', () => {
    it('should verify PR_DESCRIPTION_TEMPLATE.md has strong emphasis patterns', async () => {
      const templatesDir = path.join(process.cwd(), 'src/templates');
      const prTemplatePath = path.join(templatesDir, 'PR_DESCRIPTION_TEMPLATE.md');

      if (await fs.pathExists(prTemplatePath)) {
        const content = await fs.readFile(prTemplatePath, 'utf-8');

        // Check for strong emphasis patterns
        expect(content).toContain('🚨 MANDATORY PR DESCRIPTION REQUIREMENTS');
        expect(content).toContain('⚠️ CRITICAL');
        expect(content).toContain('PRE-SUBMISSION VALIDATION (MANDATORY)');
        expect(content).toContain('Stop Gates - Answer "NO" to ANY = DO NOT SUBMIT');
        expect(content).toContain('🛑 If you answered "NO"');
        expect(content).toContain('SECURITY CONSIDERATIONS');
        expect(content).toContain('MANDATORY for bug fixes');
        expect(content).toContain('Structured validation patterns');
      }
    });
  });
});
