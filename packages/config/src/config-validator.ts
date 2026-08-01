import { ErrorCode, ToolError } from '@tailwind-refactor/logger';
import { readFileSync } from 'fs';

/**
 * Security validator for user configuration files.
 * Performs static inspection of configuration files before runtime import() to prevent
 * arbitrary code execution vulnerabilities in automated scanning environments.
 */
export class ConfigValidator {
  private static DANGEROUS_PATTERNS = [
    /\bchild_process\b/,
    /\bexec(?:Sync)?\b/,
    /\bspawn(?:Sync)?\b/,
    /\beval\s*\(/,
    /\bFunction\s*\(/,
    /\bprocess\.exit\b/,
    /\bhttp\./,
    /\bhttps\./,
    /\bnet\./,
  ];

  /**
   * Statically inspects a config file at `filePath` for unsafe code patterns.
   * Throws a `ToolError` with `CONFIG_SECURITY_ERROR` if unsafe code is detected.
   */
  public static validate(filePath: string): void {
    try {
      const content = readFileSync(filePath, 'utf-8');
      for (const pattern of ConfigValidator.DANGEROUS_PATTERNS) {
        if (pattern.test(content)) {
          throw new ToolError({
            code: ErrorCode.CONFIG_LOAD_FAILED,
            message: `Security Warning: Configuration file at '${filePath}' contains forbidden pattern '${pattern.source}'. Automatic code execution is blocked for security.`,
            severity: 'error',
            file: filePath,
            suggestion: 'Remove dynamic code execution calls from configuration files or run with trusted code flags.',
          });
        }
      }
    } catch (err: unknown) {
      if (err instanceof ToolError) throw err;
      // If file cannot be read, loader will handle missing file error
    }
  }
}
