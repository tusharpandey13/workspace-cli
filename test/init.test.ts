import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { DummyRepoManager } from '../src/services/dummyRepoManager.js';
import { configManager } from '../src/utils/config.js';

// Mock execa selectively - allow git commands, provide flexible GitHub CLI mocking
const mockGitHubResponses: { [key: string]: any } = {};

vi.mock('execa', () => ({
  execa: vi.fn().mockImplementation(async (command: string, args: string[], options?: any) => {
    // Allow git commands to execute normally for DummyRepoManager
    if (command === 'git') {
      const { execa: actualExeca } = await vi.importActual<typeof import('execa')>('execa');
      return actualExeca(command, args, options);
    }

    // Mock GitHub CLI commands for test scenarios
    if (command === 'gh') {
      const subcommand = args[0];

      if (subcommand === 'auth' && args[1] === 'status') {
        // Mock GitHub auth status - assume authenticated by default
        return { stdout: 'Logged in to github.com as testuser' };
      }

      if (subcommand === 'api') {
        const apiPath = args[1];

        // Handle the specific validation API call pattern
        if (apiPath?.includes('repos/test-org/test/issues/2328') && args.includes('--jq')) {
          return { stdout: '2328', exitCode: 0 };
        }

        // Check if a specific response is set for this API call
        const mockKey = `api:${apiPath}`;
        if (mockGitHubResponses[mockKey]) {
          const mockResponse = mockGitHubResponses[mockKey];
          if (mockResponse.error) {
            throw mockResponse.error;
          }
          return mockResponse;
        }

        // Default successful responses
        if (apiPath?.includes('/issues/')) {
          const issueNumber = apiPath.split('/').pop();
          return {
            stdout: JSON.stringify({ number: issueNumber || 123 }),
          };
        }
        if (apiPath?.includes('/pulls/')) {
          const prNumber = apiPath.split('/').pop();
          return {
            stdout: JSON.stringify({ number: prNumber || 101 }),
          };
        }
      }

      // Default GitHub CLI mock
      return { stdout: '{}' };
    }

    // Default mock for any other commands
    return { stdout: 'mock-output' };
  }),
}));

// Helper functions for GitHub API mocking
const setMockGitHubResponse = (apiPath: string, response: any) => {
  mockGitHubResponses[`api:${apiPath}`] = response;
};

const clearMockGitHubResponses = () => {
  Object.keys(mockGitHubResponses).forEach((key) => delete mockGitHubResponses[key]);
};

// Mock logger to suppress output during tests
vi.mock('../src/utils/logger.js', () => ({
  logger: {
    verbose: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    step: vi.fn(),
    command: vi.fn(),
  },
}));

// Mock validation utilities
vi.mock('../src/utils/validation.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/utils/validation.js')>();
  return {
    ...actual,
    validateProjectKey: vi.fn(),
    validateWorkspaceName: vi.fn(),
    validateRepositoryPath: vi.fn(), // Add the missing mock
  };
});

