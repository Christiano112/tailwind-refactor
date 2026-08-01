import { isSafeValue, type TailwindCandidate, type TailwindClass, type Transformation } from '@tailwind-refactor/core';
import type { Rule, RuleContext } from '../rule.interface.js';

export class UnsafeArbitraryValuesRule implements Rule {
  name = 'unsafe-arbitrary-values';

  analyze(candidate: TailwindCandidate, parsed: TailwindClass, context: RuleContext): Transformation | null {
    if (!parsed.isArbitrary || !parsed.value) return null;

    // Check for calc(), var(), env() or unresolvable dimensions
    const isUnsafe = !isSafeValue(parsed.value);
    const equivalent = context.resolver.findEquivalent(parsed.utility, parsed.value);

    if (isUnsafe || !equivalent) {
      return {
        file: context.filePath,
        original: candidate.value,
        replacement: candidate.value, // Do not modify
        confidence: 'uncertain',
        rule: this.name,
        reason: isUnsafe
          ? `Arbitrary value [${parsed.value}] contains dynamic calc()/var() or complex expressions`
          : `Arbitrary value [${parsed.value}] has no canonical theme token equivalent`,
        location: candidate.location,
      };
    }

    return null;
  }
}
