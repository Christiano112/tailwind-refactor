import { loadConfig } from '@tailwind-refactor/config';
import { createIgnoreContext, FileScanner } from '@tailwind-refactor/ignore';
import type { FixResult, ScanResult, Transformation } from '@tailwind-refactor/plugin-api';
import { createResolverForWorkspace } from '@tailwind-refactor/resolver';
import { ParallelFileScanner, RefactorEngine } from '@tailwind-refactor/rules';
import { readFileSync, writeFileSync } from 'fs';
import { relative, resolve } from 'path';

/**
 * Options for the programmatic Node.js `scan()` and `fix()` API functions.
 *
 * @remarks
 * These options map directly to the CLI flags:
 * - `dir`            → `--dir` / positional argument
 * - `configPath`     → `--config`
 * - `ignorePattern`  → `--ignore`
 * - `parallel`       → `--parallel`
 * - `dryRun`         → `--dry-run`
 *
 * @see {@link scan}
 * @see {@link fix}
 */
export interface RefactorNodeOptions {
  /**
   * Root directory to scan, relative to `process.cwd()`.
   * @default `'src'`
   */
  dir?: string;
  /**
   * Explicit path to a `tailwind-refactor.config.ts` file.
   * If omitted, the config is auto-discovered by walking up from `dir`.
   */
  configPath?: string;
  /**
   * Additional glob pattern for files to exclude (e.g. `'**\/generated\/**'`).
   * Merged on top of `config.ignore` and default ignores.
   */
  ignorePattern?: string;
  /**
   * If `true`, distributes file analysis across Node.js `worker_threads`
   * using `ParallelFileScanner`. Recommended for projects with 1,000+ files.
   * @default `false`
   */
  parallel?: boolean;
  /**
   * If `true` (fix mode only), computes all transformations but does not
   * write any files to disk. The returned `FixResult.isDryRun` will be `true`.
   * @default `false`
   */
  dryRun?: boolean;
}

/**
 * Scans a directory for Tailwind CSS refactoring opportunities.
 *
 * @description
 * This is the **primary entry point for the Node.js API**. It is the function
 * exposed as `import { scan } from 'tailwind-refactor'` in the public SDK.
 *
 * The scan process:
 * 1. Resolves the configuration from `tailwind-refactor.config.ts`.
 * 2. Builds the ignore context (`.tailwindignore` + config ignores + CLI ignores).
 * 3. Discovers all source files in `options.dir`.
 * 4. Runs rule evaluation — either serially (`RefactorEngine`) or in parallel
 *    (`ParallelFileScanner`, when `options.parallel` is `true`).
 * 5. Returns a complete {@link ScanResult} with all transformations grouped by file.
 *
 * @remarks
 * The scan is **read-only** — it never modifies any files on disk.
 * Use {@link fix} to apply transformations.
 *
 * @param options - Scan configuration options. See {@link RefactorNodeOptions}.
 * @returns A {@link ScanResult} containing all proposed transformations and diagnostics.
 *
 * @example
 * import { scan } from 'tailwind-refactor';
 *
 * const result = await scan({ dir: 'src' });
 *
 * for (const { file, count } of result.fileReports) {
 *   console.log(`${file}: ${count} issues`);
 * }
 * console.log(`Total: ${result.totalTransformations} in ${result.durationMs}ms`);
 *
 * @example
 * // Parallel scan for large monorepos
 * const result = await scan({ dir: 'packages', parallel: true });
 *
 * @see {@link fix}
 * @see {@link ScanResult}
 */