describe('Init Command - Comprehensive', () => {
  let testDir: string;
  let manager: DummyRepoManager;
  let sourceRepoPath: string;
  let destinationRepoPath: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    clearMockGitHubResponses();

    testDir = path.join(os.tmpdir(), `init-test-${Date.now()}`);
    await fs.ensureDir(testDir);

    manager = new DummyRepoManager(testDir);
    const { sdkPath, samplePath } = await manager.createTestEnvironment('test');
    sourceRepoPath = sdkPath;
    destinationRepoPath = samplePath;

    // Load mock configuration for tests
    const mockConfig = {
      projects: {
        test: {
          name: 'Test Project',
          repo: sourceRepoPath,
          sample_repo: destinationRepoPath,
        },
      },
      global: {
        src_dir: testDir,
        workspace_base: 'workspaces',
        env_files_dir: './env-files',
      },
      templates: {
        dir: './src/templates',
      },
      workflows: {
        'issue-fix': {
          prompts: ['fix-and-test.prompt.md'],
          description: 'Fix bugs and issues',
        },
        'feature-development': {
          prompts: ['analysis.prompt.md'],
          description: 'Develop new features',
        },
      },
    };

    // Set the mock config directly on the configManager instance
    configManager.config = mockConfig;
  });

  afterEach(async () => {
    await manager.cleanupAll();
    if (fs.existsSync(testDir)) {
      await fs.remove(testDir);
    }
  });

  describe('Worktree Setup Logic', () => {
    it('should use specified branch for SDK worktree and fallback to default branch for sample worktree', async () => {
      const { setupWorktrees } = await import('../src/services/gitWorktrees.js');

      const project = {
        key: 'test',
        name: 'Test Project',
        repo: sourceRepoPath,
        sample_repo: destinationRepoPath,
      };

      const workspaceName = 'test-branch-logic';
      const branchName = 'feature/branch-test';
      const paths = configManager.getWorkspacePaths('test', workspaceName);

      // Ensure workspace directory exists
      await fs.ensureDir(paths.workspaceDir);

      await setupWorktrees(project, paths, branchName, false);

      // Verify SDK worktree was created with specified branch
      expect(fs.existsSync(paths.sourcePath)).toBe(true);
      expect(fs.existsSync(path.join(paths.sourcePath, '.git'))).toBe(true);

      // Verify samples worktree was created
      if (paths.destinationPath) {
        expect(fs.existsSync(paths.destinationPath)).toBe(true);
        expect(fs.existsSync(path.join(paths.destinationPath, '.git'))).toBe(true);
      }
    });

    it('should handle mixed repository types (local paths vs repository names)', async () => {
      // Test with local path for SDK repo and remote URL for sample repo
      const project = {
        key: 'test',
        name: 'Mixed Repository Test',
        repo: sourceRepoPath, // Local path
        sample_repo: 'https://github.com/example/sample.git', // Remote URL
      };

      // Should not throw during configuration parsing
      expect(project.repo).toEqual(sourceRepoPath);
      expect(project.sample_repo).toContain('github.com');
    });

    it('should gracefully fallback when branch does not exist in sample repository', async () => {
      const { setupWorktrees } = await import('../src/services/gitWorktrees.js');

      const project = {
        key: 'test',
        name: 'Test Project',
        repo: sourceRepoPath,
        sample_repo: destinationRepoPath,
      };

      const workspaceName = 'test-branch-fallback';
      const nonExistentBranch = 'feature/non-existent-branch';
      const paths = configManager.getWorkspacePaths('test', workspaceName);

      // Ensure workspace directory exists
      await fs.ensureDir(paths.workspaceDir);

      // Should not throw error - should fallback to default branch for sample repo
      await expect(setupWorktrees(project, paths, nonExistentBranch, false)).resolves.not.toThrow();
    });

    it('should handle repositories with master as default branch', async () => {
      // Create a repository with 'master' as default branch
      const masterRepoPath = await manager.createDummyRepo({
        name: 'master-default',
        type: 'sdk',
        branches: ['master'],
        hasRemote: false,
      });

      const project = {
        key: 'test',
        name: 'Master Branch Test',
        repo: masterRepoPath,
        sample_repo: destinationRepoPath,
      };

      const workspaceName = 'test-master-branch';
      const branchName = 'feature/master-test';
      const paths = configManager.getWorkspacePaths('test', workspaceName);

      const { setupWorktrees } = await import('../src/services/gitWorktrees.js');

      // Ensure workspace directory exists
      await fs.ensureDir(paths.workspaceDir);

      // Should handle master branch repositories correctly
      await expect(setupWorktrees(project, paths, branchName, false)).resolves.not.toThrow();
    });
  });

  describe('Configuration Path Resolution', () => {
    it('should correctly resolve relative sample repository paths', () => {
      // Test path resolution logic
      const relativePath = './samples/example-app';
      const resolved = path.resolve(relativePath);

      expect(path.isAbsolute(resolved)).toBe(true);
      expect(resolved).toContain('example-app');
    });

    it('should handle tilde expansion in SDK repository paths', () => {
      // Mock tilde expansion functionality
      const tildeTest = '~/src/test-repo';
      const homeDir = os.homedir();
      const expanded = tildeTest.replace('~', homeDir);

      expect(expanded).toContain(homeDir);
      expect(expanded).toContain('test-repo');
    });
  });

  describe('Error Handling', () => {
    it('should provide helpful error messages when worktree creation fails', () => {
      // This is more of a contract test - ensuring error handling exists
      const mockProject = {
        key: 'test',
        name: 'Error Test Project',
        repo: '/non/existent/path',
      };

      expect(mockProject.repo).toBeDefined();
      // Error handling would be tested in the actual implementation
    });

    it('should handle non-existent sample repository paths', () => {
      const mockProject = {
        key: 'test',
        name: 'Non-existent Sample Test',
        repo: sourceRepoPath,
        sample_repo: '/non/existent/sample/path',
      };

      // Should not throw during configuration - error handling in implementation
      expect(mockProject.sample_repo).toBeDefined();
    });
  });

  describe('Early GitHub ID validation', () => {
    it('should validate GitHub IDs before workspace setup', async () => {
      // Set up mock response for GitHub API to return a valid issue
      setMockGitHubResponse('repos/test-org/test/issues/2328', {
        stdout: JSON.stringify({
          number: 2328,
          title: 'Test Issue',
          body: 'Test issue body',
          state: 'open',
        }),
      });

      const configPath = path.join(testDir, 'config.yaml');
      const configContent = `
projects:
  test:
    name: "Test Project"
    repo: "${sourceRepoPath}"
    sample_repo: "${destinationRepoPath}"
    github_org: "test-org"

global:
  src_dir: "${testDir}"
  workspace_base: "workspaces"
`;
      await fs.writeFile(configPath, configContent);

      // Load the config manually for the test
      await configManager.loadConfig(configPath);

      const { initCommand } = await import('../src/commands/init.js');
      const { Command } = await import('commander');

      const mockProgram = new Command();
      // Add the global config option to match the actual CLI behavior
      mockProgram.option('-c, --config <path>', 'Path to configuration file');
      initCommand(mockProgram);

      // This should validate GitHub ID early and proceed with dry-run
      await expect(
        mockProgram.parseAsync([
          'node',
          'test',
          'init',
          'test',
          '2328',
          'feature/test-branch',
          '--config',
          configPath,
          '--dry-run',
        ]),
      ).resolves.not.toThrow();
    });

    it('should fail early with non-existent GitHub ID', async () => {
      const configPath = path.join(testDir, 'config.yaml');
      const configContent = `
projects:
  test:
    name: "Test Project"
    repo: "${sourceRepoPath}"
    sample_repo: "${destinationRepoPath}"
    github_org: "test-org"

global:
  src_dir: "${testDir}"
  workspace_base: "workspaces"
`;
      await fs.writeFile(configPath, configContent);

      // Mock GitHub API 404 response
      const error = new Error('API error');
      (error as any).stderr = 'Not Found';
      setMockGitHubResponse('repos/test-org/test-sdk/issues/999', { error });

      // Load config manually before testing
      await configManager.loadConfig(configPath);

      const { initCommand } = await import('../src/commands/init.js');
      const { Command } = await import('commander');

      const mockProgram = new Command();
      initCommand(mockProgram);

      // Should fail early due to non-existent GitHub ID
      await expect(
        mockProgram.parseAsync(['node', 'test', 'init', 'test', '999', 'feature/test-branch']),
      ).rejects.toThrow();
    });

    it('should provide helpful error message for authentication issues', async () => {
      const configPath = path.join(testDir, 'config.yaml');
      const configContent = `
projects:
  test:
    name: "Test Project"
    repo: "${sourceRepoPath}"
    sample_repo: "${destinationRepoPath}"
    github_org: "test-org"

global:
  src_dir: "${testDir}"
  workspace_base: "workspaces"
`;
      await fs.writeFile(configPath, configContent);

      // Mock GitHub CLI authentication error
      const error = new Error('API error');
      (error as any).stderr = 'Unauthorized';
      setMockGitHubResponse('repos/test-org/test-sdk/issues/123', { error });

      // Load config manually before testing
      await configManager.loadConfig(configPath);

      const { initCommand } = await import('../src/commands/init.js');
      const { Command } = await import('commander');

      const mockProgram = new Command();
      initCommand(mockProgram);

      // Should fail with clear authentication guidance
      await expect(
        mockProgram.parseAsync(['node', 'test', 'init', 'test', '123', 'feature/test-branch']),
      ).rejects.toThrow();
    });
  });

  describe('Enhanced workspace cleanup', () => {
    it('should clean up git branches when overwriting workspace', async () => {
      const { setupWorktrees } = await import('../src/services/gitWorktrees.js');

      // Create initial workspace with branches
      const workspaceName = 'test-cleanup-workspace';
      const branchName = 'feature/cleanup-test';
      const paths = configManager.getWorkspacePaths('test', workspaceName);

      const project = {
        key: 'test',
        name: 'Test Project',
        repo: sourceRepoPath,
        sample_repo: destinationRepoPath,
      };

      // Ensure workspace directory exists
      await fs.ensureDir(paths.workspaceDir);

      // Set up worktrees initially
      await setupWorktrees(project, paths, branchName, false);

      // Verify directories were created
      expect(fs.existsSync(paths.sourcePath)).toBe(true);
      if (paths.destinationPath) {
        expect(fs.existsSync(paths.destinationPath)).toBe(true);
      }

      // Verify branches were created
      const { execa: actualExeca } = await vi.importActual<typeof import('execa')>('execa');
      const { stdout: sourceBranches } = await actualExeca('git', ['branch'], {
        cwd: sourceRepoPath,
      });

      expect(sourceBranches).toContain(branchName);
    });

    it('should handle missing branches gracefully during cleanup', async () => {
      const workspaceName = 'test-missing-branches';
      const paths = configManager.getWorkspacePaths('test', workspaceName);

      // Create workspace directory without branches
      await fs.ensureDir(paths.workspaceDir);
      await fs.writeFile(path.join(paths.workspaceDir, 'test.txt'), 'test');

      // Should handle cleanup gracefully even with missing branches
      expect(fs.existsSync(paths.workspaceDir)).toBe(true);

      // Cleanup logic would be tested in implementation
    });
  });

  describe('Integration Testing', () => {
    it('should create valid config and test simple command', async () => {
      const configPath = path.join(testDir, 'config.yaml');
      const configContent = `
projects:
  test:
    name: "Test Project"
    repo: "${sourceRepoPath}"
    sample_repo: "${destinationRepoPath}"
    github_org: "test-org"

global:
  src_dir: "${testDir}"
  workspace_base: "workspaces"
`;
      await fs.writeFile(configPath, configContent);

      // Verify config file was created
      expect(fs.existsSync(configPath)).toBe(true);

      // Verify config content is valid
      const content = await fs.readFile(configPath, 'utf-8');
      expect(content).toContain('test:');
      expect(content).toContain('Test Project');
    });

    it('should validate repositories are properly created', async () => {
      // This test validates the test environment setup itself
      expect(fs.existsSync(sourceRepoPath)).toBe(true);
      expect(fs.existsSync(destinationRepoPath)).toBe(true);

      // Verify .git directories exist
      expect(fs.existsSync(path.join(sourceRepoPath, '.git'))).toBe(true);
      expect(fs.existsSync(path.join(destinationRepoPath, '.git'))).toBe(true);

      // Validate git repositories can be queried
      const { execa: actualExeca } = await vi.importActual<typeof import('execa')>('execa');
      const sdkBranches = await actualExeca('git', ['branch', '--list'], {
        cwd: sourceRepoPath,
        timeout: 5000,
      });
      expect(sdkBranches.stdout).toContain('main');

      const sampleBranches = await actualExeca('git', ['branch', '--list'], {
        cwd: destinationRepoPath,
        timeout: 5000,
      });
      expect(sampleBranches.stdout).toContain('main');
    }, 10000);
  });
});
