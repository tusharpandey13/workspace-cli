import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { ConfigManager } from '../src/utils/config.js';
import type { Config } from '../src/types/index.js';

describe('Config', () => {
  let tempDir: string;
  let configManager: ConfigManager;
  let testConfigPath: string;

  beforeEach(async () => {
    // Create temporary directory for test configs
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'workspace-cli-test-'));
    configManager = new ConfigManager();
    testConfigPath = path.join(tempDir, 'config.yaml');
  });

  afterEach(async () => {
    // Clean up ConfigManager to prevent event listener leaks
    if (configManager) {
      configManager.cleanup();
    }

    // Clean up temporary directory
    await fs.remove(tempDir);
  });

  describe('Configuration structure', () => {
    it('should load configuration file successfully', async () => {
      const configPath = path.join(process.cwd(), 'config.yaml');
      const config = await configManager.loadConfig(configPath);

      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });

    it('should have expected top-level configuration sections', async () => {
      const testConfig: Config = {
        projects: {
          'test-project': {
            name: 'Test Project',
            repo: 'test-repo',
          },
        },
        global: {
          src_dir: '~/src',
        },
        templates: {
          dir: './templates',
        },
      };

      const yaml = await import('js-yaml');
      await fs.writeFile(testConfigPath, yaml.dump(testConfig));
      const config = await configManager.loadConfig(testConfigPath);

      expect(config.projects).toBeDefined();
      expect(config.global).toBeDefined();
      expect(config.templates).toBeDefined();
    });

    it('should handle minimal configuration', async () => {
      const minimalConfig: Config = {
        projects: {},
      };

      const yaml = await import('js-yaml');
      await fs.writeFile(testConfigPath, yaml.dump(minimalConfig));
      const config = await configManager.loadConfig(testConfigPath);

      expect(config.projects).toBeDefined();
      expect(typeof config.projects).toBe('object');
    });

    it('should validate project structure when projects exist', async () => {
      const testConfig: Config = {
        projects: {
          'valid-project': {
            name: 'Valid Project',
            repo: 'https://github.com/example/repo.git',
            sample_repo: 'https://github.com/example/samples.git',
            env_file: 'test.env.local',
          },
        },
      };

      const yaml = await import('js-yaml');
      await fs.writeFile(testConfigPath, yaml.dump(testConfig));
      const config = await configManager.loadConfig(testConfigPath);

      const projectKeys = Object.keys(config.projects || {});
      if (projectKeys.length > 0) {
        const firstProject = config.projects?.[projectKeys[0]];
        expect(firstProject?.name).toBeTruthy();
        expect(firstProject?.repo).toBeTruthy();
      }
    });
  });

  describe('Project retrieval', () => {
    beforeEach(async () => {
      const testConfig: Config = {
        projects: {
          'test-project': {
            name: 'Test Project',
            repo: 'test-repo',
            sample_repo: 'test-samples',
            env_file: 'test.env.local',
          },
          'example-project': {
            name: 'Example Project',
            repo: 'https://github.com/user/example-repo.git',
            sample_repo: 'https://github.com/user/example-samples.git',
            env_file: 'example.env.local',
          },
        },
        global: {
          src_dir: '~/src',
          workspace_base: 'workspaces',
        },
      };

      const yaml = await import('js-yaml');
      await fs.writeFile(testConfigPath, yaml.dump(testConfig));
      await configManager.loadConfig(testConfigPath);
    });

    it('should retrieve test project by key', () => {
      const project = configManager.getProject('test-project');

      expect(project.key).toBe('test-project');
      expect(project.name).toBe('Test Project');
      expect(project.repo).toBe('/Users/tushar.pandey/src/test-repo'); // Resolved from relative path
    });

    it('should retrieve example project by key', () => {
      const project = configManager.getProject('example-project');

      expect(project.key).toBe('example-project');
      expect(project.name).toBe('Example Project');
      expect(project.repo).toBe('https://github.com/user/example-repo.git'); // HTTP URL unchanged
      expect(project.sample_repo).toBe('https://github.com/user/example-samples.git');
      expect(project.env_file).toBe('example.env.local');
    });

    it('should throw error for non-existent project', () => {
      expect(() => configManager.getProject('nonexistent')).toThrow('Unknown project');
    });

    it('should list available projects in error message', () => {
      expect(() => configManager.getProject('invalid')).toThrow(
        'Available projects: test-project, example-project',
      );
    });
  });

  describe('Environment file configuration', () => {
    it('should handle env file paths when configured', async () => {
      const testConfig: Config = {
        projects: {
          'test-project': {
            name: 'Test Project',
            repo: 'test-repo',
            env_file: 'test.env.local',
          },
        },
        global: {
          env_files_dir: './env-files',
        },
      };

      const yaml = await import('js-yaml');
      await fs.writeFile(testConfigPath, yaml.dump(testConfig));
      const config = await configManager.loadConfig(testConfigPath);

      // Test that env_files_dir is resolved properly
      if (config.global?.env_files_dir) {
        expect(path.isAbsolute(config.global.env_files_dir)).toBe(true);
      }
    });

    it('should work without env file configuration', async () => {
      const testConfig: Config = {
        projects: {
          'test-project': {
            name: 'Test Project',
            repo: 'test-repo',
          },
        },
      };

      const yaml = await import('js-yaml');
      await fs.writeFile(testConfigPath, yaml.dump(testConfig));
      const config = await configManager.loadConfig(testConfigPath);

      expect(config.projects?.['test-project']).toBeDefined();
      expect(config.projects?.['test-project'].env_file).toBeUndefined();
    });
  });

  describe('Path resolution', () => {
    beforeEach(async () => {
      const testConfig: Config = {
        projects: {
          'test-project': {
            name: 'Test Project',
            repo: '~/src/test-repo',
            sample_repo: 'https://github.com/user/test-samples.git',
            env_file: 'test.env.local',
          },
        },
        global: {
          src_dir: '~/src',
          env_files_dir: './env-files',
        },
      };

      const yaml = await import('js-yaml');
      await fs.writeFile(testConfigPath, yaml.dump(testConfig));
    });

    it('should resolve tilde paths in src_dir', async () => {
      const config = await configManager.loadConfig(testConfigPath);

      expect(config.global?.src_dir).toBe(path.join(os.homedir(), 'src'));
    });

    it('should resolve relative paths in env_files_dir', async () => {
      const config = await configManager.loadConfig(testConfigPath);
      const expectedPath = path.resolve(tempDir, 'env-files');

      expect(config.global?.env_files_dir).toBe(expectedPath);
    });
  });

  describe('Configuration validation', () => {
    beforeEach(async () => {
      const testConfig: Config = {
        projects: {
          'valid-project': {
            name: 'Valid Project',
            repo: 'https://github.com/example/repo.git',
            sample_repo: 'https://github.com/example/samples.git',
            env_file: 'test.env.local',
          },
        },
      };

      const yaml = await import('js-yaml');
      await fs.writeFile(testConfigPath, yaml.dump(testConfig));
      await configManager.loadConfig(testConfigPath);
    });

    it('should validate that existing project keys can be retrieved', () => {
      // Test with the project we know exists in our test config
      expect(() => configManager.getProject('valid-project')).not.toThrow();
    });

    it('should ensure projects have required fields when they exist', () => {
      const project = configManager.getProject('valid-project');

      expect(project.name).toBeTruthy();
      expect(project.repo).toBeTruthy();
      expect(typeof project.name).toBe('string');
      expect(typeof project.repo).toBe('string');
    });

    it('should handle optional project fields correctly', () => {
      const project = configManager.getProject('valid-project');

      // These fields are optional, test that they're handled properly
      if (project.sample_repo) {
        expect(typeof project.sample_repo).toBe('string');
      }
      if (project.env_file) {
        expect(typeof project.env_file).toBe('string');
      }
    });

    it('should validate repository URL formats when provided', async () => {
      const testConfigs = [
        {
          projects: {
            'http-project': {
              name: 'HTTP Project',
              repo: 'https://github.com/example/repo.git',
            },
          },
        },
        {
          projects: {
            'relative-project': {
              name: 'Relative Project',
              repo: 'local-repo',
            },
          },
        },
      ];

      for (const testConfig of testConfigs) {
        const yaml = await import('js-yaml');
        const testPath = path.join(tempDir, `test-${Date.now()}.yaml`);
        await fs.writeFile(testPath, yaml.dump(testConfig));

        const config = await configManager.loadConfig(testPath);
        const projectKey = Object.keys(config.projects || {})[0];
        const project = configManager.getProject(projectKey);

        expect(project.repo).toBeTruthy();
        expect(typeof project.repo).toBe('string');
      }
    });
  });
});
