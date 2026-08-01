export interface CandidateLocation {
  start: number;
  end: number;
  line?: number;
}

export type DirectiveType = 'disable-next-line' | 'disable-block' | 'enable-block';

export interface InlineDirective {
  type: DirectiveType;
  rules: string[]; // empty array means all rules
  line: number; // 1-indexed line number
  range: { start: number; end: number };
}

export interface DisabledRange {
  startLine: number;
  endLine: number;
  startPos?: number;
  endPos?: number;
  rules: string[]; // empty array means all rules
}

export interface IgnoreSourceReport {
  source: string;
  patterns: string[];
}

export interface IgnoreContext {
  isFileIgnored(filePath: string): boolean;
  isTransformationIgnored(location: CandidateLocation, ruleName: string): boolean;
  getIgnoredSources(): IgnoreSourceReport[];
}
