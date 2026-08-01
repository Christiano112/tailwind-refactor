import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

/**
 * A single cached entry recording the SHA-256 hash and timestamp for a file.
 *
 * @remarks
 * The cache key is a **composite hash** of both the file content AND the active
 * configuration, which means any change to `tailwind-refactor.config.ts` will
 * correctly invalidate all cached entries for all files.
 *
 * @see {@link AnalysisCache}
 */
export interface CacheEntry {
  /**
   * SHA-256 hex digest of `content + JSON.stringify(config)`.
   * Used to detect whether a file needs to be re-analyzed.
   */
  hash: string;
  /** Unix timestamp (ms) when this cache entry was last written. */
  timestamp: number;
}

/**
 * Persistent on-disk analysis cache for incremental scanning.
 *
 * @description
 * `AnalysisCache` prevents re-analyzing files that have not changed since the
 * last scan. It stores a SHA-256 composite hash over both the **file content**
 * and the **active configuration** in a JSON file (`.tailwind-refactor-cache`)
 * at the project root.
 *
 * @remarks
 * **Composite hash invalidation** is the key feature here. A naive content-only
 * hash would fail to re-analyze files when only the rule configuration changes.
 * By including `JSON.stringify(config)` in the hash payload, any change to
 * `tailwind-refactor.config.ts` automatically invalidates all cached results.
 *
 * The cache file is read on construction and written explicitly via `saveToDisk()`.
 * Any file I/O errors are silently swallowed — a missing or corrupt cache
 * simply means all files will be re-analyzed on the next run.
 *
 * @example
 * const cache = new AnalysisCache('/my/project');
 *
 * const content = readFileSync('src/Button.tsx', 'utf-8');
 * const config = { rules: { 'prefer-token-values': 'error' } };
 *
 * if (cache.isUnchanged('src/Button.tsx', content, config)) {
 *   console.log('File is unchanged — skipping analysis.');
 * } else {
 *   // ... run analysis ...
 *   cache.set('src/Button.tsx', content, config);
 *   cache.saveToDisk();
 * }
 */
export class AnalysisCache {
  /** In-memory cache map, keyed by POSIX-normalized file path. */
  private cache: Map<string, CacheEntry> = new Map();
  /** Absolute path to the `.tailwind-refactor-cache` JSON file on disk. */
  private cacheFilePath: string;

  /**
   * Creates a new `AnalysisCache` and loads any existing cache entries from disk.
   * @param cacheDir - Directory where `.tailwind-refactor-cache` is stored.
   *                   Defaults to `process.cwd()`.
   */
  constructor(cacheDir = process.cwd()) {
    this.cacheFilePath = resolve(cacheDir, '.tailwind-refactor-cache');
    this.loadFromDisk();
  }

  /**
   * Computes the composite SHA-256 hash for a file's content and optional config.
   *
   * @remarks
   * The hash is computed over `content + ':' + JSON.stringify(config)`.
   * If no `config` is provided, only the `content` is hashed.
   *
   * @param content - The full source file content string.
   * @param config  - The active `TailwindRefactorConfig` object (optional).
   * @returns A 64-character hex SHA-256 digest string.
   *
   * @example
   * const hash = cache.getHash('const x = 1;', { rules: {} });
   * // → 'a3f1...' (64 hex chars)
   */
  public getHash(content: string, config?: Record<string, unknown>): string {
    const payload = config ? `${content}:${JSON.stringify(config)}` : content;
    return createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Returns `true` if the file has not changed since the last cached analysis.
   *
   * @remarks
   * This is the primary entry point for incremental scanning. A `true` result
   * means the file can be safely skipped — its previous analysis results are
   * still valid for the current configuration.
   *
   * @param filePath - POSIX-normalized path to the source file.
   * @param content  - Current content of the file.
   * @param config   - Current active configuration.
   * @returns `true` if the composite hash matches the stored cache entry.
   *
   * @example
   * if (cache.isUnchanged(filePath, code, config)) {
   *   continue; // Skip this file — no changes
   * }
   */
  public isUnchanged(filePath: string, content: string, config?: Record<string, unknown>): boolean {
    const currentHash = this.getHash(content, config);
    const entry = this.cache.get(filePath);
    return entry ? entry.hash === currentHash : false;
  }

  /**
   * Records a cache entry for the given file and configuration.
   * Call this after successfully analyzing a file to mark it as "clean".
   *
   * @param filePath - POSIX-normalized path to the source file.
   * @param content  - The file content that was analyzed.
   * @param config   - The configuration that was active during analysis.
   */
  public set(filePath: string, content: string, config?: Record<string, unknown>): void {
    const hash = this.getHash(content, config);
    this.cache.set(filePath, { hash, timestamp: Date.now() });
  }

  /**
   * Persists all current in-memory cache entries to disk as JSON.
   *
   * @remarks
   * Should be called once at the end of a full scan or fix operation.
   * Any write errors are silently ignored — a failed cache write is non-fatal.
   */
  public saveToDisk(): void {
    try {
      const obj = Object.fromEntries(this.cache.entries());
      writeFileSync(this.cacheFilePath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch {
      // Ignore cache write errors
    }
  }

  /**
   * Loads cache entries from the `.tailwind-refactor-cache` file on disk.
   * Called automatically by the constructor. Any read/parse errors are silently ignored.
   */
  private loadFromDisk(): void {
    if (existsSync(this.cacheFilePath)) {
      try {
        const raw = readFileSync(this.cacheFilePath, 'utf-8');
        const obj = JSON.parse(raw);
        for (const [key, val] of Object.entries(obj)) {
          this.cache.set(key, val as CacheEntry);
        }
      } catch {
        // Ignore cache read errors
      }
    }
  }
}
