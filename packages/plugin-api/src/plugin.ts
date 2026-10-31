/**
 * Plugin contract types for the plugin-api public surface.
 */

import type { BaseRefactorConfig } from './config.js';
import type { FixResult, ScanResult } from './transformation.js';
import type { PluginContext, PluginLogger, PluginRule } from './rule.js';

export type { PluginContext, PluginLogger };

/**
 * The versioned v1.0 Plugin Specification for third-party `tailwind-refactor` plugins.
 *
 * @remarks
 * Plugins are loaded via the `plugins` array in `tailwind-refactor.config.ts`.
 * They can contribute:
 * - Custom **rules** (e.g. company design system token enforcement)
 * - Custom **resolvers** (e.g. shadcn/ui, daisyUI, tailwindcss-animate mappings)
 * - Custom **reporters** (e.g. Slack webhook, Datadog metric emitter)
 *
 * The `apiVersion` field enables the runtime to detect and handle version
 * incompatibilities across major releases without breaking existing plugins.
 *
 * @example
 * // packages/company-preset/src/index.ts
 * import type { TailwindRefactorPlugin } from '@tailwind-refactor/plugin-api';
 *
 * const plugin: TailwindRefactorPlugin = {
 *   name: '@company/tailwind-design-system',
 *   apiVersion: '1',
 *   setup(ctx) {
 *     ctx.logger.info(`Loaded company design system plugin for ${ctx.cwd}`);
 *   },
 *   afterScan(result) {
 *     console.log(`Scan found ${result.totalTransformations} issues.`);
 *   },
 * };
 *
 * export default plugin;
 */
export interface TailwindRefactorPlugin {
  /** Unique plugin identifier. Should be the npm package name if published. */
  name: string;
  /**
   * Plugin specification version. Must be `'1'` for v1.0-compatible plugins.
   * Future major releases will introduce `'2'`, `'3'`, etc.
   */
  apiVersion: '1';

  /**
   * Called once during plugin initialization, before any scan or fix begins.
   * Use to validate configuration, register resources, or perform async setup.
   * @param context - Workspace context including config and logger.
   */
  setup?(context: PluginContext): void | Promise<void>;

  /** Called immediately before a scan operation begins. */
  beforeScan?(): void;

  /**
   * Called after every scan operation completes successfully.
   * @param result - The complete scan result with all transformations and diagnostics.
   */
  afterScan?(result: ScanResult): void;

  /** Called immediately before a fix operation begins. */
  beforeFix?(): void;

  /**
   * Called after every fix operation completes successfully.
   * @param result - The complete fix result with counts of applied changes.
   */
  afterFix?(result: FixResult): void;

  /** Additional rule definitions contributed by this plugin. */
  rules?: PluginRule[];

  /** Additional resolver implementations contributed by this plugin. */
  resolvers?: Array<{ findEquivalent(utility: string, rawValue: string): string | null }>;

  /** Additional reporter implementations contributed by this plugin. */
  reporters?: Array<{ name: string; format(result: ScanResult): string }>;
}
