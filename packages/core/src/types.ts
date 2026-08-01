/**
 * @fileoverview Core domain primitives and type contracts for the tailwind-refactor engine.
 *
 * These types are the **internal building blocks** used across the parsing,
 * resolution, and rule-evaluation layers. They are distinct from the
 * public-facing types in `@tailwind-refactor/plugin-api`, which are the
 * stable ecosystem contracts visible to third-party plugin authors.
 *
 * @remarks
 * The critical design decision here is the {@link CandidateLocation} — a pair
 * of absolute **character byte offsets** into the raw source file string.
 * All patching is done via these offsets, never by re-printing the AST,
 * which guarantees that comments, blank lines, and formatting are preserved.
 *
 * @module @tailwind-refactor/core
 */

import type { Confidence } from '@tailwind-refactor/plugin-api';

export type { Confidence };

/**
 * A fully parsed representation of a single Tailwind CSS class token.
 *
 * @remarks
 * Produced by `parseTailwindClass()` in `class-parser.ts`.
 * The parser splits a raw class string (e.g. `'hover:md:h-[40px]!'`) into
 * its constituent parts for downstream rule evaluation.
 *
 * @example
 * // Input:  'hover:md:h-[40px]!'
 * // Output:
 * const parsed: TailwindClass = {
 *   raw: 'hover:md:h-[40px]!',
 *   variants: ['hover', 'md'],
 *   utility: 'h',
 *   value: '40px',
 *   important: true,
 *   isArbitrary: true,
 * };
 */
export interface TailwindClass {
  /** The raw, unmodified class string as it appears in source code. */
  raw: string;
  /**
   * List of Tailwind variant prefixes in order of application.
   * @example `['hover', 'md', 'dark']` for the class `'hover:md:dark:text-white'`
   */
  variants: string[];
  /**
   * The core utility name without the value segment.
   * @example `'h'` for `'h-[40px]'`, `'text'` for `'text-[#fff]'`
   */
  utility: string;
  /**
   * The value portion of an arbitrary or scale-based class.
   * @example `'40px'` for `'h-[40px]'`, `'blue'` for `'text-blue-500'`
   */
  value?: string;
  /** Whether the class has the `!important` modifier suffix (e.g. `'h-10!'`). */
  important?: boolean;
  /**
   * Whether the value is an arbitrary CSS value enclosed in brackets.
   * @example `true` for `'h-[40px]'`, `false` for `'h-10'`
   */
  isArbitrary?: boolean;
  /**
   * Optional modifier suffix, such as opacity (e.g. `'/5'` for `'bg-[#1a8cff]/5'`).
   */
  modifier?: string;
}

/**
 * Absolute character byte offset range within a raw source file string.
 *
 * @remarks
 * This is the **central primitive** that enables non-destructive source patching.
 * By recording start/end offsets at parse time, the patcher can later slice and
 * replace exactly the right substring without touching anything else in the file.
 *
 * Offsets are always based on the **normalized LF** (`'\n'`) version of the source
 * to handle CRLF (`'\r\n'`) Windows line endings consistently.
 *
 * @example
 * // In 'const x = "h-[40px]";'
 * // 'h-[40px]' starts at index 11 and ends at index 19
 * const loc: CandidateLocation = { start: 11, end: 19 };
 */
export interface CandidateLocation {
  /** Inclusive start character index into the raw source file string. */
  start: number;
  /** Exclusive end character index into the raw source file string. */
  end: number;
}

/**
 * A single class string extracted from source code and earmarked for rule evaluation.
 *
 * @remarks
 * Candidates are produced by `SourceParser.parseCode()` after traversing the
 * TypeScript/JSX/Vue/Svelte/Astro AST. Each candidate has a precise
 * {@link CandidateLocation} so it can be surgically replaced during patching.
 *
 * Both individual tokens (`'h-10'`) and full multi-class strings
 * (`'h-10 flex items-center'`) can be candidates — the rule engine
 * evaluates them independently.
 *
 * @example
 * const candidate: TailwindCandidate = {
 *   value: 'h-[40px]',
 *   location: { start: 42, end: 50 },
 *   filePath: 'src/Button.tsx',
 * };
 */
export interface TailwindCandidate {
  /** The raw class string value extracted from the source. */
  value: string;
  /** Byte offset range of this candidate within the source file. */
  location: CandidateLocation;
  /** POSIX-normalized path to the source file this candidate was extracted from. */
  filePath?: string;
}

/**
 * A proposed refactoring of a single class string within the engine.
 *
 * @remarks
 * Internal engine `Transformation` objects are produced by rule evaluation and
 * collected in `RefactorEngine.analyzeCode()`. They are then:
 * 1. Filtered for overlapping ranges by the collision detector.
 * 2. Converted to {@link FileChange} objects for patching.
 * 3. Serialized to the public `Transformation` shape (from `plugin-api`) for reporters.
 *
 * @example
 * const t: Transformation = {
 *   file: 'src/Button.tsx',
 *   original: 'h-[40px]',
 *   replacement: 'h-10',
 *   confidence: 'safe',
 *   rule: 'prefer-token-values',
 *   reason: 'Arbitrary value 40px maps exactly to spacing token 10 (2.5rem)',
 *   location: { start: 42, end: 50 },
 * };
 */
