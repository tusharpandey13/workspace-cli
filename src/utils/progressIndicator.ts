import cliProgress from 'cli-progress';
import { logger } from './logger.js';

/**
 * Progress tracking types
 */
export interface ProgressStep {
  id: string;
  description: string;
  weight: number; // Relative weight for progress calculation
}

export interface ProgressOptions {
  title?: string;
  showETA?: boolean;
  format?: string;
}

/**
 * Professional progress indicator using cli-progress
 * Replaces custom ProgressReporter with battle-tested solution
 */
export class ProgressIndicator {
  private progressBar: cliProgress.SingleBar | null = null;
  private multiBar: cliProgress.MultiBar | null = null;
  private isMultiBar = false;
  private totalSteps = 0;
  private currentStep = 0;
  private steps: ProgressStep[] = [];

  /**
   * Set current operation description
   */
  setCurrentOperation(_operation: string): void {
    // Note: Don't use console.log here as it interferes with cli-progress rendering
    // The operation will be shown through the progress bar format string
  }

  /**
   * Initialize single progress bar
   */
  initialize(steps: ProgressStep[], _options: ProgressOptions = {}): void {
    this.steps = steps;
    this.totalSteps = steps.reduce((total, step) => total + step.weight, 0);
    this.currentStep = 0;

    // Check TTY status - only show progress bars in interactive terminals
    const isTTY = process.stdout.isTTY;
    const isCI = process.env.CI === 'true';
    const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
    logger.debug(`TTY Status: ${isTTY}, CI: ${isCI}, NODE_ENV: ${process.env.NODE_ENV}`);

    // Always initialize, but use different modes for TTY vs non-TTY
    const useProgressBar = (isTTY && !isCI) || isTest;

    if (!useProgressBar) {
      logger.debug('Using text-based progress (no TTY or CI environment)');
      // Initialize with null progress bar but track steps for text output
      this.progressBar = null;
      return;
    }

    // Format includes operation context to avoid separate console.log interference
    const format = '[{bar}] {value}/{total} : {operation}';

    this.progressBar = new cliProgress.SingleBar(
      {
        format,
        barCompleteChar: '\u2588', // Lower five eighths block
        barIncompleteChar: '\u2591', // Light shade
        barsize: 25, // Half the default size (was 50)
        hideCursor: true,
        stopOnComplete: false, // Don't auto-stop so we can show "Complete" message
        clearOnComplete: false,
        gracefulExit: true,
        noTTYOutput: true,
        // Custom colors: bright green for filled, dark gray for incomplete
        formatBar: (progress: number, options: any) => {
          const completeSize = Math.round(progress * options.barsize);
          const incompleteSize = options.barsize - completeSize;

          // Bright green for complete (\u001b[92m), dark gray for incomplete (\u001b[90m)
          const complete =
            '\u001b[92m' + options.barCompleteChar.repeat(completeSize) + '\u001b[0m';
          const incomplete =
            '\u001b[90m' + options.barIncompleteChar.repeat(incompleteSize) + '\u001b[0m';

          return complete + incomplete;
        },
      },
      // cliProgress.Presets.rect,
    );

    this.progressBar.start(this.totalSteps, 0, {
      operation: 'Initializing...',
    });

    logger.debug(
      `Progress bar initialized with ${steps.length} steps (total weight: ${this.totalSteps})`,
    );
  }

  /**
   * Initialize multi-bar for concurrent operations
   */
  initializeMultiBar(operations: string[], _options: ProgressOptions = {}): cliProgress.MultiBar {
    this.isMultiBar = true;

    this.multiBar = new cliProgress.MultiBar(
      {
        clearOnComplete: false,
        hideCursor: true,
        format: ' {bar} | {filename} | {percentage}% | ETA: {eta}s',
      },
      cliProgress.Presets.shades_grey,
    );

    logger.debug(`Multi-bar progress initialized for ${operations.length} concurrent operations`);
    return this.multiBar;
  }

