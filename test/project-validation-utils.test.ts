import { describe, test, expect, beforeEach, vi, MockedFunction } from 'vitest';
import {
  validateProjectsExist,
  ensureProjectsConfigured,
  getProjectsWithValidation,
  displayProjectsList,
} from '../src/utils/projectValidation.js';
import { configManager } from '../src/utils/config.js';
import { logger } from '../src/utils/logger.js';

// Mock dependencies
vi.mock('../src/utils/config.js', () => ({
  configManager: {
    listProjects: vi.fn(),
    getProject: vi.fn(),
    isLoaded: vi.fn(),
    isNoConfigMode: vi.fn(),
  },
}));

vi.mock('../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
  },
}));

// Mock console.log
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('Project Validation Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy.mockClear();
  });

  describe('validateProjectsExist', () => {
    test('should return true when projects exist', () => {
      (configManager.listProjects as MockedFunction<any>).mockReturnValue(['project1', 'project2']);

      const result = validateProjectsExist();

      expect(result).toBe(true);
      expect(configManager.listProjects).toHaveBeenCalledOnce();
    });

    test('should return false when no projects exist', () => {
      (configManager.listProjects as MockedFunction<any>).mockReturnValue([]);

      const result = validateProjectsExist();

      expect(result).toBe(false);
      expect(configManager.listProjects).toHaveBeenCalledOnce();
    });
  });

  describe('ensureProjectsConfigured', () => {
    test('should return true and not show message when projects exist', () => {
      (configManager.listProjects as MockedFunction<any>).mockReturnValue(['project1']);

      const result = ensureProjectsConfigured();

      expect(result).toBe(true);
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
    });

    test('should return false and show setup guidance when no projects exist', () => {
      (configManager.listProjects as MockedFunction<any>).mockReturnValue([]);
      (configManager.isLoaded as MockedFunction<any>).mockReturnValue(false);
      (configManager.isNoConfigMode as MockedFunction<any>).mockReturnValue(false);

      const result = ensureProjectsConfigured(true);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'No projects configured. Run "space setup" to add projects first.',
      );
      expect(logger.info).not.toHaveBeenCalled();
    });

    test('should return false and show basic message when no projects exist and guidance disabled', () => {
      (configManager.listProjects as MockedFunction<any>).mockReturnValue([]);
      (configManager.isLoaded as MockedFunction<any>).mockReturnValue(false);
      (configManager.isNoConfigMode as MockedFunction<any>).mockReturnValue(false);

      const result = ensureProjectsConfigured(false);

      expect(result).toBe(false);
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('No projects configured.');
    });

    test('should return false and show improved message when config file exists but no projects', () => {
      (configManager.listProjects as MockedFunction<any>).mockReturnValue([]);
      (configManager.isLoaded as MockedFunction<any>).mockReturnValue(true);
      (configManager.isNoConfigMode as MockedFunction<any>).mockReturnValue(false);

      const result = ensureProjectsConfigured(true);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenNthCalledWith(
        1,
        'Configuration file found, but no projects are configured.',
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        2,
        'Add projects to your config file, or run "space setup" to reconfigure.',
      );
      expect(logger.info).not.toHaveBeenCalled();
    });
  });

  describe('getProjectsWithValidation', () => {
    test('should return projects array when projects exist', () => {
      const mockProjects = ['project1', 'project2'];
      (configManager.listProjects as MockedFunction<any>).mockReturnValue(mockProjects);
      (configManager.isLoaded as MockedFunction<any>).mockReturnValue(true);
      (configManager.isNoConfigMode as MockedFunction<any>).mockReturnValue(false);

      const result = getProjectsWithValidation();

      expect(result).toEqual(mockProjects);
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
    });

    test('should return empty array and show setup guidance when no config file exists', () => {
      (configManager.listProjects as MockedFunction<any>).mockReturnValue([]);
      (configManager.isLoaded as MockedFunction<any>).mockReturnValue(false);
      (configManager.isNoConfigMode as MockedFunction<any>).mockReturnValue(false);

      const result = getProjectsWithValidation(true);

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'No projects configured. Run "space setup" to add projects first.',
      );
    });

    test('should return empty array and show improved guidance when config file exists but no projects', () => {
      (configManager.listProjects as MockedFunction<any>).mockReturnValue([]);
      (configManager.isLoaded as MockedFunction<any>).mockReturnValue(true);
      (configManager.isNoConfigMode as MockedFunction<any>).mockReturnValue(false);

      const result = getProjectsWithValidation(true);

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenNthCalledWith(
        1,
        'Configuration file found, but no projects are configured.',
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        2,
        'Add projects to your config file, or run "space setup" to reconfigure.',
      );
    });

    test('should return empty array and show basic message when no projects exist and guidance disabled', () => {
      (configManager.listProjects as MockedFunction<any>).mockReturnValue([]);
      (configManager.isLoaded as MockedFunction<any>).mockReturnValue(false);
      (configManager.isNoConfigMode as MockedFunction<any>).mockReturnValue(false);

      const result = getProjectsWithValidation(false);

      expect(result).toEqual([]);
      expect(logger.info).toHaveBeenCalledWith('No projects configured.');
    });
  });

  describe('displayProjectsList', () => {
    test('should display formatted project list', () => {
      const mockProjects = ['project1', 'project2'];
      (configManager.getProject as MockedFunction<any>)
        .mockReturnValueOnce({
          name: 'Project One',
          repo: 'https://github.com/user/project1.git',
          sample_repo: 'https://github.com/user/project1-samples.git',
          github_org: 'user',
        })
        .mockReturnValueOnce({
          name: 'Project Two',
          repo: 'https://github.com/user/project2.git',
        });

      displayProjectsList(mockProjects);

      expect(consoleSpy).toHaveBeenCalledWith('\nAvailable projects:');
      expect(consoleSpy).toHaveBeenCalledWith('  project1: Project One');
      expect(consoleSpy).toHaveBeenCalledWith('    Repo: https://github.com/user/project1.git');
      expect(consoleSpy).toHaveBeenCalledWith(
        '    Samples: https://github.com/user/project1-samples.git',
      );
      expect(consoleSpy).toHaveBeenCalledWith('    GitHub Org: user');
      expect(consoleSpy).toHaveBeenCalledWith('  project2: Project Two');
      expect(consoleSpy).toHaveBeenCalledWith('    Samples: N/A');
      expect(consoleSpy).toHaveBeenCalledWith('');
    });

    test('should handle empty projects array', () => {
      displayProjectsList([]);

      expect(consoleSpy).toHaveBeenCalledWith('\nAvailable projects:');
      expect(configManager.getProject).not.toHaveBeenCalled();
    });
  });
});
