import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { getWorkflowTemplates, getWorkflowTemplatesWithChoice } from '../src/utils/workflow.js';
import type { ProjectConfig } from '../src/types/index.js';

describe('Claude-Inspired Template Integration', () => {
  describe('Template Selection with Claude Patterns', () => {
    it('should include Claude-inspired templates for projects without sample repos', () => {
      const project: ProjectConfig = {
        key: 'test-project',
        name: 'Test Project',
        repo: 'https://github.com/test/test-repo.git',
      };

      const templates = getWorkflowTemplates(project);

      expect(templates).toContain('analysis.prompt.md');
      expect(templates).toContain('enhanced-analysis.prompt.md');
      expect(templates).toContain('PR_REVIEW_INSTRUCTIONS.md');
      expect(templates).toContain('PR_DESCRIPTION_TEMPLATE.md');
      expect(templates).toContain('fix-and-test.prompt.md');
      expect(templates).toContain('review-changes.prompt.md');
      expect(templates).not.toContain('analysis-with-sample.prompt.md');
    });

    it('should include Claude-inspired templates for projects with sample repos', () => {
      const project: ProjectConfig = {
        key: 'test-project',
        name: 'Test Project',
        repo: 'https://github.com/test/test-repo.git',
        sample_repo: 'https://github.com/test/test-samples.git',
      };

      const templates = getWorkflowTemplates(project);

      expect(templates).toContain('analysis-with-sample.prompt.md');
      expect(templates).toContain('enhanced-analysis.prompt.md');
      expect(templates).toContain('PR_REVIEW_INSTRUCTIONS.md');
      expect(templates).toContain('PR_DESCRIPTION_TEMPLATE.md');
      expect(templates).toContain('fix-and-test.prompt.md');
      expect(templates).toContain('review-changes.prompt.md');
      expect(templates).not.toContain('analysis.prompt.md');
    });

    it('should include enhanced templates in workflow choice function', () => {
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

      // Both should include Claude-inspired templates
      expect(templatesWithSample).toContain('enhanced-analysis.prompt.md');
      expect(templatesWithSample).toContain('PR_REVIEW_INSTRUCTIONS.md');
      expect(templatesWithoutSample).toContain('enhanced-analysis.prompt.md');
      expect(templatesWithoutSample).toContain('PR_REVIEW_INSTRUCTIONS.md');
    });
  });

  describe('Template Content Validation', () => {
    it('should verify PR_REVIEW_INSTRUCTIONS.md contains Claude patterns', async () => {
      const templatesDir = path.join(process.cwd(), 'src/templates');
      const reviewInstructionsPath = path.join(templatesDir, 'PR_REVIEW_INSTRUCTIONS.md');

      if (await fs.pathExists(reviewInstructionsPath)) {
        const content = await fs.readFile(reviewInstructionsPath, 'utf-8');

        // Check for key Claude patterns
        expect(content).toContain('Intent Analysis Framework');
        expect(content).toContain('Structured Review Process');
        expect(content).toContain('Security Assessment');
        expect(content).toContain('CRITICAL RULES for suggestions');
        expect(content).toContain('Overall Assessment');
        expect(content).toContain('Progress Tracking Template');
      }
    });

    it('should verify enhanced-analysis.prompt.md contains Claude patterns', async () => {
      const templatesDir = path.join(process.cwd(), 'src/templates');
      const enhancedAnalysisPath = path.join(templatesDir, 'enhanced-analysis.prompt.md');

      if (await fs.pathExists(enhancedAnalysisPath)) {
        const content = await fs.readFile(enhancedAnalysisPath, 'utf-8');

        // Check for key Claude patterns
        expect(content).toContain('Pre-Analysis Assessment (MANDATORY');
        expect(content).toContain('Veto Trigger');
        expect(content).toContain('Intent Analysis Framework');
        expect(content).toContain('Smart Diff Analysis (Claude-Inspired)');
        expect(content).toContain('Security & Quality Assessment');
        expect(content).toContain('Quality Gates');
      }
    });

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
        expect(content).toContain('Claude-inspired validation patterns');
      }
    });
  });

  describe('Template File Existence', () => {
    it('should verify all Claude-inspired template files exist', async () => {
      const templatesDir = path.join(process.cwd(), 'src/templates');
      const expectedTemplates = ['PR_REVIEW_INSTRUCTIONS.md', 'enhanced-analysis.prompt.md'];

      for (const template of expectedTemplates) {
        const templatePath = path.join(templatesDir, template);
        const exists = await fs.pathExists(templatePath);
        expect(exists).toBe(true);
      }
    });

    it('should verify template placeholders are properly formatted', async () => {
      const templatesDir = path.join(process.cwd(), 'src/templates');
      const templateFiles = ['PR_REVIEW_INSTRUCTIONS.md', 'enhanced-analysis.prompt.md'];

      for (const templateFile of templateFiles) {
        const templatePath = path.join(templatesDir, templateFile);

        if (await fs.pathExists(templatePath)) {
          const content = await fs.readFile(templatePath, 'utf-8');

          // Check for standard placeholders
          const placeholders = [
            '{{PROJECT_NAME}}',
            '{{ISSUE_IDS}}',
            '{{BRANCH_NAME}}',
            '{{REPO_URL}}',
          ];

          for (const placeholder of placeholders) {
            expect(content).toContain(placeholder);
          }
        }
      }
    });
  });
});
