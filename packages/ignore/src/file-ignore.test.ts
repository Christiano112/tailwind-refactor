import { describe, expect, it } from 'vitest';
import { CATEGORIZED_DEFAULT_IGNORES, FileIgnoreMatcher } from './file-ignore.js';

describe('FileIgnoreMatcher', () => {
  it('ignores default patterns (node_modules, dist, coverage)', () => {
    const matcher = new FileIgnoreMatcher();
    expect(matcher.isFileIgnored('node_modules/react/index.js')).toBe(true);
    expect(matcher.isFileIgnored('dist/index.js')).toBe(true);
    expect(matcher.isFileIgnored('src/components/Button.tsx')).toBe(false);
  });

  it('ignores deeply nested monorepo output directories', () => {
    const matcher = new FileIgnoreMatcher();
    expect(matcher.isFileIgnored('packages/ui/dist/index.js')).toBe(true);
    expect(matcher.isFileIgnored('apps/web/.next/server/page.js')).toBe(true);
    expect(matcher.isFileIgnored('services/api/build/index.js')).toBe(true);
  });

  it('respects config and CLI ignore patterns', () => {
    const matcher = new FileIgnoreMatcher({
      configIgnores: ['src/custom-generated/**'],
      cliIgnores: ['**/*.snap'],
    });

    expect(matcher.isFileIgnored('src/custom-generated/api.ts')).toBe(true);
    expect(matcher.isFileIgnored('src/components/Button.test.tsx.snap')).toBe(true);
    expect(matcher.isFileIgnored('src/components/Button.tsx')).toBe(false);
  });

  it('supports directory segment matching via isDirectoryIgnored', () => {
    const matcher = new FileIgnoreMatcher();
    expect(matcher.isDirectoryIgnored('packages/core/dist/index.js')).toBe(true);
    expect(matcher.isDirectoryIgnored('apps/web/.turbo/cache')).toBe(true);
    expect(matcher.isDirectoryIgnored('src/components/Button.tsx')).toBe(false);
  });

  it('exports categorized default ignores', () => {
    expect(CATEGORIZED_DEFAULT_IGNORES.dependencies).toContain('**/node_modules/**');
    expect(CATEGORIZED_DEFAULT_IGNORES.buildOutputs).toContain('**/dist/**');
    expect(CATEGORIZED_DEFAULT_IGNORES.frameworks).toContain('**/.next/**');
  });
});
