#!/usr/bin/env node
import { loadConfig } from '@tailwind-refactor/config';
import { DiskCache } from '@tailwind-refactor/core';
import { createIgnoreContext, FileScanner } from '@tailwind-refactor/ignore';
import { DebugContextCollector, Logger, type LogLevel, ToolError } from '@tailwind-refactor/logger';
import type { Transformation } from '@tailwind-refactor/plugin-api';
import { createResolverForWorkspace, generateV4ThemeCss, TailwindV4Resolver } from '@tailwind-refactor/resolver';
import { ParallelFileScanner, RefactorEngine } from '@tailwind-refactor/rules';
import { Command } from 'commander';
import { randomUUID } from 'crypto';
import { createTwoFilesPatch } from 'diff';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { relative, resolve } from 'path';
import pc from 'picocolors';
import createInterface from 'readline';
import { type FixManifestEntry, hashContent, readManifest, writeManifest } from './fix-manifest.js';
import { generateHTMLReport } from './html-report.js';
import { ProgressReporter } from './progress.js';

/**
 * Standardised CLI exit codes.
 * - 0: Clean / fix applied successfully
 * - 1: Scan found violations (use as CI gate with `|| true` to suppress)
 * - 2: Config load or validation failed
 * - 3: One or more files failed to parse
 * - 130: SIGINT / Ctrl-C received
 */
const EXIT = {
  OK: 0,
  VIOLATIONS: 1,
  CONFIG_ERROR: 2,
  PARSE_ERROR: 3,
  INTERRUPTED: 130,
} as const;

const program = new Command();

function resolveLogLevel(options: { quiet?: boolean; verbose?: boolean; debug?: boolean }): LogLevel {
  if (options.quiet) return 'silent';
  if (options.debug) return 'debug';
  if (options.verbose) return 'verbose';
  return 'normal';
}

function getResolver(targetDir: string, logger: Logger) {
  const resolver = createResolverForWorkspace(targetDir);
  const version = resolver instanceof TailwindV4Resolver ? 'v4' : 'v3';
  logger.debug(`Tailwind ${version} resolver initialized for workspace`);
  return { resolver, version };
}

async function createCLIContext(
  dir: string,
  options: {
    config?: string;
    ignore?: string;
    debug?: boolean;
    verbose?: boolean;
    quiet?: boolean;
    parallel?: boolean;
    clearCache?: boolean;
    noCache?: boolean;
  }
) {
  const level = resolveLogLevel(options);
  const logger = new Logger(level);
  const collector = new DebugContextCollector();

  const targetDir = resolve(process.cwd(), dir);
  if (options.clearCache) {
    new DiskCache(targetDir).clear();
  }
  const config = await loadConfig(options.config, targetDir);

  const ignoreContext = createIgnoreContext({
    cwd: targetDir,
    cliIgnores: options.ignore ? [options.ignore] : [],
    configIgnores: config.ignore,
  });

  const { resolver, version } = getResolver(targetDir, logger);
  const files = FileScanner.findSourceFiles(targetDir, ignoreContext);
  const engine = new RefactorEngine({
    resolver,
    config,
    ignoreContext,
    logger,
    collector,
    noCache: !!options.noCache,
    cwd: targetDir,
  });

  return { targetDir, config, ignoreContext, resolver, version, files, engine, logger, collector };
}

program
  .name('tailwind-refactor')
  .description('Tailwind CSS refactoring engine and static analysis CLI')
  .version('0.1.0');

