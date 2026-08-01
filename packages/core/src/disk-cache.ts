import type { Transformation } from '@tailwind-refactor/plugin-api';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';

/**
 * Persistent file-system cache for transformation results.
 *
 * @description
 * Results are keyed by a compound hash of `filePath + contentHash + configHash`,
 * which means the cache is automatically invalidated whenever:
 * - The file's source code changes
 * - The configuration changes
 * - The absolute file path changes (e.g. file moved)
 *
 * Cache files are stored as `<hash>.json` in `.tailwind-refactor-cache/` under the
 * project root. The directory is created automatically on first use and should be
 * added to `.gitignore`.
 *
 * @remarks
 * Cache write failures are intentionally swallowed — a failed cache write must never
 * abort a scan or fix operation. Cache read failures are also swallowed and treated
 * as cache misses.
 *
 * @example
 * const cache = new DiskCache(process.cwd());
 * const contentHash = DiskCache.hashContent(sourceCode);
 * const configHash = DiskCache.hashContent(JSON.stringify(config));
 * const cached = cache.get(filePath, contentHash, configHash);
 * if (cached) return cached;
 * const results = engine.analyzeCode(sourceCode, filePath);
 * cache.set(filePath, contentHash, configHash, results);
 */
export class DiskCache {
  /** Absolute path to the cache directory (`.tailwind-refactor-cache/`). */
  private readonly cacheDir: string;

  /**
   * Creates a new `DiskCache` instance rooted at the given working directory.
   * Creates the cache directory if it does not already exist.
   * @param cwd - Absolute path to the project root.
   */
  constructor(cwd: string) {
    this.cacheDir = resolve(cwd, '.tailwind-refactor-cache');
    mkdirSync(this.cacheDir, { recursive: true });
    DiskCache.ensureGitIgnore(cwd);
  }

  /**
   * Automatically checks for `.gitignore` in `cwd` or its parents and ensures
   * `.tailwind-refactor-cache/` is included so cache files are never committed.
   * @param cwd - Absolute path to target workspace directory.
   */
  public static ensureGitIgnore(cwd: string): void {
    try {
      const entry = '.tailwind-refactor-cache/';
      let searchDir = cwd;
      while (true) {
        const gitignorePath = resolve(searchDir, '.gitignore');
        if (existsSync(gitignorePath)) {
          const content = readFileSync(gitignorePath, 'utf-8');
          if (!content.includes(entry)) {
            const updated = content.endsWith('\n') ? `${content}${entry}\n` : `${content}\n${entry}\n`;
            writeFileSync(gitignorePath, updated, 'utf-8');
          }
          break;
        }
        const parent = dirname(searchDir);
        if (parent === searchDir) {
          const gitignorePath = resolve(cwd, '.gitignore');
          writeFileSync(gitignorePath, `${entry}\n`, 'utf-8');
          break;
        }
        searchDir = parent;
      }
    } catch {
      // Non-critical: failure to update .gitignore must not abort cache initialization
    }
  }

  /**
   * Produces a short SHA-256 hex digest (16 chars) suitable for cache keys.
   * @param content - UTF-8 string to hash.
   * @returns 16-character hex string.
   */
  static hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex').slice(0, 16);
  }

  /**
   * Generates a deterministic cache file name from the three inputs.
   * @param filePath    - POSIX-normalized source file path.
   * @param contentHash - SHA-256 of the file's source text.
   * @param configHash  - SHA-256 of the serialized configuration.
   * @returns Filename of the form `<64-char-hex>.json`.
   */
  private cacheKey(filePath: string, contentHash: string, configHash: string): string {
    const key = createHash('sha256').update(`${filePath}|${contentHash}|${configHash}`).digest('hex');
    return `${key}.json`;
  }

  /**
   * Retrieves a cached result from disk.
   * @param filePath    - POSIX-normalized source file path.
   * @param contentHash - SHA-256 of the file's current source text.
   * @param configHash  - SHA-256 of the serialized configuration.
   * @returns Cached `Transformation[]` or `null` on cache miss or read error.
   */
  get(filePath: string, contentHash: string, configHash: string): Transformation[] | null {
    try {
      const data = readFileSync(resolve(this.cacheDir, this.cacheKey(filePath, contentHash, configHash)), 'utf-8');
      return JSON.parse(data) as Transformation[];
    } catch {
      return null;
    }
  }

  /**
   * Persists a transformation result to disk.
   * @param filePath    - POSIX-normalized source file path.
   * @param contentHash - SHA-256 of the file's source text at analysis time.
   * @param configHash  - SHA-256 of the serialized configuration at analysis time.
   * @param results     - Array of `Transformation` objects to cache.
   */
  set(filePath: string, contentHash: string, configHash: string, results: Transformation[]): void {
    try {
      writeFileSync(resolve(this.cacheDir, this.cacheKey(filePath, contentHash, configHash)), JSON.stringify(results));
    } catch {
      // Non-critical: cache write failure must not abort a scan
    }
  }

  /**
   * Clears all cached transformation files from disk.
   */
  clear(): void {
    try {
      if (existsSync(this.cacheDir)) {
        rmSync(this.cacheDir, { recursive: true, force: true });
        mkdirSync(this.cacheDir, { recursive: true });
      }
    } catch {
      // Non-critical: cache clear failure must not abort execution
    }
  }
}
