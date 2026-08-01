import { PluginDetector, TailwindV3Resolver, TailwindV4Resolver, UtilityRegistry } from '@tailwind-refactor/resolver';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

describe('Plugin Support & Custom Utility Resolution Fixture Suite', () => {
  it('resolves custom v3 theme spacing and colors', () => {
    const v3Config = {
      theme: {
        extend: {
          spacing: { card: '42px' },
          colors: { brand: '#1a73e8' },
        },
      },
    };

    const resolver = new TailwindV3Resolver(v3Config);

    expect(resolver.findEquivalent('h', '42px')).toBe('h-card');
    expect(resolver.findEquivalent('bg', '#1a73e8')).toBe('bg-brand');
  });

  it('resolves v4 @theme CSS block custom tokens', () => {
    const cssPath = resolve(__dirname, 'fixtures/custom-tailwind-v4/theme.css');
    const cssContent = readFileSync(cssPath, 'utf-8');

    const resolver = new TailwindV4Resolver(cssContent);

    expect(resolver.findEquivalent('h', '42px')).toBe('h-card');
    expect(resolver.findEquivalent('bg', '#0057ff')).toBe('bg-brand');
  });

  it('detects standard plugins and registers plugin utility classes', () => {
    const registry = new UtilityRegistry();
    const result = PluginDetector.detectAndRegister(
      ['@tailwindcss/forms', '@tailwindcss/typography', '@tailwindcss/aspect-ratio', 'unknown-plugin'],
      registry
    );

    expect(result.analyzed).toEqual(['@tailwindcss/forms', '@tailwindcss/typography', '@tailwindcss/aspect-ratio']);
    expect(result.skipped).toEqual(['unknown-plugin']);

    expect(registry.resolveUtility('prose')).toBeDefined();
    expect(registry.resolveUtility('form-input')).toBeDefined();
    expect(registry.resolveUtility('aspect-w-16')).toBeDefined();
  });

  it('extracts custom addUtilities() calls from tailwind config plugins', () => {
    const _registry = new UtilityRegistry();
    const customConfig = {
      plugins: [
        ({ addUtilities }: { addUtilities: (utils: Record<string, unknown>) => void }) => {
          addUtilities({
            '.btn-primary': { color: 'white' },
            '.card-shadow': { boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
          });
        },
      ],
    };

    const resolver = new TailwindV3Resolver(customConfig);

    expect(resolver.resolveUtility('btn-primary')).toBeDefined();
    expect(resolver.resolveUtility('card-shadow')).toBeDefined();
  });
});
