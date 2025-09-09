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
    // Clean up temporary directory
    await fs.remove(tempDir);
  });

  describe('Configuration structure', () => {
    it('should validate the current config.yaml structure', async () => {
      const configPath = path.join(process.cwd(), 'config.yaml');
      const config = await configManager.loadConfig(configPath);

      expect(config).toBeDefined();
      expect(config.projects).toBeDefined();
      expect(config.global).toBeDefined();
      expect(config.templates).toBeDefined();
    });

    it('should have next project configuration', async () => {
      const configPath = path.join(process.cwd(), 'config.yaml');
      const config = await configManager.loadConfig(configPath);

      expect(config.projects?.next).toBeDefined();
      expect(config.projects?.next.name).toBe('NextJS Auth0 SDK');
      expect(config.projects?.next.sdk_repo).toBe('/Users/tushar.pandey/src/nextjs-auth0'); // Resolved from relative path
      expect(config.projects?.next.sample_repo).toBe(
        '/Users/tushar.pandey/src/auth0-nextjs-samples',
      ); // Resolved from relative path
      expect(config.projects?.next.github_org).toBe('auth0');
      expect(config.projects?.next.sample_app_path).toBe('Sample-01');
      expect(config.projects?.next.env_file).toBe('next.env.local');
    });

    it('should have spa project configuration', async () => {
      const configPath = path.join(process.cwd(), 'config.yaml');
      const config = await configManager.loadConfig(configPath);

      expect(config.projects?.spa).toBeDefined();
      expect(config.projects?.spa.name).toBe('Auth0 SPA JS SDK');
      expect(config.projects?.spa.sdk_repo).toBe('/Users/tushar.pandey/src/auth0-spa-js'); // Resolved from ~
      expect(config.projects?.spa.sample_repo).toBe('/Users/tushar.pandey/src/spajs/spatest'); // Resolved from relative path
      expect(config.projects?.spa.sample_app_path).toBe('/Users/tushar.pandey/src/spajs/spatest');
      expect(config.projects?.spa.env_file).toBe('spa.env.local');
    });

    it('should not have node or react projects', async () => {
      const configPath = path.join(process.cwd(), 'config.yaml');
      const config = await configManager.loadConfig(configPath);

      expect(config.projects?.node).toBeUndefined();
      expect(config.projects?.react).toBeUndefined();
    });

    it('should have global configuration', async () => {
      const configPath = path.join(process.cwd(), 'config.yaml');
      const config = await configManager.loadConfig(configPath);

      expect(config.global?.src_dir).toBe(path.join(os.homedir(), 'src'));
      expect(config.global?.workspace_base).toBe('workspaces');
      expect(config.global?.package_manager).toBe('pnpm');
      expect(config.global?.github_cli).toBe('gh');
      expect(config.global?.env_files_dir).toBe(path.join(process.cwd(), 'env-files'));
    });

    it('should have templates configuration', async () => {
      const configPath = path.join(process.cwd(), 'config.yaml');
      const config = await configManager.loadConfig(configPath);

      expect(config.templates?.dir).toBe(path.join(process.cwd(), 'src', 'templates'));
      expect(config.templates?.common).toEqual([
        'analysis.prompt.md',
        'review-changes.prompt.md',
        'tests.prompt.md',
        'fix-and-test.prompt.md',
        'PR_DESCRIPTION_TEMPLATE.md',
      ]);
    });
  });

  describe('Project retrieval', () => {
    beforeEach(async () => {
      const testConfig: Config = {
        projects: {
          next: {
            name: 'NextJS Auth0 SDK',
            sdk_repo: 'nextjs-auth0',
            sample_repo: 'auth0-nextjs-samples',
            github_org: 'auth0',
            sample_app_path: 'Sample-01',
            env_file: 'next.env.local',
          },
          spa: {
            name: 'Auth0 SPA JS SDK',
            sdk_repo: '~/src/auth0-spa-js',
            sample_repo: 'https://github.com/tusharpandey13/auth0-spa-js-debug-app.git',
            github_org: 'auth0',
            sample_app_path: '/Users/tushar.pandey/src/spajs/spatest',
            env_file: 'spa.env.local',
          },
        },
        global: {
          src_dir: '~/src',
          workspace_base: 'workspaces',
          package_manager: 'pnpm',
        },
      };

      const yaml = await import('js-yaml');
      await fs.writeFile(testConfigPath, yaml.dump(testConfig));
      await configManager.loadConfig(testConfigPath);
    });

    it('should retrieve next project by key', () => {
      const project = configManager.getProject('next');

      expect(project.key).toBe('next');
      expect(project.name).toBe('NextJS Auth0 SDK');
      expect(project.sdk_repo).toBe('/Users/tushar.pandey/src/nextjs-auth0'); // Resolved from relative path
      expect(project.github_org).toBe('auth0');
    });

    it('should retrieve spa project by key', () => {
      const project = configManager.getProject('spa');

      expect(project.key).toBe('spa');
      expect(project.name).toBe('Auth0 SPA JS SDK');
      expect(project.sdk_repo).toBe('/Users/tushar.pandey/src/auth0-spa-js'); // Resolved from ~
      expect(project.sample_repo).toBe(
        'https://github.com/tusharpandey13/auth0-spa-js-debug-app.git',
      );
      expect(project.sample_app_path).toBe('/Users/tushar.pandey/src/spajs/spatest');
      expect(project.env_file).toBe('spa.env.local');
    });

    it('should throw error for non-existent project', () => {
      expect(() => configManager.getProject('nonexistent')).toThrow('Unknown project');
    });

    it('should list available projects in error message', () => {
      expect(() => configManager.getProject('invalid')).toThrow('Available projects: next, spa');
    });
  });

  describe('Environment file configuration', () => {
    it('should have spa.env.local file', async () => {
      const envFilePath = path.join(process.cwd(), 'env-files', 'spa.env.local');
      const exists = await fs.pathExists(envFilePath);

      expect(exists).toBe(true);
    });

    it('should have correct environment variables in spa.env.local', async () => {
      const envFilePath = path.join(process.cwd(), 'env-files', 'spa.env.local');
      const content = await fs.readFile(envFilePath, 'utf8');

      expect(content).toContain('AUTH0_DOMAIN=');
      expect(content).toContain('AUTH0_CLIENT_ID=');
      expect(content).toContain('AUTH0_CLIENT_SECRET=');
      expect(content).toContain('AUTH0_BASE_URL=');
      expect(content).toContain('AUTH0_REDIRECT_URI=');
      expect(content).toContain('AUTH0_LOGOUT_URL=');
      expect(content).toContain('AUTH0_AUDIENCE=');
      expect(content).toContain('DEBUG=auth0-spa-js:*');
    });
  });

  describe('Path resolution', () => {
    beforeEach(async () => {
      const testConfig: Config = {
        projects: {
          spa: {
            name: 'Auth0 SPA JS SDK',
            sdk_repo: '~/src/auth0-spa-js',
            sample_repo: 'https://github.com/tusharpandey13/auth0-spa-js-debug-app.git',
            github_org: 'auth0',
            sample_app_path: '/Users/tushar.pandey/src/spajs/spatest',
            env_file: 'spa.env.local',
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
      const configPath = path.join(process.cwd(), 'config.yaml');
      await configManager.loadConfig(configPath);
    });

    it('should validate project keys exist', () => {
      const validKeys = ['next', 'spa'];

      for (const key of validKeys) {
        expect(() => configManager.getProject(key)).not.toThrow();
      }
    });

    it('should ensure spa project has required fields', () => {
      const spaProject = configManager.getProject('spa');

      expect(spaProject.name).toBeTruthy();
      expect(spaProject.sdk_repo).toBeTruthy();
      expect(spaProject.sample_repo).toBeTruthy();
      expect(spaProject.sample_app_path).toBeTruthy();
      expect(spaProject.env_file).toBeTruthy();
    });

    it('should ensure spa project has valid sample_repo format', () => {
      const spaProject = configManager.getProject('spa');

      // Can be either a GitHub URL, relative path, or resolved absolute path
      const isValidFormat =
        /^https:\/\/github\.com\/[^/]+\/[^/]+\.git$/.test(spaProject.sample_repo) ||
        /^[^/].*$/.test(spaProject.sample_repo) || // Relative path (not starting with /)
        /^\/.*/.test(spaProject.sample_repo); // Absolute path (resolved)

      expect(isValidFormat).toBe(true);
      expect(spaProject.sample_repo).toBe('/Users/tushar.pandey/src/spajs/spatest'); // Resolved from relative path
    });
  });
});
