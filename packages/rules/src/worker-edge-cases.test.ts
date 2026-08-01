import { describe, expect, it } from 'vitest';
import { ParallelFileScanner } from './worker-pool.js';

describe('ParallelFileScanner edge cases', () => {
  it('handles empty file list without crashing', async () => {
    const result = await ParallelFileScanner.analyzeInParallel({
      files: [],
      targetDir: process.cwd(),
      config: { rules: {} },
    });
    expect(result.totalTransformations).toBe(0);
    expect(result.fileReports).toHaveLength(0);
    expect(result.dynamicCandidates).toHaveLength(0);
  });

  it('handles single file via single-thread fallback', async () => {
    const result = await ParallelFileScanner.analyzeInParallel({
      files: ['non-existent-file.tsx'],
      targetDir: process.cwd(),
      config: { rules: {} },
    });
    expect(result.totalTransformations).toBe(0);
    expect(result.fileReports).toHaveLength(0);
  });
});
