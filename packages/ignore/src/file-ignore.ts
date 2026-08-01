import { existsSync, readFileSync } from 'fs';
import { minimatch } from 'minimatch';
import { dirname, relative, resolve } from 'path';
import type { IgnoreSourceReport } from './types.js';

export const CATEGORIZED_DEFAULT_IGNORES = {
  dependencies: ['**/node_modules/**', '**/bower_components/**'],
  git: ['**/.git/**', '**/.git-cache/**'],
  buildOutputs: [
    '**/dist/**',
    '**/build/**',
    '**/out/**',
    '**/target/**',
    '**/.output/**',
    '**/.vercel/**',
    '**/.netlify/**',
  ],
  frameworks: ['**/.next/**', '**/.nuxt/**', '**/.astro/**', '**/.svelte-kit/**'],
  tools: [
    '**/.turbo/**',
    '**/.nx/**',
    '**/.expo/**',
    '**/.expo-shared/**',
    '**/android/build/**',
    '**/ios/build/**',
    '**/storybook-static/**',
  ],
  coverage: ['**/coverage/**', '**/.nyc_output/**'],
  caches: ['**/.cache/**', '**/.parcel-cache/**', '**/.vite/**', '**/.eslintcache/**', '**/.stylelintcache/**'],
  packageManagers: ['**/.pnpm-store/**', '**/.yarn/**'],
  generated: [
    '**/generated/**',
    '**/__generated__/**',
    '**/*.generated.*',
    '**/*.gen.*',
    '**/*.g.ts',
    '**/*.g.tsx',
    '**/prisma/generated/**',
    '**/api/generated/**',
    '**/src/generated/**',
  ],
  snapshots: ['**/__snapshots__/**', '**/*.snap'],
  logs: ['**/*.log'],
  minified: ['**/*.min.js', '**/*.min.css'],
  lockfiles: ['**/package-lock.json', '**/yarn.lock', '**/pnpm-lock.yaml'],
  binaries: [
    '**/*.png',
    '**/*.jpg',
    '**/*.jpeg',
    '**/*.gif',
    '**/*.webp',
    '**/*.svg',
    '**/*.ico',
    '**/*.pdf',
    '**/*.zip',
    '**/*.tar',
    '**/*.gz',
  ],
} as const;

export const DEFAULT_FILE_IGNORES = Object.values(CATEGORIZED_DEFAULT_IGNORES).flat();

/**
 * Directory names that are ignored recursively at any depth across monorepos and workspaces.
 */
export const IGNORED_DIR_NAMES = new Set([
  'node_modules',
  'bower_components',
  '.git',
  '.git-cache',
  'dist',
  'build',
  'out',
  'target',
  '.output',
  '.vercel',
  '.netlify',
  '.next',
  '.nuxt',
  '.astro',
  '.svelte-kit',
  '.turbo',
  '.nx',
  '.expo',
  '.expo-shared',
  'storybook-static',
  'coverage',
  '.nyc_output',
  '.cache',
  '.parcel-cache',
  '.vite',
  '.eslintcache',
  '.stylelintcache',
  '.pnpm-store',
  '.yarn',
]);

export interface FileIgnoreOptions {
  cwd?: string;
  cliIgnores?: string[];
  configIgnores?: string[];
  customIgnoreFile?: string;
  ignoreDefaults?: boolean;
  includeGenerated?: boolean;
}

interface CompiledPattern {
  pattern: string;
  negated: boolean;
}

export class FileIgnoreMatcher {
  private sources: IgnoreSourceReport[] = [];
  private compiledPatterns: CompiledPattern[] = [];
  private cwd: string;

