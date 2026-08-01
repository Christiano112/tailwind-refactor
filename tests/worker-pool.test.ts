import { ParallelFileScanner } from '@tailwind-refactor/rules';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

describe('Parallel Worker Pool Processing', () => {
  it('executes batch analysis in parallel using worker threads', async () => {
    const targetDir = resolve(__dirname, 'fixtures');
    const files = [
      resolve(__dirname, 'fixtures/static.tsx'),
      resolve(__dirname, 'fixtures/conditional.tsx'),
      resolve(__dirname, 'fixtures/clsx.tsx'),
      resolve(__dirname, 'fixtures/cva.ts'),
    ];

    const result = await ParallelFileScanner.analyzeInParallel({
      files,
      targetDir,
      maxWorkers: 2,
    });

    expect(result.totalTransformations).toBeGreaterThan(0);
    expect(result.fileReports.length).toBeGreaterThan(0);
  }, 15000);

  it('handles single file execution cleanly via fallback', async () => {
    const targetDir = resolve(__dirname, 'fixtures');
    const files = [resolve(__dirname, 'fixtures/static.tsx')];

    const result = await ParallelFileScanner.analyzeInParallel({
      files,
      targetDir,
      maxWorkers: 2,
    });

    expect(result.totalTransformations).toBeGreaterThan(0);
  }, 15000);
});
