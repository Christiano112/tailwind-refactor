import { isSafeValue, type TailwindCandidate, type TailwindClass, type Transformation } from '@tailwind-refactor/core';
import type { Rule, RuleContext } from './rule.interface.js';

export class PreferTokenValuesRule implements Rule {
  name = 'prefer-token-values';

  analyze(candidate: TailwindCandidate, parsed: TailwindClass, context: RuleContext): Transformation | null {
    if (!parsed.isArbitrary || !parsed.value) return null;
    if (!isSafeValue(parsed.value)) return null;

    let replacement = context.resolver.resolveCanonicalClass
      ? context.resolver.resolveCanonicalClass(parsed)
      : (() => {
          const eq = context.resolver.findEquivalent(parsed.utility, parsed.value);
          if (!eq) return null;
          const varP = parsed.variants.length > 0 ? `${parsed.variants.join(':')}:` : '';
          const impP = parsed.important ? '!' : '';
          const modP = parsed.modifier ?? '';
          return `${varP}${impP}${eq}${modP}`;
        })();

    if (!replacement && /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/.test(parsed.value)) {
      const varP = parsed.variants.length > 0 ? `${parsed.variants.join(':')}:` : '';
      const impP = parsed.important ? '!' : '';
      const modP = parsed.modifier ?? '';
      let hasChange = false;
      const normalizedValue = parsed.value.replace(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (hex) => {
        const lowerHex = hex.toLowerCase();
        if (hex !== lowerHex) {
          hasChange = true;
          return lowerHex;
        }
        return hex;
      });
      if (hasChange) {
        replacement = `${varP}${impP}${parsed.utility}-[${normalizedValue}]${modP}`;
      }
    }

    if (!replacement) return null;

    return {
      file: context.filePath,
      original: candidate.value,
      replacement,
      confidence: 'safe',
      rule: this.name,
      reason: `Replaced arbitrary value [${parsed.value}] with canonical Tailwind token '${replacement}'`,
      location: candidate.location,
    };
  }
}
