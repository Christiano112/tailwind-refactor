import { FileIgnoreMatcher, type FileIgnoreOptions } from './file-ignore.js';
import { InlineIgnoreMatcher } from './inline-ignore.js';
import type { CandidateLocation, IgnoreContext, IgnoreSourceReport } from './types.js';

export function createIgnoreContext(options: FileIgnoreOptions = {}): IgnoreContext {
  const fileMatcher = new FileIgnoreMatcher(options);

  return {
    isFileIgnored(filePath: string): boolean {
      return fileMatcher.isFileIgnored(filePath);
    },

    isTransformationIgnored(location: CandidateLocation, ruleName: string, sourceCode?: string): boolean {
      if (!sourceCode) return false;
      const inlineMatcher = new InlineIgnoreMatcher(InlineIgnoreMatcher.parseDirectivesFromText(sourceCode));
      return inlineMatcher.isTransformationIgnored(location, ruleName, sourceCode);
    },

    getIgnoredSources(): IgnoreSourceReport[] {
      return fileMatcher.getSources();
    },
  };
}
