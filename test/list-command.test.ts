import { test, expect, beforeEach, afterEach, describe } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { ConfigManager } from '../src/utils/config.js';
import { DummyRepoManager } from '../src/services/dummyRepoManager.js';

/**
 * Create a mock workspace directory with repository subdirectories
 * that contain common repository indicators
 */
async function createMockWorkspace(
  baseDir: string,
  workspaceName: string,
  repoNames: string[],
): Promise<void> {
  const workspaceDir = path.join(baseDir, workspaceName);
  await fs.ensureDir(workspaceDir);

  for (const repoName of repoNames) {
    const repoDir = path.join(workspaceDir, repoName);
    await fs.ensureDir(repoDir);

    // Create common repository indicators
    await fs.writeFile(path.join(repoDir, 'package.json'), '{"name": "test"}');
    await fs.writeFile(path.join(repoDir, 'README.md'), '# Test Repository');
    await fs.ensureDir(path.join(repoDir, 'src'));

    // Create a minimal .git directory structure
    const gitDir = path.join(repoDir, '.git');
    await fs.ensureDir(gitDir);
    await fs.writeFile(path.join(gitDir, 'HEAD'), 'ref: refs/heads/main');
  }
}

describe('List Command', () => {
  let tempDir: string;
  let configManager: ConfigManager;
  let configPath: string;
  let dummyManager: DummyRepoManager;
  let cliPath: string;

  beforeEach(async () => {
    // Create temp directory for test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'list-command-test-'));

    // Initialize dummy repo manager
    dummyManager = new DummyRepoManager(tempDir);

    // Create config manager
    configManager = new ConfigManager();

    // Create test config with real repositories
    const { sdkPath, samplePath } = await dummyManager.createTestEnvironment('test');

    const config = {
      projects: {
        'test-project': {
          name: 'Test Project',
          repo: sdkPath,
          sample_repo: samplePath,
          key: 'test-project',
        },
        'single-project': {
          name: 'Single Repo Project',
          repo: sdkPath,
          key: 'single-project',
        },
      },
      global: {
        src_dir: path.join(tempDir, 'src'),
        workspace_base: 'workspaces',
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

  describe('getProjectBaseDir method', () => {
    test('should return correct base directory for project', () => {
      const baseDir = configManager.getProjectBaseDir('test-project');
      const expected = path.join(tempDir, 'src', 'workspaces', 'test-project');
      expect(baseDir).toBe(expected);
    });

    test('should work for different projects', () => {
      const baseDir1 = configManager.getProjectBaseDir('test-project');
      const baseDir2 = configManager.getProjectBaseDir('single-project');

      expect(baseDir1).toBe(path.join(tempDir, 'src', 'workspaces', 'test-project'));
      expect(baseDir2).toBe(path.join(tempDir, 'src', 'workspaces', 'single-project'));
    });

    test('should throw error for non-existent project', () => {
      expect(() => configManager.getProjectBaseDir('non-existent')).toThrow('Unknown project');
    });
  });

  describe('workspace enumeration', () => {
    test('should enumerate workspaces correctly when they exist', async () => {
      // Create workspace directories manually
      const project1BaseDir = configManager.getProjectBaseDir('test-project');
      const project2BaseDir = configManager.getProjectBaseDir('single-project');

      // Create workspace directories
      await fs.ensureDir(path.join(project1BaseDir, 'feature_branch1'));
      await fs.ensureDir(path.join(project1BaseDir, 'bugfix_issue123'));
      await fs.ensureDir(path.join(project2BaseDir, 'hotfix_urgent'));

      // Test project 1
      const dirs1 = fs
        .readdirSync(project1BaseDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      expect(dirs1.sort()).toEqual(['feature_branch1', 'bugfix_issue123'].sort());

      // Test project 2
      const dirs2 = fs
        .readdirSync(project2BaseDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      expect(dirs2).toEqual(['hotfix_urgent']);
    });

    test('should handle non-existent base directories', () => {
      const project1BaseDir = configManager.getProjectBaseDir('test-project');

      // Directory doesn't exist yet
      expect(fs.existsSync(project1BaseDir)).toBe(false);
    });

    test('should handle empty base directories', async () => {
      const project1BaseDir = configManager.getProjectBaseDir('test-project');

      // Create empty directory
      await fs.ensureDir(project1BaseDir);

      const dirs = fs
        .readdirSync(project1BaseDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      expect(dirs).toEqual([]);
    });
  });

  describe('CLI list command', () => {
    test('should show "no workspaces" message when no workspaces exist', () => {
      const result = execSync(`node ${cliPath} list --config ${configPath}`, {
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'test' },
      });

      expect(result).toContain('No workspaces found for any project');
      expect(result).toContain('To create a workspace, use:');
      expect(result).toContain('space init <project> <branch-name>');
    });

    test('should list workspaces when they exist', async () => {
      // Create workspace directories with repository content
      const project1BaseDir = configManager.getProjectBaseDir('test-project');
      const project2BaseDir = configManager.getProjectBaseDir('single-project');

      // Create realistic workspace structure with repository subdirectories
      await createMockWorkspace(project1BaseDir, 'feature_branch1', ['main-repo', 'sample-repo']);
      await createMockWorkspace(project1BaseDir, 'bugfix_issue123', ['main-repo']);
      await createMockWorkspace(project2BaseDir, 'hotfix_urgent', ['single-repo']);

      const result = execSync(`node ${cliPath} list --config ${configPath}`, {
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'test' },
      });

      // Should show project names and workspace directories
      expect(result).toContain('Test Project (test-project):');
      expect(result).toContain('  feature_branch1');
      expect(result).toContain('  bugfix_issue123');
      expect(result).toContain('Single Repo Project (single-project):');
      expect(result).toContain('  hotfix_urgent');
    });

    test('should list specific project workspaces', async () => {
      // Create workspace directories for one project with repository content
      const project1BaseDir = configManager.getProjectBaseDir('test-project');

      await createMockWorkspace(project1BaseDir, 'feature_branch1', ['main-repo', 'sample-repo']);
      await createMockWorkspace(project1BaseDir, 'bugfix_issue123', ['main-repo']);

      const result = execSync(`node ${cliPath} list test-project --config ${configPath}`, {
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'test' },
      });

      expect(result).toContain('Test Project (test-project):');
      expect(result).toContain('  feature_branch1');
      expect(result).toContain('  bugfix_issue123');
      // Should not contain other projects
      expect(result).not.toContain('Single Repo Project');
    });

    test('should handle invalid project names', () => {
      expect(() => {
        execSync(`node ${cliPath} list invalid-project --config ${configPath}`, {
          encoding: 'utf8',
          env: { ...process.env, NODE_ENV: 'test' },
        });
      }).toThrow();
    });

    test('should handle mixed scenarios (some projects with workspaces, some without)', async () => {
      // Create workspaces for only one project with repository content
      const project1BaseDir = configManager.getProjectBaseDir('test-project');
      await createMockWorkspace(project1BaseDir, 'feature_branch1', ['main-repo']);

      // Don't create any workspaces for single-project

      const result = execSync(`node ${cliPath} list --config ${configPath}`, {
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'test' },
      });

      // Should show the project with workspaces
      expect(result).toContain('Test Project (test-project):');
      expect(result).toContain('  feature_branch1');

      // Should not show the project without workspaces
      expect(result).not.toContain('Single Repo Project (single-project):');
    });
  });

  describe('integration with workspace paths', () => {
    test('should work correctly with getWorkspacePaths method', () => {
      // Test that getWorkspacePaths still works correctly
      const workspacePaths = configManager.getWorkspacePaths('test-project', 'feature_test');

      expect(workspacePaths.baseDir).toBe(path.join(tempDir, 'src', 'workspaces', 'test-project'));
      expect(workspacePaths.workspaceDir).toBe(
        path.join(tempDir, 'src', 'workspaces', 'test-project', 'feature_test'),
      );
    });

    test('should maintain consistency between base directory methods', () => {
      const baseDir = configManager.getProjectBaseDir('test-project');
      const workspacePaths = configManager.getWorkspacePaths('test-project', 'any-workspace');

      expect(baseDir).toBe(workspacePaths.baseDir);
    });
  });

  describe('regression tests for hardcoded values', () => {
    test('should not use hardcoded dummy values in workspace enumeration', async () => {
      // This test would have caught the original 'dummy' bug

      // Create a workspace with a specific name with repository content
      const realWorkspaceName = 'actual_workspace_name';
      const project1BaseDir = configManager.getProjectBaseDir('test-project');
      await createMockWorkspace(project1BaseDir, realWorkspaceName, ['main-repo']);

      // Create a 'dummy' directory that shouldn't be treated specially
      await createMockWorkspace(project1BaseDir, 'dummy', ['main-repo']);

      const result = execSync(`node ${cliPath} list --config ${configPath}`, {
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'test' },
      });

      // Should list both workspaces without treating 'dummy' specially
      expect(result).toContain('actual_workspace_name');
      expect(result).toContain('dummy');

      // Should not contain any references to hardcoded placeholder behavior
      expect(result).not.toContain('Error');
      expect(result).not.toContain('undefined');
      expect(result).not.toContain('null');
    });

    test('should enumerate all actual workspace directories, not placeholders', async () => {
      const project1BaseDir = configManager.getProjectBaseDir('test-project');

      // Create workspaces with various names including potential problematic ones
      const workspaceNames = [
        'feature_real_work',
        'dummy', // This should be treated as a real workspace
        'test_workspace',
        'placeholder_name',
        'temp_branch',
        'mock_feature',
      ];

      for (const name of workspaceNames) {
        await createMockWorkspace(project1BaseDir, name, ['main-repo']);
      }

      const result = execSync(`node ${cliPath} list --config ${configPath}`, {
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'test' },
      });

      // All workspace names should be listed
      for (const name of workspaceNames) {
        expect(result).toContain(name);
      }
    });
  });
});
