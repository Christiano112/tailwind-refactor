import { isSafeValue, type TailwindCandidate, type TailwindClass, type Transformation } from '@tailwind-refactor/core';
import type { Rule, RuleContext } from '../rule.interface.js';

export class ColorNormalizationRule implements Rule {
  name = 'color-normalization';

  analyze(candidate: TailwindCandidate, parsed: TailwindClass, context: RuleContext): Transformation | null {
    if (!parsed.isArbitrary || !parsed.value) return null;
    if (!isSafeValue(parsed.value)) return null;

    const replacement = context.resolver.resolveCanonicalClass
      ? context.resolver.resolveCanonicalClass(parsed)
      : context.resolver.findEquivalent(parsed.utility, parsed.value);

    if (!replacement || replacement === candidate.value) return null;

    return {
      file: context.filePath,
      original: candidate.value,
      replacement,
      confidence: 'safe',
      rule: this.name,
      reason: `Normalized arbitrary color [${parsed.value}] to canonical Tailwind color token '${replacement}'`,
      location: candidate.location,
    };
  }
}
