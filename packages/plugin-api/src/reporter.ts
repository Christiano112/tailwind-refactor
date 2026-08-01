import type { ScanResult } from './types.js';

export interface Reporter {
  readonly name: string;
  format(result: ScanResult): string;
}
