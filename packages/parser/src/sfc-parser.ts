import type { TailwindCandidate } from '@tailwind-refactor/core';

export interface SFCExtractionResult {
  stringCandidates: TailwindCandidate[];
  tokenCandidates: TailwindCandidate[];
}

/**
 * Dedicated SFC and HTML template parser.
 * Extracts static class attributes from Vue templates, Svelte components, Astro files, and raw HTML.
 */
export class SFCParser {
  /**
   * Parses class attributes from Vue, Svelte, Astro, or HTML files.
   * Handles multi-line class strings, Vue `:class`, Svelte `class:` directives, and standard `class="..."`.
   */
  public static parse(code: string, filePath: string): SFCExtractionResult {
    const stringCandidates: TailwindCandidate[] = [];
    const tokenCandidates: TailwindCandidate[] = [];

    // Match static class="...", :class="...", class:..., and multi-line class attributes
    const classAttrRegex = /(?::?class|class:[a-zA-Z0-9_-]+)=(?:"([^"]*)"|'([^']*)'|{`([^`]*)`}|{([^}]+)})/gs;
    let match: RegExpExecArray | null;

    while ((match = classAttrRegex.exec(code)) !== null) {
      const fullMatch = match[0];
      // Extract the raw text value of the class attribute
      const rawVal = match[1] ?? match[2] ?? match[3] ?? match[4];
      if (!rawVal) continue;

      let cleanVal = rawVal.trim();
      let valOffset = match.index + fullMatch.indexOf(rawVal);
      if (
        (cleanVal.startsWith("'") && cleanVal.endsWith("'")) ||
        (cleanVal.startsWith('"') && cleanVal.endsWith('"'))
      ) {
        valOffset += 1;
        cleanVal = cleanVal.slice(1, -1).trim();
      }
      if (!cleanVal) continue;

      // Add full multi-class string candidate
      if (cleanVal.includes(' ')) {
        stringCandidates.push({
          value: cleanVal,
          location: {
            start: valOffset,
            end: valOffset + cleanVal.length,
          },
          filePath,
        });
      }

      // Extract individual class tokens
      const wordRegex = /\S+/g;
      let wordMatch: RegExpExecArray | null;
      while ((wordMatch = wordRegex.exec(cleanVal)) !== null) {
        const word = wordMatch[0];
        const wordStart = valOffset + wordMatch.index;
        tokenCandidates.push({
          value: word,
          location: {
            start: wordStart,
            end: wordStart + word.length,
          },
          filePath,
        });
      }
    }

    return { stringCandidates, tokenCandidates };
  }
}
