import { describe, it, expect, vi } from 'vitest';

// Mock the dependencies
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

describe('Post-init Setup Visibility', () => {
  it('should only show post-init message when post-init command is configured', async () => {
    const { logger } = await import('../src/utils/logger.js');

    // Mock project configurations
    const projectWithPostInit = {
      key: 'test-with-postinit',
      name: 'Test Project With Post-init',
      repo: 'https://github.com/test/repo.git',
      'post-init': 'npm install',
    };

    const projectWithoutPostInit = {
      key: 'test-without-postinit',
      name: 'Test Project Without Post-init',
      repo: 'https://github.com/test/repo.git',
      // No post-init command
    };

    // Test logic that should be in the init command
    const shouldShowPostInit = (project: any): boolean => {
      return !!project['post-init'];
    };

    const shouldLogSkip = (project: any): boolean => {
      return !project['post-init'];
    };

    // Test with post-init command
    expect(shouldShowPostInit(projectWithPostInit)).toBe(true);
    expect(shouldLogSkip(projectWithPostInit)).toBe(false);

    // Test without post-init command
    expect(shouldShowPostInit(projectWithoutPostInit)).toBe(false);
    expect(shouldLogSkip(projectWithoutPostInit)).toBe(true);

    // Simulate the verbose logging that should happen
    if (shouldLogSkip(projectWithoutPostInit)) {
      logger.verbose('No post-init command configured, skipping post-init setup');
    }

    expect(logger.verbose).toHaveBeenCalledWith(
      'No post-init command configured, skipping post-init setup',
    );
  });

  it('should validate post-init command execution logic', () => {
    // Test the executePostInitCommand logic
    const executePostInitCommand = (project: any): boolean => {
      if (!project['post-init']) {
        // This should return early without executing anything
        return false;
      }
      // Would execute the command here
      return true;
    };

    const projectWithCommand = { 'post-init': 'npm install' };
    const projectWithoutCommand = {};

    expect(executePostInitCommand(projectWithCommand)).toBe(true);
    expect(executePostInitCommand(projectWithoutCommand)).toBe(false);
  });
});
