import { ErrorCode, ToolError } from '@tailwind-refactor/logger';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { DEFAULT_CONFIG } from './defaults.js';
import type { TailwindRefactorConfig } from './types.js';
import { validateConfig } from './validator.js';

const CONFIG_FILENAMES = [
  'tailwind-refactor.config.ts',
  'tailwind-refactor.config.js',
  'tailwind-refactor.config.mjs',
  'tailwind-refactor.config.cjs',
];

export async function loadConfig(
  explicitPath?: string,
  cwd = process.cwd()
): Promise<Required<TailwindRefactorConfig>> {
  let targetPath: string | null = null;

  if (explicitPath) {
    const resolved = resolve(cwd, explicitPath);
    if (!existsSync(resolved)) {
      throw new ToolError({
        code: ErrorCode.CONFIG_LOAD_FAILED,
        message: `Explicit configuration file not found: ${explicitPath}`,
        severity: 'error',
        file: explicitPath,
        suggestion: 'Verify the file path provided in --config flag exists',
      });
    }
    targetPath = resolved;
  } else {
    let currDir = cwd;
    while (currDir) {
      for (const filename of CONFIG_FILENAMES) {
        const candidate = resolve(currDir, filename);
        if (existsSync(candidate)) {
          targetPath = candidate;
          break;
        }
      }
      if (targetPath) break;
      const parent = resolve(currDir, '..');
      if (parent === currDir) break;
      currDir = parent;
    }
  }

  if (!targetPath) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const fileUrl = pathToFileURL(targetPath).href;
    const imported = await import(fileUrl);
    const rawConfig = imported.default || imported;
    const userConfig = validateConfig(rawConfig, targetPath);

    return {
      extends: userConfig.extends || DEFAULT_CONFIG.extends,
      rules: { ...DEFAULT_CONFIG.rules, ...userConfig.rules },
      ignore: userConfig.ignore ? [...DEFAULT_CONFIG.ignore, ...userConfig.ignore] : [...DEFAULT_CONFIG.ignore],
      confidenceThreshold: userConfig.confidenceThreshold || DEFAULT_CONFIG.confidenceThreshold,
      tailwindVersion: userConfig.tailwindVersion || DEFAULT_CONFIG.tailwindVersion,
      plugins: userConfig.plugins || DEFAULT_CONFIG.plugins,
      parallelThreads: userConfig.parallelThreads ?? DEFAULT_CONFIG.parallelThreads,
    };
  } catch (err: unknown) {
    if (err instanceof ToolError) {
      throw err;
    }
    const errMsg = err instanceof Error ? err.message : String(err);
    throw new ToolError({
      code: ErrorCode.CONFIG_LOAD_FAILED,
      message: `Failed to import configuration file at '${targetPath}': ${errMsg}`,
      severity: 'error',
      file: targetPath,
      suggestion: 'Ensure configuration file syntax is valid JavaScript/TypeScript ESM',
      cause: err,
    });
  }
}
