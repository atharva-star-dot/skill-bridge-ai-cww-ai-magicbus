import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const srcDir = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': srcDir,
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.int.test.ts'],
    setupFiles: ['tests/integration/setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
