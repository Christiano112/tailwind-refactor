import { describe, expect, it } from 'vitest';
import { rules } from './index.js';

describe('ESLint Plugin Rules', () => {
  it('exports prefer-token-values rule with fixable code metadata', () => {
    expect(rules['prefer-token-values']).toBeDefined();
    expect(rules['prefer-token-values'].meta.fixable).toBe('code');
  });

  it('exports duplicate-classes rule with fixable code metadata', () => {
    expect(rules['duplicate-classes']).toBeDefined();
    expect(rules['duplicate-classes'].meta.fixable).toBe('code');
  });

  it('exports unsafe-arbitrary-values rule', () => {
    expect(rules['unsafe-arbitrary-values']).toBeDefined();
    expect(rules['unsafe-arbitrary-values'].meta.type).toBe('problem');
  });

  it('executes Rule.create context listener without error', () => {
    const fakeContext = {
      getSourceCode: () => ({
        text: '<div className="h-[40px]" />',
        getLocFromIndex: (index: number) => ({ line: 1, column: index }),
      }),
      getFilename: () => 'App.tsx',
      report: (reportObj: { message: string }) => {
        expect(reportObj.message).toContain('Replaced arbitrary value [40px]');
      },
    };

    const visitor = rules['prefer-token-values'].create(fakeContext);
    expect(visitor.Program).toBeDefined();
    visitor.Program();
  });
});
