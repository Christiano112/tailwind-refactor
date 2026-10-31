import { Logger } from '@tailwind-refactor/logger';
import { RefactorEngine } from '@tailwind-refactor/rules';
import { createTwoFilesPatch } from 'diff';
import { randomUUID } from 'crypto';
import { readFileSync, renameSync, writeFileSync } from 'fs';
import { relative } from 'path';
import pc from 'picocolors';
import { type FixManifestEntry, hashContent, writeManifest } from '../fix-manifest.js';
import { ProgressReporter } from '../progress.js';

export interface FixOptions {
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

export async function runFix(
  dir: string,
  options: FixOptions,
  ctx: {
    targetDir: string;
    files: string[];
    engine: RefactorEngine;
    logger: Logger;
  }
): Promise<void> {
  const { targetDir, files, engine, logger } = ctx;
  const isDryRun = !!options.dryRun;

  logger.info(
    pc.bold(pc.cyan(`\n🔧  Applying Tailwind refactorings in: ${targetDir}${isDryRun ? ' (DRY RUN)' : ''}\n`))
  );

  let totalFixed = 0;
  const progress = new ProgressReporter();
  const manifestEntries: FixManifestEntry[] = [];
  const runId = randomUUID();
  const fixErrors: { file: string; message: string }[] = [];

  let scanned = 0;
  for (const filePath of files) {
    try {
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
          manifestEntries.push({
            path: filePath,
            originalHash: hashContent(rawCode),
            patchedHash: hashContent(finalCode),
            originalContent: rawCode,
          });
          const tmpPath = `${filePath}.tailwind-refactor.tmp`;
          writeFileSync(tmpPath, finalCode, 'utf-8');
          renameSync(tmpPath, filePath);
          logger.info(`${pc.green('✅ Fixed')} ${relPath} (${transformations.length} change(s))`);
        }
        totalFixed += transformations.length;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      fixErrors.push({ file: filePath, message });
      logger.warn(pc.yellow(`  ⚠ Skipped ${relative(process.cwd(), filePath)}: ${message}`));
    }
    progress.report(++scanned, files.length, filePath);
  }
  progress.clear();

  if (!isDryRun && manifestEntries.length > 0) {
    writeManifest(process.cwd(), {
      runId,
      timestamp: new Date().toISOString(),
      files: manifestEntries,
    });
  }

  if (fixErrors.length > 0) {
    logger.info(pc.yellow(`\n⚠ ${fixErrors.length} file(s) could not be processed (see warnings above).\n`));
  }

  if (totalFixed === 0) {
    logger.info(pc.green('✅ No files required modifications.\n'));
  } else {
    logger.info(
      pc.bold(
        pc.green(`\n✨ Successfully ${isDryRun ? 'simulated' : 'applied'} ${totalFixed} transformation(s).\n`)
      )
    );
    if (!isDryRun) {
      logger.info(pc.dim('  Run `tailwind-refactor undo` to revert these changes.'));
    }
  }
}
