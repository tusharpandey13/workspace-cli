import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { ConfigManager } from '../src/utils/config.js';
import { ValidationError } from '../src/utils/errors.js';

describe('Path Resolution', () => {
  let configManager: ConfigManager;
  let tempDir: string;
  let tempConfigPath: string;

  beforeEach(async () => {
    configManager = new ConfigManager();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'workspace-cli-test-'));
    tempConfigPath = path.join(tempDir, 'config.yaml');
  });

  afterEach(async () => {
    // Clean up ConfigManager to prevent event listener leaks
    if (configManager) {
      configManager.cleanup();
    }

    await fs.remove(tempDir);
  });

  describe('Relative path resolution', () => {
    it('should resolve relative repo paths relative to src_dir', async () => {
      const srcDir = path.join(tempDir, 'src');
      const repo = 'test-repo';
      const expectedPath = path.join(srcDir, repo);

      // Create directories
      await fs.ensureDir(expectedPath);
      await fs.ensureDir(path.join(expectedPath, '.git'));

      const configContent = `
global:
  src_dir: "${srcDir}"

projects:
  test:
    name: "Test Project"
    repo: "${repo}"
    sample_repo: "test-samples"
`;

      await fs.writeFile(tempConfigPath, configContent);
      const config = await configManager.loadConfig(tempConfigPath);

      expect(config.projects?.test.repo).toBe(expectedPath);
    });

    it('should resolve relative sample_repo paths relative to src_dir', async () => {
      const srcDir = path.join(tempDir, 'src');
      const sampleRepo = 'auth0-samples';
      const expectedPath = path.join(srcDir, sampleRepo);

      const configContent = `
global:
  src_dir: "${srcDir}"

projects:
  test:
    name: "Test Project"
    repo: "~/src/test-sdk"
    sample_repo: "${sampleRepo}"
    github_org: "auth0"
`;

      await fs.writeFile(tempConfigPath, configContent);
      const config = await configManager.loadConfig(tempConfigPath);

      expect(config.projects?.test.sample_repo).toBe(expectedPath);
    });

    it('should handle tilde paths in src_dir', async () => {
      const configContent = `
global:
  src_dir: "~/src"

projects:
  test:
    name: "Test Project"
    repo: "test-repo"
    sample_repo: "test-samples"
`;

      await fs.writeFile(tempConfigPath, configContent);
      const config = await configManager.loadConfig(tempConfigPath);

      const expectedSrcDir = path.join(os.homedir(), 'src');
      expect(config.projects?.test.repo).toBe(path.join(expectedSrcDir, 'test-repo'));
      expect(config.projects?.test.sample_repo).toBe(path.join(expectedSrcDir, 'test-samples'));
    });

    it('should leave absolute paths unchanged', async () => {
      const srcDir = path.join(tempDir, 'src');
      const absoluteRepoPath = '/absolute/path/to/repo';
      const absoluteSamplePath = '/absolute/path/to/sample';

      const configContent = `
global:
  src_dir: "${srcDir}"

projects:
  test:
    name: "Test Project"
    repo: "${absoluteRepoPath}"
    sample_repo: "${absoluteSamplePath}"
`;

      await fs.writeFile(tempConfigPath, configContent);
      const config = await configManager.loadConfig(tempConfigPath);

      expect(config.projects?.test.repo).toBe(absoluteRepoPath);
      expect(config.projects?.test.sample_repo).toBe(absoluteSamplePath);
    });

    it('should leave HTTP URLs unchanged', async () => {
      const srcDir = path.join(tempDir, 'src');
      const httpRepo = 'https://github.com/user/example-repo.git';

      const configContent = `
global:
  src_dir: "${srcDir}"

projects:
  test:
    name: "Test Project"
    repo: "local-repo"
    sample_repo: "${httpRepo}"
`;

      await fs.writeFile(tempConfigPath, configContent);
      const config = await configManager.loadConfig(tempConfigPath);

      expect(config.projects?.test.sample_repo).toBe(httpRepo);
    });
  });

  describe('getWorkspacePaths with resolved paths', () => {
    it('should handle already resolved absolute paths correctly', async () => {
      const srcDir = path.join(tempDir, 'src');
      const sdkRepo = 'test-sdk';
      const sampleRepo = 'test-samples';

      // Create the test repositories
      await fs.ensureDir(path.join(srcDir, sdkRepo, '.git'));
      await fs.ensureDir(path.join(srcDir, sampleRepo));

      const configContent = `
global:
  src_dir: "${srcDir}"
  workspace_base: "workspaces"

projects:
  test:
    name: "Test Project"
    repo: "${sdkRepo}"
    sample_repo: "${sampleRepo}"
    github_org: "auth0"
`;

      await fs.writeFile(tempConfigPath, configContent);
      await configManager.loadConfig(tempConfigPath);

      const workspacePaths = configManager.getWorkspacePaths('test', 'feature-test');

      // Should use resolved absolute paths, not double-resolve them
      expect(workspacePaths.sourceRepoPath).toBe(path.join(srcDir, sdkRepo));
      expect(workspacePaths.destinationRepoPath).toBe(path.join(srcDir, sampleRepo));

      // Workspace paths should be relative to workspace directory
      expect(workspacePaths.workspaceDir).toBe(
        path.join(srcDir, 'workspaces', 'test', 'feature-test'),
      );
      expect(workspacePaths.sourcePath).toBe(path.join(workspacePaths.workspaceDir, sdkRepo));
      expect(workspacePaths.destinationPath).toBe(
        path.join(workspacePaths.workspaceDir, sampleRepo),
      );
    });
  });

  describe('Repository validation', () => {
    it('should provide helpful error messages for missing SDK repository', async () => {
      const srcDir = path.join(tempDir, 'src');
      const sdkRepo = 'nonexistent-sdk';

      const configContent = `
global:
  src_dir: "${srcDir}"

projects:
  test:
    name: "Test Project"
    repo: "${sdkRepo}"
    sample_repo: "test-samples"
    github_org: "auth0"
`;

      await fs.writeFile(tempConfigPath, configContent);
      await configManager.loadConfig(tempConfigPath);

      expect(() => configManager.validateProject('test')).toThrow(ValidationError);

      try {
        configManager.validateProject('test');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const message = (error as ValidationError).message;
        expect(message).toContain('Repository does not exist');
        expect(message).toContain(path.join(srcDir, sdkRepo));
        expect(message).toContain('Clone the repository to the specified path');
        expect(message).toContain('repo:');
      }
    });

    it('should skip validation for HTTP URLs', async () => {
      const srcDir = path.join(tempDir, 'src');
      const httpRepo = 'https://github.com/auth0/nextjs-auth0.git';

      const configContent = `
global:
  src_dir: "${srcDir}"

projects:
  test:
    name: "Test Project"
    repo: "${httpRepo}"
    sample_repo: "https://github.com/auth0/samples.git"
    github_org: "auth0"
`;

      await fs.writeFile(tempConfigPath, configContent);
      await configManager.loadConfig(tempConfigPath);

      // Should not throw for HTTP URLs (no file system validation)
      expect(() => configManager.validateProject('test')).not.toThrow();
    });

    it('should warn but not fail for missing sample repositories', async () => {
      const srcDir = path.join(tempDir, 'src');
      const sdkRepo = 'test-sdk';
      const sampleRepo = 'nonexistent-samples';

      // Create SDK repo but not sample repo
      await fs.ensureDir(path.join(srcDir, sdkRepo, '.git'));

      const configContent = `
global:
  src_dir: "${srcDir}"

projects:
  test:
    name: "Test Project"
    repo: "${sdkRepo}"
    sample_repo: "${sampleRepo}"
    github_org: "auth0"
`;

      await fs.writeFile(tempConfigPath, configContent);
      await configManager.loadConfig(tempConfigPath);

      // Should not throw for missing sample repo (just warns)
      expect(() => configManager.validateProject('test')).not.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty src_dir gracefully', async () => {
      const configContent = `
projects:
  test:
    name: "Test Project"
    repo: "test-sdk"
    sample_repo: "test-samples"
    github_org: "auth0"
`;

      await fs.writeFile(tempConfigPath, configContent);
      const config = await configManager.loadConfig(tempConfigPath);

      // Should default to ~/src when src_dir is not specified
      const defaultSrcDir = path.join(os.homedir(), 'src');
      expect(config.projects?.test.repo).toBe(path.join(defaultSrcDir, 'test-sdk'));
    });

    it('should handle missing projects section', async () => {
      const configContent = `
global:
  src_dir: "~/src"
`;

      await fs.writeFile(tempConfigPath, configContent);
      await configManager.loadConfig(tempConfigPath);

      expect(() => configManager.getProject('nonexistent')).toThrow(ValidationError);
    });
  });
});
