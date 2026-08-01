import pc from 'picocolors';
import type { ToolError } from './errors.js';

export type LogLevel = 'silent' | 'normal' | 'verbose' | 'debug';

export class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = 'normal') {
    this.level = level;
  }

  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  public getLevel(): LogLevel {
    return this.level;
  }

  public section(title: string): void {
    if (this.level === 'debug') {
      console.log(pc.bold(pc.yellow(`\n${title}:`)));
    }
  }

  public debug(msg: string): void {
    if (this.level === 'debug') {
      console.log(`  ${pc.green('✓')} ${pc.dim(msg)}`);
    }
  }

  public verbose(msg: string): void {
    if (this.level === 'verbose' || this.level === 'debug') {
      console.log(pc.dim(`[verbose] ${msg}`));
    }
  }

  public info(msg: string): void {
    if (this.level !== 'silent') {
      console.log(msg);
    }
  }

  public warn(err: ToolError | string): void {
    if (this.level !== 'silent') {
      const formatted = typeof err === 'string' ? err : err.formatMessage();
      console.warn(pc.yellow(`\n⚠️  WARNING: ${formatted}`));
    }
  }

  public error(err: ToolError | string): void {
    if (this.level !== 'silent') {
      const formatted = typeof err === 'string' ? err : err.formatMessage();
      console.error(pc.bold(pc.red(`\n❌ ERROR: ${formatted}`)));
    }
  }
}
