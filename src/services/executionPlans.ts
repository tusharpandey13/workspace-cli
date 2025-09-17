import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger.js';
import { FileSystemError } from '../utils/errors.js';
import type {
  ExecutionPlan,
  ExecutionPhase,
  ExecutionStep,
  ExecutionState,
  ExecutionCheckpoint,
  WorkflowType,
  WorkflowPhase,
  StepStatus,
  ValidationRule,
  GitHubIssueData,
} from '../types/index.js';

/**
 * Service for managing execution plans and workflow orchestration
 */
export class ExecutionPlanService {
  private static readonly STATE_FILE = '.workspace-state.json';
  private static readonly PLAN_VERSION = '1.0.0';

  /**
   * Generate execution plan for a specific workflow type
   */
  static generateExecutionPlan(
    workflowType: WorkflowType,
    workspacePath: string,
    branchName: string,
    issueIds: number[],
    projectKey: string,
    githubData: GitHubIssueData[],
    selectedPrompts: string[],
  ): ExecutionPlan {
    const planId = `${workflowType}-${branchName}-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const phases = this.generatePhases(workflowType, issueIds.length > 0);
    const requiredArtifacts = this.getRequiredArtifacts(workflowType);
    const validationRules = this.getValidationRules(workflowType);

    return {
      id: planId,
      workflowType,
      workspacePath,
      branchName,
      issueIds,
      createdAt: timestamp,
      updatedAt: timestamp,
      version: this.PLAN_VERSION,
      phases,
      status: 'pending',
      currentPhase: 'ANALYZE',
      currentStep: phases[0]?.steps[0]?.id,
      metadata: {
        projectKey,
        githubData,
        selectedPrompts,
        requiredArtifacts,
        validationRules,
      },
    };
  }

  /**
   * Generate workflow phases based on workflow type
   */
  private static generatePhases(workflowType: WorkflowType, hasIssues: boolean): ExecutionPhase[] {
    const basePhases: ExecutionPhase[] = [
      this.createAnalyzePhase(hasIssues),
      this.createDesignPhase(workflowType),
      this.createImplementPhase(workflowType),
      this.createValidatePhase(workflowType),
      this.createReflectPhase(),
      this.createHandoffPhase(),
    ];

    return basePhases;
  }

  /**
   * Create ANALYZE phase with issue-specific steps
   */
  private static createAnalyzePhase(hasIssues: boolean): ExecutionPhase {
    const steps: ExecutionStep[] = [
      {
        id: 'analyze-requirements',
        name: 'Analyze Requirements',
        description: 'Question feature premise and validate underlying problem',
        phase: 'ANALYZE',
        dependencies: [],
        artifacts: ['analysis-notes.md'],
        validations: ['analysis-complete'],
        estimatedDuration: '15-30 minutes',
        isRequired: true,
        status: 'pending',
      },
    ];

    if (hasIssues) {
      steps.push(
        {
          id: 'reproduce-issue',
          name: 'Reproduce Issue',
          description: 'Reproduce the reported issue in sample app with failing tests',
          phase: 'ANALYZE',
          dependencies: ['analyze-requirements'],
          artifacts: ['reproduction-tests.js'],
          validations: ['issue-reproduced', 'failing-tests-exist'],
          estimatedDuration: '30-60 minutes',
          isRequired: true,
          status: 'pending',
        },
        {
          id: 'root-cause-analysis',
          name: 'Root Cause Analysis',
          description: 'Identify root cause with test-based evidence',
          phase: 'ANALYZE',
          dependencies: ['reproduce-issue'],
          artifacts: ['root-cause-analysis.md'],
          validations: ['root-cause-identified'],
          estimatedDuration: '20-40 minutes',
          isRequired: true,
          status: 'pending',
        },
      );
    }

    return {
      id: 'ANALYZE',
      name: 'Analysis Phase',
      description: 'Problem domain isolation and root cause identification',
      steps,
      status: 'pending',
      isRequired: true,
    };
  }

  /**
   * Create DESIGN phase based on workflow type
   */
  private static createDesignPhase(workflowType: WorkflowType): ExecutionPhase {
    const steps: ExecutionStep[] = [
      {
        id: 'design-approach',
        name: 'Design Approach',
        description: 'Plan implementation approach following existing patterns',
        phase: 'DESIGN',
        dependencies:
          workflowType === 'issue-fix' ? ['root-cause-analysis'] : ['analyze-requirements'],
        artifacts: ['design-plan.md'],
        validations: ['design-complete'],
        estimatedDuration: '20-40 minutes',
        isRequired: true,
        status: 'pending',
      },
      {
        id: 'define-api-contract',
        name: 'Define API Contract',
        description: 'Design API contract and integration points',
        phase: 'DESIGN',
        dependencies: ['design-approach'],
        artifacts: ['api-contract.md'],
        validations: ['api-contract-defined'],
        estimatedDuration: '15-30 minutes',
        isRequired: workflowType === 'feature-development',
        status: 'pending',
      },
      {
        id: 'plan-testing-strategy',
        name: 'Plan Testing Strategy',
        description: 'Define comprehensive testing strategy focusing on behaviors',
        phase: 'DESIGN',
        dependencies: ['design-approach'],
        artifacts: ['testing-strategy.md'],
        validations: ['testing-strategy-complete'],
        estimatedDuration: '15-25 minutes',
        isRequired: true,
        status: 'pending',
      },
    ];

    return {
      id: 'DESIGN',
      name: 'Design Phase',
      description: 'Implementation planning and architecture design',
      steps,
      status: 'pending',
      isRequired: true,
    };
  }

  /**
   * Create IMPLEMENT phase
   */
  private static createImplementPhase(workflowType: WorkflowType): ExecutionPhase {
    const steps: ExecutionStep[] = [
      {
        id: 'implement-core-changes',
        name: 'Implement Core Changes',
        description: 'Implement changes in small, testable increments',
        phase: 'IMPLEMENT',
        dependencies: ['plan-testing-strategy'],
        artifacts: ['src/**/*.ts', 'lib/**/*.ts'],
        validations: ['code-implemented', 'build-success'],
        estimatedDuration: '60-120 minutes',
        isRequired: true,
        status: 'pending',
      },
      {
        id: 'build-and-publish',
        name: 'Build and Publish',
        description: 'Build SDK and publish to yalc for local testing',
        phase: 'IMPLEMENT',
        dependencies: ['implement-core-changes'],
        artifacts: ['dist/**/*', '.yalc-publish-success'],
        validations: ['build-success', 'yalc-publish-success'],
        estimatedDuration: '5-10 minutes',
        isRequired: true,
        status: 'pending',
      },
      {
        id: 'test-in-sample-app',
        name: 'Test in Sample App',
        description: 'Validate changes work in sample app environment',
        phase: 'IMPLEMENT',
        dependencies: ['build-and-publish'],
        artifacts: ['sample-app-test-results.md'],
        validations: ['sample-app-tests-pass'],
        estimatedDuration: '15-30 minutes',
        isRequired: workflowType === 'issue-fix',
        status: 'pending',
      },
    ];

    return {
      id: 'IMPLEMENT',
      name: 'Implementation Phase',
      description: 'Code implementation and integration',
      steps,
      status: 'pending',
      isRequired: true,
    };
  }

  /**
   * Create VALIDATE phase
   */
  private static createValidatePhase(workflowType: WorkflowType): ExecutionPhase {
    const steps: ExecutionStep[] = [
      {
        id: 'run-unit-tests',
        name: 'Run Unit Tests',
        description: 'Execute unit tests with configured test runner',
        phase: 'VALIDATE',
        dependencies: ['implement-core-changes'],
        artifacts: ['test-results.json', 'coverage-report.html'],
        validations: ['all-tests-pass', 'coverage-adequate'],
        estimatedDuration: '10-20 minutes',
        isRequired: true,
        status: 'pending',
      },
      {
        id: 'run-integration-tests',
        name: 'Run Integration Tests',
        description: 'Execute integration tests for critical workflows',
        phase: 'VALIDATE',
        dependencies: ['run-unit-tests'],
        artifacts: ['integration-test-results.json'],
        validations: ['integration-tests-pass'],
        estimatedDuration: '15-30 minutes',
        isRequired: true,
        status: 'pending',
      },
      {
        id: 'validate-fix-reproduction',
        name: 'Validate Fix with Reproduction',
        description: 'Confirm fix resolves original issue using reproduction tests',
        phase: 'VALIDATE',
        dependencies: ['run-integration-tests', 'test-in-sample-app'],
        artifacts: ['fix-validation-results.md'],
        validations: ['reproduction-tests-pass', 'issue-resolved'],
        estimatedDuration: '20-40 minutes',
        isRequired: workflowType === 'issue-fix',
        status: 'pending',
      },
      {
        id: 'security-review',
        name: 'Security Review',
        description: 'Review security implications and validate OWASP compliance',
        phase: 'VALIDATE',
        dependencies: ['run-integration-tests'],
        artifacts: ['security-review.md'],
        validations: ['security-review-complete'],
        estimatedDuration: '15-30 minutes',
        isRequired: true,
        status: 'pending',
      },
    ];

    return {
      id: 'VALIDATE',
      name: 'Validation Phase',
      description: 'Comprehensive testing and validation',
      steps,
      status: 'pending',
      isRequired: true,
    };
  }

  /**
   * Create REFLECT phase
   */
  private static createReflectPhase(): ExecutionPhase {
    const steps: ExecutionStep[] = [
      {
        id: 'generate-change-review',
        name: 'Generate Change Review',
        description: 'Create comprehensive review of all changes made',
        phase: 'REFLECT',
        dependencies: ['security-review'],
        artifacts: ['CHANGES_REVIEW.md'],
        validations: ['change-review-complete'],
        estimatedDuration: '20-30 minutes',
        isRequired: true,
        status: 'pending',
      },
      {
        id: 'identify-tech-debt',
        name: 'Identify Technical Debt',
        description: 'Document technical debt created or resolved',
        phase: 'REFLECT',
        dependencies: ['generate-change-review'],
        artifacts: ['tech-debt-analysis.md'],
        validations: ['tech-debt-documented'],
        estimatedDuration: '10-20 minutes',
        isRequired: true,
        status: 'pending',
      },
      {
        id: 'document-lessons-learned',
        name: 'Document Lessons Learned',
        description: 'Capture insights and improvement opportunities',
        phase: 'REFLECT',
        dependencies: ['identify-tech-debt'],
        artifacts: ['lessons-learned.md'],
        validations: ['lessons-documented'],
        estimatedDuration: '15-25 minutes',
        isRequired: true,
        status: 'pending',
      },
    ];

    return {
      id: 'REFLECT',
      name: 'Reflection Phase',
      description: 'Change review and continuous improvement',
      steps,
      status: 'pending',
      isRequired: true,
    };
  }

  /**
   * Create HANDOFF phase
   */
  private static createHandoffPhase(): ExecutionPhase {
    const steps: ExecutionStep[] = [
      {
        id: 'generate-pr-description',
        name: 'Generate PR Description',
        description: 'Create comprehensive PR description from changes',
        phase: 'HANDOFF',
        dependencies: ['document-lessons-learned'],
        artifacts: ['CHANGES_PR_DESCRIPTION.md'],
        validations: ['pr-description-complete'],
        estimatedDuration: '10-20 minutes',
        isRequired: true,
        status: 'pending',
      },
      {
        id: 'prepare-final-report',
        name: 'Prepare Final Report',
        description: 'Generate final run report with task completion summary',
        phase: 'HANDOFF',
        dependencies: ['generate-pr-description'],
        artifacts: ['FINAL_REPORT.md'],
        validations: ['final-report-complete'],
        estimatedDuration: '15-25 minutes',
        isRequired: true,
        status: 'pending',
      },
      {
        id: 'validate-deliverables',
        name: 'Validate Deliverables',
        description: 'Ensure all required artifacts and documentation exist',
        phase: 'HANDOFF',
        dependencies: ['prepare-final-report'],
        artifacts: ['deliverables-checklist.md'],
        validations: ['all-deliverables-present'],
        estimatedDuration: '5-10 minutes',
        isRequired: true,
        status: 'pending',
      },
    ];

    return {
      id: 'HANDOFF',
      name: 'Handoff Phase',
      description: 'Final deliverables and documentation',
      steps,
      status: 'pending',
      isRequired: true,
    };
  }

  /**
   * Get required artifacts for workflow type
   */
  private static getRequiredArtifacts(workflowType: WorkflowType): string[] {
    const baseArtifacts = [
      'CHANGES_PR_DESCRIPTION.md',
      'CHANGES_REVIEW.md',
      'FINAL_REPORT.md',
      'test-results.json',
    ];

    if (workflowType === 'issue-fix') {
      return [...baseArtifacts, 'reproduction-tests.js', 'fix-validation-results.md'];
    }

    if (workflowType === 'feature-development') {
      return [...baseArtifacts, 'api-contract.md', 'feature-tests.js'];
    }

    return baseArtifacts;
  }

  /**
   * Get validation rules for workflow type
   */
  private static getValidationRules(workflowType: WorkflowType): ValidationRule[] {
    const baseRules: ValidationRule[] = [
      {
        id: 'build-success',
        name: 'Build Success',
        description: 'Project builds without errors',
        type: 'command-success',
        target: 'build', // Use configured post-init or project-specific build command
        isRequired: true,
      },
      {
        id: 'all-tests-pass',
        name: 'All Tests Pass',
        description: 'All unit and integration tests pass',
        type: 'command-success',
        target: 'test', // Use configured test command based on project type
        isRequired: true,
      },
      {
        id: 'pr-description-complete',
        name: 'PR Description Complete',
        description: 'CHANGES_PR_DESCRIPTION.md exists and is populated',
        type: 'file-exists',
        target: 'CHANGES_PR_DESCRIPTION.md',
        isRequired: true,
      },
    ];

    if (workflowType === 'issue-fix') {
      baseRules.push({
        id: 'reproduction-tests-pass',
        name: 'Reproduction Tests Pass',
        description: 'Reproduction tests validate the fix',
        type: 'content-contains',
        target: 'fix-validation-results.md',
        expectedValue: 'REPRODUCTION_TESTS_PASS',
        isRequired: true,
      });
    }

    return baseRules;
  }

  /**
   * Save execution state to workspace
   */
  static async saveExecutionState(
    workspacePath: string,
    executionPlan: ExecutionPlan,
    checkpoint?: ExecutionCheckpoint,
  ): Promise<void> {
    const statePath = path.join(workspacePath, this.STATE_FILE);

    const state: ExecutionState = {
      executionPlan: {
        ...executionPlan,
        updatedAt: new Date().toISOString(),
      },
      lastSaved: new Date().toISOString(),
      checkpoints: checkpoint ? [checkpoint] : [],
    };

    try {
      // Load existing state to preserve checkpoints
      if (await fs.pathExists(statePath)) {
        const existingState = await this.loadExecutionState(workspacePath);
        if (existingState) {
          state.checkpoints = [...existingState.checkpoints];
          if (checkpoint) {
            state.checkpoints.push(checkpoint);
          }
        }
      }

      await fs.writeJson(statePath, state, { spaces: 2 });
      logger.debug(`Execution state saved to ${statePath}`);
    } catch (error) {
      throw new FileSystemError(
        `Failed to save execution state: ${(error as Error).message}`,
        error as Error,
      );
    }
  }

  /**
   * Load execution state from workspace
   */
  static async loadExecutionState(workspacePath: string): Promise<ExecutionState | null> {
    const statePath = path.join(workspacePath, this.STATE_FILE);

    try {
      if (!(await fs.pathExists(statePath))) {
        return null;
      }

      const state = (await fs.readJson(statePath)) as ExecutionState;

      // Validate state version compatibility
      if (state.executionPlan.version !== this.PLAN_VERSION) {
        logger.warn(
          `Execution plan version mismatch. Expected ${this.PLAN_VERSION}, got ${state.executionPlan.version}`,
        );
      }

      return state;
    } catch (error) {
      logger.error(`Failed to load execution state: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Update step status in execution plan
   */
  static updateStepStatus(
    executionPlan: ExecutionPlan,
    stepId: string,
    status: StepStatus,
    errorMessage?: string,
  ): ExecutionPlan {
    const updatedPlan = { ...executionPlan };

    for (const phase of updatedPlan.phases) {
      const step = phase.steps.find((s) => s.id === stepId);
      if (step) {
        step.status = status;
        if (errorMessage !== undefined) {
          step.errorMessage = errorMessage;
        }

        if (status === 'in-progress') {
          step.startedAt = new Date().toISOString();
        } else if (status === 'completed' || status === 'failed') {
          step.completedAt = new Date().toISOString();
        }

        // Update phase status based on step statuses
        this.updatePhaseStatus(phase);

        // Update current step/phase
        if (status === 'in-progress') {
          updatedPlan.currentPhase = phase.id;
          updatedPlan.currentStep = stepId;
        }

        break;
      }
    }

    // Update overall plan status
    this.updatePlanStatus(updatedPlan);

    return updatedPlan;
  }

  /**
   * Update phase status based on step statuses
   */
  private static updatePhaseStatus(phase: ExecutionPhase): void {
    const requiredSteps = phase.steps.filter((step) => step.isRequired);
    const allSteps = phase.steps;

    if (requiredSteps.every((step) => step.status === 'completed')) {
      phase.status = 'completed';
    } else if (requiredSteps.some((step) => step.status === 'failed')) {
      phase.status = 'failed';
    } else if (allSteps.some((step) => step.status === 'in-progress')) {
      phase.status = 'in-progress';
    } else if (allSteps.some((step) => step.status === 'completed')) {
      phase.status = 'in-progress';
    } else {
      phase.status = 'pending';
    }
  }

  /**
   * Update overall plan status
   */
  private static updatePlanStatus(plan: ExecutionPlan): void {
    const requiredPhases = plan.phases.filter((phase) => phase.isRequired);

    if (requiredPhases.every((phase) => phase.status === 'completed')) {
      plan.status = 'completed';
    } else if (requiredPhases.some((phase) => phase.status === 'failed')) {
      plan.status = 'failed';
    } else if (requiredPhases.some((phase) => phase.status === 'in-progress')) {
      plan.status = 'in-progress';
    } else {
      plan.status = 'pending';
    }
  }

  /**
   * Validate that all required steps are completed
   */
  static validateRequiredSteps(executionPlan: ExecutionPlan): {
    isValid: boolean;
    missingSteps: string[];
  } {
    const missingSteps: string[] = [];

    for (const phase of executionPlan.phases) {
      if (phase.isRequired && phase.status !== 'completed') {
        for (const step of phase.steps) {
          if (step.isRequired && step.status !== 'completed') {
            missingSteps.push(`${phase.name} > ${step.name}`);
          }
        }
      }
    }

    return {
      isValid: missingSteps.length === 0,
      missingSteps,
    };
  }

  /**
   * Get next actionable step in execution plan
   */
  static getNextStep(executionPlan: ExecutionPlan): ExecutionStep | null {
    for (const phase of executionPlan.phases) {
      for (const step of phase.steps) {
        if (step.status === 'pending') {
          // Check if all dependencies are completed
          const dependenciesMet = step.dependencies.every((depId) => {
            for (const depPhase of executionPlan.phases) {
              const depStep = depPhase.steps.find((s) => s.id === depId);
              if (depStep) {
                return depStep.status === 'completed';
              }
            }
            return false;
          });

          if (dependenciesMet) {
            return step;
          }
        }
      }
    }

    return null;
  }

  /**
   * Generate execution plan checkpoint
   */
  static createCheckpoint(
    phase: WorkflowPhase,
    step: string,
    message: string,
    artifacts: string[] = [],
  ): ExecutionCheckpoint {
    return {
      id: `checkpoint-${Date.now()}`,
      timestamp: new Date().toISOString(),
      phase,
      step,
      message,
      artifacts,
    };
  }

  /**
   * ENHANCED ENFORCEMENT MECHANISMS
   */

  /**
   * Validate that all mandatory artifacts exist for a step
   */
  static async validateStepArtifacts(
    workspacePath: string,
    step: ExecutionStep,
  ): Promise<{ isValid: boolean; missingArtifacts: string[] }> {
    const missingArtifacts: string[] = [];

    for (const artifact of step.artifacts) {
      const artifactPath = path.join(workspacePath, artifact);
      try {
        // Handle glob patterns for artifacts like src/**/*.ts
        if (artifact.includes('*')) {
          // For glob patterns, we just check if any files match
          continue;
        }

        if (!(await fs.pathExists(artifactPath))) {
          missingArtifacts.push(artifact);
        }
      } catch (error) {
        logger.warn(`Error checking artifact ${artifact}: ${(error as Error).message}`);
        missingArtifacts.push(artifact);
      }
    }

    return {
      isValid: missingArtifacts.length === 0,
      missingArtifacts,
    };
  }

  /**
   * Validate step completion requirements
   */
  static async validateStepCompletion(
    workspacePath: string,
    step: ExecutionStep,
    validationRules: ValidationRule[],
  ): Promise<{ isValid: boolean; failedValidations: string[] }> {
    const failedValidations: string[] = [];

    for (const validationId of step.validations) {
      const rule = validationRules.find((r) => r.id === validationId);
      if (!rule) {
        logger.warn(`Validation rule ${validationId} not found`);
        continue;
      }

      if (rule.isRequired) {
        const isValid = await this.executeValidationRule(workspacePath, rule);
        if (!isValid) {
          failedValidations.push(rule.name);
        }
      }
    }

    return {
      isValid: failedValidations.length === 0,
      failedValidations,
    };
  }

  /**
   * Execute a validation rule
   */
  private static async executeValidationRule(
    workspacePath: string,
    rule: ValidationRule,
  ): Promise<boolean> {
    try {
      switch (rule.type) {
        case 'file-exists': {
          const filePath = path.join(workspacePath, rule.target);
          return await fs.pathExists(filePath);
        }

        case 'content-contains': {
          const filePath = path.join(workspacePath, rule.target);
          if (!(await fs.pathExists(filePath))) {
            return false;
          }
          const content = await fs.readFile(filePath, 'utf8');
          return rule.expectedValue ? content.includes(rule.expectedValue) : true;
        }

        case 'command-success': {
          // For now, we'll assume command validation is handled externally
          // This could be enhanced to actually run commands
          return true;
        }

        case 'test-passes': {
          // Similar to command-success, this would need external execution
          return true;
        }

        default:
          logger.warn(`Unknown validation rule type: ${rule.type}`);
          return true;
      }
    } catch (error) {
      logger.error(`Error executing validation rule ${rule.id}: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Enforce mandatory step completion before allowing progression
   */
  static async enforceStepCompletion(
    workspacePath: string,
    executionPlan: ExecutionPlan,
    stepId: string,
  ): Promise<{ canProceed: boolean; issues: string[] }> {
    const issues: string[] = [];

    // Find the step
    let currentStep: ExecutionStep | undefined;
    for (const phase of executionPlan.phases) {
      const step = phase.steps.find((s) => s.id === stepId);
      if (step) {
        currentStep = step;
        break;
      }
    }

    if (!currentStep) {
      return { canProceed: false, issues: [`Step ${stepId} not found`] };
    }

    // If step is not required, allow progression
    if (!currentStep.isRequired) {
      return { canProceed: true, issues: [] };
    }

    // Check dependencies
    for (const depId of currentStep.dependencies) {
      let depStep: ExecutionStep | undefined;
      for (const phase of executionPlan.phases) {
        const step = phase.steps.find((s) => s.id === depId);
        if (step) {
          depStep = step;
          break;
        }
      }

      if (depStep && depStep.isRequired && depStep.status !== 'completed') {
        issues.push(`Dependency step "${depStep.name}" must be completed first`);
      }
    }

    // Check artifacts
    const artifactValidation = await this.validateStepArtifacts(workspacePath, currentStep);
    if (!artifactValidation.isValid) {
      issues.push(`Missing required artifacts: ${artifactValidation.missingArtifacts.join(', ')}`);
    }

    // Check validations
    const validationResult = await this.validateStepCompletion(
      workspacePath,
      currentStep,
      executionPlan.metadata.validationRules,
    );
    if (!validationResult.isValid) {
      issues.push(`Failed validations: ${validationResult.failedValidations.join(', ')}`);
    }

    return {
      canProceed: issues.length === 0,
      issues,
    };
  }

  /**
   * Get mandatory steps that are not yet completed
   */
  static getMandatoryIncompleteSteps(executionPlan: ExecutionPlan): ExecutionStep[] {
    const incompleteSteps: ExecutionStep[] = [];

    for (const phase of executionPlan.phases) {
      if (phase.isRequired) {
        for (const step of phase.steps) {
          if (step.isRequired && step.status !== 'completed') {
            incompleteSteps.push(step);
          }
        }
      }
    }

    return incompleteSteps;
  }

  /**
   * Generate execution plan summary for orchestrator
   */
  static generatePlanSummary(executionPlan: ExecutionPlan): string {
    const summary: string[] = [
      `# Execution Plan: ${executionPlan.workflowType}`,
      `Branch: ${executionPlan.branchName}`,
      `Status: ${executionPlan.status}`,
      `Current Phase: ${executionPlan.currentPhase}`,
      '',
      '## Progress Summary:',
    ];

    for (const phase of executionPlan.phases) {
      const completedSteps = phase.steps.filter((s) => s.status === 'completed').length;
      const totalSteps = phase.steps.length;
      const requiredSteps = phase.steps.filter((s) => s.isRequired).length;

      summary.push(
        `- **${phase.name}**: ${completedSteps}/${totalSteps} steps (${requiredSteps} required) - ${phase.status}`,
      );
    }

    const mandatoryIncomplete = this.getMandatoryIncompleteSteps(executionPlan);
    if (mandatoryIncomplete.length > 0) {
      summary.push('', '## ⚠️ MANDATORY STEPS REMAINING:', '');
      for (const step of mandatoryIncomplete) {
        const phase = executionPlan.phases.find((p) => p.steps.includes(step));
        summary.push(`- **${phase?.name} > ${step.name}**: ${step.description}`);
      }
    }

    summary.push('', '## Required Artifacts:', '');
    for (const artifact of executionPlan.metadata.requiredArtifacts) {
      summary.push(`- ${artifact}`);
    }

    return summary.join('\n');
  }
}
