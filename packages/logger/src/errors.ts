export type ErrorSeverity = 'info' | 'warning' | 'error';

export enum ErrorCode {
  CONFIG_LOAD_FAILED = 'CONFIG_LOAD_FAILED',
  CONFIG_INVALID = 'CONFIG_INVALID',
  TAILWIND_CONFIG_NOT_FOUND = 'TAILWIND_CONFIG_NOT_FOUND',
  TAILWIND_VERSION_UNKNOWN = 'TAILWIND_VERSION_UNKNOWN',
  PARSER_FAILED = 'PARSER_FAILED',
  UNSUPPORTED_FILE = 'UNSUPPORTED_FILE',
  RULE_FAILED = 'RULE_FAILED',
}

export interface ToolErrorOptions {
  code: ErrorCode | string;
  message: string;
  severity?: ErrorSeverity;
  file?: string;
  location?: { line: number; column: number };
  suggestion?: string;
  cause?: unknown;
}

export class ToolError extends Error {
  public readonly code: ErrorCode | string;
  public readonly severity: ErrorSeverity;
  public readonly file?: string;
  public readonly location?: { line: number; column: number };
  public readonly suggestion?: string;

  constructor(options: ToolErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = 'ToolError';
    this.code = options.code;
    this.severity = options.severity || 'error';
    this.file = options.file;
    this.location = options.location;
    this.suggestion = options.suggestion;
  }

  public formatMessage(): string {
    const fileLoc = this.file
      ? ` at ${this.file}${this.location ? `:${this.location.line}:${this.location.column}` : ''}`
      : '';
    const sugg = this.suggestion ? `\n   💡 Suggestion: ${this.suggestion}` : '';
    return `[${this.code}] ${this.message}${fileLoc}${sugg}`;
  }
}
