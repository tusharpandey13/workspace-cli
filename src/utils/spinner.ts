import ora, { Ora } from 'ora';
import { logger } from './logger.js';

export interface SpinnerOptions {
  text: string;
  verbose?: string; // Alternative text to show in verbose mode
  silent?: boolean; // Don't show anything if silent mode is active
}

export class WorkspaceSpinner {
  private spinner?: Ora;
  private isVerbose: boolean;
  private isSilent: boolean;

  constructor(private options: SpinnerOptions) {
    this.isVerbose = logger.isVerbose() || logger.isDebug();
    this.isSilent = options.silent === true;
  }

  start(): WorkspaceSpinner {
    if (this.isSilent) {
      return this;
    }

    if (this.isVerbose) {
      // In verbose mode, log immediately instead of using spinner
      const message = this.options.verbose || this.options.text;
      logger.info(message.replace(/\.\.\.$/, ''));
    } else {
      this.spinner = ora(this.options.text).start();
    }

    return this;
  }

  succeed(text?: string): WorkspaceSpinner {
    if (this.isSilent) {
      return this;
    }

    if (this.isVerbose) {
      if (text) {
        logger.info(text.replace(/^✅\s*/, ''));
      }
    } else if (this.spinner) {
      // Comment out spinner success messages to keep output clean
      // if (text) {
      //   this.spinner.succeed(text);
      // } else {
      //   this.spinner.succeed();
      // }
      this.spinner.stop();
    }

    return this;
  }

  fail(text?: string): WorkspaceSpinner {
    if (this.isSilent) {
      return this;
    }

    if (this.isVerbose) {
      if (text) {
        logger.error(text.replace(/^❌\s*/, '').replace(/^⚠️\s*/, ''));
      }
    } else if (this.spinner) {
      if (text) {
        this.spinner.fail(text);
      } else {
        this.spinner.fail();
      }
    }

    return this;
  }

  warn(text?: string): WorkspaceSpinner {
    if (this.isSilent) {
      return this;
    }

    if (this.isVerbose) {
      if (text) {
        logger.warn(text.replace(/^⚠️\s*/, ''));
      }
    } else if (this.spinner) {
      if (text) {
        this.spinner.warn(text);
      } else {
        this.spinner.warn();
      }
    }

    return this;
  }

  info(text?: string): WorkspaceSpinner {
    if (this.isSilent) {
      return this;
    }

    if (this.isVerbose) {
      if (text) {
        logger.info(text.replace(/^ℹ️\s*/, ''));
      }
    } else if (this.spinner) {
      if (text) {
        this.spinner.info(text);
      } else {
        this.spinner.info();
      }
    }

    return this;
  }

  stop(): void {
    if (this.spinner && !this.isVerbose) {
      this.spinner.stop();
    }
  }

  stopAndPersist(options?: { symbol?: string; text?: string }): WorkspaceSpinner {
    if (this.isSilent) {
      return this;
    }

    if (this.isVerbose) {
      if (options?.text) {
        // Remove common emoji prefixes from text
        const cleanText = options.text
          .replace(/^✅\s*/, '')
          .replace(/^❌\s*/, '')
          .replace(/^⚠️\s*/, '')
          .replace(/^ℹ️\s*/, '');
        logger.info(cleanText);
      }
    } else if (this.spinner) {
      this.spinner.stopAndPersist(options);
    }

    return this;
  }
}

// Convenience function to create a spinner
export function createSpinner(options: SpinnerOptions): WorkspaceSpinner {
  return new WorkspaceSpinner(options);
}

// Legacy compatibility - creates a spinner that behaves like ora but respects verbose mode
export function spinner(text: string): WorkspaceSpinner {
  return new WorkspaceSpinner({ text });
}
