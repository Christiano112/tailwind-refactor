import { existsSync, statSync } from 'fs';
import { globSync } from 'glob';
import { DEFAULT_FILE_IGNORES, FileIgnoreMatcher, IGNORED_DIR_NAMES } from './file-ignore.js';
import type { IgnoreContext } from './types.js';

export const SUPPORTED_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx', 'vue', 'svelte', 'html', 'astro', 'mdx'] as const;

export class FileScanner {
  public static findSourceFiles(targetDir: string, ignoreContext?: IgnoreContext): string[] {
    const normalizedTarget = targetDir.replace(/\\/g, '/');

    if (existsSync(targetDir) && statSync(targetDir).isFile()) {
      if (ignoreContext && ignoreContext.isFileIgnored(targetDir)) return [];
      return [targetDir];
    }

    const matcher = ignoreContext || new FileIgnoreMatcher({ cwd: targetDir });

    const extPattern = `{${SUPPORTED_EXTENSIONS.join(',')}}`;
    const pattern = `${normalizedTarget}/**/*.${extPattern}`;

    const files = globSync(pattern, { ignore: DEFAULT_FILE_IGNORES, dot: true });

    return files.filter((filePath) => {
      const norm = filePath.replace(/\\/g, '/');
      const segments = norm.split('/');

      // Skip directory matches for known artifact directory names at any depth
      for (const seg of segments) {
        if (IGNORED_DIR_NAMES.has(seg)) return false;
      }

      if (norm.endsWith('.min.js') || norm.endsWith('.min.css')) return false;

      return !matcher.isFileIgnored(filePath);
    });
  }
}
