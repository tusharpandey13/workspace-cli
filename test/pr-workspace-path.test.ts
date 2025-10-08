import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { DummyRepoManager } from '../src/services/dummyRepoManager.js';
import { configManager } from '../src/utils/config.js';
import { execSync } from 'child_process';
import { extractWorkspacePathFromArgs } from '../src/commands/init.js';

// Test the PR workspace path functionality
describe('PR Workspace Path', () => {
  let testDir: string;
  let sourceRepoPath: string;
  let destinationRepoPath: string;
  let manager: DummyRepoManager;
  let configPath: string;
  let cliPath: string;

  beforeEach(async () => {
    // Create test environment
    testDir = path.join(os.tmpdir(), `space-cli-test-pr-workspace-${Date.now()}`);
    await fs.ensureDir(testDir);

    manager = new DummyRepoManager(testDir);

    // Create dummy repositories
    sourceRepoPath = await manager.createDummyRepo({ name: 'test-sdk', type: 'sdk' });
    destinationRepoPath = await manager.createDummyRepo({ name: 'test-samples', type: 'sample' });

    // Create test configuration
    configPath = path.join(testDir, 'config.yaml');
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

    // Path to the CLI executable
    cliPath = path.resolve(process.cwd(), 'dist/bin/workspace.js');
  });

  afterEach(async () => {
    await manager.cleanupAll();
    if (testDir && (await fs.pathExists(testDir))) {
      await fs.remove(testDir);
    }
  });

  describe('extractWorkspacePathFromArgs function', () => {
    it('should return undefined for empty args', () => {
      expect(extractWorkspacePathFromArgs([])).toBeUndefined();
    });

    it('should return undefined for numeric arguments (GitHub IDs)', () => {
      expect(extractWorkspacePathFromArgs(['123'])).toBeUndefined();
      expect(extractWorkspacePathFromArgs(['123', '456'])).toBeUndefined();
    });

    it('should return validated workspace path for valid path argument', () => {
      expect(extractWorkspacePathFromArgs(['review/connected-acs'])).toBe('review/connected-acs');
      expect(extractWorkspacePathFromArgs(['feature-branch'])).toBe('feature-branch');
    });

    it('should return workspace path even with GitHub IDs present', () => {
      expect(extractWorkspacePathFromArgs(['123', 'review/feature'])).toBe('review/feature');
    });

    it('should return sanitized workspace path for names with special characters', () => {
      // validateWorkspaceName sanitizes rather than throwing for invalid characters
      expect(extractWorkspacePathFromArgs(['invalid@name'])).toBe('invalidname');
      expect(extractWorkspacePathFromArgs(['test.name'])).toBe('testname');
    });
  });

  describe('workspace path resolution in PR mode', () => {
    it('should use provided workspace path in dry-run mode', async () => {
      const workspaceName = 'review/test-feature';
      const result = execSync(
        `node ${cliPath} init test --pr=123 ${workspaceName} --dry-run --config ${configPath}`,
        { encoding: 'utf8', cwd: testDir },
      );

      // Check that the workspace path is correctly used
      expect(result).toContain('review/test-feature');
    });

    it('should fall back to branch name when no workspace path provided', async () => {
      const result = execSync(
        `node ${cliPath} init test --pr=123 --dry-run --config ${configPath}`,
        { encoding: 'utf8', cwd: testDir },
      );

      // Should use default PR branch name
      expect(result).toContain('pr-123');
    });

    it('should handle nested directory structure correctly', async () => {
      // Load the configuration first
      await configManager.loadConfig(configPath);

      const workspacePath = 'review/connected-acs';
      const paths = configManager.getWorkspacePaths('test', workspacePath);

      expect(paths.workspaceDir).toContain('review/connected-acs');
      expect(paths.workspaceDir).toContain(
        path.join('workspaces', 'test', 'review', 'connected-acs'),
      );
    });

    it('should validate workspace paths contain forward slashes', async () => {
      // Load the configuration first
      await configManager.loadConfig(configPath);

      const workspacePath1 = 'review/feature-branch';
      const workspacePath2 = 'nested/path/structure';

      const paths1 = configManager.getWorkspacePaths('test', workspacePath1);
      const paths2 = configManager.getWorkspacePaths('test', workspacePath2);

      expect(paths1.workspaceDir).toContain('review');
      expect(paths1.workspaceDir).toContain('feature-branch');
      expect(paths2.workspaceDir).toContain('nested');
      expect(paths2.workspaceDir).toContain('structure');
    });
  });

  describe('integration tests', () => {
    it('should create workspace with nested directory structure', async () => {
      // Load the configuration first
      await configManager.loadConfig(configPath);

      const workspacePath = 'review/test-nested';
      const baseDir = configManager.getProjectBaseDir('test');
      const expectedWorkspaceDir = path.join(baseDir, workspacePath);

      // Test path creation logic
      const paths = configManager.getWorkspacePaths('test', workspacePath);
      expect(paths.workspaceDir).toBe(expectedWorkspaceDir);

      // Verify directory structure would be correct
      const parentDir = path.dirname(expectedWorkspaceDir);
      expect(path.basename(parentDir)).toBe('review');
      expect(path.basename(expectedWorkspaceDir)).toBe('test-nested');
    });

    it('should handle workspace path extraction correctly in various scenarios', async () => {
      // Load the configuration first
      await configManager.loadConfig(configPath);

      // Test workspace path resolution through configManager instead
      // This tests the overall functionality without exposing internal functions

      const testCases = [
        { workspacePath: 'simple-branch', expectedBasename: 'simple-branch' },
        { workspacePath: 'review/feature', expectedParts: ['review', 'feature'] },
        { workspacePath: 'deep/nested/path', expectedParts: ['deep', 'nested', 'path'] },
      ];

      testCases.forEach(({ workspacePath, expectedBasename, expectedParts }) => {
        const paths = configManager.getWorkspacePaths('test', workspacePath);

        if (expectedBasename) {
          expect(path.basename(paths.workspaceDir)).toBe(expectedBasename);
        }

        if (expectedParts) {
          expectedParts.forEach((part) => {
            expect(paths.workspaceDir).toContain(part);
          });
        }
      });
    });
  });
});
