import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30000, // 30 seconds for integration tests with git operations
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,ts}'],
      exclude: ['src/templates/**', 'test/**'],
    },
  },
});
