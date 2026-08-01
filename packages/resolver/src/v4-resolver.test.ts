import { describe, expect, it } from 'vitest';
import { TailwindV3Resolver } from './v3-resolver.js';
import { TailwindV4Resolver } from './v4-resolver.js';

describe('TailwindV4Resolver', () => {
  const css = `
    @theme {
      --spacing-10: 2.5rem;
      --color-brand: #3b82f6;
      --radius-lg: 0.5rem;
      --font-base: 1rem;
    }
  `;

  const v4Resolver = new TailwindV4Resolver(css);
  const v3Resolver = new TailwindV3Resolver();

  it('resolves CSS-first spacing variable --spacing-10: 2.5rem for h-[40px]', () => {
    expect(v4Resolver.findEquivalent('h', '40px')).toBe('h-10');
    expect(v4Resolver.findEquivalent('h', '2.5rem')).toBe('h-10');
  });

  it('resolves CSS-first color variable --color-brand: #3b82f6 for bg-[#3b82f6]', () => {
    expect(v4Resolver.findEquivalent('bg', '#3b82f6')).toBe('bg-brand');
  });

  it('resolves CSS-first border radius --radius-lg: 0.5rem for rounded-[8px]', () => {
    expect(v4Resolver.findEquivalent('rounded', '8px')).toBe('rounded-lg');
  });

  it('outputs identical token formats as Tailwind v3 resolver', () => {
    const v3Result = v3Resolver.findEquivalent('h', '40px');
    const v4Result = v4Resolver.findEquivalent('h', '40px');
    expect(v3Result).toBe(v4Result);
    expect(v3Result).toBe('h-10');
  });

  it('resolves custom CSS variables and var() references (e.g. --sc-primary-300: #1a8cff)', () => {
    const globalsCss = `
      @theme inline {
        --color-sc-primary-300: var(--sc-primary-300);
      }
      :root {
        --sc-primary-300: #1a8cff;
      }
    `;
    const resolver = new TailwindV4Resolver(globalsCss);
    expect(resolver.findEquivalent('text', '#1A8CFF')).toBe('text-sc-primary-300');
    expect(resolver.findEquivalent('bg', '#1a8cff')).toBe('bg-sc-primary-300');
  });
});
