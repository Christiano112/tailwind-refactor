import { Logger } from '@tailwind-refactor/logger';
import { readFileSync, renameSync, writeFileSync } from 'fs';
import { relative } from 'path';
import pc from 'picocolors';
import { hashContent, readManifest } from '../fix-manifest.js';
import { EXIT } from '../shared.js';

/**
 * Reverts the last fix operation by restoring files from the run manifest.
 */
export function runUndo(): void {
  const logger = new Logger('normal');
  logger.info(pc.bold(pc.cyan('\n⏪  Undoing last fix operation...\n')));

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
          pc.yellow(`  ⚠ Skipped ${relative(process.cwd(), entry.path)} - file has been modified since last fix`)
        );
        skipped++;
        continue;
      }

      const tmpPath = `${entry.path}.tailwind-refactor.tmp`;
      writeFileSync(tmpPath, entry.originalContent, 'utf-8');
      renameSync(tmpPath, entry.path);
      logger.info(`${pc.green('✅ Restored')} ${relative(process.cwd(), entry.path)}`);
      restored++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.info(pc.red(`  ❌ Failed to restore ${entry.path}: ${message}`));
    }
  }

  logger.info(pc.bold(pc.green(`\n✅ Undo complete: ${restored} file(s) restored, ${skipped} skipped.\n`)));
}
