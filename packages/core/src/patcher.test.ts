import { describe, expect, it } from 'vitest';
import { applyFilePatches } from './patcher.js';

describe('applyFilePatches', () => {
  it('replaces character ranges accurately without disturbing formatting or surrounding code', () => {
    const code = `<div className="h-[40px] p-[16px] text-red-500" />`;
    // "h-[40px]" is at range [16, 24]
    // "p-[16px]" is at range [25, 33]
    const patches = [
      { file: 'file.tsx', start: 16, end: 24, original: 'h-[40px]', replacement: 'h-10' },
      { file: 'file.tsx', start: 25, end: 33, original: 'p-[16px]', replacement: 'p-4' },
    ];

    const result = applyFilePatches(code, patches);
    expect(result).toBe(`<div className="h-10 p-4 text-red-500" />`);
  });
});
