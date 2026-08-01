import { RefactorEngine, UnsafeArbitraryValuesRule } from '@tailwind-refactor/rules';

/**
 * Minimal structural interface for an ESLint rule context.
 *
 * @remarks
 * Avoids a hard dependency on `@types/eslint` while still providing type-safe
 * access to the subset of context methods used by these rules.
 */
interface EslintRuleContext {
  getSourceCode(): { text: string; getLocFromIndex(index: number): { line: number; column: number } };
  getFilename(): string;
  report(descriptor: {
    loc: { start: { line: number; column: number }; end: { line: number; column: number } };
    message: string;
    fix?: (fixer: EslintFixer) => { range: [number, number]; text: string };
  }): void;
}

/**
 * Minimal structural interface for an ESLint rule fixer.
 *
 * @remarks
 * Avoids a hard dependency on `@types/eslint` while still providing the
 * correct return type for `replaceTextRange`.
 */
interface EslintFixer {
  replaceTextRange(range: [number, number], text: string): { range: [number, number]; text: string };
}

const engine = new RefactorEngine();

export const rules = {
  'prefer-token-values': {
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Prefer canonical Tailwind theme tokens over arbitrary values',
        category: 'Best Practices',
      },
      fixable: 'code',
    },
    create(context: EslintRuleContext) {
      return {
        Program() {
          const sourceCode = context.getSourceCode().text;
          const fileName = context.getFilename();
          const transformations = engine.analyzeCode(sourceCode, fileName);

          for (const t of transformations) {
            if (t.confidence === 'safe' && t.location && t.rule !== 'duplicate-class-cleanup') {
              context.report({
                loc: {
                  start: context.getSourceCode().getLocFromIndex(t.location.start),
                  end: context.getSourceCode().getLocFromIndex(t.location.end),
                },
                message: t.reason,
                fix(fixer: EslintFixer) {
                  return fixer.replaceTextRange([t.location!.start, t.location!.end], t.replacement);
                },
              });
            }
          }
        },
      };
    },
  },

  'duplicate-classes': {
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Remove duplicate Tailwind class names in class string literals',
        category: 'Cleanup',
      },
      fixable: 'code',
    },
    create(context: EslintRuleContext) {
      return {
        Program() {
          const sourceCode = context.getSourceCode().text;
          const fileName = context.getFilename();
          const transformations = engine.analyzeCode(sourceCode, fileName);

          for (const t of transformations) {
            if (t.rule === 'duplicate-class-cleanup' && t.location) {
              context.report({
                loc: {
                  start: context.getSourceCode().getLocFromIndex(t.location.start),
                  end: context.getSourceCode().getLocFromIndex(t.location.end),
                },
                message: t.reason,
                fix(fixer: EslintFixer) {
                  return fixer.replaceTextRange([t.location!.start, t.location!.end], t.replacement);
                },
              });
            }
          }
        },
      };
    },
  },

  'unsafe-arbitrary-values': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Warn on unsafe dynamic calc()/var() or unresolvable arbitrary values',
        category: 'Possible Errors',
      },
    },
    create(context: EslintRuleContext) {
      const unsafeEngine = new RefactorEngine({ rules: [new UnsafeArbitraryValuesRule()] });
      return {
        Program() {
          const sourceCode = context.getSourceCode().text;
          const fileName = context.getFilename();
          const transformations = unsafeEngine.analyzeCode(sourceCode, fileName);

          for (const t of transformations) {
            if (t.confidence === 'uncertain' && t.location) {
              context.report({
                loc: {
                  start: context.getSourceCode().getLocFromIndex(t.location.start),
                  end: context.getSourceCode().getLocFromIndex(t.location.end),
                },
                message: t.reason,
              });
            }
          }
        },
      };
    },
  },
};

export default {
  rules,
  configs: {
    recommended: {
      plugins: ['tailwind-refactor'],
      rules: {
        'tailwind-refactor/prefer-token-values': 'warn',
        'tailwind-refactor/duplicate-classes': 'warn',
        'tailwind-refactor/unsafe-arbitrary-values': 'warn',
      },
    },
  },
};
