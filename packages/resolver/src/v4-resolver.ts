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
 * Auto-detects CSS theme files in a workspace directory or any of its parent directories,
 * and creates the appropriate TailwindResolver instance.
 */
export function createResolverForWorkspace(targetDir: string): TailwindV3Resolver | TailwindV4Resolver {
  const candidates = [
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

  let currentDir = resolve(targetDir);
  while (true) {
    for (const candidate of candidates) {
      const fullPath = resolve(currentDir, candidate);
      try {
        if (existsSync(fullPath) && statSync(fullPath).isFile()) {
          const cssContent = readFileSync(fullPath, 'utf-8');
          return new TailwindV4Resolver(cssContent);
        }
      } catch {}
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }

  return new TailwindV3Resolver();
}
