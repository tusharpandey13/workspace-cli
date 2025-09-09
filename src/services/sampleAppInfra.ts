import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger.js';
import { executeCommand } from '../utils/init-helpers.js';

export type SampleAppType = 'next' | 'spa' | 'node' | 'unknown';

export interface TestingInfrastructure {
  dependencies: Record<string, string>;
  scripts: Record<string, string>;
  configFiles: Array<{ path: string; content: string }>;
  testFiles: Array<{ path: string; content: string }>;
  directories: string[];
}

/**
 * Sample App Infrastructure Manager
 * Automatically sets up testing infrastructure for Auth0 sample apps
 */
export class SampleAppInfrastructureManager {
  private samplePath: string;
  private isDryRun: boolean;

  constructor(samplePath: string, isDryRun: boolean = false) {
    this.samplePath = samplePath;
    this.isDryRun = isDryRun;
  }

  async detectAppType(): Promise<SampleAppType> {
    try {
      const packageJsonPath = path.join(this.samplePath, 'package.json');

      if (!fs.existsSync(packageJsonPath)) {
        logger.warn('No package.json found, cannot detect app type');
        return 'unknown';
      }

      const packageJson = await fs.readJson(packageJsonPath);
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      if (dependencies.next) return 'next';
      if (dependencies.express || dependencies.fastify) return 'node';

      const hasHtmlFile = fs.existsSync(path.join(this.samplePath, 'index.html'));
      if (hasHtmlFile) return 'spa';

      return 'unknown';
    } catch (error) {
      logger.error(`Error detecting app type: ${error}`);
      return 'unknown';
    }
  }

  private async detectReactVersion(): Promise<{ major: number; version: string } | null> {
    try {
      const packageJsonPath = path.join(this.samplePath, 'package.json');

      if (!fs.existsSync(packageJsonPath)) {
        return null;
      }

      const packageJson = await fs.readJson(packageJsonPath);
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      const reactVersion = dependencies.react;
      if (!reactVersion) {
        return null;
      }

      // Extract major version from version string (e.g., "^18.0.0" -> 18, "19.0.0" -> 19)
      const versionMatch = reactVersion.match(/(\d+)/);
      if (!versionMatch) {
        logger.warn(`Could not parse React version: ${reactVersion}`);
        return null;
      }

      const major = parseInt(versionMatch[1], 10);
      return { major, version: reactVersion };
    } catch (error) {
      logger.error(`Error detecting React version: ${error}`);
      return null;
    }
  }

  async setupTestingInfrastructure(): Promise<void> {
    const appType = await this.detectAppType();

    if (appType === 'unknown') {
      logger.warn('Unknown app type, skipping testing infrastructure setup');
      return;
    }

    logger.info(`🔧 Setting up testing infrastructure for ${appType} sample app...`);

    // Detect React version for version-aware dependency selection
    const reactVersion = await this.detectReactVersion();
    if (reactVersion) {
      logger.verbose(
        `Detected React version: ${reactVersion.version} (major: ${reactVersion.major})`,
      );
    }

    const infrastructure = this.getInfrastructureConfig(appType);

    // Update React Testing Library version based on detected React version
    if (appType === 'next' || appType === 'spa') {
      let testingLibraryVersion: string;
      if (reactVersion) {
        testingLibraryVersion = this.getReactTestingLibraryVersionForReact(reactVersion.major);
        logger.verbose(`Using @testing-library/react version: ${testingLibraryVersion}`);
      } else {
        // No React detected, use default React 18 compatible version
        testingLibraryVersion = '^14.3.1';
        logger.verbose(`No React version detected, using default: ${testingLibraryVersion}`);
      }
      infrastructure.dependencies['@testing-library/react'] = testingLibraryVersion;
    }

    await this.createDirectories(infrastructure.directories);
    await this.installDependencies(infrastructure.dependencies);
    await this.updatePackageScripts(infrastructure.scripts);
    await this.generateConfigFiles(infrastructure.configFiles);
    await this.generateTestFiles(infrastructure.testFiles);

    logger.success(`✅ Testing infrastructure configured for ${appType} sample app`);
  }

  async setupReportingInfrastructure(): Promise<void> {
    const reportDirs = ['test-results', 'coverage', 'reports', 'playwright-report'];
    await this.createDirectories(reportDirs);
    await this.updateGitignore(['test-results/', 'coverage/', 'reports/', 'playwright-report/']);
    await this.generateReportingConfigs();
    logger.success('✅ Reporting infrastructure configured');
  }

