import type { TailwindRefactorConfig } from '@tailwind-refactor/config';
import { describe, expect, it } from 'vitest';
import { RefactorEngine } from './engine.js';

describe('RefactorEngine Configuration Integration', () => {
  it('disables duplicate class rule when config set to off', () => {
    const code = `clsx("p-4 p-4 flex")`;

    const enabledEngine = new RefactorEngine();
    const enabledResults = enabledEngine.analyzeCode(code);
    expect(enabledResults.some((r) => r.rule === 'duplicate-class-cleanup')).toBe(true);

    const config: TailwindRefactorConfig = {
      rules: {
        'duplicate-class-cleanup': 'off',
        'duplicate-classes': 'off',
      },
    };

    const disabledEngine = new RefactorEngine({ config });
    const disabledResults = disabledEngine.analyzeCode(code);
    expect(disabledResults.some((r) => r.rule === 'duplicate-class-cleanup')).toBe(false);
  });

  it('filters out uncertain transformations when confidenceThreshold is safe', () => {
    const code = `<div className="h-[calc(100vh-40px)]" />`;

    const experimentalConfig: TailwindRefactorConfig = {
      confidenceThreshold: 'experimental',
    };
    const experimentalEngine = new RefactorEngine({ config: experimentalConfig });
    const expResults = experimentalEngine.analyzeCode(code);
    expect(expResults.some((r) => r.rule === 'unsafe-arbitrary-values')).toBe(true);

    const safeConfig: TailwindRefactorConfig = {
      confidenceThreshold: 'safe',
    };
    const safeEngine = new RefactorEngine({ config: safeConfig });
    const safeResults = safeEngine.analyzeCode(code);
    expect(safeResults.some((r) => r.rule === 'unsafe-arbitrary-values')).toBe(false);
  });
});
