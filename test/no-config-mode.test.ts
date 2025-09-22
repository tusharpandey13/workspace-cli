import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { configManager } from '../src/utils/config.js';

describe('ConfigManager --no-config functionality', () => {
  beforeEach(() => {
    // Reset config manager state completely
    (configManager as any).config = null;
    (configManager as any).configPath = null;
    (configManager as any).noConfigMode = false;
  });

  afterEach(() => {
    // Reset to normal state
    (configManager as any).config = null;
    (configManager as any).configPath = null;
    (configManager as any).noConfigMode = false;
  });

  it('should enable no-config mode correctly', () => {
    expect(configManager.isNoConfigMode()).toBe(false);
    expect(configManager.isLoaded()).toBe(false);

    configManager.enableNoConfigMode();

    expect(configManager.isNoConfigMode()).toBe(true);
    expect(configManager.isLoaded()).toBe(true);
    expect(configManager.config).toBeNull();
  });

  it('should return empty array for listProjects in no-config mode', () => {
    configManager.enableNoConfigMode();

    const projects = configManager.listProjects();

    expect(projects).toEqual([]);
  });

  it('should indicate loaded state when in no-config mode', () => {
    expect(configManager.isLoaded()).toBe(false);

    configManager.enableNoConfigMode();

    expect(configManager.isLoaded()).toBe(true);
    expect(configManager.isNoConfigMode()).toBe(true);
  });

  it('should maintain state after enabling no-config mode', () => {
    // Simulate having some config state
    configManager.config = {
      projects: { test: { name: 'Test', repo: 'test-repo' } },
      global: { src_dir: '/test' },
    } as any;

    expect(configManager.isLoaded()).toBe(true);
    expect(configManager.isNoConfigMode()).toBe(false);

    configManager.enableNoConfigMode();

    expect(configManager.config).toBeNull();
    expect(configManager.isLoaded()).toBe(true);
    expect(configManager.isNoConfigMode()).toBe(true);
  });
});
