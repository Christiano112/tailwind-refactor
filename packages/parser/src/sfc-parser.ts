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

      let valStart = match.index + fullMatch.indexOf(rawVal);
      let text = rawVal;

      // Check if wrapped in quotes (e.g. inside { '...' } or { "..." })
      const trimmed = text.trim();
      if (
        (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))
      ) {
        const quoteStart = text.indexOf(trimmed[0]);
        valStart += quoteStart + 1;
        text = trimmed.slice(1, -1);
      }

      // Add full multi-class string candidate if trimmed has spaces
      const fullClean = text.trim();
      if (fullClean.includes(' ')) {
        const fullStart = valStart + text.indexOf(fullClean);
        stringCandidates.push({
          value: fullClean,
          location: {
            start: fullStart,
            end: fullStart + fullClean.length,
          },
          filePath,
        });
      }

      // Extract individual class tokens with exact location offsets
      const wordRegex = /\S+/g;
      let wordMatch: RegExpExecArray | null;
      while ((wordMatch = wordRegex.exec(text)) !== null) {
        const word = wordMatch[0];
        const wordStart = valStart + wordMatch.index;
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
