import { describe, expect, it } from 'vitest';
import { parseTailwindClass } from '@tailwind-refactor/core';
import { applyFilePatches } from '@tailwind-refactor/core';
import { SourceParser } from '@tailwind-refactor/parser';
import {
  TailwindV3Resolver,
  TailwindV4Resolver,
  TailwindV3ConfigLoader,
  createResolverForWorkspace,
} from '@tailwind-refactor/resolver';
import { RefactorEngine } from '@tailwind-refactor/rules';
import fs from 'fs';
import path from 'path';

describe('Comprehensive Tailwind Refactor Regression Suite', () => {
  describe('Tailwind Class Parser Edge Cases', () => {
    it('parses leading ! on variants correctly (!hover:bg-blue-500, !hover:bg-[#3b82f6])', () => {
      const parsed = parseTailwindClass('!hover:bg-blue-500');
      expect(parsed).not.toBeNull();
      expect(parsed?.important).toBe(true);
      expect(parsed?.variants).toEqual(['hover']);
      expect(parsed?.utility).toBe('bg-blue');
      expect(parsed?.value).toBe('500');

      const parsedArb = parseTailwindClass('!hover:bg-[#3b82f6]');
      expect(parsedArb).not.toBeNull();
      expect(parsedArb?.important).toBe(true);
      expect(parsedArb?.variants).toEqual(['hover']);
      expect(parsedArb?.utility).toBe('bg');
      expect(parsedArb?.value).toBe('#3b82f6');
    });

    it('parses trailing ! correctly (hover:bg-blue-500!, hover:bg-[#3b82f6]!)', () => {
      const parsed = parseTailwindClass('hover:bg-blue-500!');
      expect(parsed).not.toBeNull();
      expect(parsed?.important).toBe(true);
      expect(parsed?.variants).toEqual(['hover']);
      expect(parsed?.utility).toBe('bg-blue');
      expect(parsed?.value).toBe('500');

      const parsedArb = parseTailwindClass('hover:bg-[#3b82f6]!');
      expect(parsedArb).not.toBeNull();
      expect(parsedArb?.important).toBe(true);
      expect(parsedArb?.variants).toEqual(['hover']);
      expect(parsedArb?.utility).toBe('bg');
      expect(parsedArb?.value).toBe('#3b82f6');
    });

    it('parses arbitrary properties as arbitrary ([color:red], [mask-type:luminance])', () => {
      const p1 = parseTailwindClass('[color:red]');
      expect(p1).not.toBeNull();
      expect(p1?.isArbitrary).toBe(true);
      expect(p1?.utility).toBe('[color:red]');

      const p2 = parseTailwindClass('[mask-type:luminance]');
      expect(p2).not.toBeNull();
      expect(p2?.isArbitrary).toBe(true);
      expect(p2?.utility).toBe('[mask-type:luminance]');
    });

    it('parses utilities with slashes, fractions, and negative offsets (w-1/2, -translate-x-1/2)', () => {
      const p1 = parseTailwindClass('w-1/2');
      expect(p1).not.toBeNull();
      expect(p1?.utility).toBe('w');
      expect(p1?.value).toBe('1/2');

      const p2 = parseTailwindClass('-translate-x-1/2');
      expect(p2).not.toBeNull();
      expect(p2?.utility).toBe('-translate-x');
      expect(p2?.value).toBe('1/2');
    });

    it('parses color with opacity modifier (bg-blue-500/50, bg-[#3b82f6]/50)', () => {
      const parsed = parseTailwindClass('bg-blue-500/50');
      expect(parsed).not.toBeNull();
      expect(parsed?.utility).toBe('bg-blue');
      expect(parsed?.value).toBe('500');
      expect(parsed?.modifier).toBe('/50');

      const parsedArb = parseTailwindClass('bg-[#3b82f6]/50');
      expect(parsedArb).not.toBeNull();
      expect(parsedArb?.utility).toBe('bg');
      expect(parsedArb?.value).toBe('#3b82f6');
      expect(parsedArb?.modifier).toBe('/50');
    });
  });

  describe('Utility Registry & Scale Resolution Safety', () => {
    const resolver = new TailwindV3Resolver();

    it('resolves standard spacing scale correctly', () => {
      expect(resolver.findEquivalent('p', '16px')).toBe('p-4');
      expect(resolver.findEquivalent('h', '40px')).toBe('h-10');
      expect(resolver.findEquivalent('w', '100%')).toBe('w-full');
      expect(resolver.findEquivalent('h', '100vh')).toBe('h-screen');
      expect(resolver.findEquivalent('w', '100vw')).toBe('w-screen');
    });

    it('does NOT generate classes for unresolvable arbitrary values', () => {
      expect(resolver.findEquivalent('w', '237.33px')).toBeNull();
      expect(resolver.findEquivalent('h', '99.33px')).toBeNull();
      expect(resolver.findEquivalent('text', '28px')).toBeNull();
    });

    it('resolves border widths and directional borders', () => {
      expect(resolver.findEquivalent('border', '1px')).toBe('border');
      expect(resolver.findEquivalent('border', '2px')).toBe('border-2');
      expect(resolver.findEquivalent('border', '4px')).toBe('border-4');
      expect(resolver.findEquivalent('border-t', '2px')).toBe('border-t-2');
      expect(resolver.findEquivalent('border-b', '4px')).toBe('border-b-4');
      // Border color
      expect(resolver.findEquivalent('border', '#3b82f6')).toBe('border-blue-500');
    });

    it('resolves ring widths vs ring colors', () => {
      expect(resolver.findEquivalent('ring', '1px')).toBe('ring-1');
      expect(resolver.findEquivalent('ring', '2px')).toBe('ring-2');
      expect(resolver.findEquivalent('ring', '3px')).toBe('ring');
      expect(resolver.findEquivalent('ring', '#3b82f6')).toBe('ring-blue-500');
    });

    it('resolves outline widths vs colors', () => {
      expect(resolver.findEquivalent('outline', '1px')).toBe('outline-1');
      expect(resolver.findEquivalent('outline', '2px')).toBe('outline-2');
      expect(resolver.findEquivalent('outline', '4px')).toBe('outline-4');
      expect(resolver.findEquivalent('outline', '#ffffff')).toBe('outline-white');
    });

    it('resolves font weights and font families', () => {
      expect(resolver.findEquivalent('font', '700')).toBe('font-bold');
      expect(resolver.findEquivalent('font', 'bold')).toBe('font-bold');
      expect(resolver.findEquivalent('font', '400')).toBe('font-normal');
      expect(resolver.findEquivalent('font', '500')).toBe('font-medium');
      expect(resolver.findEquivalent('font', 'sans-serif')).toBe('font-sans');
    });

    it('resolves opacity and z-index', () => {
      expect(resolver.findEquivalent('opacity', '50%')).toBe('opacity-50');
      expect(resolver.findEquivalent('opacity', '0.5')).toBe('opacity-50');
      expect(resolver.findEquivalent('opacity', '1')).toBe('opacity-100');
      expect(resolver.findEquivalent('z', '10')).toBe('z-10');
      expect(resolver.findEquivalent('z', '50')).toBe('z-50');
    });
  });

  describe('Tailwind v4 Theme Variable Parsing', () => {
    it('classifies --text-* as typography and prevents spacing pollution', () => {
      const v4Css = `
        @theme {
          --text-huge: 5rem;
          --spacing-10: 2.5rem;
          --font-weight-display: 950;
        }
      `;
      const v4Resolver = new TailwindV4Resolver(v4Css);

      // text-[5rem] should resolve to text-huge
      expect(v4Resolver.findEquivalent('text', '5rem')).toBe('text-huge');

      // p-[5rem] must NOT resolve to p-text-huge! It should resolve to standard p-20 (5rem = 80px = spacing 20)
      const pResult = v4Resolver.findEquivalent('p', '5rem');
      expect(pResult).not.toBe('p-text-huge');
      expect(pResult).toBe('p-20');

      // font-[950] should resolve to font-display
      expect(v4Resolver.findEquivalent('font', '950')).toBe('font-display');
    });
  });

  describe('Tailwind v3 Config Loader & Auto-Discovery', () => {
    it('flattens nested color objects with DEFAULT and shade keys', () => {
      const customConfig = {
        theme: {
          extend: {
            colors: {
              brand: {
                DEFAULT: '#1fb6ff',
                light: '#7e5bef',
                dark: '#ff49db',
                nested: {
                  deep: '#123456',
                },
              },
            },
          },
        },
      };

      const customResolver = new TailwindV3Resolver(customConfig);
      expect(customResolver.findEquivalent('bg', '#1fb6ff')).toBe('bg-brand');
      expect(customResolver.findEquivalent('bg', '#7e5bef')).toBe('bg-brand-light');
      expect(customResolver.findEquivalent('bg', '#ff49db')).toBe('bg-brand-dark');
      expect(customResolver.findEquivalent('text', '#123456')).toBe('text-brand-nested-deep');
    });

    it('supports fontSize tuple definitions: [fontSize, { lineHeight }]', () => {
      const customConfig = {
        theme: {
          extend: {
            fontSize: {
              sm: ['14px', { lineHeight: '20px' }],
              xl: ['20px', '28px'],
            },
          },
        },
      };

      const customResolver = new TailwindV3Resolver(customConfig as any);
      expect(customResolver.findEquivalent('text', '14px')).toBe('text-sm');
      expect(customResolver.findEquivalent('text', '20px')).toBe('text-xl');
    });

    it('auto-detects tailwind.config.js even when CSS files exist without @theme', () => {
      const tmpDir = path.resolve('./temp_v3_auto_detect_test');
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'src', 'index.css'), '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n');
      fs.writeFileSync(path.join(tmpDir, 'tailwind.config.js'), 'module.exports = { theme: { extend: { colors: { corporate: "#003366" } } } };\n');

      const resolver = createResolverForWorkspace(tmpDir);
      expect(resolver.constructor.name).toBe('TailwindV3Resolver');
      expect(resolver.findEquivalent('bg', '#003366')).toBe('bg-corporate');

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });

  describe('SFC & Template Parsing Safety', () => {
    it('accurately parses and refactors class attributes with leading and trailing spaces', () => {
      const sfcCode = `<template>
  <div class="   h-[40px]   px-[16px]   "></div>
</template>`;

      const parser = new SourceParser();
      const engine = new RefactorEngine({ parser, noCache: true });
      const transforms = engine.analyzeCode(sfcCode, 'Component.vue');
      expect(transforms.length).toBeGreaterThan(0);

      const patched = engine.patchCode(sfcCode, transforms);
      expect(patched).toContain('<div class="   h-10 px-4   "></div>');
    });
  });

  describe('AST Expression Parsing & Symbol Resolution', () => {
    it('analyzes both operands in binary string concatenation', () => {
      const code = '<div className={"px-[16px] " + "py-[8px]"} />';
      const parser = new SourceParser();
      const engine = new RefactorEngine({ parser, noCache: true });

      const transforms = engine.analyzeCode(code, 'Component.tsx');
      expect(transforms.some((t) => t.original === 'px-[16px]')).toBe(true);
      expect(transforms.some((t) => t.original === 'py-[8px]')).toBe(true);

      const patched = engine.patchCode(code, transforms);
      expect(patched).toBe('<div className={"px-4 " + "py-2"} />');
    });

    it('safely refactors variable declarations without corrupting JSX identifier usages', () => {
      const code = 'const styles = "h-[40px]";\n<div className={styles} />';
      const parser = new SourceParser();
      const engine = new RefactorEngine({ parser, noCache: true });

      const transforms = engine.analyzeCode(code, 'Component.tsx');
      const patched = engine.patchCode(code, transforms);

      expect(patched).toBe('const styles = "h-10";\n<div className={styles} />');
    });
  });

  describe('CRLF Line-Ending Preservation & Precision', () => {
    it('patches CRLF source files without offset drift and preserves CRLF endings', () => {
      const crlfCode = 'import React from "react";\r\n\r\nexport const Button = () => (\r\n  <button className="h-[40px] px-[16px]">\r\n    Click\r\n  </button>\r\n);\r\n';
      const engine = new RefactorEngine({ noCache: true });

      const transforms = engine.analyzeCode(crlfCode, 'Button.tsx');
      const patched = engine.patchCode(crlfCode, transforms);

      expect(patched).toContain('h-10 px-4');
      expect(patched.includes('\r\n')).toBe(true);
      expect(patched.split('\r\n').length).toBe(crlfCode.split('\r\n').length);
    });
  });

  describe('Idempotency & Transformation Invariants', () => {
    it('is completely idempotent on second pass', () => {
      const input = '<div className="h-[40px] p-[16px] font-[700] rounded-[8px]" />';
      const engine = new RefactorEngine({ noCache: true });

      const pass1Transforms = engine.analyzeCode(input, 'test.tsx');
      expect(pass1Transforms.length).toBeGreaterThan(0);
      const pass1 = engine.patchCode(input, pass1Transforms);

      // Second pass on patched code
      const pass2Transforms = engine.analyzeCode(pass1, 'test.tsx');
      expect(pass2Transforms.length).toBe(0);

      const pass2 = engine.patchCode(pass1, pass2Transforms);
      expect(pass2).toBe(pass1);
    });
  });
});
