import { type TailwindRefactorConfig } from '@tailwind-refactor/config';
import { type IgnoreContext } from '@tailwind-refactor/ignore';
import { Logger } from '@tailwind-refactor/logger';
import type { Transformation } from '@tailwind-refactor/plugin-api';
import { ParallelFileScanner, RefactorEngine } from '@tailwind-refactor/rules';
import { readFileSync } from 'fs';
import { relative } from 'path';
import pc from 'picocolors';
import { generateHTMLReport } from '../html-report.js';
import { EXIT } from '../shared.js';

export interface ScanOptions {
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

export async function runScan(
  dir: string,
  options: ScanOptions,
  ctx: {
    targetDir: string;
    config: TailwindRefactorConfig;
    files: string[];
    engine: RefactorEngine;
    logger: Logger;
    ignoreContext: IgnoreContext;
  }
): Promise<void> {
  const { targetDir, config, files, engine, logger } = ctx;

  logger.info(
    pc.bold(
      pc.cyan(`\n🔍 Scanning Tailwind utility usage in: ${targetDir}${options.parallel ? ' (PARALLEL WORKERS)' : ''}\n`)
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
    logger.info(pc.green('✅ No non-canonical Tailwind utilities found! Codebase is optimized.\n'));
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

  process.exitCode = EXIT.VIOLATIONS;
}
