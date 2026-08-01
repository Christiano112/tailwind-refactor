import { describe, expect, it } from 'vitest';
import { DebugContextCollector } from './context.js';
import { ErrorCode, ToolError } from './errors.js';
import { Logger } from './logger.js';

describe('ToolError & Logger System', () => {
  it('formats ToolError with location and fix suggestion', () => {
    const err = new ToolError({
      code: ErrorCode.CONFIG_INVALID,
      message: "Invalid severity 'super-strict'",
      severity: 'error',
      file: 'tailwind-refactor.config.ts',
      location: { line: 5, column: 12 },
      suggestion: "Use 'off', 'warn', or 'error'",
    });

    const formatted = err.formatMessage();
    expect(formatted).toContain('[CONFIG_INVALID]');
    expect(formatted).toContain('tailwind-refactor.config.ts:5:12');
    expect(formatted).toContain("Suggestion: Use 'off', 'warn', or 'error'");
  });

  it('records execution statistics in DebugContextCollector', () => {
    const collector = new DebugContextCollector();
    collector.recordFileScanned();
    collector.recordFileIgnored();
    collector.recordClassesFound(15);
    collector.recordTransformation('prefer-token-values');
    collector.recordTransformation('prefer-token-values');

    const ctx = collector.finish();
    expect(ctx.filesScanned).toBe(1);
    expect(ctx.filesIgnored).toBe(1);
    expect(ctx.classesFound).toBe(15);
    expect(ctx.transformationsGenerated).toBe(2);
    expect(ctx.ruleStats['prefer-token-values']).toBe(2);
    expect(ctx.endTime).toBeGreaterThan(0);
  });

  it('configures logger level without throwing', () => {
    const logger = new Logger('silent');
    expect(logger.getLevel()).toBe('silent');
    logger.setLevel('debug');
    expect(logger.getLevel()).toBe('debug');
  });
});
