import { RuleContext, type TailwindCandidate, type TailwindClass, type Transformation } from '@tailwind-refactor/core';

export { RuleContext };

export interface Rule {
  name: string;
  /** Granularity of class candidate this rule operates on ('token' for single classes, 'string' for full multi-class strings). Default: 'token' */
  granularity?: 'token' | 'string';
  /** Restricts this rule to files matching the given pattern. */
  filePattern?: RegExp | string[];
  /** Analyzes a single class candidate and returns a transformation if applicable. */
  analyze(candidate: TailwindCandidate, parsed: TailwindClass, context: RuleContext): Transformation | null;
  /** Optional refinement hook called when analyze() returns non-null. */
  fix?(transformation: Transformation, context: RuleContext): Transformation;
}
