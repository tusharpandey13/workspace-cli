import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    watch: false,
    testTimeout: 5000,
    hookTimeout: 5000,
  },
});