export interface Transformation {
  /** POSIX-normalized path to the source file containing the original class. */
  file?: string;
  /** The original class string that should be replaced. */
  original: string;
  /** The canonical replacement class string. */
  replacement: string;
  /** Confidence level for this replacement being semantically safe. */
  confidence: Confidence;
  /** The rule ID that generated this transformation (e.g. `'prefer-token-values'`). */
  rule: string;
  /** Human-readable explanation of why this transformation is being proposed. */
  reason?: string;
  /** Byte offset range of `original` within the source file. */
  location?: CandidateLocation;
}

/**
 * A concrete text replacement instruction ready to be applied to a source file.
 *
 * @remarks
 * `FileChange` objects are the direct input to `applyFilePatches()`.
 * They are sorted **descending by `start`** so that applying earlier changes
 * in the string does not shift the offsets of later changes.
 *
 * @see {@link applyFilePatches}
 *
 * @example
 * const change: FileChange = {
 *   file: 'src/Button.tsx',
 *   start: 42,
 *   end: 50,
 *   original: 'h-[40px]',
 *   replacement: 'h-10',
 * };
 */
export interface FileChange {
  /** POSIX-normalized path to the source file to be modified. */
  file: string;
  /** Inclusive start character index of the text range to replace. */
  start: number;
  /** Exclusive end character index of the text range to replace. */
  end: number;
  /** The expected original text at this range (used for safety verification). */
  original: string;
  /** The text to insert in place of `original`. */
  replacement: string;
}

/**
 * Discriminated union returned by {@link TailwindResolver.resolve}.
 * Unambiguously distinguishes between unknown utilities and unequivalent values.
 */
export type ResolutionResult =
  | { found: true; canonical: string; cssValue: string }
  | { found: false; reason: 'unknown-utility' | 'no-equivalent' };

/**
 * Minimal interface for token/utility resolution.
 *
 * @remarks
 * Resolvers are the bridge between raw arbitrary Tailwind values
 * (e.g. `'40px'`) and canonical theme token scale steps (e.g. `'h-10'`).
 *
 * Implementations:
 * - `TailwindV3Resolver` — resolves against Tailwind v3 `theme` configuration.
 * - `TailwindV4Resolver` — resolves against Tailwind v4 `@theme` CSS custom properties.
 *
 * @see TailwindV3Resolver
 * @see TailwindV4Resolver
 *
 * @example
 * const resolver: TailwindResolver = new TailwindV3Resolver();
 * const token = resolver.findEquivalent('h', '40px'); // → 'h-10'
 */
export interface TailwindResolver {
  /**
   * Resolves a utility and value pair, returning a detailed {@link ResolutionResult}.
   */
  resolve?(utility: string, rawValue: string): ResolutionResult;
  /**
   * Attempts to find the canonical Tailwind class for a given utility and value.
   * @param utility  - The utility prefix (e.g. `'h'`, `'p'`, `'text'`).
   * @param rawValue - The arbitrary value (e.g. `'40px'`, `'#3b82f6'`).
   * @returns The canonical class string (e.g. `'h-10'`) or `null` if no equivalent exists.
   */
  findEquivalent(utility: string, rawValue: string): string | null;
  /**
   * Resolves a parsed class object to its full, canonical Tailwind class string,
   * including variants and important modifiers (e.g. `'hover:md:dark:h-10!'`).
   * Returns `null` if no canonical replacement is available.
   */
  resolveCanonicalClass?(parsed: TailwindClass): string | null;
  /**
   * Sorts a list of class tokens into canonical Tailwind CSS order.
   */
  sortClasses?(tokens: string[]): string[];
  /**
   * Deduplicates a list of class tokens.
   */
  deduplicateClasses?(tokens: string[]): string[];
}

/**
 * Context injected into every rule's `analyze()` call.
 *
 * @remarks
 * Rules must **only** depend on `RuleContext` — never on parser internals,
 * resolver implementation details, or file system APIs. This decoupling is
 * the key architectural invariant that makes rules testable, portable, and
 * safe to run inside the VM plugin sandbox.
 *
 * @example
 * const context: RuleContext = {
 *   resolver: new TailwindV3Resolver(),
 *   filePath: 'src/Button.tsx',
 * };
 *
 * const result = myRule.analyze(candidate, parsedClass, context);
 */
export interface RuleContext {
  /** The active token resolver for the current workspace (v3 or v4). */
  resolver: TailwindResolver;
  /** POSIX-normalized path to the file currently being analyzed. */
  filePath?: string;
}
