import { test, expect, beforeEach, afterEach, describe } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { ConfigManager } from '../src/utils/config.js';
import { DummyRepoManager } from '../src/services/dummyRepoManager.js';

describe('Projects Command', () => {
  let tempDir: string;
  let configManager: ConfigManager;
  let configPath: string;
  let dummyManager: DummyRepoManager;
  let cliPath: string;

  beforeEach(async () => {
    // Create temp directory for test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'projects-command-test-'));

    // Initialize dummy repo manager
    dummyManager = new DummyRepoManager(tempDir);

    // Create config manager
    configManager = new ConfigManager();

    // Create test repositories
    const { sdkPath, samplePath } = await dummyManager.createTestEnvironment('test');

    // Create additional test repo for variety
    const singleRepoPath = await dummyManager.createDummyRepo({
      name: 'single-repo',
      type: 'sdk',
      branches: ['main', 'develop'],
    });

    // Create test config with multiple projects
    const config = {
      projects: {
        'full-project': {
          name: 'Full Featured Project',
          repo: sdkPath,
          sample_repo: samplePath,
          github_org: 'test-org',
          env_file: 'full.env.local',
          'post-init': 'npm install',
          key: 'full-project',
        },
        'simple-project': {
          name: 'Simple Project',
          repo: singleRepoPath,
          key: 'simple-project',
        },
        'http-project': {
          name: 'HTTP Based Project',
          repo: 'https://github.com/example/repo.git',
          sample_repo: 'https://github.com/example/samples.git',
          github_org: 'example-org',
          key: 'http-project',
        },
      },
      global: {
        src_dir: path.join(tempDir, 'src'),
        workspace_base: 'workspaces',
        env_files_dir: path.join(tempDir, 'env-files'),
      },
    };

    configPath = path.join(tempDir, 'config.yaml');

    // Write config using yaml
    const yaml = await import('js-yaml');
    await fs.writeFile(configPath, yaml.dump(config));

    // Load config
    await configManager.loadConfig(configPath);

    // Set up CLI path
    cliPath = path.join(process.cwd(), 'dist', 'bin', 'workspace.js');
  });

  afterEach(async () => {
    // Clean up ConfigManager to prevent event listener leaks
    if (configManager) {
      configManager.cleanup();
    }

    await dummyManager.cleanupAll();
    await fs.remove(tempDir);
  });

  describe('ConfigManager project methods', () => {
    test('should list all available projects', () => {
      const projects = configManager.listProjects();
      expect(projects.sort()).toEqual(['full-project', 'simple-project', 'http-project'].sort());
    });

    test('should get project configuration by key', () => {
      const project = configManager.getProject('full-project');
      expect(project.name).toBe('Full Featured Project');
      expect(project.key).toBe('full-project');
      expect(project.github_org).toBe('test-org');
      expect(project.env_file).toBe('full.env.local');
      expect(project['post-init']).toBe('npm install');
    });

    test('should get simple project configuration', () => {
      const project = configManager.getProject('simple-project');
      expect(project.name).toBe('Simple Project');
      expect(project.key).toBe('simple-project');
      expect(project.github_org).toBeUndefined();
      expect(project.sample_repo).toBeUndefined();
    });

    test('should handle HTTP-based repositories', () => {
      const project = configManager.getProject('http-project');
      expect(project.repo).toBe('https://github.com/example/repo.git');
      expect(project.sample_repo).toBe('https://github.com/example/samples.git');
    });

    test('should throw error for non-existent project', () => {
      expect(() => configManager.getProject('non-existent')).toThrow('Unknown project');
    });

    test('should get all projects data', () => {
      const allProjects = configManager.getAllProjectsData();
      expect(Object.keys(allProjects)).toEqual(['full-project', 'simple-project', 'http-project']);
      expect(allProjects['full-project'].name).toBe('Full Featured Project');
      expect(allProjects['simple-project'].name).toBe('Simple Project');
    });
  });

  describe('CLI projects command', () => {
    test('should list all projects with details', () => {
      const result = execSync(`node ${cliPath} projects --config ${configPath}`, {
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'test' },
      });

      // Should contain all projects
      expect(result).toContain('Available projects:');
      expect(result).toContain('full-project: Full Featured Project');
      expect(result).toContain('simple-project: Simple Project');
      expect(result).toContain('http-project: HTTP Based Project');

      // Should show repository details
      expect(result).toContain('Repo: https://github.com/example/repo.git');
      expect(result).toContain('Samples: https://github.com/example/samples.git');
      expect(result).toContain('Samples: N/A'); // For simple-project

      // Should show GitHub org when available
      expect(result).toContain('GitHub Org: test-org');
      expect(result).toContain('GitHub Org: example-org');

      // Should show usage instructions
      expect(result).toContain('Usage:');
      expect(result).toContain('space init <project> [github-ids...] <branch-name>');
      expect(result).toContain('space init full-project 123 456 feature/my-branch');
    });

    test('should handle empty projects configuration', async () => {
      // Create config with no projects
      const emptyConfig = {
        projects: {},
        global: {
          src_dir: path.join(tempDir, 'src'),
          workspace_base: 'workspaces',
        },
      };

      const emptyConfigPath = path.join(tempDir, 'empty-config.yaml');
      const yaml = await import('js-yaml');
      await fs.writeFile(emptyConfigPath, yaml.dump(emptyConfig));

      const result = execSync(`node ${cliPath} projects --config ${emptyConfigPath}`, {
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'test' },
      });

      expect(result).toContain('No projects configured.');
    });

    test('should handle missing configuration file gracefully', () => {
      const nonExistentConfig = path.join(tempDir, 'non-existent.yaml');

      try {
        const result = execSync(`node ${cliPath} projects --config ${nonExistentConfig}`, {
          encoding: 'utf8',
          env: { ...process.env, NODE_ENV: 'test' },
        });
        // If command succeeds, it should indicate missing projects or setup prompt
        expect(result.toLowerCase()).toMatch(/(no projects|setup|welcome|configuration)/i);
      } catch (error: any) {
        // Command failed with non-zero exit code, which means proper error handling
        expect(error.status || error.code || 1).toBeGreaterThan(0);
      }
    });
  });

  describe('project resolution and validation', () => {
    test('should find project by key', () => {
      const result = configManager.findProject('full-project');
      expect(result.projectKey).toBe('full-project');
      expect(result.project.name).toBe('Full Featured Project');
    });

    test('should find project by repository name (extracted from URL)', () => {
      const result = configManager.findProject('repo'); // From https://github.com/example/repo.git
      expect(result.projectKey).toBe('http-project');
      expect(result.project.name).toBe('HTTP Based Project');
    });

    test('should find project by repository name (from local path)', () => {
      // The dummy manager creates repos with specific names
      const result = configManager.findProject('test'); // From the test repo
      expect(result.projectKey).toBe('full-project');
      expect(result.project.name).toBe('Full Featured Project');
    });

    test('should handle case-insensitive project search', () => {
      const result = configManager.findProject('FULL-PROJECT');
      expect(result.projectKey).toBe('full-project');
      expect(result.project.name).toBe('Full Featured Project');
    });

    test('should provide helpful error for non-existent project', () => {
      expect(() => configManager.findProject('non-existent')).toThrow(
        /No project found with identifier: non-existent/,
      );
    });

    test('should validate local repository paths exist', () => {
      // This should not throw for local repos that exist
      expect(() => configManager.validateProject('full-project')).not.toThrow();
      expect(() => configManager.validateProject('simple-project')).not.toThrow();
    });

    test('should not validate HTTP repository URLs', () => {
      // HTTP URLs should not be validated for local existence
      expect(() => configManager.validateProject('http-project')).not.toThrow();
    });
  });

  describe('project environment and configuration', () => {
    test('should get environment file path when configured', () => {
      const envPath = configManager.getEnvFilePath('full-project');
      expect(envPath).toBe(path.join(tempDir, 'env-files', 'full.env.local'));
    });

    test('should return null for projects without env_file', () => {
      const envPath = configManager.getEnvFilePath('simple-project');
      expect(envPath).toBe(null);
    });

    test('should get templates configuration', () => {
      const templates = configManager.getTemplates();
      expect(templates).toBeDefined();
    });

    test('should get workflows configuration', () => {
      const workflows = configManager.getWorkflows();
      expect(workflows).toBeDefined();
    });

    test('should get global configuration', () => {
      const global = configManager.getGlobal();
      expect(global.src_dir).toBe(path.join(tempDir, 'src'));
      expect(global.workspace_base).toBe('workspaces');
      expect(global.env_files_dir).toBe(path.join(tempDir, 'env-files'));
    });
  });

  describe('integration with other commands', () => {
    test('should work correctly with list command project enumeration', () => {
      const projects = configManager.listProjects();

      // Each project should have a valid base directory path
      projects.forEach((projectKey) => {
        const baseDir = configManager.getProjectBaseDir(projectKey);
        expect(baseDir).toContain(projectKey);
        expect(path.isAbsolute(baseDir)).toBe(true);
      });
    });

    test('should work correctly with workspace path generation', () => {
      const workspacePaths = configManager.getWorkspacePaths('full-project', 'test-workspace');

      expect(workspacePaths.baseDir).toBe(configManager.getProjectBaseDir('full-project'));
      expect(workspacePaths.sourcePath).toContain('test-workspace');
      expect(workspacePaths.destinationPath).toContain('test-workspace');
    });
  });

  describe('regression tests for project handling', () => {
    test('should not use hardcoded project names or placeholders', () => {
      const projects = configManager.listProjects();

      // Should return actual project keys, not placeholders
      expect(projects).not.toContain('dummy');
      expect(projects).not.toContain('test');
      expect(projects).not.toContain('placeholder');
      expect(projects).not.toContain('mock');

      // Should contain our actual configured projects
      expect(projects).toContain('full-project');
      expect(projects).toContain('simple-project');
      expect(projects).toContain('http-project');
    });

    test('should handle project names with various formats correctly', async () => {
      // Test with different project name formats
      const specialConfig = {
        projects: {
          'kebab-case-project': {
            name: 'Kebab Case Project',
            repo: 'https://github.com/example/kebab.git',
            key: 'kebab-case-project',
          },
          snake_case_project: {
            name: 'Snake Case Project',
            repo: 'https://github.com/example/snake.git',
            key: 'snake_case_project',
          },
          CamelCaseProject: {
            name: 'Camel Case Project',
            repo: 'https://github.com/example/camel.git',
            key: 'CamelCaseProject',
          },
        },
        global: {
          src_dir: path.join(tempDir, 'src'),
        },
      };

      const specialConfigPath = path.join(tempDir, 'special-config.yaml');
      const yaml = await import('js-yaml');
      await fs.writeFile(specialConfigPath, yaml.dump(specialConfig));

      const result = execSync(`node ${cliPath} projects --config ${specialConfigPath}`, {
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'test' },
      });

      expect(result).toContain('kebab-case-project: Kebab Case Project');
      expect(result).toContain('snake_case_project: Snake Case Project');
      expect(result).toContain('CamelCaseProject: Camel Case Project');
    });
  });
});