// SCAN Command
program
  .command('scan')
  .argument('[dir]', 'Directory to scan', 'src')
  .option('-c, --config <path>', 'Explicit path to configuration file')
  .option('-i, --ignore <pattern>', 'CLI glob pattern to ignore')
  .option('-p, --parallel', 'Run scan in parallel across worker threads')
  .option('--html-report [path]', 'Generate visual HTML telemetry dashboard report')
  .option('--no-cache', 'Bypass persistent disk cache and analyze all files freshly')
  .option('--clear-cache', 'Clear persistent disk cache before running')
  .option('--debug', 'Output verbose debug information including pipeline metrics')
  .option('--verbose', 'Output detailed file-by-file progress')
  .option('-q, --quiet', 'Suppress non-error output')
  .description('Scan codebase for non-canonical Tailwind CSS usage')
  .action(
    async (
      dir: string,
      options: {
        config?: string;
        ignore?: string;
        parallel?: boolean;
        htmlReport?: string | boolean;
        noCache?: boolean;
        clearCache?: boolean;
        debug?: boolean;
        verbose?: boolean;
        quiet?: boolean;
      }
    ) => {
      try {
        const { targetDir, config, files, engine, logger } = await createCLIContext(dir, options);

        logger.info(
          pc.bold(
            pc.cyan(
              `\n🔍 Scanning Tailwind utility usage in: ${targetDir}${options.parallel ? ' (PARALLEL WORKERS)' : ''}\n`
            )
          )
        );

        logger.section('Project');
        logger.debug('TypeScript / React monorepo project detected');

        logger.section('Tailwind');
        logger.debug('V3/V4 Tailwind CSS configuration resolved');

        let fileReports: { file: string; count: number; items: Transformation[] }[] = [];
        let skippedDynamicReports: { file: string; line?: number; expression: string; reason?: string }[] = [];
        let totalTransformations = 0;

        if (options.parallel) {
          const parallelResult = await ParallelFileScanner.analyzeInParallel({
            files,
            targetDir,
            config,
            noCache: !!options.noCache,
          });
          fileReports = parallelResult.fileReports.map((r) => ({
            file: r.file,
            count: r.transformations.length,
            items: r.transformations,
          }));
          totalTransformations = parallelResult.totalTransformations;
          skippedDynamicReports = parallelResult.dynamicCandidates;
        } else {
          for (const filePath of files) {
            const code = readFileSync(filePath, 'utf-8');
            const analysis = engine.analyzeCodeWithAnalysis(code, filePath);

            if (analysis.transformations.length > 0) {
              totalTransformations += analysis.transformations.length;
              fileReports.push({
                file: relative(process.cwd(), filePath),
                count: analysis.transformations.length,
                items: analysis.transformations,
              });
            }

            for (const dyn of analysis.dynamicCandidates) {
              skippedDynamicReports.push({
                file: relative(process.cwd(), filePath),
                line: dyn.line,
                expression: dyn.expression,
                reason: dyn.reason,
              });
            }
          }
        }

        if (options.htmlReport) {
          const reportFile =
            typeof options.htmlReport === 'string' ? options.htmlReport : 'tailwind-refactor-report.html';
          const reportPath = generateHTMLReport(
            {
              targetDir,
              totalTransformations,
              fileReports,
              skippedDynamicReports,
              timestamp: new Date().toISOString(),
            },
            reportFile
          );
          logger.info(pc.bold(pc.green(`\n📊 Generated visual HTML report: ${reportPath}\n`)));
        }

        if (skippedDynamicReports.length > 0 && (options.verbose || options.debug)) {
          logger.info(pc.bold(pc.yellow('\nDynamic classes skipped:')));
          for (const item of skippedDynamicReports) {
            logger.info(`  ${pc.underline(item.file)}${item.line ? `:${item.line}` : ''}`);
            logger.info(`    ${pc.yellow(item.expression)}`);
            if (item.reason) logger.info(`    ${pc.dim(`Reason: ${item.reason}`)}`);
          }
          logger.info('');
        }

        if (totalTransformations === 0) {
          logger.info(pc.green('✨ No non-canonical Tailwind utilities found! Codebase is optimized.\n'));
          process.exitCode = EXIT.OK;
          return;
        }

        logger.info(
          pc.yellow(`Found ${totalTransformations} potential improvement(s) across ${fileReports.length} file(s):\n`)
        );

        for (const report of fileReports) {
          logger.info(pc.bold(pc.underline(report.file)));
          for (const item of report.items) {
            logger.info(
              `  ${pc.red(item.original)} ${pc.gray('->')} ${pc.green(item.replacement)} ${pc.dim(`[${item.rule}]`)}`
            );
            logger.info(`    ${pc.dim(item.reason)}`);
          }
          logger.info('');
        }
        // Exit 1 when violations are found — enables CI gate via `tailwind-refactor scan || exit_script`
        process.exitCode = EXIT.VIOLATIONS;
      } catch (err: unknown) {
        if (err instanceof ToolError) {
          const l = new Logger(resolveLogLevel(options));
          l.error(err);
          process.exitCode = EXIT.CONFIG_ERROR;
        } else {
          const message = err instanceof Error ? err.message : String(err);
          console.error(pc.bold(pc.red(`\n❌ ERROR: Unexpected CLI failure: ${message}`)));
          process.exitCode = EXIT.PARSE_ERROR;
        }
      }
    }
  );

