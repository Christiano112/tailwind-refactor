import { parseTailwindClass } from '@tailwind-refactor/core';
import { createResolverForWorkspace } from '@tailwind-refactor/resolver';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

describe('Property-Based Fuzz Testing (fast-check)', () => {
  it('parseTailwindClass never throws exceptions on arbitrary random generated strings', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        try {
          const res = parseTailwindClass(input);
          // Result is either TailwindClass or null, never crashes
          expect(res === null || typeof res === 'object').toBe(true);
        } catch {
          return false; // Fuzz test failed if parser throws an unhandled error
        }
        return true;
      }),
      { numRuns: 1000 }
    );
  });

  it('resolver.findEquivalent never throws exceptions on arbitrary utility and value inputs', () => {
    const resolver = createResolverForWorkspace(process.cwd());

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (prefix, val) => {
          try {
            const res = resolver.findEquivalent(prefix, val);
            expect(res === null || typeof res === 'string').toBe(true);
          } catch {
            return false;
          }
          return true;
        }
      ),
      { numRuns: 500 }
    );
  });
});
