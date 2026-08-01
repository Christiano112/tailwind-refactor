import type { TailwindCandidate, TailwindClass, Transformation } from '@tailwind-refactor/core';
import type { Rule, RuleContext } from '../rule.interface.js';

export class DuplicateClassCleanupRule implements Rule {
  name = 'duplicate-class-cleanup';
  granularity: 'string' = 'string';

  analyze(candidate: TailwindCandidate, _parsed: TailwindClass, context: RuleContext): Transformation | null {
    const tokens = candidate.value.trim().split(/\s+/);
    if (tokens.length <= 1) return null;

    const deduplicated = context.resolver.deduplicateClasses
      ? context.resolver.deduplicateClasses(tokens)
      : Array.from(new Set(tokens));

    if (deduplicated.length === tokens.length) return null;

    const replacement = deduplicated.join(' ');
    return {
      file: context.filePath,
      original: candidate.value,
      replacement,
      confidence: 'safe',
      rule: this.name,
      reason: `Removed duplicate class token(s) from class list '${candidate.value}'`,
      location: candidate.location,
    };
  }
}