  /**
   * Start a specific step
   */
  startStep(stepId: string): void {
    if (this.isMultiBar) {
      return;
    }

    // If no steps were initialized, silently skip (prevents warnings in non-interactive mode)
    if (this.steps.length === 0) {
      return;
    }

    const step = this.steps.find((s) => s.id === stepId);
    if (!step) {
      logger.warn(`Progress step not found: ${stepId}`);
      return;
    }

    // Set current operation
    this.setCurrentOperation(step.description);

    if (this.progressBar) {
      // TTY mode: Update progress bar with operation info
      this.progressBar.update(this.currentStep, {
        operation: step.description,
      });
    } else {
      // Non-TTY mode: Simple text output
      const stepIndex = this.steps.findIndex((s) => s.id === stepId) + 1;
      console.log(`[${stepIndex}/${this.steps.length}] ${step.description}...`);
    }

    logger.verbose(`Starting step: ${step.description}`);
  }

  /**
   * Complete a specific step
   */
  completeStep(stepId: string): void {
    if (this.isMultiBar) {
      return;
    }

    // If no steps were initialized, silently skip (prevents warnings in non-interactive mode)
    if (this.steps.length === 0) {
      return;
    }

    const step = this.steps.find((s) => s.id === stepId);
    if (!step) {
      logger.warn(`Progress step not found: ${stepId}`);
      return;
    }

    this.currentStep += step.weight;

    if (this.progressBar) {
      // TTY mode: Update progress bar position with operation info
      this.progressBar.update(this.currentStep, {
        operation: step.description,
      });
    }
    // Non-TTY mode: No output needed for completion (just tracking progress)

    logger.verbose(
      `Completed step: ${step.description} (progress: ${this.currentStep}/${this.totalSteps})`,
    );
  }

  /**
   * Update progress manually
   */
  updateProgress(current: number, total?: number, payload?: Record<string, any>): void {
    if (!this.progressBar || this.isMultiBar) {
      return;
    }

    if (total) {
      this.progressBar.setTotal(total);
    }

    this.progressBar.update(current, payload);
  }

  /**
   * Complete all progress
   */
  complete(): void {
    if (this.progressBar && !this.isMultiBar) {
      // TTY mode: Update to show completion
      this.progressBar.update(this.totalSteps, {
        operation: 'Complete',
      });

      // Force the progress bar to render the final state and leave it on screen
      // Set clearOnComplete to false to preserve the final line
      this.progressBar.stop();

      // Print a newline to preserve the final progress line
      if (process.stdout.isTTY) {
        process.stdout.write('\n');
      }

      this.progressBar = null;
    }

    if (this.multiBar) {
      this.multiBar.stop();
      this.multiBar = null;
    }

    // Reset state completely
    this.isMultiBar = false;
    this.currentStep = 0;
    this.steps = [];
    this.totalSteps = 0;

    logger.debug('Progress indicator completed');
  }

  /**
   * Stop progress (for errors or interruption)
   */
  stop(): void {
    if (this.progressBar) {
      this.progressBar.stop();
      this.progressBar = null;
    }

    if (this.multiBar) {
      this.multiBar.stop();
      this.multiBar = null;
    }

    // Reset state completely
    this.isMultiBar = false;
    this.currentStep = 0;
    this.steps = [];
    this.totalSteps = 0;

    logger.debug('Progress indicator stopped');
  }

  /**
   * Check if progress indicator is active
   */
  isActive(): boolean {
    // Active if we have progress bars running or steps configured without completion
    return (
      this.progressBar !== null ||
      this.multiBar !== null ||
      (this.steps.length > 0 && this.currentStep < this.totalSteps)
    );
  }

  /**
   * Pause progress bar (clear line for user input)
   */
  pause(): void {
    if (this.progressBar && !this.isMultiBar) {
      // Just clear the current line for clean user input
      process.stdout.write('\r\x1b[K');
    }
  }

  /**
   * Resume progress bar after user input (redraw current state)
   */
  resume(): void {
    if (this.progressBar && !this.isMultiBar) {
      // Redraw the progress bar at current position
      this.progressBar.render();
    }
  }
}

/**
 * Global progress indicator instance
 */
export const progressIndicator = new ProgressIndicator();