  constructor(options: FileIgnoreOptions = {}) {
    this.cwd = options.cwd || process.cwd();

    // 1. CLI ignores (Priority 1)
    if (options.cliIgnores && options.cliIgnores.length > 0) {
      this.sources.push({ source: 'CLI --ignore', patterns: options.cliIgnores });
      this.addPatterns(options.cliIgnores);
    }

    // 2. Config ignores (Priority 2)
    if (options.configIgnores && options.configIgnores.length > 0) {
      this.sources.push({ source: 'tailwind-refactor.config', patterns: options.configIgnores });
      this.addPatterns(options.configIgnores);
    }

    // 3. .tailwind-refactorignore file (Priority 3)
    let searchDir = this.cwd;
    while (true) {
      const refactorIgnorePath = options.customIgnoreFile
        ? resolve(searchDir, options.customIgnoreFile)
        : resolve(searchDir, '.tailwind-refactorignore');
      if (existsSync(refactorIgnorePath)) {
        this.loadIgnoreFile(refactorIgnorePath, '.tailwind-refactorignore');
        break;
      }
      const parent = dirname(searchDir);
      if (parent === searchDir) break;
      searchDir = parent;
    }

    // 4. Auto-detect .gitignore file (Priority 4)
    searchDir = this.cwd;
    while (true) {
      const gitignorePath = resolve(searchDir, '.gitignore');
      if (existsSync(gitignorePath)) {
        this.loadIgnoreFile(gitignorePath, 'Auto-detected .gitignore');
        break;
      }
      const parent = dirname(searchDir);
      if (parent === searchDir) break;
      searchDir = parent;
    }

    // 5. Categorized Default Ignores (Priority 5, unless ignoreDefaults is false)
    if (options.ignoreDefaults !== false) {
      let defaultsToUse: string[] = [...DEFAULT_FILE_IGNORES];
      defaultsToUse = defaultsToUse.filter(
        (p) => !(CATEGORIZED_DEFAULT_IGNORES.generated as readonly string[]).includes(p)
      );
      this.sources.push({ source: 'Default Ignores', patterns: defaultsToUse });
      this.addPatterns(defaultsToUse);
    }
  }

  private addPatterns(rawPatterns: string[]): void {
    for (const line of rawPatterns) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      let negated = false;
      let p = trimmed;
      if (p.startsWith('!')) {
        negated = true;
        p = p.slice(1);
      }

      if (p.startsWith('/')) p = p.slice(1);
      if (p.endsWith('/')) p = `${p}**`;
      if (!p.includes('/') && !p.startsWith('**')) {
        p = `**/${p}`;
      }

      this.compiledPatterns.push({ pattern: p, negated });
    }
  }

  private loadIgnoreFile(filePath: string, sourceLabel: string): void {
    if (!existsSync(filePath)) return;
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'));

      if (lines.length > 0) {
        const relPath = relative(this.cwd, filePath);
        this.sources.push({ source: relPath || sourceLabel, patterns: lines });
        this.addPatterns(lines);
      }
    } catch {
      // Ignore unreadable ignore files
    }
  }

  getSources(): IgnoreSourceReport[] {
    return this.sources;
  }

  /**
   * Fast-path check whether any directory segment in the given path is a known ignored directory name.
   */
  isDirectoryIgnored(filePath: string): boolean {
    const norm = filePath.replace(/\\/g, '/');
    const segments = norm.split('/');
    for (const segment of segments) {
      if (IGNORED_DIR_NAMES.has(segment)) return true;
    }
    return false;
  }

  isFileIgnored(filePath: string): boolean {
    const norm = filePath.replace(/\\/g, '/');
    const relPath = relative(this.cwd, resolve(this.cwd, filePath)).replace(/\\/g, '/');

    if (this.isDirectoryIgnored(relPath)) return true;

    let isIgnored = false;

    for (const { pattern, negated } of this.compiledPatterns) {
      const normalizedPattern = pattern.replace(/\\/g, '/');
      const matched =
        minimatch(relPath, normalizedPattern, { dot: true }) || minimatch(norm, normalizedPattern, { dot: true });

      if (matched) {
        isIgnored = !negated;
      }
    }

    return isIgnored;
  }
}
