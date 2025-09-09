import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { DummyRepoManager } from '../src/services/dummyRepoManager.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { execa } from 'execa';

describe('DummyRepoManager', () => {
  let manager: DummyRepoManager;
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `workspace-cli-test-${Date.now()}`);
    manager = new DummyRepoManager(testDir);
  });

  afterEach(async () => {
    await manager.cleanupAll();
  });

  test('should create a basic SDK repository', async () => {
    const repoPath = await manager.createDummyRepo({
      name: 'test-sdk',
      type: 'sdk',
    });

    expect(repoPath).toBeDefined();
    expect(await fs.pathExists(repoPath)).toBe(true);
    expect(await fs.pathExists(path.join(repoPath, '.git'))).toBe(true);
    expect(await fs.pathExists(path.join(repoPath, 'package.json'))).toBe(true);
    expect(await fs.pathExists(path.join(repoPath, 'src/index.ts'))).toBe(true);

    const packageJson = await fs.readJson(path.join(repoPath, 'package.json'));
    expect(packageJson.name).toBe('@auth0/test-sdk');
  });

  test('should create a basic sample repository', async () => {
    const repoPath = await manager.createDummyRepo({
      name: 'test-samples',
      type: 'sample',
    });

    expect(repoPath).toBeDefined();
    expect(await fs.pathExists(repoPath)).toBe(true);
    expect(await fs.pathExists(path.join(repoPath, '.git'))).toBe(true);
    expect(await fs.pathExists(path.join(repoPath, 'package.json'))).toBe(true);
    expect(await fs.pathExists(path.join(repoPath, 'pages/index.js'))).toBe(true);
    expect(await fs.pathExists(path.join(repoPath, 'pages/api/auth/[...auth0].js'))).toBe(true);

    const packageJson = await fs.readJson(path.join(repoPath, 'package.json'));
    expect(packageJson.name).toBe('test-sample-app');
  });

  test('should create repository with branches', async () => {
    const repoPath = await manager.createDummyRepo({
      name: 'test-branches',
      type: 'sdk',
      branches: ['develop', 'feature/test'],
    });

    expect(repoPath).toBeDefined();

    // Check that branches exist by listing them
    const { stdout: branchOutput } = await execa('git', ['branch', '-a'], { cwd: repoPath });
    expect(branchOutput).toContain('develop');
    expect(branchOutput).toContain('feature/test');

    // Check that branch-specific files exist on their respective branches
    await execa('git', ['checkout', 'develop'], { cwd: repoPath });
    expect(await fs.pathExists(path.join(repoPath, 'develop-file.txt'))).toBe(true);

    await execa('git', ['checkout', 'feature/test'], { cwd: repoPath });
    expect(await fs.pathExists(path.join(repoPath, 'feature_test-file.txt'))).toBe(true);
  });

  test('should create repository with custom files', async () => {
    const customFiles = [
      { path: 'custom.txt', content: 'Custom content' },
      { path: 'nested/file.md', content: '# Nested file' },
    ];

    const repoPath = await manager.createDummyRepo({
      name: 'test-custom-files',
      type: 'sdk',
      files: customFiles,
    });

    expect(await fs.pathExists(path.join(repoPath, 'custom.txt'))).toBe(true);
    expect(await fs.pathExists(path.join(repoPath, 'nested/file.md'))).toBe(true);

    const customContent = await fs.readFile(path.join(repoPath, 'custom.txt'), 'utf8');
    expect(customContent).toBe('Custom content');
  });

  test('should create complete test environment', async () => {
    const { sdkPath, samplePath } = await manager.createTestEnvironment();

    expect(await fs.pathExists(sdkPath)).toBe(true);
    expect(await fs.pathExists(samplePath)).toBe(true);
    expect(await fs.pathExists(path.join(sdkPath, '.git'))).toBe(true);
    expect(await fs.pathExists(path.join(samplePath, '.git'))).toBe(true);

    // Verify repo names
    expect(manager.getRepoPath('test-sdk')).toBe(sdkPath);
    expect(manager.getRepoPath('test-samples')).toBe(samplePath);
  });

  test('should list all created repositories', async () => {
    await manager.createDummyRepo({ name: 'repo1', type: 'sdk' });
    await manager.createDummyRepo({ name: 'repo2', type: 'sample' });

    const repos = manager.listRepos();
    expect(repos).toHaveLength(2);
    expect(repos).toContain('repo1');
    expect(repos).toContain('repo2');
  });

  test('should cleanup individual repository', async () => {
    const repoPath = await manager.createDummyRepo({
      name: 'cleanup-test',
      type: 'sdk',
    });

    expect(await fs.pathExists(repoPath)).toBe(true);

    await manager.cleanupRepo('cleanup-test');

    expect(await fs.pathExists(repoPath)).toBe(false);
    expect(manager.getRepoPath('cleanup-test')).toBeUndefined();
  });

  test('should cleanup all repositories', async () => {
    const repo1Path = await manager.createDummyRepo({ name: 'cleanup1', type: 'sdk' });
    const repo2Path = await manager.createDummyRepo({ name: 'cleanup2', type: 'sample' });

    expect(await fs.pathExists(repo1Path)).toBe(true);
    expect(await fs.pathExists(repo2Path)).toBe(true);

    await manager.cleanupAll();

    expect(await fs.pathExists(repo1Path)).toBe(false);
    expect(await fs.pathExists(repo2Path)).toBe(false);
    expect(manager.listRepos()).toHaveLength(0);
  });

  test('should create corrupted repository for testing', async () => {
    const corruptedPath = await manager.createCorruptedRepo('corrupted-test');

    expect(await fs.pathExists(corruptedPath)).toBe(true);
    expect(await fs.pathExists(path.join(corruptedPath, '.git'))).toBe(true);
    expect(await fs.pathExists(path.join(corruptedPath, 'README.md'))).toBe(true);

    const readmeContent = await fs.readFile(path.join(corruptedPath, 'README.md'), 'utf8');
    expect(readmeContent).toBe('This is not a proper git repo');
  });
});
