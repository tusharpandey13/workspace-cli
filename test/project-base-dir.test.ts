import { test, expect, beforeEach, describe } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { ConfigManager } from '../src/utils/config.js';

describe('ConfigManager - getProjectBaseDir', () => {
  let tempDir: string;
  let configManager: ConfigManager;
  let configPath: string;

  beforeEach(async () => {
    // Create a unique temp directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'project-base-dir-test-'));

    // Create config manager
    configManager = new ConfigManager();

    // Create test config
    const config = {
      projects: {
        test: {
          name: 'Test Project',
          repo: 'https://github.com/test/test.git', // Use HTTP URL to bypass local validation
          key: 'test',
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
  });

  test('should return correct base directory path', () => {
    const baseDir = configManager.getProjectBaseDir('test');
    const expected = path.join(tempDir, 'src', 'workspaces', 'test');
    expect(baseDir).toBe(expected);
  });

  test('should work with existing project workspace listing', async () => {
    const baseDir = configManager.getProjectBaseDir('test');

    // Create the base directory structure
    await fs.ensureDir(baseDir);

    // Create some workspace directories
    const workspaces = ['feature_branch1', 'bugfix_issue123', 'hotfix_urgent'];
    for (const workspace of workspaces) {
      await fs.ensureDir(path.join(baseDir, workspace));
    }

    // List workspaces
    const dirs = fs
      .readdirSync(baseDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    expect(dirs.sort()).toEqual(workspaces.sort());
  });
});
