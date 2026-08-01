import { createResolverForWorkspace } from '@tailwind-refactor/resolver';
import { describe, expect, it } from 'vitest';
import { RefactorEngine } from './engine.js';

describe('Fix Idempotency', () => {
  it('prefer-token-values rule is idempotent', () => {
    const resolver = createResolverForWorkspace(process.cwd());
    const engine = new RefactorEngine({ resolver });
    const input = '<div className="h-[40px] w-[160px] p-[16px]" />';
    const pass1Transformations = engine.analyzeCode(input, 'test.tsx');
    const pass1 = engine.patchCode(input, pass1Transformations);
    const pass2Transformations = engine.analyzeCode(pass1, 'test.tsx');
    const pass2 = engine.patchCode(pass1, pass2Transformations);

    expect(pass1Transformations.length).toBeGreaterThan(0);
    expect(pass2).toEqual(pass1);
    expect(pass2Transformations.length).toBe(0);
  });

  it('produces no further transformations after first fix across arbitrary utilities', () => {
    const resolver = createResolverForWorkspace(process.cwd());
    const engine = new RefactorEngine({ resolver });
    const inputs = [
      '<div className="h-[40px]" />',
      '<div className="w-[160px]" />',
      '<div className="p-[16px]" />',
      '<div className="text-[#000000]" />',
    ];

    for (const input of inputs) {
      const t1 = engine.analyzeCode(input, 'test.tsx');
      const fixed = engine.patchCode(input, t1);
      const t2 = engine.analyzeCode(fixed, 'test.tsx');
      expect(t2.length).toBe(0);
    }
  });
});
