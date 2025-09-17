import chalk from 'chalk';

/**
 * Logging levels
 */
export const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  VERBOSE: 4,
} as const;

export type LogLevelType = (typeof LogLevel)[keyof typeof LogLevel];

/**
 * Enhanced logger with structured output
 */
export class Logger {
  private level: LogLevelType;

  constructor(level: LogLevelType = LogLevel.INFO) {
    this.level = level;
  }

  setLevel(level: LogLevelType): void {
    this.level = level;
  }

  error(message: string, error: Error | null = null): void {
    if (this.level >= LogLevel.ERROR) {
      console.error(chalk.red(`❌ ${message}`));
      if (error && this.level >= LogLevel.DEBUG) {
        console.error(chalk.red(`   ${error.stack || error.message || error}`));
      }
    }
  }

  warn(message: string): void {
    if (this.level >= LogLevel.WARN) {
      console.warn(chalk.yellow(`⚠️  ${message}`));
    }
  }

  info(message: string): void {
    if (this.level >= LogLevel.INFO) {
      console.log(chalk.blue(`ℹ️  ${message}`));
    }
  }

  success(message: string): void {
    if (this.level >= LogLevel.INFO) {
      console.log(chalk.green(`✅ ${message}`));
    }
  }

  debug(message: string): void {
    if (this.level >= LogLevel.DEBUG) {
      console.log(chalk.gray(`🐛 ${message}`));
    }
  }

  verbose(message: string): void {
    if (this.level >= LogLevel.VERBOSE) {
      console.log(chalk.gray(`📝 ${message}`));
    }
  }

  command(command: string, args: string[] = [], cwd: string | null = null): void {
    if (this.level >= LogLevel.VERBOSE) {
      const cmdStr = `${command} ${args.join(' ')}`;
      const cwdStr = cwd ? ` (cwd: ${cwd})` : '';
      console.log(chalk.cyan(`🔧 ${cmdStr}${cwdStr}`));
    }
  }

  step(step: number, total: number, message: string): void {
    if (this.level >= LogLevel.INFO) {
      console.log(chalk.magenta(`[${step}/${total}] ${message}`));
    }
  }
}

// Global logger instance
export const logger = new Logger();
