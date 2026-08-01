import type { Reporter, ScanResult } from '@tailwind-refactor/plugin-api';

/**
 * Reporter that serializes a {@link ScanResult} to a SARIF 2.1.0 JSON document.
 *
 * @description
 * `SARIFReporter` produces output compatible with the
 * [SARIF 2.1.0 specification](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html),
 * enabling native integration with:
 * - **GitHub Advanced Security** (uploaded as a code scanning report via `upload-sarif` action)
 * - **VS Code SARIF Viewer** extension
 * - **Azure DevOps** code analysis pipelines
 * - Any SARIF-compatible security scanning platform
 *
 * @remarks
 * Activated by the `--format sarif` CLI flag. The SARIF output follows the
 * standard `runs[0].results[]` structure where each `Transformation` becomes
 * one SARIF `result` entry with `ruleId`, `message`, and `locations`.
 *
 * The SARIF schema URI is pinned to the oasis-tcs canonical location for
 * maximum compatibility with validators and consumers.
 *
 * @example
 * // GitHub Action usage (uploads to Security tab)
 * tailwind-refactor scan --format sarif > tailwind-refactor.sarif
 *
 * @example
 * // Programmatic usage
 * const reporter = new SARIFReporter();
 * const sarif = reporter.format(scanResult);
 * fs.writeFileSync('tailwind-refactor.sarif', sarif);
 *
 * @see {@link JSONReporter} for machine-readable JSON output
 * @see {@link Reporter}
 */
export class SARIFReporter implements Reporter {
  /** Reporter identifier used by the CLI to select this reporter via `--format sarif`. */
  readonly name = 'sarif';

  /**
   * Serializes the scan result as a SARIF 2.1.0 JSON document.
   *
   * @description
   * Maps each `Transformation` in the scan result to a SARIF `result` entry:
   * - `ruleId` → the transformation's `rule` ID (e.g. `'prefer-token-values'`)
   * - `message.text` → the transformation's `reason`, or a generated message
   * - `locations[0].physicalLocation.artifactLocation.uri` → the source file path
   *
   * @param result - The complete {@link ScanResult} from `RefactorPipeline.scan()`.
   * @returns A pretty-printed SARIF 2.1.0 JSON string.
   *
   * @example
   * const sarif = reporter.format(result);
   * // Outputs:
   * // {
   * //   "$schema": "https://raw.githubusercontent.com/oasis-tcs/...",
   * //   "version": "2.1.0",
   * //   "runs": [{
   * //     "tool": { "driver": { "name": "tailwind-refactor" } },
   * //     "results": [
   * //       { "ruleId": "prefer-token-values", "message": { "text": "..." }, ... }
   * //     ]
   * //   }]
   * // }
   */
  format(result: ScanResult): string {
    const sarifOutput = {
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: 'tailwind-refactor',
              version: '0.1.0',
              informationUri: 'https://github.com/tailwind-refactor/tailwind-refactor',
            },
          },
          results: result.transformations.map((t) => ({
            ruleId: t.rule,
            message: {
              text: t.reason || `Non-canonical Tailwind utility '${t.original}' should be '${t.replacement}'`,
            },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: {
                    uri: t.file || 'unknown',
                  },
                },
              },
            ],
          })),
        },
      ],
    };

    return JSON.stringify(sarifOutput, null, 2);
  }
}
