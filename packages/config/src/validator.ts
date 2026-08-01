import { ErrorCode, ToolError } from '@tailwind-refactor/logger';
import { PRESET_A11Y, PRESET_RECOMMENDED, PRESET_STRICT } from './defaults.js';
import type { RuleSeverity, TailwindRefactorConfig } from './types.js';

export function validateConfig(raw: unknown, file?: string): TailwindRefactorConfig {
  if (!raw || typeof raw !== 'object') {
    throw new ToolError({
      code: ErrorCode.CONFIG_INVALID,
      message: `Invalid configuration: expected an object, got ${typeof raw}`,
      severity: 'error',
      file,
      suggestion: 'Export a valid object (e.g. export default { ... })',
    });
  }

  const rawObj = raw as Record<string, unknown>;
  const config: TailwindRefactorConfig = {};

  if (rawObj.extends !== undefined) {
    if (typeof rawObj.extends === 'string') {
      config.extends = rawObj.extends;
    } else if (Array.isArray(rawObj.extends) && rawObj.extends.every((item: unknown) => typeof item === 'string')) {
      config.extends = rawObj.extends as string[];
    } else {
      throw new ToolError({
        code: ErrorCode.CONFIG_INVALID,
        message: `'extends' property must be a string or array of preset names`,
        severity: 'error',
        file,
        suggestion: "Set extends to 'recommended' or ['recommended', 'custom-preset']",
      });
    }
  }

  const presets = Array.isArray(config.extends) ? config.extends : config.extends ? [config.extends] : [];
  let baseRules: Record<string, RuleSeverity> = {};

  for (const preset of presets) {
    if (preset === 'strict') baseRules = { ...baseRules, ...PRESET_STRICT };
    else if (preset === 'a11y') baseRules = { ...baseRules, ...PRESET_A11Y };
    else if (preset === 'recommended') baseRules = { ...baseRules, ...PRESET_RECOMMENDED };
  }

  if (rawObj.rules !== undefined) {
    if (typeof rawObj.rules !== 'object' || rawObj.rules === null) {
      throw new ToolError({
        code: ErrorCode.CONFIG_INVALID,
        message: `'rules' property must be an object`,
        severity: 'error',
        file,
        suggestion: "Use format: rules: { 'prefer-token-values': 'error' }",
      });
    }
    const rulesObj = rawObj.rules as Record<string, unknown>;
    config.rules = { ...baseRules };
    for (const [ruleName, severity] of Object.entries(rulesObj)) {
      if (typeof severity !== 'string' || !['off', 'warn', 'error'].includes(severity)) {
        throw new ToolError({
          code: ErrorCode.CONFIG_INVALID,
          message: `Rule '${ruleName}' severity must be 'off', 'warn', or 'error', got '${severity}'`,
          severity: 'error',
          file,
          suggestion: "Set severity to 'off', 'warn', or 'error'",
        });
      }
      config.rules[ruleName] = severity as RuleSeverity;
    }
  } else if (presets.length > 0) {
    config.rules = { ...baseRules };
  }

  if (rawObj.ignore !== undefined) {
    if (!Array.isArray(rawObj.ignore) || !rawObj.ignore.every((item: unknown) => typeof item === 'string')) {
      throw new ToolError({
        code: ErrorCode.CONFIG_INVALID,
        message: `'ignore' property must be an array of glob strings`,
        severity: 'error',
        file,
        suggestion: "Use format: ignore: ['generated/**']",
      });
    }
    config.ignore = rawObj.ignore as string[];
  }

  if (rawObj.confidenceThreshold !== undefined) {
    if (
      typeof rawObj.confidenceThreshold !== 'string' ||
      !['safe', 'suggestion', 'experimental'].includes(rawObj.confidenceThreshold)
    ) {
      throw new ToolError({
        code: ErrorCode.CONFIG_INVALID,
        message: `'confidenceThreshold' must be 'safe', 'suggestion', or 'experimental', got '${rawObj.confidenceThreshold}'`,
        severity: 'error',
        file,
        suggestion: "Set confidenceThreshold to 'safe', 'suggestion', or 'experimental'",
      });
    }
    config.confidenceThreshold = rawObj.confidenceThreshold as 'safe' | 'suggestion' | 'experimental';
  }

  if (rawObj.tailwindVersion !== undefined) {
    if (typeof rawObj.tailwindVersion !== 'string' || !['v3', 'v4', 'auto'].includes(rawObj.tailwindVersion)) {
      throw new ToolError({
        code: ErrorCode.CONFIG_INVALID,
        message: `'tailwindVersion' must be 'v3', 'v4', or 'auto', got '${rawObj.tailwindVersion}'`,
        severity: 'error',
        file,
        suggestion: "Set tailwindVersion to 'v3', 'v4', or 'auto'",
      });
    }
    config.tailwindVersion = rawObj.tailwindVersion as 'v3' | 'v4' | 'auto';
  }

  return config;
}
