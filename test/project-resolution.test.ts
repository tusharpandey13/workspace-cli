import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { ConfigManager } from '../src/utils/config.js';
import { Config } from '../src/types/index.js';

describe('Project Resolution', () => {
  let tempDir: string;
  let tempConfigPath: string;
  let configManager: ConfigManager;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'workspace-cli-test-'));
    tempConfigPath = path.join(tempDir, 'config.yaml');
    configManager = new ConfigManager();
  });

  afterEach(async () => {
    // Clean up ConfigManager to prevent event listener leaks
    if (configManager) {
      configManager.cleanup();
    }

    await fs.remove(tempDir);
  });

  describe('findProject', () => {
    beforeEach(async () => {
      const testConfig: Config = {
        projects: {
          java: {
            name: 'Auth0 Java SDK',
            repo: 'https://github.com/auth0/auth0-java.git',
            env_file: 'java.env.local',
          },
          next: {
            name: 'Auth0 Next.js SDK',
            repo: 'https://github.com/auth0/nextjs-auth0.git',
            sample_repo: 'https://github.com/auth0/nextjs-auth0-example.git',
            env_file: 'next.env.local',
          },
          spa: {
            name: 'Auth0 SPA SDK',
            repo: 'https://github.com/auth0/auth0-spa-js.git',
            sample_repo: 'https://github.com/auth0/auth0-spa-js-sample.git',
            env_file: 'spa.env.local',
          },
          node: {
            name: 'Auth0 Node.js SDK',
            repo: 'https://github.com/auth0/node-auth0.git',
            env_file: 'node.env.local',
          },
        },
        global: {
          src_dir: '~/src',
          workspace_base: 'workspaces',
        },
      };

      const yaml = await import('js-yaml');
      await fs.writeFile(tempConfigPath, yaml.dump(testConfig));
      await configManager.loadConfig(tempConfigPath);
    });

    describe('by project key', () => {
      it('should find project by project key "java"', () => {
        const { projectKey, project } = configManager.findProject('java');

        expect(projectKey).toBe('java');
        expect(project.key).toBe('java');
        expect(project.name).toBe('Auth0 Java SDK');
        expect(project.repo).toBe('https://github.com/auth0/auth0-java.git');
      });

      it('should find project by project key "next"', () => {
        const { projectKey, project } = configManager.findProject('next');

        expect(projectKey).toBe('next');
        expect(project.key).toBe('next');
        expect(project.name).toBe('Auth0 Next.js SDK');
        expect(project.repo).toBe('https://github.com/auth0/nextjs-auth0.git');
      });

      it('should find project by project key "spa"', () => {
        const { projectKey, project } = configManager.findProject('spa');

        expect(projectKey).toBe('spa');
        expect(project.key).toBe('spa');
        expect(project.name).toBe('Auth0 SPA SDK');
        expect(project.repo).toBe('https://github.com/auth0/auth0-spa-js.git');
      });

      it('should find project by project key "node"', () => {
        const { projectKey, project } = configManager.findProject('node');

        expect(projectKey).toBe('node');
        expect(project.key).toBe('node');
        expect(project.name).toBe('Auth0 Node.js SDK');
        expect(project.repo).toBe('https://github.com/auth0/node-auth0.git');
      });
    });

    describe('by repository name', () => {
      it('should find project by repository name "auth0-java"', () => {
        const { projectKey, project } = configManager.findProject('auth0-java');

        expect(projectKey).toBe('java');
        expect(project.key).toBe('java');
        expect(project.name).toBe('Auth0 Java SDK');
        expect(project.repo).toBe('https://github.com/auth0/auth0-java.git');
      });

      it('should find project by repository name "nextjs-auth0"', () => {
        const { projectKey, project } = configManager.findProject('nextjs-auth0');

        expect(projectKey).toBe('next');
        expect(project.key).toBe('next');
        expect(project.name).toBe('Auth0 Next.js SDK');
        expect(project.repo).toBe('https://github.com/auth0/nextjs-auth0.git');
      });

      it('should find project by repository name "auth0-spa-js"', () => {
        const { projectKey, project } = configManager.findProject('auth0-spa-js');

        expect(projectKey).toBe('spa');
        expect(project.key).toBe('spa');
        expect(project.name).toBe('Auth0 SPA SDK');
        expect(project.repo).toBe('https://github.com/auth0/auth0-spa-js.git');
      });

      it('should find project by repository name "node-auth0"', () => {
        const { projectKey, project } = configManager.findProject('node-auth0');

        expect(projectKey).toBe('node');
        expect(project.key).toBe('node');
        expect(project.name).toBe('Auth0 Node.js SDK');
        expect(project.repo).toBe('https://github.com/auth0/node-auth0.git');
      });
    });

    describe('case insensitivity', () => {
      it('should find project by case-insensitive repository name', () => {
        const { projectKey, project } = configManager.findProject('AUTH0-JAVA');

        expect(projectKey).toBe('java');
        expect(project.key).toBe('java');
        expect(project.name).toBe('Auth0 Java SDK');
      });

      it('should find project by case-insensitive project key', () => {
        const { projectKey, project } = configManager.findProject('JAVA');

        expect(projectKey).toBe('java');
        expect(project.key).toBe('java');
        expect(project.name).toBe('Auth0 Java SDK');
      });
    });

    describe('error handling', () => {
      it('should throw descriptive error for non-existent project', () => {
        expect(() => configManager.findProject('nonexistent')).toThrow(
          'No project found with identifier: nonexistent',
        );
        expect(() => configManager.findProject('nonexistent')).toThrow(
          'Available project keys: java, next, spa, node',
        );
        expect(() => configManager.findProject('nonexistent')).toThrow(
          'Available repo names: auth0-java, nextjs-auth0, auth0-spa-js, node-auth0',
        );
      });

      it('should provide helpful error message with both keys and repo names', () => {
        try {
          configManager.findProject('invalid');
          expect.fail('Should have thrown an error');
        } catch (error: any) {
          const errorMessage = error.message;
          expect(errorMessage).toContain('Available project keys: java, next, spa, node');
          expect(errorMessage).toContain(
            'Available repo names: auth0-java, nextjs-auth0, auth0-spa-js, node-auth0',
          );
        }
      });
    });

    describe('preference order', () => {
      it('should prefer project key over repo name when both match', async () => {
        // Create a config where a project key matches another project's repo name
        const conflictConfig: Config = {
          projects: {
            'auth0-java': {
              name: 'Project Key Named Like Repo',
              repo: 'https://github.com/example/auth0-java.git',
            },
            java: {
              name: 'Auth0 Java SDK',
              repo: 'https://github.com/auth0/auth0-java.git',
            },
          },
          global: { src_dir: '~/src' },
        };

        const yaml = await import('js-yaml');
        await fs.writeFile(tempConfigPath, yaml.dump(conflictConfig));
        configManager = new ConfigManager();
        await configManager.loadConfig(tempConfigPath);

        // When we search for 'auth0-java', it should match the project key first
        const { projectKey, project } = configManager.findProject('auth0-java');

        expect(projectKey).toBe('auth0-java');
        expect(project.name).toBe('Project Key Named Like Repo');
        expect(project.repo).toBe('https://github.com/example/auth0-java.git');
      });
    });
  });
});
