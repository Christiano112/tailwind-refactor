import type { TailwindCandidate } from '@tailwind-refactor/core';

export type SourceType = 'static' | 'template' | 'conditional' | 'function-call' | 'unknown';
export type DynamicConfidence = 'static' | 'partial' | 'dynamic';

export interface DynamicCandidate {
  expression: string;
  sourceType: SourceType;
  extractedClasses: string[];
  confidence: DynamicConfidence;
  location: { start: number; end: number };
  filePath?: string;
  line?: number;
  reason?: string;
}

export interface ParseResult {
  safeCandidates: TailwindCandidate[];
  /** Candidates representing full multi-class attribute strings (for string-granularity rules like class-ordering and duplicate-cleanup). */
  stringCandidates: TailwindCandidate[];
  /** Candidates representing individual single-token class names (for token-granularity rules like prefer-token-values). */
  tokenCandidates: TailwindCandidate[];
  dynamicCandidates: DynamicCandidate[];
}
