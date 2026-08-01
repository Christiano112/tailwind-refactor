import type { TailwindCandidate, TailwindClass, Transformation } from '@tailwind-refactor/core';
import type { Rule, RuleContext } from '../rule.interface.js';

export class ClassOrderingRule implements Rule {
  name = 'class-ordering';
  granularity: 'string' = 'string';

  analyze(candidate: TailwindCandidate, _parsed: TailwindClass, context: RuleContext): Transformation | null {
    const tokens = candidate.value.trim().split(/\s+/);
    if (tokens.length <= 1) return null;

    const sortedTokens = context.resolver.sortClasses ? context.resolver.sortClasses(tokens) : [...tokens];

    const replacement = sortedTokens.join(' ');
    if (replacement === candidate.value) return null;

    return {
      file: context.filePath,
      original: candidate.value,
      replacement,
      confidence: 'safe',
      rule: this.name,
      reason: `Reordered class tokens to conform to canonical Tailwind sorting order`,
      location: candidate.location,
    };
  }
}
