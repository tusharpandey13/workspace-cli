import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  createSetupWizard,
  handleSetupResult,
  checkSetupNeeded,
} from '../src/utils/setupHelpers.js';
import { SetupWizard } from '../src/services/setupWizard.js';
import { logger } from '../src/utils/logger.js';

// Mock dependencies
vi.mock('../src/services/setupWizard.js', () => ({
  SetupWizard: vi.fn().mockImplementation(() => ({
    isSetupNeeded: vi.fn(),
  })),
}));

vi.mock('../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
  },
}));

const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('Setup Helper Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy.mockClear();
  });

  describe('createSetupWizard', () => {
    test('should create and return a new SetupWizard instance', () => {
      const mockWizard = { isSetupNeeded: vi.fn() };
      vi.mocked(SetupWizard).mockImplementation(() => mockWizard as any);

      const wizard = createSetupWizard();

      expect(SetupWizard).toHaveBeenCalledOnce();
      expect(wizard).toBe(mockWizard);
    });
  });

  describe('handleSetupResult', () => {
    test('should log success message when setup completed', () => {
      const result = { completed: true, skipped: false };

      handleSetupResult(result);

      expect(logger.info).toHaveBeenCalledWith(
        'Setup completed! You can now use space-cli commands.',
      );
    });

    test('should log skip message when setup skipped', () => {
      const result = { completed: false, skipped: true };

      handleSetupResult(result);

      expect(logger.info).toHaveBeenCalledWith(
        'Setup was skipped. Run "space setup" when you\'re ready.',
      );
    });

    test('should not log anything when setup neither completed nor skipped', () => {
      const result = { completed: false, skipped: false };

      handleSetupResult(result);

      expect(logger.info).not.toHaveBeenCalled();
    });
  });

  describe('checkSetupNeeded', () => {
    test('should return true when setup is needed', () => {
      const mockWizard = {
        isSetupNeeded: vi.fn().mockReturnValue(true),
      } as any;

      const result = checkSetupNeeded(mockWizard, false);

      expect(result).toBe(true);
      expect(mockWizard.isSetupNeeded).toHaveBeenCalledWith({});
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    test('should return false and show message when setup not needed and not forced', () => {
      const mockWizard = {
        isSetupNeeded: vi.fn().mockReturnValue(false),
      } as any;

      const result = checkSetupNeeded(mockWizard, false);

      expect(result).toBe(false);
      expect(mockWizard.isSetupNeeded).toHaveBeenCalledWith({});
      expect(consoleSpy).toHaveBeenCalledWith(
        'Configuration already exists. Proceeding with reconfiguration...',
      );
    });

    test('should return true when forced even if setup not needed', () => {
      const mockWizard = {
        isSetupNeeded: vi.fn().mockReturnValue(false),
      } as any;

      const result = checkSetupNeeded(mockWizard, true);

      expect(result).toBe(true);
      expect(mockWizard.isSetupNeeded).toHaveBeenCalledWith({});
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });
});
