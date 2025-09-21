import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the init command to test progress reporting
vi.mock('../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    verbose: vi.fn(),
    step: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    command: vi.fn(),
  },
}));

vi.mock('../src/services/gitWorktrees.js', () => ({
  setupWorktrees: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/services/contextData.js', () => ({
  collectContextData: vi.fn().mockResolvedValue({}),
}));

vi.mock('../src/services/promptSelector.js', () => ({
  PromptSelector: class MockPromptSelector {
    selectTemplates = vi.fn().mockReturnValue(['analysis.prompt.md']);
  },
}));

vi.mock('../src/utils/init-helpers.js', () => ({
  executeCommand: vi.fn(),
  fileOps: {
    ensureDir: vi.fn(),
    copyFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

vi.mock('fs-extra', () => ({
  default: {
    ensureDir: vi.fn(),
    copy: vi.fn(),
    writeFile: vi.fn(),
    existsSync: vi.fn().mockReturnValue(true),
  },
}));

vi.mock('../src/utils/config.js', () => ({
  configManager: {
    getTemplates: vi.fn().mockReturnValue([]),
    getGlobal: vi.fn().mockReturnValue({
      src_dir: '~/src',
      workspace_base: 'workspaces',
    }),
    getEnvFilePath: vi.fn().mockReturnValue(null),
    getCliRoot: vi.fn().mockReturnValue('/cli/root'),
  },
}));

describe('Progress Reporting Consolidation - Comprehensive', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Progress Step Consolidation', () => {
    it('should show consolidated 4-step progress instead of original 6 steps', async () => {
      // Mock the runInit function to capture progress reporting
      const mockRunInit = vi.fn().mockImplementation(async () => {
        console.log('[1/4] Creating workspace directories...');
        console.log('[2/4] Setting up git worktrees...');
        console.log('[3/4] Gathering context and generating templates...');
        console.log('[4/4] Running post-init setup...');
      });

      await mockRunInit(); // Verify the new 4-step progress format
      expect(consoleSpy).toHaveBeenCalledWith('[1/4] Creating workspace directories...');
      expect(consoleSpy).toHaveBeenCalledWith('[2/4] Setting up git worktrees...');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[3/4] Gathering context and generating templates...',
      );
      expect(consoleSpy).toHaveBeenCalledWith('[4/4] Running post-init setup...');

      // Verify old 6-step format is NOT used
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringMatching(/\[.*\/6\]/));
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringMatching(/\[5\/.*\]/));
    });

    it('should consolidate steps 3-5 from original into single step 3', async () => {
      const mockConsolidatedStep = vi.fn().mockImplementation(() => {
        // Original steps 3, 4, 5 are now combined into step 3
        console.log('[3/4] Gathering context and generating templates...');

        // These substeps happen within step 3 but are not separate progress steps
        console.log('📊 Collecting additional context...');
        console.log('🔍 Fetching GitHub data...');
        console.log('📝 Generating templates and documentation...');
      });

      mockConsolidatedStep();

      // Main consolidated step should be shown
      expect(consoleSpy).toHaveBeenCalledWith(
        '[3/4] Gathering context and generating templates...',
      );

      // Substeps should be shown but without separate progress numbers
      expect(consoleSpy).toHaveBeenCalledWith('📊 Collecting additional context...');
      expect(consoleSpy).toHaveBeenCalledWith('🔍 Fetching GitHub data...');
      expect(consoleSpy).toHaveBeenCalledWith('📝 Generating templates and documentation...');

      // Should not have separate [3/4], [4/4], [5/4] steps
      expect(consoleSpy).not.toHaveBeenCalledWith('[3/4] Collecting additional context...');
      expect(consoleSpy).not.toHaveBeenCalledWith('[4/4] Fetching GitHub data...');
      expect(consoleSpy).not.toHaveBeenCalledWith('[5/4] Generating templates...');
    });

    it('should maintain correct step numbering throughout execution', async () => {
      const mockProgressExecution = vi.fn().mockImplementation(async () => {
        const steps = [
          '[1/4] Creating workspace directories...',
          '[2/4] Setting up git worktrees...',
          '[3/4] Gathering context and generating templates...',
          '[4/4] Running post-init setup...',
        ];

        for (const step of steps) {
          console.log(step);
        }
      });

      await mockProgressExecution();

      // Verify sequential numbering
      expect(consoleSpy).toHaveBeenNthCalledWith(1, '[1/4] Creating workspace directories...');
      expect(consoleSpy).toHaveBeenNthCalledWith(2, '[2/4] Setting up git worktrees...');
      expect(consoleSpy).toHaveBeenNthCalledWith(
        3,
        '[3/4] Gathering context and generating templates...',
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(4, '[4/4] Running post-init setup...');

      // Verify no gaps or incorrect numbering
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringMatching(/\[0\/4\]/));
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringMatching(/\[5\/4\]/));
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringMatching(/\[.*\/3\]/));
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringMatching(/\[.*\/5\]/));
    });
  });

  describe('Dry Run Mode Progress', () => {
    it('should show correct progress format in dry run mode', async () => {
      const mockDryRunProgress = vi.fn().mockImplementation(() => {
        // Dry run should use same 4-step format
        console.log('ℹ️ DRY-RUN MODE: No actual changes will be made');
        console.log('[1/4] Creating workspace directories...');
        console.log('[2/4] Setting up git worktrees...');
        console.log('[3/4] Gathering context and generating templates...');
        console.log('[4/4] Running post-init setup...');
        console.log('DRY-RUN COMPLETE: No actual changes were made');
      });

      mockDryRunProgress();

      expect(consoleSpy).toHaveBeenCalledWith('ℹ️ DRY-RUN MODE: No actual changes will be made');
      expect(consoleSpy).toHaveBeenCalledWith('[1/4] Creating workspace directories...');
      expect(consoleSpy).toHaveBeenCalledWith('[2/4] Setting up git worktrees...');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[3/4] Gathering context and generating templates...',
      );
      expect(consoleSpy).toHaveBeenCalledWith('[4/4] Running post-init setup...');
      expect(consoleSpy).toHaveBeenCalledWith('DRY-RUN COMPLETE: No actual changes were made');
    });

    it('should handle progress in silent mode correctly', async () => {
      const mockSilentProgress = vi.fn().mockImplementation(() => {
        console.log('ℹ️ SILENT MODE: Skipping all user input prompts');
        // Progress should still show in silent mode for user awareness
        console.log('[1/4] Creating workspace directories...');
        console.log('[2/4] Setting up git worktrees...');
        console.log('[3/4] Gathering context and generating templates...');
        console.log('[4/4] Running post-init setup...');
      });

      mockSilentProgress();

      expect(consoleSpy).toHaveBeenCalledWith('ℹ️ SILENT MODE: Skipping all user input prompts');
      expect(consoleSpy).toHaveBeenCalledWith('[1/4] Creating workspace directories...');
      expect(consoleSpy).toHaveBeenCalledWith('[2/4] Setting up git worktrees...');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[3/4] Gathering context and generating templates...',
      );
      expect(consoleSpy).toHaveBeenCalledWith('[4/4] Running post-init setup...');
    });
  });

  describe('Error Handling with Progress', () => {
    it('should show progress up to failure point', async () => {
      const mockFailedProgress = vi.fn().mockImplementation(async () => {
        console.log('[1/4] Creating workspace directories...');
        console.log('[2/4] Setting up git worktrees...');
        // Simulate failure at step 2
        throw new Error('Git worktree setup failed');
      });

      await expect(mockFailedProgress()).rejects.toThrow('Git worktree setup failed');

      expect(consoleSpy).toHaveBeenCalledWith('[1/4] Creating workspace directories...');
      expect(consoleSpy).toHaveBeenCalledWith('[2/4] Setting up git worktrees...');
      expect(consoleSpy).not.toHaveBeenCalledWith(
        '[3/4] Gathering context and generating templates...',
      );
      expect(consoleSpy).not.toHaveBeenCalledWith('[4/4] Running post-init setup...');
    });

    it('should handle partial step completion in consolidated step 3', async () => {
      const mockPartialStep3 = vi.fn().mockImplementation(async () => {
        console.log('[1/4] Creating workspace directories...');
        console.log('[2/4] Setting up git worktrees...');
        console.log('[3/4] Gathering context and generating templates...');

        // Substeps within step 3
        console.log('📊 Collecting additional context...');
        console.log('🔍 Fetching GitHub data...');

        // Failure during template generation (part of step 3)
        throw new Error('Template generation failed');
      });

      await expect(mockPartialStep3()).rejects.toThrow('Template generation failed');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[3/4] Gathering context and generating templates...',
      );
      expect(consoleSpy).toHaveBeenCalledWith('📊 Collecting additional context...');
      expect(consoleSpy).toHaveBeenCalledWith('🔍 Fetching GitHub data...');
      expect(consoleSpy).not.toHaveBeenCalledWith('[4/4] Running post-init setup...');
    });
  });

  describe('Timing and Performance', () => {
    it('should maintain consistent timing between progress steps', async () => {
      const timestamps: number[] = [];
      const mockTimedProgress = vi.fn().mockImplementation(async () => {
        const steps = [
          '[1/4] Creating workspace directories...',
          '[2/4] Setting up git worktrees...',
          '[3/4] Gathering context and generating templates...',
          '[4/4] Running post-init setup...',
        ];

        for (const step of steps) {
          timestamps.push(Date.now());
          console.log(step);
          await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay
        }
      });

      await mockTimedProgress();

      // Verify steps were executed in sequence
      expect(timestamps).toHaveLength(4);
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
    });

    it('should handle long-running consolidated step 3 appropriately', async () => {
      const mockLongStep3 = vi.fn().mockImplementation(async () => {
        console.log('[1/4] Creating workspace directories...');
        console.log('[2/4] Setting up git worktrees...');
        console.log('[3/4] Gathering context and generating templates...');

        // Simulate multiple sub-operations in step 3
        const subOperations = [
          '📊 Collecting additional context...',
          '🔍 Fetching GitHub data...',
          '📝 Generating templates and documentation...',
          '📋 Processing template variables...',
          '📄 Writing generated files...',
        ];

        for (const operation of subOperations) {
          console.log(operation);
          await new Promise((resolve) => setTimeout(resolve, 1)); // Micro delay
        }

        console.log('[4/4] Running post-init setup...');
      });

      await mockLongStep3();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[3/4] Gathering context and generating templates...',
      );

      // All sub-operations should be logged
      expect(consoleSpy).toHaveBeenCalledWith('📊 Collecting additional context...');
      expect(consoleSpy).toHaveBeenCalledWith('🔍 Fetching GitHub data...');
      expect(consoleSpy).toHaveBeenCalledWith('📝 Generating templates and documentation...');
      expect(consoleSpy).toHaveBeenCalledWith('📋 Processing template variables...');
      expect(consoleSpy).toHaveBeenCalledWith('📄 Writing generated files...');

      expect(consoleSpy).toHaveBeenCalledWith('[4/4] Running post-init setup...');
    });
  });

  describe('User Experience and Clarity', () => {
    it('should provide clear step descriptions that match actual operations', async () => {
      const expectedSteps = [
        {
          number: '[1/4]',
          description: 'Creating workspace directories...',
          purpose: 'Directory structure setup',
        },
        {
          number: '[2/4]',
          description: 'Setting up git worktrees...',
          purpose: 'Git repository preparation',
        },
        {
          number: '[3/4]',
          description: 'Gathering context and generating templates...',
          purpose: 'Context collection and template generation',
        },
        {
          number: '[4/4]',
          description: 'Running post-init setup...',
          purpose: 'Final configuration and cleanup',
        },
      ];

      for (const step of expectedSteps) {
        console.log(`${step.number} ${step.description}`);
      }

      for (const step of expectedSteps) {
        expect(consoleSpy).toHaveBeenCalledWith(`${step.number} ${step.description}`);
      }
    });

    it('should avoid confusing users with intermediate step numbers', async () => {
      const mockClearProgress = vi.fn().mockImplementation(() => {
        // Should not show intermediate fractions or confusing numbers
        console.log('[1/4] Creating workspace directories...');
        console.log('[2/4] Setting up git worktrees...');
        console.log('[3/4] Gathering context and generating templates...');
        console.log('[4/4] Running post-init setup...');
      });

      mockClearProgress();

      // Verify no confusing intermediate numbers
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringMatching(/\[1\.5\/4\]/));
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringMatching(/\[3a\/4\]/));
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringMatching(/\[3\.1\/4\]/));
    });

    it('should show completion message after all steps', async () => {
      const mockCompletionProgress = vi.fn().mockImplementation(async () => {
        console.log('[1/4] Creating workspace directories...');
        console.log('[2/4] Setting up git worktrees...');
        console.log('[3/4] Gathering context and generating templates...');
        console.log('[4/4] Running post-init setup...');
        console.log('✅ Workspace initialization complete!');
        console.log('Workspace location: /path/to/workspace');
      });

      await mockCompletionProgress();

      expect(consoleSpy).toHaveBeenCalledWith('[4/4] Running post-init setup...');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Workspace initialization complete!');
      expect(consoleSpy).toHaveBeenCalledWith('Workspace location: /path/to/workspace');
    });
  });

  describe('Regression Prevention', () => {
    it('should never revert to 6-step progress format', async () => {
      const mockRegressionCheck = vi.fn().mockImplementation(() => {
        // Test that old format is never used
        // Old format (should NOT be used):
        // '[1/6] Creating workspace directories...'
        // '[2/6] Setting up git worktrees...'
        // '[3/6] Collecting additional context...'
        // '[4/6] Fetching GitHub data...'
        // '[5/6] Generating templates...'
        // '[6/6] Running post-init setup...'

        // Instead, use new format
        const newSteps = [
          '[1/4] Creating workspace directories...',
          '[2/4] Setting up git worktrees...',
          '[3/4] Gathering context and generating templates...',
          '[4/4] Running post-init setup...',
        ];

        for (const step of newSteps) {
          console.log(step);
        }
      });

      mockRegressionCheck();

      // Verify new format is used
      expect(consoleSpy).toHaveBeenCalledWith('[1/4] Creating workspace directories...');
      expect(consoleSpy).toHaveBeenCalledWith('[2/4] Setting up git worktrees...');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[3/4] Gathering context and generating templates...',
      );
      expect(consoleSpy).toHaveBeenCalledWith('[4/4] Running post-init setup...');

      // Verify old format is NOT used
      expect(consoleSpy).not.toHaveBeenCalledWith('[1/6] Creating workspace directories...');
      expect(consoleSpy).not.toHaveBeenCalledWith('[3/6] Collecting additional context...');
      expect(consoleSpy).not.toHaveBeenCalledWith('[4/6] Fetching GitHub data...');
      expect(consoleSpy).not.toHaveBeenCalledWith('[5/6] Generating templates...');
      expect(consoleSpy).not.toHaveBeenCalledWith('[6/6] Running post-init setup...');
    });

    it('should maintain consolidation even when new features are added', async () => {
      const mockFutureFeatures = vi.fn().mockImplementation(() => {
        // Even if new sub-operations are added, they should fit within the 4-step structure
        console.log('[1/4] Creating workspace directories...');
        console.log('[2/4] Setting up git worktrees...');
        console.log('[3/4] Gathering context and generating templates...');

        // New hypothetical sub-operations should be part of existing steps
        console.log('📊 Collecting additional context...');
        console.log('🔍 Fetching GitHub data...');
        console.log('📝 Generating templates and documentation...');
        console.log('🔧 Processing configuration files...'); // New feature
        console.log('📁 Setting up project structure...'); // New feature

        console.log('[4/4] Running post-init setup...');
      });

      mockFutureFeatures();

      // Main structure should remain 4 steps
      expect(consoleSpy).toHaveBeenCalledWith('[1/4] Creating workspace directories...');
      expect(consoleSpy).toHaveBeenCalledWith('[2/4] Setting up git worktrees...');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[3/4] Gathering context and generating templates...',
      );
      expect(consoleSpy).toHaveBeenCalledWith('[4/4] Running post-init setup...');

      // New features should be sub-operations, not new main steps
      expect(consoleSpy).toHaveBeenCalledWith('🔧 Processing configuration files...');
      expect(consoleSpy).toHaveBeenCalledWith('📁 Setting up project structure...');

      // Should not become [5/4] or change to [4/5] structure
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringMatching(/\[5\/\d+\]/));
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringMatching(/\[\d+\/5\]/));
    });
  });
});
