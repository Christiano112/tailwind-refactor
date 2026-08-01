import type { FileChange } from './types.js';

/**
 * Safely applies text transformations to source code based on character ranges.
 *
 * @description
 * This is the **most critical function in the engine**. Instead of re-printing
 * the entire AST (which would destroy comments, blank lines, and formatting),
 * it applies surgical character-range replacements to the raw source string.
 *
 * The algorithm works as follows:
 * 1. Sort all `FileChange` entries **descending** by `start` offset.
 *    This ensures that applying a replacement at a later position never shifts
 *    the offsets of earlier positions.
 * 2. For each change, extract the current substring at the character range.
 * 3. Normalize CRLF (`\r\n`) to LF (`\n`) and trim whitespace before comparing
 *    against the expected `original` value — this guards against Windows
 *    line ending drift corrupting byte offsets.
 * 4. If the extracted substring matches the expected original, apply the replacement.
 *    Otherwise, skip the change (offset mismatch safeguard).
 *
 * @remarks
 * **Safety Guarantee**: If the extracted text at any offset range does not
 * match `change.original` (after CRLF normalization), that specific change is
 * silently skipped. This means the function will never corrupt source code —
 * it may under-apply changes but will never over-apply them.
 *
 * @param sourceCode - The full raw source file string to be patched.
 * @param changes    - Array of {@link FileChange} replacement instructions.
 * @returns The patched source code string with all valid replacements applied.
 *
 * @example
 * // Input source with an arbitrary-value class
 * const source = '<div className="h-[40px] flex" />';
 *
 * // FileChange produced by the rule engine
 * const changes: FileChange[] = [{
 *   file: 'Component.tsx',
 *   start: 16,
 *   end: 24,
 *   original: 'h-[40px]',
 *   replacement: 'h-10',
 * }];
 *
 * const patched = applyFilePatches(source, changes);
 * // → '<div className="h-10 flex" />'
 *
 * @see {@link FileChange}
 */
export function applyFilePatches(sourceCode: string, changes: FileChange[]): string {
  if (!changes || changes.length === 0) {
    return sourceCode;
  }

  // Sort changes descending by start position
  const sortedChanges = [...changes].sort((a, b) => b.start - a.start);
  let updatedCode = sourceCode;

  for (const change of sortedChanges) {
    const currentSnippet = updatedCode.slice(change.start, change.end);

    // Verify CRLF / LF normalized offset alignment
    const normSnippet = currentSnippet.replace(/\r?\n/g, '\n').trim();
    const normOriginal = change.original.replace(/\r?\n/g, '\n').trim();

    if (normSnippet !== normOriginal) {
      // Offset mismatch safeguard
      continue;
    }

    updatedCode = updatedCode.slice(0, change.start) + change.replacement + updatedCode.slice(change.end);
  }

  return updatedCode;
}