  private async generateReportingConfigs(): Promise<void> {
    const reportingConfigs = [
      {
        path: 'test-results/jest-junit.xml',
        content: '<!-- JUnit XML reports will be generated here -->',
      },
      {
        path: 'reports/README.md',
        content: this.getReportingReadme(),
      },
    ];

    await this.generateConfigFiles(reportingConfigs);
  }

  private getReportingReadme(): string {
    return `# Test Reports

This directory contains automated test reports generated during CI/CD and local development.

## Report Types

### Coverage Reports (\`coverage/\`)
- **HTML Report**: \`coverage/index.html\` - Interactive coverage report
- **JSON Report**: \`coverage/coverage-final.json\` - Programmatic coverage data
- **Text Report**: Console output during \`npm run test:coverage\`

### Test Results (\`test-results/\`)
- **JUnit XML**: \`test-results/junit.xml\` - CI-compatible test results
- **Test Logs**: Individual test execution logs and screenshots

### Playwright Reports (\`playwright-report/\`)
- **HTML Report**: \`playwright-report/index.html\` - E2E test results with traces
- **Screenshots**: Failed test screenshots and videos

## Viewing Reports

\`\`\`bash
# Generate and view coverage report
npm run test:coverage
open coverage/index.html

# View Playwright E2E test report
npm run test:e2e
npx playwright show-report

# Generate JUnit XML for CI
npm run test -- --reporter=junit --outputFile=test-results/junit.xml
\`\`\`

## CI Integration

These reports are automatically generated during CI/CD pipeline execution and can be consumed by:
- GitHub Actions (test summaries and PR comments)
- SonarQube (coverage analysis)
- Allure (test reporting)
- Teams/Slack (build notifications)
`;
  }

  private getReactTestingLibraryVersion(): string {
    // Default to React 18 compatible version if detection fails
    const defaultVersion = '^14.0.0';

    try {
      // This should be called during runtime when we have access to the detected React version
      // For now, return a synchronous version that will work for most cases
      // The actual version selection will be handled by the async setupTestingInfrastructure method
      return defaultVersion;
    } catch (error) {
      logger.warn(`Could not determine React version, defaulting to ${defaultVersion}`);
      return defaultVersion;
    }
  }

  private getReactTestingLibraryVersionForReact(reactMajorVersion: number): string {
    // Based on @testing-library/react compatibility matrix:
    // React 19: requires @testing-library/react ^16.1.0+
    // React 18: supports @testing-library/react ^13.0.0+ (recommend ^14.0.0)
    // React 17: supports @testing-library/react ^12.0.0
    switch (reactMajorVersion) {
      case 19:
        return '^16.3.0'; // Latest version with React 19 support
      case 18:
        return '^14.3.1'; // Latest stable version for React 18
      case 17:
        return '^12.1.5'; // Last version supporting React 17
      default:
        logger.warn(
          `Unsupported React version ${reactMajorVersion}, defaulting to React 18 compatible version`,
        );
        return '^14.3.1';
    }
  }

