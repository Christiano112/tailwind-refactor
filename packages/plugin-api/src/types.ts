/**
 * @fileoverview Public Plugin API contracts for the tailwind-refactor ecosystem.
 *
 * @note Imports from `@tailwind-refactor/config` and `@tailwind-refactor/core` are
 * done with `import type` to avoid circular runtime dependencies — these packages
 * depend on plugin-api, so we only import their types, not their runtime values.
 *
 * This module defines the **stable, versioned public surface** shared between:
 * - The CLI (`tailwind-refactor`)
 * - The ESLint plugin (`eslint-plugin-tailwind-refactor`)
 * - The VS Code extension (`tailwind-refactor-vscode`)
 * - The GitHub Action
 * - All third-party plugin authors
 *
 * @remarks
 * Once published as v1.0.0, **no type in this file should be renamed or removed
 * without a major version bump**. These types form the ecosystem contract.
 *
 * @module @tailwind-refactor/plugin-api
 */

/**
 * Minimal structural shape of the config accepted by PluginContext.
 * The full type is `TailwindRefactorConfig` from `@tailwind-refactor/config`.
 * Defined inline here to avoid a circular dependency (config depends on plugin-api).
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
 * Severity level for a {@link Diagnostic}.
 *
 * - `'info'`    — Informational. No action required. Used for skipped dynamic values.
 * - `'warning'` — Potential issue. Transformation suggested but not enforced.
 * - `'error'`   — Definitive violation. Transformation is safe and should be applied.
 */
export type Severity = 'info' | 'warning' | 'error';

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
 * Workspace abstraction for reading, writing, and querying source files.
 *
 * @remarks
 * Decouples the pipeline from the Node.js file system so that:
 * - Unit tests can use {@link MemoryWorkspace} (zero disk I/O).
 * - The browser REPL (`apps/playground`) can use an in-memory workspace.
 * - Future remote or virtual filesystem implementations can plug in.
 *
 * @example
 * // Production
 * const ws = new FileSystemWorkspace('/my-project');
 *
 * // Testing
 * const ws = new MemoryWorkspace({ 'src/Button.tsx': '<div className="h-10" />' });
 *
 * @see {@link FileSystemWorkspace}
 * @see {@link MemoryWorkspace}
 */
export interface Workspace {
  /**
   * Reads the UTF-8 text content of a file.
   * @param filePath - Absolute or workspace-relative file path.
   * @returns The full source code string.
   */
  readFile(filePath: string): Promise<string>;

  /**
   * Writes UTF-8 text content to a file. Creates the file if it does not exist.
   * @param filePath - Absolute or workspace-relative file path.
   * @param content  - The source code string to write.
   */
  writeFile(filePath: string, content: string): Promise<void>;

  /**
   * Checks whether a file exists in the workspace.
   * @param filePath - Absolute or workspace-relative file path.
   * @returns `true` if the file exists.
   */
  exists(filePath: string): Promise<boolean>;

  /**
   * Returns a list of file paths matching a glob pattern.
   * @param pattern  - Glob pattern (e.g. `'src/**\/*.tsx'`).
   * @param options  - Optional ignore patterns (e.g. `{ ignore: ['**\/node_modules\/**'] }`).
   * @returns Array of matched file paths.
   */
  glob(pattern: string, options?: { ignore?: string[] }): Promise<string[]>;
}

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
   * - `string[]`: each string is treated as a glob suffix (supports `*` and `**`).
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
  config: PluginConfigShape;
  /** Logger instance for emitting structured plugin log messages. */
  logger: PluginLogger;
}

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
