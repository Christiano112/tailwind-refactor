import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
    index: 'src/index.ts',
    worker: '../rules/src/worker.ts',
  },
  format: ['cjs', 'esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  shims: true,
  tsconfig: 'tsconfig.json',
  noExternal: [/^@tailwind-refactor\//, 'postcss'],
  splitting: false,
  sourcemap: false,
});
