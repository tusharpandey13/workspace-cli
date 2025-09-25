import { describe, it, expect, beforeEach } from 'vitest';
import { Logger, LogLevel } from '../src/utils/logger.js';

interface MockConsole {
  log: (msg: string) => void;
  error: (msg: string) => void;
  warn: (msg: string) => void;
}

interface LogEntry {
  type: 'log' | 'error' | 'warn';
  message: string;
}

describe('Logger', () => {
  let logger: Logger;
  let consoleLogs: LogEntry[];

  beforeEach(() => {
    logger = new Logger(LogLevel.VERBOSE);
    consoleLogs = [];

    // Mock console methods
    (global.console as unknown as MockConsole) = {
      log: (msg: string) => consoleLogs.push({ type: 'log', message: msg }),
      error: (msg: string) => consoleLogs.push({ type: 'error', message: msg }),
      warn: (msg: string) => consoleLogs.push({ type: 'warn', message: msg }),
    };
  });

  it('should respect log levels', () => {
    logger.setLevel(LogLevel.ERROR);

    logger.error('Error message');
    logger.warn('Warning message');
    logger.info('Info message');

    expect(consoleLogs).toHaveLength(1);
    expect(consoleLogs[0].message).toContain('Error message');
  });

  it('should format messages with appropriate colors and content', () => {
    logger.error('Test error');
    logger.warn('Test warning');
    logger.info('Test info');
    logger.success('Test success');

    expect(consoleLogs.find((log) => log.message.includes('Test error'))).toBeTruthy();
    expect(consoleLogs.find((log) => log.message.includes('Test warning'))).toBeTruthy();
    expect(consoleLogs.find((log) => log.message.includes('Test info'))).toBeTruthy();
    expect(consoleLogs.find((log) => log.message.includes('Test success'))).toBeTruthy();
  });

  it('should support step progress logging', () => {
    logger.step(1, 3, 'First step');
    logger.step(2, 3, 'Second step');

    expect(consoleLogs).toHaveLength(2);
    expect(consoleLogs[0].message).toContain('[1/3]');
    expect(consoleLogs[1].message).toContain('[2/3]');
  });
});
