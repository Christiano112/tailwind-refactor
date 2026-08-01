import { describe, expect, it } from 'vitest';
import { TailwindV3Resolver } from './v3-resolver.js';

describe('TailwindV3Resolver', () => {
  const resolver = new TailwindV3Resolver();

  it('resolves spacing arbitrary value h-[40px] to h-10', () => {
    expect(resolver.findEquivalent('h', '40px')).toBe('h-10');
  });

  it('resolves padding arbitrary value p-[16px] to p-4', () => {
    expect(resolver.findEquivalent('p', '16px')).toBe('p-4');
  });

  it('resolves border radius rounded-[8px] to rounded-lg', () => {
    expect(resolver.findEquivalent('rounded', '8px')).toBe('rounded-lg');
  });

  it('resolves border radius rounded-[4px] to rounded', () => {
    expect(resolver.findEquivalent('rounded', '4px')).toBe('rounded');
  });

  it('resolves font size text-[16px] to text-base', () => {
    expect(resolver.findEquivalent('text', '16px')).toBe('text-base');
  });

  it('resolves color bg-[#ffffff] to bg-white', () => {
    expect(resolver.findEquivalent('bg', '#ffffff')).toBe('bg-white');
  });

  it('resolves custom spacing arbitrary pixel values to canonical spacing step tokens', () => {
    expect(resolver.findEquivalent('max-w', '878px')).toBe('max-w-219.5');
    expect(resolver.findEquivalent('h', '754px')).toBe('h-188.5');
    expect(resolver.findEquivalent('w', '965px')).toBe('w-241.25');
    expect(resolver.findEquivalent('h', '416px')).toBe('h-104');
    expect(resolver.findEquivalent('size', '140px')).toBe('size-35');
  });

  it('resolves negative arbitrary values, maxWidth container scale steps, and leading line-height', () => {
    expect(resolver.findEquivalent('right', '-20px')).toBe('-right-5');
    expect(resolver.findEquivalent('right', '[-20px]')).toBe('-right-5');
    expect(resolver.findEquivalent('max-w', '1152px')).toBe('max-w-6xl');
    expect(resolver.findEquivalent('max-w', '288')).toBe('max-w-6xl');
    expect(resolver.findEquivalent('leading', '42px')).toBe('leading-10.5');
    expect(resolver.findEquivalent('leading', '30px')).toBe('leading-7.5');
    expect(resolver.findEquivalent('leading', '51px')).toBe('leading-12.75');
  });

  it('symmetrically resolves all width and height constraints (min-w, max-w, min-h, max-h)', () => {
    expect(resolver.findEquivalent('min-w', '1152px')).toBe('min-w-6xl');
    expect(resolver.findEquivalent('min-w', '288')).toBe('min-w-6xl');
    expect(resolver.findEquivalent('max-w', '1152px')).toBe('max-w-6xl');
    expect(resolver.findEquivalent('max-w', '288')).toBe('max-w-6xl');
    expect(resolver.findEquivalent('min-h', '100vh')).toBe('min-h-screen');
    expect(resolver.findEquivalent('max-h', '100vh')).toBe('max-h-screen');
  });

  it('returns null for non-matching / unresolvable arbitrary value w-[237.33px]', () => {
    expect(resolver.findEquivalent('w', '237.33px')).toBeNull();
  });

  it('never resolves text prefix to spacing step tokens (text-[28px] must return null)', () => {
    expect(resolver.findEquivalent('text', '28px')).toBeNull();
  });

  it('resolves font size text-[36px] to text-4xl and text-[48px] to text-5xl', () => {
    expect(resolver.findEquivalent('text', '36px')).toBe('text-4xl');
    expect(resolver.findEquivalent('text', '48px')).toBe('text-5xl');
  });
});
