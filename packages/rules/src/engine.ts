import { DEFAULT_CONFIG, type TailwindRefactorConfig } from '@tailwind-refactor/config';
import {
  applyFilePatches,
  DiskCache,
  type FileChange,
  parseTailwindClass,
  type Transformation,
} from '@tailwind-refactor/core';
import { type IgnoreContext, InlineIgnoreMatcher } from '@tailwind-refactor/ignore';
import { type DebugContextCollector, ErrorCode, Logger, ToolError } from '@tailwind-refactor/logger';
import { type DynamicCandidate, SourceParser } from '@tailwind-refactor/parser';
import { createResolverForWorkspace, type TailwindResolver } from '@tailwind-refactor/resolver';
import { PreferTokenValuesRule } from './prefer-token-values.js';
import type { Rule } from './rule.interface.js';
import { ArbitraryValueNormalizationRule } from './rules/arbitrary-value-normalization.js';
import { ClassOrderingRule } from './rules/class-ordering.js';
import { ColorNormalizationRule } from './rules/color-normalization.js';
import { DuplicateClassCleanupRule } from './rules/duplicate-class-cleanup.js';
import { RadiusNormalizationRule } from './rules/radius-normalization.js';
import { TypographyNormalizationRule } from './rules/typography-normalization.js';
import { UnsafeArbitraryValuesRule } from './rules/unsafe-arbitrary-values.js';

/**
 * The central analysis and patching engine for tailwind-refactor.
 *
 * @description
 * `RefactorEngine` coordinates all three analysis phases for a single source file:
 *
 * **Phase 1 — Parse**: Delegates to `SourceParser` to traverse the TypeScript/JSX AST
 * and extract all static `TailwindCandidate` class strings with their byte offset locations.
 * Dynamic (interpolated) values are collected separately as `DynamicCandidate`s.
 *
 * **Phase 2 — Evaluate**: Each candidate is run through every enabled `Rule`.
 * If a rule's `analyze()` returns a `Transformation`, it is collected. Rules are
 * isolated from each other and cannot influence one another's output.
 *
 * **Phase 3 — Patch**: `patchCode()` takes the collected transformations,
 * filters for safety (`confidence === 'safe'` and valid `location`), resolves
 * overlapping ranges by preferring smaller-span replacements, and delegates to
 * `applyFilePatches()` for the actual string surgery.
 *
 * @remarks
 * **Rule isolation contract**: Rules must only depend on `RuleContext`, never on
 * parser internals or file system APIs. This invariant makes rules testable in
 * isolation and safe to run inside the `PluginSandbox` VM context.
 *
 * **Thread safety**: `RefactorEngine` instances are not shared across threads.
 * Each `worker_thread` in `ParallelFileScanner` creates its own instance.
 *
 * @example
 * // Basic engine usage
 * const engine = new RefactorEngine();
 * const transformations = engine.analyzeCode('<div className="h-[40px]" />', 'Button.tsx');
 * // → [{ rule: 'prefer-token-values', original: 'h-[40px]', replacement: 'h-10', ... }]
 *
 * @example
 * // Custom config + resolver
 * const engine = new RefactorEngine({
 *   resolver: new TailwindV4Resolver(myV4ThemeVars),
 *   config: { rules: { 'class-ordering': 'off' }, confidenceThreshold: 'suggestion' },
 * });
 *
 * @see {@link SourceParser}
 * @see {@link Rule}
 * @see {@link applyFilePatches}
 * @see {@link PluginSandbox}
 */
export class RefactorEngine {
  /** The AST parser for extracting class candidates from source code. */
  private parser: SourceParser;
  /** The active token resolver (v3 or v4) for utility-to-token lookups. */
  private resolver: TailwindResolver;
  /** All enabled rule instances to run on each candidate. */
  private rules: Rule[];
  /** The resolved configuration for this engine instance. */
  private config: TailwindRefactorConfig;
  /** Optional ignore context for file-level and inline ignore directives. */
  private ignoreContext?: IgnoreContext;
  /** Logger for emitting rule failure warnings. */
  private logger: Logger;
  /** Optional debug context collector for telemetry and test instrumentation. */
  private collector?: DebugContextCollector;
  private diskCache?: DiskCache;
  private noCache: boolean;

