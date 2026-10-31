import type { LogLevel } from '@tailwind-refactor/logger';

/**
 * Standardised CLI exit codes.
 * - 0:   Clean / fix applied successfully
 * - 1:   Scan found violations (use as CI gate with `|| true` to suppress)
 * - 2:   Config load or validation failed
 * - 3:   One or more files failed to parse
 * - 130: SIGINT / Ctrl-C received
 */
export const EXIT = {
  OK: 0,
  VIOLATIONS: 1,
  CONFIG_ERROR: 2,
  PARSE_ERROR: 3,
  INTERRUPTED: 130,
} as const;

export function resolveLogLevel(options: { quiet?: boolean; verbose?: boolean; debug?: boolean }): LogLevel {
  if (options.quiet) return 'silent';
  if (options.debug) return 'debug';
  if (options.verbose) return 'verbose';
  return 'normal';
}
