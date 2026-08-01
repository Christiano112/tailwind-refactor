import { applyFilePatches } from '@tailwind-refactor/core';
import type {
  PluginCandidateShape,
  PluginClassShape,
  PluginRule,
  PluginRuleContext,
} from '@tailwind-refactor/plugin-api';
import { PostCSSJITRunner, UtilityRegistry } from '@tailwind-refactor/resolver';
import { describe, expect, it } from 'vitest';
import { PluginSandbox } from '../packages/rules/src/plugin-sandbox.js';

describe('Red Team Infrastructure Test Suite', () => {
  it('correctly patches multi-line strings with CRLF line endings', () => {
    const crlfCode = 'const styles = `\r\n  h-[40px]\r\n  bg-[#ffffff]\r\n`;';
    const changes = [
      {
        file: 'test.tsx',
        start: crlfCode.indexOf('h-[40px]'),
        end: crlfCode.indexOf('h-[40px]') + 8,
        original: 'h-[40px]',
        replacement: 'h-10',
        confidence: 'safe' as const,
        rule: 'prefer-token-values',
        reason: 'test',
      },
    ];

    const patched = applyFilePatches(crlfCode, changes);
    expect(patched).toContain('h-10');
  });

  it('safely runs custom rules inside isolated V8 VM PluginSandbox', () => {
    const dummyRule: PluginRule = {
      name: 'dummy',
      analyze: () => ({
        file: 'test.tsx',
        original: 'h-[40px]',
        replacement: 'h-10',
        confidence: 'safe',
        rule: 'dummy',
        reason: 'test',
      }),
    };

    const mockCandidate: PluginCandidateShape = {
      value: 'h-[40px]',
      location: { start: 0, end: 8 },
      isStatic: true,
    };
    const mockParsed: PluginClassShape = {
      raw: 'h-[40px]',
      variants: [],
      utility: 'h',
      value: '40px',
      isArbitrary: true,
    };
    const mockContext: PluginRuleContext = {
      filePath: 'test.tsx',
      resolver: {
        resolve: () => ({ found: false, reason: 'unknown-utility' }),
        findEquivalent: () => null,
      },
    };

    const res = PluginSandbox.executeRuleSafely(dummyRule, mockCandidate, mockParsed, mockContext);
    expect(res?.replacement).toBe('h-10');
  });

  it('extracts custom plugin utilities using PostCSSJITRunner', () => {
    const registry = new UtilityRegistry();
    const mockPlugin = ({ addUtilities }: { addUtilities: (utils: Record<string, unknown>) => void }) => {
      addUtilities({
        '.card-gradient': { background: 'linear-gradient(to right, red, blue)' },
      });
    };

    PostCSSJITRunner.extractFromPluginFunction(mockPlugin, registry);
    expect(registry.resolveUtility('card-gradient')).toBeDefined();
  });
});
