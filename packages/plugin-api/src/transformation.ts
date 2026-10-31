/**
 * Transformation, ScanResult, and FixResult types for the plugin-api public surface.
 */

import type { Diagnostic } from './diagnostic.js';

/**
 * Confidence level for a {@link Transformation}, indicating how certain the
 * engine is that the proposed replacement is semantically identical.
 *
 * - `'safe'`         — 100% certain. Token value exactly matches a theme token.
 * - `'suggestion'`   — Likely correct. Based on heuristic value matching.
 * - `'experimental'` — Uncertain. Pattern matched speculatively; review manually.
 * - `'uncertain'`    — Internal engine level. Heuristic match, requires human review.
 *
 * @remarks
 * This is the **single canonical confidence type** for the entire tailwind-refactor
 * ecosystem. Plugin authors, built-in rules, and the CLI all use this type.
 */
export type Confidence = 'safe' | 'suggestion' | 'experimental' | 'uncertain';

/**
 * A single proposed refactoring transformation from one Tailwind class string
 * to its canonical equivalent.
 *
 * @remarks
 * Transformations are the core unit of work in tailwind-refactor. They are:
 * 1. Collected by rule evaluation in `RefactorEngine`.
 * 2. Filtered for range collisions before patching.
 * 3. Applied via character-range slicing in `applyFilePatches()`.
 * 4. Reported via `ScanResult` to all reporters (JSON, SARIF, HTML, terminal).
 *
 * @example
 * const t: Transformation = {
 *   rule: 'prefer-token-values',
 *   original: 'h-[40px]',
 *   replacement: 'h-10',
 *   confidence: 'safe',
 *   reason: 'Arbitrary value 40px maps exactly to spacing token 10 (2.5rem)',
 *   file: 'src/Button.tsx',
 *   location: { start: 42, end: 50 },
 * };
 */
export interface Transformation {
  /** The rule ID that generated this transformation (e.g. `'prefer-token-values'`). */
  rule: string;
  /** The original class string that should be replaced. */
  original: string;
  /** The canonical replacement class string. */
  replacement: string;
  /** How confident the engine is that this replacement is semantically equivalent. */
  confidence: Confidence;
  /** Human-readable explanation of why this transformation is being suggested. */
  reason?: string;
  /** POSIX-normalized path to the source file containing `original`. */
  file?: string;
  /** Character byte offset range of `original` within the source file. */
  location?: {
    /** Inclusive start character index in the source file. */
    start: number;
    /** Exclusive end character index in the source file. */
    end: number;
  };
}

/**
 * The aggregated result of a full workspace scan operation.
 *
 * @remarks
 * Returned by:
 * - The programmatic `scan()` Node SDK function.
 * - `RefactorPipeline.scan()`.
 * - The CLI `scan` command (serialized as JSON via `--json` flag).
 *
 * This is the primary ecosystem data model. Every reporter (`JSONReporter`,
 * `SARIFReporter`, `HTMLReporter`) consumes this interface.
 *
 * @example
 * const result = await scan({ dir: 'src' });
 * console.log(`Found ${result.totalTransformations} transformations in ${result.filesScanned} files.`);
 */
export interface ScanResult {
  /** Total number of source files processed (including those with no findings). */
  filesScanned: number;
  /** Number of files skipped due to ignore patterns or inline `// tailwind-refactor-ignore` comments. */
  filesIgnored: number;
  /** Total count of all proposed transformations across all files. */
  totalTransformations: number;
  /** Flat array of all proposed transformations from all files. */
  transformations: Transformation[];
  /** Array of informational and error diagnostics emitted during the scan. */
  diagnostics: Diagnostic[];
  /** Per-file breakdown of transformations, for use by reporters. */
  fileReports: { file: string; count: number; items: Transformation[] }[];
  /** Wall-clock time in milliseconds that the full scan took to complete. */
  durationMs: number;
}

/**
 * The aggregated result of a full workspace fix operation.
 *
 * @remarks
 * Returned by the programmatic `fix()` Node SDK function and `RefactorPipeline.fix()`.
 * When `isDryRun` is `true`, no files are written to disk but counts are still accurate.
 *
 * @example
 * const result = await fix({ dir: 'src', dryRun: true });
 * console.log(`Would fix ${result.totalTransformationsApplied} issues across ${result.filesFixed} files.`);
 */
export interface FixResult {
  /** Number of files that had at least one transformation applied or previewed. */
  filesFixed: number;
  /** Total number of transformations applied (or previewed in dry-run mode). */
  totalTransformationsApplied: number;
  /** If `true`, no files were written to disk. This is a preview of what would change. */
  isDryRun: boolean;
  /** Wall-clock time in milliseconds that the full fix operation took to complete. */
  durationMs: number;
  /**
   * File-level errors encountered during the fix operation (e.g. read/write failures).
   * An empty array indicates a fully clean run. Check this field before assuming all
   * files were successfully processed.
   */
  errors: { file: string; message: string }[];
}
