import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import path from 'path';

// Mock fs-extra
vi.mock('fs-extra', () => ({
  default: {
    existsSync: vi.fn(),
    readJson: vi.fn(),
    writeJson: vi.fn(),
    ensureDir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
  },
}));

// Mock init-helpers
vi.mock('../src/utils/init-helpers.js', () => ({
  executeCommand: vi.fn(),
}));

// Mock logger
vi.mock('../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    verbose: vi.fn(),
  },
}));

import { SampleAppInfrastructureManager } from '../src/services/sampleAppInfra.js';
import fs from 'fs-extra';
import { executeCommand } from '../src/utils/init-helpers.js';
import { logger } from '../src/utils/logger.js';

const mockFs = vi.mocked(fs);
const mockExecuteCommand = vi.mocked(executeCommand);
const mockLogger = vi.mocked(logger);

describe('SampleAppInfrastructureManager', () => {
  let manager: SampleAppInfrastructureManager;
  const testSamplePath = '/test/sample/path';

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new SampleAppInfrastructureManager(testSamplePath, false);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('detectAppType', () => {
    it('should detect Next.js app type', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readJson.mockResolvedValue({
        dependencies: { next: '^14.0.0' },
        devDependencies: {},
      });

      const appType = await manager.detectAppType();
      expect(appType).toBe('next');
    });

    it('should detect Node.js app type with Express', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readJson.mockResolvedValue({
        dependencies: { express: '^4.0.0' },
        devDependencies: {},
      });

      const appType = await manager.detectAppType();
      expect(appType).toBe('node');
    });

    it('should detect SPA app type', async () => {
      mockFs.existsSync
        .mockReturnValueOnce(true) // package.json exists
        .mockReturnValueOnce(true); // index.html exists
      mockFs.readJson.mockResolvedValue({
        dependencies: {},
        devDependencies: {},
      });

      const appType = await manager.detectAppType();
      expect(appType).toBe('spa');
    });

    it('should return unknown when no package.json exists', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const appType = await manager.detectAppType();
      expect(appType).toBe('unknown');
      expect(mockLogger.warn).toHaveBeenCalledWith('No package.json found, cannot detect app type');
    });

    it('should handle errors gracefully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readJson.mockRejectedValue(new Error('Read error'));

      const appType = await manager.detectAppType();
      expect(appType).toBe('unknown');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('detectReactVersion', () => {
    it('should detect React 19 version', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readJson.mockResolvedValue({
        dependencies: { react: '19.0.0' },
        devDependencies: {},
      });

      const result = await (manager as any).detectReactVersion();
      expect(result).toEqual({ major: 19, version: '19.0.0' });
    });

    it('should detect React 18 version with caret', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readJson.mockResolvedValue({
        dependencies: { react: '^18.2.0' },
        devDependencies: {},
      });

      const result = await (manager as any).detectReactVersion();
      expect(result).toEqual({ major: 18, version: '^18.2.0' });
    });

    it('should return null when no React found', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readJson.mockResolvedValue({
        dependencies: {},
        devDependencies: {},
      });

      const result = await (manager as any).detectReactVersion();
      expect(result).toBeNull();
    });

    it('should return null when package.json does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await (manager as any).detectReactVersion();
      expect(result).toBeNull();
    });

    it('should handle invalid version formats', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readJson.mockResolvedValue({
        dependencies: { react: 'invalid-version' },
        devDependencies: {},
      });

      const result = await (manager as any).detectReactVersion();
      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Could not parse React version: invalid-version',
      );
    });
  });

  describe('getReactTestingLibraryVersionForReact', () => {
    it('should return correct version for React 19', () => {
      const version = (manager as any).getReactTestingLibraryVersionForReact(19);
      expect(version).toBe('^16.3.0');
    });

    it('should return correct version for React 18', () => {
      const version = (manager as any).getReactTestingLibraryVersionForReact(18);
      expect(version).toBe('^14.3.1');
    });

    it('should return correct version for React 17', () => {
      const version = (manager as any).getReactTestingLibraryVersionForReact(17);
      expect(version).toBe('^12.1.5');
    });

    it('should default to React 18 version for unsupported versions', () => {
      const version = (manager as any).getReactTestingLibraryVersionForReact(99);
      expect(version).toBe('^14.3.1');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Unsupported React version 99, defaulting to React 18 compatible version',
      );
    });
  });

  describe('installDependencies', () => {
    beforeEach(() => {
      mockFs.readJson.mockResolvedValue({
        devDependencies: {},
      });
    });

    it('should install dependencies successfully', async () => {
      mockExecuteCommand.mockResolvedValue({ stdout: 'success' });

      const dependencies = { vitest: '^1.0.0', '@testing-library/react': '^16.3.0' };
      await (manager as any).installDependencies(dependencies);

      expect(mockFs.writeJson).toHaveBeenCalledWith(
        path.join(testSamplePath, 'package.json'),
        { devDependencies: dependencies },
        { spaces: 2 },
      );
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        'npm',
        ['install'],
        { cwd: testSamplePath },
        'install dependencies',
        false,
      );
    });

    it('should retry with --legacy-peer-deps on ERESOLVE error', async () => {
      const eresolveError = new Error('ERESOLVE unable to resolve dependency tree');
      mockExecuteCommand
        .mockRejectedValueOnce(eresolveError)
        .mockResolvedValueOnce({ stdout: 'success' });

      const dependencies = { vitest: '^1.0.0', '@testing-library/react': '^14.0.0' };
      await (manager as any).installDependencies(dependencies);

      expect(mockExecuteCommand).toHaveBeenCalledTimes(2);
      expect(mockExecuteCommand).toHaveBeenNthCalledWith(
        1,
        'npm',
        ['install'],
        { cwd: testSamplePath },
        'install dependencies',
        false,
      );
      expect(mockExecuteCommand).toHaveBeenNthCalledWith(
        2,
        'npm',
        ['install', '--legacy-peer-deps'],
        { cwd: testSamplePath },
        'install dependencies with legacy peer deps',
        false,
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Peer dependency conflict detected, retrying with --legacy-peer-deps',
      );
    });

    it('should retry with --legacy-peer-deps on peer dep error', async () => {
      const peerDepError = new Error('peer dep conflict');
      mockExecuteCommand
        .mockRejectedValueOnce(peerDepError)
        .mockResolvedValueOnce({ stdout: 'success' });

      const dependencies = { vitest: '^1.0.0' };
      await (manager as any).installDependencies(dependencies);

      expect(mockExecuteCommand).toHaveBeenCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Peer dependency conflict detected, retrying with --legacy-peer-deps',
      );
    });

    it('should throw error for non-peer-dependency errors', async () => {
      const networkError = new Error('Network timeout');
      mockExecuteCommand.mockRejectedValue(networkError);

      const dependencies = { vitest: '^1.0.0' };
      await expect((manager as any).installDependencies(dependencies)).rejects.toThrow(
        'Network timeout',
      );
      expect(mockExecuteCommand).toHaveBeenCalledTimes(1);
    });

    it('should skip installation in dry run mode', async () => {
      const dryRunManager = new SampleAppInfrastructureManager(testSamplePath, true);

      const dependencies = { vitest: '^1.0.0' };
      await (dryRunManager as any).installDependencies(dependencies);

      expect(mockExecuteCommand).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Would install dependencies: vitest');
    });
  });

  describe('setupTestingInfrastructure', () => {
    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readJson.mockResolvedValue({
        dependencies: { next: '^14.0.0', react: '19.0.0' },
        devDependencies: {},
      });
      mockExecuteCommand.mockResolvedValue({ stdout: 'success' });
      mockFs.ensureDir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.writeJson.mockResolvedValue(undefined);
    });

    it('should set up Next.js infrastructure with React 19', async () => {
      await manager.setupTestingInfrastructure();

      expect(mockLogger.info).toHaveBeenCalledWith(
        '🔧 Setting up testing infrastructure for next sample app...',
      );
      expect(mockLogger.verbose).toHaveBeenCalledWith('Detected React version: 19.0.0 (major: 19)');
      expect(mockLogger.verbose).toHaveBeenCalledWith(
        'Using @testing-library/react version: ^16.3.0',
      );
      expect(mockLogger.success).toHaveBeenCalledWith(
        '✅ Testing infrastructure configured for next sample app',
      );
    });

    it('should handle unknown app type gracefully', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await manager.setupTestingInfrastructure();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Unknown app type, skipping testing infrastructure setup',
      );
      expect(mockExecuteCommand).not.toHaveBeenCalled();
    });

    it('should work without React version detection', async () => {
      mockFs.readJson.mockResolvedValue({
        dependencies: { next: '^14.0.0' }, // No React dependency
        devDependencies: {},
      });

      await manager.setupTestingInfrastructure();

      expect(mockLogger.success).toHaveBeenCalledWith(
        '✅ Testing infrastructure configured for next sample app',
      );
      // Should not log React version detection
      expect(mockLogger.verbose).not.toHaveBeenCalledWith(
        expect.stringContaining('Detected React version:'),
      );
    });

    it('should handle dependency installation failure', async () => {
      mockExecuteCommand.mockRejectedValue(new Error('Installation failed'));

      await expect(manager.setupTestingInfrastructure()).rejects.toThrow('Installation failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to install dependencies: Error: Installation failed',
      );
    });
  });

  describe('getInfrastructureConfig', () => {
    it('should return Next.js configuration', () => {
      const config = (manager as any).getInfrastructureConfig('next');

      expect(config.dependencies).toMatchObject({
        vitest: '^1.0.0',
        '@vitest/ui': '^1.0.0',
        '@vitest/coverage-v8': '^1.0.0',
        jsdom: '^23.0.0',
        '@testing-library/jest-dom': '^6.0.0',
        '@vitejs/plugin-react': '^4.0.0',
        playwright: '^1.40.0',
      });
      expect(config.scripts).toMatchObject({
        test: 'vitest --run',
        'test:watch': 'vitest',
        'test:e2e': 'playwright test',
      });
      expect(config.directories).toContain('tests/components');
      expect(config.directories).toContain('tests/e2e');
    });

    it('should return SPA configuration', () => {
      const config = (manager as any).getInfrastructureConfig('spa');

      expect(config.dependencies).toMatchObject({
        vitest: '^1.0.0',
        jsdom: '^23.0.0',
        '@testing-library/dom': '^9.0.0',
        '@testing-library/jest-dom': '^6.0.0',
        playwright: '^1.40.0',
      });
      expect(config.scripts).toMatchObject({
        test: 'vitest --run',
        'test:e2e': 'playwright test',
      });
    });

    it('should return Node.js configuration', () => {
      const config = (manager as any).getInfrastructureConfig('node');

      expect(config.dependencies).toMatchObject({
        vitest: '^1.0.0',
        supertest: '^6.0.0',
        '@types/supertest': '^2.0.0',
      });
      expect(config.scripts).toMatchObject({
        test: 'vitest --run',
        'test:watch': 'vitest',
      });
    });
  });
});
