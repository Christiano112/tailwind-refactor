/**
 * @fileoverview Public configuration shape for tailwind-refactor.
 *
 * This module defines the TypeScript types for `tailwind-refactor.config.ts`,
 * the user-facing configuration file that controls which rules are enabled,
 * which files are ignored, and what Tailwind version is being used.
 *
 * @remarks
 * The JSON Schema for IDE auto-completion lives at `packages/config/schema.json`.
 * These TypeScript types are the source of truth — the schema is derived from them.
 *
 * @module @tailwind-refactor/config
 */

import type { BaseRefactorConfig, Confidence, TailwindRefactorPlugin } from '@tailwind-refactor/plugin-api';

/**
 * Severity level for an individual rule.
 *
 * - `'off'`   — Rule is disabled. No analysis or output is produced.
 * - `'warn'`  — Rule produces informational warnings but does not fail CI.
 * - `'error'` — Rule produces errors. In CI mode (`--max-warnings=0`), causes exit code `1`.
 *
 * @example
 * // In tailwind-refactor.config.ts
 * export default {
 *   rules: {
 *     'prefer-token-values': 'error',   // Fail CI on arbitrary values
 *     'class-ordering': 'warn',          // Warn but don't fail
 *     'duplicate-class-cleanup': 'off',  // Disabled
 *   }
 * };
 */
export type RuleSeverity = 'off' | 'warn' | 'error';

/**
 * Minimum confidence threshold for including a transformation in scan results.
 *
 * - `'safe'`         — Only include 100%-certain token matches. Safest option.
 * - `'suggestion'`   — Include likely-correct heuristic matches. Good for review.
 * - `'experimental'` — Include all speculative matches. Requires human review.
 *
 * @remarks
 * The default is `'safe'`. Higher thresholds may surface more opportunities
 * at the cost of requiring more manual review before applying fixes.
 */
export type ConfidenceThreshold = Confidence;

/**
 * A built-in named rule preset shipped with tailwind-refactor.
 *
 * - `'recommended'` — Balanced ruleset suitable for most projects. Enables all common rules as warnings/errors.
 * - `'strict'`      — All rules set to `'error'`. Best for greenfield projects enforcing canonical Tailwind.
 * - `'a11y'`        — Accessibility-focused subset: color contrast normalization and typography enforcement.
 */
export type BuiltInRulePreset = 'recommended' | 'strict' | 'a11y';

/**
 * A rule preset identifier — either a built-in preset name or an arbitrary
 * npm package/path string for community presets.
 *
 * @remarks
 * Uses the `BuiltInRulePreset | (string & {})` pattern to preserve IDE
 * autocomplete for built-in names while still allowing arbitrary strings
 * for third-party community presets.
 *
 * @example
 * // Built-in preset — IDE will suggest 'recommended', 'strict', 'a11y'
 * extends: 'recommended'
 *
 * // Community preset from npm
 * extends: '@company/tailwind-refactor-preset'
 *
 * // Multiple presets merged in order (later presets override earlier ones)
 * extends: ['recommended', '@company/tailwind-refactor-preset']
 */
export type RulePreset = BuiltInRulePreset | (string & {});

/**
 * The full configuration shape for `tailwind-refactor.config.ts`.
 *
 * @remarks
 * All fields are optional. When a field is omitted, its default value from
 * `packages/config/src/defaults.ts` is used.
 *
 * The config file can be TypeScript (`.ts`) or JavaScript (`.js`, `.mjs`, `.cjs`).
 * It is loaded via dynamic `import()` and must use a default export.
 *
 * @example
 * // tailwind-refactor.config.ts
 * import type { TailwindRefactorConfig } from '@tailwind-refactor/config';
 *
 * export default {
 *   extends: ['recommended', '@company/preset'],
 *   rules: {
 *     'prefer-token-values': 'error',
 *     'class-ordering': 'warn',
 *   },
 *   ignore: ['src\/generated\/**', '**\/*.stories.tsx'],
 *   confidenceThreshold: 'safe',
 *   tailwindVersion: 'v3',
 * } satisfies TailwindRefactorConfig;
 */
export interface TailwindRefactorConfig extends BaseRefactorConfig {
  /** Array of active third-party plugins. */
  plugins?: TailwindRefactorPlugin[];
  /** File scanner concurrency / thread count for parallel mode. */
  parallelThreads?: number;

  /**
   * One or more rule presets to extend. Presets are merged left-to-right,
   * with later presets overriding earlier ones. Explicit `rules` always take
   * the highest precedence.
   *
   * @example
   * extends: 'recommended'
   * extends: ['recommended', '@company/preset']
   */
  extends?: RulePreset | RulePreset[];
}