  private getInfrastructureConfig(appType: SampleAppType): TestingInfrastructure {
    const baseConfig = {
      dependencies: {
        vitest: '^1.0.0',
        '@vitest/ui': '^1.0.0',
        '@vitest/coverage-v8': '^1.0.0',
        msw: '^2.0.0',
      },
      scripts: {
        test: 'vitest --run',
        'test:watch': 'vitest',
        'test:coverage': 'vitest --coverage --run',
        'test:debug': 'vitest --inspect-brk --no-coverage',
        'test:ui': 'vitest --ui',
        'test:reporter':
          'vitest --run --reporter=junit --reporter=json --outputFile.junit=./test-results/junit.xml --outputFile.json=./test-results/results.json',
      },
      configFiles: [],
      testFiles: [],
      directories: ['tests', 'tests/mocks', 'test-results', 'coverage'],
    };

    switch (appType) {
      case 'next':
        return {
          ...baseConfig,
          dependencies: {
            ...baseConfig.dependencies,
            jsdom: '^23.0.0',
            '@testing-library/react': this.getReactTestingLibraryVersion(),
            '@testing-library/jest-dom': '^6.0.0',
            '@vitejs/plugin-react': '^4.0.0',
            playwright: '^1.40.0',
            '@playwright/test': '^1.40.0',
          },
          scripts: {
            ...baseConfig.scripts,
            'test:e2e': 'playwright test',
            'test:e2e:ui': 'playwright test --ui',
            'test:e2e:report': 'playwright show-report',
          },
          configFiles: [
            { path: 'vitest.config.ts', content: this.getVitestConfig('next') },
            { path: 'playwright.config.ts', content: this.getPlaywrightConfig() },
            { path: 'tests/setup.ts', content: this.getTestSetup() },
          ],
          testFiles: [
            { path: 'tests/mocks/server.ts', content: this.getMSWServer() },
            { path: 'tests/mocks/handlers.ts', content: this.getHandlers('next') },
            { path: 'tests/components/sample.test.tsx', content: this.getTestFile('next') },
          ],
          directories: [...baseConfig.directories, 'tests/components', 'tests/e2e'],
        };

      case 'spa':
        return {
          ...baseConfig,
          dependencies: {
            ...baseConfig.dependencies,
            jsdom: '^23.0.0',
            '@testing-library/dom': '^9.0.0',
            '@testing-library/jest-dom': '^6.0.0',
            playwright: '^1.40.0',
          },
          scripts: {
            ...baseConfig.scripts,
            'test:e2e': 'playwright test',
            'test:e2e:ui': 'playwright test --ui',
            'test:e2e:report': 'playwright show-report',
          },
          configFiles: [
            { path: 'vitest.config.ts', content: this.getVitestConfig('spa') },
            { path: 'tests/setup.ts', content: this.getTestSetup() },
          ],
          testFiles: [
            { path: 'tests/mocks/server.ts', content: this.getMSWServer() },
            { path: 'tests/mocks/handlers.ts', content: this.getHandlers('spa') },
            { path: 'tests/auth.test.ts', content: this.getTestFile('spa') },
          ],
          directories: baseConfig.directories,
        };

      case 'node':
        return {
          ...baseConfig,
          dependencies: {
            ...baseConfig.dependencies,
            supertest: '^6.0.0',
            '@types/supertest': '^2.0.0',
          },
          configFiles: [
            { path: 'vitest.config.ts', content: this.getVitestConfig('node') },
            { path: 'tests/setup.ts', content: this.getTestSetup() },
          ],
          testFiles: [
            { path: 'tests/mocks/server.ts', content: this.getMSWServer() },
            { path: 'tests/mocks/handlers.ts', content: this.getHandlers('node') },
            { path: 'tests/routes.test.ts', content: this.getTestFile('node') },
          ],
          directories: baseConfig.directories,
        };

      default:
        throw new Error(`Unsupported app type: ${appType}`);
    }
  }

  private getVitestConfig(appType: SampleAppType): string {
    const baseConfig = `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: '${appType === 'node' ? 'node' : 'jsdom'}',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx,js,jsx}'],
      exclude: ['src/**/*.test.{ts,tsx,js,jsx}', 'src/**/*.spec.{ts,tsx,js,jsx}'],
    },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-results/junit.xml',
    },
  },
});`;

    if (appType === 'next') {
      return `import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'pages/**/*.{ts,tsx}'],
      exclude: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/node_modules/**'],
    },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-results/junit.xml',
    },
  },
});`;
    }

    return baseConfig;
  }

  private getPlaywrightConfig(): string {
    return `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results/playwright',
  reporter: [
    ['html', { outputFolder: './playwright-report' }],
    ['junit', { outputFile: './test-results/playwright-junit.xml' }],
    ['json', { outputFile: './test-results/playwright-results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});`;
  }

  private getTestSetup(): string {
    return `import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());`;
  }

  private getMSWServer(): string {
    return `import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);`;
  }

  private getHandlers(appType: SampleAppType): string {
    switch (appType) {
      case 'next':
        return `import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/auth/me', () => {
    return HttpResponse.json({
      user: { sub: 'test-user', name: 'Test User', email: 'test@example.com' },
    });
  }),
];`;

      case 'spa':
        return `import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('https://YOUR_DOMAIN.auth0.com/oauth/token', () => {
    return HttpResponse.json({ access_token: 'mock-token', token_type: 'Bearer' });
  }),
];`;

      case 'node':
        return `import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/protected', () => {
    return HttpResponse.json({ message: 'Protected endpoint' });
  }),
];`;

      default:
        return '// No handlers defined';
    }
  }

