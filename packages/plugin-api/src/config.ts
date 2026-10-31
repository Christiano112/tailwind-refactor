/**
 * Configuration types for the plugin-api public surface.
 *
 * @remarks
 * `BaseRefactorConfig` is intentionally minimal — it avoids a circular dep
 * with `@tailwind-refactor/config` (which depends on plugin-api at runtime).
 */

import type { Confidence } from './transformation.js';

/**
 * Minimal structural shape of the config accepted by PluginContext.
 * The full type is `TailwindRefactorConfig` from `@tailwind-refactor/config`.
 * Defined here to avoid a circular dependency (config depends on plugin-api).
 */
export interface BaseRefactorConfig {
  /** Rule severity overrides. Key is the rule ID, value is 'off', 'warn', or 'error'. */
  rules?: Record<string, 'off' | 'warn' | 'error'>;
  /** Glob patterns of files/directories to exclude from scanning. */
  ignore?: string[];
  /**
   * Minimum confidence level required for a transformation to be applied.
   * @default 'safe'
   */
  confidenceThreshold?: Confidence;
  /** Tailwind CSS version. 'auto' detects from package.json. @default 'auto' */
  tailwindVersion?: 'v3' | 'v4' | 'auto';
  /** Path or paths to other config files to merge (shallow). */
  extends?: string | string[];
}

/**
 * @deprecated Use {@link BaseRefactorConfig} instead.
 * Kept for backwards compatibility with early adopters of the plugin-api.
 */
export type PluginConfigShape = BaseRefactorConfig;
