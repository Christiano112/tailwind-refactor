import type { Workspace } from '@tailwind-refactor/plugin-api';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';
import { minimatch } from 'minimatch';
import { resolve } from 'path';

/**
 * Production {@link Workspace} implementation backed by the Node.js file system.
 *
 * @description
 * `FileSystemWorkspace` is the default workspace used by the CLI, Node SDK,
 * and GitHub Action. All file paths are resolved relative to `cwd` (the
 * constructor argument), which defaults to `process.cwd()`.
 *
 * @remarks
 * On Windows, all file paths returned by `glob()` are POSIX-normalized
 * (backslashes replaced with forward slashes) to ensure consistent behaviour
 * across platforms.
 *
 * @example
 * // Scan the src/ directory of the current project
 * const ws = new FileSystemWorkspace('/my/project');
 * const files = await ws.glob('src/**\/*.tsx');
 * const code = await ws.readFile(files[0]);
 *
 * @see {@link MemoryWorkspace} for in-memory testing alternative
 * @see {@link Workspace}
 */
export class FileSystemWorkspace implements Workspace {
  /**
   * Creates a new `FileSystemWorkspace`.
   * @param cwd - Absolute path to the project root directory. Defaults to `process.cwd()`.
   */
  constructor(private cwd = process.cwd()) {}

  /**
   * Reads the full UTF-8 content of a file synchronously.
   * @param filePath - Absolute or `cwd`-relative file path.
   * @returns The file content as a string.
   */
  async readFile(filePath: string): Promise<string> {
    const absPath = resolve(this.cwd, filePath);
    return readFileSync(absPath, 'utf-8');
  }

  /**
   * Writes UTF-8 content to a file synchronously.
   * @param filePath - Absolute or `cwd`-relative file path.
   * @param content  - The full source code string to write.
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    const absPath = resolve(this.cwd, filePath);
    writeFileSync(absPath, content, 'utf-8');
  }

  /**
   * Checks whether a file exists at the given path.
   * @param filePath - Absolute or `cwd`-relative file path.
   * @returns `true` if the file exists on disk.
   */
  async exists(filePath: string): Promise<boolean> {
    const absPath = resolve(this.cwd, filePath);
    return existsSync(absPath);
  }

  /**
   * Returns all file paths matching a glob pattern, with Windows POSIX normalization.
   * @param pattern  - Glob pattern (e.g. `'src/**\/*.tsx'`).
   * @param options  - Optional ignore patterns (defaults to `['**\/node_modules\/**', '**\/dist\/**']`).
   * @returns Array of matched POSIX-normalized file paths.
   */
  async glob(pattern: string, options?: { ignore?: string[] }): Promise<string[]> {
    const normPattern = pattern.replace(/\\/g, '/');
    return globSync(normPattern, { ignore: options?.ignore || ['**/node_modules/**', '**/dist/**'] });
  }
}

/**
 * In-memory {@link Workspace} implementation for unit testing and browser environments.
 *
 * @description
 * `MemoryWorkspace` holds all files as an in-memory `Map<string, string>`.
 * It supports the same `glob()` pattern matching via `minimatch` so that
 * tests can exercise the full `RefactorPipeline` without touching disk at all.
 *
 * @remarks
 * This is the recommended workspace for unit tests. It is deterministic,
 * zero-setup, and extremely fast. Combine it with `RefactorPipeline` to
 * test complete scan/fix flows in isolation.
 *
 * @example
 * // Create an in-memory workspace with two source files
 * const ws = new MemoryWorkspace({
 *   'src/Button.tsx': '<button className="h-[40px] p-[16px]" />',
 *   'src/Card.tsx':   '<div className="bg-[#ffffff] rounded-[8px]" />',
 * });
 *
 * // Read a file
 * const code = await ws.readFile('src/Button.tsx');
 *
 * // Write a transformed file back
 * await ws.writeFile('src/Button.tsx', '<button className="h-10 p-4" />');
 *
 * // Glob to find all TSX files
 * const files = await ws.glob('src/**\/*.tsx');
 * // → ['src/Button.tsx', 'src/Card.tsx']
 *
 * @see {@link FileSystemWorkspace} for production use
 * @see {@link Workspace}
 */
export class MemoryWorkspace implements Workspace {
  /** Internal in-memory file store, keyed by POSIX-normalized path. */
  private files: Map<string, string> = new Map();

  /**
   * Creates a new `MemoryWorkspace` pre-populated with the given files.
   * @param initialFiles - A record of `{ filePath: fileContent }` entries.
   *                       File paths are automatically POSIX-normalized.
   */
  constructor(initialFiles: Record<string, string> = {}) {
    for (const [path, content] of Object.entries(initialFiles)) {
      this.files.set(path.replace(/\\/g, '/'), content);
    }
  }

  /**
   * Reads the content of an in-memory file.
   * @param filePath - POSIX-normalized file path.
   * @returns The file content string.
   * @throws `Error` if the file does not exist in the workspace.
   */
  async readFile(filePath: string): Promise<string> {
    const norm = filePath.replace(/\\/g, '/');
    const content = this.files.get(norm);
    if (content === undefined) {
      throw new Error(`MemoryWorkspace file not found: ${filePath}`);
    }
    return content;
  }

  /**
   * Writes content to an in-memory file, creating it if it does not exist.
   * @param filePath - POSIX-normalized file path.
   * @param content  - The source code string to store.
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    const norm = filePath.replace(/\\/g, '/');
    this.files.set(norm, content);
  }

  /**
   * Checks whether a file exists in the in-memory store.
   * @param filePath - POSIX-normalized file path.
   * @returns `true` if the file was previously written to the workspace.
   */
  async exists(filePath: string): Promise<boolean> {
    const norm = filePath.replace(/\\/g, '/');
    return this.files.has(norm);
  }

  /**
   * Returns all in-memory file paths that match the given glob pattern.
   * Uses `minimatch` for consistent cross-platform matching without disk access.
   * @param pattern  - Glob pattern (e.g. `'src/**\/*.tsx'`).
   * @param options  - Optional ignore patterns.
   * @returns Array of matched POSIX-normalized file paths.
   */
  async glob(pattern: string, options?: { ignore?: string[] }): Promise<string[]> {
    const matched: string[] = [];
    const normPattern = pattern.replace(/\\/g, '/');

    for (const path of this.files.keys()) {
      let isIgnored = false;
      if (options?.ignore) {
        for (const ign of options.ignore) {
          if (minimatch(path, ign.replace(/\\/g, '/'), { dot: true })) {
            isIgnored = true;
            break;
          }
        }
      }

      if (!isIgnored && minimatch(path, normPattern, { dot: true })) {
        matched.push(path);
      }
    }

    return matched;
  }
}
