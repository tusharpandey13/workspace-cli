import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import path from 'path';

// Set up mocks with inline factories
vi.mock('fs-extra', () => ({
  default: {
    existsSync: vi.fn(),
    readdir: vi.fn(),
    readFile: vi.fn(),
    readdirSync: vi.fn(),
    statSync: vi.fn()
  }
}));

vi.mock('../src/utils/init-helpers.js', () => ({
  executeCommand: vi.fn(),
  executeGit: vi.fn(),
  fileOps: {
    ensureDir: vi.fn(),
    removeFile: vi.fn(),
    copyFile: vi.fn(),
    writeFile: vi.fn()
  },
  extractRelevantContent: vi.fn(),
  fetchComments: vi.fn(),
  createTestFileName: vi.fn()
}));

vi.mock('../src/utils/logger.js', () => ({
  logger: {
    verbose: vi.fn(),
    info: vi.fn(),
    step: vi.fn(),
    success: vi.fn(),
    warn: vi.fn()
  }
}));

vi.mock('../src/utils/config.js', () => ({
  configManager: {
    getTemplates: vi.fn(),
    getGlobal: vi.fn(),
    getEnvFilePath: vi.fn(),
    getCliRoot: vi.fn()
  }
}));

// Import after mocking
import { fetchPRData, initializePRWorkspace } from '../src/commands/pr.js';
import fs from 'fs-extra';
import { 
  executeCommand,
  executeGit,
  fileOps,
  extractRelevantContent,
  fetchComments,
  createTestFileName 
} from '../src/utils/init-helpers.js';
import { logger } from '../src/utils/logger.js';
import { configManager } from '../src/utils/config.js';

