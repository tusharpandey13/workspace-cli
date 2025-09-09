import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SampleAppInfrastructureManager } from '../src/services/sampleAppInfra.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// Integration tests - these test the actual behavior without heavy mocking
describe('SampleAppInfrastructureManager Integration', () => {
  let tempDir: string;
  let manager: SampleAppInfrastructureManager;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sample-app-test-'));
    manager = new SampleAppInfrastructureManager(tempDir, true); // dry run mode
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.remove(tempDir);
    }
  });

  describe('React Version-based Testing Library Selection', () => {
    it('should select React 19 compatible testing library for React 19 Next.js app', async () => {
      // Create a package.json with React 19 and Next.js
      const packageJson = {
        name: 'test-next-app',
        version: '1.0.0',
        dependencies: {
          next: '^14.0.0',
          react: '19.0.0',
          'react-dom': '19.0.0',
        },
        devDependencies: {},
        scripts: {},
      };

      await fs.writeJson(path.join(tempDir, 'package.json'), packageJson, { spaces: 2 });

      // Mock the dependency installation to capture the selected versions
      const installSpy = vi.spyOn(manager as any, 'installDependencies');
      installSpy.mockImplementation(async (deps) => {
        // Just capture what would be installed
        return deps;
      });

      await manager.setupTestingInfrastructure();

      expect(installSpy).toHaveBeenCalled();
      const [installedDeps] = installSpy.mock.calls[0] as [Record<string, string>];

      // Should use React 19 compatible testing library version
      expect(installedDeps['@testing-library/react']).toBe('^16.3.0');
    });

    it('should select React 18 compatible testing library for React 18 Next.js app', async () => {
      // Create a package.json with React 18 and Next.js
      const packageJson = {
        name: 'test-next-app',
        version: '1.0.0',
        dependencies: {
          next: '^14.0.0',
          react: '^18.2.0',
          'react-dom': '^18.2.0',
        },
        devDependencies: {},
        scripts: {},
      };

      await fs.writeJson(path.join(tempDir, 'package.json'), packageJson, { spaces: 2 });

      const installSpy = vi.spyOn(manager as any, 'installDependencies');
      installSpy.mockImplementation(async (deps) => deps);

      await manager.setupTestingInfrastructure();

      expect(installSpy).toHaveBeenCalled();
      const [installedDeps] = installSpy.mock.calls[0] as [Record<string, string>];

      // Should use React 18 compatible testing library version
      expect(installedDeps['@testing-library/react']).toBe('^14.3.1');
    });

    it('should handle missing React version gracefully', async () => {
      // Create a package.json with Next.js but no React version
      const packageJson = {
        name: 'test-next-app',
        version: '1.0.0',
        dependencies: {
          next: '^14.0.0',
        },
        devDependencies: {},
        scripts: {},
      };

      await fs.writeJson(path.join(tempDir, 'package.json'), packageJson, { spaces: 2 });

      const installSpy = vi.spyOn(manager as any, 'installDependencies');
      installSpy.mockImplementation(async (deps) => deps);

      await manager.setupTestingInfrastructure();

      expect(installSpy).toHaveBeenCalled();
      const [installedDeps] = installSpy.mock.calls[0] as [Record<string, string>];

      // Should use default React 18 compatible version
      expect(installedDeps['@testing-library/react']).toBe('^14.3.1');
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should provide helpful error information for peer dependency conflicts', async () => {
      const packageJson = {
        name: 'test-app',
        dependencies: { react: '19.0.0' },
        devDependencies: {},
      };

      await fs.writeJson(path.join(tempDir, 'package.json'), packageJson, { spaces: 2 });

      // Test the version detection directly
      const reactVersion = await (manager as any).detectReactVersion();
      expect(reactVersion).toEqual({ major: 19, version: '19.0.0' });

      // Test version selection logic
      const testingLibraryVersion = (manager as any).getReactTestingLibraryVersionForReact(19);
      expect(testingLibraryVersion).toBe('^16.3.0');
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain compatibility with existing React 17 apps', async () => {
      const packageJson = {
        name: 'legacy-app',
        dependencies: { react: '^17.0.0' },
        devDependencies: {},
      };

      await fs.writeJson(path.join(tempDir, 'package.json'), packageJson, { spaces: 2 });

      const reactVersion = await (manager as any).detectReactVersion();
      expect(reactVersion).toEqual({ major: 17, version: '^17.0.0' });

      const testingLibraryVersion = (manager as any).getReactTestingLibraryVersionForReact(17);
      expect(testingLibraryVersion).toBe('^12.1.5');
    });
  });
});
