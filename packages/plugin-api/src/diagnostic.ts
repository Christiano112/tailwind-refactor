/**
 * Diagnostic types for the plugin-api public surface.
 */

/**
 * Severity level for a {@link Diagnostic}.
 *
 * - `'info'`    — Informational. No action required. Used for skipped dynamic values.
 * - `'warning'` — Potential issue. Transformation suggested but not enforced.
 * - `'error'`   — Definitive violation. Transformation is safe and should be applied.
 */
export type Severity = 'info' | 'warning' | 'error';

/**
 * A structured diagnostic message emitted by any layer of the pipeline
 * (parser, resolver, config loader, rule engine, etc.).
 *
 * @remarks
 * Diagnostics power:
 * - CLI stderr output
 * - VS Code squiggly underlines and Problems panel
 * - ESLint rule violations
 * - SARIF 2.1.0 security report entries
 * - GitHub pull request inline annotations
 *
 * @example
 * const diag: Diagnostic = {
 *   code: 'DYNAMIC_VALUE_SKIPPED',
 *   message: 'Runtime interpolated value cannot be resolved at build time.',
 *   severity: 'info',
 *   file: 'src/Button.tsx',
 *   line: 12,
 * };
 */
export interface Diagnostic {
  /** Unique machine-readable diagnostic code (e.g. `'DYNAMIC_VALUE_SKIPPED'`, `'PARSE_ERROR'`). */
  code: string;
  /** Human-readable description of the issue. */
  message: string;
  /** Severity level controlling how the diagnostic is surfaced to the user. */
  severity: Severity;
  /** Source file where the diagnostic was produced (POSIX-normalized path). */
  file?: string;
  /** 1-indexed line number in the source file where the issue was detected. */
  line?: number;
}
