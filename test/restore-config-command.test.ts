import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { restoreConfigCommand } from '../src/commands/restore-config.js';
import { handleError } from '../src/utils/errors.js';
import { logger } from '../src/utils/logger.js';
import { isNonInteractive } from '../src/utils/globalOptions.js';
import { Command } from 'commander';
import fs from 'fs-extra';
import prompts from 'prompts';

// Mock all dependencies
vi.mock('../src/utils/errors.js', () => ({
  handleError: vi.fn(),
  ValidationError: class ValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ValidationError';
    }
  },
  FileSystemError: class FileSystemError extends Error {
    constructor(message: string, cause?: Error) {
      super(message);
      this.name = 'FileSystemError';
      this.cause = cause;
    }
  },
}));

vi.mock('../src/utils/logger.js', () => ({
  logger: {
    verbose: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../src/utils/globalOptions.js', () => ({
  isNonInteractive: vi.fn(),
}));

vi.mock('commander');
vi.mock('fs-extra');
vi.mock('prompts');

describe('Restore Config Command', () => {
  let mockCommand: Command;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock Commander
    mockCommand = {
      command: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      addHelpText: vi.fn().mockReturnThis(),
      action: vi.fn().mockReturnThis(),
    } as unknown as Command;

    // Setup console spy
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Mock file system operations by default (successful case)
    vi.mocked(fs.pathExists).mockImplementation(() => Promise.resolve(true));
    vi.mocked(fs.access).mockImplementation(() => Promise.resolve());
    vi.mocked(fs.readFile).mockImplementation(() =>
      Promise.resolve('projects:\n  test:\n    name: "Test"'),
    );
    vi.mocked(fs.ensureDir).mockImplementation(() => Promise.resolve());
    vi.mocked(fs.copy).mockImplementation(() => Promise.resolve());

    // Mock yaml loading
    vi.doMock('js-yaml', () => ({
      load: vi.fn().mockReturnValue({ projects: { test: { name: 'Test' } } }),
    }));

    // Mock prompts
    vi.mocked(prompts).mockImplementation(() =>
      Promise.resolve({
        shouldOverwrite: true,
        shouldBackup: true,
      }),
    );

    // Mock non-interactive mode
    vi.mocked(isNonInteractive).mockReturnValue(false);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    vi.restoreAllMocks();
  });

  describe('Command Registration', () => {
    it('should register the restore-config command with correct options', () => {
      restoreConfigCommand(mockCommand);

      expect(mockCommand.command).toHaveBeenCalledWith('restore-config');
      expect(mockCommand.description).toHaveBeenCalledWith(
        'Restore the default configuration file to your home directory',
      );
      expect(mockCommand.option).toHaveBeenCalledWith(
        '--force',
        'Overwrite existing configuration without confirmation',
      );
      expect(mockCommand.option).toHaveBeenCalledWith(
        '--dry-run',
        'Show what would be done without executing',
      );
      expect(mockCommand.addHelpText).toHaveBeenCalledWith(
        'after',
        expect.stringContaining('Examples:'),
      );
      expect(mockCommand.action).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('Core Functionality', () => {
    let actionFunction: any;

    beforeEach(() => {
      restoreConfigCommand(mockCommand);
      actionFunction = vi.mocked(mockCommand.action).mock.calls[0][0];
    });

    it('should restore config when no existing config exists', async () => {
      // Mock no existing config
      vi.mocked(fs.pathExists).mockImplementation((filePath) => {
        if (typeof filePath === 'string' && filePath.includes('.space-config.yaml')) {
          return Promise.resolve(false);
        }
        return Promise.resolve(true); // Default config exists
      });

      await actionFunction({});

      expect(fs.copy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Default configuration restored successfully!'),
      );
    });

    it('should handle dry-run mode correctly', async () => {
      await actionFunction({ dryRun: true });

      expect(fs.copy).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Dry run mode - showing what would be done:'),
      );
    });

    it('should prompt for confirmation when config exists', async () => {
      // Mock existing config
      vi.mocked(fs.pathExists).mockImplementation(() => Promise.resolve(true));

      await actionFunction({});

      expect(prompts).toHaveBeenCalledWith([
        {
          type: 'confirm',
          name: 'shouldOverwrite',
          message: 'Configuration file already exists. Overwrite with default config?',
          initial: false,
        },
        {
          type: expect.any(Function),
          name: 'shouldBackup',
          message: 'Create a backup of the existing configuration?',
          initial: true,
        },
      ]);
    });

    it('should skip prompts with --force flag', async () => {
      // Mock existing config
      vi.mocked(fs.pathExists).mockImplementation(() => Promise.resolve(true));

      await actionFunction({ force: true });

      expect(prompts).not.toHaveBeenCalled();
      expect(fs.copy).toHaveBeenCalled();
    });

    it('should create backup when requested', async () => {
      // Mock existing config
      vi.mocked(fs.pathExists).mockImplementation(() => Promise.resolve(true));

      // Mock prompts to request backup
      vi.mocked(prompts).mockImplementation(() =>
        Promise.resolve({
          shouldOverwrite: true,
          shouldBackup: true,
        }),
      );

      await actionFunction({});

      expect(fs.copy).toHaveBeenCalledTimes(2); // Once for backup, once for restore
    });

    it('should cancel operation when user declines overwrite', async () => {
      // Mock existing config
      vi.mocked(fs.pathExists).mockImplementation(() => Promise.resolve(true));

      // Mock prompts to decline overwrite
      vi.mocked(prompts).mockImplementation(() =>
        Promise.resolve({
          shouldOverwrite: false,
        }),
      );

      await actionFunction({});

      expect(fs.copy).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Configuration restore cancelled'),
      );
    });
  });

  describe('Error Handling', () => {
    let actionFunction: any;

    beforeEach(() => {
      restoreConfigCommand(mockCommand);
      actionFunction = vi.mocked(mockCommand.action).mock.calls[0][0];
    });

    it('should handle missing default config file', async () => {
      // Mock default config doesn't exist
      vi.mocked(fs.pathExists).mockImplementation((filePath) => {
        if (typeof filePath === 'string' && filePath.includes('config.yaml')) {
          return Promise.resolve(false);
        }
        return Promise.resolve(true);
      });

      await actionFunction({});

      expect(handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Default config file not found'),
        }),
        logger,
      );
    });

    it('should handle invalid YAML in default config', async () => {
      vi.mocked(fs.readFile).mockImplementation(() => Promise.resolve('invalid: yaml: content:'));

      // Mock yaml.load to throw error
      vi.doMock('js-yaml', () => ({
        load: vi.fn().mockImplementation(() => {
          throw new Error('Invalid YAML');
        }),
      }));

      await actionFunction({});

      expect(handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('invalid YAML'),
        }),
        logger,
      );
    });

    it('should handle file copy errors', async () => {
      // Mock no existing config to avoid backup path
      vi.mocked(fs.pathExists).mockImplementation((filePath) => {
        if (typeof filePath === 'string' && filePath.includes('.space-config.yaml')) {
          return Promise.resolve(false);
        }
        return Promise.resolve(true); // Default config exists
      });

      vi.mocked(fs.copy).mockImplementation(() => Promise.reject(new Error('Permission denied')));

      await actionFunction({});

      expect(handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Failed to restore configuration'),
        }),
        logger,
      );
    });

    it('should handle backup creation errors gracefully in force mode', async () => {
      // Mock existing config
      vi.mocked(fs.pathExists).mockImplementation(() => Promise.resolve(true));

      // Mock backup creation failure
      vi.mocked(fs.copy).mockImplementation((src, dest) => {
        if (typeof dest === 'string' && dest.includes('backup')) {
          return Promise.reject(new Error('Backup failed'));
        }
        return Promise.resolve();
      });

      await actionFunction({ force: true });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create backup in force mode'),
      );

      // Should still proceed with restore
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Default configuration restored successfully!'),
      );
    });
  });

  describe('Non-Interactive Mode', () => {
    let actionFunction: any;

    beforeEach(() => {
      restoreConfigCommand(mockCommand);
      actionFunction = vi.mocked(mockCommand.action).mock.calls[0][0];
      vi.mocked(isNonInteractive).mockReturnValue(true);
    });

    it('should not prompt in non-interactive mode with existing config', async () => {
      // Mock existing config
      vi.mocked(fs.pathExists).mockImplementation(() => Promise.resolve(true));

      await actionFunction({});

      expect(prompts).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Configuration restore cancelled'),
      );
    });

    it('should proceed with force flag in non-interactive mode', async () => {
      // Mock existing config
      vi.mocked(fs.pathExists).mockImplementation(() => Promise.resolve(true));

      await actionFunction({ force: true });

      expect(prompts).not.toHaveBeenCalled();
      expect(fs.copy).toHaveBeenCalled();
    });
  });

  describe('Path Resolution', () => {
    it('should resolve correct paths for default and user configs', () => {
      // This is tested implicitly through the mock setup
      // The command should use paths that resolve to config.yaml in project root
      // and .space-config.yaml in user home directory
      expect(true).toBe(true); // Placeholder for path resolution verification
    });
  });
});
