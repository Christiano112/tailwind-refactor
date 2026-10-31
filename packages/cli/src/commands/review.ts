import { Logger } from '@tailwind-refactor/logger';
import { RefactorEngine } from '@tailwind-refactor/rules';
import { createTwoFilesPatch } from 'diff';
import { readFileSync, writeFileSync } from 'fs';
import { relative } from 'path';
import pc from 'picocolors';
import createInterface from 'readline';

export interface ReviewOptions {
  config?: string;
  ignore?: string;
  parallel?: boolean;
  debug?: boolean;
  verbose?: boolean;
  quiet?: boolean;
}

export async function runReview(
  dir: string,
  options: ReviewOptions,
  ctx: {
    targetDir: string;
    files: string[];
    engine: RefactorEngine;
    logger: Logger;
  }
): Promise<void> {
  const { targetDir, files, engine, logger } = ctx;

  if (!process.stdout.isTTY) {
    logger.warn(
      pc.yellow(
        '\n⚠ Interactive review skipped: process.stdout is not a TTY (running in non-interactive CI mode).\n'
      )
    );
    return;
  }

  logger.info(pc.bold(pc.cyan(`\n🔍 Interactive Review for: ${targetDir}\n`)));

  const rl = createInterface.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = (query: string): Promise<string> =>
    new Promise((res) => rl.question(query, res));

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
        logger.info(pc.green(`✅ Applied transformations to ${relPath}`));
        appliedCount += transformations.length;
      } else {
        logger.info(pc.gray(`Skipped ${relPath}`));
      }
    }
  }

  rl.close();
  logger.info(
    pc.bold(pc.green(`\n✨ Interactive review complete. Applied ${appliedCount} transformation(s).\n`))
  );
}
