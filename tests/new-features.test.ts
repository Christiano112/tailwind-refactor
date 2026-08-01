import { validateConfig } from '@tailwind-refactor/config';
import { SourceParser } from '@tailwind-refactor/parser';
import { generateV4ThemeCss } from '@tailwind-refactor/resolver';
import { describe, expect, it } from 'vitest';

describe('Top Developer Tooling Features', () => {
  it('resolves rule presets (extends: "strict")', () => {
    const config = validateConfig({ extends: 'strict' });
    expect(config.extends).toBe('strict');
    expect(config.rules?.['prefer-token-values']).toBe('error');
    expect(config.rules?.['class-ordering']).toBe('error');
  });

  it('extracts AST candidates from object literal keys in clsx helpers', () => {
    const parser = new SourceParser();
    const code = `import clsx from 'clsx';
const classes = clsx({ 'h-[40px]': isActive });`;

    const candidates = parser.parseCode(code, 'Component.tsx');
    expect(candidates.some((c) => c.value === 'h-[40px]')).toBe(true);
  });

  it('generates canonical Tailwind v4 @theme CSS block', () => {
    const css = generateV4ThemeCss({
      spacing: { card: '42px' },
      colors: { brand: '#0057ff' },
    });

    expect(css).toContain('@theme {');
    expect(css).toContain('--spacing-card: 42px;');
    expect(css).toContain('--color-brand: #0057ff;');
  });
});
