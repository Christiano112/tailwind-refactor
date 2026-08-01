import type { Reporter, ScanResult } from '@tailwind-refactor/plugin-api';

/**
 * Reporter that serializes a {@link ScanResult} to a formatted JSON string.
 *
 * @description
 * `JSONReporter` is designed for machine consumption — CI pipelines, GitHub Actions,
 * IDE extensions, and any tooling that needs to parse scan results programmatically.
 *
 * @remarks
 * Activated by the `--format json` CLI flag. The JSON output is deterministic,
 * containing the complete `ScanResult` schema with all transformations, diagnostics,
 * and per-file reports. Consumers should version-pin their parsing against
 * the `@tailwind-refactor/plugin-api` `ScanResult` type.
 *
 * @example
 * // CLI usage
 * tailwind-refactor scan --format json > results.json
 *
 * @example
 * // Programmatic usage
 * const reporter = new JSONReporter();
 * const json = reporter.format(scanResult);
 * fs.writeFileSync('tailwind-report.json', json);
 *
 * @see {@link SARIFReporter} for GitHub Security tab / SARIF output
 * @see {@link Reporter}
 */
export class JSONReporter implements Reporter {
  /** Reporter identifier used by the CLI to select this reporter via `--format json`. */
  readonly name = 'json';

  /**
   * Serializes the scan result as a 2-space indented JSON string.
   *
   * @param result - The complete {@link ScanResult} from `RefactorPipeline.scan()`.
   * @returns A pretty-printed JSON string of the full scan result.
   *
   * @example
   * const json = reporter.format(result);
   * // Outputs:
   * // {
   * //   "filesScanned": 42,
   * //   "totalTransformations": 7,
   * //   ...
   * // }
   */
  format(result: ScanResult): string {
    return JSON.stringify(result, null, 2);
  }
}
