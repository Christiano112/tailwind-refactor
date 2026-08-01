import { describe, expect, it } from 'vitest';
import { InlineIgnoreMatcher } from './inline-ignore.js';

describe('InlineIgnoreMatcher', () => {
  it('handles // tailwind-refactor-disable-next-line for all rules', () => {
    const code = `
      // tailwind-refactor-disable-next-line
      <div className="h-[40px]" />
    `;

    const matcher = new InlineIgnoreMatcher(InlineIgnoreMatcher.parseDirectivesFromText(code));

    // Line 3 is disabled
    expect(matcher.isTransformationIgnored({ start: 0, end: 10, line: 3 }, 'prefer-token-values')).toBe(true);
    expect(matcher.isTransformationIgnored({ start: 0, end: 10, line: 3 }, 'duplicate-classes')).toBe(true);
    // Line 2 is not disabled
    expect(matcher.isTransformationIgnored({ start: 0, end: 10, line: 2 }, 'prefer-token-values')).toBe(false);
  });

  it('handles rule-specific // tailwind-refactor-disable-next-line', () => {
    const code = `
      // tailwind-refactor-disable-next-line prefer-token-values
      <div className="h-[40px] p-4 p-4" />
    `;

    const matcher = new InlineIgnoreMatcher(InlineIgnoreMatcher.parseDirectivesFromText(code));

    // prefer-token-values is disabled on line 3
    expect(matcher.isTransformationIgnored({ start: 0, end: 10, line: 3 }, 'prefer-token-values')).toBe(true);
    // duplicate-class-cleanup is NOT disabled on line 3
    expect(matcher.isTransformationIgnored({ start: 0, end: 10, line: 3 }, 'duplicate-class-cleanup')).toBe(false);
  });

  it('handles block disable and enable comments', () => {
    const code = `
      /* tailwind-refactor-disable */
      <div className="h-[40px]" />
      <div className="p-[16px]" />
      /* tailwind-refactor-enable */
      <div className="rounded-[8px]" />
    `;

    const matcher = new InlineIgnoreMatcher(InlineIgnoreMatcher.parseDirectivesFromText(code));

    // Lines 2 to 5 inside block are disabled
    expect(matcher.isTransformationIgnored({ start: 0, end: 10, line: 3 }, 'prefer-token-values')).toBe(true);
    expect(matcher.isTransformationIgnored({ start: 0, end: 10, line: 4 }, 'prefer-token-values')).toBe(true);
    // Line 6 after enable is NOT disabled
    expect(matcher.isTransformationIgnored({ start: 0, end: 10, line: 6 }, 'prefer-token-values')).toBe(false);
  });
});
