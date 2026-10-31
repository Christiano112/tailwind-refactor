/**
 * Rule contract types for the plugin-api public surface.
 */

import type { BaseRefactorConfig } from './config.js';
import type { Transformation } from './transformation.js';

/**
 * Minimal structural shape of a class candidate for use in plugin rules.
 * The full type is `TailwindCandidate` from `@tailwind-refactor/core`.
 */
export interface PluginCandidateShape {
  value: string;
  location: { start: number; end: number };
  filePath?: string;
  isStatic?: boolean;
}

/**
 * Minimal structural shape of a parsed Tailwind class for use in plugin rules.
 * The full type is `TailwindClass` from `@tailwind-refactor/core`.
 */
export interface PluginClassShape {
  raw: string;
  variants: string[];
  utility: string;
  value?: string;
  important?: boolean;
  isArbitrary?: boolean;
}

export type ResolutionResult =
  | { found: true; canonical: string; cssValue: string }
  | { found: false; reason: 'unknown-utility' | 'no-equivalent' };

/**
 * Minimal structural shape of the rule context for plugin rules.
 * The full type is `RuleContext` from `@tailwind-refactor/core`.
 */
export interface PluginRuleContext {
  resolver: {
    resolve?(utility: string, rawValue: string): ResolutionResult;
    findEquivalent(utility: string, rawValue: string): string | null;
    sortClasses?(tokens: string[]): string[];
    deduplicateClasses?(tokens: string[]): string[];
  };
  filePath?: string;
}

/**
 * Minimal logger interface exposed to plugins via `PluginContext`.
 *
 * @remarks
 * Plugins should use this logger rather than `console.*` directly so that
 * log output is correctly routed through the CLI's verbosity system.
 */
export interface PluginLogger {
  /** Emit an informational message. */
  info(msg: string): void;
  /** Emit a warning message. */
  warn(msg: string): void;
  /** Emit an error message. */
  error(msg: string): void;
}

/**
 * Context object injected into a plugin's `setup()` lifecycle hook.
 *
 * @remarks
 * Provides plugins with access to workspace context information at initialization time,
 * before any scan or fix operation begins.
 *
 * @see {@link TailwindRefactorPlugin}
 */
export interface PluginContext {
  /** Absolute path of the project root directory being refactored. */
  cwd: string;
  /** The resolved configuration for the current workspace. */
  config: BaseRefactorConfig;
  /** Logger instance for emitting structured plugin log messages. */
  logger: PluginLogger;
}

/**
 * Minimal rule contract for rules contributed by third-party plugins.
 *
 * @remarks
 * Plugin-contributed rules must implement this interface to be accepted
 * by the rule registry. It mirrors the internal `Rule` interface from
 * `@tailwind-refactor/rules` but lives in the public API surface.
 */
export interface PluginRule {
  /** Unique rule identifier (e.g. `'company/no-deprecated-tokens'`). */
  name: string;
  /**
   * Restricts this rule to files matching the given pattern.
   * - `RegExp`: tested against the absolute file path.
   * - `string[]`: each string is treated as a glob pattern (supports `*` and `**`).
   * - When omitted the rule runs on **all** files.
   *
   * @example
   * filePattern: /\.vue$/
   * filePattern: ['**\/*.vue', '**\/*.svelte']
   */
  filePattern?: RegExp | string[];
  /**
   * Analyzes a single class candidate and returns a transformation if applicable.
   * @returns A `Transformation` if the rule triggers, or `null` if it does not.
   */
  analyze(candidate: PluginCandidateShape, parsed: PluginClassShape, context: PluginRuleContext): Transformation | null;
  /**
   * Optional refinement hook called **only** when `analyze()` returns non-null.
   * Plugins can use this to override the replacement string, adjust confidence,
   * or add metadata to the transformation before it is applied.
   *
   * @param transformation - The transformation produced by `analyze()`.
   * @param context        - The rule context (resolver + filePath).
   * @returns The (potentially modified) transformation to apply.
   */
  fix?(transformation: Transformation, context: PluginRuleContext): Transformation;
}