  private getTestFile(appType: SampleAppType): string {
    switch (appType) {
      case 'next':
        return `import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';

describe('Sample Component Test', () => {
  test('should render basic component', () => {
    render(<div>Test Component</div>);
    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });
});`;

      case 'spa':
        return `import { describe, test, expect } from 'vitest';

describe('Auth0 SPA Integration', () => {
  test('should handle authentication', () => {
    expect(true).toBe(true); // Replace with actual test
  });
});`;

      case 'node':
        return `import { describe, test, expect } from 'vitest';

describe('API Routes', () => {
  test('should handle requests', () => {
    expect(true).toBe(true); // Replace with actual test
  });
});`;

      default:
        return '// No test file defined';
    }
  }

  // Utility methods
  private async createDirectories(directories: string[]): Promise<void> {
    for (const dir of directories) {
      const fullPath = path.join(this.samplePath, dir);
      if (this.isDryRun) {
        logger.info(`Would create directory: ${fullPath}`);
      } else {
        await fs.ensureDir(fullPath);
        logger.verbose(`Created directory: ${dir}`);
      }
    }
  }

  private async installDependencies(dependencies: Record<string, string>): Promise<void> {
    if (this.isDryRun) {
      logger.info(`Would install dependencies: ${Object.keys(dependencies).join(', ')}`);
      return;
    }

    try {
      const packageJsonPath = path.join(this.samplePath, 'package.json');
      const packageJson = await fs.readJson(packageJsonPath);

      packageJson.devDependencies = { ...packageJson.devDependencies, ...dependencies };
      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });

      // First try normal install
      try {
        await executeCommand(
          'npm',
          ['install'],
          { cwd: this.samplePath },
          'install dependencies',
          false,
        );
      } catch (installError) {
        // Check if it's a peer dependency conflict
        const errorMessage = (installError as Error).message;
        if (errorMessage.includes('ERESOLVE') || errorMessage.includes('peer dep')) {
          logger.warn('Peer dependency conflict detected, retrying with --legacy-peer-deps');
          await executeCommand(
            'npm',
            ['install', '--legacy-peer-deps'],
            { cwd: this.samplePath },
            'install dependencies with legacy peer deps',
            false,
          );
        } else {
          throw installError;
        }
      }
    } catch (error) {
      logger.error(`Failed to install dependencies: ${error}`);
      throw error;
    }
  }

  private async updatePackageScripts(scripts: Record<string, string>): Promise<void> {
    if (this.isDryRun) {
      logger.info(`Would add scripts: ${Object.keys(scripts).join(', ')}`);
      return;
    }

    const packageJsonPath = path.join(this.samplePath, 'package.json');
    const packageJson = await fs.readJson(packageJsonPath);

    packageJson.scripts = { ...packageJson.scripts, ...scripts };
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  }

  private async generateConfigFiles(
    configFiles: Array<{ path: string; content: string }>,
  ): Promise<void> {
    for (const file of configFiles) {
      const fullPath = path.join(this.samplePath, file.path);
      if (this.isDryRun) {
        logger.info(`Would create config: ${file.path}`);
      } else {
        await fs.ensureDir(path.dirname(fullPath));
        await fs.writeFile(fullPath, file.content);
      }
    }
  }

  private async generateTestFiles(
    testFiles: Array<{ path: string; content: string }>,
  ): Promise<void> {
    for (const file of testFiles) {
      const fullPath = path.join(this.samplePath, file.path);
      if (this.isDryRun) {
        logger.info(`Would create test: ${file.path}`);
      } else {
        await fs.ensureDir(path.dirname(fullPath));
        await fs.writeFile(fullPath, file.content);
      }
    }
  }

  private async updateGitignore(entries: string[]): Promise<void> {
    if (this.isDryRun) return;

    const gitignorePath = path.join(this.samplePath, '.gitignore');
    let content = '';

    if (await fs.pathExists(gitignorePath)) {
      content = await fs.readFile(gitignorePath, 'utf8');
    }

    const newEntries = entries.filter((entry) => !content.includes(entry));
    if (newEntries.length > 0) {
      content += '\n# Testing\n' + newEntries.join('\n') + '\n';
      await fs.writeFile(gitignorePath, content);
    }
  }
}
