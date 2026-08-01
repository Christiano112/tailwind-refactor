import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './defaults.js';
import { loadConfig } from './loader.js';
import { validateConfig } from './validator.js';

describe('Config Loader & Validator', () => {
  it('returns default config when no config file exists', async () => {
    const config = await loadConfig(undefined, '/non-existent-dir');
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it('validates a valid configuration object', () => {
    const raw = {
      rules: {
        'prefer-token-values': 'error',
        'duplicate-classes': 'off',
      },
      ignore: ['generated/**'],
      confidenceThreshold: 'safe',
    };

    const validated = validateConfig(raw);
    expect(validated.rules?.['duplicate-classes']).toBe('off');
    expect(validated.ignore).toEqual(['generated/**']);
  });

  it('throws ToolError for invalid rule severity', () => {
    const raw = {
      rules: {
        'prefer-token-values': 'super-strict',
      },
    };
    expect(() => validateConfig(raw)).toThrow("Rule 'prefer-token-values' severity must be 'off', 'warn', or 'error'");
  });

  it('throws ToolError for invalid confidence threshold', () => {
    const raw = {
      confidenceThreshold: 'super-safe',
    };
    expect(() => validateConfig(raw)).toThrow("'confidenceThreshold' must be 'safe', 'suggestion', or 'experimental'");
  });

  it('throws ToolError when explicit config path does not exist', async () => {
    await expect(loadConfig('missing-config.ts')).rejects.toThrow(
      'Explicit configuration file not found: missing-config.ts'
    );
  });
});