  /**
   * Creates a new `RefactorEngine` instance.
   *
   * @param options - Optional overrides for all engine dependencies.
   *   If an option is omitted, a default implementation is used.
   * @param options.parser       - Custom `SourceParser` instance.
   * @param options.resolver     - Custom `TailwindResolver` (e.g. `TailwindV4Resolver`).
   * @param options.rules        - Custom rule set. Overrides the full built-in registry.
   * @param options.config       - The resolved `TailwindRefactorConfig`.
   * @param options.ignoreContext- Pre-built ignore context for inline + file ignore directives.
   * @param options.logger       - Logger level override.
   * @param options.collector    - Debug context collector for test instrumentation.
   * @param options.noCache      - Option to bypass disk caching.
   * @param options.cwd          - Working directory root for disk cache.
   */
  constructor(options?: {
    parser?: SourceParser;
    resolver?: TailwindResolver;
    rules?: Rule[];
    config?: TailwindRefactorConfig;
    ignoreContext?: IgnoreContext;
    logger?: Logger;
    collector?: DebugContextCollector;
    noCache?: boolean;
    cwd?: string;
  }) {
    this.logger = options?.logger ?? new Logger('normal');
    this.collector = options?.collector;
    this.parser = options?.parser ?? new SourceParser({ logger: this.logger });
    this.resolver = options?.resolver ?? createResolverForWorkspace(process.cwd());
    this.config = options?.config ?? DEFAULT_CONFIG;
    this.ignoreContext = options?.ignoreContext;
    this.noCache = options?.noCache ?? false;

    if (!this.noCache) {
      this.diskCache = new DiskCache(options?.cwd ?? process.cwd());
    }

    const allRules: Rule[] = options?.rules ?? [
      new PreferTokenValuesRule(),
      new ArbitraryValueNormalizationRule(),
      new ColorNormalizationRule(),
      new TypographyNormalizationRule(),
      new RadiusNormalizationRule(),
      new DuplicateClassCleanupRule(),
      new ClassOrderingRule(),
      new UnsafeArbitraryValuesRule(),
    ];

    const configuredRules = this.config.rules || {};
    this.rules = allRules.filter((rule) => configuredRules[rule.name] !== 'off');
  }

  /**
   * Analyzes a source file and returns the flat list of proposed transformations.
   *
   * @remarks
   * This is the simpler of the two analysis methods. It returns only transformations,
   * discarding information about dynamic candidates. Use {@link analyzeCodeWithAnalysis}
   * if you also need the list of skipped dynamic (interpolated) values.
   *
   * @param code     - The full UTF-8 source code string to analyze.
   * @param filePath - POSIX-normalized path to the source file (used for error reporting and ignore matching).
   * @returns An array of proposed {@link Transformation}s. Empty if no issues were found.
   *
   * @example
   * const transformations = engine.analyzeCode('<div className="h-[40px]" />', 'Button.tsx');
   */
  analyzeCode(code: string, filePath = 'file.tsx'): Transformation[] {
    const result = this.analyzeCodeWithAnalysis(code, filePath);
    return result.transformations;
  }