// FIX Command
program
  .command('fix')
  .argument('[dir]', 'Directory to fix', 'src')
  .option('-c, --config <path>', 'Explicit path to configuration file')
  .option('-i, --ignore <pattern>', 'CLI glob pattern to ignore')
  .option('-p, --parallel', 'Run scan in parallel across worker threads')
  .option('--dry-run', 'Simulate changes without writing to disk')
  .option('--no-cache', 'Bypass persistent disk cache and analyze all files freshly')
  .option('--clear-cache', 'Clear persistent disk cache before running')
  .option('--debug', 'Output verbose debug information')
  .option('--verbose', 'Output detailed file-by-file progress')
  .option('-q, --quiet', 'Suppress non-error output')
  .description('Automatically transform non-canonical Tailwind utilities into canonical tokens')
  .action(
    async (
      dir: string,
      options: {
        config?: string;
        ignore?: string;
        parallel?: boolean;
        dryRun?: boolean;
        noCache?: boolean;
        clearCache?: boolean;
        debug?: boolean;
        verbose?: boolean;
        quiet?: boolean;
      }
    ) => {
      try {
        const { targetDir, files, engine, logger } = await createCLIContext(dir, options);
        const isDryRun = !!options.dryRun;

        logger.info(
          pc.bold(pc.cyan(`\n🛠️  Applying Tailwind refactorings in: ${targetDir}${isDryRun ? ' (DRY RUN)' : ''}\n`))
        );

        let totalFixed = 0;
        const progress = new ProgressReporter();
        const manifestEntries: FixManifestEntry[] = [];
        const runId = randomUUID();

        let scanned = 0;
        for (const filePath of files) {
          const rawCode = readFileSync(filePath, 'utf-8');
          const hasCRLF = rawCode.includes('\r\n');
          const code = hasCRLF ? rawCode.replace(/\r\n/g, '\n') : rawCode;

          const transformations = engine.analyzeCode(code, filePath);

          if (transformations.length > 0) {
            const patchedCode = engine.patchCode(code, transformations);
            const finalCode = hasCRLF ? patchedCode.replace(/\n/g, '\r\n') : patchedCode;
            const relPath = relative(process.cwd(), filePath);

            if (isDryRun) {
              const patch = createTwoFilesPatch(relPath, relPath, rawCode, finalCode, 'original', 'refactored');
              logger.info(pc.bold(pc.underline(relPath)));
              logger.info(patch);
            } else {
              // Record entry for undo manifest (before writing)
              manifestEntries.push({
                path: filePath,
                originalHash: hashContent(rawCode),
                patchedHash: hashContent(finalCode),
                originalContent: rawCode,
              });
              // Atomic write: write to .tmp file, then rename (single FS op)
              const tmpPath = `${filePath}.tailwind-refactor.tmp`;
              writeFileSync(tmpPath, finalCode, 'utf-8');
              renameSync(tmpPath, filePath);
              logger.info(`${pc.green('✔ Fixed')} ${relPath} (${transformations.length} change(s))`);
            }
            totalFixed += transformations.length;
          }
          progress.report(++scanned, files.length, filePath);
        }
        progress.clear();

        // Write fix manifest for undo support
        if (!isDryRun && manifestEntries.length > 0) {
          writeManifest(process.cwd(), {
            runId,
            timestamp: new Date().toISOString(),
            files: manifestEntries,
          });
        }

        if (totalFixed === 0) {
          logger.info(pc.green('✨ No files required modifications.\n'));
        } else {
          logger.info(
            pc.bold(
              pc.green(`\n🎉 Successfully ${isDryRun ? 'simulated' : 'applied'} ${totalFixed} transformation(s).\n`)
            )
          );
          if (!isDryRun) {
            logger.info(pc.dim('  Run `tailwind-refactor undo` to revert these changes.'));
          }
        }
      } catch (err: unknown) {
        if (err instanceof ToolError) {
          const l = new Logger(resolveLogLevel(options));
          l.error(err);
          process.exitCode = EXIT.CONFIG_ERROR;
        } else {
          const message = err instanceof Error ? err.message : String(err);
          console.error(pc.bold(pc.red(`\n❌ ERROR: Unexpected CLI failure: ${message}`)));
          process.exitCode = EXIT.PARSE_ERROR;
        }
      }
    }
  );

