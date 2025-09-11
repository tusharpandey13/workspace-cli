#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger.js';
import type { ExecutionPlan, ExecutionStep } from '../types/index.js';

interface ValidationResult {
  phase: string;
  step: string;
  status: 'complete' | 'incomplete' | 'missing_artifacts';
  missingArtifacts?: string[] | undefined;
  errors?: string[] | undefined;
}

class WorkspaceValidator {
  private workspacePath: string;
  private executionPlan: ExecutionPlan | null = null;

  constructor(workspacePath: string = process.cwd()) {
    this.workspacePath = workspacePath;
  }

  async loadExecutionPlan(): Promise<boolean> {
    const statePath = path.join(this.workspacePath, '.workspace-state.json');

    if (!fs.existsSync(statePath)) {
      logger.warn('No execution state found - workspace may not be initialized');
      return false;
    }

    try {
      const stateData = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      this.executionPlan = stateData.executionPlan;
      return true;
    } catch (error) {
      logger.error('Failed to load execution state:', error as Error);
      return false;
    }
  }

  validateMandatoryArtifacts(): ValidationResult[] {
    const results: ValidationResult[] = [];
    const requiredArtifacts = [
      'BUGREPORT.md',
      'CHANGES_PR_DESCRIPTION.md',
      'CHANGES_REVIEW.md',
      'FINAL_REPORT.md',
    ];

    for (const artifact of requiredArtifacts) {
      const artifactPath = path.join(this.workspacePath, artifact);
      const exists = fs.existsSync(artifactPath);

      results.push({
        phase: 'ARTIFACTS',
        step: `Validate ${artifact}`,
        status: exists ? 'complete' : 'missing_artifacts',
        ...(exists ? {} : { missingArtifacts: [artifact] }),
      });
    }

    return results;
  }

  validateExecutionPlan(): ValidationResult[] {
    const results: ValidationResult[] = [];

    if (!this.executionPlan) {
      results.push({
        phase: 'SYSTEM',
        step: 'Load execution plan',
        status: 'missing_artifacts',
        errors: ['No execution plan found'],
      });
      return results;
    }

    for (const phase of this.executionPlan.phases) {
      for (const step of phase.steps) {
        const validation = this.validateStep(phase.name, step);
        results.push(validation);
      }
    }

    return results;
  }

  private validateStep(phaseName: string, step: ExecutionStep): ValidationResult {
    // Check if step is marked complete
    if (step.status === 'completed') {
      return {
        phase: phaseName,
        step: step.name,
        status: 'complete',
      };
    }

    // Check for mandatory artifacts based on step requirements
    const missingArtifacts: string[] = [];
    const errors: string[] = [];

    if (step.artifacts && step.artifacts.length > 0) {
      for (const artifact of step.artifacts) {
        const artifactPath = path.join(this.workspacePath, artifact);
        if (!fs.existsSync(artifactPath)) {
          missingArtifacts.push(artifact);
        }
      }
    }

    // Validate specific step requirements
    if (step.name.toLowerCase().includes('test') || step.name.toLowerCase().includes('vitest')) {
      const hasTestFiles = fs.existsSync(path.join(this.workspacePath, 'test'));
      if (!hasTestFiles) {
        errors.push('No test directory found');
      }
    }

    if (step.name.toLowerCase().includes('build')) {
      const packageJsonPath = path.join(this.workspacePath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
          if (!packageJson.scripts?.build) {
            errors.push('No build script in package.json');
          }
        } catch {
          errors.push('Invalid package.json');
        }
      }
    }

    return {
      phase: phaseName,
      step: step.name,
      status: missingArtifacts.length > 0 || errors.length > 0 ? 'missing_artifacts' : 'incomplete',
      ...(missingArtifacts.length > 0 && { missingArtifacts }),
      ...(errors.length > 0 && { errors }),
    };
  }

  generateReport(results: ValidationResult[]): void {
    logger.info('🔍 Workspace Validation Report\n');

    const complete = results.filter((r) => r.status === 'complete');
    const incomplete = results.filter((r) => r.status === 'incomplete');
    const missing = results.filter((r) => r.status === 'missing_artifacts');

    logger.info(`✅ Complete: ${complete.length}`);
    logger.info(`⏳ Incomplete: ${incomplete.length}`);
    logger.info(`❌ Missing Artifacts: ${missing.length}\n`);

    if (missing.length > 0) {
      logger.warn('❌ Missing Required Artifacts:');
      for (const result of missing) {
        logger.warn(`   ${result.phase} > ${result.step}`);
        if (result.missingArtifacts) {
          for (const artifact of result.missingArtifacts) {
            logger.warn(`     - Missing: ${artifact}`);
          }
        }
        if (result.errors) {
          for (const error of result.errors) {
            logger.warn(`     - Error: ${error}`);
          }
        }
      }
      logger.warn('');
    }

    if (incomplete.length > 0) {
      logger.info('⏳ Incomplete Steps:');
      for (const result of incomplete) {
        logger.info(`   ${result.phase} > ${result.step}`);
      }
      logger.info('');
    }

    // Overall status
    if (missing.length === 0 && incomplete.length === 0) {
      logger.info('🎉 All validation checks passed!');
    } else {
      logger.warn(
        '⚠️  Some validation checks failed. Address missing artifacts and incomplete steps.',
      );
    }
  }

  async runValidation(): Promise<void> {
    logger.info('Starting workspace validation...\n');

    await this.loadExecutionPlan();

    const artifactResults = this.validateMandatoryArtifacts();
    const planResults = this.validateExecutionPlan();

    const allResults = [...artifactResults, ...planResults];
    this.generateReport(allResults);
  }
}

export const validateCommand = new Command('validate')
  .description('Validate workspace execution plan and required artifacts')
  .option('-p, --path <path>', 'Path to workspace directory', process.cwd())
  .option('--artifacts-only', 'Only validate required artifacts')
  .option('--plan-only', 'Only validate execution plan progress')
  .action(async (options) => {
    const validator = new WorkspaceValidator(options.path);

    try {
      if (options.artifactsOnly) {
        const results = validator.validateMandatoryArtifacts();
        validator.generateReport(results);
      } else if (options.planOnly) {
        await validator.loadExecutionPlan();
        const results = validator.validateExecutionPlan();
        validator.generateReport(results);
      } else {
        await validator.runValidation();
      }
    } catch (error) {
      logger.error('Validation failed:', error as Error);
      process.exit(1);
    }
  });
