import { SourceParser } from '@tailwind-refactor/parser';
import { RefactorEngine } from '@tailwind-refactor/rules';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

describe('Dynamic Class Detection & Safety Analysis Fixture Suite', () => {
  const parser = new SourceParser();
  const engine = new RefactorEngine();

  it('extracts static JSX classes cleanly from static.tsx', () => {
    const filePath = resolve(__dirname, 'fixtures/static.tsx');
    const code = readFileSync(filePath, 'utf-8');
    const result = parser.parseCodeWithAnalysis(code, filePath);

    expect(result.safeCandidates.map((c) => c.value)).toContain('p-4');
    expect(result.safeCandidates.map((c) => c.value)).toContain('h-[40px]');
    expect(result.safeCandidates.map((c) => c.value)).toContain('bg-[#ff0000]');
    expect(result.dynamicCandidates).toHaveLength(0);
  });

  it('extracts static portions from conditional.tsx', () => {
    const filePath = resolve(__dirname, 'fixtures/conditional.tsx');
    const code = readFileSync(filePath, 'utf-8');
    const result = parser.parseCodeWithAnalysis(code, filePath);

    expect(result.safeCandidates.map((c) => c.value)).toContain('p-4');
    expect(result.safeCandidates.map((c) => c.value)).toContain('h-[40px]');
    expect(result.safeCandidates.map((c) => c.value)).toContain('h-[20px]');
  });

  it('extracts static candidates from clsx.tsx', () => {
    const filePath = resolve(__dirname, 'fixtures/clsx.tsx');
    const code = readFileSync(filePath, 'utf-8');
    const result = parser.parseCodeWithAnalysis(code, filePath);

    expect(result.safeCandidates.map((c) => c.value)).toContain('p-4');
    expect(result.safeCandidates.map((c) => c.value)).toContain('h-[40px]');
  });

  it('extracts static candidates from cva.ts', () => {
    const filePath = resolve(__dirname, 'fixtures/cva.ts');
    const code = readFileSync(filePath, 'utf-8');
    const result = parser.parseCodeWithAnalysis(code, filePath);

    expect(result.safeCandidates.map((c) => c.value)).toContain('rounded-[8px]');
    expect(result.safeCandidates.map((c) => c.value)).toContain('bg-[#0000ff]');
  });

  it('identifies runtime template interpolation as dynamic in dynamic-template.tsx and skips transformation', () => {
    const filePath = resolve(__dirname, 'fixtures/dynamic-template.tsx');
    const code = readFileSync(filePath, 'utf-8');
    const result = parser.parseCodeWithAnalysis(code, filePath);

    expect(result.dynamicCandidates.length).toBeGreaterThan(0);
    expect(result.dynamicCandidates[0].confidence).toBe('dynamic');

    const analysis = engine.analyzeCodeWithAnalysis(code, filePath);
    // Unsafe template interpolation is skipped from refactoring edits
    expect(analysis.transformations.some((t) => t.original.includes('${height}'))).toBe(false);
  });

  it('identifies unknown property references in unknown-variable.tsx', () => {
    const filePath = resolve(__dirname, 'fixtures/unknown-variable.tsx');
    const code = readFileSync(filePath, 'utf-8');
    const result = parser.parseCodeWithAnalysis(code, filePath);

    expect(result.dynamicCandidates.length).toBeGreaterThan(0);
    expect(result.dynamicCandidates[0].sourceType).toBe('unknown');
  });
});
