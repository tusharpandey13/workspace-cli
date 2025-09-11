import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { ExecutionPlanService } from '../src/services/executionPlans.js';
import type { ExecutionPlan, GitHubIssueData } from '../src/types/index.js';

const mockWorkspacePath = '/tmp/test-workspace';
const mockGithubData: GitHubIssueData[] = [
  {
    id: 2312,
    title: 'Session expires unexpectedly',
    body: 'User sessions are expiring before the expected timeout',
    state: 'open',
    type: 'issue',
    url: 'https://github.com/auth0/nextjs-auth0/issues/2312',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-16T14:30:00Z',
    labels: ['bug', 'session-management'],
    assignees: ['contributor1'],
    milestone: 'v3.1.0',
    comments_url: 'https://api.github.com/repos/auth0/nextjs-auth0/issues/2312/comments',
    links: [],
    comments: [],
    linkedIssues: [],
    fileChanges: [],
    additionalContext: [],
  },
];

describe('ExecutionPlanService', () => {
  beforeEach(async () => {
    await fs.ensureDir(mockWorkspacePath);
  });

  afterEach(async () => {
    await fs.remove(mockWorkspacePath);
    vi.clearAllMocks();
  });

  describe('generateExecutionPlan', () => {
    it('should generate execution plan for issue-fix workflow', () => {
      const plan = ExecutionPlanService.generateExecutionPlan(
        'issue-fix',
        mockWorkspacePath,
        'bugfix/expired-session',
        [2312],
        'next',
        mockGithubData,
        ['analysis.prompt.md', 'fix-and-test.prompt.md'],
      );

      expect(plan).toBeDefined();
      expect(plan.workflowType).toBe('issue-fix');
      expect(plan.branchName).toBe('bugfix/expired-session');
      expect(plan.issueIds).toEqual([2312]);
      expect(plan.status).toBe('pending');
      expect(plan.currentPhase).toBe('ANALYZE');
      expect(plan.phases).toHaveLength(6);

      // Validate ANALYZE phase has issue-fix specific steps
      const analyzePhase = plan.phases.find((p) => p.id === 'ANALYZE');
      expect(analyzePhase).toBeDefined();
      expect(analyzePhase!.steps.some((s) => s.id === 'reproduce-issue')).toBe(true);
      expect(analyzePhase!.steps.some((s) => s.id === 'root-cause-analysis')).toBe(true);
    });

    it('should generate execution plan for feature-development workflow', () => {
      const plan = ExecutionPlanService.generateExecutionPlan(
        'feature-development',
        mockWorkspacePath,
        'feature/new-auth-method',
        [],
        'next',
        [],
        ['feature-analysis.prompt.md'],
      );

      expect(plan.workflowType).toBe('feature-development');
      expect(plan.issueIds).toEqual([]);

      // Validate DESIGN phase has feature-specific steps
      const designPhase = plan.phases.find((p) => p.id === 'DESIGN');
      expect(designPhase).toBeDefined();
      expect(designPhase!.steps.some((s) => s.id === 'define-api-contract')).toBe(true);
    });

    it('should include mandatory artifacts for issue-fix workflow', () => {
      const plan = ExecutionPlanService.generateExecutionPlan(
        'issue-fix',
        mockWorkspacePath,
        'bugfix/test',
        [123],
        'next',
        mockGithubData,
        [],
      );

      expect(plan.metadata.requiredArtifacts).toContain('BUGREPORT.md');
      expect(plan.metadata.requiredArtifacts).toContain('reproduction-tests.js');
      expect(plan.metadata.requiredArtifacts).toContain('CHANGES_PR_DESCRIPTION.md');
      expect(plan.metadata.requiredArtifacts).toContain('FINAL_REPORT.md');
    });

    it('should include validation rules for issue-fix workflow', () => {
      const plan = ExecutionPlanService.generateExecutionPlan(
        'issue-fix',
        mockWorkspacePath,
        'bugfix/test',
        [123],
        'next',
        mockGithubData,
        [],
      );

      const rules = plan.metadata.validationRules;
      expect(rules.some((r) => r.id === 'issue-reproduced')).toBe(true);
      expect(rules.some((r) => r.id === 'reproduction-tests-pass')).toBe(true);
      expect(rules.some((r) => r.id === 'build-success')).toBe(true);
      expect(rules.some((r) => r.id === 'all-tests-pass')).toBe(true);
    });
  });

  describe('step enforcement', () => {
    let executionPlan: ExecutionPlan;

    beforeEach(() => {
      executionPlan = ExecutionPlanService.generateExecutionPlan(
        'issue-fix',
        mockWorkspacePath,
        'bugfix/test',
        [123],
        'next',
        mockGithubData,
        [],
      );
    });

    describe('enforceStepCompletion', () => {
      it('should allow progression when dependencies are met', async () => {
        // Complete the first step (analyze-requirements)
        const updatedPlan = ExecutionPlanService.updateStepStatus(
          executionPlan,
          'analyze-requirements',
          'completed',
        );

        // Create required artifacts for reproduce-issue step
        await fs.writeFile(
          path.join(mockWorkspacePath, 'BUGREPORT.md'),
          'Bug reproduced successfully',
        );
        await fs.writeFile(
          path.join(mockWorkspacePath, 'reproduction-tests.js'),
          'test("reproduction", () => {});',
        );

        const enforcement = await ExecutionPlanService.enforceStepCompletion(
          mockWorkspacePath,
          updatedPlan,
          'reproduce-issue',
        );

        expect(enforcement.canProceed).toBe(true);
        expect(enforcement.issues).toHaveLength(0);
      });

      it('should block progression when dependencies are not met', async () => {
        const enforcement = await ExecutionPlanService.enforceStepCompletion(
          mockWorkspacePath,
          executionPlan,
          'reproduce-issue', // depends on analyze-requirements
        );

        expect(enforcement.canProceed).toBe(false);
        expect(
          enforcement.issues.some((issue) =>
            issue.includes('Dependency step "Analyze Requirements" must be completed first'),
          ),
        ).toBe(true);
      });

      it('should validate required artifacts exist', async () => {
        // Complete dependencies
        const planWithCompletedDep = ExecutionPlanService.updateStepStatus(
          executionPlan,
          'analyze-requirements',
          'completed',
        );

        const enforcement = await ExecutionPlanService.enforceStepCompletion(
          mockWorkspacePath,
          planWithCompletedDep,
          'reproduce-issue',
        );

        expect(enforcement.canProceed).toBe(false);
        expect(
          enforcement.issues.some((issue) => issue.includes('Missing required artifacts:')),
        ).toBe(true);
      });

      it('should allow progression for non-required steps even if not completed', async () => {
        // Find a non-required step
        const nonRequiredStep = executionPlan.phases
          .flatMap((p) => p.steps)
          .find((s) => !s.isRequired);

        if (nonRequiredStep) {
          const enforcement = await ExecutionPlanService.enforceStepCompletion(
            mockWorkspacePath,
            executionPlan,
            nonRequiredStep.id,
          );

          expect(enforcement.canProceed).toBe(true);
        }
      });
    });

    describe('validateStepArtifacts', () => {
      it('should validate file existence', async () => {
        const step = executionPlan.phases[0].steps[0]; // analyze-requirements

        // Initially no artifacts
        const validation = await ExecutionPlanService.validateStepArtifacts(
          mockWorkspacePath,
          step,
        );
        expect(validation.isValid).toBe(false);
        expect(validation.missingArtifacts).toContain('analysis-notes.md');

        // Create the artifact
        await fs.writeFile(path.join(mockWorkspacePath, 'analysis-notes.md'), 'Analysis');

        const validationAfter = await ExecutionPlanService.validateStepArtifacts(
          mockWorkspacePath,
          step,
        );
        expect(validationAfter.isValid).toBe(true);
        expect(validationAfter.missingArtifacts).toHaveLength(0);
      });

      it('should handle glob patterns gracefully', async () => {
        const step = {
          ...executionPlan.phases[0].steps[0],
          artifacts: ['src/**/*.ts', 'dist/**/*'],
        };

        const validation = await ExecutionPlanService.validateStepArtifacts(
          mockWorkspacePath,
          step,
        );

        // Glob patterns should not fail validation
        expect(validation.isValid).toBe(true);
      });
    });
  });

  describe('step status management', () => {
    let executionPlan: ExecutionPlan;

    beforeEach(() => {
      executionPlan = ExecutionPlanService.generateExecutionPlan(
        'issue-fix',
        mockWorkspacePath,
        'bugfix/test',
        [123],
        'next',
        mockGithubData,
        [],
      );
    });

    it('should update step status and timestamps', () => {
      const stepId = 'analyze-requirements';

      // Mark as in-progress
      const inProgressPlan = ExecutionPlanService.updateStepStatus(
        executionPlan,
        stepId,
        'in-progress',
      );

      const step = inProgressPlan.phases[0].steps.find((s) => s.id === stepId)!;
      expect(step.status).toBe('in-progress');
      expect(step.startedAt).toBeDefined();
      expect(inProgressPlan.currentStep).toBe(stepId);

      // Mark as completed
      const completedPlan = ExecutionPlanService.updateStepStatus(
        inProgressPlan,
        stepId,
        'completed',
      );

      const completedStep = completedPlan.phases[0].steps.find((s) => s.id === stepId)!;
      expect(completedStep.status).toBe('completed');
      expect(completedStep.completedAt).toBeDefined();
    });

    it('should update phase status based on step completion', () => {
      const analyzePhase = executionPlan.phases.find((p) => p.id === 'ANALYZE')!;
      expect(analyzePhase.status).toBe('pending');

      // Complete all required steps in the phase
      let updatedPlan = executionPlan;
      for (const step of analyzePhase.steps) {
        if (step.isRequired) {
          updatedPlan = ExecutionPlanService.updateStepStatus(updatedPlan, step.id, 'completed');
        }
      }

      const updatedPhase = updatedPlan.phases.find((p) => p.id === 'ANALYZE')!;
      expect(updatedPhase.status).toBe('completed');
    });

    it('should update overall plan status', () => {
      expect(executionPlan.status).toBe('pending');

      // Complete all required phases
      let updatedPlan = executionPlan;
      for (const phase of updatedPlan.phases) {
        if (phase.isRequired) {
          for (const step of phase.steps) {
            if (step.isRequired) {
              updatedPlan = ExecutionPlanService.updateStepStatus(
                updatedPlan,
                step.id,
                'completed',
              );
            }
          }
        }
      }

      expect(updatedPlan.status).toBe('completed');
    });
  });

  describe('state persistence', () => {
    let executionPlan: ExecutionPlan;

    beforeEach(() => {
      executionPlan = ExecutionPlanService.generateExecutionPlan(
        'issue-fix',
        mockWorkspacePath,
        'bugfix/test',
        [123],
        'next',
        mockGithubData,
        [],
      );
    });

    it('should save and load execution state', async () => {
      // Save state
      await ExecutionPlanService.saveExecutionState(mockWorkspacePath, executionPlan);

      // Load state
      const loadedState = await ExecutionPlanService.loadExecutionState(mockWorkspacePath);

      expect(loadedState).toBeDefined();
      expect(loadedState!.executionPlan.id).toBe(executionPlan.id);
      expect(loadedState!.executionPlan.workflowType).toBe(executionPlan.workflowType);
      expect(loadedState!.lastSaved).toBeDefined();
    });

    it('should preserve checkpoints when saving state', async () => {
      const checkpoint = ExecutionPlanService.createCheckpoint(
        'ANALYZE',
        'analyze-requirements',
        'Analysis completed successfully',
        ['analysis-notes.md'],
      );

      // Save with checkpoint
      await ExecutionPlanService.saveExecutionState(mockWorkspacePath, executionPlan, checkpoint);

      // Load and verify checkpoint
      const loadedState = await ExecutionPlanService.loadExecutionState(mockWorkspacePath);
      expect(loadedState!.checkpoints).toHaveLength(1);
      expect(loadedState!.checkpoints[0].message).toBe('Analysis completed successfully');
    });

    it('should return null when no state file exists', async () => {
      const state = await ExecutionPlanService.loadExecutionState('/nonexistent');
      expect(state).toBeNull();
    });
  });

  describe('utility functions', () => {
    let executionPlan: ExecutionPlan;

    beforeEach(() => {
      executionPlan = ExecutionPlanService.generateExecutionPlan(
        'issue-fix',
        mockWorkspacePath,
        'bugfix/test',
        [123],
        'next',
        mockGithubData,
        [],
      );
    });

    it('should validate required steps completion', () => {
      const validation = ExecutionPlanService.validateRequiredSteps(executionPlan);
      expect(validation.isValid).toBe(false);
      expect(validation.missingSteps.length).toBeGreaterThan(0);
    });

    it('should get next actionable step', () => {
      const nextStep = ExecutionPlanService.getNextStep(executionPlan);
      expect(nextStep).toBeDefined();
      expect(nextStep!.id).toBe('analyze-requirements');
      expect(nextStep!.status).toBe('pending');
    });

    it('should get mandatory incomplete steps', () => {
      const incompleteSteps = ExecutionPlanService.getMandatoryIncompleteSteps(executionPlan);
      expect(incompleteSteps.length).toBeGreaterThan(0);
      expect(incompleteSteps.every((step) => step.isRequired)).toBe(true);
      expect(incompleteSteps.every((step) => step.status !== 'completed')).toBe(true);
    });

    it('should generate plan summary', () => {
      const summary = ExecutionPlanService.generatePlanSummary(executionPlan);
      expect(summary).toContain('Execution Plan: issue-fix');
      expect(summary).toContain('Branch: bugfix/test');
      expect(summary).toContain('MANDATORY STEPS REMAINING');
      expect(summary).toContain('Required Artifacts');
      expect(summary).toContain('BUGREPORT.md');
    });

    it('should create checkpoints with proper structure', () => {
      const checkpoint = ExecutionPlanService.createCheckpoint(
        'ANALYZE',
        'reproduce-issue',
        'Issue reproduced successfully',
        ['BUGREPORT.md', 'reproduction-tests.js'],
      );

      expect(checkpoint.id).toMatch(/^checkpoint-\d+$/);
      expect(checkpoint.phase).toBe('ANALYZE');
      expect(checkpoint.step).toBe('reproduce-issue');
      expect(checkpoint.message).toBe('Issue reproduced successfully');
      expect(checkpoint.artifacts).toEqual(['BUGREPORT.md', 'reproduction-tests.js']);
      expect(checkpoint.timestamp).toBeDefined();
    });
  });

  describe('mandatory behavior enforcement', () => {
    it('should enforce BUGREPORT.md creation for issue-fix workflows', async () => {
      const plan = ExecutionPlanService.generateExecutionPlan(
        'issue-fix',
        mockWorkspacePath,
        'bugfix/test',
        [123],
        'next',
        mockGithubData,
        [],
      );

      // Find reproduce-issue step
      const reproduceStep = plan.phases
        .flatMap((p) => p.steps)
        .find((s) => s.id === 'reproduce-issue')!;

      expect(reproduceStep.isRequired).toBe(true);
      expect(reproduceStep.artifacts).toContain('BUGREPORT.md');

      const bugReportRule = plan.metadata.validationRules.find((r) => r.id === 'issue-reproduced');
      expect(bugReportRule).toBeDefined();
      expect(bugReportRule!.isRequired).toBe(true);
      expect(bugReportRule!.target).toBe('BUGREPORT.md');
    });

    it('should enforce PR description generation', () => {
      const plan = ExecutionPlanService.generateExecutionPlan(
        'issue-fix',
        mockWorkspacePath,
        'bugfix/test',
        [123],
        'next',
        mockGithubData,
        [],
      );

      // Find generate-pr-description step
      const prStep = plan.phases
        .flatMap((p) => p.steps)
        .find((s) => s.id === 'generate-pr-description')!;

      expect(prStep.isRequired).toBe(true);
      expect(prStep.artifacts).toContain('CHANGES_PR_DESCRIPTION.md');

      const prRule = plan.metadata.validationRules.find((r) => r.id === 'pr-description-complete');
      expect(prRule).toBeDefined();
      expect(prRule!.isRequired).toBe(true);
    });

    it('should enforce final report generation', () => {
      const plan = ExecutionPlanService.generateExecutionPlan(
        'issue-fix',
        mockWorkspacePath,
        'bugfix/test',
        [123],
        'next',
        mockGithubData,
        [],
      );

      // Find prepare-final-report step
      const reportStep = plan.phases
        .flatMap((p) => p.steps)
        .find((s) => s.id === 'prepare-final-report')!;

      expect(reportStep.isRequired).toBe(true);
      expect(reportStep.artifacts).toContain('FINAL_REPORT.md');
    });
  });
});
