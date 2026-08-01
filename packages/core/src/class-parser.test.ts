import { describe, expect, it } from 'vitest';
import { isSafeValue, parseTailwindClass } from './class-parser.js';

describe('parseTailwindClass', () => {
  it('parses standard utilities with values', () => {
    const res = parseTailwindClass('h-10');
    expect(res).toEqual({
      raw: 'h-10',
      variants: [],
      utility: 'h',
      value: '10',
      important: false,
      isArbitrary: false,
    });
  });

  it('parses variant prefixes and important modifiers', () => {
    const res = parseTailwindClass('hover:focus:!bg-blue-500');
    expect(res).toEqual({
      raw: 'hover:focus:!bg-blue-500',
      variants: ['hover', 'focus'],
      utility: 'bg-blue',
      value: '500',
      important: true,
      isArbitrary: false,
    });
  });

  it('parses simple arbitrary values', () => {
    const res = parseTailwindClass('h-[40px]');
    expect(res).toEqual({
      raw: 'h-[40px]',
      variants: [],
      utility: 'h',
      value: '40px',
      important: false,
      isArbitrary: true,
    });
  });

  it('parses complex arbitrary values with nested calc and theme functions', () => {
    const res = parseTailwindClass('h-[calc(100vh-theme(spacing.12))]');
    expect(res).toEqual({
      raw: 'h-[calc(100vh-theme(spacing.12))]',
      variants: [],
      utility: 'h',
      value: 'calc(100vh-theme(spacing.12))',
      important: false,
      isArbitrary: true,
    });
  });

  it('parses arbitrary values with multi-value space delimiters', () => {
    const res = parseTailwindClass('p-[10px_20px]');
    expect(res).toEqual({
      raw: 'p-[10px_20px]',
      variants: [],
      utility: 'p',
      value: '10px_20px',
      important: false,
      isArbitrary: true,
    });
  });

  it('parses CSS variable arbitrary values', () => {
    const res = parseTailwindClass('bg-[var(--brand-color)]');
    expect(res).toEqual({
      raw: 'bg-[var(--brand-color)]',
      variants: [],
      utility: 'bg',
      value: 'var(--brand-color)',
      important: false,
      isArbitrary: true,
    });
  });

  it('identifies runtime variable interpolations as unsafe', () => {
    expect(isSafeValue('40px')).toBe(true);
    expect(isSafeValue('${height}px')).toBe(false);
  });
});
