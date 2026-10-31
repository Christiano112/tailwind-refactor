#!/usr/bin/env node
import { loadConfig } from '@tailwind-refactor/config';
import { DiskCache } from '@tailwind-refactor/core';
import { createIgnoreContext, FileScanner } from '@tailwind-refactor/ignore';
import { DebugContextCollector, Logger, ToolError } from '@tailwind-refactor/logger';
import { createResolverForWorkspace, TailwindV4Resolver } from '@tailwind-refactor/resolver';
import { RefactorEngine } from '@tailwind-refactor/rules';
import { Command } from 'commander';
import { resolve } from 'path';
import { runFix, type FixOptions } from './commands/fix.js';
import { runInitHooks, runInitRule, runMigrateV4 } from './commands/scaffold.js';
import { runReview, type ReviewOptions } from './commands/review.js';
import { runScan, type ScanOptions } from './commands/scan.js';
import { runUndo } from './commands/undo.js';
import { EXIT, resolveLogLevel } from './shared.js';

// ─── Context factory ─────────────────────────────────────────────────────────

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

  const resolver = createResolverForWorkspace(targetDir);
  const version = resolver instanceof TailwindV4Resolver ? 'v4' : 'v3';
  logger.debug(`Tailwind ${version} resolver initialized for workspace`);

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

// ─── Shared error handler ────────────────────────────────────────────────────

function handleCommandError(err: unknown, options: { quiet?: boolean; verbose?: boolean; debug?: boolean }): void {
  if (err instanceof ToolError) {
    new Logger(resolveLogLevel(options)).error(err);
    process.exitCode = EXIT.CONFIG_ERROR;
  } else {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n❌ ERROR: Unexpected CLI failure: ${message}`);
    process.exitCode = EXIT.PARSE_ERROR;
  }
}

// ─── CLI program ─────────────────────────────────────────────────────────────

const program = new Command();

program
  .name('tailwind-refactor')
  .description('Tailwind CSS refactoring engine and static analysis CLI')
  .version('0.1.3');

// SCAN ────────────────────────────────────────────────────────────────────────
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
  .action(async (dir: string, options: ScanOptions) => {
    try {
      const ctx = await createCLIContext(dir, options);
      await runScan(dir, options, ctx);
    } catch (err) {
      handleCommandError(err, options);
    }
  });

// FIX ─────────────────────────────────────────────────────────────────────────
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
  .action(async (dir: string, options: FixOptions) => {
    try {
      const ctx = await createCLIContext(dir, options);
      await runFix(dir, options, ctx);
    } catch (err) {
      handleCommandError(err, options);
    }
  });

// REVIEW ──────────────────────────────────────────────────────────────────────
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
  .action(async (dir: string, options: ReviewOptions) => {
    try {
      const ctx = await createCLIContext(dir, options);
      await runReview(dir, options, ctx);
    } catch (err) {
      handleCommandError(err, options);
      process.exitCode = 1;
    }
  });

// MIGRATE-V4 ──────────────────────────────────────────────────────────────────
program
  .command('migrate-v4')
  .argument('[outCss]', 'Output CSS path for Tailwind v4 theme', 'theme.css')
  .description('Automatically convert Tailwind v3 theme tokens into Tailwind v4 @theme CSS block')
  .action(async (outCss: string) => {
    try {
      await runMigrateV4(outCss);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n❌ ERROR: Migration failed: ${message}`);
      process.exitCode = 1;
    }
  });

// INIT-RULE ───────────────────────────────────────────────────────────────────
program
  .command('init-rule')
  .argument('<name>', 'Name of custom refactoring rule (e.g. prefer-brand-buttons)')
  .description('Scaffold a new custom refactoring rule module')
  .action((name: string) => runInitRule(name));

// INIT-HOOKS ──────────────────────────────────────────────────────────────────
program
  .command('init-hooks')
  .description('Set up .husky pre-commit git hook for automatic Tailwind refactoring')
  .action(() => runInitHooks());

// UNDO ────────────────────────────────────────────────────────────────────────
program
  .command('undo')
  .description('Revert the last fix operation by restoring files from the run manifest')
  .action(() => runUndo());

program.parse(process.argv);