  /**
   * Analyzes a source file and returns both transformations and dynamic candidate info.
   *
   * @description
   * The full analysis pipeline:
   * 1. Checks if the file is file-level-ignored via `ignoreContext`.
   * 2. Parses inline `// tailwind-refactor-ignore` directives.
   * 3. Delegates AST traversal to `SourceParser.parseCodeWithAnalysis()`.
   * 4. For each safe candidate, runs all enabled rules sequentially.
   * 5. Filters each result against the configured `confidenceThreshold`.
   * 6. Catches and logs any rule that throws (non-fatal; rule is skipped for this candidate).
   *
   * @param code     - The full UTF-8 source code string to analyze.
   * @param filePath - POSIX-normalized path to the source file.
   * @returns An object with:
   *   - `transformations`: All proposed class replacements.
   *   - `dynamicCandidates`: All class expressions that were skipped because
   *     they contain runtime-interpolated values that can't be statically resolved.
   *
   * @example
   * const { transformations, dynamicCandidates } = engine.analyzeCodeWithAnalysis(code, 'Button.tsx');
   * console.log(`Found ${dynamicCandidates.length} dynamic values that were skipped.`);
   */
  analyzeCodeWithAnalysis(
    code: string,
    filePath = 'file.tsx'
  ): { transformations: Transformation[]; dynamicCandidates: DynamicCandidate[] } {
    if (this.ignoreContext && this.ignoreContext.isFileIgnored(filePath)) {
      if (this.collector) this.collector.recordFileIgnored();
      return { transformations: [], dynamicCandidates: [] };
    }

    if (this.collector) this.collector.recordFileScanned();

    // Fast pre-filter: skip AST parsing if file contains no class attributes or helper keywords
    if (!/class|className|classNames|cva|cn|clsx|tw|style/i.test(code)) {
      return { transformations: [], dynamicCandidates: [] };
    }

    if (!this.noCache && this.diskCache) {
      const contentHash = DiskCache.hashContent(code);
      const configHash = DiskCache.hashContent(JSON.stringify(this.config));
      const cached = this.diskCache.get(filePath, contentHash, configHash);
      if (cached) {
        return { transformations: cached, dynamicCandidates: [] };
      }
    }

    const inlineMatcher = new InlineIgnoreMatcher(InlineIgnoreMatcher.parseDirectivesFromText(code));
    const parseResult = this.parser.parseCodeWithAnalysis(code, filePath);

    if (this.collector) this.collector.recordClassesFound(parseResult.safeCandidates.length);

    const transformations: Transformation[] = [];

    const context = {
      resolver: this.resolver,
      filePath,
    };

    const stringCandidates =
      parseResult.stringCandidates && parseResult.stringCandidates.length > 0
        ? parseResult.stringCandidates
        : parseResult.safeCandidates.filter((c) => c.value.includes(' '));

    const tokenCandidates =
      parseResult.tokenCandidates && parseResult.tokenCandidates.length > 0
        ? parseResult.tokenCandidates
        : parseResult.safeCandidates.filter((c) => !c.value.includes(' '));

    for (const rule of this.rules) {
      if (rule.filePattern && !this.matchesFilePattern(filePath, rule.filePattern)) {
        continue;
      }

      const candidates = rule.granularity === 'string' ? stringCandidates : tokenCandidates;

      for (const candidate of candidates) {
        const parsed = parseTailwindClass(candidate.value);
        if (!parsed) continue;

        if (inlineMatcher.isTransformationIgnored(candidate.location, rule.name, code)) {
          continue;
        }

        try {
          let transformation: Transformation | null = rule.analyze(candidate, parsed, context);
          if (transformation && typeof rule.fix === 'function') {
            transformation = rule.fix(transformation, context);
          }

          if (transformation) {
            const thresholdOrder: Record<string, number> = {
              safe: 0,
              suggestion: 1,
              experimental: 2,
              uncertain: 2,
            };
            const threshold = this.config.confidenceThreshold ?? 'safe';
            if ((thresholdOrder[transformation.confidence] ?? 99) > (thresholdOrder[threshold] ?? 0)) {
              continue;
            }
            const isDuplicate = transformations.some(
              (t) =>
                t.location?.start === transformation.location?.start &&
                t.location?.end === transformation.location?.end &&
                t.replacement === transformation.replacement
            );
            if (!isDuplicate) {
              if (this.collector) this.collector.recordTransformation(rule.name);
              transformations.push(transformation);
            }
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          const toolErr = new ToolError({
            code: ErrorCode.RULE_FAILED,
            message: `Rule '${rule.name}' failed during analysis: ${errMsg}`,
            severity: 'warning',
            file: filePath,
            suggestion: 'Report this rule execution issue or disable rule in configuration',
            cause: err,
          });
          this.logger.warn(toolErr);
          if (this.collector) this.collector.recordError(toolErr);
        }
      }
    }

    if (!this.noCache && this.diskCache) {
      const contentHash = DiskCache.hashContent(code);
      const configHash = DiskCache.hashContent(JSON.stringify(this.config));
      this.diskCache.set(filePath, contentHash, configHash, transformations);
    }

    return { transformations, dynamicCandidates: parseResult.dynamicCandidates };
  }

  /**
   * Applies a set of transformations to source code and returns the patched string.
   *
   * @description
   * The patching pipeline:
   * 1. **Safety filter**: Only transformations with `confidence === 'safe'` and
   *    a valid `location` are considered.
   * 2. **Collision resolution**: Transformations are sorted by start offset.
   *    When two ranges overlap (e.g. a token-level and a string-level replacement),
   *    the **smaller span** wins (more surgical, less destructive).
   * 3. **Non-overlapping selection**: A greedy pass selects transformations that
   *    do not overlap with any already-selected transformation.
   * 4. **Patch application**: Delegates to `applyFilePatches()` which applies the
   *    replacements in descending offset order to avoid index drift.
   *
   * @param code            - The original source code string (unmodified).
   * @param transformations - The full list of proposed transformations from `analyzeCode()`.
   * @returns The fully patched source code string. Returns `code` unchanged if no
   *          safe, non-overlapping transformations are available.
   *
   * @example
   * const transformations = engine.analyzeCode(code, 'Button.tsx');
   * const patched = engine.patchCode(code, transformations);
   * writeFileSync('Button.tsx', patched, 'utf-8');
   *
   * @see {@link applyFilePatches}
   */
  patchCode(code: string, transformations: Transformation[]): string {
    const thresholdOrder: Record<string, number> = {
      safe: 0,
      suggestion: 1,
      experimental: 2,
      uncertain: 2,
    };
    const threshold = this.config.confidenceThreshold ?? 'safe';
    const valid = transformations.filter(
      (t) => t.location && (thresholdOrder[t.confidence] ?? 99) <= (thresholdOrder[threshold] ?? 0)
    );

    // Separate string-level candidates (contains spaces) from token-level candidates
    const stringTransforms = valid.filter((t) => t.original.includes(' '));
    const tokenTransforms = valid.filter((t) => !t.original.includes(' '));

    const mergedStringTransforms: Transformation[] = [];
    const usedTokenTransforms = new Set<Transformation>();

    for (const st of stringTransforms) {
      const sStart = st.location!.start;
      const sEnd = st.location!.end;

      // Find inner token transformations within this string literal
      const innerTokens = tokenTransforms.filter((tt) => tt.location!.start >= sStart && tt.location!.end <= sEnd);

      if (innerTokens.length > 0) {
        // Apply token replacements from right to left to maintain offset alignment
        innerTokens.sort((a, b) => b.location!.start - a.location!.start);
        let updatedString = st.original;

        for (const tt of innerTokens) {
          const relStart = tt.location!.start - sStart;
          const relEnd = tt.location!.end - sStart;
          const origSlice = updatedString.slice(relStart, relEnd);
          if (origSlice === tt.original) {
            updatedString = updatedString.slice(0, relStart) + tt.replacement + updatedString.slice(relEnd);
            usedTokenTransforms.add(tt);
          }
        }

        // Deduplicate and sort the tokens in a single unified pass
        const res = this.resolver as {
          deduplicateClasses?: (t: string[]) => string[];
          sortClasses?: (t: string[]) => string[];
        };
        const tokens = updatedString.split(/\s+/).filter(Boolean);
        const deduped =
          typeof res.deduplicateClasses === 'function' ? res.deduplicateClasses(tokens) : Array.from(new Set(tokens));
        const sorted = typeof res.sortClasses === 'function' ? res.sortClasses(deduped) : deduped;
        const finalReplacement = sorted.join(' ');

        mergedStringTransforms.push({
          ...st,
          replacement: finalReplacement,
        });
      } else {
        mergedStringTransforms.push(st);
      }
    }

    const remainingTokenTransforms = tokenTransforms.filter((tt) => !usedTokenTransforms.has(tt));
    const allCandidates = [...mergedStringTransforms, ...remainingTokenTransforms];

    allCandidates.sort((a, b) => {
      const spanA = a.location!.end - a.location!.start;
      const spanB = b.location!.end - b.location!.start;
      if (spanA !== spanB) {
        return spanA - spanB;
      }
      return a.location!.start - b.location!.start;
    });

    const nonOverlapping: Transformation[] = [];
    const occupiedRanges: { start: number; end: number }[] = [];

    for (const t of allCandidates) {
      const start = t.location!.start;
      const end = t.location!.end;

      const overlaps = occupiedRanges.some(
        (r) =>
          (start >= r.start && start < r.end) || (end > r.start && end <= r.end) || (start <= r.start && end >= r.end)
      );

      if (!overlaps) {
        nonOverlapping.push(t);
        occupiedRanges.push({ start, end });
      }
    }

    const changes: FileChange[] = nonOverlapping.map((t) => ({
      file: t.file ?? 'file.tsx',
      start: t.location!.start,
      end: t.location!.end,
      original: t.original,
      replacement: t.replacement,
    }));

    return applyFilePatches(code, changes);
  }

  /**
   * Helper to check if a file path matches a rule's `filePattern` constraint.
   * @param filePath - Path to check.
   * @param pattern - RegExp or glob array.
   */
  private matchesFilePattern(filePath: string, pattern?: RegExp | string[]): boolean {
    if (!pattern) return true;
    if (pattern instanceof RegExp) return pattern.test(filePath);
    return pattern.some((p) => {
      const normalized = p.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
      return new RegExp(normalized).test(filePath);
    });
  }
}
