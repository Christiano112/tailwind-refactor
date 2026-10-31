import { Logger } from '@tailwind-refactor/logger';
import { createResolverForWorkspace, generateV4ThemeCss } from '@tailwind-refactor/resolver';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import pc from 'picocolors';
import { resolve } from 'path';

/**
 * Converts a Tailwind v3 theme config into a Tailwind v4 @theme CSS block and writes it to disk.
 */
export async function runMigrateV4(outCss: string): Promise<void> {
  const logger = new Logger('normal');
  logger.info(pc.bold(pc.cyan(`\n🔄 Converting Tailwind v3 theme configuration to Tailwind v4 @theme CSS...\n`)));

  const loader = createResolverForWorkspace(process.cwd());
  const themeData = loader.getRegistry().exportTokens();
  const v4Css = generateV4ThemeCss(themeData);

  const targetPath = resolve(process.cwd(), outCss);
  writeFileSync(targetPath, v4Css, 'utf-8');

  logger.info(pc.bold(pc.green(`✅ Successfully generated Tailwind v4 theme CSS: ${targetPath}\n`)));
  logger.info(pc.dim(v4Css));
}

/**
 * Scaffolds a new custom rule TypeScript file in src/rules/.
 */
export function runInitRule(name: string): void {
  const logger = new Logger('normal');
  const fileName = `${name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}.ts`;
  const targetPath = resolve(process.cwd(), 'src/rules', fileName);

  const className = name.replace(/(^|-)[a-z]/g, (s) => s.toUpperCase().replace('-', ''));
  const boilerplate = `import { Rule } from '@tailwind-refactor/rules';
import { TailwindCandidate, TailwindClass, Transformation, RuleContext } from '@tailwind-refactor/core';

export class Custom${className}Rule implements Rule {
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
    logger.info(pc.bold(pc.green(`✅ Scaffolded custom rule: ${targetPath}`)));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(pc.bold(pc.red(`\n❌ ERROR: Failed to scaffold rule: ${message}`)));
    process.exitCode = 1;
  }
}

/**
 * Writes a Husky pre-commit hook that runs tailwind-refactor fix --dry-run.
 */
export function runInitHooks(): void {
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
    logger.info(pc.bold(pc.green(`✅ Successfully configured git pre-commit hook in: ${hookFile}`)));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(pc.bold(pc.red(`\n❌ ERROR: Failed to configure git hooks: ${message}`)));
    process.exitCode = 1;
  }
}