// REVIEW Command
program
  .command('review')
  .argument('[dir]', 'Directory to review', 'src')
  .option('-c, --config <path>', 'Explicit path to configuration file')
  .option('-i, --ignore <pattern>', 'CLI glob pattern to ignore')
  .option('-p, --parallel', 'Run scan in parallel across worker threads')
  .option('--debug', 'Output verbose debug information')
  .option('--verbose', 'Output detailed file-by-file progress')
  .option('-q, --quiet', 'Suppress non-error output')
  .description('Interactively review and approve transformations file by file with diff previews')
  .action(
    async (
      dir: string,
      options: {
        config?: string;
        ignore?: string;
        parallel?: boolean;
        debug?: boolean;
        verbose?: boolean;
        quiet?: boolean;
      }
    ) => {
      try {
        const { targetDir, files, engine, logger } = await createCLIContext(dir, options);

        if (!process.stdout.isTTY) {
          logger.warn(
            pc.yellow(
              '\n⚠️ Interactive review skipped: process.stdout is not a TTY (running in non-interactive CI mode).\n'
            )
          );
          return;
        }

        logger.info(pc.bold(pc.cyan(`\n👀 Interactive Review for: ${targetDir}\n`)));

        const rl = createInterface.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const askQuestion = (query: string): Promise<string> => {
          return new Promise((res) => rl.question(query, res));
        };

        let appliedCount = 0;

        for (const filePath of files) {
          const code = readFileSync(filePath, 'utf-8');
          const transformations = engine.analyzeCode(code, filePath);

          if (transformations.length > 0) {
            const patchedCode = engine.patchCode(code, transformations);
            const relPath = relative(process.cwd(), filePath);
            const patch = createTwoFilesPatch(relPath, relPath, code, patchedCode, 'original', 'refactored');

            logger.info(pc.bold(pc.yellow(`\n----------------------------------------`)));
            logger.info(pc.bold(pc.underline(`File: ${relPath}`)));
            logger.info(pc.cyan(`Proposed Changes (${transformations.length}):`));
            logger.info(patch);

            const answer = await askQuestion(pc.bold('Apply changes to this file? [Y/n]: '));
            if (answer.trim() === '' || answer.trim().toLowerCase() === 'y') {
              writeFileSync(filePath, patchedCode, 'utf-8');
              logger.info(pc.green(`✔ Applied transformations to ${relPath}`));
              appliedCount += transformations.length;
            } else {
              logger.info(pc.gray(`Skipped ${relPath}`));
            }
          }
        }

        rl.close();
        logger.info(
          pc.bold(pc.green(`\n🎉 Interactive review complete. Applied ${appliedCount} transformation(s).\n`))
        );
      } catch (err: unknown) {
        if (err instanceof ToolError) {
          const l = new Logger(resolveLogLevel(options));
          l.error(err);
        } else {
          const message = err instanceof Error ? err.message : String(err);
          console.error(pc.bold(pc.red(`\n❌ ERROR: Unexpected CLI failure: ${message}`)));
        }
        process.exitCode = 1;
      }
    }
  );

// MIGRATE-V4 Command
program
  .command('migrate-v4')
  .argument('[outCss]', 'Output CSS path for Tailwind v4 theme', 'theme.css')
  .description('Automatically convert Tailwind v3 theme tokens into Tailwind v4 @theme CSS block')
  .action(async (outCss: string) => {
    try {
      const logger = new Logger('normal');
      logger.info(pc.bold(pc.cyan(`\n🚀 Converting Tailwind v3 theme configuration to Tailwind v4 @theme CSS...\n`)));

      const loader = createResolverForWorkspace(process.cwd());
      const themeData = loader.getRegistry().exportTokens();
      const v4Css = generateV4ThemeCss(themeData);

      const targetPath = resolve(process.cwd(), outCss);
      writeFileSync(targetPath, v4Css, 'utf-8');

      logger.info(pc.bold(pc.green(`✔ Successfully generated Tailwind v4 theme CSS: ${targetPath}\n`)));
      logger.info(pc.dim(v4Css));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(pc.bold(pc.red(`\n❌ ERROR: Migration failed: ${message}`)));
      process.exitCode = 1;
    }
  });

