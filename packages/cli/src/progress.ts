/**
 * TTY-aware inline progress reporter for CLI operations.
 *
 * @description
 * In TTY (interactive terminal) environments, overwrites the current line with
 * a live-updating progress counter and throughput rate.
 *
 * In non-TTY environments (CI, pipes), falls back to periodic line-by-line
 * output so logs are still meaningful without ANSI escape sequences.
 *
 * @example
 * const progress = new ProgressReporter();
 * for (const file of files) {
 *   await analyzeFile(file);
 *   progress.report(++i, files.length, file);
 * }
 * progress.clear();
 */
export class ProgressReporter {
  /** Epoch ms when this reporter was constructed — used to compute scan rate. */
  private readonly startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Reports current scan progress to stderr.
   *
   * @param scanned  - Number of files fully processed so far.
   * @param total    - Total number of files to process.
   * @param _filePath - The file just processed (unused in output; reserved for future verbose mode).
   */
  report(scanned: number, total: number, _filePath: string): void {
    const elapsedSeconds = (Date.now() - this.startTime) / 1000 || 0.001;
    const rate = scanned / elapsedSeconds;
    const msg = `  Scanning... ${scanned}/${total} files (${rate.toFixed(0)} files/s)`;

    if (process.stderr.isTTY) {
      // Overwrite the current line
      process.stderr.write(`\r${msg}  `);
    } else if (scanned % 100 === 0 || scanned === total) {
      // Non-TTY: emit one line every 100 files + final line
      process.stderr.write(`${msg}\n`);
    }
  }

  /**
   * Clears the in-progress line from the terminal (TTY only).
   * Call this once all files have been scanned, before printing the summary.
   */
  clear(): void {
    if (process.stderr.isTTY) {
      process.stderr.write('\r\x1b[K');
    }
  }
}
