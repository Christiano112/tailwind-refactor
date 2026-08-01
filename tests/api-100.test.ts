import { validateConfig } from '@tailwind-refactor/config';
import type { TailwindRefactorPlugin } from '@tailwind-refactor/plugin-api';
import { JSONReporter, SARIFReporter, scan } from 'tailwind-refactor';
import { describe, expect, it } from 'vitest';

describe('100% v1.0 API Facade & Plugin Specifications', () => {
  it('supports array presets in config (extends: ["recommended", "strict"])', () => {
    const config = validateConfig({ extends: ['recommended', 'strict'] });
    expect(config.extends).toEqual(['recommended', 'strict']);
    expect(config.rules?.['prefer-token-values']).toBe('error');
    expect(config.rules?.['class-ordering']).toBe('error');
  });

  it('formats scan results using JSONReporter', async () => {
    const scanResult = await scan({ dir: 'tests/fixtures' });
    const reporter = new JSONReporter();
    const formatted = reporter.format(scanResult);

    expect(formatted).toContain('"totalTransformations"');
    expect(JSON.parse(formatted)).toHaveProperty('filesScanned');
  });

  it('formats scan results using SARIFReporter for GitHub Security Actions', async () => {
    const scanResult = await scan({ dir: 'tests/fixtures' });
    const reporter = new SARIFReporter();
    const formatted = reporter.format(scanResult);

    expect(formatted).toContain('sarif-schema-2.1.0.json');
    const sarif = JSON.parse(formatted);
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs[0].tool.driver.name).toBe('tailwind-refactor');
  });

  it('conforms to versioned TailwindRefactorPlugin interface (apiVersion: "1")', () => {
    const samplePlugin: TailwindRefactorPlugin = {
      name: 'company-design-system-plugin',
      apiVersion: '1',
      setup(ctx) {
        expect(ctx).toBeDefined();
      },
    };

    expect(samplePlugin.name).toBe('company-design-system-plugin');
    expect(samplePlugin.apiVersion).toBe('1');
  });
});
