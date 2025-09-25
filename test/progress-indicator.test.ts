import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProgressIndicator, type ProgressStep } from '../src/utils/progressIndicator.js';

describe('ProgressIndicator', () => {
  let progressIndicator: ProgressIndicator;

  beforeEach(() => {
    progressIndicator = new ProgressIndicator();
  });

  afterEach(() => {
    if (progressIndicator.isActive()) {
      progressIndicator.stop();
    }
  });

  describe('Single Progress Bar', () => {
    it('should initialize with steps correctly', () => {
      const steps: ProgressStep[] = [
        { id: 'step1', description: 'Step 1', weight: 1 },
        { id: 'step2', description: 'Step 2', weight: 2 },
        { id: 'step3', description: 'Step 3', weight: 1 },
      ];

      progressIndicator.initialize(steps, { title: 'Test Progress' });
      expect(progressIndicator.isActive()).toBe(true);
    });

    it('should handle step completion', () => {
      const steps: ProgressStep[] = [
        { id: 'step1', description: 'Step 1', weight: 1 },
        { id: 'step2', description: 'Step 2', weight: 1 },
      ];

      progressIndicator.initialize(steps);
      progressIndicator.startStep('step1');
      progressIndicator.completeStep('step1');
      expect(progressIndicator.isActive()).toBe(true);
    });

    it('should complete successfully', () => {
      const steps: ProgressStep[] = [{ id: 'step1', description: 'Step 1', weight: 1 }];

      progressIndicator.initialize(steps);
      progressIndicator.startStep('step1');
      progressIndicator.completeStep('step1');
      progressIndicator.complete();
      expect(progressIndicator.isActive()).toBe(false);
    });

    it('should handle manual progress updates', () => {
      const steps: ProgressStep[] = [{ id: 'step1', description: 'Step 1', weight: 10 }];

      progressIndicator.initialize(steps);
      progressIndicator.updateProgress(5, 10, { custom: 'data' });
      expect(progressIndicator.isActive()).toBe(true);
    });
  });

  describe('Multi-Bar Progress', () => {
    it('should initialize multi-bar correctly', () => {
      const operations = ['Operation 1', 'Operation 2', 'Operation 3'];
      const multiBar = progressIndicator.initializeMultiBar(operations);

      expect(multiBar).toBeDefined();
      expect(progressIndicator.isActive()).toBe(true);
    });

    it('should handle multi-bar completion', () => {
      const operations = ['Operation 1', 'Operation 2'];
      progressIndicator.initializeMultiBar(operations);
      progressIndicator.complete();
      expect(progressIndicator.isActive()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent step gracefully', () => {
      const steps: ProgressStep[] = [{ id: 'step1', description: 'Step 1', weight: 1 }];

      progressIndicator.initialize(steps);

      // Should not throw when starting/completing non-existent step
      expect(() => {
        progressIndicator.startStep('nonexistent');
        progressIndicator.completeStep('nonexistent');
      }).not.toThrow();
    });

    it('should handle stop during active progress', () => {
      const steps: ProgressStep[] = [{ id: 'step1', description: 'Step 1', weight: 1 }];

      progressIndicator.initialize(steps);
      progressIndicator.stop();
      expect(progressIndicator.isActive()).toBe(false);
    });
  });

  describe('Integration with cli-progress', () => {
    it('should demonstrate cli-progress package integration', () => {
      // This test validates that cli-progress is properly integrated
      // and provides the expected functionality
      const steps: ProgressStep[] = [
        { id: 'init', description: 'Initializing workspace', weight: 1 },
        { id: 'clone', description: 'Cloning repositories', weight: 3 },
        { id: 'setup', description: 'Setting up worktrees', weight: 2 },
        { id: 'complete', description: 'Finalizing setup', weight: 1 },
      ];

      progressIndicator.initialize(steps, {
        title: 'Workspace Setup',
        showETA: true,
      });

      // Simulate workflow
      steps.forEach((step) => {
        progressIndicator.startStep(step.id);
        progressIndicator.completeStep(step.id);
      });

      progressIndicator.complete();
      expect(progressIndicator.isActive()).toBe(false);
    });
  });
});