describe('PR Commands', () => {
  const mockProject = {
    key: 'next',
    name: 'NextJS Auth0 SDK',
    sdk_repo: 'nextjs-auth0',
    sample_repo: 'auth0-nextjs-samples',
    github_org: 'auth0',
    sample_app_path: 'Sample-01',
    env_file: 'next.env.local'
  };

  const mockPaths = {
    srcDir: '/Users/test/src',
    baseDir: '/Users/test/src/workspaces',
    workspaceDir: '/Users/test/src/workspaces/next/pr-123-feature_test-branch',
    sdkPath: '/Users/test/src/workspaces/next/pr-123-feature_test-branch/nextjs-auth0',
    samplesPath: '/Users/test/src/workspaces/next/pr-123-feature_test-branch/auth0-nextjs-samples',
    sampleAppPath: '/Users/test/src/workspaces/next/pr-123-feature_test-branch/auth0-nextjs-samples/Sample-01',
    sdkRepoPath: '/Users/test/src/nextjs-auth0',
    sampleRepoPath: '/Users/test/src/auth0-nextjs-samples'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    (executeCommand as any).mockResolvedValue({ stdout: '{}' });
    (executeGit as any).mockResolvedValue({ stdout: '' });
    (fileOps.ensureDir as any).mockResolvedValue(undefined);
    (fileOps.removeFile as any).mockResolvedValue(undefined);
    (fileOps.copyFile as any).mockResolvedValue(undefined);
    (fileOps.writeFile as any).mockResolvedValue(undefined);
    
    (extractRelevantContent as any).mockReturnValue({
      id: 123,
      title: 'Test PR',
      body: 'Test PR description',
      state: 'open',
      type: 'pull_request',
      url: 'https://github.com/auth0/nextjs-auth0/pull/123',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-02T00:00:00Z',
      labels: ['feature'],
      assignees: ['testuser'],
      comments_url: 'https://api.github.com/repos/auth0/nextjs-auth0/issues/123/comments',
      links: []
    });
    
    (fetchComments as any).mockResolvedValue([]);
    (createTestFileName as any).mockReturnValue('test-pr-123.spec.ts');
    
    // Mock config manager
    (configManager.getTemplates as any).mockReturnValue({ dir: '/test/templates' });
    (configManager.getGlobal as any).mockReturnValue({ package_manager: 'pnpm' });
    (configManager.getEnvFilePath as any).mockReturnValue('/test/env/next.env.local');
    (configManager.getCliRoot as any).mockReturnValue('/test/cli');
    
    // Mock fs operations
    (fs.existsSync as any).mockReturnValue(false);
    (fs.readdir as any).mockResolvedValue([]);
    (fs.readFile as any).mockResolvedValue('template content {{PLACEHOLDER}}');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchPRData', () => {
    it('should fetch real PR data successfully', async () => {
      const mockPRResponse = JSON.stringify({
        number: 123,
        title: 'Test PR',
        body: 'Test PR description',
        state: 'open',
        html_url: 'https://github.com/auth0/nextjs-auth0/pull/123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
        labels: [{ name: 'feature' }],
        assignees: [{ login: 'testuser' }],
        comments_url: 'https://api.github.com/repos/auth0/nextjs-auth0/issues/123/comments',
        head: {
          ref: 'feature/test-branch',
          sha: 'abc123'
        },
        base: {
          ref: 'main'
        },
        pull_request: {}
      });

      (executeCommand as any).mockResolvedValue({ 
        stdout: mockPRResponse 
      });

      const result = await fetchPRData(123, mockProject, false);

      expect(result.branchName).toBe('feature/test-branch');
      expect(result.data.id).toBe(123);
      expect(result.data.title).toBe('Test PR');
      expect(result.data.type).toBe('pull_request');
      
      expect(executeCommand).toHaveBeenCalledWith(
        'gh',
        ['api', 'repos/auth0/nextjs-auth0/pulls/123'],
        { stdio: 'pipe' },
        'fetch repos/auth0/nextjs-auth0/pulls/123',
        false
      );
      
      expect(fetchComments).toHaveBeenCalledWith(
        'https://api.github.com/repos/auth0/nextjs-auth0/issues/123/comments',
        123,
        false
      );
    });

    it('should return mock data for dry run', async () => {
      const result = await fetchPRData(456, mockProject, true);

      expect(result.branchName).toBe('feature/pr-456-branch');
      expect(result.data.id).toBe(123); // From mocked extractRelevantContent
      expect(result.data.title).toBe('Test PR');
      
      expect(executeCommand).toHaveBeenCalledWith(
        'gh',
        ['api', 'repos/auth0/nextjs-auth0/pulls/456'],
        { stdio: 'pipe' },
        'fetch repos/auth0/nextjs-auth0/pulls/456',
        true
      );
    });

    it('should handle GitHub API errors gracefully', async () => {
      (executeCommand as any).mockRejectedValue(new Error('API rate limit exceeded'));

      await expect(fetchPRData(999, mockProject, false)).rejects.toThrow(
        'Failed to fetch PR #999: API rate limit exceeded'
      );
    });

    it('should extract branch name correctly', async () => {
      const mockPRWithBranch = JSON.stringify({
        head: { ref: 'feature/complex-branch-name/with-slashes' },
        number: 123,
        title: 'Test',
        body: 'Test'
      });

      (executeCommand as any).mockResolvedValue({ 
        stdout: mockPRWithBranch 
      });

      const result = await fetchPRData(123, mockProject, false);
      expect(result.branchName).toBe('feature/complex-branch-name/with-slashes');
    });

    it('should fallback to default branch name if head.ref is missing', async () => {
      const mockPRWithoutHead = JSON.stringify({
        number: 123,
        title: 'Test',
        body: 'Test'
      });

      (executeCommand as any).mockResolvedValue({ 
        stdout: mockPRWithoutHead 
      });

      const result = await fetchPRData(123, mockProject, false);
      expect(result.branchName).toBe('pr-123');
    });
  });

  describe('initializePRWorkspace', () => {
    const initOptions = {
      project: mockProject,
      projectKey: 'next',
      prId: 123,
      branchName: 'feature/test-branch',
      workspaceName: 'pr-123-feature_test-branch',
      paths: mockPaths,
      isDryRun: false
    };

    it('should initialize PR workspace successfully', async () => {
      (fs.readdir as any).mockResolvedValue(['analysis.prompt.md', 'tests.prompt.md']);
      
      await initializePRWorkspace(initOptions);

      // Verify workspace directory creation
      expect(fileOps.ensureDir).toHaveBeenCalledWith(
        mockPaths.workspaceDir,
        expect.stringContaining('workspace directory'),
        false
      );

      // Verify git worktrees setup
      expect(executeGit).toHaveBeenCalledWith(
        ['worktree', 'prune'],
        { cwd: mockPaths.sdkRepoPath },
        expect.stringContaining('prune worktrees'),
        false
      );

      // Verify dependencies installation
      expect(executeCommand).toHaveBeenCalledWith(
        'pnpm',
        ['install', '--prefer-offline', '--silent'],
        { cwd: mockPaths.sdkPath, stdio: 'pipe' },
        'install SDK dependencies',
        false
      );

      // Verify templates copying
      expect(fileOps.copyFile).toHaveBeenCalledWith(
        '/test/templates',
        mockPaths.workspaceDir,
        expect.stringContaining('templates'),
        false
      );

      // Verify success logging
      expect(logger.success).toHaveBeenCalledWith(
        expect.stringContaining('workspace created for PR #123')
      );
    });

    it('should handle existing workspace gracefully', async () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readdir as any).mockResolvedValue(['existing-file.txt']);

      await initializePRWorkspace(initOptions);

      expect(logger.info).toHaveBeenCalledWith('➡️  Workspace already exists, continuing...');
    });

    it('should work in dry run mode', async () => {
      const dryRunOptions = { ...initOptions, isDryRun: true };
      
      await initializePRWorkspace(dryRunOptions);

      // Verify all operations are called with isDryRun: true
      expect(fileOps.ensureDir).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        true
      );

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('DRY-RUN COMPLETE')
      );
    });

    it('should handle git worktree setup failures gracefully', async () => {
      (executeGit as any)
        .mockRejectedValueOnce(new Error('Git worktree failed'))
        .mockResolvedValue({ stdout: '' });

      await initializePRWorkspace(initOptions);

      // Should continue despite git errors and complete successfully
      expect(logger.success).toHaveBeenCalledWith(
        expect.stringContaining('workspace created for PR #123')
      );
    });

    it('should setup environment files correctly', async () => {
      (fs.existsSync as any).mockImplementation((filePath: string) => {
        return filePath === '/test/env/next.env.local';
      });

      await initializePRWorkspace(initOptions);

      expect(fileOps.copyFile).toHaveBeenCalledWith(
        '/test/env/next.env.local',
        path.join(mockPaths.sampleAppPath, '.env.local'),
        expect.stringContaining('environment file'),
        false
      );
    });

    it('should update template placeholders correctly', async () => {
      (fs.readdir as any).mockResolvedValue(['analysis.prompt.md', 'tests.prompt.md']);
      
      await initializePRWorkspace(initOptions);

      expect(fileOps.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('analysis.prompt.md'),
        expect.any(String),
        expect.stringContaining('prompt file'),
        false
      );
    });

    it('should create PR info file', async () => {
      await initializePRWorkspace(initOptions);

      expect(fileOps.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('PR_INFO_123.md'),
        expect.stringContaining('# PR Info for #123'),
        expect.stringContaining('PR info for #123'),
        false
      );
    });

    it('should handle different package managers', async () => {
      (configManager.getGlobal as any).mockReturnValue({
        package_manager: 'npm'
      });

      await initializePRWorkspace(initOptions);

      expect(executeCommand).toHaveBeenCalledWith(
        'npm',
        ['install', '--prefer-offline', '--silent'],
        expect.any(Object),
        expect.any(String),
        false
      );
    });

    it('should link SDK to sample app via yalc', async () => {
      await initializePRWorkspace(initOptions);

      expect(executeCommand).toHaveBeenCalledWith(
        'pnpm',
        ['yalc', 'add', '@auth0/nextjs-auth0', '--silent'],
        { cwd: mockPaths.sampleAppPath, stdio: 'pipe' },
        'link SDK into sample app',
        false
      );
    });
  });

  describe('Git Worktree Setup', () => {
    it('should fetch PR branch before setting up SDK worktree', async () => {
      const initOptions = {
        project: mockProject,
        projectKey: 'next',
        prId: 123,
        branchName: 'feature/test-branch',
        workspaceName: 'pr-123-feature_test-branch',
        paths: mockPaths,
        isDryRun: false
      };

      await initializePRWorkspace(initOptions);

      expect(executeGit).toHaveBeenCalledWith(
        ['fetch', 'origin', 'feature/test-branch:feature/test-branch'],
        { cwd: mockPaths.sdkRepoPath },
        expect.stringContaining('fetch PR branch'),
        false
      );
    });

    it('should handle git fetch failures gracefully', async () => {
      (executeGit as any)
        .mockResolvedValueOnce({ stdout: '' }) // prune
        .mockRejectedValueOnce(new Error('Fetch failed')) // fetch - should be ignored
        .mockResolvedValue({ stdout: '' }); // subsequent calls

      const initOptions = {
        project: mockProject,
        projectKey: 'next',
        prId: 123,
        branchName: 'feature/test-branch',
        workspaceName: 'pr-123-feature_test-branch',
        paths: mockPaths,
        isDryRun: false
      };

      await initializePRWorkspace(initOptions);

      // Should continue despite fetch failure
      expect(logger.success).toHaveBeenCalledWith(
        expect.stringContaining('workspace created for PR #123')
      );
    });

    it('should use fallback worktree creation strategies', async () => {
      (executeGit as any)
        // SDK worktree setup
        .mockResolvedValueOnce({ stdout: '' }) // prune SDK
        .mockResolvedValueOnce({ stdout: '' }) // fetch SDK branch
        .mockRejectedValueOnce(new Error('Create new branch failed')) // create new SDK worktree fails
        .mockResolvedValueOnce({ stdout: '' }) // add existing SDK branch succeeds
        // Sample worktree setup with default branch detection
        .mockResolvedValueOnce({ stdout: 'refs/remotes/origin/main' }) // get default branch
        .mockResolvedValueOnce({ stdout: '' }) // prune samples
        .mockRejectedValueOnce(new Error('Create new branch failed')) // create new sample worktree fails
        .mockRejectedValueOnce(new Error('Add existing failed')) // add existing fails
        .mockResolvedValueOnce({ stdout: '' }); // force add succeeds

      const initOptions = {
        project: mockProject,
        projectKey: 'next',
        prId: 123,
        branchName: 'feature/test-branch',
        workspaceName: 'pr-123-feature_test-branch',
        paths: mockPaths,
        isDryRun: false
      };

      await initializePRWorkspace(initOptions);

      // Should have used SDK branch for SDK worktree
      expect(executeGit).toHaveBeenCalledWith(
        ['worktree', 'add', mockPaths.sdkPath, 'feature/test-branch'],
        { cwd: mockPaths.sdkRepoPath },
        expect.stringContaining('add existing branch'),
        false
      );

      // Should have used default branch (main) for sample worktree
      expect(executeGit).toHaveBeenCalledWith(
        ['worktree', 'add', '-f', mockPaths.samplesPath, 'main'],
        { cwd: mockPaths.sampleRepoPath },
        expect.stringContaining('force add branch'),
        false
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle missing environment files gracefully', async () => {
      (configManager.getEnvFilePath as any).mockReturnValue(null);

      const initOptions = {
        project: mockProject,
        projectKey: 'next',
        prId: 123,
        branchName: 'feature/test-branch',
        workspaceName: 'pr-123-feature_test-branch',
        paths: mockPaths,
        isDryRun: false
      };

      await initializePRWorkspace(initOptions);

      // Should complete successfully without environment file
      expect(logger.success).toHaveBeenCalledWith(
        expect.stringContaining('workspace created for PR #123')
      );
    });

    it('should handle template directory missing', async () => {
      (configManager.getTemplates as any).mockReturnValue({});
      (configManager.getCliRoot as any).mockReturnValue('/test/cli');

      const initOptions = {
        project: mockProject,
        projectKey: 'next',
        prId: 123,
        branchName: 'feature/test-branch',
        workspaceName: 'pr-123-feature_test-branch',
        paths: mockPaths,
        isDryRun: false
      };

      await initializePRWorkspace(initOptions);

      expect(fileOps.copyFile).toHaveBeenCalledWith(
        '/test/cli/src/templates',
        mockPaths.workspaceDir,
        expect.stringContaining('templates'),
        false
      );
    });
  });

  describe('Template Processing', () => {
    it('should generate proper placeholder values', async () => {
      const initOptions = {
        project: mockProject,
        projectKey: 'next',
        prId: 123,
        branchName: 'feature/test-branch',
        workspaceName: 'pr-123-feature_test-branch',
        paths: mockPaths,
        isDryRun: false
      };

      (fs.readdir as any).mockResolvedValue(['test.prompt.md']);
      (fs.readFile as any).mockResolvedValue('Welcome to {{PROJECT_NAME}} project in {{WORKSPACE_DIR}}');
      
      await initializePRWorkspace(initOptions);

      // Check that placeholders are replaced correctly
      expect(fileOps.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('test.prompt.md'),
        expect.stringContaining('NextJS Auth0 SDK'), // PROJECT_NAME placeholder
        expect.any(String),
        false
      );
    });

    it('should handle empty template directories', async () => {
      const initOptions = {
        project: mockProject,
        projectKey: 'next',
        prId: 123,
        branchName: 'feature/test-branch',
        workspaceName: 'pr-123-feature_test-branch',
        paths: mockPaths,
        isDryRun: false
      };

      (fs.readdir as any).mockResolvedValue([]);
      
      await initializePRWorkspace(initOptions);

      // Should complete successfully even with no prompt files
      expect(logger.success).toHaveBeenCalledWith(
        expect.stringContaining('workspace created for PR #123')
      );
    });
  });

  describe('SDK Key Files Generation', () => {
    it('should handle SDK key files detection', async () => {
      const initOptions = {
        project: mockProject,
        projectKey: 'next',
        prId: 123,
        branchName: 'feature/test-branch',
        workspaceName: 'pr-123-feature_test-branch',
        paths: mockPaths,
        isDryRun: false
      };

      (fs.existsSync as any).mockImplementation((filePath: string) => {
        return filePath.includes('src/index.ts') || filePath.includes('src/server');
      });

      await initializePRWorkspace(initOptions);

      // Should complete successfully and handle file detection
      expect(logger.success).toHaveBeenCalledWith(
        expect.stringContaining('workspace created for PR #123')
      );
    });
  });

  describe('Sample Key Files Generation', () => {
    it('should handle sample files detection', async () => {
      const initOptions = {
        project: mockProject,
        projectKey: 'next',
        prId: 123,
        branchName: 'feature/test-branch',
        workspaceName: 'pr-123-feature_test-branch',
        paths: mockPaths,
        isDryRun: false
      };

      (fs.readdirSync as any).mockImplementation((dir: string) => {
        if (dir.includes('samples')) {
          return ['auth.js', 'middleware.js'] as any;
        }
        return [] as any;
      });

      (fs.statSync as any).mockReturnValue({ isDirectory: () => false } as any);

      await initializePRWorkspace(initOptions);

      // Should complete successfully and handle file detection
      expect(logger.success).toHaveBeenCalledWith(
        expect.stringContaining('workspace created for PR #123')
      );
    });
  });
});