// INIT-RULE Command
program
  .command('init-rule')
  .argument('<name>', 'Name of custom refactoring rule (e.g. prefer-brand-buttons)')
  .description('Scaffold a new custom refactoring rule module')
  .action((name: string) => {
    const logger = new Logger('normal');
    const fileName = `${name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}.ts`;
    const targetPath = resolve(process.cwd(), 'src/rules', fileName);

    const boilerplate = `import { Rule } from '@tailwind-refactor/rules';
import { TailwindCandidate, TailwindClass, Transformation, RuleContext } from '@tailwind-refactor/core';

export class Custom${name.replace(/(^|-)[a-z]/g, (s) => s.toUpperCase().replace('-', ''))}Rule implements Rule {
  readonly name = '${name}';

  analyze(candidate: TailwindCandidate, parsed: TailwindClass, context: RuleContext): Transformation | null {
    // Custom rule logic here
    return null;
  }
}
`;

    try {
      if (!existsSync(resolve(process.cwd(), 'src/rules'))) {
        mkdirSync(resolve(process.cwd(), 'src/rules'), { recursive: true });
      }
      writeFileSync(targetPath, boilerplate, 'utf-8');
      logger.info(pc.bold(pc.green(`✔ Scaffolded custom rule: ${targetPath}`)));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(pc.bold(pc.red(`\n❌ ERROR: Failed to scaffold rule: ${message}`)));
      process.exitCode = 1;
    }
  });

// INIT-HOOKS Command
program
  .command('init-hooks')
  .description('Set up .husky pre-commit git hook for automatic Tailwind refactoring')
  .action(() => {
    const logger = new Logger('normal');
    const huskyDir = resolve(process.cwd(), '.husky');
    const hookFile = resolve(huskyDir, 'pre-commit');

    try {
      if (!existsSync(huskyDir)) {
        mkdirSync(huskyDir, { recursive: true });
      }
      const hookContent = `#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx tailwind-refactor fix --dry-run
`;
      writeFileSync(hookFile, hookContent, { mode: 0o755 });
      logger.info(pc.bold(pc.green(`✔ Successfully configured git pre-commit hook in: ${hookFile}`)));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(pc.bold(pc.red(`\n❌ ERROR: Failed to configure git hooks: ${message}`)));
      process.exitCode = 1;
    }
  });

// UNDO Command
program
  .command('undo')
  .description('Revert the last fix operation by restoring files from the run manifest')
  .action(() => {
    const logger = new Logger('normal');
    logger.info(pc.bold(pc.cyan('\n↩️  Undoing last fix operation...\n')));

    const manifest = readManifest(process.cwd());
    if (!manifest) {
      console.error(pc.red('No fix manifest found. Run `tailwind-refactor fix` first.'));
      process.exitCode = EXIT.CONFIG_ERROR;
      return;
    }

    let restored = 0;
    let skipped = 0;

    for (const entry of manifest.files) {
      try {
        const current = readFileSync(entry.path, 'utf-8');
        const currentHash = hashContent(current);

        if (currentHash !== entry.patchedHash) {
          logger.info(
            pc.yellow(`  ⚠ Skipped ${relative(process.cwd(), entry.path)} — file has been modified since last fix`)
          );
          skipped++;
          continue;
        }

        // Atomic restore
        const tmpPath = `${entry.path}.tailwind-refactor.tmp`;
        writeFileSync(tmpPath, entry.originalContent, 'utf-8');
        renameSync(tmpPath, entry.path);
        logger.info(`${pc.green('✔ Restored')} ${relative(process.cwd(), entry.path)}`);
        restored++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.info(pc.red(`  ✗ Failed to restore ${entry.path}: ${message}`));
      }
    }

    logger.info(pc.bold(pc.green(`\n✅ Undo complete: ${restored} file(s) restored, ${skipped} skipped.\n`)));
  });

program.parse(process.argv);
