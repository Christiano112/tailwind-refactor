import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

/**
 * A single file entry recorded in a {@link FixManifest}.
 *
 * @remarks
 * The `originalContent` field is stored so that `tailwind-refactor undo`
 * can restore the file without needing a git history or any other tooling.
 */
export interface FixManifestEntry {
  /** Absolute POSIX path to the source file. */
  path: string;
  /** SHA-256 hash of the file **before** patching. Used to detect external changes. */
  originalHash: string;
  /** SHA-256 hash of the file **after** patching. Used by undo to verify revert target. */
  patchedHash: string;
  /**
   * Full UTF-8 content of the file **before** patching.
   * Stored so `undo` can restore the exact original without any external tools.
   */
  originalContent: string;
}

/**
 * Serialised record of a single `fix` operation written to `.tailwind-refactor/last-run.json`.
 *
 * @remarks
 * Consumed by `tailwind-refactor undo` to restore files to their pre-fix state.
 */
export interface FixManifest {
  /** RFC 4122 UUID uniquely identifying this run. */
  runId: string;
  /** ISO 8601 timestamp of when this fix run started. */
  timestamp: string;
  /** List of files that were modified in this run. */
  files: FixManifestEntry[];
}

/**
 * Computes a SHA-256 hex digest for the given UTF-8 string.
 * Used to verify file integrity before undo operations.
 * @param content - UTF-8 string to hash.
 * @returns Full 64-character hex SHA-256 digest.
 */
export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Writes a {@link FixManifest} to `.tailwind-refactor/last-run.json` under the given cwd.
 * Creates the `.tailwind-refactor/` directory if it does not exist.
 * @param cwd      - Absolute path to the project root.
 * @param manifest - The manifest to persist.
 */
export function writeManifest(cwd: string, manifest: FixManifest): void {
  const dir = resolve(cwd, '.tailwind-refactor');
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'last-run.json'), JSON.stringify(manifest, null, 2), 'utf-8');
}

/**
 * Reads the last {@link FixManifest} from `.tailwind-refactor/last-run.json`.
 * @param cwd - Absolute path to the project root.
 * @returns The deserialized manifest, or `null` if no manifest exists or it cannot be parsed.
 */
export function readManifest(cwd: string): FixManifest | null {
  const manifestPath = resolve(cwd, '.tailwind-refactor', 'last-run.json');
  if (!existsSync(manifestPath)) return null;
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf-8')) as FixManifest;
  } catch {
    return null;
  }
}
