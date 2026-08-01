import { TailwindV3Resolver, TailwindV4Resolver } from '@tailwind-refactor/resolver';
import { RefactorEngine } from '@tailwind-refactor/rules';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

describe('Fixture Project Refactoring Analysis', () => {
  it('analyzes Tailwind v3 fixture project correctly', () => {
    const v3FilePath = resolve(__dirname, './fixtures/tailwind-v3-project/Button.tsx');
    const code = readFileSync(v3FilePath, 'utf-8');

    const engine = new RefactorEngine({ resolver: new TailwindV3Resolver() });
    const transformations = engine.analyzeCode(code, v3FilePath);

    const map = new Map(transformations.map((t) => [t.original, t.replacement]));
    expect(map.get('h-[40px]')).toBe('h-10');
    expect(map.get('p-[16px]')).toBe('p-4');
    expect(map.get('text-[16px]')).toBe('text-base');
    expect(map.get('bg-[#ffffff]')).toBe('bg-white');
    expect(map.get('rounded-[8px]')).toBe('rounded-lg');
    expect(map.get('md:hover:!h-[40px]')).toBe('md:hover:!h-10');
  });

  it('analyzes Tailwind v4 fixture project with CSS @theme correctly', () => {
    const cssPath = resolve(__dirname, './fixtures/tailwind-v4-project/theme.css');
    const cardPath = resolve(__dirname, './fixtures/tailwind-v4-project/Card.tsx');

    const cssContent = readFileSync(cssPath, 'utf-8');
    const cardCode = readFileSync(cardPath, 'utf-8');

    const v4Resolver = new TailwindV4Resolver(cssContent);
    const engine = new RefactorEngine({ resolver: v4Resolver });
    const transformations = engine.analyzeCode(cardCode, cardPath);

    const map = new Map(transformations.map((t) => [t.original, t.replacement]));
    expect(map.get('h-[40px]')).toBe('h-10');
    expect(map.get('p-[16px]')).toBe('p-4');
    expect(map.get('bg-[#3b82f6]')).toBe('bg-blue-500');
    expect(map.get('rounded-[8px]')).toBe('rounded-lg');
    expect(map.get('text-[16px]')).toBe('text-base');
  });
});
