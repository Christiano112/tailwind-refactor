/**
 * Workspace abstraction types for the plugin-api public surface.
 */

/**
 * Workspace abstraction for reading, writing, and querying source files.
 *
 * @remarks
 * Decouples the pipeline from the Node.js file system so that:
 * - Unit tests can use {@link MemoryWorkspace} (zero disk I/O).
 * - The browser REPL (`apps/playground`) can use an in-memory workspace.
 * - Future remote or virtual filesystem implementations can plug in.
 *
 * @example
 * // Production
 * const ws = new FileSystemWorkspace('/my-project');
 *
 * // Testing
 * const ws = new MemoryWorkspace({ 'src/Button.tsx': '<div className="h-10" />' });
 *
 * @see {@link FileSystemWorkspace}
 * @see {@link MemoryWorkspace}
 */
export interface Workspace {
  /**
   * Reads the UTF-8 text content of a file.
   * @param filePath - Absolute or workspace-relative file path.
   * @returns The full source code string.
   */
  readFile(filePath: string): Promise<string>;

  /**
   * Writes UTF-8 text content to a file. Creates the file if it does not exist.
   * @param filePath - Absolute or workspace-relative file path.
   * @param content  - The source code string to write.
   */
  writeFile(filePath: string, content: string): Promise<void>;

  /**
   * Checks whether a file exists in the workspace.
   * @param filePath - Absolute or workspace-relative file path.
   * @returns `true` if the file exists.
   */
  exists(filePath: string): Promise<boolean>;

  /**
   * Returns a list of file paths matching a glob pattern.
   * @param pattern  - Glob pattern (e.g. `'src/**\/*.tsx'`).
   * @param options  - Optional ignore patterns (e.g. `{ ignore: ['**\/node_modules\/**'] }`).
   * @returns Array of matched file paths.
   */
  glob(pattern: string, options?: { ignore?: string[] }): Promise<string[]>;
}
