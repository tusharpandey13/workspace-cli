import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { ConfigManager } from '../src/utils/config.js';

describe('Config Loading Bug - Empty Projects Issue', () => {
  let tempConfigPath: string;
  let configManager: ConfigManager;

  beforeEach(() => {
    // Create a temporary config file location
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
    tempConfigPath = path.join(tempDir, '.space-config.yaml');

    // Mock os.homedir to point to our temp directory
    vi.spyOn(os, 'homedir').mockReturnValue(path.dirname(tempConfigPath));

    configManager = new ConfigManager();
  });

  afterEach(async () => {
    // Cleanup
    vi.restoreAllMocks();
    if (fs.existsSync(tempConfigPath)) {
      fs.removeSync(path.dirname(tempConfigPath));
    }
  });

  test('should handle config file with no projects section', async () => {
    // Create config file with only global section
    const configContent = `
global:
  src_dir: '~/src'
  workspace_base: 'workspaces'
`;
    await fs.writeFile(tempConfigPath, configContent);

    // Load config
    const config = await configManager.loadConfig();

    // Verify config is loaded
    expect(config).toBeDefined();
    expect(config.global).toBeDefined();
    expect(config.global?.src_dir).toContain('src'); // Path expansion means it won't be exactly ~/src

    // Verify projects list is empty
    const projects = configManager.listProjects();
    expect(projects).toEqual([]);
  });

  test('should handle config file with empty projects section', async () => {
    // Create config file with empty projects section
    const configContent = `
projects:

global:
  src_dir: '~/src'
  workspace_base: 'workspaces'
`;
    await fs.writeFile(tempConfigPath, configContent);

    // Load config
    const config = await configManager.loadConfig();

    // Verify config is loaded
    expect(config).toBeDefined();
    expect(config.global).toBeDefined();

    // Verify projects list is empty
    const projects = configManager.listProjects();
    expect(projects).toEqual([]);
  });

  test('should handle config file with null projects section', async () => {
    // Create config file with null projects section
    const configContent = `
projects: null

global:
  src_dir: '~/src'
  workspace_base: 'workspaces'
`;
    await fs.writeFile(tempConfigPath, configContent);

    // Load config
    const config = await configManager.loadConfig();

    // Verify config is loaded
    expect(config).toBeDefined();
    expect(config.global).toBeDefined();

    // Verify projects list is empty
    const projects = configManager.listProjects();
    expect(projects).toEqual([]);
  });

  test('should handle config file with projects but they are valid', async () => {
    // Create config file with valid projects
    const configContent = `
projects:
  test-project:
    name: 'Test Project'
    repo: 'https://github.com/test/test.git'

global:
  src_dir: '~/src'
  workspace_base: 'workspaces'
`;
    await fs.writeFile(tempConfigPath, configContent);

    // Load config
    const config = await configManager.loadConfig();

    // Verify config is loaded
    expect(config).toBeDefined();
    expect(config.global).toBeDefined();

    // Verify projects list contains the project
    const projects = configManager.listProjects();
    expect(projects).toEqual(['test-project']);

    // Verify we can get the project
    const project = configManager.getProject('test-project');
    expect(project.name).toBe('Test Project');
    expect(project.repo).toBe('https://github.com/test/test.git');
  });

  test('should handle config file with malformed projects section', async () => {
    // Create config file with malformed projects
    const configContent = `
projects:
  test-project: "invalid"

global:
  src_dir: '~/src'
  workspace_base: 'workspaces'
`;
    await fs.writeFile(tempConfigPath, configContent);

    // Load config should not fail
    const config = await configManager.loadConfig();
    expect(config).toBeDefined();

    // Projects list should handle malformed project gracefully
    const projects = configManager.listProjects();
    expect(projects).toEqual(['test-project']); // Key exists but project is malformed

    // Getting the project should work even with malformed data
    const project = configManager.getProject('test-project');
    expect(project).toBeDefined();
    expect(project.key).toBe('test-project');
  });
});
