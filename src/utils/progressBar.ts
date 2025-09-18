import { logger } from './logger.js';

export interface ProgressBarOptions {
  total: number;
  width?: number;
  showPercentage?: boolean;
  showCurrent?: boolean;
  format?: string;
}

export class ProgressBar {
  private current: number = 0;
  private total: number;
  private width: number;
  private showPercentage: boolean;
  private showCurrent: boolean;
  private format: string;
  private isVerbose: boolean;

  constructor(options: ProgressBarOptions) {
    this.total = options.total;
    this.width = options.width || 10;
    this.showPercentage = options.showPercentage !== false;
    this.showCurrent = options.showCurrent !== false;
    this.format = options.format || '[{bar}] {percentage}% done';
    this.isVerbose = logger.isVerbose() || logger.isDebug();
  }

  update(current: number): void {
    this.current = current;

    if (this.isVerbose) {
      // In verbose mode, don't show progress bar
      return;
    }

    this.render();
  }

  increment(): void {
    this.update(this.current + 1);
  }

  private render(): void {
    const percentage = Math.round((this.current / this.total) * 100);
    const filled = Math.round((this.current / this.total) * this.width);
    const empty = this.width - filled;

    const bar = '█'.repeat(filled) + ' '.repeat(empty);

    const output = this.format
      .replace('{bar}', bar)
      .replace('{percentage}', percentage.toString())
      .replace('{current}', this.current.toString())
      .replace('{total}', this.total.toString());

    // Clear line and print progress
    process.stdout.write('\r' + output);
  }

  complete(): void {
    if (!this.isVerbose) {
      this.update(this.total);
      process.stdout.write('\n'); // Move to next line
    }
  }

  clear(): void {
    if (!this.isVerbose) {
      // Clear the progress bar line
      process.stdout.write('\r' + ' '.repeat(50) + '\r');
    }
  }
}

// Convenience function to create a progress bar
export function createProgressBar(options: ProgressBarOptions): ProgressBar {
  return new ProgressBar(options);
}
