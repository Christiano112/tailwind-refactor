import type { TailwindResolver } from '@tailwind-refactor/core';
import { existsSync, readFileSync, statSync } from 'fs';
import { dirname, resolve } from 'path';
import { type UtilityDefinition, UtilityRegistry } from './core/utility-registry.js';
import { TailwindV3ConfigLoader } from './tailwind-v3/config-loader.js';
import { TailwindV4ThemeParser } from './tailwind-v4/theme-parser.js';
import type { ThemeConfig } from './types.js';
import { TailwindV3Resolver } from './v3-resolver.js';

export class TailwindV4Resolver implements TailwindResolver {
  private registry: UtilityRegistry;

  constructor(cssContent?: string, customThemeConfig?: ThemeConfig) {
    this.registry = new UtilityRegistry();

    if (cssContent) {
      TailwindV4ThemeParser.parseAndRegister(cssContent, this.registry);
    }
    if (customThemeConfig) {
      TailwindV3ConfigLoader.loadIntoRegistry(customThemeConfig, this.registry);
    }
  }

  getRegistry(): UtilityRegistry {
    return this.registry;
  }

  resolve(utility: string, rawValue: string) {
    return this.registry.resolve(utility, rawValue);
  }

  findEquivalent(utility: string, rawValue: string): string | null {
    return this.registry.findEquivalent(utility, rawValue);
  }

  resolveCanonicalClass(parsed: {
    utility: string;
    value?: string;
    variants: string[];
    important?: boolean;
    isArbitrary?: boolean;
  }): string | null {
    return this.registry.resolveCanonicalClass(parsed);
  }

  sortClasses(tokens: string[]): string[] {
    return this.registry.sortClasses(tokens);
  }

  deduplicateClasses(tokens: string[]): string[] {
    return this.registry.deduplicateClasses(tokens);
  }

  resolveUtility(className: string): UtilityDefinition | undefined {
    return this.registry.resolveUtility(className);
  }
}

/**
 * Auto-detects CSS theme files or Tailwind configuration in a workspace directory
 * or any of its parent directories, and creates the appropriate TailwindResolver instance.
 */
export function createResolverForWorkspace(targetDir: string): TailwindV3Resolver | TailwindV4Resolver {
  const cssCandidates = [
    'app/globals.css',
    'src/app/globals.css',
    'globals.css',
    'src/globals.css',
    'styles/globals.css',
    'src/index.css',
    'index.css',
    'theme.css',
    'src/theme.css',
    'styles/theme.css',
  ];

  const configCandidates = [
    'tailwind.config.js',
    'tailwind.config.cjs',
    'tailwind.config.mjs',
    'tailwind.config.ts',
    'tailwind.config.json',
  ];

  let currentDir = resolve(targetDir);
  let firstCssContent: string | null = null;

  while (true) {
    // 1. Check for CSS candidates with @theme (Tailwind v4 indicator)
    for (const candidate of cssCandidates) {
      const fullPath = resolve(currentDir, candidate);
      try {
        if (existsSync(fullPath) && statSync(fullPath).isFile()) {
          const cssContent = readFileSync(fullPath, 'utf-8');
          if (/@theme\b/.test(cssContent)) {
            return new TailwindV4Resolver(cssContent);
          }
          if (!firstCssContent) {
            firstCssContent = cssContent;
          }
        }
      } catch {}
    }

    // 2. Check for Tailwind v3 config candidates
    for (const candidate of configCandidates) {
      const fullPath = resolve(currentDir, candidate);
      try {
        if (existsSync(fullPath) && statSync(fullPath).isFile()) {
          const loaded = TailwindV3ConfigLoader.loadConfigFile(fullPath);
          if (loaded) {
            return new TailwindV3Resolver((loaded as any).theme || loaded);
          }
        }
      } catch {}
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }

  if (firstCssContent) {
    return new TailwindV4Resolver(firstCssContent);
  }

  return new TailwindV3Resolver();
}