export async function scan(options: RefactorNodeOptions = {}): Promise<ScanResult> {
  const startTime = Date.now();
  const targetDir = resolve(process.cwd(), options.dir || 'src');
  const config = await loadConfig(options.configPath, targetDir);

  const ignoreContext = createIgnoreContext({
    cwd: targetDir,
    cliIgnores: options.ignorePattern ? [options.ignorePattern] : [],
    configIgnores: config.ignore,
  });

  const files = FileScanner.findSourceFiles(targetDir, ignoreContext);
  const resolver = createResolverForWorkspace(targetDir);
  const engine = new RefactorEngine({ resolver, config, ignoreContext });

  const transformations: Transformation[] = [];
  const fileReports: { file: string; count: number; items: Transformation[] }[] = [];

  if (options.parallel && files.length > 1) {
    const batchResult = await ParallelFileScanner.analyzeInParallel({ files, targetDir, config });
    for (const report of batchResult.fileReports) {
      transformations.push(...(report.transformations as Transformation[]));
      fileReports.push({
        file: report.file,
        count: report.transformations.length,
        items: report.transformations as Transformation[],
      });
    }
  } else {
    for (const filePath of files) {
      const code = readFileSync(filePath, 'utf-8');
      const analysis = engine.analyzeCodeWithAnalysis(code, filePath);

      if (analysis.transformations.length > 0) {
        transformations.push(...(analysis.transformations as Transformation[]));
        fileReports.push({
          file: relative(process.cwd(), filePath),
          count: analysis.transformations.length,
          items: analysis.transformations as Transformation[],
        });
      }
    }
  }

  return {
    filesScanned: files.length,
    filesIgnored: 0,
    totalTransformations: transformations.length,
    transformations,
    diagnostics: [],
    fileReports,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Scans a directory and applies all proposed transformations to source files.
 *
 * @description
 * This is the **fix entry point for the Node.js API**. It is exposed as
 * `import { fix } from 'tailwind-refactor'` in the public SDK.
 *
 * The fix process is identical to `scan()` for rule evaluation, but after
 * computing transformations it additionally:
 * 1. Runs `engine.patchCode()` to produce the modified source string.
 * 2. Writes the patched content back to disk via `writeFileSync()`.
 *
 * When `options.dryRun` is `true`, step 2 is skipped. The returned
 * `FixResult.isDryRun` will be `true` and the counts will reflect what
 * *would* have been applied.
 *
 * @remarks
 * Fix always operates in **confidence-filtered** mode. Only transformations
 * whose confidence meets the configured `confidenceThreshold` are applied.
 *
 * @param options - Fix configuration options. See {@link RefactorNodeOptions}.
 * @returns A {@link FixResult} summarizing how many files and transformations were applied.
 *
 * @example
 * import { fix } from 'tailwind-refactor';
 *
 * // Preview what would change (dry-run)
 * const preview = await fix({ dir: 'src', dryRun: true });
 * console.log(`Would fix ${preview.totalTransformationsApplied} issues.`);
 *
 * // Apply all safe transformations
 * const result = await fix({ dir: 'src' });
 * console.log(`Fixed ${result.filesFixed} files.`);
 *
 * @see {@link scan}
 * @see {@link FixResult}
 */
export async function fix(options: RefactorNodeOptions = {}): Promise<FixResult> {
  const startTime = Date.now();
  const targetDir = resolve(process.cwd(), options.dir || 'src');
  const config = await loadConfig(options.configPath, targetDir);

  const ignoreContext = createIgnoreContext({
    cwd: targetDir,
    cliIgnores: options.ignorePattern ? [options.ignorePattern] : [],
    configIgnores: config.ignore,
  });

  const files = FileScanner.findSourceFiles(targetDir, ignoreContext);
  const resolver = createResolverForWorkspace(targetDir);
  const engine = new RefactorEngine({ resolver, config, ignoreContext });

  let filesFixed = 0;
  let totalTransformationsApplied = 0;

  for (const filePath of files) {
    const code = readFileSync(filePath, 'utf-8');
    const analysis = engine.analyzeCode(code, filePath);

    if (analysis.length > 0) {
      if (!options.dryRun) {
        const patched = engine.patchCode(code, analysis);
        writeFileSync(filePath, patched, 'utf-8');
      }
      filesFixed++;
      totalTransformationsApplied += analysis.length;
    }
  }

  return {
    filesFixed,
    totalTransformationsApplied,
    isDryRun: !!options.dryRun,
    durationMs: Date.now() - startTime,
  };
}
