import type { RuleSeverity, TailwindRefactorConfig } from './types.js';

export const PRESET_RECOMMENDED: Record<string, RuleSeverity> = {
  'prefer-token-values': 'error',
  'duplicate-class-cleanup': 'warn',
  'arbitrary-value-normalization': 'warn',
  'color-normalization': 'warn',
  'typography-normalization': 'warn',
  'radius-normalization': 'warn',
  'class-ordering': 'warn',
  'unsafe-arbitrary-values': 'warn',
};

export const PRESET_STRICT: Record<string, RuleSeverity> = {
  'prefer-token-values': 'error',
  'duplicate-class-cleanup': 'error',
  'arbitrary-value-normalization': 'error',
  'color-normalization': 'error',
  'typography-normalization': 'error',
  'radius-normalization': 'error',
  'class-ordering': 'error',
  'unsafe-arbitrary-values': 'error',
};

export const PRESET_A11Y: Record<string, RuleSeverity> = {
  'color-normalization': 'error',
  'typography-normalization': 'error',
  'unsafe-arbitrary-values': 'error',
};

export const DEFAULT_CONFIG: Required<TailwindRefactorConfig> = {
  extends: 'recommended',
  rules: PRESET_RECOMMENDED,
  ignore: ['node_modules/**', 'dist/**', 'build/**', '.next/**', 'coverage/**'],
  confidenceThreshold: 'safe',
  tailwindVersion: 'auto',
  plugins: [],
  parallelThreads: 4,
};
