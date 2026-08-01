import { describe, expect, it } from 'vitest';
import { RefactorEngine } from './engine.js';

describe('RefactorEngine Rule Plugins', () => {
  const engine = new RefactorEngine();

  it('transforms arbitrary spacing h-[40px] to h-10', () => {
    const code = `<div className="h-[40px]" />`;
    const results = engine.analyzeCode(code);
    expect(results.some((r) => r.replacement === 'h-10')).toBe(true);
  });

  it('transforms arbitrary color bg-[#ffffff] to bg-white', () => {
    const code = `<div className="bg-[#ffffff]" />`;
    const results = engine.analyzeCode(code);
    expect(results.some((r) => r.replacement === 'bg-white')).toBe(true);
  });

  it('transforms typography size text-[16px] to text-base', () => {
    const code = `<div className="text-[16px]" />`;
    const results = engine.analyzeCode(code);
    expect(results.some((r) => r.replacement === 'text-base')).toBe(true);
  });

  it('transforms border radius rounded-[8px] to rounded-lg', () => {
    const code = `<div className="rounded-[8px]" />`;
    const results = engine.analyzeCode(code);
    expect(results.some((r) => r.replacement === 'rounded-lg')).toBe(true);
  });

  it('deduplicates duplicate classes p-4 p-4 flex', () => {
    const code = `clsx("p-4 p-4 flex")`;
    const results = engine.analyzeCode(code);
    expect(results.some((r) => r.rule === 'duplicate-class-cleanup' && r.replacement === 'p-4 flex')).toBe(true);
  });

  it('reorders out-of-order classes', () => {
    const code = `<div className="p-4 flex flex-col items-center" />`;
    const results = engine.analyzeCode(code);
    expect(results.some((r) => r.rule === 'class-ordering' && r.replacement === 'flex flex-col items-center p-4')).toBe(
      true
    );
  });
});
