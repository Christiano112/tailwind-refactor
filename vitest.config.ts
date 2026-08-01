import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.test.ts', 'tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@tailwind-refactor/core': resolve(__dirname, './packages/core/src'),
      '@tailwind-refactor/parser': resolve(__dirname, './packages/parser/src'),
      '@tailwind-refactor/resolver': resolve(__dirname, './packages/resolver/src'),
      '@tailwind-refactor/rules': resolve(__dirname, './packages/rules/src'),
    },
  },
});
