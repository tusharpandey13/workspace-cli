import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { ConfigManager } from '../src/utils/config.js';

// Mock logger
vi.mock('../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    verbose: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Config Property Normalization', () => {
  let configManager: ConfigManager;
  let tempConfigDir: string;
  let tempConfigPath: string;

  beforeEach(async () => {
    configManager = new ConfigManager();
    tempConfigDir = await fs.mkdtemp(path.join(os.tmpdir(), 'space-config-test-'));
    tempConfigPath = path.join(tempConfigDir, 'test-config.yaml');
  });

  afterEach(async () => {
    await fs.remove(tempConfigDir);
  });

  it('should normalize post_init to post-init for backward compatibility', async () => {
    // Create a config file with post_init (underscore format)
    const configContent = `
projects:
  test-project:
    name: Test Project
    repo: https://github.com/test/repo.git
    post_init: npm install

global:
  src_dir: ~/src
`;

    await fs.writeFile(tempConfigPath, configContent);

    // Load the configuration
    const config = await configManager.loadConfig(tempConfigPath);

    // Verify that post_init was converted to 'post-init'
    expect(config.projects).toBeDefined();
    expect(config.projects!['test-project']).toBeDefined();
    expect(config.projects!['test-project']['post-init']).toBe('npm install');
    expect((config.projects!['test-project'] as any).post_init).toBeUndefined();
  });

  it('should preserve existing post-init (hyphen format) without changes', async () => {
    // Create a config file with 'post-init' (correct hyphen format)
    const configContent = `
projects:
  test-project:
    name: Test Project
    repo: https://github.com/test/repo.git
    'post-init': npm install

global:
  src_dir: ~/src
`;

    await fs.writeFile(tempConfigPath, configContent);

    // Load the configuration
    const config = await configManager.loadConfig(tempConfigPath);

    // Verify that 'post-init' was preserved as-is
    expect(config.projects!['test-project']['post-init']).toBe('npm install');
  });

  it('should prefer post-init over post_init when both exist', async () => {
    // Create a config with both formats (should prefer hyphen format)
    const configContent = `
projects:
  test-project:
    name: Test Project
    repo: https://github.com/test/repo.git
    'post-init': npm run build
    post_init: npm install

global:
  src_dir: ~/src
`;

    await fs.writeFile(tempConfigPath, configContent);

    // Load the configuration
    const config = await configManager.loadConfig(tempConfigPath);

    // Should preserve 'post-init' and not overwrite with post_init
    expect(config.projects!['test-project']['post-init']).toBe('npm run build');
  });

  it('should normalize multiple projects correctly', async () => {
    const configContent = `
projects:
  project1:
    name: Project One
    repo: https://github.com/test/repo1.git
    post_init: npm install
  project2:
    name: Project Two
    repo: https://github.com/test/repo2.git
    'post-init': pnpm install
  project3:
    name: Project Three
    repo: https://github.com/test/repo3.git
    # No post-init command

global:
  src_dir: ~/src
`;

    await fs.writeFile(tempConfigPath, configContent);

    // Load the configuration
    const config = await configManager.loadConfig(tempConfigPath);

    // Verify each project
    expect(config.projects!['project1']['post-init']).toBe('npm install');
    expect(config.projects!['project2']['post-init']).toBe('pnpm install');
    expect(config.projects!['project3']['post-init']).toBeUndefined();
  });

  it('should handle config without projects gracefully', async () => {
    const configContent = `
global:
  src_dir: ~/src
`;

    await fs.writeFile(tempConfigPath, configContent);

    // Should not throw an error
    const config = await configManager.loadConfig(tempConfigPath);
    expect(config.global?.src_dir).toBeTruthy();
  });
});
