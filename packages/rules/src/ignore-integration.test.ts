import { createIgnoreContext } from '@tailwind-refactor/ignore';
import { describe, expect, it } from 'vitest';
import { RefactorEngine } from './engine.js';

describe('Ignore System & Inline Comment Integration', () => {
  it('suppresses transformations for // tailwind-refactor-disable-next-line', () => {
    const code = `
      // tailwind-refactor-disable-next-line
      <div className="h-[40px]" />
      <div className="p-[16px]" />
    `;

    const engine = new RefactorEngine();
    const results = engine.analyzeCode(code);

    // Line 3 (h-[40px]) is disabled, Line 4 (p-[16px]) is enabled
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.original === 'p-[16px]')).toBe(true);
    expect(results.some((r) => r.original === 'h-[40px]')).toBe(false);
  });

  it('suppresses rule-specific // tailwind-refactor-disable-next-line prefer-token-values', () => {
    const code = `
      // tailwind-refactor-disable-next-line prefer-token-values arbitrary-value-normalization
      <div className="h-[40px] p-4 p-4" />
    `;

    const engine = new RefactorEngine();
    const results = engine.analyzeCode(code);

    // arbitrary-value-normalization is disabled, duplicate-class-cleanup is enabled
    expect(results.some((r) => r.rule === 'arbitrary-value-normalization')).toBe(false);
    expect(results.some((r) => r.rule === 'duplicate-class-cleanup')).toBe(true);
  });

  it('suppresses transformations inside /* tailwind-refactor-disable */ block', () => {
    const code = `
      /* tailwind-refactor-disable */
      <div className="h-[40px]" />
      <div className="p-[16px]" />
      /* tailwind-refactor-enable */
      <div className="rounded-[8px]" />
    `;

    const engine = new RefactorEngine();
    const results = engine.analyzeCode(code);

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.original === 'rounded-[8px]')).toBe(true);
    expect(results.some((r) => r.original === 'h-[40px]')).toBe(false);
    expect(results.some((r) => r.original === 'p-[16px]')).toBe(false);
  });

  it('produces zero transformations for ignored file path', () => {
    const code = `<div className="h-[40px]" />`;
    const ignoreContext = createIgnoreContext({ configIgnores: ['src/generated/**'] });

    const engine = new RefactorEngine({ ignoreContext });
    const results = engine.analyzeCode(code, 'src/generated/button.tsx');

    expect(results).toHaveLength(0);
  });
});
